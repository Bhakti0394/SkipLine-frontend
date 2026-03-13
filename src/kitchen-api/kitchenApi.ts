// ============================================================
// src/kitchen-api/kitchenApi.ts
// ============================================================

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api/kitchen';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function authHeadersNoBody(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface OrderCardDto {
  id:               string;
  orderRef:         string;
  status:           'PENDING' | 'COOKING' | 'READY' | 'COMPLETED';
  customerName:     string | null;
  itemSummary:      string[];
  assignedChefName: string | null;
  assignedChefId:   string | null;
  pickupSlotTime:   string | null;
  totalPrepMinutes: number;
  placedAt:         string;
  cookingStartedAt: string | null;
  readyAt:          string | null;
  completedAt:      string | null;
  elapsedMinutes:   number;
  isLate:           boolean;
  priority?:        string;
  // Authoritative order type from backend — derived from orderRef suffix at
  // query time in OrderQueryService. Values: 'EXPRESS' | 'NORMAL' | 'SCHEDULED'.
  // resolveOrderType() in useKitchenBoard reads this first; hash-table fallback
  // only fires when this field is absent (legacy / seeded orders without suffix).
  orderType?:       string;
}

export interface KitchenMetricsDto {
  totalOrdersToday:           number;
  completedOrdersToday:       number;
  avgCookTimeMinutes:         number;
  efficiencyPercent:          number;
  capacityUtilizationPercent: number;
  lateOrdersCount:            number;
  activeChefCount:            number;
}

export interface StaffWorkloadDto {
  chefId:         string;
  name:           string;
  activeOrders:   number;
  maxCapacity:    number;
  loadPercent:    number;
  onShift:        boolean;
  status:         'available' | 'busy' | 'full';
  completedToday: number;
}

export interface StaffRemovalValidationDto {
  canRemove:             boolean;
  blocked:               boolean;
  blockReason?:          string;
  ordersToReassign:      number;
  estimatedDelayMinutes: number;
  newCapacity:           number;
  ordersToThrottle:      number;
  affectedOrderIds:      string[];
}

export interface SlotCapacityDto {
  id:              string;
  slotTime:        string;
  maxCapacity:     number;
  currentBookings: number;
  remaining:       number;
}

export interface BoardColumns {
  PENDING:   OrderCardDto[];
  COOKING:   OrderCardDto[];
  READY:     OrderCardDto[];
  COMPLETED: OrderCardDto[];
}

export interface KanbanBoardResponse {
  columns:       BoardColumns;
  metrics:       KitchenMetricsDto;
  staff:         StaffWorkloadDto[];
  upcomingSlots: SlotCapacityDto[];
}

export interface MenuItemDto {
  id:              string;
  name:            string;
  prepTimeMinutes: number;
  available:       boolean;
}

export interface CreateStaffDto {
  name:                string;
  maxConcurrentOrders: number;
  activeToday:         boolean;
}

export interface SimulationResult {
  generated: number;
  rejected:  number;
  reason?:   string;
}

// ─── OrderRef helpers ─────────────────────────────────────────────────────────

function generateOrderRef(customerName: string): string {
  const uid       = crypto.randomUUID().slice(0, 8).toUpperCase();
  const firstName = customerName.split(' ')[0];
  const ts        = Date.now().toString(36).toUpperCase().slice(-4);
  return `SIM-${firstName}${ts}-${uid}`;
}

const SIM_CUSTOMER_NAMES = [
  'Priya Sharma', 'Rahul Mehta', 'Sneha Iyer',  'Karan Verma',
  'Ananya Nair',  'Dev Patel',   'Pooja Desai',  'Arjun Singh',
  'Meera Joshi',  'Rohan Gupta', 'Lakshmi Rao',  'Vikram Bose',
  'Kavya Pillai', 'Nikhil Shah', 'Divya Reddy',  'Aditya Kumar',
];

function randomCustomerName(): string {
  return SIM_CUSTOMER_NAMES[Math.floor(Math.random() * SIM_CUSTOMER_NAMES.length)];
}

export type SimOrderType = 'express' | 'normal' | 'scheduled';

// ~25% express, ~55% normal, ~20% scheduled
const ORDER_TYPE_POOL: SimOrderType[] = [
  'express',   'express',   'express',   'express',   'express',
  'normal',    'normal',    'normal',    'normal',    'normal',
  'normal',    'normal',    'normal',    'normal',    'normal',
  'normal',    'normal',
  'scheduled', 'scheduled', 'scheduled',
];

function randomSimOrderType(): SimOrderType {
  return ORDER_TYPE_POOL[Math.floor(Math.random() * ORDER_TYPE_POOL.length)];
}

