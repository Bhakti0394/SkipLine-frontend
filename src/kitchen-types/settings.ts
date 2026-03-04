// ============================================================
// REPLACE: src/kitchen-types/settings.ts
// Merged: original UI settings + new capacity engine fields
// ============================================================

import type { Order } from "./order";

// ── Staff ─────────────────────────────────────────────────────

export interface KitchenStaff {
  id: string;
  name: string;
  active: boolean;
  slotCount: number; // how many orders this person can cook at once (default 2)
}

// ── Settings (merged) ─────────────────────────────────────────

export interface KitchenSettings {
  // ── Capacity engine fields (NEW — required by capacityEngine.ts) ──
  defaultSlotCount: number;        // default slotCount when adding a new staff member
  autoAssignEnabled: boolean;      // if false, skip autoAssignOrders drain
  overloadThresholdPct: number;    // show ⚠ warning when capacityPct >= this value

  // ── Sound settings (original) ────────────────────────────────
  soundEnabled: boolean;
  soundVolume: number;
  notificationSound: "chime" | "bell" | "ding" | "none";

  // ── Display settings (original) ──────────────────────────────
  theme: "dark" | "light" | "system";
  compactMode: boolean;
  showAnimations: boolean;

  // ── Notification settings (original) ─────────────────────────
  desktopNotifications: boolean;
  lowInventoryAlerts: boolean;
  orderAlerts: boolean;

  // ── Kitchen operational settings (original) ──────────────────
  urgentThresholdMinutes: number;
}

// ── Defaults ──────────────────────────────────────────────────

export const defaultSettings: KitchenSettings = {
  // Capacity engine
  defaultSlotCount: 2,
  autoAssignEnabled: true,
  overloadThresholdPct: 80,

  // Sound
  soundEnabled: true,
  soundVolume: 70,
  notificationSound: "chime",

  // Display
  theme: "dark",
  compactMode: false,
  showAnimations: true,

  // Notifications
  desktopNotifications: true,
  lowInventoryAlerts: true,
  orderAlerts: true,

  // Kitchen
  urgentThresholdMinutes: 5,
};

// ── Top-level kitchen state ───────────────────────────────────

export interface KitchenState {
  staff: KitchenStaff[];
  orders: Order[];
  settings: KitchenSettings;
}