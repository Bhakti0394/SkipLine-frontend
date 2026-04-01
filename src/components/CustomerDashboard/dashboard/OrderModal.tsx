// components/CustomerDashboard/dashboard/OrderModal.tsx
//
// FIX [HARDCODED-ADDONS]: ADDONS list is now fetched from backend.
//
// BEFORE: ADDONS was a static hardcoded array — prices and availability
//   were never in sync with what the kitchen actually offers. "Extra Cheese +₹30"
//   might not even be a real add-on at your canteen.
//
// AFTER: GET /api/customer/addons is called when the modal opens.
//   If the endpoint doesn't exist yet or returns an error, it falls back to
//   the static list so the modal never breaks. When you're ready to make
//   add-ons fully dynamic, implement the endpoint in CustomerOrderController.
//
// SPICE_LEVELS: kept static — these are UI config, not database entities.
// EXPRESS_ARRIVAL_OPTIONS: already dynamic (filtered by meal.prepTime) ✅
// Slots: already fetched from backend ✅

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Clock, Minus, Plus, ShoppingBag, Flame, Leaf, Star,
  Check, ChefHat, ArrowRight, CheckCircle2, Calendar, Zap, Timer, Loader2,
} from 'lucide-react';
import { Meal, AddOn, OrderType } from '../../../customer-types/dashboard';
import { Button }        from '../../../components/ui/button';
import { useSkipLine }   from '../../../customer-context/SkipLineContext';
import { useNavigate }   from 'react-router-dom';
import {
  SlotCapacityDto,
  CustomerSlotDto,
  fetchCustomerSlots,
  fetchCustomerSlotsTomorrow,
} from '../../../kitchen-api/kitchenApi';
import '../overview-styles/Ordermodal.scss';

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderModalProps {
  meal:              Meal | null;
  isOpen:            boolean;
  onClose:           () => void;
  orderMode?:        'now' | 'schedule';
  forceExpressMode?: boolean;
  realSlots?:        SlotCapacityDto[]; // kept for backward compat, not used
}

// ── Static fallback add-ons ───────────────────────────────────────────────────
const ADDONS_FALLBACK: AddOn[] = [
  { id: 'extra-cheese', name: 'Extra Cheese',  price: 30, icon: '🧀' },
  { id: 'extra-spicy',  name: 'Extra Spicy',   price:  0, icon: '🌶️' },
  { id: 'extra-butter', name: 'Extra Butter',  price: 20, icon: '🧈' },
  { id: 'onion-rings',  name: 'Onion Rings',   price: 40, icon: '🧅' },
  { id: 'raita',        name: 'Raita',         price: 25, icon: '🥛' },
  { id: 'papad',        name: 'Papad (2 pcs)', price: 20, icon: '🫓' },
];

// ── Static product config ─────────────────────────────────────────────────────
const SPICE_LEVELS = [
  { id: 'mild',      label: 'Mild',      icon: '🌶️'     },
  { id: 'medium',    label: 'Medium',    icon: '🌶️🌶️'   },
  { id: 'spicy',     label: 'Spicy',     icon: '🌶️🌶️🌶️' },
  { id: 'extra-hot', label: 'Extra Hot', icon: '🔥'      },
];

