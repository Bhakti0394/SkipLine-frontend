// ============================================================
// OrderCard.tsx — File 1 look (inline styles + Tailwind) + File 2 backend
// ============================================================

import { useState, useCallback } from 'react';
import { Order, OrderStatus } from '../../../kitchen-types/order';
import { StaffWorkloadDto } from '../../../kitchen-api/kitchenApi';
import {
  Clock, User, ChefHat, CheckCircle2,
  AlertTriangle, Flame, ChevronDown,
} from 'lucide-react';

interface OrderCardProps {
  order:          Order;
  staff?:         StaffWorkloadDto[];
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onAssignChef?:  (orderId: string, chefId: string) => Promise<void>;
  countdown?:     number;
}

// ─── Status styles (File 1) ───────────────────────────────────────────────────

const statusStyles: Record<string, {
  cardStyle:  React.CSSProperties;
  badgeStyle: React.CSSProperties;
  label:      string;
  icon:       React.ElementType;
}> = {
  pending: {
    cardStyle: {
      background:   'rgba(100, 116, 139, 0.12)',
      borderColor:  'rgba(100, 116, 139, 0.35)',
      borderWidth:  '1px',
      borderStyle:  'solid',
    },
    badgeStyle: { background: 'rgba(100, 116, 139, 0.25)', color: '#94a3b8' },
    label: 'Pending',
    icon:  Clock,
  },
  cooking: {
    cardStyle: {
      background:   'rgba(245, 158, 11, 0.10)',
      borderColor:  'rgba(245, 158, 11, 0.40)',
      borderWidth:  '1px',
      borderStyle:  'solid',
    },
    badgeStyle: { background: 'rgba(245, 158, 11, 0.20)', color: '#fbbf24' },
    label: 'Cooking',
    icon:  ChefHat,
  },
  ready: {
    cardStyle: {
      background:   'rgba(16, 185, 129, 0.10)',
      borderColor:  'rgba(16, 185, 129, 0.40)',
      borderWidth:  '1px',
      borderStyle:  'solid',
    },
    badgeStyle: { background: 'rgba(16, 185, 129, 0.20)', color: '#34d399' },
    label: 'Ready',
    icon:  CheckCircle2,
  },
  completed: {
    cardStyle: {
      background:   'rgba(255, 255, 255, 0.04)',
      borderColor:  'rgba(255, 255, 255, 0.08)',
      borderWidth:  '1px',
      borderStyle:  'solid',
      opacity:      0.55,
    },
    badgeStyle: { background: 'rgba(34, 197, 94, 0.15)', color: '#86efac' },
    label: 'Completed',
    icon:  CheckCircle2,
  },
};

// ─── Priority styles (File 1) ─────────────────────────────────────────────────

const priorityStyles: Record<string, {
  stripColor:  string;
  badgeStyle:  React.CSSProperties;
  label:       string;
  shortLabel:  string;
  icon:        React.ElementType;
} | null> = {
  normal: null,
  high: {
    stripColor: '#f97316',
    badgeStyle: { background: 'rgba(249, 115, 22, 0.20)', color: '#fb923c' },
    label: 'High Priority', shortLabel: 'High', icon: AlertTriangle,
  },
  urgent: {
    stripColor: '#ef4444',
    badgeStyle: { background: 'rgba(239, 68, 68, 0.20)', color: '#f87171' },
    label: 'Urgent', shortLabel: 'Urgent', icon: Flame,
  },
};

// ─── Action button styles (File 1) ────────────────────────────────────────────

const actionButtonStyles: Record<string, React.CSSProperties> = {
  pending:  { background: '#6366f1', color: '#ffffff', border: 'none', fontWeight: 600 },
  cooking:  { background: 'rgba(245, 158, 11, 0.22)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.50)', fontWeight: 600 },
  ready:    { background: 'rgba(16, 185, 129, 0.22)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.50)', fontWeight: 700 },
};

// ─── Status / action maps (File 2) ───────────────────────────────────────────

