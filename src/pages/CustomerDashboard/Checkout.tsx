import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Clock, CreditCard, Banknote,
  Trash2, Plus, Minus, Loader2, ChefHat, Zap,
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { useSkipLine } from '../../customer-context/SkipLineContext';
import {
  placeCustomerOrder,
  PlaceOrderRequest,
  generateCustomerOrderRef,
  CustomerOrderDto,
} from '../../kitchen-api/kitchenApi';
import '../../components/CustomerDashboard/styles/Checkout.scss';

type PaymentMethod = 'upi' | 'cash';

function formatPickupTime(pickupSlotTime?: string | null, fallback?: string): string {
  if (!pickupSlotTime) return fallback || 'ASAP';
  try {
    const slotDate = new Date(pickupSlotTime);
    if (isNaN(slotDate.getTime())) return fallback || 'ASAP';
    return slotDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
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

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, cartTotal, removeFromCart, updateCartItem, clearCart, addOrder } = useSkipLine();

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('upi');
  const [isProcessing,    setIsProcessing]    = useState(false);
  const [upiId,           setUpiId]           = useState('');
  const [error,           setError]           = useState<string | null>(null);

  const totalTimeSaved = cart.reduce((total, item) => {
    const prepTime = item.meal.prepTime ?? 0;
    const saved    = prepTime > 0 ? Math.floor(prepTime * 0.8) : 10;
    return total + saved * item.quantity;
  }, 0);

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

    const requests = cart.map(item => {
      const orderType = (item.orderType ?? 'normal') as 'express' | 'normal' | 'scheduled';

      const backendMenuItemId = item.menuItemId || item.meal.id;

      const req: PlaceOrderRequest = {
        orderRef:     buildOrderRef(customerIdentifier, orderType),
        menuItemIds:  toValidUUIDs([backendMenuItemId]),
        pickupSlotId: toValidUUID(item.pickupSlotId),
      };
      return { item, req, orderType };
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
        const { item, orderType } = requests[idx];

        if (result.status === 'fulfilled') {
          const dto: CustomerOrderDto = result.value;

          const itemPrepTime = item.meal.prepTime ?? dto.totalPrepMinutes;
          const timeSaved    = itemPrepTime > 0 ? Math.floor(itemPrepTime * 0.8) : 15;

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
            timeSaved,
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

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="checkout-header">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="checkout-header__back-button">
          <ArrowLeft className="icon" />
        </Button>
        <div className="checkout-header__content">
          <h1 className="checkout-header__title">Checkout</h1>
          <p className="checkout-header__subtitle">{cart.length} item(s) in cart</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem',
              color: '#f87171', fontSize: '0.875rem',
            }}>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="checkout-grid">
        <div className="checkout-grid__main">

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }} className="cart-section">
            <h2 className="cart-section__title"><ChefHat className="icon" />Your Order</h2>
            <div className="cart-items">
              {cart.map((item, index) => (
                <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }} className="cart-item">
                  <img src={item.meal.image} alt={item.meal.name} className="cart-item__image" />
                  <div className="cart-item__details">
                    <h3 className="cart-item__name">{item.meal.name}</h3>
                    <p className="cart-item__restaurant">{item.meal.restaurant}</p>
                    <div className="cart-item__pickup-time">
                      <Clock className="icon" /><span>Pickup: {item.pickupTime}</span>
                    </div>
                    <div className="cart-item__pickup-time" style={{ marginTop: 2 }}>
                      <Zap className="icon" style={{ color: '#ff6b35' }} />
                      <span style={{ color: '#ff6b35', fontSize: '0.75rem' }}>
                        ~{item.meal.prepTime} min prep · saves ~{Math.floor(item.meal.prepTime * 0.8)} min
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
              ))}
            </div>
          </motion.div>

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

        <div className="checkout-grid__sidebar">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }} className="order-summary">
            <h2 className="order-summary__title">Order Summary</h2>
            <div className="order-summary__details">
              <div className="order-summary__row"><span>Subtotal</span><span>Rs.{cartTotal.toFixed(0)}</span></div>
              <div className="order-summary__row">
                <span>Platform fee</span><span className="order-summary__strikethrough">Rs.15</span>
              </div>
              <div className="order-summary__row order-summary__row--success">
                <span>Pre-order discount</span><span>-Rs.15</span>
              </div>
              <div className="order-summary__divider" />
              <div className="order-summary__row order-summary__row--total">
                <span>Total</span>
                <span className="order-summary__total-amount">Rs.{cartTotal.toFixed(0)}</span>
              </div>
            </div>

            <div className="time-saved-badge">
              <div className="time-saved-badge__content">
                <Zap className="icon" />
                <div>
                  <p className="time-saved-badge__time">~{totalTimeSaved} min saved</p>
                  <p className="time-saved-badge__description">Skip the queue with pre-order</p>
                </div>
              </div>
            </div>

            <Button onClick={handlePlaceOrder} disabled={isProcessing || cart.length === 0}
              className="order-summary__submit-button">
              {isProcessing ? (
                <><Loader2 className="icon icon--spinning" />
                  {selectedPayment === 'upi' ? 'Processing Payment...' : 'Placing Order...'}</>
              ) : (
                <>{selectedPayment === 'upi' ? 'Pay' : 'Place Order'} Rs.{cartTotal.toFixed(0)}</>
              )}
            </Button>

            <p className="order-summary__footer-text">
              {selectedPayment === 'upi' ? 'Secure payment powered by UPI' : 'Pay with cash when you pick up your order'}
            </p>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isProcessing && selectedPayment === 'upi' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="processing-overlay">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="processing-overlay__content">
              <div className="processing-overlay__spinner"><Loader2 className="icon icon--spinning" /></div>
              <h3 className="processing-overlay__title">Processing Payment</h3>
              <p className="processing-overlay__message">Please wait...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
