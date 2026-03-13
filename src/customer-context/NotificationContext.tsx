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

// Notification sound using Web Audio API
const playNotificationSound = (type: Notification['type']) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different sounds for different notification types
    if (type === 'order_ready') {
      // Success chime - two ascending notes
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } else if (type === 'warning') {
      // Warning beep
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(380, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else {
      // Standard notification - gentle ping
      oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  } catch (error) {
    console.log('Audio not supported:', error);
  }
};

export interface NotificationPreferences {
  orderUpdates: boolean; // confirmed, preparing, cooking
  readyAlerts: boolean;  // ready for pickup
  promotionalOffers: boolean;
  weeklySummary: boolean;
  soundEnabled: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'SkipLine_notifications';
const PREFERENCES_KEY = 'SkipLine_notification_preferences';

const defaultPreferences: NotificationPreferences = {
  orderUpdates: true,
  readyAlerts: true,
  promotionalOffers: false,
  weeklySummary: true,
  soundEnabled: true,
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [popupQueue, setPopupQueue] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
      const savedPrefs = localStorage.getItem(PREFERENCES_KEY);
      if (savedPrefs) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(savedPrefs) });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  // Dispatch event for popup display
  useEffect(() => {
    if (popupQueue.length > 0) {
      const notification = popupQueue[0];
      window.dispatchEvent(new CustomEvent('show-notification-popup', { detail: notification }));
      setPopupQueue(prev => prev.slice(1));
    }
  }, [popupQueue]);

  // Check if notification should be shown based on preferences
  const shouldShowNotification = useCallback((type: Notification['type']): boolean => {
    // If ready alerts is off, no notifications at all
    if (!preferences.readyAlerts) {
      return false;
    }
    
    // Ready notifications always show if readyAlerts is on
    if (type === 'order_ready') {
      return true;
    }
    
    // Other order notifications (confirmed, preparing, cooking) only show if orderUpdates is on
    if (type === 'order_confirmed' || type === 'order_preparing' || type === 'order_cooking') {
      return preferences.orderUpdates;
    }
    
    // Other notification types
    return true;
  }, [preferences]);

  // Listen for order status change events
  useEffect(() => {
    const handleOrderStatusChange = (event: CustomEvent) => {
      const { title, message, type, orderId } = event.detail;
      
      // Check if this notification should be shown based on preferences
      if (!shouldShowNotification(type)) {
        return;
      }
      
      addNotificationInternal({ title, message, type, orderId });
    };

    window.addEventListener('order-status-changed', handleOrderStatusChange as EventListener);
    return () => {
      window.removeEventListener('order-status-changed', handleOrderStatusChange as EventListener);
    };
  }, [shouldShowNotification]);

  const addNotificationInternal = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };

    // Play notification sound if enabled
    if (preferences.soundEnabled) {
      playNotificationSound(notificationData.type);
    }

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setPopupQueue(prev => [...prev, newNotification]);
  }, [preferences.soundEnabled]);

  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    addNotificationInternal(notificationData);
  }, [addNotificationInternal]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      preferences,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAll,
      updatePreferences,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
