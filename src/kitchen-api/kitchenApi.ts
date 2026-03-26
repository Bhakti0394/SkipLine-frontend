// ============================================================
// src/kitchen-api/kitchenApi.ts
// ============================================================

const BASE_URL     = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api/kitchen';
const CUSTOMER_URL = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api/customer';

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

function customerAuthHeaders(): HeadersInit {
  const token       = localStorage.getItem('auth_token');
  const displayName = localStorage.getItem('auth_full_name');
  return {
    ...(token       ? { Authorization: `Bearer ${token}` }       : {}),
    ...(displayName ? { 'X-Customer-Display-Name': displayName } : {}),
  };
}

// ── 401 handler ───────────────────────────────────────────────────────────────
function handle401(res: Response): void {
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_full_name');
    window.location.href = '/auth?mode=login';
  }
}
// ── Kitchen DTOs ──────────────────────────────────────────────────────────────

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
  slotId:          string;
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
  price:           number | null;
  category:        string | null;
  imageUrl:        string | null;
  isExpress:       boolean;
}

export interface CreateStaffDto {
  name:                string;
  maxConcurrentOrders: number;
  status:              'ACTIVE' | 'BACKUP';
}

export interface SimulationResult {
  generated: number;
  rejected:  number;
  reason?:   string;
}

// ── Inventory DTOs ────────────────────────────────────────────────────────────

export type FrontendStockStatus =
  | 'in-stock'
  | 'low-stock'
  | 'critical'
  | 'out-of-stock';

export interface InventoryItemDto {
  id:                string;
  name:              string;
  category:          string;
  currentStock:      number;
  maxCapacity:       number;
  unit:              string;
  minThreshold:      number;
  criticalThreshold: number;
  costPerUnit:       number;
  supplier?:         string;
  lastRestocked:     string;
  expiryDate?:       string;
  stockStatus:       FrontendStockStatus;
}

// ── Customer Order DTOs ───────────────────────────────────────────────────────

export interface CustomerOrderDto {
  id:               string;
  orderRef:         string;
  status:           'pending' | 'cooking' | 'ready' | 'completed' | 'cancelled';
  customerName:     string;
  itemSummary:      string[];
  totalPrice:       number;
  pickupSlotTime:   string | null;
  totalPrepMinutes: number;
  placedAt:         string;
  cookingStartedAt: string | null;
  readyAt:          string | null;
  completedAt:      string | null;
}

export interface PlaceOrderRequest {
  orderRef:      string;
  menuItemIds:   string[];
  pickupSlotId?: string;
}

export interface CustomerMetricsDto {
  ordersThisMonth:  number;
  timeSaved:        number;
  loyaltyPoints:    number;
  foodWasteReduced: number;
}

export interface CustomerKitchenSummaryDto {
  topDishName:       string;
  topDishOrders:     number;
  busiestHourTime:   string;
  busiestHourOrders: number;
  avgPrepMinutes:    number;
  hasBottleneck:     boolean;
  bottleneckReason:  string | null;
}

export interface CustomerSlotDto {
  slotId:          string;
  slotTime:        string;
  displayTime:     string;
  period:          string;
  maxCapacity:     number;
  currentBookings: number;
  remaining:       number;
}

export interface CustomerPlatformStatsDto {
  totalOrdersDelivered: number;
  totalCustomers:       number;
  totalMenuItems:       number;
  avgRating:            string;
}

// ── OrderRef helpers ──────────────────────────────────────────────────────────

export function generateOrderRef(customerName: string): string {
  const uid       = crypto.randomUUID().slice(0, 8).toUpperCase();
  const firstName = customerName.split(' ')[0];
  const ts        = Date.now().toString(36).toUpperCase().slice(-4);
  return `SIM-${firstName}${ts}-${uid}`;
}

