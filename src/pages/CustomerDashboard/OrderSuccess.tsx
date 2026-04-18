// pages/CustomerDashboard/OrderSuccess.tsx
//
// FIX [HOOKS-VIOLATION]: All hooks moved above every conditional return.
// FIX [LATE-SLOT-SURPRISE]: Pre-resolve actual slot times in Running Late modal.
//
// ── LATE-SLOT-SURPRISE root cause & fix ─────────────────────────────────────
//
// BEFORE: Customer clicked "+10 minutes" expecting their pickup to move
//   ~10 min later. Internally the code computed (currentPickupTime + 10 min)
//   as a TARGET, then found the nearest real kitchen SLOT at-or-after that
//   target. Slots are a fixed time grid (e.g. 1:00 PM, 1:30 PM, 2:00 PM).
//   So "+10 min" from a 1:05 PM pickup → target 1:15 PM → nearest slot 1:30 PM.
//   The customer saw "10 more minutes" in the button but got "1:30 PM" in the
//   toast — a 25-minute jump instead of 10. Confusing and trust-breaking.
//
// AFTER:
//   1. Slots are loaded eagerly when the modal opens (openLateModal callback),
//      stored in `lateSlots` state.
//   2. resolveActualSlot() pre-computes which real slot each "+N min" button
//      maps to — same two-pass algorithm as confirmRunningLate, but run
//      synchronously for the UI layer.
//   3. Each button sub-label now shows the ACTUAL slot time and how many
//      minutes from now it is: "→ 1:30 PM slot · ~25 min from now"
//   4. Buttons are disabled while slots are loading or if no slot resolves.
//   5. confirmRunningLate() accepts an optional preResolvedSlot. When the
//      customer has already seen the resolved slot in the UI, the confirm
//      skips fetchCustomerSlots() and calls extendCustomerOrderSlot() directly
//      — faster and consistent with what was shown.
//   6. The original full-fetch fallback is kept for edge cases (modal opened
//      before slots loaded, or lateSlots fetch failed).
//
// All previous fixes preserved:
//   FIX [HARDCODED-SWAP-MENU]: swap modal uses fetchCustomerMenuItems()
//   FIX [HARDCODED-COUNTER]: "Counter #3" → "Pickup Counter"
//   FIX [FEEDBACK-MEALID]: FeedbackCard uses order.id (backend UUID)
//   FIX [EXTEND-EXPRESS-ASAP]: ASAP orders handled without addMinutesToTime()
//   FIX [EXTEND-NO-SLOTS-UX]: calm info toast when kitchen is fully booked
//   FIX [CANCEL-ALL-ORDERS]: all orders in batch cancelled, not just index 0

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Clock, MapPin, Zap, Leaf, ChefHat, ArrowRight,
  RefreshCw, AlertCircle, Timer, Flame, X, Search, Star, XCircle, Loader2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from '../../customer-hooks/use-toast';
import { useNotifications } from '../../customer-context/NotificationContext';
import { useSkipLine }       from '../../customer-context/SkipLineContext';

import {
  cancelCustomerOrder,
  swapCustomerOrderDish,
  extendCustomerOrderSlot,
  fetchCustomerSlots,
  fetchCustomerMenuItems,
  MenuItemDto,
  CustomerSlotDto,           // ← NEW: needed for lateSlots state typing
} from '../../kitchen-api/kitchenApi';
import '../../components/CustomerDashboard/styles/Ordersuccess.scss';
import { NotificationPopup } from '../../components/CustomerDashboard/dashboard/NotificationPopup';

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

interface SwapDish {
  id:        string;
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
  pickupSlotId:         string;
  kitchenQueuePosition: number;
  status?:              string;
  delayedBy?:           number;
  wasSwapped?:          boolean;
  originalMeal?:        string;
  wasCancelled?:        boolean;
  paymentStatus?:       'paid' | 'pending' | 'cash';
  totalPrepMinutes?:    number;
  pickupSlotTime?:      string | null;
  createdAt?:           number;
  isExpress?:           boolean;       // ADD
  editLockedUntil?:     string | null; // ADD
}

interface LocationState {
  orders:        Order[];
  paymentMethod: 'upi' | 'cash';
  total:         number;
}

