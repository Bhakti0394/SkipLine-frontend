import { motion } from 'framer-motion';
import { History, Calendar, Download, RefreshCw, Star, ChevronRight, Zap, Leaf, Package, Sparkles, TrendingUp, Award } from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { useSkipLine } from '../../customer-context/SkipLineContext';
import { useNavigate } from 'react-router-dom';
import '../../components/CustomerDashboard/styles/OrderHistory.scss';

export default function OrderHistory() {
  const navigate = useNavigate();
  const { orderHistory, metrics, addToCart } = useSkipLine();

  const totalSpent = orderHistory.reduce((sum, order) => sum + order.price, 0);
  const totalTimeSaved = orderHistory.reduce((sum, order) => sum + order.timeSaved, 0);

  const handleReorder = (order: typeof orderHistory[0]) => {
    navigate('/browse');
  };

  // Floating particles animation
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 5,
  }));

  return (
    <DashboardLayout>
      <div className="orders">
        {/* Floating Particles */}
        <div className="orders__particles">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="orders__particle"
              style={{
                width: particle.size,
                height: particle.size,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.random() * 20 - 10, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
              }}
            />
          ))}
        </div>

        {/* Premium Hero Section */}
        <div className="orders__hero">
          {/* Background Gradients */}
          <div className="orders__hero-gradient">
            <div className="orders__hero-gradient-orb orders__hero-gradient-orb--1" />
            <div className="orders__hero-gradient-orb orders__hero-gradient-orb--2" />
          </div>

          <div className="orders__header">
            <div className="orders__header-content">
              <div className="orders__header-left">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="orders__title-badge"
                >
                  <History className="orders__title-badge-icon" />
                  <span>Your Journey</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="orders__title"
                >
                  Order <span className="orders__title-grad">History</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="orders__subtitle"
                >
                  Track your culinary adventures and environmental impact
                </motion.p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Impact Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="orders__impact-stats"
        >
          <div className="orders__stat-card">
            <div className="orders__stat-glow" style={{ background: 'radial-gradient(circle, rgba(255, 107, 53, 0.3), transparent)' }} />
            <div className="orders__stat-icon" style={{ color: '#ff6b35' }}>
              <Package />
            </div>
            <div className="orders__stat-content">
              <div className="orders__stat-value">{orderHistory.length}</div>
              <div className="orders__stat-label">Total Orders</div>
            </div>
          </div>

          <div className="orders__stat-card">
            <div className="orders__stat-glow" style={{ background: 'radial-gradient(circle, rgba(247, 147, 30, 0.3), transparent)' }} />
            <div className="orders__stat-icon" style={{ color: '#f7931e' }}>
              <TrendingUp />
            </div>
            <div className="orders__stat-content">
              <div className="orders__stat-value">₹{totalSpent.toFixed(0)}</div>
              <div className="orders__stat-label">Total Spent</div>
            </div>
          </div>

          <div className="orders__stat-card">
            <div className="orders__stat-glow" style={{ background: 'radial-gradient(circle, rgba(251, 191, 36, 0.3), transparent)' }} />
            <div className="orders__stat-icon" style={{ color: '#fbbf24' }}>
              <Zap />
            </div>
            <div className="orders__stat-content">
              <div className="orders__stat-value">{totalTimeSaved} min</div>
              <div className="orders__stat-label">Time Saved</div>
            </div>
          </div>

          <div className="orders__stat-card">
            <div className="orders__stat-glow" style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3), transparent)' }} />
            <div className="orders__stat-icon" style={{ color: '#10b981' }}>
              <Leaf />
            </div>
            <div className="orders__stat-content">
              <div className="orders__stat-value">{metrics.foodWasteReduced.toFixed(1)} kg</div>
              <div className="orders__stat-label">Waste Reduced</div>
            </div>
          </div>
        </motion.div>

        {/* Achievement Banner */}
        {orderHistory.length >= 5 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="orders__ready-banner"
          >
            <div className="orders__ready-glow" />
            <div className="orders__ready-content">
              <div className="orders__ready-icon">
                <Award />
              </div>
              <div className="orders__ready-text">
                <div className="orders__ready-title">Sustainability Champion!</div>
                <div className="orders__ready-description">
                  You've saved {metrics.foodWasteReduced.toFixed(1)}kg of food waste. Keep it up!
                </div>
              </div>
              <Sparkles className="orders__ready-sparkle" />
            </div>
          </motion.div>
        )}

        {/* Order List */}
        {orderHistory.length > 0 ? (
          <div className="orders__list">
            {orderHistory.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="orders__card"
              >
                <div className="orders__card-glow" />

                {/* Card Header */}
                <div className="orders__card-header">
                  <div className="orders__image-wrapper">
                    <img
                      src={order.image}
                      alt={order.meal}
                      className="orders__image"
                    />
                  </div>

                  <div className="orders__info">
                    <div className="orders__title-row">
                      <div className="orders__details">
                        <h3 className="orders__name">{order.meal}</h3>
                        <p className="orders__original-meal">{order.restaurant}</p>
                      </div>
                      <div className="orders__price">₹{order.price.toFixed(0)}</div>
                    </div>

                    <div className="orders__badges">
                      <span className="orders__status-badge orders__status-badge--success">
                        <Star className="orders__badge-icon" />
                        Completed
                      </span>
                      <span className={`orders__payment-badge ${order.paymentStatus === 'paid' ? 'orders__payment-badge--paid' : 'orders__payment-badge--pending'}`}>
                        {order.paymentStatus === 'paid' ? '✓ Paid' : 'Cash on Delivery'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="orders__details-grid">
                  <div className="orders__detail-card">
                    <Calendar className="orders__detail-icon" style={{ color: '#60a5fa' }} />
                    <div className="orders__detail-value">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="orders__detail-label">Order Date</div>
                  </div>

                  <div className="orders__detail-card">
                    <Package className="orders__detail-icon" style={{ color: '#f7931e' }} />
                    <div className="orders__detail-value">×{order.quantity}</div>
                    <div className="orders__detail-label">Quantity</div>
                  </div>

                  <div className="orders__detail-card">
                    <Zap className="orders__detail-icon" style={{ color: '#fbbf24' }} />
                    <div className="orders__detail-value">{order.timeSaved} min</div>
                    <div className="orders__detail-label">Time Saved</div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="orders__card-footer">
                  <div className="orders__meta">
                    <span className="orders__id">#{order.id.slice(0, 8)}</span>
                    <span className="orders__separator">•</span>
                    <span>{new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <button
                    onClick={() => handleReorder(order)}
                    className="orders__browse-again-btn"
                  >
                    <RefreshCw className="orders__browse-icon" />
                    <span>Reorder</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="orders__empty"
          >
            <div className="orders__empty-glow" />
            
            <div className="orders__empty-icon-wrapper">
              <History className="orders__empty-icon" />
            </div>

            <h2 className="orders__empty-title">No Orders Yet</h2>
            <p className="orders__empty-description">
              Start your sustainable food journey today! Your order history will appear here.
            </p>

            <button
              onClick={() => navigate('/browse')}
              className="orders__empty-btn"
            >
              <Sparkles className="orders__empty-btn-icon" />
              <span>Browse Menu</span>
            </button>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}