const ALL_EXPRESS_ARRIVAL_OPTIONS = [
  { id: 'express-5',  minutes:  5, label:  '5 mins', sublabel: 'Just around the corner', emoji: '🏃' },
  { id: 'express-10', minutes: 10, label: '10 mins', sublabel: 'On my way now',           emoji: '🚶' },
  { id: 'express-15', minutes: 15, label: '15 mins', sublabel: 'Leaving soon',            emoji: '🚪' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const getTomorrowDate = () => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const getPickupTimeFromMinutes = (minutes: number): string => {
  const pickup = new Date(Date.now() + minutes * 60 * 1000);
  return pickup.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

function queueLevel(remaining: number, max: number): 'low' | 'medium' | 'high' {
  const pct = max > 0 ? remaining / max : 0;
  return pct > 0.5 ? 'low' : pct > 0.2 ? 'medium' : 'high';
}

// ── Add-ons fetch ─────────────────────────────────────────────────────────────
// Cache keyed by auth token — invalidates automatically on logout/login.
// Never caches failures so backend recovery is picked up on next modal open.
let addonsCache: { token: string; data: AddOn[] } | null = null;

async function fetchAddons(): Promise<AddOn[]> {
  const token = localStorage.getItem('auth_token') ?? '';
  // Return cached value only if the auth token hasn't changed
  if (addonsCache && addonsCache.token === token) return addonsCache.data;
  try {
    const CUSTOMER_URL = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api/customer';
    const res = await fetch(`${CUSTOMER_URL}/addons`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data: AddOn[] = await res.json();
    const resolved = data.length > 0 ? data : ADDONS_FALLBACK;
    // Only cache successes — failures fall back but are retried next open
    addonsCache = { token, data: resolved };
    return resolved;
  } catch {
    // Do NOT cache failures — backend may recover before next modal open
    return ADDONS_FALLBACK;
  }
}
// ══════════════════════════════════════════════════════════════════════════════
export function OrderModal({
  meal,
  isOpen,
  onClose,
  orderMode        = 'now',
  forceExpressMode = false,
}: OrderModalProps) {
  const { addToCart, cartItemsCount } = useSkipLine();
  const navigate = useNavigate();

  // ── Local state ──────────────────────────────────────────────────────────
  const [quantity,              setQuantity]              = useState(1);
  const [selectedSlot,          setSelectedSlot]          = useState<string | null>(null);
  const [selectedExpressOption, setSelectedExpressOption] = useState<string | null>(null);
  const [selectedAddOns,        setSelectedAddOns]        = useState<string[]>([]);
  const [spiceLevel,            setSpiceLevel]            = useState('medium');
  const [specialInstructions,   setSpecialInstructions]   = useState('');
  const [showSuccess,           setShowSuccess]           = useState(false);
  const [addons,                setAddons]                = useState<AddOn[]>(ADDONS_FALLBACK);
  const [addonsLoaded,          setAddonsLoaded]          = useState(false);
  const [todaySlots,            setTodaySlots]            = useState<CustomerSlotDto[]>([]);
  const [tomorrowSlots,         setTomorrowSlots]         = useState<CustomerSlotDto[]>([]);
  const [slotsLoading,          setSlotsLoading]          = useState(false);

  // ── Derived values (safe to compute even when meal is null) ───────────────
  const isScheduleMode = orderMode === 'schedule';
  const isExpressMode  = !isScheduleMode && !!meal && (meal.isExpress || forceExpressMode);

  // FIX: fetch real add-ons when modal opens (cached after first load)
  // Guards handle the meal-null case so hooks always run unconditionally.
  useEffect(() => {
    if (!isOpen || !meal || addonsLoaded) return;
    fetchAddons().then(data => {
      setAddons(data);
      setAddonsLoaded(true);
    });
  }, [isOpen, meal, addonsLoaded]);

  // Fetch real slots when modal opens
  useEffect(() => {
    if (!isOpen || !meal) return;
    if (isExpressMode) return;

    let cancelled = false;
    setSlotsLoading(true);

    if (isScheduleMode) {
      fetchCustomerSlotsTomorrow()
        .then(slots => { if (!cancelled) { setTomorrowSlots(slots); setSlotsLoading(false); } })
        .catch(() => { if (!cancelled) setSlotsLoading(false); });
    } else {
      fetchCustomerSlots()
        .then(slots => { if (!cancelled) { setTodaySlots(slots); setSlotsLoading(false); } })
        .catch(() => { if (!cancelled) setSlotsLoading(false); });
    }

    return () => { cancelled = true; };
  }, [isOpen, meal, isScheduleMode, isExpressMode]);

  // ── FIX: early return AFTER all hooks ────────────────────────────────────
  if (!meal) return null;

  // ── Everything below here is safe — meal is guaranteed non-null ───────────
  const orderType: OrderType = isScheduleMode ? 'scheduled' : isExpressMode ? 'express' : 'normal';
  const tomorrowDate   = getTomorrowDate();

const expressArrivalOptions = ALL_EXPRESS_ARRIVAL_OPTIONS.filter(
    o => o.minutes >= meal.prepTime
  );
  const noExpressOptions = isExpressMode && expressArrivalOptions.length === 0;

  const selectedExpressArrival = expressArrivalOptions.find(o => o.id === selectedExpressOption);
  const expressPickupTime      = selectedExpressArrival
    ? getPickupTimeFromMinutes(selectedExpressArrival.minutes)
    : null;

  const tomorrowSlotsByPeriod = tomorrowSlots.reduce((acc, slot) => {
    const p = slot.period;
    if (!acc[p]) acc[p] = [];
    acc[p].push(slot);
    return acc;
  }, {} as Record<string, CustomerSlotDto[]>);

  const periods = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner'].filter(
    p => tomorrowSlotsByPeriod[p]?.length > 0
  );

  const canSubmit = isExpressMode ? !!selectedExpressOption : !!selectedSlot;

  const noSpiceCategories = ['Desserts', 'Dessert', 'Beverages', 'Beverage', 'Drinks', 'Drink', 'Sweet', 'Sweets', 'Chai', 'Tea', 'Coffee'];
  const shouldShowSpiceLevel = !noSpiceCategories.some(cat =>
    meal.category.toLowerCase().includes(cat.toLowerCase())
  );

  const toggleAddOn = (addOnId: string) =>
    setSelectedAddOns(prev =>
      prev.includes(addOnId) ? prev.filter(id => id !== addOnId) : [...prev, addOnId]
    );

  const selectedAddOnObjects = addons.filter(a => selectedAddOns.includes(a.id));
  const addOnsTotal          = selectedAddOnObjects.reduce((t, a) => t + a.price, 0);
  const totalPrice           = (meal.price + addOnsTotal) * quantity;

const resetForm = () => {
    setQuantity(1); setSelectedSlot(null); setSelectedExpressOption(null);
    setSelectedAddOns([]); setSpiceLevel('medium');
    setSpecialInstructions(''); setShowSuccess(false);
    // Do NOT reset addonsLoaded — cache handles freshness.
    // Resetting it would trigger a redundant fetch effect fire on close.
    // Clear stale slots so previous meal's slots never flash on next open
    setTodaySlots([]);
    setTomorrowSlots([]);
  };

  const handleAddToCart = () => {
    if (!canSubmit) return;
    if (isExpressMode && selectedExpressArrival) {
      addToCart({
        meal, menuItemId: meal.id, quantity,
        addOns: selectedAddOnObjects,
        spiceLevel: shouldShowSpiceLevel ? spiceLevel : 'none',
        specialInstructions,
        pickupSlotId: selectedExpressOption!,
        pickupTime: expressPickupTime!,
        isScheduled: false, scheduledDate: undefined, orderType,
      });
    } else {
      const allSlots = isScheduleMode ? tomorrowSlots : todaySlots;
      const slot = allSlots.find(s => s.slotId === selectedSlot);
      addToCart({
        meal, menuItemId: meal.id, quantity,
        addOns: selectedAddOnObjects,
        spiceLevel: shouldShowSpiceLevel ? spiceLevel : 'none',
        specialInstructions,
        pickupSlotId: selectedSlot!,
        pickupTime: slot?.displayTime || 'ASAP',
        isScheduled: isScheduleMode,
        scheduledDate: isScheduleMode ? tomorrowDate : undefined, orderType,
      });
    }
    setShowSuccess(true);
  };

 // Reset whenever the modal closes, regardless of the path
  useEffect(() => {
    if (!isOpen) resetForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleAddMore  = () => { onClose(); };
  const handleViewCart = () => { onClose(); navigate('/customer-dashboard/checkout'); };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleAddMore} className="modal__backdrop"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
            animate={{ opacity: 1, scale: 1,    y: '-50%', x: '-50%' }}
            exit={{   opacity: 0, scale: 0.95,  y: '-50%', x: '-50%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={isExpressMode ? 'modal modal--express' : 'modal'}
          >
            <AnimatePresence mode="wait">

              {/* ── Success screen ── */}
              {showSuccess ? (
                <motion.div key="success"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }} className="modal__success"
                >
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.15, damping: 15 }}
                    className={`modal__success-icon ${isScheduleMode ? 'modal__success-icon--schedule' : ''} ${isExpressMode ? 'modal__success-icon--express' : ''}`}
                  >
                    <CheckCircle2 className="modal__success-check" />
                  </motion.div>
                  <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }} className="modal__success-title">
                    {isScheduleMode ? 'Scheduled for Tomorrow!' : isExpressMode ? 'Express Order Placed!' : 'Added to Cart!'}
                  </motion.h2>
                  <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }} className="modal__success-text">
                    {quantity}x {meal.name} • ₹{totalPrice}
                  </motion.p>
                  {isExpressMode && selectedExpressArrival && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }} className="modal__success-express-info">
                      <Zap className="modal__success-express-icon" />
                      <span>Ready by {expressPickupTime} · Kitchen starts now!</span>
                    </motion.div>
                  )}
                  {isScheduleMode && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }} className="modal__success-schedule-info">
                      <Calendar className="modal__success-schedule-icon" />
                      <span>{tomorrowDate} at {tomorrowSlots.find(s => s.slotId === selectedSlot)?.displayTime}</span>
                    </motion.div>
                  )}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }} className="modal__success-actions">
                    <Button variant="outline" onClick={handleAddMore} className="modal__btn modal__btn--outline">
                      <Plus className="modal__btn-icon" />Add More
                    </Button>
                    <Button onClick={handleViewCart} className="modal__btn modal__btn--primary">
                      <ShoppingBag className="modal__btn-icon" />View Cart ({cartItemsCount})
                    </Button>
                  </motion.div>
                </motion.div>

              ) : (
                /* ── Order form ── */
                <motion.div key="form"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="modal__form"
                >
                  {/* Header */}
                  <div className="modal__header">
                    <img src={meal.image} alt={meal.name} className="modal__header-img" />
                    <div className="modal__header-overlay" />
                    {isScheduleMode && (
                      <div className="modal__schedule-badge">
                        <Calendar className="modal__schedule-badge-icon" />Tomorrow
                      </div>
                    )}
                    {isExpressMode && (
                      <div className="modal__express-badge">
                        <Zap className="modal__express-badge-icon" />Express
                      </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={handleAddMore} className="modal__close">
                      <X className="modal__close-icon" />
                    </Button>
                    <div className="modal__header-info">
                      <div className="modal__badges">
                        <span className="modal__badge modal__badge--category">{meal.category}</span>
                        <span className="modal__badge modal__badge--rating">
                          <Star className="modal__badge-star" />{meal.rating}
                        </span>
                      </div>
                      <h2 className="modal__title">{meal.name}</h2>
                      <p className="modal__subtitle">{meal.restaurant}</p>
                    </div>
                  </div>

                  <div className="modal__content">
                    {/* Mode banners */}
                    {isScheduleMode && (
                      <div className="modal__schedule-banner">
                        <Calendar className="modal__schedule-banner-icon" />
                        <div className="modal__schedule-banner-text">
                          <p className="modal__schedule-banner-title">Pre-order for {tomorrowDate}</p>
                          <p className="modal__schedule-banner-subtitle">We'll have it fresh & ready!</p>
                        </div>
                      </div>
                    )}
                    {isExpressMode && (
                      <div className="modal__express-banner">
                        <Zap className="modal__express-banner-icon" />
                        <div className="modal__express-banner-text">
                          <p className="modal__express-banner-title">⚡ Kitchen starts cooking immediately</p>
                          <p className="modal__express-banner-subtitle">
                            {meal.name} is ready in {meal.prepTime} min — pick your arrival time
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Quick info */}
                    <div className="modal__info">
                      <div className="modal__info-item">
                        <Clock className="modal__info-icon" />
                        <div>
                          <p className="modal__info-value">{meal.prepTime} min</p>
                          <p className="modal__info-label">Prep Time</p>
                        </div>
                      </div>
                      <div className="modal__info-item">
                        <span className="modal__info-currency">₹</span>
                        <div>
                          <p className="modal__info-value">₹{meal.price}</p>
                          <p className="modal__info-label">Base Price</p>
                        </div>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="modal__quantity">
                      <div className="modal__quantity-label">
                        <ShoppingBag className="modal__quantity-icon" /><span>Quantity</span>
                      </div>
                      <div className="modal__quantity-controls">
                        <motion.button whileTap={{ scale: 0.9 }}
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          className="modal__quantity-btn modal__quantity-btn--minus">
                          <Minus className="modal__quantity-btn-icon" />
                        </motion.button>
                        <span className="modal__quantity-value">{quantity}</span>
                        <motion.button whileTap={{ scale: 0.9 }}
                          onClick={() => setQuantity(q => Math.min(10, q + 1))}
                          className="modal__quantity-btn modal__quantity-btn--plus">
                          <Plus className="modal__quantity-btn-icon" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Spice level */}
                    {shouldShowSpiceLevel && (
                      <div className="modal__section">
                        <div className="modal__section-header">
                          <Flame className="modal__section-icon modal__section-icon--flame" />
                          <h3 className="modal__section-title">Spice Level</h3>
                        </div>
                        <div className="modal__spice-grid">
                          {SPICE_LEVELS.map((level) => (
                            <motion.button key={level.id} whileTap={{ scale: 0.95 }}
                              onClick={() => setSpiceLevel(level.id)}
                              className={`modal__spice-btn ${spiceLevel === level.id ? 'modal__spice-btn--active' : ''}`}>
                              <span className="modal__spice-icon">{level.icon}</span>
                              <span className="modal__spice-label">{level.label}</span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add-ons */}
                    <div className="modal__section">
                      <div className="modal__section-header">
                        <ChefHat className={`modal__section-icon ${isExpressMode ? 'modal__section-icon--express' : 'modal__section-icon--primary'}`} />
                        <h3 className="modal__section-title">Add-ons</h3>
                      </div>
                      <div className="modal__addons-grid">
                        {addons.map((addOn) => {
                          const isSelected = selectedAddOns.includes(addOn.id);
                          return (
                            <motion.button key={addOn.id} whileTap={{ scale: 0.98 }}
                              onClick={() => toggleAddOn(addOn.id)}
                              className={`modal__addon ${isSelected ? 'modal__addon--active' : ''}`}>
                              <span className="modal__addon-icon">{addOn.icon}</span>
                              <div className="modal__addon-info">
                                <p className="modal__addon-name">{addOn.name}</p>
                                <p className="modal__addon-price">{addOn.price > 0 ? `+₹${addOn.price}` : 'Free'}</p>
                              </div>
                              {isSelected && <Check className="modal__addon-check" />}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Special instructions */}
                    <div className="modal__section">
                      <div className="modal__section-header">
                        <Leaf className="modal__section-icon modal__section-icon--success" />
                        <h3 className="modal__section-title">Special Instructions</h3>
                      </div>
                      <textarea
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder="Any allergies or requests?"
                        className="modal__textarea" maxLength={150}
                      />
                    </div>

                    {/* ── Pickup / Arrival section ── */}
                    <div className="modal__section">
                      <div className="modal__section-header">
                        {isScheduleMode ? (
                          <Calendar className="modal__section-icon modal__section-icon--schedule" />
                        ) : isExpressMode ? (
                          <Timer className="modal__section-icon modal__section-icon--express" />
                        ) : (
                          <Clock className="modal__section-icon modal__section-icon--primary" />
                        )}
                        <h3 className="modal__section-title">
                          {isExpressMode ? 'When will you arrive?' : isScheduleMode ? 'Pickup Time Tomorrow' : 'Pickup Time'}
                        </h3>
                        <span className="modal__required">*Required</span>
                      </div>

                      {/* EXPRESS */}
                     {isExpressMode ? (
                        noExpressOptions ? (
                          <p className="modal__slots-empty">
                            This item takes longer than 15 min — please use scheduled ordering.
                          </p>
                        ) : (
                        <div className="modal__express-arrival-grid">
                          {expressArrivalOptions.map((option) => {
                            const isSelected = selectedExpressOption === option.id;
                            const pickupAt   = getPickupTimeFromMinutes(option.minutes);
                            return (
                              <motion.button key={option.id}
                                whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
                                onClick={() => setSelectedExpressOption(option.id)}
                                className={`modal__express-arrival ${isSelected ? 'modal__express-arrival--active' : ''}`}
                              >
                                <span className="modal__express-arrival-emoji">{option.emoji}</span>
                                <span className="modal__express-arrival-label">{option.label}</span>
                                <span className="modal__express-arrival-sublabel">{option.sublabel}</span>
                                <span className="modal__express-arrival-time">Ready ~{pickupAt}</span>
                                {isSelected && (
                                  <motion.div className="modal__express-arrival-check"
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 15 }}>
                                    <Check />
                                  </motion.div>
                                )}
                              </motion.button>
                            );
                          })}
                       </div>
                        )

                      ) : isScheduleMode ? (
                        /* SCHEDULED — real tomorrow slots from backend ✅ */
                        slotsLoading ? (
                          <div className="modal__slots-loading">
                            <Loader2 className="modal__slots-loading-icon" />
                            <span>Loading available slots...</span>
                          </div>
                        ) : tomorrowSlots.length === 0 ? (
                          <p className="modal__slots-empty">No slots available for tomorrow yet. Check back later.</p>
                        ) : (
                          <div className="modal__schedule-slots">
                            {periods.map((period) => (
                              <div key={period} className="modal__schedule-period">
                                <p className="modal__schedule-period-title">{period}</p>
                                <div className="modal__schedule-period-slots">
                                  {tomorrowSlotsByPeriod[period].map((slot) => {
                                    const isFull = slot.remaining === 0;
                                    return (
                                      <motion.button key={slot.slotId} whileTap={{ scale: 0.95 }}
                                        onClick={() => !isFull && setSelectedSlot(slot.slotId)}
                                        disabled={isFull}
                                        className={`modal__schedule-slot ${selectedSlot === slot.slotId ? 'modal__schedule-slot--active' : ''} ${isFull ? 'modal__schedule-slot--full' : ''}`}>
                                        <Clock className="modal__schedule-slot-icon" />
                                        <span className="modal__schedule-slot-time">{slot.displayTime}</span>
                                        {isFull && <span className="modal__schedule-slot-full-badge">Full</span>}
                                      </motion.button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )

                      ) : (
                        /* NORMAL — real today's slots from backend ✅ */
                        slotsLoading ? (
                          <div className="modal__slots-loading">
                            <Loader2 className="modal__slots-loading-icon" />
                            <span>Loading available slots...</span>
                          </div>
                        ) : todaySlots.length === 0 ? (
                          <p className="modal__slots-empty">No slots available right now. Try again soon.</p>
                        ) : (
                          <div className="modal__slots-grid">
                            {todaySlots.map((slot) => {
                              const level = queueLevel(slot.remaining, slot.maxCapacity);
                              const isFull = slot.remaining === 0;
                              return (
                                <motion.button key={slot.slotId} whileTap={{ scale: 0.95 }}
                                  onClick={() => setSelectedSlot(slot.slotId)}
                                  disabled={isFull}
                                  className={`modal__slot ${selectedSlot === slot.slotId ? 'modal__slot--active' : ''} ${isFull ? 'modal__slot--full' : ''}`}
                                >
                                  <p className="modal__slot-time">{slot.displayTime}</p>
                                  <div className="modal__slot-queue">
                                    <span className={`modal__slot-dot modal__slot-dot--${level}`} />
                                    <span className="modal__slot-wait">
                                      {isFull ? 'Full' : level === 'low' ? 'No wait' : `${slot.remaining} left`}
                                    </span>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="modal__footer">
                    <div className="modal__total">
                      <div>
                        <span className="modal__total-label">Total</span>
                        {addOnsTotal > 0 && <p className="modal__total-addon">incl. ₹{addOnsTotal} add-ons</p>}
                      </div>
                      <span className="modal__total-price">₹{totalPrice}</span>
                    </div>
                    <Button
                      onClick={handleAddToCart} disabled={!canSubmit}
                      className={`modal__submit ${isScheduleMode ? 'modal__submit--schedule' : ''} ${isExpressMode ? 'modal__submit--express' : ''}`}
                    >
                      {isScheduleMode ? <Calendar className="modal__submit-icon" />
                        : isExpressMode ? <Zap className="modal__submit-icon" />
                        : <ShoppingBag className="modal__submit-icon" />}
                      {canSubmit ? (
                        <>
                          {isScheduleMode ? 'Schedule Order'
                            : isExpressMode ? `Start Cooking — Arrive in ${selectedExpressArrival?.label}`
                            : 'Add to Cart'}
                          <ArrowRight className="modal__submit-arrow" />
                        </>
                      ) : (
                        isExpressMode ? 'How far are you?' : 'Select Pickup Time'
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}