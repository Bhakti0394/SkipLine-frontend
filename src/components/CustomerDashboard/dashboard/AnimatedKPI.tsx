import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import '../overview-styles/Animatedkpi.scss';

interface AnimatedKPIProps {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  variant?: 'primary' | 'accent' | 'success' | 'warning';
  delay?: number;
  decimals?: number;
}

export function AnimatedKPI({
  icon: Icon,
  label,
  value,
  suffix = '',
  prefix = '',
  trend,
  trendValue,
  variant = 'primary',
  delay = 0,
  decimals = 0,
}: AnimatedKPIProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Animated count-up effect
  useEffect(() => {
    if (hasAnimated) return;

    const duration = 1500; // ms
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * eased;
      
      setDisplayValue(Number(current.toFixed(decimals)));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setHasAnimated(true);
      }
    };

    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [value, delay, hasAnimated, decimals]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`animated-kpi animated-kpi--${variant}`}
    >
      {/* Gradient overlay */}
      <div className="animated-kpi__gradient-overlay" />
      
      <div className="animated-kpi__content">
        <div className="animated-kpi__header">
          <div className="animated-kpi__icon-wrapper">
            <Icon className="animated-kpi__icon" />
          </div>
          {trend && (
            <div className={`animated-kpi__trend animated-kpi__trend--${trend}`}>
              {trend === 'up' ? (
                <TrendingUp className="animated-kpi__trend-icon" />
              ) : (
                <TrendingDown className="animated-kpi__trend-icon" />
              )}
              {trendValue}
            </div>
          )}
        </div>

        <div className="animated-kpi__values">
          <p className="animated-kpi__value">
            {prefix}{displayValue.toLocaleString()}{suffix}
          </p>
          <p className="animated-kpi__label">{label}</p>
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="animated-kpi__glow-effect" />
    </motion.div>
  );
}