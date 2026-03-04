import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  Clock,
  Heart,
  User,
  Settings,
} from 'lucide-react';
import '../overview-styles/Navigation.scss';

const navItems = [
  { path: '/customer-dashboard/overview', label: 'Overview', icon: LayoutDashboard },
  { path: '/customer-dashboard/browse', label: 'Browse Menu', icon: UtensilsCrossed },
  { path: '/customer-dashboard/orders', label: 'My Orders', icon: ShoppingBag },
  { path: '/customer-dashboard/history', label: 'Order History', icon: Clock },
  { path: '/customer-dashboard/favorites', label: 'Favorites', icon: Heart },
  { path: '/customer-dashboard/profile', label: 'Profile', icon: User },
  { path: '/customer-dashboard/settings', label: 'Settings', icon: Settings },
];

export function Navigation() {
  const location = useLocation();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="navigation"
    >
      <div className="navigation__container">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="navigation__link"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`navigation__item ${isActive ? 'navigation__item--active' : ''}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="navigation__active-bg"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="navigation__content">
                  <Icon className="navigation__icon" />
                  <span className="navigation__label">{item.label}</span>
                </span>
              </motion.div>
            </NavLink>
          );
        })}
      </div>
    </motion.nav>
  );
}