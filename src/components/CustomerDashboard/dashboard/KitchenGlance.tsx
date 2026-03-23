import { motion } from 'framer-motion';
import { ChefHat, TrendingUp, Clock, Flame, AlertCircle } from 'lucide-react';
import { useSkipLine } from '../../../customer-context/SkipLineContext';
import '../overview-styles/Kitchenglance.scss';

interface KitchenGlanceProps {
  topDish:      { name: string; orders: number };
  busiestHour:  { time: string; orders: number };
  avgPrepTime:  number;
  bottleneck?:  string;
  // FIX: accept real kitchen capacity from board metrics instead of hardcoding 3.
  // CustomerDashboard/Index.tsx passes board.metrics.activeChefCount here.
  // Falls back to 3 when board data is unavailable (unauthenticated / 403).
  kitchenCapacity?: number;
}

export function KitchenGlance({
  topDish,
  busiestHour,
  avgPrepTime,
  bottleneck,
  kitchenCapacity = 3,
}: KitchenGlanceProps) {
  const { orders, kitchenState } = useSkipLine();

  const activeCount    = kitchenState.activeOrders.length;
  const queuedCount    = kitchenState.queuedOrders.length;
  // FIX: use real capacity from backend, not hardcoded 3
  const isOverCapacity = queuedCount > kitchenCapacity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="kitchen-glance"
    >
      {/* Header */}
      <div className="kitchen-glance__header">
        <div className="kitchen-glance__title-wrapper">
          <div className="kitchen-glance__icon-box">
            <ChefHat className="kitchen-glance__icon" />
          </div>
          <h3 className="kitchen-glance__title">Kitchen at a Glance</h3>
        </div>

        {isOverCapacity && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="kitchen-glance__alert"
          >
            <AlertCircle className="kitchen-glance__alert-icon" />
            <span className="kitchen-glance__alert-text">
              High order volume right now
            </span>
          </motion.div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="kitchen-glance__grid">
        {/* Top Selling Dish */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="kitchen-glance__card kitchen-glance__card--accent"
        >
          <div className="kitchen-glance__card-header">
            <Flame className="kitchen-glance__card-icon" />
            <span className="kitchen-glance__card-label">Most Ordered Today</span>
          </div>
          <p className="kitchen-glance__card-value">{topDish.name}</p>
          <p className="kitchen-glance__card-detail kitchen-glance__card-detail--accent">
            Chosen {topDish.orders} times today
          </p>
        </motion.div>

        {/* Busiest Hour */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="kitchen-glance__card kitchen-glance__card--primary"
        >
          <div className="kitchen-glance__card-header">
            <TrendingUp className="kitchen-glance__card-icon" />
            <span className="kitchen-glance__card-label">Busiest Time</span>
          </div>
          <p className="kitchen-glance__card-value">{busiestHour.time}</p>
          <p className="kitchen-glance__card-detail kitchen-glance__card-detail--primary">
            {busiestHour.orders} orders placed
          </p>
        </motion.div>

        {/* Avg Prep Time */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="kitchen-glance__card kitchen-glance__card--success"
        >
          <div className="kitchen-glance__card-header">
            <Clock className="kitchen-glance__card-icon" />
            <span className="kitchen-glance__card-label">Average Prep Time</span>
          </div>
          <p className="kitchen-glance__card-value">{avgPrepTime} min</p>
          <p className="kitchen-glance__card-detail kitchen-glance__card-detail--success">
            Orders are being prepared on schedule
          </p>
        </motion.div>

        {/* Bottleneck / Status */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`kitchen-glance__card ${
            bottleneck
              ? 'kitchen-glance__card--warning'
              : 'kitchen-glance__card--neutral'
          }`}
        >
          <div className="kitchen-glance__card-header">
            <AlertCircle className={`kitchen-glance__card-icon ${
              bottleneck ? '' : 'kitchen-glance__card-icon--muted'
            }`} />
            <span className="kitchen-glance__card-label">Kitchen Status</span>
          </div>
          {bottleneck ? (
            <>
              <p className="kitchen-glance__card-value kitchen-glance__card-value--warning">
                Slight Delay
              </p>
              <p className="kitchen-glance__card-detail">
                {bottleneck}
              </p>
            </>
          ) : (
            <>
              <p className="kitchen-glance__card-value kitchen-glance__card-value--success">
                All Clear
              </p>
              <p className="kitchen-glance__card-detail">
                Everything is running smoothly
              </p>
            </>
          )}
        </motion.div>
      </div>

      {/* Capacity indicator */}
      <div className="kitchen-glance__capacity">
        <div className="kitchen-glance__capacity-header">
          <span className="kitchen-glance__capacity-label">
            Current Kitchen Load
          </span>
          <span className={`kitchen-glance__capacity-value ${
            isOverCapacity
              ? 'kitchen-glance__capacity-value--danger'
              : 'kitchen-glance__capacity-value--success'
          }`}>
            {/* FIX: show real capacity denominator */}
            {activeCount}/{kitchenCapacity} being prepared &bull; {queuedCount} waiting
          </span>
        </div>
        <div className="kitchen-glance__capacity-bar">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((activeCount / kitchenCapacity) * 100, 100)}%` }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className={`kitchen-glance__capacity-fill ${
              activeCount >= kitchenCapacity
                ? 'kitchen-glance__capacity-fill--danger'
                : activeCount >= kitchenCapacity * 0.67
                ? 'kitchen-glance__capacity-fill--warning'
                : 'kitchen-glance__capacity-fill--success'
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
}