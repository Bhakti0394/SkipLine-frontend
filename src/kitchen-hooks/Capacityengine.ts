// ============================================================
// src/kitchen-hooks/Capacityengine.ts
// ============================================================

import type { KanbanBoardResponse, StaffWorkloadDto, SlotCapacityDto } from '../kitchen-api/kitchenApi';
import type { Order, CapacitySnapshot, BackendOrderStatus } from '../kitchen-types/order';

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

// ─── 1. calculateCapacity ─────────────────────────────────────────────────────

export function calculateCapacity(boardData: KanbanBoardResponse): CapacitySnapshot {
  const onShiftStaff = boardData.staff.filter(s => s.onShift);
  const totalSlots   = onShiftStaff.reduce((sum, s) => sum + s.maxCapacity, 0);

  const cookingCount = (boardData.columns.COOKING ?? []).length;
  const pendingCount = (boardData.columns.PENDING  ?? []).length;

  const freeSlots   = Math.max(0, totalSlots - cookingCount);
  const capacityPct = totalSlots === 0
    ? 100
    : Math.min(100, Math.round((cookingCount / totalSlots) * 100));

  const maxQueueDepth = Math.max(totalSlots * 2, 10);
  const cookingFull   = cookingCount >= totalSlots && totalSlots > 0;
  const queueFull     = pendingCount >= maxQueueDepth;
  const isOverloaded  = cookingFull && queueFull;

  return { totalSlots, cookingCount, freeSlots, capacityPct, isOverloaded };
}

// ─── 2. calculateCapacityOrEmpty ──────────────────────────────────────────────

export function calculateCapacityOrEmpty(boardData: KanbanBoardResponse | null): CapacitySnapshot {
  if (!boardData) {
    return { totalSlots: 0, cookingCount: 0, freeSlots: 0, capacityPct: 0, isOverloaded: false };
  }
  return calculateCapacity(boardData);
}

// ─── 3. Slot capacity ─────────────────────────────────────────────────────────

export function getAvailableSlots(boardData: KanbanBoardResponse): SlotCapacityDto[] {
  return (boardData.upcomingSlots ?? []).filter(slot => slot.remaining > 0);
}

export function slotFillPercent(slot: SlotCapacityDto): number {
  if (slot.maxCapacity === 0) return 100;
  return Math.min(100, Math.round(
    ((slot.maxCapacity - slot.remaining) / slot.maxCapacity) * 100
  ));
}

// ─── 4. Chef load helpers ─────────────────────────────────────────────────────

export function getAssignableChefs(staff: StaffWorkloadDto[]): StaffWorkloadDto[] {
  return staff.filter(s => s.onShift && s.status !== 'full');
}

export function chefLoadLabel(chef: StaffWorkloadDto): string {
  return `${chef.activeOrders}/${chef.maxCapacity}`;
}

// ─── 5. Order priority sort ───────────────────────────────────────────────────

export function sortBySchedulingPriority(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const aTime = a.pickupTime === 'TBD' ? Infinity : new Date(a.pickupTime).getTime();
    const bTime = b.pickupTime === 'TBD' ? Infinity : new Date(b.pickupTime).getTime();
    if (aTime !== bTime) return aTime - bTime;
    // FIX: removed stray 'c' that caused a syntax/compile error
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

// ─── 6. canAcceptOrder ────────────────────────────────────────────────────────

export function canAcceptOrder(boardData: KanbanBoardResponse): boolean {
  const { freeSlots, totalSlots } = calculateCapacity(boardData);
  const pendingCount  = (boardData.columns.PENDING ?? []).length;
  const maxQueueDepth = Math.max(1, totalSlots * 2);
  return freeSlots > 0 || pendingCount < maxQueueDepth;
}