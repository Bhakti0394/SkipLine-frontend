// ============================================================
// REPLACE: src/kitchen-test/example.test.ts
// Run: npx vitest
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateCapacity,
  autoAssignOrders,
  handleNewOrder,
  completeOrder,
  pickupOrder,
} from "../kitchen-hooks/capacityEngine";
import type { KitchenState } from "../kitchen-types/settings";
import type { Order } from "../kitchen-types/order";

// ── Helpers ──────────────────────────────────────────────────

let counter = 0;
const uid = () => `order-${++counter}`;

function freshState(): KitchenState {
  return {
    staff: [
      { id: "s1", name: "Arjun", active: true, slotCount: 2 },
      { id: "s2", name: "Priya", active: true, slotCount: 2 },
      { id: "s3", name: "Rahul", active: true, slotCount: 2 },
      { id: "s4", name: "Sneha", active: true, slotCount: 2 },
    ],
    orders: [],
    settings: {
      defaultSlotCount: 2,
      autoAssignEnabled: true,
      overloadThresholdPct: 80,
    },
  };
}

function addN(state: KitchenState, n: number): KitchenState {
  let s = state;
  for (let i = 0; i < n; i++) {
    s = handleNewOrder(s, { id: uid(), customerName: `C${i}`, items: [] });
  }
  return s;
}

// ── Tests ────────────────────────────────────────────────────

describe("calculateCapacity", () => {
  it("4 active staff × 2 slots = 8 total", () => {
    const snap = calculateCapacity(freshState());
    expect(snap.totalSlots).toBe(8);
    expect(snap.freeSlots).toBe(8);
    expect(snap.cookingCount).toBe(0);
    expect(snap.capacityPct).toBe(0);
    expect(snap.isOverloaded).toBe(false);
  });

  it("ignores inactive staff", () => {
    const s = freshState();
    s.staff[0].active = false;
    expect(calculateCapacity(s).totalSlots).toBe(6);
  });

  it("isOverloaded = true when queue non-empty AND no free slots", () => {
    const s = addN(freshState(), 10); // 8 cooking, 2 queued
    const snap = calculateCapacity(s);
    expect(snap.isOverloaded).toBe(true);
    expect(snap.cookingCount).toBe(8);
  });
});

describe("handleNewOrder — CRITICAL overflow prevention", () => {
  it("fills slots up to capacity, queues the rest", () => {
    const s = addN(freshState(), 10);
    const cooking = s.orders.filter((o) => o.status === "cooking");
    const queued  = s.orders.filter((o) => o.status === "queue");
    expect(cooking.length).toBe(8);  // never > totalSlots
    expect(queued.length).toBe(2);
  });

  it("places first order directly in cooking", () => {
    const s = handleNewOrder(freshState(), { id: uid(), customerName: "X", items: [] });
    expect(s.orders[0].status).toBe("cooking");
  });

  it("queues order when all slots taken", () => {
    const full  = addN(freshState(), 8);
    const after = handleNewOrder(full, { id: uid(), customerName: "Y", items: [] });
    const last  = after.orders[after.orders.length - 1];
    expect(last.status).toBe("queue");
  });
});

describe("completeOrder — FIFO drain", () => {
  it("moves cooking → ready and promotes oldest queued order", () => {
    // 8 cooking + 2 queued
    const s0 = addN(freshState(), 10);

    const firstQueued = s0.orders
      .filter((o) => o.status === "queue")
      .sort((a, b) => a.createdAt - b.createdAt)[0];

    const firstCooking = s0.orders.find((o) => o.status === "cooking")!;
    const s1 = completeOrder(s0, firstCooking.id);

    // Previously-queued order should now be cooking
    const promoted = s1.orders.find((o) => o.id === firstQueued.id)!;
    expect(promoted.status).toBe("cooking");

    // completed order should be ready
    const done = s1.orders.find((o) => o.id === firstCooking.id)!;
    expect(done.status).toBe("ready");

    // Still 8 cooking
    expect(s1.orders.filter((o) => o.status === "cooking").length).toBe(8);
  });

  it("does not exceed capacity after multiple completions", () => {
    let s = addN(freshState(), 10);
    // Complete 3 cooking orders
    for (let i = 0; i < 3; i++) {
      const c = s.orders.find((o) => o.status === "cooking")!;
      s = completeOrder(s, c.id);
      const snap = calculateCapacity(s);
      expect(snap.cookingCount).toBeLessThanOrEqual(snap.totalSlots);
    }
  });
});

describe("Step-by-step simulation: 4 staff × 2 slots, 10 orders", () => {
  it("matches expected state at each step", () => {
    let s = freshState(); // 8 total slots

    // Orders 1-8: fill all slots
    s = addN(s, 8);
    expect(s.orders.filter(o => o.status === "cooking").length).toBe(8);
    expect(s.orders.filter(o => o.status === "queue").length).toBe(0);

    // Orders 9-10: go to queue
    s = addN(s, 2);
    expect(s.orders.filter(o => o.status === "queue").length).toBe(2);
    expect(calculateCapacity(s).isOverloaded).toBe(true);

    // Complete order-1 → oldest queued (order-9) auto-promotes
    const order1 = s.orders.find(o => o.id === "order-1")!;
    s = completeOrder(s, order1.id);
    expect(s.orders.filter(o => o.status === "cooking").length).toBe(8);
    expect(s.orders.filter(o => o.status === "queue").length).toBe(1);
    expect(calculateCapacity(s).isOverloaded).toBe(true);

    // Complete order-2 → order-10 auto-promotes, queue empty
    const order2 = s.orders.find(o => o.id === "order-2")!;
    s = completeOrder(s, order2.id);
    expect(s.orders.filter(o => o.status === "cooking").length).toBe(8);
    expect(s.orders.filter(o => o.status === "queue").length).toBe(0);
    expect(calculateCapacity(s).isOverloaded).toBe(false);
  });
});