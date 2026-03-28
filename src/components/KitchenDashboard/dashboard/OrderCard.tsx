// ============================================================
// src/components/KitchenDashboard/dashboard/OrderCard.tsx
// ============================================================
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Order, OrderStatus, ORDER_TYPE_BADGE } from '../../../kitchen-types/order';
import { StaffWorkloadDto } from '../../../kitchen-api/kitchenApi';
import {
  Clock, User, ChefHat, CheckCircle2,
  AlertTriangle, ChevronDown, PartyPopper,
} from 'lucide-react';
import { OrderTimer } from './OrderTimer';
import { useOrderTimer } from '../../../kitchen-hooks/useOrderTimer';

interface OrderCardProps {
  order:          Order;
  staff?:         StaffWorkloadDto[];
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onAssignChef?:  (orderId: string, chefId: string) => Promise<void>;
  countdown?:     number;
}

// ─── Cooking state ────────────────────────────────────────────────────────────
// Three visual states for cooking cards:
//
//  'cooking'  → amber  (still on track, has remaining prep time)
//  'done'     → green  (prep time elapsed, ready to plate — but NOT yet overdue)
//  'overdue'  → red    (past prep time SLA with a pickup deadline missed)
//
// FIX: 'done' state only fires when estimatedPrepTime > 0 AND eta === 0.
// Orders with unknown prep time (totalPrepMinutes === 0) have eta === 0
// from the start — without this guard they would immediately show the green
// "Ready to plate" banner before the chef had done anything.

type CookingState = 'cooking' | 'done' | 'overdue';

function getCookingState(
  eta:           number,
  isOverdue:     boolean,
  estimatedPrep: number,   // 0 means unknown — skip 'done' state
): CookingState {
  if (isOverdue) return 'overdue';
  if (estimatedPrep > 0 && eta === 0) return 'done';
  return 'cooking';
}

// ─── Card styles per cooking state ───────────────────────────────────────────

const cookingCardStyles: Record<CookingState, React.CSSProperties> = {
  cooking: {
    background: 'rgba(245, 158, 11, 0.10)',
    border:     '1px solid rgba(245, 158, 11, 0.40)',
  },
  done: {
    background: 'rgba(16, 185, 129, 0.18)',
    border:     '2px solid rgba(16, 185, 129, 0.80)',
    boxShadow:  '0 0 0 1px rgba(16,185,129,0.30), 0 0 20px rgba(16,185,129,0.18)',
  },
  overdue: {
    background: 'rgba(239, 68, 68, 0.16)',
    border:     '2px solid rgba(239, 68, 68, 0.80)',
    boxShadow:  '0 0 0 1px rgba(239,68,68,0.25), 0 0 20px rgba(239,68,68,0.14)',
  },
};

// ─── Banner per cooking state (done / overdue only) ───────────────────────────

const cookingBanners: Record<'done' | 'overdue', {
  style: React.CSSProperties;
  text:  string;
}> = {
  done: {
    style: {
      background:    'rgba(16, 185, 129, 0.25)',
      border:        '1px solid rgba(16, 185, 129, 0.60)',
      color:         '#34d399',
      borderRadius:  '0.375rem',
      padding:       '0.375rem 0.625rem',
      display:       'flex',
      alignItems:    'center',
      gap:           '0.375rem',
      fontSize:      '0.75rem',
      fontWeight:    700,
      letterSpacing: '0.01em',
    },
    text: '✓ Ready to plate — Mark Ready now!',
  },
  overdue: {
    style: {
      background:    'rgba(239, 68, 68, 0.22)',
      border:        '1px solid rgba(239, 68, 68, 0.65)',
      color:         '#fca5a5',
      borderRadius:  '0.375rem',
      padding:       '0.375rem 0.625rem',
      display:       'flex',
      alignItems:    'center',
      gap:           '0.375rem',
      fontSize:      '0.75rem',
      fontWeight:    700,
      letterSpacing: '0.01em',
      animation:     'pulse 1.5s ease-in-out infinite',
    },
    text: '⚠ Overdue — needs immediate attention!',
  },
};