const nextStatusMap: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'cooking',
  cooking: 'ready',
  ready:   'completed',
};

const actionLabelMap: Partial<Record<OrderStatus, string>> = {
  pending: 'Start Cooking',
  cooking: 'Mark Ready',
  ready:   'Done ✓',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderCard({
  order,
  staff = [],
  onStatusChange,
  onAssignChef,
  countdown,
}: OrderCardProps) {
  // File 2: local async-pending states
  const [actionPending, setActionPending] = useState(false);
  const [assigning,     setAssigning]     = useState(false);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);

  const statusCfg   = statusStyles[order.status] ?? statusStyles.pending;
  const priorityCfg = priorityStyles[order.priority] ?? null;
  const StatusIcon  = statusCfg.icon;

  const nextStatus  = nextStatusMap[order.status]  ?? null;
  const actionLabel = actionLabelMap[order.status] ?? null;

  // File 2: overdue detection for accent border
  const isOverdue = order.status === 'cooking'
    && !!order.startedAt
    && (Date.now() - new Date(order.startedAt).getTime()) / 60_000 > (order.estimatedPrepTime ?? 999);

  // Card style = File 1 status color + priority left-strip + overdue red override
  const cardStyle: React.CSSProperties = {
    ...statusCfg.cardStyle,
    ...(priorityCfg
      ? { borderLeftColor: priorityCfg.stripColor, borderLeftWidth: '3px' }
      : {}),
    // File 2: overdue override — thicker red left strip
    ...(isOverdue
      ? { borderLeftColor: '#ef4444', borderLeftWidth: '3px' }
      : {}),
  };

  const btnStyle: React.CSSProperties = {
    ...(actionButtonStyles[order.status] ?? {}),
    fontSize:      '0.7rem',
    height:        '1.875rem',
    padding:       '0 0.75rem',
    borderRadius:  '0.375rem',
    cursor:        actionPending ? 'not-allowed' : 'pointer',
    transition:    'opacity 0.15s ease',
    display:       'inline-flex',
    alignItems:    'center',
    letterSpacing: '0.01em',
    whiteSpace:    'nowrap',
    opacity:       actionPending ? 0.6 : 1,
  };

  // File 2: countdown styling
  const countdownUrgent = countdown !== undefined && countdown <= 5;
  const countdownStyle: React.CSSProperties = {
    fontSize:       '0.65rem',
    padding:        '0.125rem 0.5rem',
    borderRadius:   '999px',
    fontWeight:     600,
    background:     countdownUrgent ? 'rgba(239, 68, 68, 0.20)' : 'rgba(16, 185, 129, 0.15)',
    color:          countdownUrgent ? '#f87171' : '#34d399',
    border:         `1px solid ${countdownUrgent ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.3)'}`,
    animation:      countdownUrgent ? 'pulse 1s infinite' : 'none',
  };

  // File 2: async action handler
  const handleAction = useCallback(async () => {
    if (!nextStatus || actionPending) return;
    setActionPending(true);
    try   { await onStatusChange(order.id, nextStatus); }
    finally { setActionPending(false); }
  }, [nextStatus, actionPending, onStatusChange, order.id]);

  // File 2: async chef assign handler
  const handleAssign = useCallback(async (chefId: string) => {
    if (!onAssignChef) return;
    setDropdownOpen(false);
    setAssigning(true);
    try   { await onAssignChef(order.id, chefId); }
    finally { setAssigning(false); }
  }, [onAssignChef, order.id]);

  // File 2: chef dropdown data
  const showAssignChef  = order.status === 'pending' && staff.length > 0 && !!onAssignChef;
  const assignableStaff = staff.filter(s => s.onShift && s.status !== 'full');

  return (
    <div
      className="rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 transition-all duration-300 animate-slide-in-right backdrop-blur-[10px]"
      style={cardStyle}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <span className="text-sm sm:text-lg font-bold font-mono">{order.orderNumber}</span>

          {/* Priority badge — high or urgent only */}
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

        <div className="flex items-center gap-1.5">
          {/* File 2: ready countdown badge */}
          {order.status === 'ready' && countdown !== undefined && (
            <span style={countdownStyle} title="Auto-completes when countdown reaches 0">
              ✓ {countdown}s
            </span>
          )}

          {/* Status badge */}
          <div
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shrink-0"
            style={statusCfg.badgeStyle}
          >
            <StatusIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">{statusCfg.label}</span>
          </div>
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

      {/* ── Assign Chef dropdown — pending only (File 2 data, File 1 inline style) ── */}
      {showAssignChef && (
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            className="flex items-center gap-1.5 w-full text-left text-xs px-2.5 py-1.5 rounded-md transition-opacity"
            style={{
              background:   'rgba(99, 102, 241, 0.12)',
              border:       '1px solid rgba(99, 102, 241, 0.30)',
              color:        '#a5b4fc',
              cursor:       assigning ? 'not-allowed' : 'pointer',
              opacity:      assigning ? 0.6 : 1,
            }}
            onClick={() => setDropdownOpen(prev => !prev)}
            disabled={assigning}
          >
            <ChefHat className="w-3 h-3 shrink-0" />
            <span className="flex-1 truncate">
              {assigning ? 'Assigning…' : (order.assignedTo ?? 'Assign Chef')}
            </span>
            <ChevronDown
              className="w-3 h-3 shrink-0 transition-transform"
              style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {dropdownOpen && (
            <div
              className="absolute z-20 left-0 right-0 mt-1 rounded-md overflow-hidden shadow-lg"
              style={{
                background:  'rgba(15, 23, 42, 0.95)',
                border:      '1px solid rgba(99, 102, 241, 0.25)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {assignableStaff.length === 0 ? (
                <div className="text-xs text-muted-foreground px-3 py-2">No available staff</div>
              ) : (
                assignableStaff.map(chef => {
                  const isFull = chef.activeOrders >= chef.maxCapacity;
                  return (
                    <button
                      key={chef.chefId}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleAssign(chef.chefId)}
                      disabled={isFull}
                    >
                      {/* Status dot */}
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background: chef.status === 'available'
                            ? '#34d399'
                            : chef.status === 'busy' ? '#fbbf24' : '#94a3b8',
                        }}
                      />
                      <span className="flex-1 truncate text-foreground/90">{chef.name}</span>
                      <span
                        className="text-[10px] shrink-0"
                        style={{ color: isFull ? '#f87171' : '#94a3b8' }}
                      >
                        {chef.activeOrders}/{chef.maxCapacity}
                        {isFull && ' (Full)'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* File 2: assigned chef badge on cooking cards */}
      {order.status === 'cooking' && order.assignedTo && (
        <div
          className="flex items-center gap-1.5 text-[10px] sm:text-xs px-2 py-1 rounded-md w-fit"
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border:     '1px solid rgba(245, 158, 11, 0.25)',
            color:      '#fbbf24',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#fbbf24' }}
          />
          <ChefHat className="w-3 h-3" />
          <span>{order.assignedTo}</span>
        </div>
      )}

      {/* ── Order Items (File 1) ── */}
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

      {/* ── Footer (File 1 style, File 2 async) ── */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 gap-2">
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          Est. {order.estimatedPrepTime}m
          {/* File 2: overdue warning */}
          {isOverdue && (
            <span
              className="ml-1.5 text-[10px] font-semibold"
              style={{ color: '#f87171' }}
            >
              ⚠ Overdue
            </span>
          )}
        </span>

        {nextStatus && actionLabel && (
          <button
            style={btnStyle}
            onMouseEnter={e => { if (!actionPending) e.currentTarget.style.opacity = '0.75'; }}
            onMouseLeave={e => { if (!actionPending) e.currentTarget.style.opacity = '1'; }}
            onClick={handleAction}
            disabled={actionPending}
          >
            {actionPending ? 'Updating…' : actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}