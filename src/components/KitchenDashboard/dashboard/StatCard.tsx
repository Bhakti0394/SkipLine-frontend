import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

type TrendInfo = {
  value: number;
  isPositive: boolean;
};

type StatVariant = 'default' | 'primary' | 'warning' | 'success';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: TrendInfo;
  variant?: StatVariant;
}

/* ---------------------------------- */
/* Styles                             */
/* ---------------------------------- */
const CARD_VARIANTS: Record<StatVariant, string> = {
  default: 'border-border',
  primary: 'border-accent/30 glow-accent',    // swapped border
  warning: 'border-primary/30 glow-primary',  // swapped border
  success: 'border-success/30',
};

const ICON_VARIANTS: Record<StatVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-accent/20 text-accent',        // swapped icon
  warning: 'bg-primary/20 text-primary',      // swapped icon
  success: 'bg-success/20 text-success',
};

/* ---------------------------------- */
/* Component                          */
/* ---------------------------------- */

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  const cardClasses = cn(
    'glass rounded-lg sm:rounded-xl p-3 sm:p-5 transition-all duration-300 hover:scale-[1.02] animate-scale-in',
    CARD_VARIANTS[variant]
  );

  const iconClasses = cn(
    'p-2 sm:p-3 rounded-lg shrink-0',
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
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>

          <p className="text-xl sm:text-3xl font-bold tracking-tight">
            {value}
          </p>

          {subtitle && (
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