// ─── Badge per cooking state ──────────────────────────────────────────────────

const cookingBadgeStyles: Record<CookingState, React.CSSProperties> = {
  cooking: { background: 'rgba(245, 158, 11, 0.20)', color: '#fbbf24' },
  done:    { background: 'rgba(16, 185, 129, 0.30)', color: '#34d399' },
  overdue: { background: 'rgba(239, 68, 68, 0.25)',  color: '#f87171' },
};

const cookingBadgeLabels: Record<CookingState, string> = {
  cooking: 'Cooking',
  done:    '✓ Done!',
  overdue: '⚠ Overdue',
};

// ─── Action button per cooking state ─────────────────────────────────────────

const cookingActionStyles: Record<CookingState, React.CSSProperties> = {
  cooking: {
    background: 'rgba(245, 158, 11, 0.22)',
    color:      '#fbbf24',
    border:     '1px solid rgba(245, 158, 11, 0.50)',
    fontWeight: 600,
  },
  done: {
    background: '#10b981',
    color:      '#ffffff',
    border:     'none',
    fontWeight: 700,
    boxShadow:  '0 0 12px rgba(16,185,129,0.50)',
  },
  overdue: {
    background: '#ef4444',
    color:      '#ffffff',
    border:     'none',
    fontWeight: 700,
    boxShadow:  '0 0 12px rgba(239,68,68,0.50)',
  },
};

const cookingActionLabels: Record<CookingState, string> = {
  cooking: 'Mark Ready',
  done:    '✓ Mark Ready',
  overdue: '⚠ Mark Ready Now',
};

// ─── Non-cooking status styles ────────────────────────────────────────────────

const statusStyles: Record<string, {
  cardStyle:  React.CSSProperties;
  badgeStyle: React.CSSProperties;
  label:      string;
  icon:       React.ElementType;
}> = {
  pending: {
    cardStyle:  { background: 'rgba(100, 116, 139, 0.12)', border: '1px solid rgba(100, 116, 139, 0.35)' },
    badgeStyle: { background: 'rgba(100, 116, 139, 0.25)', color: '#94a3b8' },
    label: 'Pending',
    icon:  Clock,
  },
  ready: {
    cardStyle:  { background: 'rgba(16, 185, 129, 0.10)', border: '1px solid rgba(16, 185, 129, 0.40)' },
    badgeStyle: { background: 'rgba(16, 185, 129, 0.20)', color: '#34d399' },
    label: 'Ready',
    icon:  CheckCircle2,
  },
  completed: {
    cardStyle:  { background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', opacity: 0.55 },
    badgeStyle: { background: 'rgba(34, 197, 94, 0.15)', color: '#86efac' },
    label: 'Completed',
    icon:  CheckCircle2,
  },
};

const nextStatusMap: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'cooking',
  cooking: 'ready',
  ready:   'completed',
};

interface ChefDropdownProps {
  assignedTo:      string | undefined;   // ← only what's needed
  assignableStaff: StaffWorkloadDto[];
  assigning:       boolean;
  onAssign:        (chefId: string) => void;
}

