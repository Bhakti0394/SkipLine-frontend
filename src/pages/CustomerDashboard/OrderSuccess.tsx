import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Clock, MapPin, Zap, Leaf, ChefHat, ArrowRight,
  RefreshCw, AlertCircle, Timer, Flame, X, Search, Star, XCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from '../../customer-hooks/use-toast';
import '../../components/CustomerDashboard/styles/Ordersuccess.scss';
import { dispatchNotification, NotificationPopup } from '../../components/CustomerDashboard/dashboard/NotificationPopup';

// ─── Indian Meals Data ────────────────────────────────────
const indianMeals = [
  { id: '1',  name: 'Butter Chicken',     restaurant: 'Spice Kitchen',      image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400',  price: 249, prepTime: 15, rating: 4.9, category: 'North Indian' },
  { id: '2',  name: 'Masala Dosa',        restaurant: 'South Indian Corner', image: 'https://images.unsplash.com/photo-1668236543090-82eb5eaf59fd?w=400',  price: 129, prepTime: 10, rating: 4.8, category: 'South Indian' },
  { id: '3',  name: 'Hyderabadi Biryani', restaurant: 'Biryani House',       image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',  price: 299, prepTime: 20, rating: 4.9, category: 'Biryani' },
  { id: '4',  name: 'Pani Puri',          restaurant: 'Street Food Corner',  image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',  price:  79, prepTime:  5, rating: 4.7, category: 'Street Food' },
  { id: '5',  name: 'Paneer Tikka',       restaurant: 'Tandoor Express',     image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400',  price: 199, prepTime: 12, rating: 4.8, category: 'North Indian' },
  { id: '6',  name: 'Chole Bhature',      restaurant: 'Punjabi Dhaba',       image: 'https://images.unsplash.com/photo-1626132647523-66c9af4e09f8?w=400',  price: 149, prepTime: 10, rating: 4.6, category: 'North Indian' },
  { id: '7',  name: 'Idli Sambar',        restaurant: 'South Indian Corner', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400',  price:  99, prepTime:  8, rating: 4.7, category: 'South Indian' },
  { id: '8',  name: 'Vada Pav',           restaurant: 'Mumbai Bites',        image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400',  price:  49, prepTime:  5, rating: 4.5, category: 'Street Food' },
  { id: '9',  name: 'Dal Makhani',        restaurant: 'Spice Kitchen',       image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400',  price: 179, prepTime: 15, rating: 4.8, category: 'North Indian' },
  { id: '10', name: 'Gulab Jamun',        restaurant: 'Sweet Delights',      image: 'https://images.unsplash.com/photo-1666190050371-ce03c9870537?w=400',  price:  89, prepTime:  5, rating: 4.9, category: 'Desserts' },
  { id: '11', name: 'Rajasthani Thali',   restaurant: 'Royal Kitchen',       image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',  price: 399, prepTime: 20, rating: 4.9, category: 'Thali' },
  { id: '12', name: 'Lucknowi Biryani',   restaurant: 'Biryani House',       image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400',  price: 329, prepTime: 25, rating: 4.8, category: 'Biryani' },
  { id: '13', name: 'Samosa (2 pcs)',     restaurant: 'Street Food Corner',  image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',  price:  40, prepTime:  5, rating: 4.6, category: 'Street Food' },
  { id: '14', name: 'Chai & Biscuits',    restaurant: 'Tea Time',            image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400',  price:  30, prepTime:  3, rating: 4.7, category: 'Desserts' },
  { id: '15', name: 'Poha',              restaurant: 'Breakfast Junction',  image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400',  price:  60, prepTime:  8, rating: 4.5, category: 'South Indian' },
];

// ─── Feedback Card ────────────────────────────────────────
function FeedbackCard({ mealName, onSubmit, onSkip }: {
  mealName: string;
  onSubmit: (rating: number, comment: string) => void;
  onSkip: () => void;
}) {
  const [rating, setRating]           = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment]         = useState('');

  return (
    <div className="feedback-card">
      <h3 className="feedback-card__title">Rate your experience</h3>
      <p className="feedback-card__meal">{mealName}</p>
      <div className="feedback-card__stars">
        {[1,2,3,4,5].map((star) => (
          <button key={star} className="feedback-card__star-btn"
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            onClick={() => setRating(star)}>
            <Star size={28}
              fill={(hoveredRating || rating) >= star ? '#FF6B2C' : 'none'}
              stroke={(hoveredRating || rating) >= star ? '#FF6B2C' : 'hsl(var(--muted-foreground))'}
            />
          </button>
        ))}
      </div>
      <textarea placeholder="Any comments? (optional)" value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="feedback-card__textarea" rows={3} />
      <div className="feedback-card__actions">
        <Button onClick={() => onSubmit(rating, comment)} disabled={rating === 0} className="feedback-card__submit">Submit</Button>
        <Button variant="ghost" onClick={onSkip} className="feedback-card__skip">Skip</Button>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────
interface Order {
  id: string; meal: string; restaurant: string; price: number;
  image: string; timeSaved: number; quantity: number; pickupTime: string;
  kitchenQueuePosition: number; status?: string; delayedBy?: number;
  wasSwapped?: boolean; originalMeal?: string; wasCancelled?: boolean;
}
interface LocationState { orders: Order[]; paymentMethod: 'upi' | 'cash'; total: number; }

function addMinutesToTime(time: string, minutes: number): string {
  const parts = time.split(' ');
  const [hours, mins] = parts[0].split(':').map(Number);
  const period = parts[1] || 'PM';
  const totalMins = (hours % 12) * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60) % 12 || 12;
  const newMins = totalMins % 60;
  return `${newHours}:${newMins.toString().padStart(2, '0')} ${period}`;
}

// ─── Main Component ───────────────────────────────────────
export default function OrderSuccess() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const locationState = location.state as LocationState | null;

  const [orders, setOrders]                         = useState<Order[]>(locationState?.orders || []);
  const [paymentMethod]                             = useState<'upi' | 'cash'>(locationState?.paymentMethod || 'upi');
  const [total, setTotal]                           = useState(locationState?.total || 0);

  const [showConfetti, setShowConfetti]             = useState(false);
  const [showFeedback, setShowFeedback]             = useState(false);
  const [currentFeedbackIndex, setCurrentFeedbackIndex] = useState(0);
  const [canEditOrder, setCanEditOrder]             = useState(true);
  const [timeRemaining, setTimeRemaining]           = useState(600);
  const [showSwapOptions, setShowSwapOptions]       = useState(false);
  const [showLatePickupOptions, setShowLatePickupOptions] = useState(false);
  const [isRunningLate, setIsRunningLate]           = useState(false);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [searchQuery, setSearchQuery]               = useState('');
  const [selectedCategory, setSelectedCategory]     = useState('All');
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  useEffect(() => {
    if (!locationState?.orders?.length) {
      toast({ title: 'No order found', description: 'Redirecting…', variant: 'destructive' });
      navigate('/');
    }
  }, [locationState, navigate]);

  if (!locationState?.orders?.length) return null;
  const firstOrder = orders[0];
  if (!firstOrder) return null;



  // ── Timers ─────────────────────────────────────────────
  useEffect(() => {
    if (!canEditOrder) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => { if (prev <= 1) { setCanEditOrder(false); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [canEditOrder]);

  useEffect(() => { const t = setTimeout(() => setShowConfetti(true), 500);  return () => clearTimeout(t); }, []);
  useEffect(() => { const t = setTimeout(() => setShowFeedback(true), 2500); return () => clearTimeout(t); }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Dishes ─────────────────────────────────────────────
  const availableDishes = indianMeals.map((m) => ({
    id: m.id, meal: m.name, restaurant: m.restaurant, price: m.price,
    image: m.image, timeSaved: Math.floor(m.prepTime * 0.8 + 3),
    available: true, category: m.category, isExpress: m.prepTime <= 10,
  }));
  const categories     = ['All', ...Array.from(new Set(availableDishes.map((d) => d.category)))];
  const filteredDishes = availableDishes.filter((d) => {
    const q = d.meal.toLowerCase().includes(searchQuery.toLowerCase()) || d.restaurant.toLowerCase().includes(searchQuery.toLowerCase());
    const c = selectedCategory === 'All' || d.category === selectedCategory;
    return q && c && d.available;
  });
  const totalTimeSaved = orders.reduce((s, o) => s + o.timeSaved, 0);

  // ── Handlers ───────────────────────────────────────────
  const handleSwapDish = (idx = 0) => { if (!canEditOrder) return; setSelectedOrderIndex(idx); setShowSwapOptions(true); setSearchQuery(''); setSelectedCategory('All'); };

  const confirmSwapDish = (dish: typeof availableDishes[0]) => {
    const cur  = orders[selectedOrderIndex];
    const diff = dish.price - cur.price;
    const orig = cur.wasSwapped ? cur.originalMeal! : cur.meal;
    setOrders((prev) => prev.map((o, i) => i === selectedOrderIndex ? { ...o, meal: dish.meal, restaurant: dish.restaurant, price: dish.price, image: dish.image, timeSaved: dish.timeSaved, wasSwapped: true, originalMeal: orig } : o));
    setTotal((prev) => prev + diff);
    setShowSwapOptions(false);
    const msg = diff > 0 ? `₹${diff} extra charged.` : diff < 0 ? `₹${Math.abs(diff)} refund credited.` : 'No price difference.';
    toast({ title: '🔄 Dish Swapped!', description: msg });
    dispatchNotification('success', 'Dish Swapped! 🔄', `${cur.meal} → ${dish.meal}. ${msg}`);
  };

  const confirmRunningLate = (mins: number) => {
    const newTime = addMinutesToTime(orders[0].pickupTime, mins);
    setIsRunningLate(true);
    setOrders((prev) => prev.map((o) => ({ ...o, pickupTime: newTime, status: 'delayed', delayedBy: (o.delayedBy || 0) + mins })));
    setShowLatePickupOptions(false);
    toast({ title: '⏰ Pickup Extended!', description: `New time: ${newTime}` });
    dispatchNotification('warning', `Extended +${mins} min ⏰`, `New pickup: ${newTime}`);
  };

  const confirmCancelOrder = () => {
    setShowCancelConfirmation(false);
    const msg = paymentMethod === 'upi' ? `₹${total} refunded in 5-7 days.` : 'Order cancelled.';
    toast({ title: 'Order Cancelled', description: msg });
    dispatchNotification('info', 'Order Cancelled', msg);
    setTimeout(() => navigate('/customer-dashboard/orders', {
      state: { fromOrderSuccess: true, orders: orders.map((o) => ({ ...o, wasCancelled: true, status: 'cancelled' })), paymentMethod, total, wasCancelled: true },
    }), 1500);
  };

  const handleFeedbackSubmit = (rating: number, comment: string) => {
    const meal = orders[currentFeedbackIndex]?.meal || '';
    dispatchNotification('success', 'Thank You! 🙏', `Rated ${meal} ${rating}/5 stars.`);
    if (currentFeedbackIndex < orders.length - 1) setCurrentFeedbackIndex((p) => p + 1);
    else { toast({ title: 'Thank you! 🙏' }); setShowFeedback(false); }
  };

  const handleSkip = () => {
    if (currentFeedbackIndex < orders.length - 1) setCurrentFeedbackIndex((p) => p + 1);
    else setShowFeedback(false);
  };

  const navigateToOrders = () => navigate('/customer-dashboard/orders', {
    state: { fromOrderSuccess: true, orders: orders.map((o) => ({ ...o, paymentStatus: paymentMethod === 'upi' ? 'paid' : 'pending', status: o.status || 'confirmed' })), paymentMethod, total },
  });

  // ─────────────────────────────────────────────────────
  return (
    <div className="order-success">
      <div className="order-success__container">

        {/* ── Hero: Checkmark + Title + Order ID ── */}
        <motion.div
          className={`order-success__hero ${paymentMethod === 'upi' ? 'order-success__hero--green' : ''}`}
          initial={{ opacity: 0, scale: 0.7, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.05 }}
        >
          {/* Checkmark */}
          <div className="order-success__checkmark">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.4 }}
              className={`order-success__checkmark-ring ${paymentMethod === 'upi' ? 'order-success__checkmark-ring--green' : ''}`}
            />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.15 }}
              className={`order-success__checkmark-circle ${paymentMethod === 'upi' ? 'order-success__checkmark-circle--green' : ''}`}
            >
              <motion.div
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                <Check className="order-success__checkmark-icon" strokeWidth={3} />
              </motion.div>
            </motion.div>
          </div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.45 }}
            className="order-success__title"
          >
            <h1 className={`order-success__heading ${paymentMethod === 'upi' ? 'order-success__heading--green' : ''}`}>
              {paymentMethod === 'upi' ? 'Payment Successful!' : 'Order Confirmed!'}
            </h1>
            <p className="order-success__subtitle">Your pre-order has been placed</p>
          </motion.div>

          {/* Order ID */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className={`order-success__order-id ${paymentMethod === 'upi' ? 'order-success__order-id--green' : ''}`}
          >
            <p className="order-success__order-id-label">Order ID</p>
            <p className={`order-success__order-id-value ${paymentMethod === 'upi' ? 'order-success__order-id-value--green' : ''}`}>{firstOrder.id}</p>
          </motion.div>
        </motion.div>

        {/* ── Edit Timer ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className={`order-success__edit-timer ${!canEditOrder ? 'order-success__edit-timer--expired' : ''}`}>
          <div className="order-success__edit-timer-content">
            <Timer className="order-success__edit-timer-icon" />
            <div className="order-success__edit-timer-text">
              <p className="order-success__edit-timer-label">{canEditOrder ? 'Free to edit or cancel' : 'Edit window expired'}</p>
              <p className="order-success__edit-timer-value">{canEditOrder ? formatTime(timeRemaining) : '0:00'}</p>
            </div>
          </div>
          {canEditOrder && (
            <div className="order-success__edit-timer-progress">
              <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 600, ease: 'linear' }} className="order-success__edit-timer-bar" />
            </div>
          )}
        </motion.div>

        {/* ── Quick Actions ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="order-success__quick-actions">
          {[
            { key: 'swap',   icon: <RefreshCw />, label: 'Swap Dish',     sub: canEditOrder ? 'Change your order' : 'Not available', fn: () => handleSwapDish(0) },
            { key: 'late',   icon: <Clock />,     label: 'Running Late?', sub: canEditOrder ? 'Extend pickup time' : 'Not available', fn: () => setShowLatePickupOptions(true) },
            { key: 'cancel', icon: <XCircle />,   label: 'Cancel Order',  sub: canEditOrder ? '100% refund' : 'Not available',       fn: () => setShowCancelConfirmation(true) },
          ].map(({ key, icon, label, sub, fn }) => (
            <motion.button key={key} whileHover={canEditOrder ? { scale: 1.02 } : {}} whileTap={canEditOrder ? { scale: 0.98 } : {}}
              onClick={fn} disabled={!canEditOrder}
              className={`order-success__quick-action order-success__quick-action--${key} ${!canEditOrder ? 'order-success__quick-action--disabled' : ''}`}>
              <span className="order-success__quick-action-icon">{icon}</span>
              <div className="order-success__quick-action-text">
                <span className="order-success__quick-action-label">{label}</span>
                <span className="order-success__quick-action-sublabel">{sub}</span>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* ── Order Details Card ── */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="order-success__details-card">
          {orders.map((order, index) => (
            <div key={order.id} className={`order-success__order-item ${index > 0 ? 'order-success__order-item--bordered' : ''}`}>
              <img src={order.image} alt={order.meal} className="order-success__order-image" />
              <div className="order-success__order-info">
                <p className="order-success__order-meal">{order.meal}{order.wasSwapped && <span className="order-success__swapped-badge"> (Swapped)</span>}</p>
                <p className="order-success__order-restaurant">{order.restaurant}</p>
                <p className="order-success__order-quantity">Qty: {order.quantity}</p>
                {order.wasSwapped && order.originalMeal && <p className="order-success__original-meal">Was: {order.originalMeal}</p>}
              </div>
              <div className="order-success__order-actions">
                <p className="order-success__order-price">₹{order.price}</p>
                {canEditOrder && <button onClick={() => handleSwapDish(index)} className="order-success__swap-btn"><RefreshCw size={12} /> Swap</button>}
              </div>
            </div>
          ))}

          <div className="order-success__divider" />

          <div className="order-success__pickup-info">
            <div className="order-success__info-card">
              <Clock className={`order-success__info-icon ${isRunningLate ? 'order-success__info-icon--warning' : 'order-success__info-icon--primary'}`} />
              <div className="order-success__info-content">
                <p className="order-success__info-label">Pickup Time</p>
                <p className="order-success__info-value">
                  {orders[0].pickupTime}
                  {isRunningLate && <span className="order-success__info-badge">Extended</span>}
                </p>
              </div>
            </div>
            <div className="order-success__info-card">
              <MapPin className="order-success__info-icon order-success__info-icon--accent" />
              <div className="order-success__info-content">
                <p className="order-success__info-label">Location</p>
                <p className="order-success__info-value">Counter #3</p>
              </div>
            </div>
          </div>

          {isRunningLate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="order-success__food-status">
              <Flame className="order-success__food-status-icon" />
              <div className="order-success__food-status-text">
                <p className="order-success__food-status-label">Warming Zone</p>
                <p className="order-success__food-status-sublabel">Extended by {orders[0].delayedBy} min — food stays fresh</p>
              </div>
            </motion.div>
          )}

          {/* Payment Status — green for UPI */}
          <div className={`order-success__payment-status ${paymentMethod === 'upi' ? 'order-success__payment-status--upi' : 'order-success__payment-status--cash'}`}>
            <p className={`order-success__payment-text ${paymentMethod === 'upi' ? 'order-success__payment-text--upi' : 'order-success__payment-text--cash'}`}>
              {paymentMethod === 'upi' ? '✓ Payment completed via UPI' : `₹ Pay ₹${total} at pickup`}
            </p>
          </div>
        </motion.div>

        {/* ── Metrics ── */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }} className="order-success__metrics">
          {[
            { icon: <Zap />, mod: 'primary', val: `${totalTimeSaved} min`, label: 'Time Saved' },
            { icon: <Leaf />, mod: 'success', val: '0.15 kg', label: 'Waste Reduced' },
            { icon: <ChefHat />, mod: 'accent', val: `#${firstOrder.kitchenQueuePosition}`, label: 'Queue Position' },
          ].map(({ icon, mod, val, label }) => (
            <div key={label} className="order-success__metric-card">
              <div className={`order-success__metric-icon order-success__metric-icon--${mod}`}>{icon}</div>
              <p className="order-success__metric-value">{val}</p>
              <p className="order-success__metric-label">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Feedback ── */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="order-success__feedback-wrapper">
              <FeedbackCard mealName={orders[currentFeedbackIndex]?.meal || ''} onSubmit={handleFeedbackSubmit} onSkip={handleSkip} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action Buttons ── */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }} className="order-success__actions">
          <Button onClick={navigateToOrders} className="order-success__primary-btn">
            Track Your Order <ArrowRight className="order-success__btn-icon" />
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')} className="order-success__secondary-btn">Back to Home</Button>
        </motion.div>
      </div>

      {/* ══ SWAP MODAL ══════════════════════════════════════ */}
      <AnimatePresence>
        {showSwapOptions && orders[selectedOrderIndex] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="order-success__modal-overlay" onClick={() => setShowSwapOptions(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 50 }} onClick={(e) => e.stopPropagation()} className="order-success__swap-modal">
              <div className="order-success__swap-modal-header">
                <div>
                  <h3 className="order-success__swap-modal-title">Swap Your Dish</h3>
                  <p className="order-success__swap-modal-subtitle">Pick a different dish from our menu</p>
                </div>
                <button onClick={() => setShowSwapOptions(false)} className="order-success__swap-modal-close"><X size={20} /></button>
              </div>

              <div className="order-success__swap-current">
                <p className="order-success__swap-current-label">Current Order</p>
                <div className="order-success__swap-current-item">
                  <img src={orders[selectedOrderIndex].image} alt={orders[selectedOrderIndex].meal} className="order-success__swap-current-image" />
                  <div className="order-success__swap-current-info">
                    <p className="order-success__swap-current-meal">{orders[selectedOrderIndex].meal}</p>
                    <p className="order-success__swap-current-restaurant">{orders[selectedOrderIndex].restaurant}</p>
                  </div>
                  <p className="order-success__swap-current-price">₹{orders[selectedOrderIndex].price}</p>
                </div>
              </div>

              <div className="order-success__swap-search">
                <Search className="order-success__swap-search-icon" />
                <input type="text" placeholder="Search dishes…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="order-success__swap-search-input" autoFocus />
              </div>

              <div className="order-success__swap-categories">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`order-success__swap-category ${selectedCategory === cat ? 'order-success__swap-category--active' : ''}`}>{cat}</button>
                ))}
              </div>

              <div className="order-success__swap-dishes">
                {filteredDishes.length === 0
                  ? <div className="order-success__swap-empty"><p>No dishes found</p></div>
                  : filteredDishes.map((dish) => {
                      const diff      = dish.price - orders[selectedOrderIndex].price;
                      const isCurrent = dish.meal === orders[selectedOrderIndex].meal;
                      return (
                        <motion.div key={dish.id} whileHover={{ scale: 1.01 }} onClick={() => !isCurrent && confirmSwapDish(dish)}
                          className={`order-success__swap-dish ${isCurrent ? 'order-success__swap-dish--current' : ''}`}>
                          <img src={dish.image} alt={dish.meal} className="order-success__swap-dish-image" />
                          <div className="order-success__swap-dish-info">
                            <p className="order-success__swap-dish-meal">{dish.meal}{isCurrent && <span style={{ fontSize: '0.7rem', marginLeft: 6, color: 'hsl(var(--muted-foreground))' }}>(current)</span>}</p>
                            <p className="order-success__swap-dish-restaurant">{dish.restaurant}</p>
                            <div className="order-success__swap-dish-meta">
                              <span className="order-success__swap-dish-time"><Zap size={11} />{dish.timeSaved} min saved</span>
                              {dish.isExpress && <span className="order-success__swap-dish-express">⚡ Express</span>}
                            </div>
                          </div>
                          <div className="order-success__swap-dish-price-wrap">
                            <p className="order-success__swap-dish-price">₹{dish.price}</p>
                            {!isCurrent && diff !== 0 && <p className={`order-success__swap-dish-diff ${diff > 0 ? 'order-success__swap-dish-diff--extra' : 'order-success__swap-dish-diff--refund'}`}>{diff > 0 ? '+' : ''}₹{Math.abs(diff)}</p>}
                          </div>
                        </motion.div>
                      );
                    })}
              </div>

              <div className="order-success__swap-footer">
                <AlertCircle size={14} />
                <p>Price differences are charged or refunded automatically</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ LATE PICKUP MODAL ═══════════════════════════════ */}
      <AnimatePresence>
        {showLatePickupOptions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="order-success__modal-overlay" onClick={() => setShowLatePickupOptions(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="order-success__modal">
              <h3 className="order-success__modal-title">Extend Pickup Time</h3>
              <p className="order-success__modal-subtitle">Current: <strong>{orders[0].pickupTime}</strong></p>
              <div className="order-success__modal-options">
                {[10, 15, 20].map((m) => (
                  <button key={m} onClick={() => confirmRunningLate(m)} className="order-success__modal-option">
                    <Clock size={18} className="order-success__modal-option-icon" />
                    <div><span>+{m} minutes</span><span className="order-success__modal-option-sub">New time: {addMinutesToTime(orders[0].pickupTime, m)}</span></div>
                  </button>
                ))}
              </div>
              <div className="order-success__modal-info"><Flame size={14} /><p>We'll keep your food warm in the warming zone</p></div>
              <Button variant="ghost" onClick={() => setShowLatePickupOptions(false)} style={{ width: '100%', marginTop: '0.5rem' }}>Cancel</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ CANCEL MODAL ════════════════════════════════════ */}
      <AnimatePresence>
        {showCancelConfirmation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="order-success__modal-overlay" onClick={() => setShowCancelConfirmation(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="order-success__cancel-modal">
              <div className="order-success__cancel-icon"><AlertCircle size={28} /></div>
              <h3 className="order-success__modal-title">Cancel Order?</h3>
              <p className="order-success__modal-subtitle">Are you sure? This cannot be undone.</p>

              <div className="order-success__cancel-summary">
                {orders.map((o) => (
                  <div key={o.id} className="order-success__cancel-item">
                    <img src={o.image} alt={o.meal} className="order-success__cancel-item-img" />
                    <div className="order-success__cancel-item-info">
                      <p className="order-success__cancel-item-meal">{o.meal}</p>
                      <p className="order-success__cancel-item-rest">{o.restaurant}</p>
                    </div>
                    <p className="order-success__cancel-item-price">₹{o.price}</p>
                  </div>
                ))}
                <div className="order-success__cancel-total"><span>Total</span><span>₹{total}</span></div>
              </div>

              {paymentMethod === 'upi' && (
                <div className="order-success__cancel-refund">
                  <span>💰</span>
                  <div>
                    <p className="order-success__cancel-refund-label">100% Refund Guaranteed</p>
                    <p className="order-success__cancel-refund-sub">₹{total} refunded within 5-7 business days</p>
                  </div>
                </div>
              )}

              <div className="order-success__cancel-actions">
                <Button variant="outline" onClick={() => setShowCancelConfirmation(false)} className="order-success__cancel-keep">Keep Order</Button>
                <Button onClick={confirmCancelOrder} className="order-success__cancel-confirm">Yes, Cancel</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ CONFETTI ════════════════════════════════════════ */}
      {showConfetti && (
        <div className="order-success__confetti">
          {[...Array(30)].map((_, i) => (
            <motion.div key={i}
              initial={{ y: -20, x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400), opacity: 1, scale: Math.random() * 0.5 + 0.5 }}
              animate={{ y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20, opacity: 0, rotate: Math.random() * 720 }}
              transition={{ duration: Math.random() * 2 + 2, delay: Math.random() * 0.5, ease: 'easeOut' }}
              className={`order-success__confetti-piece order-success__confetti-piece--${i % 5}`}
            />
          ))}
        </div>
      )}



      <NotificationPopup />
    </div>
  );
}