import { useState, useCallback, useRef, useEffect } from 'react';
import { Order } from '../kitchen-types/order';
import { InventoryItem, StockStatus } from '../kitchen-types/inventory';


export interface Notification {
  id: string;
  type: 'order' | 'inventory' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority?: 'urgent' | 'high' | 'normal';
}

// ─── Web Audio sound engine ───────────────────────────────────────────────────

let _sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (_sharedAudioContext && _sharedAudioContext.state !== 'closed') {
      return _sharedAudioContext;
    }
    _sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return _sharedAudioContext;
  } catch {
    return null;
  }
}

type SoundType = 'new_order' | 'cooking' | 'ready' | 'completed' | 'alert';

function playSound(type: SoundType) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  switch (type) {

    case 'new_order': {
      const freqs = [523.25, 659.25];
      freqs.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.18);
        gain.gain.setValueAtTime(0, now + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.35, now + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.5);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.5);
      });
      break;
    }

    case 'cooking': {
      [0, 0.15].forEach(offset => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now + offset);
        gain.gain.setValueAtTime(0.18, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
      break;
    }

    case 'ready': {
      const notes = [
        { freq: 783.99, time: 0    },
        { freq: 987.77, time: 0.18 },
        { freq: 1174.7, time: 0.36 },
      ];
      notes.forEach(({ freq, time }) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);
        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.4, now + time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.8);
        osc.start(now + time);
        osc.stop(now + time + 0.8);
      });
      break;
    }

    case 'completed': {
      const freqs = [659.25, 523.25];
      freqs.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.2);
        gain.gain.setValueAtTime(0, now + i * 0.2);
        gain.gain.linearRampToValueAtTime(0.25, now + i * 0.2 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.45);
        osc.start(now + i * 0.2);
        osc.stop(now + i * 0.2 + 0.45);
      });
      break;
    }

    case 'alert': {
      [0, 0.12, 0.24].forEach(offset => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now + offset);
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
      break;
    }
  }

}

// ─── Capacity event types ─────────────────────────────────────────────────────