function ChefDropdown({ assignedTo, assignableStaff, assigning, onAssign }: ChefDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref} onClick={e => e.stopPropagation()}>
    
      <button
        className="flex items-center gap-1.5 w-full text-left text-xs px-2.5 py-1.5 rounded-md"
        style={{
          background: 'rgba(99, 102, 241, 0.12)',
          border:     '1px solid rgba(99, 102, 241, 0.30)',
          color:      '#a5b4fc',
          cursor:     assigning ? 'not-allowed' : 'pointer',
          opacity:    assigning ? 0.6 : 1,
        }}
        onClick={() => setOpen(p => !p)}
        disabled={assigning}
      >
        <ChefHat style={{ width: '0.75rem', height: '0.75rem', flexShrink: 0 }} />
        <span className="flex-1 truncate">
         {assigning ? 'Assigning…' : (assignedTo ?? 'Assign Chef')} 
        </span>
        <ChevronDown style={{
          width: '0.75rem', height: '0.75rem', flexShrink: 0,
          transform:  open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }} />
      </button>
      {open && (
        <div
          className="absolute z-20 left-0 right-0 mt-1 rounded-md overflow-hidden shadow-lg"
          style={{ background: 'rgba(15, 23, 42, 0.97)', border: '1px solid rgba(99, 102, 241, 0.25)', backdropFilter: 'blur(8px)' }}
        >
          {assignableStaff.length === 0 ? (
            <div className="text-xs text-muted-foreground px-3 py-2">No available staff</div>
          ) : assignableStaff.map(chef => {
            const isFull = chef.activeOrders >= chef.maxCapacity;
            return (
              <button
                key={chef.chefId}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => { setOpen(false); onAssign(chef.chefId); }}
                disabled={isFull}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: chef.status === 'available' ? '#34d399' : chef.status === 'busy' ? '#fbbf24' : '#94a3b8' }} />
                <span className="flex-1 truncate text-foreground/90">{chef.name}</span>
                <span className="text-[10px] shrink-0" style={{ color: isFull ? '#f87171' : '#94a3b8' }}>
                  {chef.activeOrders}/{chef.maxCapacity}{isFull && ' (Full)'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ─── Component ────────────────────────────────────────────────────────────────


export function OrderCard({
  order,
  staff = [],
  onStatusChange,
  onAssignChef,
  countdown,
}: OrderCardProps) {
const [actionPending, setActionPending] = useState(false);
  const [assigning,     setAssigning]     = useState(false);
  const [assignError,   setAssignError]   = useState<string | null>(null);


  const { eta, isOverdue } = useOrderTimer(order);

  const cookingState: CookingState = order.status === 'cooking'
    ? getCookingState(eta, isOverdue, order.estimatedPrepTime ?? 0)
    : 'cooking'; // unused for non-cooking cards

  // ── Order type badge — uses ORDER_TYPE_BADGE same as KanbanBoard ───────────
  // FIX: removed dead `priority` / `priorityStyles` code.
  //
  // BEFORE: read `(order as any).priority` — this field is never mapped from
  // OrderCardDto to Order in toFrontendOrder(), so it was always undefined.
  // `priorityStyles[undefined ?? 'normal']` always returned null. The entire
  // `priorityStyles` map (~80 lines), the strip-color logic, and the badge
  // render block were dead code that never fired — but the `(order as any)`
  // cast suppressed TypeScript's ability to catch this.
  //
  // AFTER: use ORDER_TYPE_BADGE[order.orderType] — the same lookup KanbanBoard
  // uses. This is the correct priority signal: express > normal > scheduled.
  const typeBadge = ORDER_TYPE_BADGE[order.orderType] ?? ORDER_TYPE_BADGE.normal;

  // ── Card style ─────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = order.status === 'cooking'
    ? cookingCardStyles[cookingState]
    : (statusStyles[order.status] ?? statusStyles.pending).cardStyle;

  // ── Status badge ──────────────────────────────────────────────────────────
  const badgeStyle: React.CSSProperties = order.status === 'cooking'
    ? cookingBadgeStyles[cookingState]
    : (statusStyles[order.status] ?? statusStyles.pending).badgeStyle;

  const badgeLabel = order.status === 'cooking'
    ? cookingBadgeLabels[cookingState]
    : (statusStyles[order.status] ?? statusStyles.pending).label;

  const StatusIcon = order.status === 'cooking'
    ? (cookingState === 'done' ? CheckCircle2 : cookingState === 'overdue' ? AlertTriangle : ChefHat)
    : (statusStyles[order.status] ?? statusStyles.pending).icon;

  // ── Action button ──────────────────────────────────────────────────────────
  const nextStatus = nextStatusMap[order.status] ?? null;

  const btnBaseStyle: React.CSSProperties = {
    fontSize:      '0.7rem',
    height:        '1.875rem',
    padding:       '0 0.875rem',
    borderRadius:  '0.375rem',
    cursor:        actionPending ? 'not-allowed' : 'pointer',
    transition:    'opacity 0.15s ease',
    display:       'inline-flex',
    alignItems:    'center',
    letterSpacing: '0.02em',
    whiteSpace:    'nowrap',
    opacity:       actionPending ? 0.6 : 1,
  };

  let btnStyle: React.CSSProperties;
  if (order.status === 'cooking') {
    btnStyle = { ...btnBaseStyle, ...cookingActionStyles[cookingState] };
  } else if (order.status === 'pending') {
    btnStyle = { ...btnBaseStyle, background: '#6366f1', color: '#ffffff', border: 'none', fontWeight: 600 };
  } else if (order.status === 'ready') {
    btnStyle = { ...btnBaseStyle, background: 'rgba(16,185,129,0.22)', color: '#34d399', border: '1px solid rgba(16,185,129,0.50)', fontWeight: 700 };
  } else {
    btnStyle = btnBaseStyle;
  }

  const actionLabel = order.status === 'cooking'
    ? (actionPending ? 'Updating…' : cookingActionLabels[cookingState])
    : order.status === 'pending' ? 'Start Cooking'
    : order.status === 'ready'   ? 'Done ✓'
    : null;

  // ── Countdown (ready) ──────────────────────────────────────────────────────
  const countdownUrgent = countdown !== undefined && countdown <= 5;
  const countdownStyle: React.CSSProperties = {
    fontSize:     '0.65rem',
    padding:      '0.125rem 0.5rem',
    borderRadius: '999px',
    fontWeight:   600,
    background:   countdownUrgent ? 'rgba(239, 68, 68, 0.20)' : 'rgba(16, 185, 129, 0.15)',
    color:        countdownUrgent ? '#f87171' : '#34d399',
    border:       `1px solid ${countdownUrgent ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.3)'}`,
    animation:    countdownUrgent ? 'pulse 1s infinite' : 'none',
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
 const handleAction = useCallback(async () => {
    if (!nextStatus || actionPending) return;
    if (order.status === 'cooking' && !order.assignedTo && !order.assignedChefId) return;
    // block scheduled pending orders from being started without a chef (lock parity with KanbanBoard)
    if (order.status === 'pending' && order.orderType === 'scheduled' && !order.assignedTo && !order.assignedChefId) return;
    setActionPending(true);
    try   { await onStatusChange(order.id, nextStatus); }
    finally { setActionPending(false); }
  }, [nextStatus, actionPending, onStatusChange, order.id, order.status, order.assignedTo, order.assignedChefId]);

const handleAssign = useCallback(async (chefId: string) => {
    if (!onAssignChef) return;
    setAssigning(true);
    setAssignError(null);
    try   { await onAssignChef(order.id, chefId); }
    catch (e: any) { setAssignError(e?.message ?? 'Assignment failed'); }
    finally { setAssigning(false); }
  }, [onAssignChef, order.id]);

  const showAssignChef  = order.status === 'pending' && staff.length > 0 && !!onAssignChef;
  const assignableStaff = staff.filter(s => s.onShift && s.status !== 'full');

  return (
    <div
      className="rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 transition-all duration-300 animate-slide-in-right backdrop-blur-[10px]"
      style={cardStyle}
    >
      {/* ── Cooking state banner (done / overdue only) ── */}
      {order.status === 'cooking' && cookingState !== 'cooking' && (
        <div style={cookingBanners[cookingState].style}>
          {cookingState === 'done'
            ? <PartyPopper style={{ width: '0.875rem', height: '0.875rem', flexShrink: 0 }} />
            : <AlertTriangle style={{ width: '0.875rem', height: '0.875rem', flexShrink: 0 }} />
          }
          {cookingBanners[cookingState].text}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-1.5" style={{ minWidth: 0 }}>

        {/* Left: order number + order type badge */}
        <div className="flex items-center gap-1.5 flex-1 overflow-hidden" style={{ minWidth: 0 }}>
          <span
            className="font-bold font-mono text-sm shrink-0"
            style={{ maxWidth: '10rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
            title={order.orderNumber}
          >
            {order.orderNumber}
          </span>

          {/* Order type badge — express/normal/scheduled, same as KanbanBoard */}
          <span style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           '0.18rem',
            padding:       '0.1rem 0.32rem',
            borderRadius:  '4px',
            fontSize:      '0.56rem',
            fontWeight:    700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            background:    typeBadge.bg,
            border:        typeBadge.border,
            color:         typeBadge.color,
            whiteSpace:    'nowrap',
            flexShrink:    0,
            userSelect:    'none',
          }}>
            <span style={{ fontSize: '0.6rem', lineHeight: 1 }}>{typeBadge.emoji}</span>
            {typeBadge.label}
          </span>
        </div>

        {/* Right: countdown + status badge */}
        <div className="flex items-center gap-1 shrink-0">
          {order.status === 'ready' && countdown !== undefined && (
            <span style={countdownStyle}>✓ {countdown}s</span>
          )}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
            style={badgeStyle}
          >
            <StatusIcon style={{ width: '0.65rem', height: '0.65rem', flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap' }}>{badgeLabel}</span>
          </div>
        </div>
      </div>

      {/* ── Customer & Pickup ── */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <User style={{ width: '0.7rem', height: '0.7rem' }} />
          <span className="truncate max-w-[120px]">{order.customerName}</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock style={{ width: '0.7rem', height: '0.7rem' }} />
          Pickup: {order.pickupTime}
        </span>
      </div>

      {/* ── Assign Chef dropdown — pending only ── */}
   {showAssignChef && (
        <>
          <ChefDropdown
            assignedTo={order.assignedTo}
            assigning={assigning}
            assignableStaff={assignableStaff}
            onAssign={handleAssign}
          />
          {assignError && (
            <span style={{ color: '#f87171', fontSize: '0.65rem', marginTop: '0.2rem', display: 'block' }}>
              ⚠ {assignError}
            </span>
          )}
        </>
      )}

      {/* ── Assigned chef badge — cooking only ── */}
      {order.status === 'cooking' && order.assignedTo && (
        <div
          className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md w-fit"
          style={{
            background: cookingState === 'done' ? 'rgba(16,185,129,0.15)' : cookingState === 'overdue' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)',
            border:     cookingState === 'done' ? '1px solid rgba(16,185,129,0.40)' : cookingState === 'overdue' ? '1px solid rgba(239,68,68,0.40)' : '1px solid rgba(245,158,11,0.25)',
            color:      cookingState === 'done' ? '#34d399' : cookingState === 'overdue' ? '#f87171' : '#fbbf24',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cookingState === 'done' ? '#34d399' : cookingState === 'overdue' ? '#f87171' : '#fbbf24' }} />
          <ChefHat style={{ width: '0.7rem', height: '0.7rem' }} />
          <span>{order.assignedTo}</span>
        </div>
      )}

      {/* ── Order items ── */}
      <div className="flex flex-col gap-1">
        {order.items.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-start gap-1.5 text-xs sm:text-sm">
              <span className="font-medium text-foreground/90 min-w-[20px]">{item.quantity}×</span>
              <span className="flex-1 min-w-0 truncate">{item.name}</span>
            </div>
          ))}
        {order.items.length > 3 && (
          <span className="text-[10px] text-muted-foreground">+{order.items.length - 3} more items</span>
        )}
      </div>

      {/* ── Timer block ── */}
      {order.status !== 'completed' && <OrderTimer order={order} />}

      {/* ── Action button ── */}
     {nextStatus && actionLabel && (
        <div className="flex items-center justify-end pt-1">
          <button
            style={{
              ...btnStyle,
              // FIX: visually disable when cooking + no chef assigned
              ...(order.status === 'cooking' && !order.assignedTo && !order.assignedChefId
                ? { opacity: 0.35, cursor: 'not-allowed' }
                : {}),
            }}
            onMouseEnter={e => { if (!actionPending) e.currentTarget.style.opacity = '0.80'; }}
            onMouseLeave={e => { if (!actionPending) e.currentTarget.style.opacity = '1'; }}
            onClick={handleAction}
            disabled={actionPending || (order.status === 'cooking' && !order.assignedTo && !order.assignedChefId)}
          >
            {/* FIX: show blocked label when no chef on cooking card */}
            {order.status === 'cooking' && !order.assignedTo && !order.assignedChefId
              ? '⚠ Assign chef first'
              : actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}