// pages/CustomerDashboard/OrderHistory.tsx
//
// FIX [IMAGE-MAP]: Expanded MEAL_IMAGE_MAP from 5 dishes to all 21 dishes.
// Previously any dish not in the 5-entry map fell back to butterChicken image.
// Now imports all the same assets as SkipLineContext so every dish shows
// its correct image in order history.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  History, Calendar, RefreshCw, Star, Zap, Leaf,
  Package, Sparkles, TrendingUp, Award, Loader2,
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { useSkipLine } from '../../customer-context/SkipLineContext';
import { useNavigate } from 'react-router-dom';
import { fetchCustomerOrders, CustomerOrderDto } from '../../kitchen-api/kitchenApi';
import '../../components/CustomerDashboard/styles/Orderhistory.scss';

// FIX: import ALL 21 dish images (was only 5)
import butterChicken    from '../../customer-assets/butter-chicken.jpg';
import chocolateDonuts  from '../../customer-assets/chocolate-donuts.jpg';
import choleBhature     from '../../customer-assets/chole-bhature.jpg';
import dalMakhani       from '../../customer-assets/dal-makhani.jpg';
import gulabJamun       from '../../customer-assets/gulab-jamun.jpg';
import hydrebadiBiryani from '../../customer-assets/hydrebadi-biryani.jpg';
import idliSambhar      from '../../customer-assets/idli-sambhar.jpg';
import lucknowiBiryani  from '../../customer-assets/lucknowi-biryani.jpg';
import masalaDosa       from '../../customer-assets/masala-dosa.jpg';
import paneerTikka      from '../../customer-assets/paneer-tikka.jpg';
import pizza            from '../../customer-assets/pizza.jpg';
import poha             from '../../customer-assets/poha.jpg';
import rajasthaniThali  from '../../customer-assets/rajasthani-thali.jpg';
import samosa           from '../../customer-assets/samosa.jpg';
import vadaPav          from '../../customer-assets/vada-pav.jpg';
import kadaiPaneer      from '../../customer-assets/kadai-paneer.jpg';
import palakPaneer      from '../../customer-assets/palak-paneer.jpg';
import chickenKorma     from '../../customer-assets/chicken-korma.jpg';
import prawnMasala      from '../../customer-assets/prawn-masala.jpg';
import muttonRoganJosh  from '../../customer-assets/mutton-rogan-josh.jpg';
import butterGarlicNaan from '../../customer-assets/butter-garlic-naan.jpg';

// FIX: full 21-dish map — mirrors MEAL_IMAGE_MAP in SkipLineContext exactly
// so the same dish always shows the same image everywhere in the app.
const MEAL_IMAGE_MAP: Record<string, string> = {
  'Butter Chicken':     butterChicken,
  'Chocolate Donuts':   chocolateDonuts,
  'Chole Bhature':      choleBhature,
  'Dal Makhani':        dalMakhani,
  'Gulab Jamun':        gulabJamun,
  'Hyderabadi Biryani': hydrebadiBiryani,
  'Idli Sambhar':       idliSambhar,
  'Lucknowi Biryani':   lucknowiBiryani,
  'Masala Dosa':        masalaDosa,
  'Paneer Tikka':       paneerTikka,
  'Pizza':              pizza,
  'Poha':               poha,
  'Rajasthani Thali':   rajasthaniThali,
  'Samosa':             samosa,
  'Vada Pav':           vadaPav,
  'Kadai Paneer':       kadaiPaneer,
  'Palak Paneer':       palakPaneer,
  'Chicken Korma':      chickenKorma,
  'Prawn Masala':       prawnMasala,
  'Mutton Rogan Josh':  muttonRoganJosh,
  'Butter Garlic Naan': butterGarlicNaan,
  // aliases
  'Idli Sambar':        idliSambhar,
  'Cheese Pizza':       pizza,
  'Samosa (2 pcs)':     samosa,
  'Chocolate Donut':    chocolateDonuts,
};