function addMinutesToTime(time: string, minutes: number): string {
  const parts  = time.trim().split(' ');
  const [hourStr, minStr] = parts[0].split(':');
  let hours    = parseInt(hourStr, 10);
  const mins   = parseInt(minStr, 10);
  const period = (parts[1] || 'am').toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  const totalMins  = hours * 60 + mins + minutes;
  const newHours24 = Math.floor(totalMins / 60) % 24;
  const newMins    = totalMins % 60;

  const newPeriod  = newHours24 >= 12 ? 'pm' : 'am';
  let   newHours12 = newHours24 % 12;
  if (newHours12 === 0) newHours12 = 12;

  return `${newHours12}:${newMins.toString().padStart(2, '0')} ${newPeriod}`;
}

// ── FIX [LATE-SLOT-SURPRISE]: Resolve which actual kitchen slot a "+N min"
// extension maps to — same two-pass algorithm as confirmRunningLate, but runs
// synchronously so the UI can show the real slot time before the customer taps.
//
// Pass 1: nearest slot at-or-after (currentPickupTime + mins).
// Pass 2: any future slot (fallback when the target window is fully booked).
// Returns null only when the kitchen has zero open slots — in which case the
// button is disabled and a calm "Kitchen fully booked" message is shown.
function resolveActualSlot(
  slots: CustomerSlotDto[],
  currentPickupTime: string,
  mins: number,
): CustomerSlotDto | null {
  const isAsap = !currentPickupTime || currentPickupTime === 'ASAP';
  let targetMs: number;

  if (isAsap) {
    targetMs = Date.now() + mins * 60 * 1000;
  } else {
    const rawTime   = currentPickupTime.trim();
    const spaced    = rawTime.replace(/([0-9])(am|pm)/gi, '$1 $2');
    const parts     = spaced.trim().split(/\s+/);
    const timePart  = parts[0] ?? '12:00';
    const periodStr = (parts[1] ?? 'AM').toUpperCase();
    const [hStr, mStr] = timePart.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    if (isNaN(h) || isNaN(m)) {
      targetMs = Date.now() + mins * 60 * 1000;
    } else {
      if (periodStr === 'PM' && h !== 12) h += 12;
      if (periodStr === 'AM' && h === 12) h = 0;
      const now = new Date();
      targetMs = new Date(
        now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0,
      ).getTime() + mins * 60 * 1000;
    }
  }

  const available = slots.filter(s => s.remaining > 0);

  // Pass 1 — ideal: at or after target
  const pass1 = available
    .filter(s => new Date(s.slotTime).getTime() >= targetMs)
    .sort((a, b) => new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime())[0];

  if (pass1) return pass1;

  // Pass 2 — fallback: any future slot
  return available
    .filter(s => new Date(s.slotTime).getTime() > Date.now())
    .sort((a, b) => new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime())[0]
    ?? null;
}