export function generateCustomerOrderRef(customerName: string): string {
  const uid       = crypto.randomUUID().slice(0, 8).toUpperCase();
  const firstName = (customerName.split('@')[0]).split(' ')[0];
  const ts        = Date.now().toString(36).toUpperCase().slice(-4);
  return `ORD-${firstName}${ts}-${uid}`;
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

// ── Slot selection helpers ────────────────────────────────────────────────────

function pickNormalSlot(slots: SlotCapacityDto[]): SlotCapacityDto | null {
  const now      = Date.now();
  const minAhead = 20  * 60 * 1000;
  const maxAhead = 120 * 60 * 1000;
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

// ── Board ─────────────────────────────────────────────────────────────────────

export async function fetchBoard(signal?: AbortSignal): Promise<KanbanBoardResponse> {
  const res = await fetch(`${BASE_URL}/board`, {
    credentials: 'include', headers: authHeadersNoBody(), signal,
  });
  handle401(res);
  if (!res.ok) throw new Error(`Failed to fetch board: ${res.status}`);
  return res.json();
}

// ── Menu ──────────────────────────────────────────────────────────────────────

export async function fetchMenuItems(): Promise<MenuItemDto[]> {
  const res = await fetch(`${BASE_URL}/menu-items`, {
    credentials: 'include', headers: authHeadersNoBody(),
  });
  handle401(res);
  if (!res.ok) throw new Error(`Failed to fetch menu items: ${res.status}`);
  return res.json();
}

export async function fetchCustomerMenuItems(): Promise<MenuItemDto[]> {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${CUSTOMER_URL}/menu-items`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch menu items: ${res.status}`);
  return res.json();
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export async function fetchStaff(): Promise<StaffWorkloadDto[]> {
  const res = await fetch(`${BASE_URL}/staff`, {
    credentials: 'include', headers: authHeadersNoBody(),
  });
 handle401(res);
  if (!res.ok) throw new Error(`Failed to fetch staff: ${res.status}`);
  return res.json();
}

export async function createStaff(dto: CreateStaffDto): Promise<StaffWorkloadDto> {
  const res = await fetch(`${BASE_URL}/staff`, {
    method: 'POST', credentials: 'include', headers: authHeaders(),
    body: JSON.stringify({ name: dto.name, maxConcurrentOrders: dto.maxConcurrentOrders, status: dto.status }),
  });
 handle401(res);
  if (!res.ok) throw new Error((await res.text()) || `Create staff failed: ${res.status}`);
  return res.json();
}

export async function activateChef(chefId: string): Promise<StaffWorkloadDto[]> {
  const res = await fetch(`${BASE_URL}/staff/${chefId}/activate`, {
    method: 'PATCH', credentials: 'include', headers: authHeadersNoBody(),
  });
  handle401(res);
  if (!res.ok) throw new Error((await res.text()) || `Activate chef failed: ${res.status}`);
  return res.json();
}

export async function validateRemoval(chefId: string): Promise<StaffRemovalValidationDto> {
  const res = await fetch(`${BASE_URL}/staff/${chefId}/validate-removal`, {
    credentials: 'include', headers: authHeadersNoBody(),
  });
  handle401(res);
  if (!res.ok) throw new Error((await res.text()) || `Validate removal failed: ${res.status}`);
  return res.json();
}

export async function removeChefFromShift(chefId: string): Promise<StaffWorkloadDto[]> {
  const res = await fetch(`${BASE_URL}/staff/${chefId}/remove-from-shift`, {
    method: 'PATCH', credentials: 'include', headers: authHeadersNoBody(),
  });
  handle401(res);
  if (!res.ok) throw new Error((await res.text()) || `Remove from shift failed: ${res.status}`);
  return res.json();
}

// ── Orders (kitchen sim) ──────────────────────────────────────────────────────

export async function createOrder(
  orderRef: string, menuItemIds: string[], customerName?: string,
): Promise<string> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST', credentials: 'include', headers: authHeaders(),
    body: JSON.stringify({ orderRef, menuItemIds, customerName }),
  });
 handle401(res);
  if (!res.ok) throw new Error((await res.text()) || `Create order failed: ${res.status}`);
  return res.json();
}

export async function reservePickupSlot(orderId: string, slotId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/reserve-slot?slotId=${slotId}`, {
    method: 'PATCH', credentials: 'include', headers: authHeadersNoBody(),
  });
 handle401(res);
  if (!res.ok) throw new Error((await res.text()) || `Reserve slot failed: ${res.status}`);
}

export async function changeOrderStatus(
  orderId: string,
  targetStatus: 'PENDING' | 'COOKING' | 'READY' | 'COMPLETED' | 'CANCELLED',
): Promise<void> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: 'PATCH', credentials: 'include', headers: authHeaders(),
    body: JSON.stringify({ targetStatus }),
  });
    handle401(res);
  if (!res.ok) throw new Error((await res.text()) || `Status change failed: ${res.status}`);
}

export async function assignChef(orderId: string, chefId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/assign-chef`, {
    method: 'PATCH', credentials: 'include', headers: authHeaders(),
    body: JSON.stringify({ chefId }),
  });
   handle401(res);
  if (!res.ok) throw new Error((await res.text()) || `Chef assignment failed: ${res.status}`);
}

// ── Customer Orders ───────────────────────────────────────────────────────────
// FIX [CUSTOMER-403]: removed `credentials: 'include'` from all /api/customer/**
// fetch calls. The Vite proxy forwards /api/* to localhost:8080, so the browser
// origin is localhost:5173. Cookies set by the backend are scoped to port 8080
// and are NOT sent when credentials:include is used through the proxy — the
// browser sees a cross-origin mismatch on the cookie domain/port.
//
// The Authorization: Bearer <token> header in customerAuthHeaders() is sufficient
// for authentication (JwtAuthFilter reads it). Removing credentials:include means
// no cookie is attempted, no CORS preflight conflict, and the Bearer token alone
// authenticates the request correctly.

