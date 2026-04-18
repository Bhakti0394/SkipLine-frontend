// ============================================================
// src/kitchen-types/order.ts
// ============================================================

export type OrderStatus        = 'pending' | 'cooking' | 'ready' | 'completed';
export type BackendOrderStatus = 'PENDING' | 'COOKING' | 'READY' | 'COMPLETED';

// ─── Order type ───────────────────────────────────────────────────────────────
// express   = placed from Express tab (isExpress meal, now mode)  → cook first
// normal    = standard slot-based pre-order                       → regular queue
// scheduled = pre-booked for tomorrow                             → plan ahead
export type OrderType = 'express' | 'normal' | 'scheduled';

// Keep OrderPriority as alias so any existing imports don't break
export type OrderPriority = OrderType;

export interface OrderItem {
  id:         string;
  menuItemId: string;
  name:       string;
  quantity:   number;
  prepTime:   number;
  notes?:     string;
}

export interface Order {
  id:                string;
  orderNumber:       string;
  customerName:      string;
  items:             OrderItem[];
  status:            OrderStatus;
  backendStatus?:    BackendOrderStatus;
  orderType:         OrderType;
  pickupTime:        string;
  estimatedPrepTime: number;
  elapsedMinutes:    number;
  assignedTo?:       string;
  assignedChefId?:   string;
  createdAt:         Date;
  startedAt?:        Date;   // cookingStartedAt from backend
  readyAt?:          Date;   // FIX [F1]: was missing – useOrderTimer resolveReadyAnchorMs reads this
  completedAt?:      Date;
  // FIX [F2]: was missing – toFrontendOrder spreads this; useOrderTimer + KanbanBoard sort read it
  pickupSlotMs?:     number; // epoch ms of pickup slot – used by timers and priority sort
}

export interface CapacitySnapshot {
  totalSlots:   number;
  cookingCount: number;
  freeSlots:    number;
  capacityPct:  number;
  isOverloaded: boolean;
}

export interface AddOrderPayload {
  customerName: string;
  menuItemIds:  string[];
}

// ─── Sort weight – lower = rendered first in column ───────────────────────────
export const ORDER_TYPE_WEIGHT: Record<OrderType, number> = {
  express:   0,
  normal:    1,
  scheduled: 2,
};

// Keep PRIORITY_WEIGHT alias so KanbanBoard sort logic still compiles
// Keep PRIORITY_WEIGHT alias — spread to prevent shared-reference mutation
export const PRIORITY_WEIGHT: Record<OrderType, number> = { ...ORDER_TYPE_WEIGHT };

// ─── Badge visual config ──────────────────────────────────────────────────────
export const ORDER_TYPE_BADGE: Record<OrderType, {
  emoji:  string;
  label:  string;
  color:  string;
  bg:     string;
  border: string;
}> = {
  express: {
    emoji:  '⚡',
    label:  'Express',
    color:  '#fb923c',
    bg:     'rgba(249,115,22,0.12)',
    border: '1px solid rgba(249,115,22,0.35)',
  },
  normal: {
    emoji:  '🕒',
    label:  'Normal',
    color:  '#94a3b8',
    bg:     'rgba(100,116,139,0.10)',
    border: '1px solid rgba(100,116,139,0.25)',
  },
  scheduled: {
    emoji:  '📅',
    label:  'Scheduled',
    color:  '#6ee7b7',
    bg:     'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.30)',
  },
};


export const PRIORITY_BADGE: typeof ORDER_TYPE_BADGE = { ...ORDER_TYPE_BADGE };