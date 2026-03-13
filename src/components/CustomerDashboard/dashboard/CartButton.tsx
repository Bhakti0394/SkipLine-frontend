import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSkipLine } from '../../../customer-context/SkipLineContext';
import '../overview-styles/Cartbutton.scss';

export function CartButton() {
  const navigate = useNavigate();
  const { cartItemsCount, cartTotal } = useSkipLine();

  if (cartItemsCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="cart-button-wrapper"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/customer-dashboard/checkout')}
          className="cart-button"
        >
          <div className="cart-button__left">
            <ShoppingCart className="cart-button__icon" />
            <span className="cart-button__text">Cart</span>
          </div>

          <div className="cart-button__right">
            <span className="cart-button__badge">{cartItemsCount}</span>
            <span className="cart-button__total">₹{cartTotal.toFixed(0)}</span>
          </div>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}