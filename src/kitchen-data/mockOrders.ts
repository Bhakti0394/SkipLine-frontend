// ============================================================
// REPLACE: src/kitchen-data/mockOrders.ts
// Run as a simulation demo: npx ts-node src/kitchen-data/mockOrders.ts
// ============================================================

import {
  calculateCapacity,
  handleNewOrder,
  completeOrder,
} from "../kitchen-hooks/Capacityengine";
import type { KitchenState } from "../kitchen-types/settings";

// ── Setup ─────────────────────────────────────────────────────

const initialState: KitchenState = {
  staff: [
    { id: "s1", name: "Arjun", active: true, slotCount: 2 },
    { id: "s2", name: "Priya", active: true, slotCount: 2 },
    { id: "s3", name: "Rahul", active: true, slotCount: 2 },
    { id: "s4", name: "Sneha", active: true, slotCount: 2 },
  ],
  orders: [],
  settings: { defaultSlotCount: 2, autoAssignEnabled: true, overloadThresholdPct: 80 },
};

// ── Logging helper ────────────────────────────────────────────

function log(label: string, state: KitchenState) {
  const cap = calculateCapacity(state);
  const q   = state.orders.filter(o => o.status === "queue").length;
  const c   = state.orders.filter(o => o.status === "cooking").length;
  const r   = state.orders.filter(o => o.status === "ready").length;

  console.log(
    `[${label.padEnd(22)}] ` +
    `queue=${q}  cooking=${c}  ready=${r}  ` +
    `slots=${cap.cookingCount}/${cap.totalSlots}  ` +
    `${cap.isOverloaded ? "⚠ OVERLOADED" : "OK"}`
  );
}

// ── Simulation ────────────────────────────────────────────────

/*
  EXPECTED STEP-BY-STEP OUTPUT
  ─────────────────────────────────────────────────────────────
  [Initial              ] queue=0  cooking=0  ready=0  slots=0/8   OK
  [Order 1 added        ] queue=0  cooking=1  ready=0  slots=1/8   OK
  [Order 2 added        ] queue=0  cooking=2  ready=0  slots=2/8   OK
  [Order 3 added        ] queue=0  cooking=3  ready=0  slots=3/8   OK
  [Order 4 added        ] queue=0  cooking=4  ready=0  slots=4/8   OK
  [Order 5 added        ] queue=0  cooking=5  ready=0  slots=5/8   OK
  [Order 6 added        ] queue=0  cooking=6  ready=0  slots=6/8   OK
  [Order 7 added        ] queue=0  cooking=7  ready=0  slots=7/8   OK
  [Order 8 added        ] queue=0  cooking=8  ready=0  slots=8/8   OK
  [Order 9 → QUEUED     ] queue=1  cooking=8  ready=0  slots=8/8   ⚠ OVERLOADED
  [Order 10 → QUEUED    ] queue=2  cooking=8  ready=0  slots=8/8   ⚠ OVERLOADED
  [Order 1 done (ready) ] queue=1  cooking=8  ready=1  slots=8/8   ⚠ OVERLOADED
  [Order 2 done (ready) ] queue=0  cooking=8  ready=2  slots=8/8   OK
*/

let state = initialState;
log("Initial", state);

for (let i = 1; i <= 10; i++) {
  state = handleNewOrder(state, {
    id: `order-${i}`,
    customerName: `Customer ${i}`,
    items: [{ menuItemId: "m1", name: "Butter Chicken", quantity: 1 }],
  });

  const cap = calculateCapacity(state);
  const wasCapped = cap.freeSlots === 0 && i > cap.totalSlots;
  log(
    i <= 8 ? `Order ${i} added` : `Order ${i} → QUEUED`,
    state
  );
}

// Complete order-1 → order-9 auto-promotes from queue
state = completeOrder(state, "order-1");
log("Order 1 done (ready)", state);

// Complete order-2 → order-10 auto-promotes, queue empty
state = completeOrder(state, "order-2");
log("Order 2 done (ready)", state);

// ── mockTimeSlots (re-exported for backward compatibility with Index.tsx) ──
export const mockTimeSlots = [
  { id: "slot-1", time: "12:00", label: "12:00 PM", capacity: 10, booked: 4 },
  { id: "slot-2", time: "12:30", label: "12:30 PM", capacity: 10, booked: 7 },
  { id: "slot-3", time: "13:00", label: "01:00 PM", capacity: 10, booked: 10 },
  { id: "slot-4", time: "13:30", label: "01:30 PM", capacity: 10, booked: 2 },
  { id: "slot-5", time: "14:00", label: "02:00 PM", capacity: 10, booked: 5 },
  { id: "slot-6", time: "14:30", label: "02:30 PM", capacity: 10, booked: 8 },
];

// Export for use in other files
export { initialState };