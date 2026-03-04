import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, ChefHat, CheckCircle2, Flame, MapPin, 
  RefreshCw, Zap, Leaf, TrendingUp, Package, XCircle, AlertTriangle,
  Sparkles, Award, Timer, Utensils
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '../../customer-hooks/use-toast';
import '../../components/CustomerDashboard/styles/Myorders.scss';

interface Order {
  id: string;
  meal: string;
  restaurant: string;
  price: number;
  image: string;
  timeSaved: number;
  quantity: number;
  pickupTime: string;
  kitchenQueuePosition: number;
  status?: string;
  delayedBy?: number;
  paymentStatus?: 'paid' | 'pending';
  wasSwapped?: boolean;
  originalMeal?: string;
  wasCancelled?: boolean;
}

interface LocationState {
  fromOrderSuccess?: boolean;
  orders?: Order[];
  paymentMethod?: 'upi' | 'cash';
  total?: number;
  wasCancelled?: boolean;
}

const statusConfig = {
  confirmed: { 
    label: 'Order Confirmed', 
    icon: CheckCircle2, 
    color: 'blue', 
    progress: 15 
  },
  preparing: { 
    label: 'Being Prepared', 
    icon: ChefHat, 
    color: 'amber', 
    progress: 40 
  },
  cooking: { 
    label: 'Cooking', 
    icon: Flame, 
    color: 'orange', 
    progress: 70 
  },
  ready: { 
    label: 'Ready for Pickup!', 
    icon: CheckCircle2, 
    color: 'success', 
    progress: 100 
  },
  completed: { 
    label: 'Completed', 
    icon: CheckCircle2, 
    color: 'muted', 
    progress: 100 
  },
  delayed: {
    label: 'Time Extended',
    icon: Clock,
    color: 'amber',
    progress: 20
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'destructive',
    progress: 0
  }
};

// Floating Particles Component
const FloatingParticles = () => {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 10,
    size: 2 + Math.random() * 3,
  }));

  return (
    <div className="orders__particles" aria-hidden="true">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="orders__particle"
          initial={{ 
            x: `${particle.x}vw`, 
            y: `${particle.y}vh`,
            opacity: 0,
            scale: 0,
          }}
          animate={{
            y: [`${particle.y}vh`, `${particle.y - 30}vh`, `${particle.y}vh`],
            x: [`${particle.x}vw`, `${particle.x + 10}vw`, `${particle.x}vw`],
            opacity: [0, 0.6, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: particle.size,
            height: particle.size,
          }}
        />
      ))}
    </div>
  );
};

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 2000 }: { value: number | string, duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof value === 'string') return;
    
    let start = 0;
    const end = value;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{typeof value === 'string' ? value : count}</>;
};

