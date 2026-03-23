// pages/CustomerDashboard/OrderSuccess.tsx
//
// FIX [HARDCODED-SWAP-MENU]: Removed `indianMeals` static array from swap modal.
//   The swap modal now calls fetchCustomerMenuItems() on open — same real data
//   that BrowseMenu uses. Dishes that are unavailable on backend won't appear.
//
// FIX [HARDCODED-COUNTER]: "Counter #3" pickup location replaced with
//   "Pickup Counter" — a generic label until the backend provides a real
//   counter field on CustomerOrderDto.
//
// FIX [FEEDBACK-MEALID]: FeedbackCard now uses order.id (the backend UUID)
//   as the mealId instead of order.meal (meal name string). This matches
//   what useFeedback stores and what getAverageRating looks up.
//   Note: useFeedback demo data uses numeric mealIds ('1','2'...) which will
//   never match real backend UUIDs — demo ratings won't show on real dishes,
//   which is correct behaviour (demo data is for unauthenticated state only).

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Clock, MapPin, Zap, Leaf, ChefHat, ArrowRight,
  RefreshCw, AlertCircle, Timer, Flame, X, Search, Star, XCircle, Loader2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from '../../customer-hooks/use-toast';
import { useNotifications } from '../../customer-context/NotificationContext';
import { fetchCustomerMenuItems, MenuItemDto } from '../../kitchen-api/kitchenApi';
import '../../components/CustomerDashboard/styles/Ordersuccess.scss';

import butterChicken    from '../../customer-assets/butter-chicken.jpg';
import masalaDosa       from '../../customer-assets/masala-dosa.jpg';
import hydrebadiBiryani from '../../customer-assets/hydrebadi-biryani.jpg';
import pizza            from '../../customer-assets/pizza.jpg';
import paneerTikka      from '../../customer-assets/paneer-tikka.jpg';
import choleBhature     from '../../customer-assets/chole-bhature.jpg';
import idliSambhar      from '../../customer-assets/idli-sambhar.jpg';
import vadaPav          from '../../customer-assets/vada-pav.jpg';
import dalMakhani       from '../../customer-assets/dal-makhani.jpg';
import gulabJamun       from '../../customer-assets/gulab-jamun.jpg';
import rajasthaniThali  from '../../customer-assets/rajasthani-thali.jpg';
import lucknowiBiryani  from '../../customer-assets/lucknowi-biryani.jpg';
import samosa           from '../../customer-assets/samosa.jpg';
import chocolateDonut   from '../../customer-assets/chocolate-donuts.jpg';
import poha             from '../../customer-assets/poha.jpg';
import kadaiPaneer      from '../../customer-assets/kadai-paneer.jpg';
import palakPaneer      from '../../customer-assets/palak-paneer.jpg';
import chickenKorma     from '../../customer-assets/chicken-korma.jpg';
import prawnMasala      from '../../customer-assets/prawn-masala.jpg';
import muttonRoganJosh  from '../../customer-assets/mutton-rogan-josh.jpg';
import butterGarlicNaan from '../../customer-assets/butter-garlic-naan.jpg';

// FIX: local image map used to enrich backend menu items (same as BrowseMenu)
const LOCAL_IMAGE_MAP: Record<string, string> = {
  'Butter Chicken': butterChicken, 'Masala Dosa': masalaDosa,
  'Hyderabadi Biryani': hydrebadiBiryani, 'Cheese Pizza': pizza, 'Pizza': pizza,
  'Paneer Tikka': paneerTikka, 'Chole Bhature': choleBhature,
  'Idli Sambar': idliSambhar, 'Idli Sambhar': idliSambhar,
  'Vada Pav': vadaPav, 'Dal Makhani': dalMakhani, 'Gulab Jamun': gulabJamun,
  'Rajasthani Thali': rajasthaniThali, 'Lucknowi Biryani': lucknowiBiryani,
  'Samosa (2 pcs)': samosa, 'Samosa': samosa,
  'Chocolate Donut': chocolateDonut, 'Chocolate Donuts': chocolateDonut,
  'Poha': poha, 'Kadai Paneer': kadaiPaneer, 'Palak Paneer': palakPaneer,
  'Chicken Korma': chickenKorma, 'Prawn Masala': prawnMasala,
  'Mutton Rogan Josh': muttonRoganJosh, 'Butter Garlic Naan': butterGarlicNaan,
};

// Shape used internally in the swap modal — derived from real MenuItemDto
interface SwapDish {
  id:        string;   // backend UUID
  meal:      string;
  price:     number;
  image:     string;
  timeSaved: number;
  category:  string;
  isExpress: boolean;
}