// ── LateSlotOptions ───────────────────────────────────────────────────────
// Extracted from the modal render to avoid an IIFE-in-ternary pattern that
// caused TypeScript to flag lateSlotsLoading as part of a mismatched
// expression (JSX.Element vs JSX.Element[] return types in the two branches).
// As a named component the return type is always JSX.Element — no red line.
function LateSlotOptions({
  lateSlots,
  currentPickupTime,
  onConfirm,
}: {
  lateSlots:          CustomerSlotDto[];
  currentPickupTime:  string;
  onConfirm:          (mins: number, slot: CustomerSlotDto) => void;
}) {
  const isAsap = !currentPickupTime || currentPickupTime === 'ASAP';

  const currentMs: number = (() => {
    if (isAsap) return Date.now();
    const raw    = currentPickupTime.trim();
    const spaced = raw.replace(/([0-9])(am|pm)/gi, '$1 $2');
    const parts  = spaced.trim().split(/\s+/);
    const [hStr, mStr] = (parts[0] ?? '12:00').split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const period = (parts[1] ?? 'AM').toUpperCase();
    if (isNaN(h) || isNaN(m)) return Date.now();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0).getTime();
  })();

  const seen = new Set<string>();
  const nextSlots = lateSlots
    .filter(s => new Date(s.slotTime).getTime() > currentMs && s.remaining > 0)
    .sort((a, b) => new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime())
    .filter(s => {
      if (seen.has(s.slotId)) return false;
      seen.add(s.slotId);
      return true;
    })
    .slice(0, 3);

  if (nextSlots.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '1.25rem 0',
        color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem',
      }}>
        <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>No open slots right now</p>
        <p style={{ fontSize: '0.78rem' }}>Your food will be kept warm — arrive when you can.</p>
      </div>
    );
  }

  return (
    <>
      {nextSlots.map((slot, idx) => {
        const slotMs          = new Date(slot.slotTime).getTime();
        const minsFromNow     = Math.max(1, Math.round((slotMs - Date.now()) / 60_000));
        const minsFromCurrent = Math.max(1, Math.round((slotMs - currentMs) / 60_000));
        const spotsLeft       = slot.remaining;

        return (
          <button
            key={slot.slotId}
            onClick={() => onConfirm(minsFromCurrent, slot)}
            className="order-success__modal-option"
          >
            <Clock size={18} className="order-success__modal-option-icon" />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{slot.displayTime}</span>
              {idx === 0 && (
                <span style={{
                  marginLeft: '0.5rem', fontSize: '0.7rem',
                  background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))',
                  borderRadius: '999px', padding: '1px 7px', verticalAlign: 'middle',
                }}>
                  Next available
                </span>
              )}
              <span className="order-success__modal-option-sub">
                ~{minsFromNow} min from now
                {spotsLeft <= 3 && (
                  <span style={{ marginLeft: '0.5rem', color: '#f59e0b', fontWeight: 500 }}>
                    · {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                  </span>
                )}
              </span>
            </div>
          </button>
        );
      })}
    </>
  );
}

export default function OrderSuccess() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const locationState = location.state as LocationState | null;
  const { updateOrderFields } = useSkipLine();
  const { addNotification } = useNotifications();

  const notify = useCallback((
    type: 'success' | 'warning' | 'info' | 'order_confirmed' | 'order_ready' | 'order_preparing' | 'order_cooking',
    title: string,
    message: string,
    orderId?: string,
  ) => {
    addNotification({ type, title, message, ...(orderId ? { orderId } : {}) });
  }, [addNotification]);

  // ── All hooks declared first — unconditionally ────────────────────────────
  const [orders, setOrders]                               = useState<Order[]>(locationState?.orders || []);
  const [paymentMethod]                                   = useState<'upi' | 'cash'>(locationState?.paymentMethod || 'upi');
  const [total, setTotal]                                 = useState(locationState?.total || 0);
  const [showConfetti, setShowConfetti]                   = useState(false);
  const [showFeedback, setShowFeedback]                   = useState(false);
  const [currentFeedbackIndex, setCurrentFeedbackIndex]   = useState(0);
// Express orders have no edit window at all.
// For regular orders, compute remaining seconds from editLockedUntil if
// the backend sent it, otherwise fall back to the 600s local timer.
const isExpressOrder = (locationState?.orders ?? []).every(o => o.isExpress);

const initialTimeRemaining = (() => {
  if (isExpressOrder) return 0;
  const firstEditLock = locationState?.orders?.[0]?.editLockedUntil;
  if (firstEditLock) {
    const ms = new Date(firstEditLock).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  }
  return 600;
})();