function getImageForOrder(dto: CustomerOrderDto): string {
  const firstName = dto.itemSummary?.[0]?.replace(/^\d+x\s*/, '') ?? '';
  if (!firstName) return butterChicken;
  // Exact match first
  if (MEAL_IMAGE_MAP[firstName]) return MEAL_IMAGE_MAP[firstName];
  // Case-insensitive fallback
  const lower = firstName.toLowerCase();
  const found = Object.entries(MEAL_IMAGE_MAP).find(([k]) => k.toLowerCase() === lower);
  return found ? found[1] : butterChicken;
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const { orderHistory: contextHistory, metrics } = useSkipLine();

  const [backendOrders, setBackendOrders] = useState<CustomerOrderDto[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      setError('Sign in to see your order history from the server');
      return;
    }

    fetchCustomerOrders()
      .then(orders => {
        setBackendOrders(orders);
        setLoading(false);
      })
      .catch(err => {
        console.warn('[OrderHistory] Backend unavailable, using context history:', err.message);
        setError('Could not load from server — showing local history');
        setLoading(false);
      });
  }, []);

  const showBackend      = !loading && !error && backendOrders.length > 0;
  const completedBackend = backendOrders.filter(o => o.status === 'completed');
  const displayOrders    = showBackend ? completedBackend : contextHistory;

  const totalSpent     = showBackend
    ? completedBackend.reduce((s, o) => s + (o.totalPrice ?? 0), 0)
    : contextHistory.reduce((s, o) => s + o.price, 0);
  const totalTimeSaved = contextHistory.reduce((s, o) => s + o.timeSaved, 0);

  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i, size: Math.random() * 4 + 2, x: Math.random() * 100, y: Math.random() * 100,
    duration: Math.random() * 20 + 15, delay: Math.random() * 5,
  }));

  return (
    <DashboardLayout>
      <div className="orders">
        <div className="orders__particles">
          {particles.map(p => (
            <motion.div key={p.id} className="orders__particle"
              style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
              animate={{ y: [0, -30, 0], x: [0, Math.random() * 20 - 10, 0], opacity: [0, 1, 0] }}
              transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }} />
          ))}
        </div>

        <div className="orders__hero">
          <div className="orders__hero-gradient">
            <div className="orders__hero-gradient-orb orders__hero-gradient-orb--1" />
            <div className="orders__hero-gradient-orb orders__hero-gradient-orb--2" />
          </div>
          <div className="orders__header">
            <div className="orders__header-content">
              <div className="orders__header-left">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="orders__title-badge">
                  <History className="orders__title-badge-icon" /><span>Your Journey</span>
                </motion.div>
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="orders__title">
                  Order <span className="orders__title-grad">History</span>
                </motion.h1>
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="orders__subtitle">
                  {showBackend ? 'Live data from server' : 'Track your culinary adventures'}
                </motion.p>
              </div>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="orders__impact-stats">
          {[
            { icon: Package,    value: displayOrders.length,                                label: 'Total Orders',  color: '#ff6b35' },
            { icon: TrendingUp, value: totalSpent > 0 ? `₹${totalSpent.toFixed(0)}` : '—', label: 'Total Spent',   color: '#f7931e' },
            { icon: Zap,        value: `${totalTimeSaved} min`,                             label: 'Time Saved',    color: '#fbbf24' },
            { icon: Leaf,       value: `${metrics.foodWasteReduced.toFixed(1)} kg`,         label: 'Waste Reduced', color: '#10b981' },
          ].map(({ icon: Icon, value, label, color }) => (
            <div key={label} className="orders__stat-card">
              <div className="orders__stat-glow" style={{ background: `radial-gradient(circle, ${color}4d, transparent)` }} />
              <div className="orders__stat-icon" style={{ color }}><Icon /></div>
              <div className="orders__stat-content">
                <div className="orders__stat-value">{value}</div>
                <div className="orders__stat-label">{label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {displayOrders.length >= 5 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }} className="orders__ready-banner">
            <div className="orders__ready-content">
              <div className="orders__ready-icon"><Award /></div>
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

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#ff6b35', width: 32, height: 32 }} />
          </div>
        )}

        {error && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.8rem', opacity: 0.55, marginBottom: '1rem' }}>
            {error}
          </motion.div>
        )}

        {!loading && showBackend && completedBackend.length > 0 && (
          <div className="orders__list">
            {completedBackend.map((order, index) => (
              <motion.div key={order.id} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }} className="orders__card">
                <div className="orders__card-glow" />
                <div className="orders__card-header">
                  <div className="orders__image-wrapper">
                    {/* FIX: now resolves correct image for all 21 dishes */}
                    <img src={getImageForOrder(order)} alt={order.itemSummary?.[0] ?? 'Order'} className="orders__image" />
                  </div>
                  <div className="orders__info">
                    <div className="orders__title-row">
                      <div className="orders__details">
                        <h3 className="orders__name">
                          {order.itemSummary?.length > 0 ? order.itemSummary.join(', ') : order.orderRef}
                        </h3>
                        <p className="orders__original-meal">{order.customerName}</p>
                      </div>
                      <div className="orders__price">
                        {order.totalPrice > 0 ? `₹${order.totalPrice}` : `#${order.orderRef.slice(-8)}`}
                      </div>
                    </div>
                    <div className="orders__badges">
                      <span className="orders__status-badge orders__status-badge--success">
                        <Star className="orders__badge-icon" />Completed
                      </span>
                    </div>
                  </div>
                </div>
                <div className="orders__details-grid">
                  <div className="orders__detail-card">
                    <Calendar className="orders__detail-icon" style={{ color: '#60a5fa' }} />
                    <div className="orders__detail-value">
                      {order.placedAt ? new Date(order.placedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—'}
                    </div>
                    <div className="orders__detail-label">Order Date</div>
                  </div>
                  <div className="orders__detail-card">
                    <Package className="orders__detail-icon" style={{ color: '#f7931e' }} />
                    <div className="orders__detail-value">{order.itemSummary?.length ?? 0} item(s)</div>
                    <div className="orders__detail-label">Items</div>
                  </div>
                  <div className="orders__detail-card">
                    <Zap className="orders__detail-icon" style={{ color: '#fbbf24' }} />
                    <div className="orders__detail-value">{order.totalPrepMinutes} min</div>
                    <div className="orders__detail-label">Prep Time</div>
                  </div>
                </div>
                <div className="orders__card-footer">
                  <div className="orders__meta">
                    <span className="orders__id">{order.orderRef}</span>
                  </div>
                  <button onClick={() => navigate('/customer-dashboard/browse')} className="orders__browse-again-btn">
                    <RefreshCw className="orders__browse-icon" /><span>Reorder</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && !showBackend && contextHistory.length > 0 && (
          <div className="orders__list">
            {contextHistory.map((order, index) => (
              <motion.div key={order.id} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }} className="orders__card">
                <div className="orders__card-glow" />
                <div className="orders__card-header">
                  <div className="orders__image-wrapper">
                    <img src={order.image} alt={order.meal} className="orders__image" />
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
                        <Star className="orders__badge-icon" />Completed
                      </span>
                      <span className={`orders__payment-badge ${order.paymentStatus === 'paid' ? 'orders__payment-badge--paid' : 'orders__payment-badge--pending'}`}>
                        {order.paymentStatus === 'paid' ? '✓ Paid' : 'Cash on Delivery'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="orders__details-grid">
                  <div className="orders__detail-card">
                    <Calendar className="orders__detail-icon" style={{ color: '#60a5fa' }} />
                    <div className="orders__detail-value">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
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
                <div className="orders__card-footer">
                  <div className="orders__meta">
                    <span className="orders__id">#{order.id.slice(0, 8)}</span>
                    <span className="orders__separator">•</span>
                    <span>{new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <button onClick={() => navigate('/customer-dashboard/browse')} className="orders__browse-again-btn">
                    <RefreshCw className="orders__browse-icon" /><span>Reorder</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && displayOrders.length === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }} className="orders__empty">
            <div className="orders__empty-glow" />
            <div className="orders__empty-icon-wrapper">
              <History className="orders__empty-icon" />
            </div>
            <h2 className="orders__empty-title">No Orders Yet</h2>
            <p className="orders__empty-description">Start your sustainable food journey today!</p>
            <button onClick={() => navigate('/customer-dashboard/browse')} className="orders__empty-btn">
              <Sparkles className="orders__empty-btn-icon" /><span>Browse Menu</span>
            </button>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}