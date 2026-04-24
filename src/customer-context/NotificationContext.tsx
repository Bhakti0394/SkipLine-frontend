import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order_ready' | 'order_confirmed' | 'order_preparing' | 'order_cooking' | 'info' | 'success' | 'warning' | 'streak_milestone';
  timestamp: number;
  read: boolean;
  orderId?: string;
}

const playNotificationSound = (type: Notification['type']) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator   = audioContext.createOscillator();
    const gainNode     = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'order_ready') {
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } else if (type === 'warning') {
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(380, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else {
      oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  } catch {
    // Audio not supported — silent fallback
  }
};

export interface NotificationPreferences {
  orderUpdates:       boolean; // confirmed, preparing, cooking
  readyAlerts:        boolean; // ready for pickup
  promotionalOffers:  boolean;
  weeklySummary:      boolean;
  soundEnabled:       boolean;
}

interface NotificationContextType {
  notifications:     Notification[];
  unreadCount:       number;
  preferences:       NotificationPreferences;
  addNotification:   (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead:        (id: string) => void;
  markAllAsRead:     () => void;
  clearNotification: (id: string) => void;
  clearAll:          () => void;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY     = 'SkipLine_notifications';
const PREFERENCES_KEY = 'SkipLine_notification_preferences';

const defaultPreferences: NotificationPreferences = {
  orderUpdates:      true,
  readyAlerts:       true,
  promotionalOffers: false,
  weeklySummary:     true,
  soundEnabled:      true,
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [preferences,   setPreferences]   = useState<NotificationPreferences>(defaultPreferences);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setNotifications(JSON.parse(saved));

      const savedPrefs = localStorage.getItem(PREFERENCES_KEY);
      if (savedPrefs) setPreferences({ ...defaultPreferences, ...JSON.parse(savedPrefs) });
    } catch {
      // ignore parse errors
    }
  }, []);

  // Persist notifications (single effect — removed duplicate)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  // Dispatch popup events one at a time
// Dispatch all queued popup events at once — drain the full queue per render
  // so rapid-fire notifications (swap + cancel + order confirmed) don't get lost
  

  // FIX: corrected gate logic.
  // Old: if readyAlerts is OFF → block everything. Wrong.
  // New: each preference gates only its own notification type.
  const shouldShowNotification = useCallback((type: Notification['type']): boolean => {
    if (type === 'order_ready')     return preferences.readyAlerts;
    if (type === 'order_confirmed' ||
        type === 'order_preparing' ||
        type === 'order_cooking')   return preferences.orderUpdates;
    if (type === 'streak_milestone') return true;
    return true; // info, success, warning always show
  }, [preferences]);

  // FIX: corrected gate logic.

 const addNotification = useCallback((data: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
  if (!shouldShowNotification(data.type)) return;

  const newNotification: Notification = {
    ...data,
    id:        `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    read:      false,
  };

  if (preferences.soundEnabled) playNotificationSound(data.type);

  setNotifications(prev => [newNotification, ...prev].slice(0, 50));

  // setTimeout(0) guarantees the event fires AFTER React commits this render
  // and AFTER NotificationPopup's useEffect listener is attached.
  // This fixes the "event fired before listener" race on OrderSuccess mount.
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('show-notification-popup', {
      detail: newNotification,
    }));
  }, 0);

}, [preferences.soundEnabled, shouldShowNotification]);

  // Global listener — active on every page, not just MyOrders
 // Global listener — active on every page, not just MyOrders
  useEffect(() => {
    const handler = (e: Event) => {
      const { title, message, type, orderId } = (e as CustomEvent).detail ?? {};
      if (!title || !type) return;
      addNotification({ title, message, type, orderId });
    };
    window.addEventListener('order-status-changed', handler);
    return () => window.removeEventListener('order-status-changed', handler);
  }, [addNotification]);

  // Streak milestone listener
  useEffect(() => {
    const handler = (e: Event) => {
      const { streak } = (e as CustomEvent).detail ?? {};
      if (!streak) return;
      addNotification({
        type: 'streak_milestone',
        title: '🔥 Streak Milestone!',
        message: `You've reached a ${streak}-day ordering streak!`,
      });
    };
    window.addEventListener('streak-milestone', handler);
    return () => window.removeEventListener('streak-milestone', handler);
  }, [addNotification]);

  const markAsRead        = useCallback((id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), []);

  const markAllAsRead     = useCallback(() =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true }))), []);

  const clearNotification = useCallback((id: string) =>
    setNotifications(prev => prev.filter(n => n.id !== id)), []);

  const clearAll          = useCallback(() => setNotifications([]), []);

  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) =>
    setPreferences(prev => ({ ...prev, ...updates })), []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, preferences,
      addNotification, markAsRead, markAllAsRead,
      clearNotification, clearAll, updatePreferences,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
}