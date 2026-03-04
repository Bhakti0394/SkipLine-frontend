import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import '../overview-styles/Headerclock.scss';

export function HeaderClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="header-clock"
    >
      <Clock className="header-clock__icon" />
      <div className="header-clock__time">
        <span className="header-clock__hours">
          {String(displayHours).padStart(2, '0')}
        </span>
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="header-clock__colon"
        >
          :
        </motion.span>
        <span className="header-clock__minutes">
          {String(minutes).padStart(2, '0')}
        </span>
        <span className="header-clock__ampm">{ampm}</span>
      </div>
    </motion.div>
  );
}