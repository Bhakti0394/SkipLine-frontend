import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Clock, CreditCard, Banknote,
  Trash2, Plus, Minus, Loader2, ChefHat, Zap,
  Timer, TrendingDown,
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { useSkipLine } from '../../customer-context/SkipLineContext';
import {
  placeCustomerOrder,
  PlaceOrderRequest,
  generateCustomerOrderRef,
  CustomerOrderDto,
  fetchCustomerSlots,
  CustomerSlotDto,
} from '../../kitchen-api/kitchenApi';
import '../../components/CustomerDashboard/styles/Checkout.scss';

type PaymentMethod = 'upi' | 'cash';

// ─── Time-saved calculation ────────────────────────────────────────────────
//
// "Time saved by pre-ordering" = time the customer would have wasted if they
// walked in, stood in the physical queue, AND waited for food to be cooked.
//
// Formula:
//   walkin_wait  = estimatedWait (from slot / kitchen queue data) + prepTime
//   preorder_wait = 0 (food is ready at pickup time, customer just walks in)
//   timeSaved    = walkin_wait - prepTime = estimatedWait
//
// In other words: by pre-ordering, you skip exactly the queue wait at that slot.
// The prep time is non-negotiable whether you walk in or pre-order, so it cancels
// out. The ONLY real saving is the queue wait you avoid.
//
// Minimum floor: 5 min (pre-ordering always saves at least some dead time).
// Maximum cap:   60 min (prevents absurd numbers on very backlogged slots).

const MIN_TIME_SAVED = 5;
const MAX_TIME_SAVED = 60;

/**
 * Average queue wait across all slots for a given prep time.
 * Used as fallback when we don't have slot-specific data yet.
 */
function estimateQueueWaitFromSlots(slots: CustomerSlotDto[], prepTimeMinutes: number): number {
  if (!slots.length) return 15; // conservative default

  const relevantSlots = slots.filter(s => s.remaining > 0);
  if (!relevantSlots.length) return 20; // all slots full → high wait

  // Weight wait by how full each slot is
  const totalBookings = relevantSlots.reduce((sum, s) => sum + s.currentBookings, 0);
  const totalCapacity = relevantSlots.reduce((sum, s) => sum + s.maxCapacity, 0);
  const fillRatio = totalCapacity > 0 ? totalBookings / totalCapacity : 0;

  // At 0% fill → ~5 min wait; at 100% fill → ~30 min wait; linear scale
  const baseWait = Math.round(5 + fillRatio * 25);
  return Math.max(MIN_TIME_SAVED, Math.min(MAX_TIME_SAVED, baseWait));
}

/**
 * Per-item real time saved, using actual slot queue data from backend.
 * Falls back to fill-ratio estimate when slot-specific data is unavailable.
 */
