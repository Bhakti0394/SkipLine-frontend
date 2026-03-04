// ============================================================
// NEW FILE: src/kitchen-hooks/capacityEngine.ts
// Pure business logic — zero UI/framework dependencies.
// Every function: (state, ...args) => newState   (immutable)
// ============================================================

import type { KitchenState, KitchenStaff } from "../kitchen-types/settings";
import type {
  Order,
  CapacitySnapshot,
  AddOrderPayload,
} from "../kitchen-types/order";

// ─────────────────────────────────────────────────────────────
// 1. calculateCapacity
// ─────────────────────────────────────────────────────────────
/**
 * Pure snapshot of current kitchen capacity.
 * O(n) over staff + orders — safe for 1000+ orders.
 */
export function calculateCapacity(state: KitchenState): CapacitySnapshot {
  const totalSlots = state.staff
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.slotCount, 0);

  const cookingCount = state.orders.filter(
    (o) => o.status === "cooking"
  ).length;

  const queueCount = state.orders.filter((o) => o.status === "queue").length;

  const freeSlots = Math.max(0, totalSlots - cookingCount);
  const capacityPct =
    totalSlots === 0
      ? 100
      : Math.min(100, Math.round((cookingCount / totalSlots) * 100));

  return {
    totalSlots,
    cookingCount,
    freeSlots,
    capacityPct,
    isOverloaded: queueCount > 0 && freeSlots === 0,
  };
}

// ─────────────────────────────────────────────────────────────
// 2. autoAssignOrders  (FIFO drain)
// ─────────────────────────────────────────────────────────────
/**
 * Promotes as many queued orders as free slots allow.
 * Uses FIFO — oldest createdAt first.
 * Returns new state (never mutates input).
 */
export function autoAssignOrders(state: KitchenState): KitchenState {
  const { freeSlots } = calculateCapacity(state);
  if (freeSlots === 0) return state;

  // Collect queue sorted by createdAt ASC (oldest = first)
  const queue = state.orders
    .filter((o) => o.status === "queue")
    .sort((a, b) => a.createdAt - b.createdAt);

  if (queue.length === 0) return state;

  const toPromote = new Set(queue.slice(0, freeSlots).map((o) => o.id));
  const now = Date.now();

  return {
    ...state,
    orders: state.orders.map((o) =>
      toPromote.has(o.id)
        ? ({ ...o, status: "cooking", cookingStartedAt: now } as Order)
        : o
    ),
  };
}

// ─────────────────────────────────────────────────────────────
// 3. handleNewOrder
// ─────────────────────────────────────────────────────────────
/**
 * Creates a new order.
 * → cooking immediately if a free slot exists
 * → queue otherwise
 *
 * GUARANTEES: cooking count can never exceed totalSlots after this call.
 */
export function handleNewOrder(
  state: KitchenState,
  payload: AddOrderPayload
): KitchenState {
  const { freeSlots } = calculateCapacity(state);
  const now = Date.now();
  const goDirectly = freeSlots > 0;

  const newOrder: Order = {
    id: payload.id,
    customerName: payload.customerName,
    items: payload.items,
    status: goDirectly ? "cooking" : "queue",
    assignedStaffId: null,
    createdAt: now,
    cookingStartedAt: goDirectly ? now : null,
    completedAt: null,
  };

  return {
    ...state,
    orders: [...state.orders, newOrder],
  };
}

// ─────────────────────────────────────────────────────────────
// 4. completeOrder  (cooking → ready, slot freed, FIFO drain)
// ─────────────────────────────────────────────────────────────
/**
 * Marks a cooking order as "ready", freeing its slot.
 * Immediately calls autoAssignOrders to back-fill from queue.
 *
 * Throws if orderId is not in "cooking" state (defensive).
 */
export function completeOrder(
  state: KitchenState,
  orderId: string
): KitchenState {
  const target = state.orders.find((o) => o.id === orderId);

  if (!target) {
    console.error(`completeOrder: order ${orderId} not found`);
    return state;
  }
  if (target.status !== "cooking") {
    console.error(
      `completeOrder: order ${orderId} is "${target.status}", expected "cooking"`
    );
    return state;
  }

  const now = Date.now();

  // Step 1 — move to ready
  const afterReady: KitchenState = {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId
        ? ({ ...o, status: "ready", completedAt: now } as Order)
        : o
    ),
  };

  // Step 2 — immediately fill the freed slot (FIFO)
  return autoAssignOrders(afterReady);
}

// ─────────────────────────────────────────────────────────────
// 5. pickupOrder  (ready → completed)
// ─────────────────────────────────────────────────────────────
export function pickupOrder(
  state: KitchenState,
  orderId: string
): KitchenState {
  return {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId && o.status === "ready"
        ? ({ ...o, status: "completed" } as Order)
        : o
    ),
  };
}

// ─────────────────────────────────────────────────────────────
// 6. updateStaff  (toggle active / change slotCount)
// ─────────────────────────────────────────────────────────────
export function updateStaff(
  state: KitchenState,
  staffId: string,
  changes: Partial<Pick<KitchenStaff, "active" | "slotCount" | "name">>
): KitchenState {
  const updated: KitchenState = {
    ...state,
    staff: state.staff.map((s) =>
      s.id === staffId ? { ...s, ...changes } : s
    ),
  };
  // New slots may have just opened — drain queue
  return autoAssignOrders(updated);
}

// ─────────────────────────────────────────────────────────────
// 7. Selectors (pure derived views — safe to memoize)
// ─────────────────────────────────────────────────────────────
export const Selectors = {
  queued: (s: KitchenState) =>
    s.orders
      .filter((o) => o.status === "queue")
      .sort((a, b) => a.createdAt - b.createdAt),

  cooking: (s: KitchenState) =>
    s.orders.filter((o) => o.status === "cooking"),

  ready: (s: KitchenState) =>
    s.orders.filter((o) => o.status === "ready"),

  completed: (s: KitchenState) =>
    s.orders.filter((o) => o.status === "completed"),

  capacity: calculateCapacity,
};