// ============================================================
// src/kitchen-api/kitchenApi.ts  —  FIXED
// ============================================================

const BASE_URL = '/api/kitchen';

// ─── Auth helper ──────────────────────────────────────────────────────────────
// Reads JWT from localStorage (set by AuthContext on login).
function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface OrderCardDto {
  id: string;
  orderRef: string;
  status: 'PENDING' | 'COOKING' | 'READY' | 'COMPLETED';
  customerName: string | null;
  itemSummary: string[];
  assignedChefName: string | null;
  assignedChefId: string | null;
  pickupSlotTime: string | null;
  totalPrepMinutes: number;
  placedAt: string;
  elapsedMinutes: number;
  isLate: boolean;
}

export interface KitchenMetricsDto {
  totalOrdersToday: number;
  completedOrdersToday: number;
  avgCookTimeMinutes: number;
  efficiencyPercent: number;
  capacityUtilizationPercent: number;
  lateOrdersCount: number;
  activeChefCount: number;
}

export interface StaffWorkloadDto {
  chefId: string;
  name: string;
  activeOrders: number;
  maxCapacity: number;
  loadPercent: number;
  onShift: boolean;
  status: 'available' | 'busy' | 'full';
  completedToday: number;
}

export interface StaffRemovalValidationDto {
  canRemove: boolean;
  blocked: boolean;
  blockReason?: string;
  ordersToReassign: number;
  estimatedDelayMinutes: number;
  newCapacity: number;
  ordersToThrottle: number;
  affectedOrderIds: string[];
}

export interface SlotCapacityDto {
  slotId: string;
  slotTime: string;
  maxCapacity: number;
  currentBookings: number;
  remaining: number;
}

export interface BoardColumns {
  PENDING: OrderCardDto[];
  COOKING: OrderCardDto[];
  READY: OrderCardDto[];
  COMPLETED: OrderCardDto[];
}

export interface KanbanBoardResponse {
  columns: BoardColumns;
  metrics: KitchenMetricsDto;
  staff: StaffWorkloadDto[];
  upcomingSlots: SlotCapacityDto[];
}

export interface MenuItemDto {
  id: string;
  name: string;
  prepTimeMinutes: number;
  available: boolean;
}

export interface CreateStaffDto {
  name: string;
  maxConcurrentOrders: number;
  activeToday: boolean;
}

export interface SimulationResult {
  generated: number;
  rejected: number;
  reason?: string;
}

// ─── Unique orderRef generator ────────────────────────────────────────────────
// FIX: Old code used Date.now() which collides on rapid bursts.
// Now uses crypto.randomUUID() prefix so every ref is guaranteed unique.
let _simCounter = 0;
function generateOrderRef(customerName: string): string {
  _simCounter = (_simCounter + 1) % 10000;
  const uid = crypto.randomUUID().slice(0, 8).toUpperCase();
  // Format: SIM-<CustomerFirstName><Counter>-<uid>
  // e.g.  SIM-Priya0042-A3F1C9D2
  const firstName = customerName.split(' ')[0];
  return `SIM-${firstName}${String(_simCounter).padStart(4, '0')}-${uid}`;
}

// ─── Simulated customer name pool ─────────────────────────────────────────────
const SIM_CUSTOMER_NAMES = [
  'Priya Sharma', 'Rahul Mehta', 'Sneha Iyer', 'Karan Verma',
  'Ananya Nair', 'Dev Patel', 'Pooja Desai', 'Arjun Singh',
  'Meera Joshi', 'Rohan Gupta', 'Lakshmi Rao', 'Vikram Bose',
  'Kavya Pillai', 'Nikhil Shah', 'Divya Reddy', 'Aditya Kumar',
];

function randomCustomerName(): string {
  return SIM_CUSTOMER_NAMES[Math.floor(Math.random() * SIM_CUSTOMER_NAMES.length)];
}

// ── Board ─────────────────────────────────────────────────────────────────────

