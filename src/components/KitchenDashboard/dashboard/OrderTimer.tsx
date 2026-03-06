import { Order } from '../../../kitchen-types/order';
import { useOrderTimer, formatTime, formatElapsed } from '../../../kitchen-hooks/useOrderTimer';
import { motion } from 'framer-motion';
import { Timer, AlertTriangle } from 'lucide-react';
import '../styles/Ordertimer.scss';

interface OrderTimerProps {
  order: Order;
  compact?: boolean;
}

export function OrderTimer({ order, compact = false }: OrderTimerProps) {
  const { elapsed, remaining, isOverdue, progress } = useOrderTimer(order);

  // Don't show timer for completed or ready orders
  if (order.status === 'completed' || order.status === 'ready') {
    return null;
  }

  // Compact view (used in smaller spaces)
  if (compact) {
    return (
      <div className={`order-timer-compact ${isOverdue ? 'order-timer-compact--overdue' : ''}`}>
        <Timer className="order-timer-compact__icon" />
        {order.status === 'cooking' ? (
          isOverdue ? (
            <span className="order-timer-compact__text order-timer-compact__text--pulse">
              +{formatElapsed(elapsed - order.estimatedPrepTime * 60)}
            </span>
          ) : (
            <span className="order-timer-compact__text">
              {formatTime(remaining)}
            </span>
          )
        ) : (
          <span className="order-timer-compact__text">
            {order.estimatedPrepTime}m
          </span>
        )}
      </div>
    );
  }

  // Full view with progress bar
  return (
    <div className="order-timer">
      {/* Timer Header */}
      <div className="order-timer__header">
        <span className="order-timer__label">
          {order.status === 'pending' ? 'Est. time' : 'Cooking'}
        </span>
        <span className={`order-timer__time ${isOverdue ? 'order-timer__time--overdue' : ''}`}>
          {order.status === 'cooking' ? (
            isOverdue ? (
              <span className="order-timer__overdue">
                <AlertTriangle className="order-timer__overdue-icon" />
                +{formatElapsed(elapsed - order.estimatedPrepTime * 60)} overdue
              </span>
            ) : (
              formatTime(remaining)
            )
          ) : (
            `${order.estimatedPrepTime} min`
          )}
        </span>
      </div>

      {/* Progress Bar (only shown when cooking) */}
      {order.status === 'cooking' && (
        <div className="order-timer__progress">
          <motion.div
            className={`order-timer__progress-bar ${
              isOverdue
                ? 'order-timer__progress-bar--overdue'
                : progress > 75
                ? 'order-timer__progress-bar--warning'
                : 'order-timer__progress-bar--normal'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress)}%` }}
            transition={{ duration: 0.5 }}
          />
          {isOverdue && (
            <motion.div
              className="order-timer__progress-overlay"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>
      )}
    </div>
  );
}