const ORDER_TYPE_TAG: Record<SimOrderType, string> = {
  express:   'EXPRESS',
  normal:    'NORMAL',
  scheduled: 'SCHEDULED',
};

function encodeOrderRef(base: string, orderType: SimOrderType): string {
  return `${base}-${ORDER_TYPE_TAG[orderType]}`;
}

export function decodeOrderTypeFromRef(orderRef: string): SimOrderType {
  if (orderRef.includes('-SCHEDULED')) return 'scheduled';
  if (orderRef.includes('-EXPRESS'))   return 'express';
  return 'normal';
}

// ─── Slot selection helpers ───────────────────────────────────────────────────

function pickNormalSlot(slots: SlotCapacityDto[]): SlotCapacityDto | null {
  const now      = Date.now();
  const minAhead = 20 * 60 * 1000;
  const maxAhead = 90 * 60 * 1000;
  const candidates = slots.filter(s => {
    if (s.remaining <= 0) return false;
    const ms = new Date(s.slotTime).getTime();
    return ms >= now + minAhead && ms <= now + maxAhead;
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime());
  return candidates[0];
}

function pickScheduledSlot(slots: SlotCapacityDto[]): SlotCapacityDto | null {
  const now      = Date.now();
  const minAhead = 6 * 60 * 60 * 1000;
  const candidates = slots.filter(s => {
    if (s.remaining <= 0) return false;
    return new Date(s.slotTime).getTime() >= now + minAhead;
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime());
  return candidates[0];
}

// ─── Board ────────────────────────────────────────────────────────────────────

export async function fetchBoard(signal?: AbortSignal): Promise<KanbanBoardResponse> {
  const res = await fetch(`${BASE_URL}/board`, {
    credentials: 'include',
    headers: authHeadersNoBody(),
    signal,
  });
  if (!res.ok) throw new Error(`Failed to fetch board: ${res.status}`);
  return res.json();
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export async function fetchMenuItems(): Promise<MenuItemDto[]> {
  const res = await fetch(`${BASE_URL}/menu-items`, {
    credentials: 'include', headers: authHeadersNoBody(),
  });
  if (!res.ok) throw new Error(`Failed to fetch menu items: ${res.status}`);
  return res.json();
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export async function fetchStaff(): Promise<StaffWorkloadDto[]> {
  const res = await fetch(`${BASE_URL}/staff`, {
    credentials: 'include', headers: authHeadersNoBody(),
  });
  if (!res.ok) throw new Error(`Failed to fetch staff: ${res.status}`);
  return res.json();
}

export async function createStaff(dto: CreateStaffDto): Promise<StaffWorkloadDto> {
  const res = await fetch(`${BASE_URL}/staff`, {
    method: 'POST', credentials: 'include', headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error((await res.text()) || `Create staff failed: ${res.status}`);
  return res.json();
}

export async function activateChef(chefId: string): Promise<StaffWorkloadDto[]> {
  const res = await fetch(`${BASE_URL}/staff/${chefId}/activate`, {
    method: 'PATCH', credentials: 'include', headers: authHeadersNoBody(),
  });
  if (!res.ok) throw new Error((await res.text()) || `Activate chef failed: ${res.status}`);
  return res.json();
}

export async function validateRemoval(chefId: string): Promise<StaffRemovalValidationDto> {
  const res = await fetch(`${BASE_URL}/staff/${chefId}/validate-removal`, {
    credentials: 'include', headers: authHeadersNoBody(),
  });
  if (!res.ok) throw new Error((await res.text()) || `Validate removal failed: ${res.status}`);
  return res.json();
}

export async function removeChefFromShift(chefId: string): Promise<StaffWorkloadDto[]> {
  const res = await fetch(`${BASE_URL}/staff/${chefId}/remove-from-shift`, {
    method: 'PATCH', credentials: 'include', headers: authHeadersNoBody(),
  });
  if (!res.ok) throw new Error((await res.text()) || `Remove from shift failed: ${res.status}`);
  return res.json();
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(
  orderRef:    string,
  menuItemIds: string[],
  customerName?: string,
): Promise<string> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST', credentials: 'include', headers: authHeaders(),
    body: JSON.stringify({ orderRef, menuItemIds, customerName }),
  });
  if (!res.ok) throw new Error((await res.text()) || `Create order failed: ${res.status}`);
  return res.json();
}

export async function reservePickupSlot(orderId: string, slotId: string): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/orders/${orderId}/reserve-slot?slotId=${slotId}`,
    { method: 'PATCH', credentials: 'include', headers: authHeadersNoBody() },
  );
  if (!res.ok) throw new Error((await res.text()) || `Reserve slot failed: ${res.status}`);
}

export async function changeOrderStatus(
  orderId:      string,
  targetStatus: 'PENDING' | 'COOKING' | 'READY' | 'COMPLETED' | 'CANCELLED',
): Promise<void> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: 'PATCH', credentials: 'include', headers: authHeaders(),
    body: JSON.stringify({ targetStatus }),
  });
  if (!res.ok) throw new Error((await res.text()) || `Status change failed: ${res.status}`);
}

export async function assignChef(orderId: string, chefId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/assign-chef`, {
    method: 'PATCH', credentials: 'include', headers: authHeaders(),
    body: JSON.stringify({ chefId }),
  });
  if (!res.ok) throw new Error((await res.text()) || `Chef assignment failed: ${res.status}`);
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export async function fetchMetrics(date?: string): Promise<KitchenMetricsDto> {
  const url = date ? `${BASE_URL}/metrics?date=${date}` : `${BASE_URL}/metrics`;
  const res = await fetch(url, { credentials: 'include', headers: authHeadersNoBody() });
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.status}`);
  return res.json();
}

// ─── Server time ──────────────────────────────────────────────────────────────

export interface ServerTimeDto { serverTimeMs: number; }

export async function fetchServerTime(): Promise<ServerTimeDto> {
  const res = await fetch(`${BASE_URL}/server-time`, {
    credentials: 'include', headers: authHeadersNoBody(),
  });
  if (!res.ok) throw new Error(`Failed to fetch server time: ${res.status}`);
  return res.json();
}

// ─── Simulate Advance ─────────────────────────────────────────────────────────
//
// Tells the backend to fill available cooking slots immediately — express orders
// first. Called after each simulation batch so orders don't pile up in PENDING.
// Non-fatal: a non-ok response returns { promoted: 0 } so simulation continues.

export async function simulateAdvance(): Promise<{ promoted: number }> {
  const res = await fetch(`${BASE_URL}/simulate-advance`, {
    method: 'POST', credentials: 'include', headers: authHeadersNoBody(),
  });
  if (!res.ok) return { promoted: 0 };
  return res.json();
}

// ─── Simulation ───────────────────────────────────────────────────────────────

export async function triggerSimulation(
  count:              number,
  availableMenuItems: MenuItemDto[],
  availableSlots:     SlotCapacityDto[] = [],
): Promise<SimulationResult> {
  if (availableMenuItems.length === 0) {
    throw new Error('No menu items available — cannot simulate orders');
  }

  const slotTracker = availableSlots.map(s => ({ ...s }));

  const payloads = Array.from({ length: count }, () => {
    const customerName = randomCustomerName();
    const orderType    = randomSimOrderType();
    const itemCount    = Math.floor(Math.random() * 3) + 1;
    const menuItemIds  = [...availableMenuItems]
      .sort(() => Math.random() - 0.5)
      .slice(0, itemCount)
      .map(m => m.id);
    const orderRef     = encodeOrderRef(generateOrderRef(customerName), orderType);
    return { orderRef, menuItemIds, customerName, orderType };
  });

  let generated = 0;
  let rejected  = 0;
  let lastRejectionReason: string | undefined;
  let kitchenFull = false;

  const BATCH_SIZE = 3;
  for (let i = 0; i < payloads.length && !kitchenFull; i += BATCH_SIZE) {
    const batch   = payloads.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async ({ orderRef, menuItemIds, customerName, orderType }) => {
        const orderId = await createOrder(orderRef, menuItemIds, customerName);

        if (orderType === 'normal' || orderType === 'scheduled') {
          const slot = orderType === 'normal'
            ? pickNormalSlot(slotTracker)
            : pickScheduledSlot(slotTracker);

          if (slot) {
            try {
              await reservePickupSlot(orderId, slot.id);
              const tracked = slotTracker.find(s => s.id === slot.id);
              if (tracked) tracked.remaining = Math.max(0, tracked.remaining - 1);
            } catch (slotErr: any) {
              console.warn(`[Sim] Slot reservation failed for ${orderRef}:`, slotErr.message);
            }
          }
        }
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        generated++;
      } else {
        rejected++;
        lastRejectionReason = result.reason?.message;
        if (lastRejectionReason?.includes('full capacity')) {
          kitchenFull = true;
        }
      }
    }

    // After each batch, tell the backend to fill cooking slots immediately.
    // Express orders are promoted first (sorted by ORDER_TYPE_WEIGHT in
    // promoteNextPendingOrder). Non-fatal — simulation continues regardless.
    if (generated > 0 && !kitchenFull) {
      try {
        await simulateAdvance();
      } catch {
        // swallow — advance is best-effort
      }
    }
  }

  return {
    generated,
    rejected,
    ...(lastRejectionReason ? { reason: lastRejectionReason } : {}),
  };
}