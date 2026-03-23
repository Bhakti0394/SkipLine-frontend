import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Flame, CheckCircle2, ChevronRight,
  RefreshCw, XCircle, Zap, ShoppingBag, Star, ArrowRight,
} from 'lucide-react';
import { useSkipLine } from '../../../customer-context/SkipLineContext';
import { useState } from 'react';
import '../overview-styles/OrderFlowMini.scss';

// FIX: Removed 'preparing' step — backend OrderStatus enum has no PREPARING.
// Valid backend statuses: PENDING → COOKING → READY → COMPLETED.
// Frontend mapping (dtoToOrder in SkipLineContext):
//   "pending"   → status: 'confirmed'  (shown as "Pending")
//   "cooking"   → status: 'cooking'    (shown as "Cooking")
//   "ready"     → status: 'ready'      (shown as "Ready")
//   "completed" → moves to order history
// The old 4-step flow had 'preparing' betweesn Pending and Cooking which could
// never be populated from real backend data, always showing 0.
const statusSteps = [
  { key: 'confirmed', label: 'Pending',   icon: Clock,        color: 'blue'   },
  { key: 'cooking',   label: 'Cooking',   icon: Flame,        color: 'orange' },
  { key: 'ready',     label: 'Ready! 🎉', icon: CheckCircle2, color: 'green'  },
];

// Perks shown in the empty state to encourage ordering
const orderPerks = [
  { emoji: '⚡', label: 'Real-time tracking', detail: 'Watch your order move from kitchen to pickup' },
  { emoji: '🔥', label: 'Streak rewards',     detail: 'Every order adds to your daily streak' },
  { emoji: '👑', label: 'VIP priority',       detail: 'Loyal customers skip the queue automatically' },
];

