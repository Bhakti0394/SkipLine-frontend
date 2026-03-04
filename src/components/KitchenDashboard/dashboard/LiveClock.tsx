import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import '../styles/Liveclock.scss';

export function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours();
  const isLunchRush = hours >= 11 && hours <= 14;
  const isDinnerRush = hours >= 17 && hours <= 21;
  const isRushHour = isLunchRush || isDinnerRush;

  return (
    <div className="live-clock">
      <div className="time-container">
        <motion.div 
          className="time-display"
          key={time.getSeconds()}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
        >
          {time.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true 
          })}
        </motion.div>
        <div className="date-display">
          {time.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>
      </div>
      {isRushHour && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="rush-badge"
        >
          <span className="rush-indicator" />
          <span className="rush-text-full">
            {isLunchRush ? 'Lunch Rush' : 'Dinner Rush'}
          </span>
          <span className="rush-text-short">Rush</span>
        </motion.div>
      )}
    </div>
  );
}