export type CapacityEvent =
  | 'full'          // 100% — kitchen rejecting new orders
  | 'near_full'     // ≥ 80% — getting tight
  | 'order_rejected'// a specific order was rejected
  | 'recovered';    // dropped back below 80% after being full/near-full

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications() {
const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const saved = localStorage.getItem('kitchen_notifications');
      if (saved) {
        const parsed = JSON.parse(saved) as Notification[];
        return parsed.map(n => ({ ...n, timestamp: new Date(n.timestamp) }));
      }
    } catch { /* ignore */ }
    return [{
      id: 'welcome',
      type: 'system',
      title: 'Welcome to SkipLine',
      message: 'Your kitchen dashboard is ready. Start managing orders efficiently!',
      timestamp: new Date(),
      read: false,
    }];
  });

  useEffect(() => {
    try {
      localStorage.setItem('kitchen_notifications', JSON.stringify(
        notifications.slice(0, 50)
      ));
    } catch { /* ignore */ }
  }, [notifications]);

  const lastSoundAt    = useRef<Record<string, number>>({});
  // Track last capacity event so we don't spam the same alert every 10s poll
  const lastCapEvent   = useRef<CapacityEvent | null>(null);

  const playThrottled = useCallback((type: SoundType, throttleMs = 1500) => {
    const now = Date.now();
    if ((lastSoundAt.current[type] ?? 0) + throttleMs > now) return;
    lastSoundAt.current[type] = now;
    playSound(type);
  }, []);

  const addNotification = useCallback((
    type: Notification['type'],
    title: string,
    message: string,
    priority?: Notification['priority'],
  ) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      priority,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  // ── Domain helpers ────────────────────────────────────────────────────────

  const notifyNewOrder = useCallback((order: Order) => {
    const prefix =
      order.orderType === 'express'   ? '⚡ Express: ' :
      order.orderType === 'scheduled' ? '📅 Scheduled: ' : '🟢 ';
    const priority: Notification['priority'] =
      order.orderType === 'express' ? 'urgent' : 'normal';
    addNotification(
      'order',
      `${prefix}New Order ${order.orderNumber}`,
      `${order.items.length} item(s) for ${order.customerName}. Pickup: ${order.pickupTime}`,
      priority,
    );
    playThrottled('new_order');
  }, [addNotification, playThrottled]);

  const notifyOrderStatus = useCallback((order: Order, newStatus: string) => {
const messages: Record<string, string> = {
  cooking:   `Order ${order.orderNumber} is now being prepared`,
  ready:     `Order ${order.orderNumber} is ready for pickup! 🎉`,
  completed: `Order ${order.orderNumber} has been completed ✅`,
  cancelled: `Order ${order.orderNumber} was cancelled`,
};
const soundMap: Record<string, SoundType> = {
  cooking:   'cooking',
  ready:     'ready',
  completed: 'completed',
  cancelled: 'alert',
};
    if (messages[newStatus]) {
      addNotification(
        'order',
        `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        messages[newStatus],
      );
      playThrottled(soundMap[newStatus] ?? 'new_order');
    }
  }, [addNotification, playThrottled]);

  const notifyInventoryAlert = useCallback((item: InventoryItem, status: StockStatus) => {
    if (status === 'critical' || status === 'out-of-stock') {
      addNotification(
        'inventory',
        `⚠️ ${item.name} — ${status === 'out-of-stock' ? 'Out of Stock!' : 'Critical Level'}`,
        `Only ${item.currentStock} ${item.unit} remaining. Restock immediately.`,
        'urgent',
      );
      playThrottled('alert', 3000);
    } else if (status === 'low-stock') {
      addNotification(
        'inventory',
        `Low Stock: ${item.name}`,
        `${item.currentStock} ${item.unit} remaining (min: ${item.minThreshold})`,
        'high',
      );
      playThrottled('alert', 3000);
    }
  }, [addNotification, playThrottled]);

  const notifySystem = useCallback((title: string, message: string) => {
    addNotification('system', title, message);
  }, [addNotification]);

  /**
   * Capacity notifications — called from useKitchenBoard whenever capacity
   * state changes. Deduplicates via lastCapEvent so the 10s polling loop
   * doesn't spam the same alert repeatedly.
   *
   * 'full'           → toast + bell (urgent) — orders being rejected
   * 'near_full'      → toast only             — just a heads-up
   * 'order_rejected' → toast + bell (urgent)  — a real order was turned away
   * 'recovered'      → toast only             — kitchen back to normal
   */
  const notifyCapacity = useCallback((
    event: CapacityEvent,
    details?: {
      cooking?: number;
      capacity?: number;
      pending?: number;
      queueMax?: number;
      orderRef?: string;   // for order_rejected
    },
  ) => {
    // Deduplicate — don't fire the same event type twice in a row
    // Exception: order_rejected always fires (each rejection is a distinct event)
    if (event !== 'order_rejected' && lastCapEvent.current === event) return;
    lastCapEvent.current = event;

    const { cooking = 0, capacity = 0, pending = 0, queueMax = 0, orderRef } = details ?? {};

    switch (event) {
      case 'full':
        addNotification(
          'system',
          '🔴 Kitchen at Full Capacity',
          `All ${capacity} cooking slots filled. Queue: ${pending}/${queueMax}. New orders are being rejected.`,
          'urgent',
        );
        playThrottled('alert', 5000);
        break;

      case 'near_full':
        // Toast-only (no dropdown entry) — handled in Index.tsx via showToast
        // We do NOT call addNotification here to avoid bell icon noise for a warning
        playThrottled('alert', 10_000);
        break;

      case 'order_rejected':
        addNotification(
          'system',
          '🚫 Order Rejected — Kitchen Full',
          orderRef
            ? `Order ${orderRef} could not be accepted. Cooking: ${cooking}/${capacity}, Queue: ${pending}/${queueMax}.`
            : `An order was rejected. Kitchen is at full capacity (${cooking}/${capacity} cooking).`,
          'urgent',
        );
        playThrottled('alert', 3000);
        break;

      case 'recovered':
        // Toast-only — kitchen back to normal, no need to persist in bell
        // lastCapEvent is reset so next full/near_full fires fresh
        lastCapEvent.current = null;
        break;
    }
  }, [addNotification, playThrottled]);

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    notifyNewOrder,
    notifyOrderStatus,
    notifyInventoryAlert,
    notifySystem,
    notifyCapacity,
  };
}