export default function MyOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  
  const [orders, setOrders] = useState<Order[]>(
    locationState?.fromOrderSuccess && locationState?.orders 
      ? locationState.orders.map(o => ({ 
          ...o, 
          status: o.wasCancelled ? 'cancelled' : (o.status || 'confirmed'), 
          paymentStatus: o.paymentStatus || 'paid' 
        }))
      : []
  );

  useEffect(() => {
    if (locationState?.wasCancelled) {
      toast({
        title: "Order Cancelled",
        description: locationState.paymentMethod === 'upi' 
          ? `₹${locationState.total} will be refunded to your account within 5-7 business days.`
          : 'Order cancelled successfully.',
        variant: "destructive"
      });
    }
  }, [locationState]);

  const calculateMetrics = () => {
    const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed');
    const timeSaved = activeOrders.reduce((sum, o) => sum + (o.timeSaved || 0), 0);
    const foodWasteReduced = activeOrders.length * 0.15;
    const loyaltyPoints = Math.floor(activeOrders.reduce((sum, o) => sum + o.price, 0) / 10);
    
    return { timeSaved, foodWasteReduced, loyaltyPoints };
  };

  const metrics = calculateMetrics();

  useEffect(() => {
    const interval = setInterval(() => {
      simulateKitchenProgress();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const simulateKitchenProgress = () => {
    setOrders(prevOrders => 
      prevOrders.map(order => {
        if (order.status === 'completed' || order.status === 'cancelled') return order;
        
        if (order.status === 'delayed') {
          return { ...order, status: 'confirmed' };
        }
        
        const statusProgression = ['confirmed', 'preparing', 'cooking', 'ready', 'completed'];
        const currentIndex = statusProgression.indexOf(order.status || 'confirmed');
        
        if (currentIndex < statusProgression.length - 2) {
          return { ...order, status: statusProgression[currentIndex + 1] };
        }
        
        return order;
      })
    );
  };

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const getQueuePosition = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    return order?.kitchenQueuePosition || 0;
  };

  const activeOrders = orders.filter(o => o.status !== 'completed');
  const hasOrders = activeOrders.length > 0;
  const hasCancelledOrders = orders.some(o => o.status === 'cancelled');

  return (
    <DashboardLayout>
      <div className="orders">
        <FloatingParticles />

        {/* Premium Hero Section */}
        <div className="orders__hero">
          <div className="orders__hero-gradient">
            <motion.div 
              className="orders__hero-gradient-orb orders__hero-gradient-orb--1"
              animate={{
                x: [0, 100, 0],
                y: [0, -50, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="orders__hero-gradient-orb orders__hero-gradient-orb--2"
              animate={{
                x: [0, -80, 0],
                y: [0, 100, 0],
                scale: [1, 1.3, 1],
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="orders__header"
          >
            <div className="orders__header-content">
              <div className="orders__header-left">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="orders__title-badge"
                >
                  <Package className="orders__title-badge-icon" />
                  <span>Order Tracking</span>
                </motion.div>
                
                <h1 className="orders__title">
                  <motion.span
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    My
                  </motion.span>
                  {' '}
                  <span className="orders__title-grad">
                    <motion.span
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      Orders
                    </motion.span>
                  </span>
                </h1>
                
                <motion.p 
                  className="orders__subtitle"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {hasOrders ? `${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''} in progress` : 'No active orders at the moment'}
                </motion.p>
              </div>

              {hasOrders && !hasCancelledOrders && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={simulateKitchenProgress}
                    className="orders__simulate-btn"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <RefreshCw className="orders__simulate-icon" />
                    </motion.div>
                    <span className="orders__simulate-text">Simulate Progress</span>
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Premium Impact Stats */}
        {hasOrders && !hasCancelledOrders && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="orders__impact-stats"
          >
            {[
              { icon: Zap, value: metrics.timeSaved, label: 'Minutes Saved', suffix: ' min', color: '#ff6b35' },
              { icon: Leaf, value: metrics.foodWasteReduced.toFixed(1), label: 'Waste Reduced', suffix: ' kg', color: '#10b981' },
              { icon: Award, value: metrics.loyaltyPoints, label: 'Points Earned', suffix: '', color: '#fbbf24' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="orders__stat-card"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <div className="orders__stat-glow" style={{ background: `radial-gradient(circle, ${stat.color}40, transparent)` }} />
                <motion.div 
                  className="orders__stat-icon"
                  animate={{ 
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ color: stat.color }}
                >
                  <stat.icon />
                </motion.div>
                <div className="orders__stat-content">
                  <motion.p className="orders__stat-value">
                    <AnimatedCounter value={typeof stat.value === 'string' ? parseFloat(stat.value) : stat.value} />
                    {stat.suffix}
                  </motion.p>
                  <p className="orders__stat-label">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Ready Banner with Premium Animation */}
        <AnimatePresence>
          {activeOrders.some(o => o.status === 'ready') && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="orders__ready-banner"
            >
              <motion.div 
                className="orders__ready-glow"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="orders__ready-content">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="orders__ready-icon"
                >
                  <CheckCircle2 />
                </motion.div>
                <div className="orders__ready-text">
                  <h3 className="orders__ready-title">🎉 Order Ready!</h3>
                  <p className="orders__ready-description">
                    {activeOrders.find(o => o.status === 'ready')?.meal} is ready at Counter #3
                  </p>
                </div>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Sparkles className="orders__ready-sparkle" />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancelled Order Notice */}
        <AnimatePresence>
          {hasCancelledOrders && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="orders__cancelled-banner"
            >
              <div className="orders__cancelled-content">
                <div className="orders__cancelled-icon">
                  <AlertTriangle />
                </div>
                <div className="orders__cancelled-text">
                  <h3 className="orders__cancelled-title">Order Cancelled</h3>
                  <p className="orders__cancelled-description">
                    {locationState?.paymentMethod === 'upi' 
                      ? `Your refund of ₹${locationState?.total} is being processed`
                      : 'Your order has been cancelled successfully'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium Orders List */}
        {hasOrders ? (
          <div className="orders__list">
            <AnimatePresence mode="popLayout">
              {activeOrders.map((order, index) => {
                const status = statusConfig[order.status || 'confirmed'] || statusConfig.confirmed;
                const StatusIcon = status.icon;
                const queuePos = getQueuePosition(order.id);
                const isCancelled = order.status === 'cancelled';

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -100, scale: 0.9 }}
                    transition={{ 
                      delay: index * 0.1,
                      layout: { type: "spring", stiffness: 300, damping: 30 }
                    }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className={`orders__card ${isCancelled ? 'orders__card--cancelled' : ''}`}
                  >
                    {/* Premium Card Glow Effect */}
                    <motion.div 
                      className="orders__card-glow"
                      animate={{
                        opacity: [0.1, 0.3, 0.1],
                        scale: [0.95, 1.05, 0.95]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />

                    {/* Order Header */}
                    <div className="orders__card-header">
                      <motion.div 
                        className="orders__image-wrapper"
                        whileHover={{ scale: 1.05, rotate: 2 }}
                      >
                        <img
                          src={order.image}
                          alt={order.meal}
                          className={`orders__image ${isCancelled ? 'orders__image--cancelled' : ''}`}
                        />
                        {!isCancelled && order.status === 'cooking' && (
                          <motion.div
                            className="orders__cooking-badge"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <Flame className="orders__cooking-icon" />
                          </motion.div>
                        )}
                      </motion.div>

                      <div className="orders__info">
                        <div className="orders__title-row">
                          <div className="orders__details">
                            <h3 className="orders__name">
                              {order.meal}
                              {order.wasSwapped && !isCancelled && (
                                <motion.span 
                                  className="orders__swap-badge"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring" }}
                                >
                                  🔄 Swapped
                                </motion.span>
                              )}
                            </h3>
                            {order.wasSwapped && order.originalMeal && !isCancelled && (
                              <p className="orders__original-meal">Originally: {order.originalMeal}</p>
                            )}
                          </div>
                          <motion.span 
                            className="orders__price"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                          >
                            ₹{order.price.toFixed(0)}
                          </motion.span>
                        </div>
                        
                        <div className="orders__badges">
                          <motion.span 
                            className={`orders__status-badge orders__status-badge--${status.color}`}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            whileHover={{ scale: 1.05 }}
                          >
                            <StatusIcon className="orders__badge-icon" />
                            {status.label}
                          </motion.span>
                          {!isCancelled && (
                            <motion.span 
                              className={`orders__payment-badge orders__payment-badge--${order.paymentStatus}`}
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.4 }}
                              whileHover={{ scale: 1.05 }}
                            >
                              {order.paymentStatus === 'paid' ? '✓ Paid' : '₹ Cash'}
                            </motion.span>
                          )}
                          {order.delayedBy && !isCancelled && (
                            <motion.span 
                              className="orders__status-badge orders__status-badge--amber"
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.5 }}
                            >
                              <Clock className="orders__badge-icon" />
                              +{order.delayedBy} min extended
                            </motion.span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Premium Progress Bar */}
                    {!isCancelled && (
                      <div className="orders__progress-section">
                        <div className="orders__progress-header">
                          <span>Cooking Progress</span>
                          <motion.span
                            key={status.progress}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring" }}
                          >
                            {status.progress}%
                          </motion.span>
                        </div>
                        <div className="orders__progress-bar">
                          <motion.div
                            className="orders__progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${status.progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                          <motion.div
                            className="orders__progress-glow"
                            animate={{
                              x: ['0%', '100%'],
                              opacity: [0, 1, 0]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Cancelled Info */}
                    {isCancelled && (
                      <motion.div 
                        className="orders__cancelled-info"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                      >
                        <p className="orders__cancelled-text">
                          {order.paymentStatus === 'paid' 
                            ? `Refund of ₹${order.price} will be processed within 5-7 business days`
                            : 'Order cancelled successfully'}
                        </p>
                      </motion.div>
                    )}

                    {/* Premium Details Grid */}
                    {!isCancelled && (
                      <div className="orders__details-grid">
                        {[
                          { icon: Clock, value: order.pickupTime, label: 'Pickup Time', color: '#ff6b35', extended: order.delayedBy },
                          { icon: ChefHat, value: queuePos === 0 ? 'Cooking Now' : `#${queuePos} in Queue`, label: 'Kitchen Queue', color: '#a855f7' },
                          { icon: MapPin, value: 'Counter #3', label: 'Pickup Point', color: '#10b981' }
                        ].map((detail, i) => (
                          <motion.div
                            key={i}
                            className="orders__detail-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 + i * 0.1 }}
                            whileHover={{ y: -3, scale: 1.05 }}
                          >
                            <motion.div
                              animate={{ rotate: [0, 10, -10, 0] }}
                              transition={{ duration: 3, repeat: Infinity }}
                            >
                              <detail.icon className="orders__detail-icon" style={{ color: detail.color }} />
                            </motion.div>
                            <p className="orders__detail-value">
                              {detail.value}
                              {detail.extended && <span className="orders__extended-label"> (Extended)</span>}
                            </p>
                            <p className="orders__detail-label">{detail.label}</p>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Premium Footer */}
                    <div className="orders__card-footer">
                      <div className="orders__meta">
                        <span className="orders__id">{order.id}</span>
                        <span className="orders__separator">•</span>
                        <span>Qty: {order.quantity}</span>
                        {order.timeSaved && !isCancelled && (
                          <>
                            <span className="orders__separator">•</span>
                            <motion.span 
                              className="orders__time-saved"
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              ⚡ {order.timeSaved} min saved
                            </motion.span>
                          </>
                        )}
                      </div>
                      {order.status === 'ready' && !isCancelled && (
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="orders__collect-btn"
                          >
                            <CheckCircle2 className="orders__collect-icon" />
                            Mark Collected
                          </Button>
                        </motion.div>
                      )}
                      {isCancelled && (
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={() => navigate('/browse')}
                            className="orders__browse-again-btn"
                          >
                            <Package className="orders__browse-icon" />
                            Order Again
                          </Button>
                        </motion.div>
                      )}
                    </div>

                    {/* Warming Zone Indicator */}
                    {order.status === 'delayed' && !isCancelled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="orders__warming-zone"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Flame className="orders__warming-icon" />
                        </motion.div>
                        <span>Keeping warm for you</span>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="orders__empty"
          >
            <motion.div 
              className="orders__empty-glow"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div
              className="orders__empty-icon-wrapper"
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Package className="orders__empty-icon" />
            </motion.div>
            <h2 className="orders__empty-title">No Active Orders</h2>
            <p className="orders__empty-description">
              Pre-order your favorite meals and skip the queue!
            </p>
            <motion.div
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => navigate('/browse')}
                className="orders__empty-btn"
              >
                <Utensils className="orders__empty-btn-icon" />
                Browse Menu
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}