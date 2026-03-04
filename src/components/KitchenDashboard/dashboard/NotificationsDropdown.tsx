import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck, Package, ChefHat, AlertTriangle, Clock, X, Trash2 } from 'lucide-react';
import '../styles/Notificationsdropdown.scss';

export interface Notification {
  id: string;
  type: 'order' | 'inventory' | 'alert' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority?: 'normal' | 'high' | 'urgent';
}

interface NotificationsDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

const typeIcons = {
  order: ChefHat,
  inventory: Package,
  alert: AlertTriangle,
  system: Bell,
};

const formatTime = (date: Date) => {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return date.toLocaleDateString();
};

export function NotificationsDropdown({
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;
  const isMobile = () => window.innerWidth <= 600;

  // Calculate desktop dropdown position relative to trigger button
  useEffect(() => {
    if (open && triggerRef.current && !isMobile()) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 10,
        right: window.innerWidth - rect.right,
      });
    }
  }, [open]);

  const dropdown = open && (
    <>
      {/* Backdrop overlay */}
      <div className="notifications-overlay" onClick={() => setOpen(false)} />

      {/* Panel — positioned via inline style on desktop, CSS handles mobile */}
      <div
        className="notifications-content"
        style={!isMobile() ? { top: pos.top, right: pos.right } : undefined}
      >
        {/* Header */}
        <div className="notifications-header">
          <div className="header-left">
            <h3 className="header-title">Notifications</h3>
            {unreadCount > 0 && <span className="new-badge">{unreadCount} new</span>}
          </div>
          <div className="header-actions">
            {unreadCount > 0 && (
              <button className="mark-all-read-btn" onClick={onMarkAllAsRead}>
                <CheckCheck /> Mark all read
              </button>
            )}
            <button className="close-btn" onClick={() => setOpen(false)}>
              <X />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="notifications-scroll-area">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <Bell className="empty-icon" />
              <p className="empty-text">No notifications</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((n) => {
                const Icon = typeIcons[n.type];
                return (
                  <div
                    key={n.id}
                    className={`notification-item ${!n.read ? 'unread' : ''}`}
                    onClick={() => onMarkAsRead(n.id)}
                  >
                    <div className={`notification-icon icon-${n.type}`}>
                      <Icon className="icon" />
                    </div>
                    <div className="notification-content">
                      <div className="notification-header-row">
                        <p className={`notification-title ${!n.read ? 'unread-title' : ''}`}>
                          {n.title}
                        </p>
                        {!n.read && <div className="unread-dot" />}
                      </div>
                      <p className="notification-message">{n.message}</p>
                      <div className="notification-footer">
                        <span className="notification-time">
                          <Clock className="clock-icon" />
                          {formatTime(n.timestamp)}
                        </span>
                        <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}>
                          <X className="delete-icon" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="notifications-footer">
            <button className="clear-all-btn" onClick={onClearAll}>
              <Trash2 className="trash-icon" /> Clear all notifications
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="notifications-dropdown">
      <button
        ref={triggerRef}
        className="notifications-trigger"
        onClick={() => setOpen(o => !o)}
      >
        <Bell className="bell-icon" />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Portal renders directly on <body> — bypasses all parent clipping */}
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
}