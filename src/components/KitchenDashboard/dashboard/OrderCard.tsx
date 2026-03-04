import { useState } from 'react';
import { Order, OrderStatus } from '@/kitchen-types/order';
import { StaffWorkloadDto } from '@/kitchen-api/kitchenApi';
import { Clock, User, ChefHat, CheckCircle2, AlertTriangle, Flame, ChevronDown } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  staff: StaffWorkloadDto[];                          // ← pass staff list from board
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onAssignChef: (orderId: string, chefId: string) => Promise<void>;  // ← new
}

// ─── CARD COLOR = STATUS ─────────────────────────────────────────────────────
const statusStyles: Record<string, {
  cardStyle: React.CSSProperties;
  badgeStyle: React.CSSProperties;
  label: string;
  icon: React.ElementType;
}> = {
  pending: {
    cardStyle: {
      background: 'rgba(100, 116, 139, 0.12)',
      borderColor: 'rgba(100, 116, 139, 0.35)',
      borderWidth: '1px',
      borderStyle: 'solid',
    },
    badgeStyle: { background: 'rgba(100, 116, 139, 0.25)', color: '#94a3b8' },
    label: 'Pending',
    icon: Clock,
  },
  cooking: {
    cardStyle: {
      background: 'rgba(245, 158, 11, 0.10)',
      borderColor: 'rgba(245, 158, 11, 0.40)',
      borderWidth: '1px',
      borderStyle: 'solid',
    },
    badgeStyle: { background: 'rgba(245, 158, 11, 0.20)', color: '#fbbf24' },
    label: 'Cooking',
    icon: ChefHat,
  },
  ready: {
    cardStyle: {
      background: 'rgba(16, 185, 129, 0.10)',
      borderColor: 'rgba(16, 185, 129, 0.40)',
      borderWidth: '1px',
      borderStyle: 'solid',
    },
    badgeStyle: { background: 'rgba(16, 185, 129, 0.20)', color: '#34d399' },
    label: 'Ready',
    icon: CheckCircle2,
  },
  completed: {
    cardStyle: {
      background: 'rgba(255, 255, 255, 0.04)',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderWidth: '1px',
      borderStyle: 'solid',
      opacity: 0.55,
    },
    badgeStyle: { background: 'rgba(34, 197, 94, 0.15)', color: '#86efac' },
    label: 'Completed',
    icon: CheckCircle2,
  },
};

// ─── PRIORITY ─────────────────────────────────────────────────────────────────
const priorityStyles: Record<string, {
  stripColor: string;
  badgeStyle: React.CSSProperties;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
} | null> = {
  normal: null,
  high: {
    stripColor: '#f97316',
    badgeStyle: { background: 'rgba(249, 115, 22, 0.20)', color: '#fb923c' },
    label: 'High Priority',
    shortLabel: 'High',
    icon: AlertTriangle,
  },
  urgent: {
    stripColor: '#ef4444',
    badgeStyle: { background: 'rgba(239, 68, 68, 0.20)', color: '#f87171' },
    label: 'Urgent',
    shortLabel: 'Urgent',
    icon: Flame,
  },
};

// ─── ACTION BUTTON STYLES ─────────────────────────────────────────────────────
const actionButtonStyles: Record<string, React.CSSProperties> = {
  pending: { background: '#6366f1', color: '#ffffff', border: 'none', fontWeight: 600 },
  cooking: { background: 'rgba(245, 158, 11, 0.22)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.50)', fontWeight: 600 },
  ready:   { background: 'rgba(16, 185, 129, 0.22)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.50)', fontWeight: 700 },
};