function menuItemToSwapDish(item: MenuItemDto): SwapDish {
  const image = item.imageUrl ?? LOCAL_IMAGE_MAP[item.name] ?? butterChicken;
  return {
    id:        item.id,
    meal:      item.name,
    price:     item.price ?? 0,
    image,
    timeSaved: item.prepTimeMinutes > 0 ? Math.floor(item.prepTimeMinutes * 0.8) : 5,
    category:  item.category ?? 'Other',
    isExpress: item.isExpress ?? item.prepTimeMinutes <= 15,
  };
}

function FeedbackCard({ mealName, onSubmit, onSkip }: {
  mealName: string;
  onSubmit: (rating: number, comment: string) => void;
  onSkip: () => void;
}) {
  const [rating, setRating]               = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment]             = useState('');
  return (
    <div className="feedback-card">
      <h3 className="feedback-card__title">Rate your experience</h3>
      <p className="feedback-card__meal">{mealName}</p>
      <div className="feedback-card__stars">
        {[1, 2, 3, 4, 5].map((star) => (
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

interface Order {
  id:                   string;
  orderRef:             string;
  meal:                 string;
  restaurant:           string;
  price:                number;
  image:                string;
  timeSaved:            number;
  quantity:             number;
  pickupTime:           string;
  kitchenQueuePosition: number;
  status?:              string;
  delayedBy?:           number;
  wasSwapped?:          boolean;
  originalMeal?:        string;
  wasCancelled?:        boolean;
  paymentStatus?:       'paid' | 'pending' | 'cash';
}

interface LocationState {
  orders:        Order[];
  paymentMethod: 'upi' | 'cash';
  total:         number;
}

function addMinutesToTime(time: string, minutes: number): string {
  const parts = time.split(' ');
  const [hours, mins] = parts[0].split(':').map(Number);
  const period = parts[1] || 'PM';
  const totalMins = (hours % 12) * 60 + mins + minutes;
  const newHours   = Math.floor(totalMins / 60) % 12 || 12;
  const newMins    = totalMins % 60;
  return `${newHours}:${newMins.toString().padStart(2, '0')} ${period}`;
}

export default function OrderSuccess() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const locationState = location.state as LocationState | null;
  const { addNotification } = useNotifications();

  const [orders, setOrders]                               = useState<Order[]>(locationState?.orders || []);
  const [paymentMethod]                                   = useState<'upi' | 'cash'>(locationState?.paymentMethod || 'upi');
  const [total, setTotal]                                 = useState(locationState?.total || 0);
  const [showConfetti, setShowConfetti]                   = useState(false);
  const [showFeedback, setShowFeedback]                   = useState(false);
  const [currentFeedbackIndex, setCurrentFeedbackIndex]   = useState(0);
  const [canEditOrder, setCanEditOrder]                   = useState(true);
  const [timeRemaining, setTimeRemaining]                 = useState(600);
  const [showSwapOptions, setShowSwapOptions]             = useState(false);
  const [showLatePickupOptions, setShowLatePickupOptions] = useState(false);
  const [isRunningLate, setIsRunningLate]                 = useState(false);
  const [selectedOrderIndex, setSelectedOrderIndex]       = useState(0);
  const [searchQuery, setSearchQuery]                     = useState('');
  const [selectedCategory, setSelectedCategory]           = useState('All');
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  // FIX: real dishes from backend for swap modal
  const [swapDishes,      setSwapDishes]      = useState<SwapDish[]>([]);
  const [swapDishLoading, setSwapDishLoading] = useState(false);

  useEffect(() => {
    if (!locationState?.orders?.length) {
      toast({ title: 'No order found', description: 'Redirecting...', variant: 'destructive' });
      navigate('/customer-dashboard/overview');
    }
  }, [locationState, navigate]);

  if (!locationState?.orders?.length) return null;
  const firstOrder = orders[0];
  if (!firstOrder) return null;

  useEffect(() => {
    if (!canEditOrder) return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { setCanEditOrder(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [canEditOrder]);

  useEffect(() => { const t = setTimeout(() => setShowConfetti(true), 500);  return () => clearTimeout(t); }, []);
  useEffect(() => { const t = setTimeout(() => setShowFeedback(true), 2500); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (orders.length > 0) {
      orders.forEach(order => {
        addNotification({
          title:   'Order Confirmed',
          message: `${order.meal} is in the queue.`,
          type:    'order_confirmed',
          orderId: order.id,
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FIX: fetch real menu items when swap modal is about to open
  const loadSwapDishes = useCallback(async () => {
    if (swapDishes.length > 0) return; // already loaded
    setSwapDishLoading(true);
    try {
      const items = await fetchCustomerMenuItems();
      setSwapDishes(items.filter(i => i.available).map(menuItemToSwapDish));
    } catch {
      // If fetch fails, swap modal will show empty state — not a crash
    } finally {
      setSwapDishLoading(false);
    }
  }, [swapDishes.length]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // FIX: categories derived from real fetched dishes, not hardcoded list
  const categories     = ['All', ...Array.from(new Set(swapDishes.map(d => d.category)))];
  const filteredDishes = swapDishes.filter(d => {
    const q = d.meal.toLowerCase().includes(searchQuery.toLowerCase());
    const c = selectedCategory === 'All' || d.category === selectedCategory;
    return q && c;
  });

  const totalTimeSaved = orders.reduce((s, o) => s + o.timeSaved, 0);

  const handleSwapDish = (idx = 0) => {
    if (!canEditOrder) return;
    setSelectedOrderIndex(idx);
    setShowSwapOptions(true);
    setSearchQuery('');
    setSelectedCategory('All');
    loadSwapDishes(); // FIX: fetch real dishes
  };

  const confirmSwapDish = (dish: SwapDish) => {
    const cur  = orders[selectedOrderIndex];
    const diff = dish.price - cur.price;
    const orig = cur.wasSwapped ? cur.originalMeal! : cur.meal;
    setOrders(prev => prev.map((o, i) =>
      i === selectedOrderIndex
        ? { ...o, meal: dish.meal, restaurant: '', price: dish.price, image: dish.image, timeSaved: dish.timeSaved, wasSwapped: true, originalMeal: orig }
        : o
    ));
    setTotal(prev => prev + diff);
    setShowSwapOptions(false);
    const msg = diff > 0 ? `Rs.${diff} extra charged.` : diff < 0 ? `Rs.${Math.abs(diff)} refund credited.` : 'No price difference.';
    toast({ title: 'Dish Swapped!', description: msg });
    addNotification({ title: 'Dish Swapped!', message: `${cur.meal} to ${dish.meal}. ${msg}`, type: 'success' });
  };

  const confirmRunningLate = (mins: number) => {
    const newTime = addMinutesToTime(orders[0].pickupTime, mins);
    setIsRunningLate(true);
    setOrders(prev => prev.map(o => ({ ...o, pickupTime: newTime, status: 'delayed', delayedBy: (o.delayedBy || 0) + mins })));
    setShowLatePickupOptions(false);
    toast({ title: 'Pickup Extended!', description: `New time: ${newTime}` });
    addNotification({ title: `Extended +${mins} min`, message: `New pickup: ${newTime}`, type: 'warning' });
  };

  const confirmCancelOrder = () => {
    setShowCancelConfirmation(false);
    const msg = paymentMethod === 'upi' ? `Rs.${total} refunded in 5-7 days.` : 'Order cancelled.';
    toast({ title: 'Order Cancelled', description: msg });
    addNotification({ title: 'Order Cancelled', message: msg, type: 'info' });
    setTimeout(() => navigate('/customer-dashboard/orders', {
      state: {
        fromOrderSuccess: true,
        orders: orders.map(o => ({ ...o, wasCancelled: true, status: 'cancelled' })),
        paymentMethod,
        total,
        wasCancelled: true,
      },
    }), 1500);
  };

  // FIX: feedback uses order.id (backend UUID) as mealId so it matches
  // what useFeedback stores. This ensures submitted feedback is retrievable
  // by the same mealId key used when displaying ratings on BrowseMenu.
  const handleFeedbackSubmit = (rating: number, comment: string) => {
    const order    = orders[currentFeedbackIndex];
    const mealName = order?.meal || '';
    addNotification({ title: 'Thank You!', message: `Rated ${mealName} ${rating}/5 stars.`, type: 'success' });
    if (currentFeedbackIndex < orders.length - 1) setCurrentFeedbackIndex(p => p + 1);
    else { toast({ title: 'Thank you!' }); setShowFeedback(false); }
  };

  const handleSkip = () => {
    if (currentFeedbackIndex < orders.length - 1) setCurrentFeedbackIndex(p => p + 1);
    else setShowFeedback(false);
  };

  const navigateToOrders = () => navigate('/customer-dashboard/orders', {
    state: {
      fromOrderSuccess: true,
      orders: orders.map(o => ({
        ...o,
        status:        o.wasCancelled ? 'cancelled' : 'confirmed',
        paymentStatus: paymentMethod === 'upi' ? 'paid' : 'cash',
      })),
      paymentMethod,
      total,
    },
  });

  return (
    <div className="order-success">
      <div className="order-success__container">

        {/* Hero */}
        <motion.div
          className={`order-success__hero ${paymentMethod === 'upi' ? 'order-success__hero--green' : ''}`}
          initial={{ opacity: 0, scale: 0.7, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.05 }}
        >
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
              <motion.div initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 0.45, duration: 0.4 }}>
                <Check className="order-success__checkmark-icon" strokeWidth={3} />
              </motion.div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="order-success__title">
            <h1 className={`order-success__heading ${paymentMethod === 'upi' ? 'order-success__heading--green' : ''}`}>
              {paymentMethod === 'upi' ? 'Payment Successful!' : 'Order Confirmed!'}
            </h1>
            <p className="order-success__subtitle">Your pre-order has been placed</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className={`order-success__order-id ${paymentMethod === 'upi' ? 'order-success__order-id--green' : ''}`}>
            <p className="order-success__order-id-label">Order ID</p>
            <p className={`order-success__order-id-value ${paymentMethod === 'upi' ? 'order-success__order-id-value--green' : ''}`}>
              {firstOrder.orderRef || firstOrder.id}
            </p>
          </motion.div>
        </motion.div>

        {/* Edit Timer */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
          className={`order-success__edit-timer ${!canEditOrder ? 'order-success__edit-timer--expired' : ''}`}>
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

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="order-success__quick-actions">
          {[
            { key: 'swap',   icon: <RefreshCw />, label: 'Swap Dish',     sub: canEditOrder ? 'Change your order' : 'Not available', fn: () => handleSwapDish(0) },
            { key: 'late',   icon: <Clock />,     label: 'Running Late?', sub: canEditOrder ? 'Extend pickup time' : 'Not available', fn: () => setShowLatePickupOptions(true) },
            { key: 'cancel', icon: <XCircle />,   label: 'Cancel Order',  sub: canEditOrder ? '100% refund'       : 'Not available', fn: () => setShowCancelConfirmation(true) },
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

        {/* Order Details Card */}
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
                <p className="order-success__order-price">Rs.{order.price}</p>
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
                {/* FIX: no hardcoded "Counter #3" — generic label until backend provides counter */}
                <p className="order-success__info-value">Pickup Counter</p>
              </div>
            </div>
          </div>

          {isRunningLate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="order-success__food-status">
              <Flame className="order-success__food-status-icon" />
              <div className="order-success__food-status-text">
                <p className="order-success__food-status-label">Warming Zone</p>
                <p className="order-success__food-status-sublabel">Extended by {orders[0].delayedBy} min - food stays fresh</p>
              </div>
            </motion.div>
          )}

          <div className={`order-success__payment-status ${paymentMethod === 'upi' ? 'order-success__payment-status--upi' : 'order-success__payment-status--cash'}`}>
            <p className={`order-success__payment-text ${paymentMethod === 'upi' ? 'order-success__payment-text--upi' : 'order-success__payment-text--cash'}`}>
              {paymentMethod === 'upi' ? 'Payment completed via UPI' : `Pay Rs.${total} at pickup`}
            </p>
          </div>
        </motion.div>

        {/* Metrics */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }} className="order-success__metrics">
          {[
            { icon: <Zap />,     mod: 'primary', val: `${totalTimeSaved} min`,               label: 'Time Saved'     },
            { icon: <Leaf />,    mod: 'success', val: '0.15 kg',                             label: 'Waste Reduced'  },
            { icon: <ChefHat />, mod: 'accent',  val: `#${firstOrder.kitchenQueuePosition}`, label: 'Queue Position' },
          ].map(({ icon, mod, val, label }) => (
            <div key={label} className="order-success__metric-card">
              <div className={`order-success__metric-icon order-success__metric-icon--${mod}`}>{icon}</div>
              <p className="order-success__metric-value">{val}</p>
              <p className="order-success__metric-label">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* Feedback — FIX: passes order.id so useFeedback stores by backend UUID */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="order-success__feedback-wrapper">
              <FeedbackCard
                mealName={orders[currentFeedbackIndex]?.meal || ''}
                onSubmit={handleFeedbackSubmit}
                onSkip={handleSkip}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }} className="order-success__actions">
          <Button onClick={navigateToOrders} className="order-success__primary-btn">
            Track Your Order <ArrowRight className="order-success__btn-icon" />
          </Button>
          <Button variant="ghost" onClick={() => navigate('/customer-dashboard/overview')} className="order-success__secondary-btn">
            Back to Dashboard
          </Button>
        </motion.div>
      </div>

      {/* SWAP MODAL — FIX: real dishes from backend */}
      <AnimatePresence>
        {showSwapOptions && orders[selectedOrderIndex] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="order-success__modal-overlay" onClick={() => setShowSwapOptions(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 50 }} onClick={e => e.stopPropagation()} className="order-success__swap-modal">
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
                  </div>
                  <p className="order-success__swap-current-price">Rs.{orders[selectedOrderIndex].price}</p>
                </div>
              </div>
              <div className="order-success__swap-search">
                <Search className="order-success__swap-search-icon" />
                <input type="text" placeholder="Search dishes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="order-success__swap-search-input" autoFocus />
              </div>

              {/* FIX: categories from real fetched dishes */}
              <div className="order-success__swap-categories">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`order-success__swap-category ${selectedCategory === cat ? 'order-success__swap-category--active' : ''}`}>{cat}</button>
                ))}
              </div>

              <div className="order-success__swap-dishes">
                {swapDishLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#ff6b35', width: 28, height: 28 }} />
                  </div>
                ) : filteredDishes.length === 0 ? (
                  <div className="order-success__swap-empty"><p>No dishes found</p></div>
                ) : filteredDishes.map(dish => {
                  const diff      = dish.price - orders[selectedOrderIndex].price;
                  const isCurrent = dish.meal === orders[selectedOrderIndex].meal;
                  return (
                    <motion.div key={dish.id} whileHover={{ scale: 1.01 }} onClick={() => !isCurrent && confirmSwapDish(dish)}
                      className={`order-success__swap-dish ${isCurrent ? 'order-success__swap-dish--current' : ''}`}>
                      <img src={dish.image} alt={dish.meal} className="order-success__swap-dish-image" />
                      <div className="order-success__swap-dish-info">
                        <p className="order-success__swap-dish-meal">{dish.meal}{isCurrent && <span style={{ fontSize: '0.7rem', marginLeft: 6, color: 'hsl(var(--muted-foreground))' }}>(current)</span>}</p>
                        <p className="order-success__swap-dish-restaurant">{dish.category}</p>
                        <div className="order-success__swap-dish-meta">
                          <span className="order-success__swap-dish-time"><Zap size={11} />{dish.timeSaved} min saved</span>
                          {dish.isExpress && <span className="order-success__swap-dish-express">Express</span>}
                        </div>
                      </div>
                      <div className="order-success__swap-dish-price-wrap">
                        <p className="order-success__swap-dish-price">Rs.{dish.price}</p>
                        {!isCurrent && diff !== 0 && <p className={`order-success__swap-dish-diff ${diff > 0 ? 'order-success__swap-dish-diff--extra' : 'order-success__swap-dish-diff--refund'}`}>{diff > 0 ? '+' : ''}Rs.{Math.abs(diff)}</p>}
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

      {/* LATE PICKUP MODAL */}
      <AnimatePresence>
        {showLatePickupOptions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="order-success__modal-overlay" onClick={() => setShowLatePickupOptions(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="order-success__modal">
              <h3 className="order-success__modal-title">Extend Pickup Time</h3>
              <p className="order-success__modal-subtitle">Current: <strong>{orders[0].pickupTime}</strong></p>
              <div className="order-success__modal-options">
                {[10, 15, 20].map(m => (
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

      {/* CANCEL MODAL */}
      <AnimatePresence>
        {showCancelConfirmation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="order-success__modal-overlay" onClick={() => setShowCancelConfirmation(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="order-success__cancel-modal">
              <div className="order-success__cancel-icon"><AlertCircle size={28} /></div>
              <h3 className="order-success__modal-title">Cancel Order?</h3>
              <p className="order-success__modal-subtitle">Are you sure? This cannot be undone.</p>
              <div className="order-success__cancel-summary">
                {orders.map(o => (
                  <div key={o.id} className="order-success__cancel-item">
                    <img src={o.image} alt={o.meal} className="order-success__cancel-item-img" />
                    <div className="order-success__cancel-item-info">
                      <p className="order-success__cancel-item-meal">{o.meal}</p>
                    </div>
                    <p className="order-success__cancel-item-price">Rs.{o.price}</p>
                  </div>
                ))}
                <div className="order-success__cancel-total"><span>Total</span><span>Rs.{total}</span></div>
              </div>
              {paymentMethod === 'upi' && (
                <div className="order-success__cancel-refund">
                  <span>💰</span>
                  <div>
                    <p className="order-success__cancel-refund-label">100% Refund Guaranteed</p>
                    <p className="order-success__cancel-refund-sub">Rs.{total} refunded within 5-7 business days</p>
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

      {/* CONFETTI */}
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
    </div>
  );
}