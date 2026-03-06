// ============================================================
// src/kitchen-types/settings.ts
// ============================================================

export interface KitchenSettings {
  // — Capacity engine fields —
  defaultSlotCount: number;        // default slotCount when adding a new staff member
  autoAssignEnabled: boolean;      // if false, skip autoAssignOrders drain
  overloadThresholdPct: number;    // show ⚠ warning when capacityPct >= this value

  // — Sound settings —
  soundEnabled: boolean;
  soundVolume: number;
  notificationSound: "chime" | "bell" | "ding" | "none";

  // — Display settings —
  theme: "dark" | "light" | "system";
  compactMode: boolean;
  showAnimations: boolean;

  // — Notification settings —
  desktopNotifications: boolean;
  lowInventoryAlerts: boolean;
  orderAlerts: boolean;

  // — Kitchen operational settings —
  urgentThresholdMinutes: number;
}

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