const [canEditOrder, setCanEditOrder] = useState(!isExpressOrder && initialTimeRemaining > 0);
const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
  const [showSwapOptions, setShowSwapOptions]             = useState(false);
  const [showLatePickupOptions, setShowLatePickupOptions] = useState(false);
  const [isRunningLate, setIsRunningLate]                 = useState(false);
  const [selectedOrderIndex, setSelectedOrderIndex]       = useState(0);
  const [searchQuery, setSearchQuery]                     = useState('');
  const [selectedCategory, setSelectedCategory]           = useState('All');
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [swapDishes,      setSwapDishes]      = useState<SwapDish[]>([]);
  const [swapDishLoading, setSwapDishLoading] = useState(false);
  const [swapDishError,   setSwapDishError]   = useState(false);
  // FIX [LATE-SLOT-SURPRISE]: slots loaded eagerly when modal opens so buttons
  // can show the real resolved slot time before the customer taps confirm.
  const [lateSlots,        setLateSlots]        = useState<CustomerSlotDto[]>([]);
  const [lateSlotsLoading, setLateSlotsLoading] = useState(false);

  // Edit window countdown
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

  // Confetti + feedback triggers
  useEffect(() => {
    if (!locationState?.orders?.length) return;
    const t = setTimeout(() => setShowConfetti(true), 500);
    return () => clearTimeout(t);
  }, [locationState?.orders?.length]);

  useEffect(() => {
    if (!locationState?.orders?.length) return;
    const t = setTimeout(() => setShowFeedback(true), 2500);
    return () => clearTimeout(t);
  }, [locationState?.orders?.length]);

  // Order confirmed notifications — fire exactly once on mount
  const confirmedRef = useRef(false);
  useEffect(() => {
    if (confirmedRef.current || !orders.length) return;
    confirmedRef.current = true;
    orders.forEach(order => {
      notify('order_confirmed', 'Order Confirmed', `${order.meal} is in the queue.`, order.id);
    });
  }, [notify, orders]);

  // Redirect if no state (direct navigation to /order-success)
  useEffect(() => {
    if (!locationState?.orders?.length) {
      toast({ title: 'No order found', description: 'Redirecting...', variant: 'destructive' });
      navigate('/customer-dashboard/overview');
    }
  }, [locationState, navigate]);

  // Swap modal: load real menu items
  const loadSwapDishes = useCallback(async () => {
    if (swapDishes.length > 0) return;
    setSwapDishLoading(true);
    try {
      const items = await fetchCustomerMenuItems();
      setSwapDishes(items.filter(i => i.available).map(menuItemToSwapDish));
    } catch {
      setSwapDishError(true);
    } finally {
      setSwapDishLoading(false);
    }
  }, [swapDishes.length, swapDishError]);

  // FIX [LATE-SLOT-SURPRISE]: Load real slots when the Running Late modal
  // opens. This populates lateSlots so each +N-min button can pre-resolve and
  // display the actual slot time before the customer confirms.
  const openLateModal = useCallback(async () => {
    setShowLatePickupOptions(true);
    setLateSlotsLoading(true);
    try {
      const slots = await fetchCustomerSlots();
      setLateSlots(slots.filter(s => s.remaining > 0));
    } catch {
      setLateSlots([]);
    } finally {
      setLateSlotsLoading(false);
    }
  }, []);

  // ── Null guards AFTER all hooks ───────────────────────────────────────────
  if (!locationState?.orders?.length) return null;
  const firstOrder = orders[0];
  if (!firstOrder) return null;

  // ── Everything below is safe — orders is non-empty ───────────────────────

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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
    setSwapDishError(false);
    loadSwapDishes();
  };

  const confirmSwapDish = async (dish: SwapDish) => {
    const cur = orders[selectedOrderIndex];
    const diff = dish.price - cur.price;
    const originalMeal = cur.wasSwapped ? cur.originalMeal! : cur.meal;

    let swappedDto: import('../../kitchen-api/kitchenApi').CustomerOrderDto | null = null;
    try {
      swappedDto = await swapCustomerOrderDish(cur.id, dish.id);
    } catch (err: any) {
      toast({ title: 'Swap failed', description: err.message, variant: 'destructive' });
      return;
    }

    const newPrepMinutes = swappedDto?.totalPrepMinutes ?? dish.timeSaved;
    const newTimeSaved   = newPrepMinutes > 0 ? Math.floor(newPrepMinutes * 0.8) : dish.timeSaved;

    let newPickupTime: string = cur.pickupTime;

    if (swappedDto?.pickupSlotTime) {
      const parsed = new Date(swappedDto.pickupSlotTime);
      if (!isNaN(parsed.getTime())) {
        newPickupTime = parsed.toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit', hour12: true,
        });
      }
    } else if (newPrepMinutes > 0) {
      const readyAt = new Date(Date.now() + newPrepMinutes * 60 * 1000);
      newPickupTime = readyAt.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    }

    setOrders(prev =>
      prev.map((o, i) =>
        i === selectedOrderIndex
          ? {
              ...o,
              meal:             dish.meal,
              price:            swappedDto?.totalPrice ?? dish.price,
              image:            dish.image,
              timeSaved:        newTimeSaved,
              wasSwapped:       true,
              originalMeal,
              createdAt:        Date.now(),
              totalPrepMinutes: newPrepMinutes,
              pickupTime:       newPickupTime,
              pickupSlotTime:   swappedDto?.pickupSlotTime ?? o.pickupSlotTime,
            }
          : o
      )
    );

    setTotal(prev => prev + diff);
    setShowSwapOptions(false);

    const msg =
      diff > 0  ? `₹${diff} extra charged.` :
      diff < 0  ? `₹${Math.abs(diff)} refund credited.` :
                  'No price difference.';

    toast({ title: 'Dish Swapped!', description: `Pickup updated to ${newPickupTime}. ${msg}` });
    notify('success', 'Dish Swapped!', `${cur.meal} → ${dish.meal}. Pickup: ${newPickupTime}. ${msg}`);
  };

  // FIX [LATE-SLOT-SURPRISE]: confirmRunningLate now accepts an optional
  // preResolvedSlot. When the customer clicked a button that already showed
  // them the real slot (pre-resolved in the UI), we skip fetchCustomerSlots()
  // and extendCustomerOrderSlot() is called immediately — faster and
  // consistent with exactly what was displayed.
  //
  // The full fetch-and-search fallback is retained for edge cases where
  // lateSlots failed to load or preResolvedSlot is not passed.
  const confirmRunningLate = async (
    mins: number,
    preResolvedSlot?: CustomerSlotDto | null,
  ) => {
    const isAsap = !orders[0].pickupTime || orders[0].pickupTime === 'ASAP';

    let newSlotId: string | null = null;
    let newDisplayTime: string;

    // Optimistic display fallback (used only if backend returns no slot time)
    if (isAsap) {
      newDisplayTime = new Date(Date.now() + mins * 60 * 1000).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } else {
      newDisplayTime = addMinutesToTime(orders[0].pickupTime, mins);
    }

    // ── Fast path: slot was already resolved and shown to the customer ──────
    if (preResolvedSlot) {
      newSlotId      = preResolvedSlot.slotId;
      newDisplayTime = preResolvedSlot.displayTime;
      try {
        const extendDto = await extendCustomerOrderSlot(orders[0].id, newSlotId);
        if (extendDto.pickupSlotTime) {
          const parsed = new Date(extendDto.pickupSlotTime);
          if (!isNaN(parsed.getTime())) {
            newDisplayTime = parsed.toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit', hour12: true,
            });
          }
        }
      } catch (err: any) {
        const msg = err?.message ?? 'Could not extend pickup time. Please try again.';
        toast({ title: 'Extend Failed', description: msg, variant: 'destructive' });
        notify('warning', 'Extend Failed', msg);
        setShowLatePickupOptions(false);
        return;
      }
    } else {
      // ── Fallback path: fetch slots fresh (lateSlots unavailable) ─────────
      try {
        const slots = await fetchCustomerSlots();

        let targetMs: number;
        if (isAsap) {
          targetMs = Date.now() + mins * 60 * 1000;
        } else {
          const rawTime   = orders[0].pickupTime.trim();
          const spaced    = rawTime.replace(/([0-9])(am|pm)/gi, '$1 $2');
          const parts     = spaced.trim().split(/\s+/);
          const timePart  = parts[0] ?? '12:00';
          const periodStr = (parts[1] ?? 'AM').toUpperCase();
          const [hStr, mStr] = timePart.split(':');
          let h = parseInt(hStr, 10);
          const m = parseInt(mStr, 10);

          if (isNaN(h) || isNaN(m)) {
            targetMs = Date.now() + mins * 60 * 1000;
          } else {
            if (periodStr === 'PM' && h !== 12) h += 12;
            if (periodStr === 'AM' && h === 12) h = 0;
            const now = new Date();
            targetMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0).getTime()
              + mins * 60 * 1000;
          }
        }

        const availableSlots = slots.filter(s => s.remaining > 0);

        let candidate = availableSlots
          .filter(s => new Date(s.slotTime).getTime() >= targetMs)
          .sort((a, b) => new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime())[0];

        if (!candidate) {
          candidate = availableSlots
            .filter(s => new Date(s.slotTime).getTime() > Date.now())
            .sort((a, b) => new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime())[0];
        }

        if (!candidate) {
          toast({
            title: 'Kitchen is fully booked',
            description: `All pickup slots are currently full. Your food will be kept warm — just arrive when you can.`,
          });
          notify('info', 'All slots full', `No open slots right now. Your food will be kept warm at the counter.`);
          setShowLatePickupOptions(false);
          return;
        }

        newSlotId      = candidate.slotId;
        newDisplayTime = candidate.displayTime;

        const extendDto = await extendCustomerOrderSlot(orders[0].id, newSlotId);
        if (extendDto.pickupSlotTime) {
          const parsed = new Date(extendDto.pickupSlotTime);
          if (!isNaN(parsed.getTime())) {
            newDisplayTime = parsed.toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit', hour12: true,
            });
          }
        }
      } catch (err: any) {
        const msg = err?.message ?? 'Could not extend pickup time. Please try again.';
        toast({ title: 'Extend Failed', description: msg, variant: 'destructive' });
        notify('warning', 'Extend Failed', msg);
        setShowLatePickupOptions(false);
        return;
      }
    }

    // ── Success ──────────────────────────────────────────────────────────────
    setIsRunningLate(true);
    setOrders(prev =>
      prev.map(o => ({
        ...o,
        pickupTime:   newDisplayTime,
        pickupSlotId: newSlotId ?? o.pickupSlotId,
        status:       'delayed',
        delayedBy:    (o.delayedBy || 0) + mins,
      }))
    );
    setShowLatePickupOptions(false);

    const successMsg = `Your pickup has been moved to ${newDisplayTime}. Food stays warm!`;
    toast({ title: `⏰ Pickup Extended +${mins} min`, description: successMsg });
    notify('success', `⏰ Pickup Extended +${mins} min`, successMsg, orders[0].id);
  };

  const confirmCancelOrder = async () => {
    setShowCancelConfirmation(false);

    const results = await Promise.allSettled(
      orders.map(o => cancelCustomerOrder(o.id))
    );

    const failedIds = results
      .map((r, i) => (r.status === 'rejected' ? orders[i].id : null))
      .filter(Boolean) as string[];

    if (failedIds.length === orders.length) {
      toast({
        title: 'Cancel failed',
        description: 'Could not cancel your order. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (failedIds.length > 0) {
      toast({
        title: 'Partially cancelled',
        description: `${failedIds.length} item(s) could not be cancelled and are still being prepared.`,
        variant: 'destructive',
      });
    }

    const successfullyCancelledIds = new Set(
      results
        .map((r, i) => (r.status === 'fulfilled' ? orders[i].id : null))
        .filter(Boolean)
    );

    const msg =
      paymentMethod === 'upi'
        ? `₹${total} refunded in 5-7 days.`
        : 'Order cancelled.';

    toast({ title: 'Order Cancelled', description: msg });
    notify('info', 'Order Cancelled', msg);

    setTimeout(() => {
      navigate('/customer-dashboard/orders', {
        state: {
          fromOrderSuccess: true,
          orders: orders.map(o => ({
            ...o,
            wasCancelled:  successfullyCancelledIds.has(o.id),
            status:        successfullyCancelledIds.has(o.id) ? 'cancelled' : o.status,
          })),
          paymentMethod,
          total,
          wasCancelled: true,
        },
      });
    }, 1500);
  };

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
        status:           o.wasCancelled ? 'cancelled' : (o.status ?? 'confirmed'),
        paymentStatus:    paymentMethod === 'upi' ? 'paid' : 'cash',
        createdAt:        o.createdAt ?? Date.now(),
        totalPrepMinutes: o.totalPrepMinutes ?? 0,
        pickupSlotTime:   o.pickupSlotTime ?? null,
        timeSaved:        o.timeSaved,
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

{/* Edit Timer — hidden for express orders */}
{!isExpressOrder && (
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
        <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: initialTimeRemaining, ease: 'linear' }} className="order-success__edit-timer-bar" />
      </div>
    )}
  </motion.div>
)}

