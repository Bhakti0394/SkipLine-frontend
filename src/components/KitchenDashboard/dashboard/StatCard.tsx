// ============================================================
// StatCard.tsx — File 1 look + File 2 fix (primary/warning colors corrected)
// ============================================================

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

type TrendInfo = {
  value: number;
  isPositive: boolean;
};

type StatVariant = 'default' | 'primary' | 'warning' | 'success';

interface StatCardProps {
  title:     string;
  value:     string | number;
  subtitle?: string;
  icon:      LucideIcon;
  trend?:    TrendInfo;
  variant?:  StatVariant;
}

// FIX (File 2): primary and warning border/icon colors were swapped in File 1.
// Corrected: primary = primary/indigo, warning = accent/amber
const CARD_VARIANTS: Record<StatVariant, string> = {
  default: 'border-border',
  primary: 'border-primary/30 glow-primary',
  warning: 'border-accent/30 glow-accent',
  success: 'border-success/30',
};

const ICON_VARIANTS: Record<StatVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/20 text-primary',
  warning: 'bg-accent/20 text-accent',
  success: 'bg-success/20 text-success',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  const cardClasses = cn(
    // CHANGED: sm:p-5 → sm:p-3 (was too tall at 100% zoom)
    'glass rounded-lg sm:rounded-xl p-3 sm:p-3 transition-all duration-300 hover:scale-[1.02] animate-scale-in',
    CARD_VARIANTS[variant]
  );

  const iconClasses = cn(
    // CHANGED: sm:p-3 → sm:p-2 (icon box was oversized)
    'p-2 sm:p-2 rounded-lg shrink-0',
    ICON_VARIANTS[variant]
  );

  const trendClasses = cn(
    'text-[10px] sm:text-xs font-medium flex items-center gap-1',
    trend?.isPositive ? 'text-success' : 'text-urgent'
  );

  return (
    <div className={cardClasses}>
      <div className="flex items-start justify-between gap-2">
        {/* Text Content */}
        <div className="space-y-0.5 min-w-0 flex-1">
          {/* CHANGED: sm:text-sm → sm:text-xs (title font was too large) */}
          <p className="text-xs font-medium text-muted-foreground truncate">
            {title}
          </p>

          {/* CHANGED: sm:text-3xl → sm:text-2xl (value was dominant/oversized) */}
          <p className="text-xl sm:text-2xl font-bold tracking-tight">
            {value}
          </p>

          {subtitle && (
            // CHANGED: sm:text-xs stays, removed extra spacing class
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {subtitle}
            </p>
          )}

          {trend && (
            <p className={trendClasses}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              <span className="hidden sm:inline">from last hour</span>
            </p>
          )}
        </div>

        {/* Icon */}
        <div className={iconClasses}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
    </div>
  );
}