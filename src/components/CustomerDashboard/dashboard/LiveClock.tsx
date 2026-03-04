import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, Activity } from 'lucide-react';
import '../overview-styles/Liveclock.scss';

interface LiveClockProps {
  rushStatus: 'low' | 'medium' | 'high';
  activeOrderCount: number;
}

export function LiveClock({ rushStatus, activeOrderCount }: LiveClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  const rushLabels = {
    low: 'Low Rush',
    medium: 'Moderate Rush',
    high: 'Peak Hours',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="live-clock"
    >
      <div className="live-clock__gradient" />
      
      <div className="live-clock__content">
        {/* Time Display */}
        <div className="live-clock__time">
          <div className="live-clock__label">
            <Clock className="live-clock__icon" />
            <span>Live Time</span>
          </div>
          <div className="live-clock__digits">
            <span className="live-clock__digit">{String(displayHours).padStart(2, '0')}</span>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="live-clock__colon"
            >
              :
            </motion.span>
            <span className="live-clock__digit">{String(minutes).padStart(2, '0')}</span>
            <div className="live-clock__secondary">
              <span className="live-clock__seconds">{String(seconds).padStart(2, '0')}</span>
              <span className="live-clock__ampm">{ampm}</span>
            </div>
          </div>
        </div>

        {/* Rush Status */}
        <div className="live-clock__status">
          <motion.div
            animate={rushStatus === 'high' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`live-clock__badge live-clock__badge--${rushStatus}`}
          >
            {rushStatus === 'high' ? (
              <AlertTriangle className="live-clock__badge-icon" />
            ) : (
              <Activity className="live-clock__badge-icon" />
            )}
            <span>{rushLabels[rushStatus]}</span>
          </motion.div>
          
          <div className="live-clock__orders">
            <p className="live-clock__orders-label">Active Orders</p>
            <p className="live-clock__orders-count">{activeOrderCount}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}