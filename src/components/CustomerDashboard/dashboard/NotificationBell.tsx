import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, ChefHat, Clock, Utensils, AlertCircle, Info, Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications, Notification } from '../../../customer-context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import '../overview-styles/Notificationbell.scss';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll } = useNotifications();

  const getIcon = (type: Notification['type']) => {
    const iconClass = 'notification-bell__type-icon';
    switch (type) {
      case 'order_ready':
        return <CheckCircle className={`${iconClass} ${iconClass}--green`} />;
      case 'order_cooking':
        return <ChefHat className={`${iconClass} ${iconClass}--orange`} />;
      case 'order_preparing':
        return <Utensils className={`${iconClass} ${iconClass}--blue`} />;
      case 'order_confirmed':
        return <Clock className={`${iconClass} ${iconClass}--primary`} />;
      case 'success':
        return <CheckCircle className={`${iconClass} ${iconClass}--green`} />;
      case 'warning':
        return <AlertCircle className={`${iconClass} ${iconClass}--yellow`} />;
      default:
        return <Info className={`${iconClass} ${iconClass}--primary`} />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <div className="notification-bell">
      <Button
        variant="ghost"
        size="icon"
        className="notification-bell__trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="notification-bell__icon" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="notification-bell__badge"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="notification-bell__backdrop"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="notification-bell__dropdown"
            >
              {/* Header */}
              <div className="notification-bell__header">
                <div className="notification-bell__header-left">
                  <Bell className="notification-bell__header-icon" />
                  <h3 className="notification-bell__title">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="notification-bell__unread-count">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="notification-bell__header-actions">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="notification-bell__mark-read-btn"
                      onClick={markAllAsRead}
                    >
                      <Check className="notification-bell__check-icon" />
                      seen
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="notification-bell__close-btn"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="notification-bell__close-icon" />
                  </Button>
                </div>
              </div>

              {/* Notification List */}
              <div className="notification-bell__list">
                {notifications.length === 0 ? (
                  <div className="notification-bell__empty">
                    <Bell className="notification-bell__empty-icon" />
                    <p className="notification-bell__empty-text">No notifications yet</p>
                    <p className="notification-bell__empty-subtext">
                      You'll see order updates here
                    </p>
                  </div>
                ) : (
                  <div className="notification-bell__items">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`notification-bell__item ${!notification.read ? 'notification-bell__item--unread' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-bell__item-content">
                          <div className="notification-bell__item-icon">
                            {getIcon(notification.type)}
                          </div>
                          
                          <div className="notification-bell__item-text">
                            <div className="notification-bell__item-header">
                              <p className={`notification-bell__item-title ${!notification.read ? 'notification-bell__item-title--unread' : ''}`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="notification-bell__unread-dot" />
                              )}
                            </div>
                            <p className="notification-bell__item-message">
                              {notification.message}
                            </p>
                           <p className="notification-bell__item-time">
                              {formatDistanceToNow(
                                typeof notification.timestamp === 'number'
                                  ? new Date(notification.timestamp)
                                  : notification.timestamp,
                                { addSuffix: true }
                              )}
                            </p>
                          </div>

                          {/* Delete button on hover */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="notification-bell__delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotification(notification.id);
                            }}
                          >
                            <Trash2 className="notification-bell__delete-icon" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="notification-bell__footer">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="notification-bell__clear-all-btn"
                    onClick={clearAll}
                  >
                    <Trash2 className="notification-bell__trash-icon" />
                    Clear all notifications
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}