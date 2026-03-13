// ============================================================
// src/kitchen-hooks/Capacityengine.ts
//
// SINGLE SOURCE OF TRUTH for all kitchen capacity calculations.
//
// useKitchenBoard imports selectCapacity from here — no duplicate
// logic. CapacityMeter receives a CapacitySnapshot + StaffWorkloadDto[]
// and uses the helpers below for display breakdowns.
// ============================================================

import type { KanbanBoardResponse, StaffWorkloadDto, SlotCapacityDto } from '../kitchen-api/kitchenApi';
import type { Order, CapacitySnapshot, BackendOrderStatus } from '../kitchen-types/order';
import { ORDER_TYPE_WEIGHT } from '../kitchen-types/order';

export type { BackendOrderStatus };

// ─── Valid transition graph ───────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<BackendOrderStatus, BackendOrderStatus[]> = {
  PENDING:   ['COOKING'],
  COOKING:   ['READY'],
  READY:     ['COMPLETED'],
  COMPLETED: [],
};

export function canTransition(from: BackendOrderStatus, to: BackendOrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Capacity tier thresholds ─────────────────────────────────────────────────
//
// 0  – 60% → healthy  (green)
// 60 – 85% → busy     (yellow/amber)
// 85 – 100%→ overloaded (red)

export type CapacityTier = 'healthy' | 'busy' | 'overloaded';

export function getCapacityTier(pct: number): CapacityTier {
  if (pct >= 85) return 'overloaded';
  if (pct >= 60) return 'busy';
  return 'healthy';
}

export const TIER_LABELS: Record<CapacityTier, string> = {
  healthy:    '✅ Ready for more orders.',
  busy:       '⚡ Kitchen running at high load.',
  overloaded: '⚠ At maximum capacity.',
};

export const TIER_COLORS: Record<CapacityTier, string> = {
  healthy:    '#10b981',   // green
  busy:       '#f59e0b',   // amber
  overloaded: '#ef4444',   // red
};

// ─── Extended capacity snapshot ───────────────────────────────────────────────

export interface CapacityBreakdown {
  totalSlots: number;
  cookingCount: number;
  pendingCount: number;
  activeLoad: number;
  freeSlots: number;
  capacityPct: number;
  isOverloaded: boolean;
  activeChefCount: number;
  avgOrdersPerChef: number;
  tier: CapacityTier;
}

// ─── Core calculation ─────────────────────────────────────────────────────────

export function selectCapacity(boardData: KanbanBoardResponse | null): CapacitySnapshot {
  if (!boardData) {
    return { totalSlots: 0, cookingCount: 0, freeSlots: 0, capacityPct: 0, isOverloaded: false };
  }

  const onShiftStaff = boardData.staff.filter(s => s.onShift);
  const totalSlots   = onShiftStaff.reduce((sum, s) => sum + s.maxCapacity, 0);

  const cookingCount  = (boardData.columns.COOKING ?? []).length;
  const pendingCount  = (boardData.columns.PENDING  ?? []).length;
  const maxQueueDepth = Math.max(totalSlots * 2, 10);

  const freeSlots    = Math.max(0, totalSlots - cookingCount);
  const activeLoad   = cookingCount + pendingCount;
  const capacityPct  = totalSlots > 0
    ? Math.min(100, Math.round((activeLoad / totalSlots) * 100))
    : 0;

  const cookingFull  = cookingCount >= totalSlots && totalSlots > 0;
  const queueFull    = pendingCount >= maxQueueDepth;
  const isOverloaded = cookingFull && queueFull;

  return { totalSlots, cookingCount, freeSlots, capacityPct, isOverloaded };
}

export function selectCapacityBreakdown(
  boardData: KanbanBoardResponse | null,
  staff: StaffWorkloadDto[],
): CapacityBreakdown {
  const base = selectCapacity(boardData);

  const onShiftStaff    = staff.filter(s => s.onShift);
  const activeChefCount = onShiftStaff.length;
  const avgOrdersPerChef = activeChefCount > 0
    ? Math.round(onShiftStaff.reduce((sum, s) => sum + s.maxCapacity, 0) / activeChefCount)
    : 0;

  const pendingCount = boardData ? (boardData.columns.PENDING ?? []).length : 0;
  const activeLoad   = base.cookingCount + pendingCount;
  const tier         = getCapacityTier(base.capacityPct);

  return {
    ...base,
    pendingCount,
    activeLoad,
    activeChefCount,
    avgOrdersPerChef,
    tier,
  };
}

// ─── Legacy aliases ───────────────────────────────────────────────────────────

/** @deprecated Use selectCapacity(boardData) */
export function calculateCapacity(boardData: KanbanBoardResponse): CapacitySnapshot {
  return selectCapacity(boardData);
}

/** @deprecated Use selectCapacity(boardData) */
export function calculateCapacityOrEmpty(boardData: KanbanBoardResponse | null): CapacitySnapshot {
  return selectCapacity(boardData);
}

// ─── Slot capacity helpers ────────────────────────────────────────────────────

export function getAvailableSlots(boardData: KanbanBoardResponse): SlotCapacityDto[] {
  return (boardData.upcomingSlots ?? []).filter(slot => slot.remaining > 0);
}

export function slotFillPercent(slot: SlotCapacityDto): number {
  if (slot.maxCapacity === 0) return 100;
  return Math.min(100, Math.round(
    ((slot.maxCapacity - slot.remaining) / slot.maxCapacity) * 100
  ));
}

// ─── Chef load helpers ────────────────────────────────────────────────────────

export function getAssignableChefs(staff: StaffWorkloadDto[]): StaffWorkloadDto[] {
  return staff.filter(s => s.onShift && s.status !== 'full');
}

export function chefLoadLabel(chef: StaffWorkloadDto): string {
  return `${chef.activeOrders}/${chef.maxCapacity}`;
}

// ─── Order priority sort ──────────────────────────────────────────────────────

/**
 * sortBySchedulingPriority
 *
 * FIX — Express-first + ASAP handling:
 *
 * BEFORE:
 *   Sorted only by pickupTime string → new Date(pickupTime).getTime().
 *   Express orders have pickupTime = 'ASAP' → new Date('ASAP') = NaN.
 *   NaN comparisons always return false → express orders fell to the BOTTOM.
 *   This is the opposite of the required behaviour.
 *
 * AFTER:
 *   Primary sort  : ORDER_TYPE_WEIGHT (express=0, normal=1, scheduled=2)
 *   Secondary sort: pickup time ms — 'ASAP' treated as 0 (earliest possible)
 *                   'TBD' treated as Infinity (latest possible)
 *   Tertiary sort : createdAt (FIFO tiebreak)
 *
 * Result: express orders always appear before normal/scheduled regardless of
 * their pickup time, and 'ASAP' express orders sort to the very top.
 */
export function sortBySchedulingPriority(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    // Primary: order type weight — express (0) before normal (1) before scheduled (2)
    const weightA = ORDER_TYPE_WEIGHT[a.orderType] ?? 1;
    const weightB = ORDER_TYPE_WEIGHT[b.orderType] ?? 1;
    if (weightA !== weightB) return weightA - weightB;

    // Secondary: pickup time — ASAP = 0 (earliest), TBD = Infinity (latest)
    const timeA = pickupTimeMs(a.pickupTime);
    const timeB = pickupTimeMs(b.pickupTime);
    if (timeA !== timeB) return timeA - timeB;

    // Tertiary: createdAt FIFO
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/**
 * pickupTimeMs — converts a pickupTime string to a sortable number.
 *
 * 'ASAP' → 0          (sort first — express immediate orders)
 * 'TBD'  → Infinity   (sort last — unscheduled orders)
 * valid ISO string / time string → Date.getTime()
 * invalid string → Infinity     (treat as unscheduled)
 */
function pickupTimeMs(pickupTime: string): number {
  if (pickupTime === 'ASAP') return 0;
  if (pickupTime === 'TBD')  return Infinity;
  const ms = new Date(pickupTime).getTime();
  return isNaN(ms) ? Infinity : ms;
}

// ─── canAcceptOrder ───────────────────────────────────────────────────────────

export function canAcceptOrder(boardData: KanbanBoardResponse): boolean {
  const { freeSlots, totalSlots } = selectCapacity(boardData);
  const pendingCount  = (boardData.columns.PENDING ?? []).length;
  const maxQueueDepth = Math.max(1, totalSlots * 2);
  return freeSlots > 0 || pendingCount < maxQueueDepth;
}