export function OrderCard({ order, staff, onStatusChange, onAssignChef }: OrderCardProps) {
  const [assigning, setAssigning] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const statusCfg   = statusStyles[order.status] ?? statusStyles.pending;
  const priorityCfg = priorityStyles[order.priority];
  const StatusIcon  = statusCfg.icon;

  const getNextStatus = (): OrderStatus | null => {
    switch (order.status) {
      case 'pending':  return 'cooking';
      case 'cooking':  return 'ready';
      case 'ready':    return 'completed';
      default:         return null;
    }
  };

  const getActionLabel = () => {
    switch (order.status) {
      case 'pending':  return 'Start Cooking';
      case 'cooking':  return 'Mark Ready';
      case 'ready':    return 'Done ✔';
      default:         return null;
    }
  };

  const nextStatus  = getNextStatus();
  const actionLabel = getActionLabel();

  const cardStyle: React.CSSProperties = {
    ...statusCfg.cardStyle,
    ...(priorityCfg ? { borderLeftColor: priorityCfg.stripColor, borderLeftWidth: '3px' } : {}),
  };

  const btnStyle: React.CSSProperties = {
    ...(actionButtonStyles[order.status] ?? {}),
    fontSize: '0.7rem',
    height: '1.875rem',
    padding: '0 0.75rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
  };

  const handleAssign = async (chefId: string) => {
    setDropdownOpen(false);
    setAssigning(true);
    try {
      await onAssignChef(order.id, chefId);
    } finally {
      setAssigning(false);
    }
  };

  // Only show assign chef for pending/cooking orders & real backend orders (not sim-)
  const showAssignChef = order.status !== 'completed' && !order.id.startsWith('sim-');
  const availableStaff = staff.filter(s => s.loadPercent < 100);

  return (
    <div
      className="rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 transition-all duration-300 animate-slide-in-right backdrop-blur-[10px]"
      style={cardStyle}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <span className="text-sm sm:text-lg font-bold font-mono">{order.orderNumber}</span>
          {priorityCfg && (
            <div
              className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium shrink-0"
              style={priorityCfg.badgeStyle}
            >
              <priorityCfg.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline">{priorityCfg.label}</span>
              <span className="sm:hidden">{priorityCfg.shortLabel}</span>
            </div>
          )}
        </div>
        <div
          className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shrink-0"
          style={statusCfg.badgeStyle}
        >
          <StatusIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden xs:inline">{statusCfg.label}</span>
        </div>
      </div>

      {/* ── Customer & Pickup ── */}
      <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1 sm:gap-1.5">
          <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="truncate max-w-[100px] sm:max-w-none">{order.customerName}</span>
        </span>
        <span className="flex items-center gap-1 sm:gap-1.5">
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Pickup:</span> {order.pickupTime}
        </span>
      </div>

      {/* ── Assign Chef Row ── */}
      {showAssignChef && (
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            disabled={assigning}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.35rem 0.6rem',
              borderRadius: '0.375rem',
              fontSize: '0.72rem',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              color: order.assignedTo ? '#a5b4fc' : '#94a3b8',
              cursor: assigning ? 'not-allowed' : 'pointer',
              opacity: assigning ? 0.6 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <span className="flex items-center gap-1.5">
              <ChefHat className="w-3 h-3" />
              {assigning ? 'Assigning…' : (order.assignedTo ?? 'Assign Chef')}
            </span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 50,
                background: '#1e1e2e',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              {availableStaff.length === 0 ? (
                <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                  No available staff
                </div>
              ) : (
                availableStaff.map(chef => (
                  <button
                    key={chef.chefId}
                    onClick={() => handleAssign(chef.chefId)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.72rem',
                      background: 'transparent',
                      border: 'none',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{chef.name}</span>
                    <span style={{
                      fontSize: '0.65rem',
                      color: chef.loadPercent >= 75 ? '#fb923c' : '#34d399',
                      background: chef.loadPercent >= 75 ? 'rgba(249,115,22,0.15)' : 'rgba(16,185,129,0.15)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '0.25rem',
                    }}>
                      {chef.activeOrders}/{chef.maxCapacity}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Order Items ── */}
      <div className="flex flex-col gap-1 sm:gap-1.5">
        {order.items.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <span className="font-medium text-foreground/90 min-w-[18px] sm:min-w-[20px]">
              {item.quantity}×
            </span>
            <div className="flex-1 min-w-0">
              <span className="truncate block">{item.name}</span>
              {item.notes && (
                <span className="block text-[10px] sm:text-xs text-accent mt-0.5 truncate">
                  Note: {item.notes}
                </span>
              )}
            </div>
          </div>
        ))}
        {order.items.length > 3 && (
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            +{order.items.length - 3} more items
          </span>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 gap-2">
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          Est. {order.estimatedPrepTime}m
        </span>
        {nextStatus && actionLabel && (
          <button
            style={btnStyle}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            onClick={() => onStatusChange(order.id, nextStatus)}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}