import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  ChefHat,
  Clock,
  X,
  Utensils,
  Info,
  RefreshCw,
} from 'lucide-react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type NotificationType =
  | 'order_ready'
  | 'order_cooking'
  | 'order_preparing'
  | 'order_confirmed'
  | 'success'
  | 'warning'
  | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date | number; // context sends number (Date.now()), dispatchNotification sends Date
}

interface PopupNotification extends Notification {
  isVisible: boolean;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const AUTO_DISMISS_MS   = 5000;
const EXIT_ANIMATION_MS = 400;
const MAX_VISIBLE       = 4; // cap stacked notifications

// ─────────────────────────────────────────────
// ICON MAP
// ─────────────────────────────────────────────
const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; accent: string; bg: string; border: string; progress: string }
> = {
  order_ready: {
    icon:     <CheckCircle size={20} />,
    accent:   '#22c55e',
    bg:       'rgba(34,197,94,0.08)',
    border:   'rgba(34,197,94,0.3)',
    progress: '#22c55e',
  },
  order_cooking: {
    icon:     <ChefHat size={20} />,
    accent:   '#f97316',
    bg:       'rgba(249,115,22,0.08)',
    border:   'rgba(249,115,22,0.3)',
    progress: '#f97316',
  },
  order_preparing: {
    icon:     <Utensils size={20} />,
    accent:   '#3b82f6',
    bg:       'rgba(59,130,246,0.08)',
    border:   'rgba(59,130,246,0.3)',
    progress: '#3b82f6',
  },
  order_confirmed: {
    icon:     <RefreshCw size={20} />,
    accent:   '#8b5cf6',
    bg:       'rgba(139,92,246,0.08)',
    border:   'rgba(139,92,246,0.3)',
    progress: '#8b5cf6',
  },
  success: {
    icon:     <CheckCircle size={20} />,
    accent:   '#22c55e',
    bg:       'rgba(34,197,94,0.08)',
    border:   'rgba(34,197,94,0.3)',
    progress: '#22c55e',
  },
  warning: {
    icon:     <Clock size={20} />,
    accent:   '#f59e0b',
    bg:       'rgba(245,158,11,0.08)',
    border:   'rgba(245,158,11,0.3)',
    progress: '#f59e0b',
  },
  info: {
    icon:     <Info size={20} />,
    accent:   '#6366f1',
    bg:       'rgba(99,102,241,0.08)',
    border:   'rgba(99,102,241,0.3)',
    progress: '#6366f1',
  },
};

// ─────────────────────────────────────────────
// SINGLE NOTIFICATION CARD
// ─────────────────────────────────────────────
const NotifCard = React.forwardRef<HTMLDivElement, {
  notif: PopupNotification;
  onDismiss: (id: string) => void;
}>(function NotifCard({ notif, onDismiss }, ref) {
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info;

  return (
    <motion.div
      ref={ref}
      layout
      key={notif.id}
      initial={{ opacity: 0, x: 120, scale: 0.88 }}
      animate={{ opacity: 1, x: 0,   scale: 1    }}
      exit={{    opacity: 0, x: 120, scale: 0.88 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      style={{
        position:      'relative',
        width:         '100%',
        background:    cfg.bg,
        border:        `1px solid ${cfg.border}`,
        borderLeft:    `4px solid ${cfg.accent}`,
        borderRadius:  12,
        padding:       '12px 14px 14px',
        overflow:      'hidden',
        boxShadow:     '0 8px 32px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(notif.id)}
        style={{
          position:   'absolute',
          top:        8,
          right:      8,
          background: 'none',
          border:     'none',
          cursor:     'pointer',
          padding:    4,
          color:      'rgba(255,255,255,0.45)',
          lineHeight: 1,
          borderRadius: 4,
          display:    'flex',
          alignItems: 'center',
        }}
      >
        <X size={14} />
      </button>

      {/* Body */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingRight: 20 }}>
        {/* Icon circle */}
        <div
          style={{
            width:          36,
            height:         36,
            borderRadius:   '50%',
            background:     `${cfg.accent}22`,
            border:         `1px solid ${cfg.accent}44`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            color:          cfg.accent,
            flexShrink:     0,
          }}
        >
          {cfg.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin:     0,
            fontSize:   13,
            fontWeight: 700,
            color:      '#f1f5f9',
            lineHeight: 1.3,
            whiteSpace: 'normal',
          }}>
            {notif.title}
          </p>
          <p style={{
            margin:     '3px 0 0',
            fontSize:   12,
            color:      'rgba(241,245,249,0.65)',
            lineHeight: 1.4,
            whiteSpace: 'normal',
          }}>
            {notif.message}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
        style={{
          position:       'absolute',
          bottom:         0,
          left:           0,
          height:         3,
          width:          '100%',
          background:     cfg.progress,
          transformOrigin: 'left',
          borderRadius:   '0 0 0 8px',
        }}
      />
    </motion.div>
);
});

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export function NotificationPopup() {
  const [notifications, setNotifications] = useState<PopupNotification[]>([]);
  // Track all active timers so they can be cleared on unmount
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isVisible: false } : n))
    );
    const t = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, EXIT_ANIMATION_MS);
    timersRef.current.push(t);
  }, []);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const notif = (e as CustomEvent<Notification>).detail;

      setNotifications((prev) => {
        const next = [...prev, { ...notif, isVisible: true }];
        return next.slice(-MAX_VISIBLE);
      });

      // Auto-dismiss — dismiss is stable (useCallback with no deps)
      // so this closure is always fresh
      const t = setTimeout(() => dismiss(notif.id), AUTO_DISMISS_MS);
      timersRef.current.push(t);
    };

    window.addEventListener('show-notification-popup', handler);
    return () => window.removeEventListener('show-notification-popup', handler);
  }, [dismiss]);

  const visible = notifications.filter((n) => n.isVisible);

  return (
    /* Portal-like fixed container — bottom-right, above everything */
    <div
      style={{
        position:      'fixed',
        bottom:        24,
        right:         24,
        zIndex:        99999,
        display:       'flex',
        flexDirection: 'column',
        gap:           10,
        width:         340,
        maxWidth:      'calc(100vw - 48px)',
        pointerEvents: visible.length === 0 ? 'none' : 'auto',
      }}
    >
      <AnimatePresence mode="popLayout">
        {visible.map((n) => (
          <NotifCard key={n.id} notif={n} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
} // ← closing brace for NotificationPopup

// ─────────────────────────────────────────────
// HELPER — import this anywhere to fire a notif
// ─────────────────────────────────────────────
export function dispatchNotification(
  type: NotificationType,
  title: string,
  message: string
) {
  const event = new CustomEvent('show-notification-popup', {
    detail: {
      id:        `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      title,
      message,
      timestamp: new Date(),
    } satisfies Notification,
  });
  window.dispatchEvent(event);
}