export async function placeCustomerOrder(req: PlaceOrderRequest): Promise<CustomerOrderDto> {
  const res = await fetch(`${CUSTOMER_URL}/orders`, {
    method: 'POST',
    headers: { ...customerAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  handle401(res);
  if (!res.ok) throw new Error((await res.text()) || `Order failed: ${res.status}`);
  return res.json();
}

export async function fetchCustomerOrders(): Promise<CustomerOrderDto[]> {
  const res = await fetch(`${CUSTOMER_URL}/orders`, {
    headers: customerAuthHeaders(),
  });
  handle401(res);
  if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`);
  return res.json();
}

export async function fetchCustomerOrder(orderId: string): Promise<CustomerOrderDto> {
  const res = await fetch(`${CUSTOMER_URL}/orders/${orderId}`, {
    headers: customerAuthHeaders(),
  });
   handle401(res);
  if (!res.ok) throw new Error(`Order not found: ${res.status}`);
  return res.json();
}

// ── Customer Metrics ──────────────────────────────────────────────────────────

export async function fetchCustomerMetrics(): Promise<CustomerMetricsDto> {
  const res = await fetch(`${CUSTOMER_URL}/metrics`, {
    headers: customerAuthHeaders(),
  });
 handle401(res);
  if (!res.ok) throw new Error(`Failed to fetch customer metrics: ${res.status}`);
  return res.json();
}

// ── Customer Streak ───────────────────────────────────────────────────────────

export async function fetchCustomerStreak(): Promise<number> {
  const res = await fetch(`${CUSTOMER_URL}/streak`, {
    headers: customerAuthHeaders(),
  });
 handle401(res);
  if (!res.ok) return 0;
  const data = await res.json();
  return typeof data.streak === 'number' ? data.streak : 0;
}

// ── Customer Kitchen Summary ──────────────────────────────────────────────────

const KITCHEN_SUMMARY_FALLBACK: CustomerKitchenSummaryDto = {
  topDishName: 'Butter Chicken', topDishOrders: 0,
  busiestHourTime: '—', busiestHourOrders: 0,
  avgPrepMinutes: 12, hasBottleneck: false, bottleneckReason: null,
};

export async function fetchCustomerKitchenSummary(): Promise<CustomerKitchenSummaryDto> {
  try {
    const res = await fetch(`${CUSTOMER_URL}/kitchen-summary`, {
      headers: customerAuthHeaders(),
    });
    handle401(res);
    if (!res.ok) return KITCHEN_SUMMARY_FALLBACK;
    return res.json();
  } catch {
    return KITCHEN_SUMMARY_FALLBACK;
  }
}

// ── Customer Slots ────────────────────────────────────────────────────────────

export async function fetchCustomerSlots(): Promise<CustomerSlotDto[]> {
  try {
    const res = await fetch(`${CUSTOMER_URL}/slots`, {
      headers: customerAuthHeaders(),
    });
   handle401(res);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchCustomerSlotsTomorrow(): Promise<CustomerSlotDto[]> {
  try {
    const res = await fetch(`${CUSTOMER_URL}/slots/tomorrow`, {
      headers: customerAuthHeaders(),
    });
    handle401(res);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ── Customer Platform Stats ───────────────────────────────────────────────────

const STATS_FALLBACK: CustomerPlatformStatsDto = {
  totalOrdersDelivered: 0,
  totalCustomers:       0,
  totalMenuItems:       0,
  avgRating:            '4.8',
};

export async function fetchCustomerPlatformStats(): Promise<CustomerPlatformStatsDto> {
  try {
    const res = await fetch(`${CUSTOMER_URL}/stats`, {
      headers: authHeadersNoBody(),
    });
     handle401(res);
    if (!res.ok) return STATS_FALLBACK;
    return res.json();
  } catch {
    return STATS_FALLBACK;
  }
}

// ── SSE subscription ──────────────────────────────────────────────────────────

export function subscribeToOrderStatus(
  orderId:  string,
  onStatus: (status: string) => void,
  onError?: (err: Event) => void,
): () => void {
  const token = localStorage.getItem('auth_token');
  const url   = `${CUSTOMER_URL}/sse/orders/${orderId}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  const es    = new EventSource(url, { withCredentials: true });

  es.addEventListener('status_update', (event: MessageEvent) => {
    try {
      const payload = JSON.parse(event.data) as { orderId: string; status: string };
      if (payload.orderId === orderId) onStatus(payload.status);
    } catch {
      console.warn('[SSE] Could not parse status_update payload:', event.data);
    }
  });

  es.addEventListener('connected', () => {
    console.debug(`[SSE] Connected for order ${orderId}`);
  });

  es.onerror = (err) => {
    console.warn(`[SSE] Error for order ${orderId} — closing and handing off to polling`, err);
    es.close();
    onError?.(err);
  };

  return () => { es.close(); };
}

// ── Metrics (kitchen) ─────────────────────────────────────────────────────────

export async function fetchMetrics(date?: string): Promise<KitchenMetricsDto> {
  const url = date ? `${BASE_URL}/metrics?date=${date}` : `${BASE_URL}/metrics`;
  const res = await fetch(url, { credentials: 'include', headers: authHeadersNoBody() });
 handle401(res);
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.status}`);
  return res.json();
}

// ── Server time ───────────────────────────────────────────────────────────────

export interface ServerTimeDto { serverTimeMs: number; }

export async function fetchServerTime(): Promise<ServerTimeDto> {
  const res = await fetch(`${BASE_URL}/server-time`, {
    credentials: 'include', headers: authHeadersNoBody(),
  });
  handle401(res);
  if (!res.ok) throw new Error(`Failed to fetch server time: ${res.status}`);
  return res.json();
}

// ── Simulate Advance ──────────────────────────────────────────────────────────

export async function simulateAdvance(): Promise<{ promoted: number }> {
  const res = await fetch(`${BASE_URL}/simulate-advance`, {
    method: 'POST', credentials: 'include', headers: authHeadersNoBody(),
  });
  if (!res.ok) return { promoted: 0 };
  return res.json();
}

// ── Simulation ────────────────────────────────────────────────────────────────

export async function triggerSimulation(
  count:              number,
  availableMenuItems: MenuItemDto[],
  availableSlots:     SlotCapacityDto[] = [],
): Promise<SimulationResult> {
  if (availableMenuItems.length === 0)
    throw new Error('No menu items available — cannot simulate orders');

  const slotTracker = availableSlots.map(s => ({ ...s }));
  const payloads    = Array.from({ length: count }, () => {
    const customerName = randomCustomerName();
    const orderType    = randomSimOrderType();
    const itemCount    = Math.floor(Math.random() * 3) + 1;
    const menuItemIds  = [...availableMenuItems]
      .sort(() => Math.random() - 0.5).slice(0, itemCount).map(m => m.id);
    const orderRef = encodeOrderRef(generateOrderRef(customerName), orderType);
    return { orderRef, menuItemIds, customerName, orderType };
  });

  let generated = 0, rejected = 0;
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
            ? pickNormalSlot(slotTracker) : pickScheduledSlot(slotTracker);
          if (slot) {
            try {
              await reservePickupSlot(orderId, slot.slotId);
              const tracked = slotTracker.find(s => s.slotId === slot.slotId);
              if (tracked) tracked.remaining = Math.max(0, tracked.remaining - 1);
            } catch (slotErr: any) {
              console.warn(`[Sim] Slot reservation failed for ${orderRef}:`, slotErr.message);
            }
          }
        }
      }),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') { generated++; }
      else {
        rejected++;
        lastRejectionReason = result.reason?.message;
        if (lastRejectionReason?.includes('full capacity')) kitchenFull = true;
      }
    }
    if (generated > 0 && !kitchenFull) {
      try { await simulateAdvance(); } catch { /* swallow */ }
    }
  }
  return { generated, rejected, ...(lastRejectionReason ? { reason: lastRejectionReason } : {}) };
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export async function fetchInventory(): Promise<InventoryItemDto[]> {
  const res = await fetch(`${BASE_URL}/inventory`, {
    credentials: 'include', headers: authHeadersNoBody(),
  });
  if (!res.ok) throw new Error(`Failed to fetch inventory: ${res.status}`);
  return res.json();
}

export async function updateInventoryStock(itemId: string, newStock: number): Promise<InventoryItemDto> {
  const res = await fetch(`${BASE_URL}/inventory/${itemId}/stock`, {
    method: 'PATCH', credentials: 'include', headers: authHeaders(),
    body: JSON.stringify({ newStock }),
  });
  if (!res.ok) throw new Error((await res.text()) || `Update stock failed: ${res.status}`);
  return res.json();
}

export async function restockInventoryItem(itemId: string, quantity: number): Promise<InventoryItemDto> {
  const res = await fetch(`${BASE_URL}/inventory/${itemId}/restock`, {
    method: 'PATCH', credentials: 'include', headers: authHeaders(),
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error((await res.text()) || `Restock failed: ${res.status}`);
  return res.json();
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/inventory/${itemId}`, {
    method: 'DELETE', credentials: 'include', headers: authHeadersNoBody(),
  });
  if (!res.ok) throw new Error((await res.text()) || `Delete failed: ${res.status}`);
}