export async function fetchBoard(): Promise<KanbanBoardResponse> {
  const res = await fetch(`${BASE_URL}/board`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch board: ${res.status}`);
  return res.json();
}

// ── Menu Items ────────────────────────────────────────────────────────────────

export async function fetchMenuItems(): Promise<MenuItemDto[]> {
  const res = await fetch(`${BASE_URL}/menu-items`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch menu items: ${res.status}`);
  return res.json();
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export async function fetchStaff(): Promise<StaffWorkloadDto[]> {
  const res = await fetch(`${BASE_URL}/staff`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch staff: ${res.status}`);
  return res.json();
}

export async function createStaff(dto: CreateStaffDto): Promise<StaffWorkloadDto> {
  const res = await fetch(`${BASE_URL}/staff`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Create staff failed: ${res.status}`);
  }
  return res.json();
}

export async function activateChef(chefId: string): Promise<StaffWorkloadDto[]> {
  const res = await fetch(`${BASE_URL}/staff/${chefId}/activate`, {
    method: 'PATCH',
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Activate chef failed: ${res.status}`);
  }
  return res.json();
}

export async function validateRemoval(chefId: string): Promise<StaffRemovalValidationDto> {
  const res = await fetch(`${BASE_URL}/staff/${chefId}/validate-removal`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Validate removal failed: ${res.status}`);
  }
  return res.json();
}

export async function removeChefFromShift(chefId: string): Promise<StaffWorkloadDto[]> {
  const res = await fetch(`${BASE_URL}/staff/${chefId}/remove-from-shift`, {
    method: 'PATCH',
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Remove from shift failed: ${res.status}`);
  }
  return res.json();
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function createOrder(
  orderRef: string,
  menuItemIds: string[],
  customerName?: string,
): Promise<string> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({ orderRef, menuItemIds, customerName }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Create order failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Valid transitions (enforced on backend too):
 *   PENDING → COOKING → READY → COMPLETED
 *   ANY     → CANCELLED
 */
export async function changeOrderStatus(
  orderId: string,
  targetStatus: 'PENDING' | 'COOKING' | 'READY' | 'COMPLETED' | 'CANCELLED',
): Promise<void> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({ targetStatus }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Status change failed: ${res.status}`);
  }
}

export async function assignChef(orderId: string, chefId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/assign-chef`, {
    method: 'PATCH',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({ chefId }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Chef assignment failed: ${res.status}`);
  }
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export async function fetchMetrics(date?: string): Promise<KitchenMetricsDto> {
  const url = date ? `${BASE_URL}/metrics?date=${date}` : `${BASE_URL}/metrics`;
  const res = await fetch(url, { credentials: 'include', headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.status}`);
  return res.json();
}

// ── Simulation ────────────────────────────────────────────────────────────────
// FIX 1: Each order now gets a guaranteed-unique orderRef via crypto.randomUUID()
// FIX 2: customerName is passed so orders don't display as "Order SIM-..."
// FIX 3: Stops immediately on capacity-full, doesn't hammer the backend

export async function triggerSimulation(
  count: number,
  availableMenuItems: MenuItemDto[],
): Promise<SimulationResult> {
  if (availableMenuItems.length === 0) {
    throw new Error('No menu items available — cannot simulate orders');
  }

  let generated = 0;
  let rejected = 0;
  let lastRejectionReason: string | undefined;

  for (let i = 0; i < count; i++) {
    const customerName = randomCustomerName();
    const itemCount    = Math.floor(Math.random() * 3) + 1;
    const shuffled     = [...availableMenuItems].sort(() => Math.random() - 0.5);
    const menuItemIds  = shuffled.slice(0, itemCount).map(m => m.id);
    const orderRef     = generateOrderRef(customerName);

    try {
      await createOrder(orderRef, menuItemIds, customerName);
      generated++;
    } catch (err: any) {
      rejected++;
      lastRejectionReason = err.message;
      // Stop immediately on capacity-full — no point hammering the backend
      if (err.message?.includes('full capacity') || err.message?.includes('at full capacity')) {
        break;
      }
    }
  }

  return {
    generated,
    rejected,
    ...(lastRejectionReason ? { reason: lastRejectionReason } : {}),
  };
}

// ── Server time sync ──────────────────────────────────────────────────────────

export interface ServerTimeDto {
  serverTimeMs: number;
}

export async function fetchServerTime(): Promise<ServerTimeDto> {
  const res = await fetch(`${BASE_URL}/server-time`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch server time: ${res.status}`);
  return res.json();
}