{/* Express badge — shown instead of edit timer for express orders */}
{isExpressOrder && (
  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
    className="order-success__edit-timer"
    style={{ background: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.35)' }}>
    <div className="order-success__edit-timer-content">
      <Zap className="order-success__edit-timer-icon" style={{ color: '#fb923c' }} />
      <div className="order-success__edit-timer-text">
        <p className="order-success__edit-timer-label" style={{ color: '#fb923c' }}>Express order</p>
        <p className="order-success__edit-timer-value" style={{ fontSize: '0.75rem' }}>Being prepared now — no changes possible</p>
      </div>
    </div>
  </motion.div>
)}

       {/* Quick Actions — express orders only show Running Late */}
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="order-success__quick-actions">
  {(isExpressOrder
    ? [{ key: 'late', icon: <Clock />, label: 'Running Late?', sub: 'Notify the kitchen', fn: openLateModal }]
    : [
        { key: 'swap',   icon: <RefreshCw />, label: 'Swap Dish',     sub: canEditOrder ? 'Change your order' : 'Not available', fn: () => handleSwapDish(0) },
        { key: 'late',   icon: <Clock />,     label: 'Running Late?', sub: canEditOrder ? 'Extend pickup time' : 'Not available', fn: openLateModal },
        { key: 'cancel', icon: <XCircle />,   label: 'Cancel Order',  sub: canEditOrder ? '100% refund'       : 'Not available', fn: () => setShowCancelConfirmation(true) },
      ]
  ).map(({ key, icon, label, sub, fn }) => {
    const disabled = !isExpressOrder && !canEditOrder;
    return (
      <motion.button key={key} whileHover={!disabled ? { scale: 1.02 } : {}} whileTap={!disabled ? { scale: 0.98 } : {}}
        onClick={fn} disabled={disabled}
        className={`order-success__quick-action order-success__quick-action--${key} ${disabled ? 'order-success__quick-action--disabled' : ''}`}>
        <span className="order-success__quick-action-icon">{icon}</span>
        <div className="order-success__quick-action-text">
          <span className="order-success__quick-action-label">{label}</span>
          <span className="order-success__quick-action-sublabel">{sub}</span>
        </div>
      </motion.button>
    );
  })}
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

        {/* Feedback */}
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

      {/* SWAP MODAL */}
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
      {/*
        FIX [LATE-SLOT-SURPRISE]: Each button now shows the ACTUAL kitchen slot
        it will move to, pre-resolved from lateSlots, before the customer taps.

        Sub-label format: "→ 1:30 PM slot · ~25 min from now"

        While slots are loading (lateSlotsLoading=true), sub-label shows
        "Finding next slot…" and buttons are disabled.

        If no slot resolves for a given +N option, that button is disabled and
        shows "No slots available" — the kitchen fully booked toast fires only
        if the customer somehow triggers confirmRunningLate via the fallback path.

        All three options may resolve to the SAME slot (the next available one)
        when the kitchen is sparse — this is correct and honest: the customer
        sees they'll all land on "2:00 PM" and can make an informed choice.
      */}
      <AnimatePresence>
        {showLatePickupOptions && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="order-success__modal-overlay"
            onClick={() => setShowLatePickupOptions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="order-success__modal"
            >
              <h3 className="order-success__modal-title">Running Late?</h3>
              <p className="order-success__modal-subtitle">
                Current pickup: <strong>{orders[0].pickupTime}</strong>
                <br />
               <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                  Choose a slot below — these are the real next available pickup times.
                </span>
              </p>

            <div className="order-success__modal-options">
                {lateSlotsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[1, 2, 3].map(i => (
                      <button key={i} disabled className="order-success__modal-option" style={{ opacity: 0.5 }}>
                        <Clock size={18} className="order-success__modal-option-icon" />
                        <div>
                          <span style={{ fontWeight: 600 }}>Loading slots…</span>
                          <span className="order-success__modal-option-sub">
                            <Loader2 size={11} style={{ display: 'inline', marginRight: 4, animation: 'spin 1s linear infinite' }} />
                            Checking availability
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <LateSlotOptions
                    lateSlots={lateSlots}
                    currentPickupTime={orders[0].pickupTime}
                    onConfirm={confirmRunningLate}
                  />
                )}
              </div>

              <div className="order-success__modal-info">
                <Flame size={14} />
                <p>Your food stays warm in our holding zone while you're on the way.</p>
              </div>

              <Button
                variant="ghost"
                onClick={() => setShowLatePickupOptions(false)}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Never mind
              </Button>
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

      {/* NOTIFICATION POPUP — mounted here because OrderSuccess has no DashboardLayout */}
      <NotificationPopup />
    </div>
  );
}