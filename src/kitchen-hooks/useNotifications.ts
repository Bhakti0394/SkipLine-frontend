import { useState, useCallback } from 'react';
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

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 'welcome',
      type: 'system',
      title: 'Welcome to Prepline',
      message: 'Your kitchen dashboard is ready. Start managing orders efficiently!',
      timestamp: new Date(),
      read: false,
    },
  ]);

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

  // ── Domain helpers ──────────────────────────────────────────────────────────

  const notifyNewOrder = useCallback((order: Order) => {
    const prefix =
      order.priority === 'urgent' ? '🔴 URGENT: ' :
      order.priority === 'high'   ? '🟡 '        : '🟢 ';
    addNotification(
      'order',
      `${prefix}New Order ${order.orderNumber}`,
      `${order.items.length} item(s) for ${order.customerName}. Pickup: ${order.pickupTime}`,
      order.priority,
    );
  }, [addNotification]);

  const notifyOrderStatus = useCallback((order: Order, newStatus: string) => {
    const messages: Record<string, string> = {
      cooking:   `Order ${order.orderNumber} is now being prepared`,
      ready:     `Order ${order.orderNumber} is ready for pickup! 🎉`,
      completed: `Order ${order.orderNumber} has been completed ✅`,
    };
    if (messages[newStatus]) {
      addNotification(
        'order',
        `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        messages[newStatus],
      );
    }
  }, [addNotification]);

  const notifyInventoryAlert = useCallback((item: InventoryItem, status: StockStatus) => {
    if (status === 'critical' || status === 'out-of-stock') {
      addNotification(
        'inventory',
        `⚠️ ${item.name} — ${status === 'out-of-stock' ? 'Out of Stock!' : 'Critical Level'}`,
        `Only ${item.currentStock} ${item.unit} remaining. Restock immediately.`,
        'urgent',
      );
    } else if (status === 'low-stock') {
      addNotification(
        'inventory',
        `Low Stock: ${item.name}`,
        `${item.currentStock} ${item.unit} remaining (min: ${item.minThreshold})`,
        'high',
      );
    }
  }, [addNotification]);

  const notifySystem = useCallback((title: string, message: string) => {
    addNotification('system', title, message);
  }, [addNotification]);

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
  };
}