// ============================================================
// src/kitchen-types/order.ts
// ============================================================

export type OrderStatus = 'pending' | 'cooking' | 'ready' | 'completed';
export type OrderPriority = 'normal' | 'high' | 'urgent';

// Full backend status enum — matches backend OrderStatus exactly
export type BackendOrderStatus = 'PENDING' | 'COOKING' | 'READY' | 'COMPLETED';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  prepTime: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  status: OrderStatus;
  // Exact backend status — preserved so canTransition() works correctly
  backendStatus?: BackendOrderStatus;
  priority: OrderPriority;
  pickupTime: string;
  estimatedPrepTime: number;
  elapsedMinutes: number;
  assignedTo?: string;
  assignedChefId?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface CapacitySnapshot {
  totalSlots: number;
  cookingCount: number;
  freeSlots: number;
  capacityPct: number;
  isOverloaded: boolean;
}

export interface AddOrderPayload {
  customerName: string;
  menuItemIds: string[];
}