export function OrderFlowMini() {
  const { orders } = useSkipLine();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const activeOrders    = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const delayedOrders   = orders.filter(o => o.status === 'delayed');
  const hasActiveOrders = activeOrders.length > 0 || delayedOrders.length > 0;

  const statusCounts = statusSteps.reduce((acc, step) => {
    acc[step.key] = activeOrders.filter(o => o.status === step.key).length;
    return acc;
  }, {} as Record<string, number>);

  if (delayedOrders.length > 0) {
    statusCounts['confirmed'] = (statusCounts['confirmed'] || 0) + delayedOrders.length;
  }

  const readyCount   = statusCounts['ready'] || 0;
  const swappedCount = orders.filter(
    o => o.wasSwapped && o.status !== 'cancelled' && o.status !== 'completed'
  ).length;

  const displayOrders = selectedStatus
    ? [...activeOrders, ...delayedOrders].filter(o =>
        selectedStatus === 'confirmed'
          ? o.status === 'confirmed' || o.status === 'delayed'
          : o.status === selectedStatus
      ).slice(0, 3)
    : [...activeOrders, ...delayedOrders].slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="flow-enhanced"
    >
      <div className="flow-enhanced__bg-animated" />

      <div className="flow-enhanced__wrap">

        {/* ── Header ── */}
        <div className="flow-enhanced__header">
          <div className="flow-enhanced__title-section">
            <h3 className="flow-enhanced__title">Your Orders</h3>
            <motion.div
              className="flow-enhanced__live-indicator"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="flow-enhanced__live-dot" />
              <span className="flow-enhanced__live-text">Live</span>
            </motion.div>
          </div>

          <div className="flow-enhanced__badges">
            {readyCount > 0 && (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flow-enhanced__badge flow-enhanced__badge--ready"
              >
                <CheckCircle2 className="flow-enhanced__badge-icon" />
                <span className="flow-enhanced__badge-text">{readyCount} Ready for pickup!</span>
              </motion.div>
            )}
            {swappedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flow-enhanced__badge flow-enhanced__badge--swapped"
              >
                <RefreshCw className="flow-enhanced__badge-icon" />
                <span className="flow-enhanced__badge-text">{swappedCount} Updated</span>
              </motion.div>
            )}
            {cancelledOrders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flow-enhanced__badge flow-enhanced__badge--cancelled"
              >
                <XCircle className="flow-enhanced__badge-icon" />
                <span className="flow-enhanced__badge-text">{cancelledOrders.length} Cancelled</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Status Steps ── */}
        <div className="flow-enhanced__steps">
          {statusSteps.map((step, i) => {
            const count      = statusCounts[step.key] || 0;
            const isSelected = selectedStatus === step.key;
            const Icon       = step.icon;

            return (
              <div key={step.key} className="flow-enhanced__item">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedStatus(isSelected ? null : step.key)}
                  className={`flow-enhanced__step flow-enhanced__step--${step.color} ${
                    isSelected ? 'flow-enhanced__step--selected' : ''
                  } ${!hasActiveOrders ? 'flow-enhanced__step--idle' : ''}`}
                >
                  <motion.div
                    key={count}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Icon className={`flow-enhanced__icon flow-enhanced__icon--${step.color}`} />
                  </motion.div>

                  <motion.p
                    className={`flow-enhanced__count flow-enhanced__count--${step.color}`}
                    key={`count-${count}`}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                  >
                    {count}
                  </motion.p>

                  <p className="flow-enhanced__label">{step.label}</p>

                  {isSelected && (
                    <motion.div
                      layoutId="selectedStatus"
                      className="flow-enhanced__selection-ring"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </motion.button>

                {i < statusSteps.length - 1 && (
                  <motion.div
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ChevronRight className="flow-enhanced__arrow" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── ACTIVE: Recent orders list ── */}
        <AnimatePresence mode="wait">
          {hasActiveOrders ? (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flow-enhanced__activity"
            >
              <p className="flow-enhanced__activity-title">
                {selectedStatus
                  ? `${statusSteps.find(s => s.key === selectedStatus)?.label} Orders`
                  : 'Recent Activity'}
              </p>

              <AnimatePresence mode="popLayout">
                {displayOrders.map((order) => {
                  const isDelayed     = order.status === 'delayed';
                  const displayStatus = isDelayed ? 'confirmed' : order.status;
                  const step          = statusSteps.find(s => s.key === displayStatus) || statusSteps[0];
                  const Icon          = step.icon;

                  return (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      className="flow-enhanced__order"
                    >
                      <div className="flow-enhanced__order-info">
                        <motion.img
                          src={order.image}
                          alt={order.meal}
                          className="flow-enhanced__order-img"
                          whileHover={{ scale: 1.1, rotate: 3 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        />
                        <div className="flow-enhanced__order-details">
                          <div className="flow-enhanced__order-name-row">
                            <p className="flow-enhanced__order-name">{order.meal}</p>
                            {order.wasSwapped && (
                              <span className="flow-enhanced__swap-badge" title={`Updated from ${order.originalMeal}`}>
                                <RefreshCw className="flow-enhanced__swap-icon" />
                              </span>
                            )}
                          </div>
                          <p className="flow-enhanced__order-id">{order.id}</p>
                        </div>
                      </div>

                      <div className={`flow-enhanced__status flow-enhanced__status--${step.color}`}>
                        <Icon className={`flow-enhanced__status-icon flow-enhanced__status-icon--${step.color}`} />
                        <span className={`flow-enhanced__status-text flow-enhanced__status-text--${step.color}`}>
                          {step.label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {selectedStatus && displayOrders.length === 0 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flow-enhanced__empty-text">
                  No orders in {statusSteps.find(s => s.key === selectedStatus)?.label} stage
                </motion.p>
              )}
            </motion.div>

          ) : (
            /* ── EMPTY: Attraction state ── */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flow-enhanced__empty"
            >
              <motion.div
                className="flow-enhanced__empty-icon-wrap"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ShoppingBag className="flow-enhanced__empty-icon" />
                <motion.div
                  className="flow-enhanced__empty-glow"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.15, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              </motion.div>

              <h4 className="flow-enhanced__empty-title">No orders yet today</h4>
              <p className="flow-enhanced__empty-subtitle">
                Place an order and watch it come to life in real time 👇
              </p>

              <div className="flow-enhanced__perks">
                {orderPerks.map((perk, i) => (
                  <motion.div
                    key={perk.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                    className="flow-enhanced__perk"
                  >
                    <span className="flow-enhanced__perk-emoji">{perk.emoji}</span>
                    <div>
                      <p className="flow-enhanced__perk-label">{perk.label}</p>
                      <p className="flow-enhanced__perk-detail">{perk.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="flow-enhanced__cta"
              >
                <Star className="flow-enhanced__cta-icon" />
                <span>Start your first order</span>
                <ArrowRight className="flow-enhanced__cta-arrow" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer tip (active orders only) ── */}
        {hasActiveOrders && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flow-enhanced__footer"
          >
            <Zap className="flow-enhanced__footer-icon" />
            <p className="flow-enhanced__footer-text">
              <span className="flow-enhanced__footer-highlight">Tip: </span>
              Tap a stage to filter your orders by status.
            </p>
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}