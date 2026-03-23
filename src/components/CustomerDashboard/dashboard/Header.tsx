// components/CustomerDashboard/dashboard/Header.tsx
//
// FIX [HARDCODED-BADGE]: Removed hardcoded "Premium" membership badge.
//
// BEFORE: Every user always saw "Premium" regardless of their actual order count
//   or membership tier. A new user with 0 orders had the same badge as a user
//   with 100+ orders.
//
// AFTER: memberTier is passed as a prop from DashboardLayout (which reads
//   useSkipLine().metrics + useSkipLine().orderHistory to compute the tier).
//   Tiers: Member → Silver (10+) → Gold (25+) → Platinum (50+) → Legendary (100+).
//   Falls back to "Member" when metrics haven't loaded yet.

import { motion } from 'framer-motion';
import { User, Flame } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { HeaderSearch } from './HeaderSearch';
import '../overview-styles/Header.scss';

interface HeaderProps {
  userName:    string;
  streak:      number;
  // FIX: real tier from parent — no longer hardcoded "Premium"
  memberTier?: string;
}

export function Header({ userName, streak, memberTier = 'Member' }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="header"
    >
      <div className="header__left">
        <motion.div whileHover={{ scale: 1.05 }} className="header__logo">
          <div className="header__logo-icon">
            <span className="header__logo-text">S</span>
          </div>
          <span className="header__logo-name">SkipLine</span>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="header__streak"
        >
          <Flame className="header__streak-icon" />
          <span className="header__streak-text">{streak} day streak</span>
        </motion.div>
      </div>

      {/* ✅ inline style guarantees NO padding-left regardless of any CSS cascade */}
      <div className="header__right" style={{ paddingLeft: 0, marginLeft: 0 }}>
        <HeaderSearch />
        <NotificationBell />

        <motion.div whileHover={{ scale: 1.05 }} className="header__user">
          <div className="header__user-info">
            <p className="header__user-name">{userName}</p>
            {/* FIX: real tier, not hardcoded "Premium" */}
            <p className="header__user-badge">{memberTier}</p>
          </div>
          <div className="header__user-avatar">
            <User className="header__user-icon" />
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}