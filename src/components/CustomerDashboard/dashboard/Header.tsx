import { motion } from 'framer-motion';
import { User, Flame } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { HeaderSearch } from './HeaderSearch';
import '../overview-styles/Header.scss';

interface HeaderProps {
  userName: string;
  streak: number;
}

export function Header({ userName, streak }: HeaderProps) {
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
        {/* HeaderClock removed — it was injecting width/padding causing the gap */}
        {/* Add it back only after confirming layout is fixed */}

        <HeaderSearch />
        <NotificationBell />

        <motion.div whileHover={{ scale: 1.05 }} className="header__user">
          <div className="header__user-info">
            <p className="header__user-name">{userName}</p>
            <p className="header__user-badge">Premium</p>
          </div>
          <div className="header__user-avatar">
            <User className="header__user-icon" />
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}