function calculateTimeSaved(
  prepTimeMinutes: number,
  pickupSlotId: string | undefined,
  slots: CustomerSlotDto[],
): number {
  if (pickupSlotId && slots.length > 0) {
    const slot = slots.find(s => s.slotId === pickupSlotId);
    if (slot) {
      // fillRatio: how congested is this specific slot
      const fillRatio = slot.maxCapacity > 0 ? slot.currentBookings / slot.maxCapacity : 0;
      // At 0% full → 5 min saved; at 100% full → 35 min saved
      const slotQueueWait = Math.round(5 + fillRatio * 30);
      return Math.max(MIN_TIME_SAVED, Math.min(MAX_TIME_SAVED, slotQueueWait));
    }
  }
  // No slot match → use global fill-ratio estimate
  return estimateQueueWaitFromSlots(slots, prepTimeMinutes);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatPickupTime(pickupSlotTime?: string | null, fallback?: string): string {
  if (!pickupSlotTime) return fallback || 'ASAP';
  try {
    const slotDate = new Date(pickupSlotTime);
    if (isNaN(slotDate.getTime())) return fallback || 'ASAP';
    return slotDate.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return fallback || 'ASAP';
  }
}

function buildOrderRef(customerName: string, orderType: 'express' | 'normal' | 'scheduled'): string {
  const tag = orderType === 'express' ? 'EXPRESS' : orderType === 'scheduled' ? 'SCHEDULED' : 'NORMAL';
  return `${generateCustomerOrderRef(customerName)}-${tag}`;
}

function getCustomerIdentifier(): string {
  return (
    localStorage.getItem('auth_email') ??
    localStorage.getItem('auth_full_name') ??
    'Guest'
  );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function toValidUUID(id?: string): string | undefined {
  return id && UUID_REGEX.test(id) ? id : undefined;
}
function toValidUUIDs(ids: string[]): string[] {
  return ids.filter(id => UUID_REGEX.test(id));
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, cartTotal, removeFromCart, updateCartItem, clearCart, addOrder } = useSkipLine();

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('upi');
  const [isProcessing,    setIsProcessing]    = useState(false);
  const [upiId,           setUpiId]           = useState('');
  const [error,           setError]           = useState<string | null>(null);

  // Slot data fetched from backend to compute real time-saved values
  const [slots,        setSlots]        = useState<CustomerSlotDto[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Fetch live slot data once on mount (uses max prepTime in cart as query param)
  useEffect(() => {
    if (cart.length === 0) return;
    const maxPrepTime = Math.max(...cart.map(i => i.meal.prepTime ?? 15));
    setSlotsLoading(true);
    fetchCustomerSlots(maxPrepTime)
      .then(data => setSlots(data))
      .catch(() => setSlots([]))  // graceful fallback
      .finally(() => setSlotsLoading(false));
  }, []); // intentionally [] — only fetch once per checkout visit

  // ── Derived: per-item time saved using real slot data ──────────────────
  const itemTimeSavings = cart.map(item => ({
    id: item.id,
    timeSaved: calculateTimeSaved(item.meal.prepTime ?? 15, item.pickupSlotId, slots),
  }));

  const totalTimeSaved = itemTimeSavings.reduce(
    (total, { timeSaved }, idx) => total + timeSaved * cart[idx].quantity,
    0,
  );

  // ── Financial breakdown ────────────────────────────────────────────────
  const platformFee      = Math.round(cartTotal * 0.05);
  const preorderDiscount = platformFee; // discount cancels fee → net Rs.0 extra
  const finalTotal       = cartTotal;

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = cart.find(i => i.id === itemId);
    if (item) updateCartItem(itemId, { quantity: Math.max(1, Math.min(10, item.quantity + delta)) });
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setError(null);

    if (selectedPayment === 'upi') await new Promise(r => setTimeout(r, 1500));

    const customerIdentifier = getCustomerIdentifier();

    const requests = cart.map((item, idx) => {
      const orderType = (item.orderType ?? 'normal') as 'express' | 'normal' | 'scheduled';
      const backendMenuItemId = item.menuItemId || item.meal.id;
      const req: PlaceOrderRequest = {
        orderRef:     buildOrderRef(customerIdentifier, orderType),
        menuItemIds:  toValidUUIDs([backendMenuItemId]),
        pickupSlotId: toValidUUID(item.pickupSlotId),
      };
      return { item, req, orderType, timeSaved: itemTimeSavings[idx]?.timeSaved ?? 10 };
    });

    const itemsWithNoUUID = requests.filter(r => r.req.menuItemIds.length === 0);
    if (itemsWithNoUUID.length > 0) {
      setError(
        `Some items could not be ordered (missing backend ID): ${
          itemsWithNoUUID.map(r => r.item.meal.name).join(', ')
        }. Please remove them and re-add from Browse Menu.`
      );
      setIsProcessing(false);
      return;
    }

    try {
      const results = await Promise.allSettled(
        requests.map(({ req }) => placeCustomerOrder(req))
      );

      const createdOrders: ReturnType<typeof addOrder>[] = [];
      const failedItems: string[] = [];

      results.forEach((result, idx) => {
        const { item, orderType, timeSaved } = requests[idx];

        if (result.status === 'fulfilled') {
          const dto: CustomerOrderDto = result.value;

          // Use backend-confirmed prepTime if available, otherwise cart value
          const confirmedPrepTime = dto.totalPrepMinutes > 0
            ? dto.totalPrepMinutes
            : (item.meal.prepTime ?? 15);

          // Re-calculate timeSaved with confirmed slot data from the placed order
          const confirmedTimeSaved = calculateTimeSaved(
            confirmedPrepTime,
            dto.pickupSlotId ?? item.pickupSlotId,
            slots,
          );

          const localOrder = {
            id:                   dto.id,
            orderRef:             dto.orderRef,
            meal:                 item.meal.name,
            restaurant:           item.meal.restaurant,
            image:                item.meal.image,
            status:               'confirmed' as const,
            pickupTime:           formatPickupTime(dto.pickupSlotTime, item.pickupTime),
            pickupSlotId:         item.pickupSlotId,
            estimatedReady:       `${dto.totalPrepMinutes} min`,
            price:                (item.meal.price + item.addOns.reduce((s, a) => s + a.price, 0)) * item.quantity,
            quantity:             item.quantity,
            paymentStatus:        selectedPayment === 'upi' ? 'paid' as const : 'cash' as const,
            paymentMethod:        selectedPayment,
            addOns:               item.addOns.map(a => a.name),
            spiceLevel:           item.spiceLevel,
            specialInstructions:  item.specialInstructions,
            timeSaved:            confirmedTimeSaved,
            kitchenQueuePosition: 1,
            orderType,
            totalPrepMinutes:     dto.totalPrepMinutes ?? 0,
            pickupSlotTime:       dto.pickupSlotTime ?? null,
            isExpress:            dto.isExpress ?? false,
            editLockedUntil:      dto.editLockedUntil ? new Date(dto.editLockedUntil) : null,
            scheduledCookAt:      dto.scheduledCookAt ? new Date(dto.scheduledCookAt) : null,
          };

          createdOrders.push(addOrder(localOrder));
        } else {
          failedItems.push(item.meal.name);
        }
      });

      if (failedItems.length > 0 && createdOrders.length === 0) {
        setError(`Failed to place order for: ${failedItems.join(', ')}. Please try again.`);
        setIsProcessing(false);
        return;
      }

      if (failedItems.length > 0) {
        const succeededMealNames = new Set(createdOrders.map(o => o.meal));
        cart
          .filter(item => succeededMealNames.has(item.meal.name))
          .forEach(item => removeFromCart(item.id));
        navigate('/customer-dashboard/order-success', {
          state: {
            orders: createdOrders,
            paymentMethod: selectedPayment,
            total: cartTotal,
            partialFailure: failedItems,
          },
        });
        return;
      }

      clearCart();
      navigate('/customer-dashboard/order-success', {
        state: { orders: createdOrders, paymentMethod: selectedPayment, total: cartTotal },
      });

    } catch (err: any) {
      setError(err.message ?? 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Empty cart ─────────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <DashboardLayout>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="empty-cart">
          <div className="empty-cart__icon"><ChefHat className="icon" /></div>
          <h2 className="empty-cart__title">Your cart is empty</h2>
          <p className="empty-cart__description">Add some delicious meals to get started!</p>
          <Button onClick={() => navigate('/customer-dashboard/browse')} className="empty-cart__button">
            Browse Menu
          </Button>
        </motion.div>
      </DashboardLayout>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="checkout-header">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="checkout-header__back-button">
          <ArrowLeft className="icon" />
        </Button>
        <div className="checkout-header__content">
          <h1 className="checkout-header__title">Checkout</h1>
          <p className="checkout-header__subtitle">{cart.length} item(s) in cart</p>
        </div>
      </motion.div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="checkout-error-banner">
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="checkout-grid">
        {/* ── Left column ── */}
        <div className="checkout-grid__main">

          {/* Order items */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }} className="cart-section">
            <h2 className="cart-section__title"><ChefHat className="icon" />Your Order</h2>
            <div className="cart-items">
              {cart.map((item, index) => {
                const itemSaving = itemTimeSavings[index]?.timeSaved ?? 0;
                const slot = slots.find(s => s.slotId === item.pickupSlotId);
                const fillPct = slot
                  ? Math.round((slot.currentBookings / slot.maxCapacity) * 100)
                  : null;

                return (
                  <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }} className="cart-item">
                    <img src={item.meal.image} alt={item.meal.name} className="cart-item__image" />
                    <div className="cart-item__details">
                      <h3 className="cart-item__name">{item.meal.name}</h3>
                      <p className="cart-item__restaurant">{item.meal.restaurant}</p>

                      <div className="cart-item__meta-row">
                        <span className="cart-item__meta-pill cart-item__meta-pill--time">
                          <Clock className="icon" />
                          Pickup: {item.pickupTime}
                        </span>
                        <span className="cart-item__meta-pill cart-item__meta-pill--prep">
                          <Timer className="icon" />
                          {item.meal.prepTime} min prep
                        </span>
                      </div>

                      {/* Real time-saved row */}
                      <div className="cart-item__saving-row">
                        <Zap className="icon" />
                        <span>
                          Skips ~{itemSaving} min queue wait
                          {fillPct !== null && (
                            <span className="cart-item__slot-fill">
                              {' '}· slot {fillPct}% full
                            </span>
                          )}
                          {slotsLoading && (
                            <span className="cart-item__slot-loading"> · calculating…</span>
                          )}
                        </span>
                      </div>

                      {item.addOns.length > 0 && (
                        <p className="cart-item__addons">+{item.addOns.map(a => a.name).join(', ')}</p>
                      )}
                    </div>

                    <div className="cart-item__actions">
                      <span className="cart-item__price">
                        Rs.{((item.meal.price + item.addOns.reduce((s, a) => s + a.price, 0)) * item.quantity).toFixed(0)}
                      </span>
                      <div className="quantity-controls">
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleQuantityChange(item.id, -1)}
                          className="quantity-controls__button quantity-controls__button--minus"><Minus className="icon" /></motion.button>
                        <span className="quantity-controls__value">{item.quantity}</span>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleQuantityChange(item.id, 1)}
                          className="quantity-controls__button quantity-controls__button--plus"><Plus className="icon" /></motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeFromCart(item.id)}
                          className="quantity-controls__button quantity-controls__button--delete"><Trash2 className="icon" /></motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Payment method */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }} className="payment-section">
            <h2 className="payment-section__title"><CreditCard className="icon" />Payment Method</h2>
            <div className="payment-methods">
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => setSelectedPayment('upi')}
                className={`payment-option ${selectedPayment === 'upi' ? 'payment-option--active' : ''}`}>
                <div className="payment-option__header">
                  <div className="payment-option__icon payment-option__icon--upi">G</div>
                  <div className="payment-option__info">
                    <p className="payment-option__name">Pay Now</p>
                    <p className="payment-option__method">UPI / GPay</p>
                  </div>
                </div>
                <p className="payment-option__benefit payment-option__benefit--success">Instant confirmation</p>
              </motion.button>

              <motion.button whileTap={{ scale: 0.98 }} onClick={() => setSelectedPayment('cash')}
                className={`payment-option ${selectedPayment === 'cash' ? 'payment-option--active' : ''}`}>
                <div className="payment-option__header">
                  <div className="payment-option__icon payment-option__icon--cash"><Banknote className="icon" /></div>
                  <div className="payment-option__info">
                    <p className="payment-option__name">Cash</p>
                    <p className="payment-option__method">Pay at pickup</p>
                  </div>
                </div>
                <p className="payment-option__benefit">Pay when you collect</p>
              </motion.button>
            </div>

            {selectedPayment === 'upi' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="upi-input">
                <label className="upi-input__label">Enter UPI ID (optional for demo)</label>
                <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)}
                  placeholder="yourname@upi" className="upi-input__field" />
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* ── Right column: Order Summary ── */}
        <div className="checkout-grid__sidebar">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }} className="order-summary">
            <h2 className="order-summary__title">Order Summary</h2>

            <div className="order-summary__details">
              <div className="order-summary__row">
                <span>Subtotal</span>
                <span>Rs.{cartTotal.toFixed(0)}</span>
              </div>
              <div className="order-summary__row">
                <span>Platform fee</span>
                <span className="order-summary__strikethrough">Rs.{platformFee}</span>
              </div>
              <div className="order-summary__row order-summary__row--success">
                <span>Pre-order discount</span>
                <span>−Rs.{preorderDiscount}</span>
              </div>
              <div className="order-summary__divider" />
              <div className="order-summary__row order-summary__row--total">
                <span>Total</span>
                <span className="order-summary__total-amount">Rs.{finalTotal.toFixed(0)}</span>
              </div>
            </div>

            {/* Time saved badge — real calculation */}
            <div className="time-saved-badge">
              <div className="time-saved-badge__icon-wrap">
                <Zap className="icon" />
              </div>
              <div className="time-saved-badge__body">
                <p className="time-saved-badge__time">
                  ~{totalTimeSaved} min saved
                  {slotsLoading && <span className="time-saved-badge__loading"> ·&nbsp;live</span>}
                </p>
                <p className="time-saved-badge__description">
                  Queue wait avoided by pre-ordering
                </p>
              </div>
              <div className="time-saved-badge__chart">
                <TrendingDown className="icon" />
              </div>
            </div>

            {/* Queue insight */}
            {slots.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="queue-insight">
                <div className="queue-insight__row">
                  <Timer className="icon" />
                  <span>
                    Current avg. queue:&nbsp;
                    <strong>
                      {estimateQueueWaitFromSlots(slots, 15)} min
                    </strong>
                  </span>
                </div>
                <div className="queue-insight__bar-wrap">
                  {slots.slice(0, 4).map(s => {
                    const fill = s.maxCapacity > 0
                      ? Math.round((s.currentBookings / s.maxCapacity) * 100)
                      : 0;
                    const color = fill >= 80 ? 'var(--color-danger)' : fill >= 50 ? 'var(--color-warn)' : 'hsl(var(--success))';
                    return (
                      <div key={s.slotId} className="queue-insight__slot" title={`${s.displayTime}: ${fill}% full`}>
                        <div className="queue-insight__slot-bar" style={{ height: `${Math.max(10, fill)}%`, background: color }} />
                        <span className="queue-insight__slot-label">{s.displayTime?.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            <Button onClick={handlePlaceOrder} disabled={isProcessing || cart.length === 0}
              className="order-summary__submit-button">
              {isProcessing ? (
                <><Loader2 className="icon icon--spinning" />
                  {selectedPayment === 'upi' ? 'Processing Payment…' : 'Placing Order…'}
                </>
              ) : (
                <>{selectedPayment === 'upi' ? 'Pay' : 'Place Order for'}&nbsp;Rs.{finalTotal.toFixed(0)}</>
              )}
            </Button>

            <p className="order-summary__footer-text">
              {selectedPayment === 'upi'
                ? 'Secure payment powered by UPI'
                : 'Pay with cash when you pick up your order'}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Processing overlay */}
      <AnimatePresence>
        {isProcessing && selectedPayment === 'upi' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="processing-overlay">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="processing-overlay__content">
              <div className="processing-overlay__spinner"><Loader2 className="icon icon--spinning" /></div>
              <h3 className="processing-overlay__title">Processing Payment</h3>
              <p className="processing-overlay__message">Please wait…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}