// ============================================================
// src/components/KitchenDashboard/dashboard/StatCard.tsx
// ============================================================

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

type TrendInfo = {
  value:      number;
  isPositive: boolean;
};

type StatVariant = 'default' | 'primary' | 'warning' | 'success';

interface StatCardProps {
  title:      string;
  value:      string | number;
  subtitle?:  string;
  icon:       LucideIcon;
  trend?:     TrendInfo;
  variant?:   StatVariant;
  onClick?:   () => void;
  ariaLabel?: string;
  /** When true shows a subtle "View history →" hint inside the card (Completed only) */
  historyHint?: boolean;
}

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
  onClick,
  ariaLabel,
  historyHint = false,
}: StatCardProps) {
  const isClickable = typeof onClick === 'function';

  const cardClasses = cn(
    'glass rounded-lg sm:rounded-xl p-3 sm:p-3 transition-all duration-300 animate-scale-in',
    CARD_VARIANTS[variant],
    isClickable
      ? 'cursor-pointer hover:scale-[1.03] hover:ring-1 hover:ring-white/10 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'
      : 'hover:scale-[1.02]',
  );

  const iconClasses = cn(
    'p-2 sm:p-2 rounded-lg shrink-0',
    ICON_VARIANTS[variant],
  );

  const trendClasses = cn(
    'text-[10px] sm:text-xs font-medium flex items-center gap-1',
    trend?.isPositive ? 'text-success' : 'text-urgent',
  );

  const inner = (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        {/* Text content */}
        <div className="space-y-0.5 min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-bold tracking-tight">
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

        {/* Icon — clean, no tap hint */}
        <div className={iconClasses}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      {/* History hint — only shown when historyHint=true (Completed card) */}
      {historyHint && (
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            '0.3rem',
            fontSize:       '0.65rem',
            fontWeight:     600,
            color:          'rgba(74,222,128,0.75)',
            letterSpacing:  '0.01em',
            paddingTop:     '0.125rem',
            borderTop:      '1px solid rgba(34,197,94,0.12)',
          }}
        >
          <span>📋</span>
          <span>View order history</span>
          <span style={{ marginLeft: 'auto', opacity: 0.6 }}>→</span>
        </div>
      )}
    </div>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        className={cn(cardClasses, 'text-left w-full block')}
        onClick={onClick}
        aria-label={ariaLabel ?? `View ${title}`}
      >
        {inner}
      </button>
    );
  }

  return <div className={cardClasses}>{inner}</div>;
}