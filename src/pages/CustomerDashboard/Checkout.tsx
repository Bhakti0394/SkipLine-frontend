import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  CreditCard,
  Banknote,
  Trash2,
  Plus,
  Minus,
  Loader2,
  ChefHat,
  Zap
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { useSkipLine } from '../../customer-context/SkipLineContext';
import { mockTimeSlots } from '../../customer-data/mockData';
import '../../components/CustomerDashboard/styles/Checkout.scss';

type PaymentMethod = 'upi' | 'cash';

export default function Checkout() {
  const navigate = useNavigate();
  const {
    cart,
    cartTotal,
    removeFromCart,
    updateCartItem,
    clearCart,
    addOrder
  } = useSkipLine();

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [upiId, setUpiId] = useState('');

  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = cart.find(i => i.id === itemId);
    if (item) {
      const newQuantity = Math.max(1, Math.min(10, item.quantity + delta));
      updateCartItem(itemId, { quantity: newQuantity });
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    setIsProcessing(true);

    if (selectedPayment === 'upi') {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const createdOrders = cart.map((item, index) => {
      const slot = mockTimeSlots.find(s => s.id === item.pickupSlotId);
      const timeSaved = 15 + Math.floor(Math.random() * 10);
      const orderId = `ORD-${Math.floor(Math.random() * 9000) + 1000}`;
      const kitchenQueuePosition = index + 3;

      const orderData = {
        id: orderId,
        meal: item.meal.name,
        restaurant: item.meal.restaurant,
        image: item.meal.image,
        status: 'confirmed' as const,
        pickupTime: item.pickupTime || slot?.time || '12:30 PM',
        pickupSlotId: item.pickupSlotId,
        estimatedReady: `${item.meal.prepTime} min`,
        price: (item.meal.price + item.addOns.reduce((s, a) => s + a.price, 0)) * item.quantity,
        quantity: item.quantity,
        paymentStatus: selectedPayment === 'upi' ? 'paid' as const : 'cash' as const,
        paymentMethod: selectedPayment,
        addOns: item.addOns.map(a => a.name),
        spiceLevel: item.spiceLevel,
        specialInstructions: item.specialInstructions,
        timeSaved,
        kitchenQueuePosition,
        orderType: item.orderType ?? 'normal', // 🆕 carry through from cart item
      };

      addOrder(orderData);
      return orderData;
    });

    clearCart();
    setIsProcessing(false);

    navigate('/customer-dashboard/order-success', {
      state: {
        orders: createdOrders,
        paymentMethod: selectedPayment,
        total: cartTotal,
      }
    });
  };

  if (cart.length === 0) {
    return (
      <DashboardLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-cart"
        >
          <div className="empty-cart__icon">
            <ChefHat className="icon" />
          </div>
          <h2 className="empty-cart__title">Your cart is empty</h2>
          <p className="empty-cart__description">
            Add some delicious meals to get started!
          </p>
          <Button
            onClick={() => navigate('/customer-dashboard/browse')}
            className="empty-cart__button"
          >
            Browse Menu
          </Button>
        </motion.div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="checkout-header"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="checkout-header__back-button"
        >
          <ArrowLeft className="icon" />
        </Button>
        <div className="checkout-header__content">
          <h1 className="checkout-header__title">Checkout</h1>
          <p className="checkout-header__subtitle">
            {cart.length} item(s) in cart
          </p>
        </div>
      </motion.div>

      <div className="checkout-grid">
        {/* Left Column */}
        <div className="checkout-grid__main">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="cart-section"
          >
            <h2 className="cart-section__title">
              <ChefHat className="icon" />
              Your Order
            </h2>

            <div className="cart-items">
              {cart.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="cart-item"
                >
                  <img
                    src={item.meal.image}
                    alt={item.meal.name}
                    className="cart-item__image"
                  />

                  <div className="cart-item__details">
                    <h3 className="cart-item__name">{item.meal.name}</h3>
                    <p className="cart-item__restaurant">{item.meal.restaurant}</p>

                    <div className="cart-item__pickup-time">
                      <Clock className="icon" />
                      <span>Pickup: {item.pickupTime}</span>
                    </div>

                    {item.addOns.length > 0 && (
                      <p className="cart-item__addons">
                        +{item.addOns.map(a => a.name).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="cart-item__actions">
                    <span className="cart-item__price">
                      ₹{((item.meal.price + item.addOns.reduce((s, a) => s + a.price, 0)) * item.quantity).toFixed(0)}
                    </span>

                    <div className="quantity-controls">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="quantity-controls__button quantity-controls__button--minus"
                      >
                        <Minus className="icon" />
                      </motion.button>

                      <span className="quantity-controls__value">{item.quantity}</span>

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="quantity-controls__button quantity-controls__button--plus"
                      >
                        <Plus className="icon" />
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeFromCart(item.id)}
                        className="quantity-controls__button quantity-controls__button--delete"
                      >
                        <Trash2 className="icon" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Payment Method */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="payment-section"
          >
            <h2 className="payment-section__title">
              <CreditCard className="icon" />
              Payment Method
            </h2>

            <div className="payment-methods">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPayment('upi')}
                className={`payment-option ${selectedPayment === 'upi' ? 'payment-option--active' : ''}`}
              >
                <div className="payment-option__header">
                  <div className="payment-option__icon payment-option__icon--upi">G</div>
                  <div className="payment-option__info">
                    <p className="payment-option__name">Pay Now</p>
                    <p className="payment-option__method">UPI / GPay</p>
                  </div>
                </div>
                <p className="payment-option__benefit payment-option__benefit--success">
                  ✓ Instant confirmation
                </p>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPayment('cash')}
                className={`payment-option ${selectedPayment === 'cash' ? 'payment-option--active' : ''}`}
              >
                <div className="payment-option__header">
                  <div className="payment-option__icon payment-option__icon--cash">
                    <Banknote className="icon" />
                  </div>
                  <div className="payment-option__info">
                    <p className="payment-option__name">Cash</p>
                    <p className="payment-option__method">Pay at pickup</p>
                  </div>
                </div>
                <p className="payment-option__benefit">Pay when you collect</p>
              </motion.button>
            </div>

            {selectedPayment === 'upi' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="upi-input"
              >
                <label className="upi-input__label">
                  Enter UPI ID (optional for demo)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className="upi-input__field"
                />
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Right Column - Summary */}
        <div className="checkout-grid__sidebar">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="order-summary"
          >
            <h2 className="order-summary__title">Order Summary</h2>

            <div className="order-summary__details">
              <div className="order-summary__row">
                <span>Subtotal</span>
                <span>₹{cartTotal.toFixed(0)}</span>
              </div>
              <div className="order-summary__row">
                <span>Platform fee</span>
                <span className="order-summary__strikethrough">₹15</span>
              </div>
              <div className="order-summary__row order-summary__row--success">
                <span>Pre-order discount</span>
                <span>-₹15</span>
              </div>
              <div className="order-summary__divider" />
              <div className="order-summary__row order-summary__row--total">
                <span>Total</span>
                <span className="order-summary__total-amount">₹{cartTotal.toFixed(0)}</span>
              </div>
            </div>

            <div className="time-saved-badge">
              <div className="time-saved-badge__content">
                <Zap className="icon" />
                <div>
                  <p className="time-saved-badge__time">~20 min saved</p>
                  <p className="time-saved-badge__description">
                    Skip the queue with pre-order
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={isProcessing || cart.length === 0}
              className="order-summary__submit-button"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="icon icon--spinning" />
                  {selectedPayment === 'upi' ? 'Processing Payment...' : 'Placing Order...'}
                </>
              ) : (
                <>
                  {selectedPayment === 'upi' ? 'Pay' : 'Place Order'} ₹{cartTotal.toFixed(0)}
                </>
              )}
            </Button>

            <p className="order-summary__footer-text">
              {selectedPayment === 'upi'
                ? 'Secure payment powered by UPI'
                : 'Pay with cash when you pick up your order'
              }
            </p>
          </motion.div>
        </div>
      </div>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && selectedPayment === 'upi' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="processing-overlay"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="processing-overlay__content"
            >
              <div className="processing-overlay__spinner">
                <Loader2 className="icon icon--spinning" />
              </div>
              <h3 className="processing-overlay__title">Processing Payment</h3>
              <p className="processing-overlay__message">Please wait...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}