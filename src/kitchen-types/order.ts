// ============================================================
// REPLACE: src/kitchen-types/order.ts
// ============================================================

export type OrderStatus = "queue" | "cooking" | "ready" | "completed";

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  status: OrderStatus;
  assignedStaffId: string | null;
  createdAt: number;         // epoch ms — FIFO sort key
  cookingStartedAt: number | null;
  completedAt: number | null;
}

// Derived snapshot — computed, never stored
export interface CapacitySnapshot {
  totalSlots: number;     // sum of slotCount for all active staff
  cookingCount: number;   // orders currently in "cooking"
  freeSlots: number;      // totalSlots - cookingCount  (never negative)
  capacityPct: number;    // (cookingCount / totalSlots) * 100, capped 0–100
  isOverloaded: boolean;  // queue non-empty AND capacityPct === 100
}

export interface AddOrderPayload {
  id: string;
  customerName: string;
  items: OrderItem[];
}