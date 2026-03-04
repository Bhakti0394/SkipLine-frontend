// src/kitchen-api/kitchenApi.ts

const BASE_URL = '/api/kitchen';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface OrderCardDto {
  id: string;
  orderRef: string;
  status: 'PENDING' | 'COOKING' | 'READY' | 'COMPLETED';
  itemSummary: string[];
  assignedChefName: string | null;
  pickupSlotTime: string | null;
  totalPrepMinutes: number;
  placedAt: string;
  elapsedMinutes: number;
  isLate: boolean;
}

export interface KitchenMetricsDto {
  avgCookTimeMinutes: number;
  efficiencyPercent: number;
  capacityUtilizationPercent: number;
  completedOrderCount: number;
}

export interface StaffWorkloadDto {
  chefId: string;
  name: string;
  activeOrders: number;
  maxCapacity: number;
  loadPercent: number;
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

// ── Board ────────────────────────────────────────────────────────────────────

export async function fetchBoard(): Promise<KanbanBoardResponse> {
  const res = await fetch(`${BASE_URL}/board`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch board: ${res.status}`);
  return res.json();
}

// ── Menu Items ───────────────────────────────────────────────────────────────

export async function fetchMenuItems(): Promise<MenuItemDto[]> {
  const res = await fetch(`${BASE_URL}/menu-items`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch menu items: ${res.status}`);
  return res.json();
}

// ── Staff ─────────────────────────────────────────────────────────────────────

/** Returns all staff active today with live workload counts. */
export async function fetchStaff(): Promise<StaffWorkloadDto[]> {
  const res = await fetch(`${BASE_URL}/staff`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch staff: ${res.status}`);
  return res.json();
}

/** Creates a new kitchen staff member. */
export async function createStaff(dto: CreateStaffDto): Promise<StaffWorkloadDto> {
  const res = await fetch(`${BASE_URL}/staff`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Create staff failed: ${res.status}`);
  }
  return res.json();
}

/** Toggles a staff member's active-today flag. */
export async function toggleStaffActive(chefId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/staff/${chefId}/toggle-active`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Toggle staff failed: ${res.status}`);
}

// ── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(
  orderRef: string,
  menuItemIds: string[]
): Promise<string> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderRef, menuItemIds }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Create order failed: ${res.status}`);
  }
  return res.json();
}

export async function changeOrderStatus(
  orderId: string,
  targetStatus: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetStatus }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Status change failed: ${res.status}`);
  }
}

export async function assignChef(
  orderId: string,
  chefId: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/assign-chef`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chefId }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Chef assignment failed: ${res.status}`);
  }
}

export async function fetchMetrics(date?: string): Promise<KitchenMetricsDto> {
  const url = date ? `${BASE_URL}/metrics?date=${date}` : `${BASE_URL}/metrics`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.status}`);
  return res.json();
}