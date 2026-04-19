// ============================================================
// src/components/KitchenDashboard/dashboard/KanbanBoard.tsx
// ============================================================

import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  DragDropContext, Droppable, Draggable,
  DropResult, DragStart,
} from '@hello-pangea/dnd';

import { Clock, ChefHat, CheckCircle2, User, Lock, Calendar, AlertTriangle } from 'lucide-react';
import { OrderTimer } from './OrderTimer';
import {
  Order, OrderStatus, OrderType,
  ORDER_TYPE_WEIGHT, ORDER_TYPE_BADGE,
} from '../../../kitchen-types/order';
import { StaffWorkloadDto } from '../../../kitchen-api/kitchenApi';
import { canTransition, BackendOrderStatus } from '../../../kitchen-hooks/Capacityengine';
import { useOrderTimer } from '../../../kitchen-hooks/useOrderTimer';
import { toast } from 'sonner';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import '../styles/Kanbanboard.scss';

// ── Keyframe animations ────────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes dotPulse {
    0%, 100% { opacity: 1;   transform: scale(1);    }
    50%       { opacity: 0.4; transform: scale(0.65); }
  }
  @keyframes scheduledGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(110, 231, 183, 0.0); }
    50%       { box-shadow: 0 0 0 3px rgba(110, 231, 183, 0.15); }
  }
  @keyframes overduePulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.0); }
    50%       { box-shadow: 0 0 0 4px rgba(220,38,38,0.18); }
  }
`;

// ── Toast dedup ────────────────────────────────────────────────────────────────

const TOAST_ID = 'kitchen-drag-error';
let _lastMsg = '';
let _lastAt  = 0;

function fireToast(message: string, title = 'Invalid move') {
  const now = Date.now();
  if (_lastMsg === message && now - _lastAt < 2000) return;
  _lastMsg = message; _lastAt = now;
  toast.error(title, { id: TOAST_ID, description: message, duration: 2500 });
}

// ── Transition helpers ─────────────────────────────────────────────────────────

const toBackend: Record<OrderStatus, BackendOrderStatus> = {
  pending: 'PENDING', cooking: 'COOKING', ready: 'READY', completed: 'COMPLETED',
};

function isValidDrop(from: OrderStatus, to: OrderStatus): boolean {
  return canTransition(toBackend[from], toBackend[to]);
}

function getTransitionError(from: OrderStatus, to: OrderStatus): string {
  if (from === 'pending'   && to === 'ready')   return 'Orders must go through Cooking before Ready.';
  if (from === 'ready'     && to === 'cooking') return 'Ready orders cannot move backwards.';
  if (from === 'ready'     && to === 'pending') return 'Ready orders cannot return to Queue.';
  if (from === 'cooking'   && to === 'pending') return 'Cooking orders cannot return to Queue.';
  if (from === 'completed')                     return 'Completed orders cannot be moved.';
  return 'That move is not allowed.';
}

function isScheduledAndLocked(order: Order): boolean {
  // Locked only when NEITHER chefId NOR name is present.
  // If backend sends one but not the other (partial response),
  // treat the order as assigned to prevent false lock state.
  const hasChef = !!(order.assignedChefId || order.assignedTo);
  return (
    order.orderType === 'scheduled' &&
    order.status    === 'pending'   &&
    !hasChef
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function OrderTypeBadge({ orderType }: { orderType: OrderType }) {
  const cfg = ORDER_TYPE_BADGE[orderType] ?? ORDER_TYPE_BADGE.normal;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.18rem',
      padding: '0.1rem 0.32rem', borderRadius: '4px',
      fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
      background: cfg.bg, border: cfg.border, color: cfg.color,
      whiteSpace: 'nowrap' as const, flexShrink: 0, userSelect: 'none' as const,
    }}>
      <span style={{ fontSize: '0.58rem', lineHeight: 1 }}>{cfg.emoji}</span>
      {cfg.label}
    </span>
  );
}

function ScheduledLockBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.22rem',
      padding: '0.1rem 0.35rem', borderRadius: '4px',
      fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
      background: 'rgba(16,185,129,0.08)',
      border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7',
      whiteSpace: 'nowrap' as const, flexShrink: 0, userSelect: 'none' as const,
    }}>
      <Lock style={{ width: '0.55rem', height: '0.55rem', flexShrink: 0 }} />
      Pre-booked
    </span>
  );
}

function ScheduledInfoBanner({ pickupTime }: { pickupTime: string }) {
  const pickupLabel = (!pickupTime || pickupTime === 'TBD' || pickupTime === '—')
    ? 'tomorrow'
    : pickupTime;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.4rem',
      padding: '0.35rem 0.5rem', borderRadius: '0.375rem',
      background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.20)',
      fontSize: '0.64rem', color: 'rgba(110,231,183,0.75)', lineHeight: 1.4,
    }}>
      <Calendar style={{ width: '0.7rem', height: '0.7rem', flexShrink: 0, marginTop: '0.05rem' }} />
      <span>
        Pre-booked for <strong style={{ color: '#6ee7b7' }}>{pickupLabel}</strong>.
        Assign a chef to release into cooking.
      </span>
    </div>
  );
}

// ── CookingState ───────────────────────────────────────────────────────────────

type CookingState = 'cooking' | 'overdue';

const COOKING_CARD_STYLE: Record<CookingState, React.CSSProperties> = {
  cooking: {
    background:  'rgba(245,158,11,0.06)',
    border:      '1.5px solid rgba(245,158,11,0.22)',
    borderLeft:  '3px solid #d97706',
  },
  overdue: {
    background:  'rgba(220,38,38,0.08)',
    border:      '2px solid rgba(220,38,38,0.50)',
    borderLeft:  '4px solid #dc2626',
    boxShadow:   '0 0 0 1px rgba(220,38,38,0.12)',
    animation:   'overduePulse 2s ease-in-out infinite',
  },
};

const COOKING_CHEF_STYLE: Record<CookingState, React.CSSProperties> = {
  cooking: {
    background: 'rgba(245,158,11,0.08)',
    border:     '1px solid rgba(245,158,11,0.18)',
    color:      '#a16207',
  },
  overdue: {
    background: 'rgba(220,38,38,0.08)',
    border:     '1px solid rgba(220,38,38,0.22)',
    color:      '#991b1b',
  },
};

// ── CookingCardInner ───────────────────────────────────────────────────────────

interface CookingCardInnerProps {
  order:           Order;
  isPending:       boolean;
  assignableChefs: StaffWorkloadDto[];
  onAction:        () => void;
  onChefChange:    (value: string) => void;
  onStateChange:   (orderId: string, state: CookingState | undefined) => void;
}

function CookingCardInner({
  order, isPending, assignableChefs, onAction, onChefChange, onStateChange,
}: CookingCardInnerProps) {
  const { isOverdue, eta } = useOrderTimer(order);

  const state: CookingState = isOverdue ? 'overdue' : 'cooking';

  useEffect(() => {
    onStateChange(order.id, state);
    return () => { onStateChange(order.id, undefined); };
  }, [state, order.id, onStateChange]);

  const cardStyle = COOKING_CARD_STYLE[state];
  const chefStyle = COOKING_CHEF_STYLE[state];

  const hasChef = !!(order.assignedChefId || order.assignedTo);

  const isStillCooking  = !isOverdue && eta > 0;
  const isButtonBlocked = isPending || !hasChef || isStillCooking;

  const btnStyle: React.CSSProperties = (() => {
    if (isPending) return {
      background: 'rgba(100,116,139,0.12)',
      color:      'rgba(148,163,184,0.50)',
      border:     '1px solid rgba(100,116,139,0.20)',
      fontWeight: 600, cursor: 'not-allowed',
    };
    if (!hasChef) return {
      background: 'rgba(239,68,68,0.08)',
      color:      'rgba(248,113,113,0.60)',
      border:     '1px solid rgba(239,68,68,0.20)',
      fontWeight: 600, cursor: 'not-allowed',
    };
    if (isStillCooking) return {
      background: 'rgba(100,116,139,0.10)',
      color:      'rgba(148,163,184,0.40)',
      border:     '1px solid rgba(100,116,139,0.15)',
      fontWeight: 600, cursor: 'not-allowed',
    };
    return {
      background: '#dc2626',
      color:      '#ffffff',
      border:     'none',
      fontWeight: 700,
      boxShadow:  '0 2px 8px rgba(220,38,38,0.30)',
      cursor:     'pointer',
    };
  })();

  const btnLabel = isPending
    ? 'Updating…'
    : !hasChef
    ? '⚠ Assign a chef first'
    : isStillCooking
    ? `⏳ Cooking… wait for timer`
    : '⚠ Mark Ready Now';

  return (
    <div
      className={`ck-card ck-card--${state}`}
      style={{
        ...cardStyle,
        borderRadius:  '0.5rem',
        padding:       '0.60rem 0.70rem',
        display:       'flex',
        flexDirection: 'column',
        gap:           '0.38rem',
        minWidth:      0,
      }}
    >
      {/* Row 1: Order number + type badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
        <span
          style={{
            fontFamily:  'monospace', fontWeight: 700, fontSize: '0.75rem',
            overflow:    'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex:        '1 1 0', minWidth: 0, color: 'rgba(241,245,249,0.95)',
          }}
          title={order.orderNumber}
        >
          {order.orderNumber}
        </span>
        <OrderTypeBadge orderType={order.orderType ?? 'normal'} />
      </div>

      {/* Row 2: Customer • Pickup time */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.22rem',
        fontSize: '0.66rem', color: 'rgba(148,163,184,0.85)', minWidth: 0,
      }}>
        <User style={{ width: '0.65rem', height: '0.65rem', flexShrink: 0 }} />
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontWeight: 500, flex: '1 1 0', minWidth: 0,
        }}>
          {order.customerName}
        </span>
        <span style={{ opacity: 0.30, flexShrink: 0, margin: '0 0.08rem' }}>•</span>
        <Clock style={{ width: '0.6rem', height: '0.6rem', flexShrink: 0, opacity: 0.55 }} />
        {order.pickupTime === 'ASAP' ? (
          <span style={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.60rem', fontWeight: 700, color: '#fb923c', letterSpacing: '0.03em' }}>ASAP</span>
        ) : order.pickupTime === 'TBD' || !order.pickupTime ? (
          <span style={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.60rem', fontWeight: 600,
            color: order.orderType === 'scheduled' ? '#6ee7b7' : 'rgba(148,163,184,0.50)' }}>
            {order.orderType === 'scheduled' ? 'Tomorrow' : 'TBD'}
          </span>
        ) : (
          <span style={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.64rem' }}>{order.pickupTime}</span>
        )}
      </div>

      {/* Row 3: Items (max 3) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.14rem' }}>
        {order.items.slice(0, 3).map((item) => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'baseline', gap: '0.28rem',
            fontSize: '0.72rem', minWidth: 0,
          }}>
            <span style={{
              fontWeight: 600, flexShrink: 0,
              color: 'rgba(148,163,184,0.60)', minWidth: '1rem',
            }}>
              {item.quantity}×
            </span>
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: 'rgba(241,245,249,0.90)', minWidth: 0,
            }}>
              {item.name}
            </span>
          </div>
        ))}
        {order.items.length > 3 && (
          <span style={{ fontSize: '0.60rem', color: 'rgba(148,163,184,0.50)' }}>
            +{order.items.length - 3} more
          </span>
        )}
      </div>

      {/* Row 4: Chef chip OR warning + assign dropdown */}
      {hasChef ? (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.28rem',
          padding: '0.18rem 0.45rem', borderRadius: '0.3rem',
          fontSize: '0.65rem', fontWeight: 500,
          ...chefStyle,
          alignSelf: 'flex-start', maxWidth: '100%', overflow: 'hidden',
        }}>
          <ChefHat style={{ width: '0.6rem', height: '0.6rem', flexShrink: 0, opacity: 0.75 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.assignedTo ?? order.assignedChefId}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.22rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.28rem',
            padding: '0.18rem 0.45rem', borderRadius: '0.3rem',
            fontSize: '0.65rem', fontWeight: 600,
            background: 'rgba(220,38,38,0.10)',
            border: '1px solid rgba(220,38,38,0.30)',
            color: '#f87171',
            alignSelf: 'flex-start',
          }}>
            <AlertTriangle style={{ width: '0.6rem', height: '0.6rem', flexShrink: 0 }} />
            No chef assigned — assign to enable Mark Ready
          </div>
          {assignableChefs.length > 0 && (
            <Select value="" onValueChange={(val) => { if (val && val !== '__none__') onChefChange(val); }}>
              <SelectTrigger style={{
                height: '1.6rem', fontSize: '0.65rem',
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.25)',
                width: '100%',
              }} disabled={isPending}>
                <SelectValue placeholder="Assign chef to continue…" />
              </SelectTrigger>
              <SelectContent>
                {assignableChefs.map((chef) => {
                  const isFull = chef.activeOrders >= chef.maxCapacity;
                  return (
                    <SelectItem key={chef.chefId} value={chef.chefId} disabled={isFull}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem' }}>
                        <span style={{
                          width: '0.45rem', height: '0.45rem', borderRadius: '9999px', flexShrink: 0,
                          background: chef.status === 'available' ? '#34d399' : chef.status === 'busy' ? '#fbbf24' : '#ef4444',
                        }} />
                        {chef.name}
                        <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: isFull ? '#ef4444' : '#94a3b8' }}>
                          {chef.activeOrders}/{chef.maxCapacity}{isFull ? ' (Full)' : ''}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Row 5: Timer */}
      <OrderTimer order={order} />

      {/* Row 6: Mark Ready button */}
      <button
        title={!hasChef ? 'Assign a chef before marking ready' : undefined}
        style={{
          width:          '100%',
          padding:        '0.38rem 0',
          borderRadius:   '0.32rem',
          fontSize:       '0.72rem',
          letterSpacing:  '0.02em',
          textAlign:      'center' as const,
          opacity:        isButtonBlocked ? (isPending ? 0.55 : 0.65) : 1,
          transition:     'opacity 0.15s, transform 0.1s',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '0.28rem',
          flexShrink:     0,
          marginTop:      '0.06rem',
          ...btnStyle,
        }}
        onClick={isButtonBlocked ? undefined : onAction}
        disabled={isButtonBlocked}
        onMouseEnter={e => { if (!isButtonBlocked) e.currentTarget.style.opacity = '0.82'; }}
        onMouseLeave={e => { if (!isButtonBlocked) e.currentTarget.style.opacity = '1'; }}
      >
        {btnLabel}
      </button>
    </div>
  );
}

// ── CookingDraggableCard ───────────────────────────────────────────────────────

interface CookingDraggableCardProps {
  order:           Order;
  index:           number;
  isPending:       boolean;
  assignableChefs: StaffWorkloadDto[];
  onAction:        () => void;
  onChefChange:    (value: string) => void;
  onStateChange:   (orderId: string, state: CookingState | undefined) => void;
}

function CookingDraggableCard({
  order, index, isPending, assignableChefs, onAction, onChefChange, onStateChange,
}: CookingDraggableCardProps) {
  return (
    <Draggable
      key={order.id}
      draggableId={order.id}
      index={index}
      isDragDisabled={isPending}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.88 : 1,
          }}
          className={[
            snapshot.isDragging ? 'order-card--dragging'    : '',
            isPending           ? 'order-card--pending-api' : '',
          ].filter(Boolean).join(' ')}
        >
          <CookingCardInner
            order={order}
            isPending={isPending}
            assignableChefs={assignableChefs}
            onStateChange={onStateChange}
            onAction={onAction}
            onChefChange={onChefChange}
          />
        </div>
      )}
    </Draggable>
  );
}

// ── Column definitions ─────────────────────────────────────────────────────────

const columns: { status: OrderStatus; label: string; icon: React.ElementType; color: string }[] = [
  { status: 'pending', label: 'Queue',   icon: Clock,        color: 'pending' },
  { status: 'cooking', label: 'Cooking', icon: ChefHat,      color: 'cooking' },
  { status: 'ready',   label: 'Ready',   icon: CheckCircle2, color: 'ready'   },
];

// ── KanbanBoard props ──────────────────────────────────────────────────────────

export interface KanbanBoardProps {
  orders:           Order[];
  staff:            StaffWorkloadDto[];
  readyCountdowns?: Record<string, number>;
  isSimulating?:    boolean;
  onStatusChange:   (orderId: string, status: OrderStatus) => Promise<void>;
  onChefAssign:     (orderId: string, chefId: string)       => Promise<void>;
  columnRefs?:      Partial<Record<OrderStatus, React.RefObject<HTMLDivElement>>>;
}

const MAX_PENDING_MS = 30_000;

// ── KanbanBoard ────────────────────────────────────────────────────────────────

export function KanbanBoard({
  orders, staff, readyCountdowns = {}, isSimulating = false,
  onStatusChange, onChefAssign, columnRefs = {},
}: KanbanBoardProps) {
  const safeOrders = orders ?? [];

  // ── Refs — all grouped at the top ───────────────────────────────────────────
const pendingIdsRef        = useRef<Set<string>>(new Set());
  const pendingTimersRef     = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const ordersRef            = useRef(safeOrders);
  const cookingStateRef      = useRef<Record<string, CookingState>>({});
  const autoAdvanceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});  // ← ADD

  // ── State ────────────────────────────────────────────────────────────────────
  const [pendingOrderIds, setPendingOrderIds] = useState<Set<string>>(new Set());
  const [draggingOrder,   setDraggingOrder]   = useState<Order | null>(null);

  // ── Keep ordersRef current ───────────────────────────────────────────────────
  useEffect(() => { ordersRef.current = safeOrders; }, [safeOrders]);

  // ── Inject keyframe CSS once ─────────────────────────────────────────────────
  // FIX: moved before all other useEffects so hook call order is consistent
useEffect(() => {
    const ATTR = 'data-kanban-ref-count';
    const existing = document.querySelector('style[data-kanban="keyframes"]');
    if (existing) {
      // Increment reference count so unmount of one instance doesn't
      // remove the style while sibling KanbanBoard instances still need it.
      existing.setAttribute(ATTR, String((parseInt(existing.getAttribute(ATTR) ?? '0')) + 1));
      return () => {
        const count = parseInt(existing.getAttribute(ATTR) ?? '1');
        if (count <= 1) existing.remove();
        else existing.setAttribute(ATTR, String(count - 1));
      };
    }
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-kanban', 'keyframes');
    styleEl.setAttribute(ATTR, '1');
    styleEl.textContent = KEYFRAMES;
    document.head.appendChild(styleEl);
    return () => {
      const count = parseInt(styleEl.getAttribute(ATTR) ?? '1');
      if (count <= 1) styleEl.remove();
      else styleEl.setAttribute(ATTR, String(count - 1));
    };
  }, []);

  // ── Pending API set ──────────────────────────────────────────────────────────
  const setOrderPending = useCallback((id: string, val: boolean) => {
    if (val) {
      pendingIdsRef.current.add(id);
      if (pendingTimersRef.current[id]) clearTimeout(pendingTimersRef.current[id]);
      pendingTimersRef.current[id] = setTimeout(() => {
        if (pendingIdsRef.current.has(id)) {
          pendingIdsRef.current.delete(id);
          delete pendingTimersRef.current[id];
          setPendingOrderIds(new Set(pendingIdsRef.current));
        }
      }, MAX_PENDING_MS);
    } else {
      pendingIdsRef.current.delete(id);
      if (pendingTimersRef.current[id]) {
        clearTimeout(pendingTimersRef.current[id]);
        delete pendingTimersRef.current[id];
      }
    }
    setPendingOrderIds(new Set(pendingIdsRef.current));
  }, []);

  // Clean up pending state for orders that have left the board
  useEffect(() => {
    const orderIdSet = new Set(safeOrders.map(o => o.id));
    let changed = false;
    for (const id of pendingIdsRef.current) {
      if (!orderIdSet.has(id)) {
        pendingIdsRef.current.delete(id);
        if (pendingTimersRef.current[id]) {
          clearTimeout(pendingTimersRef.current[id]);
          delete pendingTimersRef.current[id];
        }
        changed = true;
      }
    }
    if (changed) setPendingOrderIds(new Set(pendingIdsRef.current));
  }, [safeOrders]);

  // Clean up all pending timers on unmount
  useEffect(() => {
    return () => {
      for (const id of Object.keys(pendingTimersRef.current)) {
        clearTimeout(pendingTimersRef.current[id]);
      }
      pendingTimersRef.current = {};
    };
  }, []);

  // Clean up cooking state for orders no longer cooking
  useEffect(() => {
    const cookingIds = new Set(
      safeOrders.filter(o => o.status === 'cooking').map(o => o.id)
    );
    for (const id of Object.keys(cookingStateRef.current)) {
      if (!cookingIds.has(id)) delete cookingStateRef.current[id];
    }
  }, [safeOrders]);

  const handleCookingStateChange = useCallback((orderId: string, state: CookingState | undefined) => {
    if (state === undefined) delete cookingStateRef.current[orderId];
    else cookingStateRef.current[orderId] = state;
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const assignableChefs = useMemo(() => (staff ?? []).filter(s => s.onShift), [staff]);

  const ordersByStatus = useMemo(() => {
    const map: Record<OrderStatus, Order[]> = {
      pending: [], cooking: [], ready: [], completed: [],
    };
    for (const order of safeOrders) {
      if (map[order.status] !== undefined) map[order.status].push(order);
    }
    for (const status of Object.keys(map) as OrderStatus[]) {
      map[status].sort((a, b) => {
        const tw = (ORDER_TYPE_WEIGHT[a.orderType] ?? 1) - (ORDER_TYPE_WEIGHT[b.orderType] ?? 1);
        if (tw !== 0) return tw;
        const aMs = a.pickupSlotMs ?? new Date(a.createdAt).getTime();
        const bMs = b.pickupSlotMs ?? new Date(b.createdAt).getTime();
        return aMs - bMs;
      });
    }
    return map;
  }, [safeOrders]);

  // ── Drag handlers ────────────────────────────────────────────────────────────
const handleDragStart = useCallback((start: DragStart) => {
    // Use ordersRef (always current) not safeOrders (render closure snapshot)
    // so draggingOrder reflects real order state if orders update mid-drag.
    setDraggingOrder(ordersRef.current.find(o => o.id === start.draggableId) ?? null);
  }, []);

  // FIX: added missing semicolon after closing paren of useCallback
 const handleDragEnd = useCallback(async (result: DropResult) => {
    setDraggingOrder(null);
    if (!result.destination) return;
    const orderId   = result.draggableId;
    const newStatus = result.destination.droppableId as OrderStatus;
    const order     = ordersRef.current.find(o => o.id === orderId);
    if (!order || order.status === newStatus) return;

   if (order.status === 'cooking' && newStatus === 'ready') {
      const liveState = cookingStateRef.current[orderId];
      const hasChef   = !!(order.assignedChefId || order.assignedTo);
      const hasPrepTime = (order.estimatedPrepTime ?? 0) > 0;

      if (!hasChef) {
        fireToast('Assign a chef before marking this order ready.', 'No chef assigned');
        return; // BLOCK the drag
      }
     if (liveState === 'cooking' && hasPrepTime) {
        // Warn but ALLOW — chefs override timers in real kitchens
        fireToast('Marking ready before timer — chef override applied.', 'Early ready');
        // Don't return — fall through to status update
      }
    }

    if (!isValidDrop(order.status, newStatus)) {
      fireToast(getTransitionError(order.status, newStatus), 'Invalid move');
      return;
    }

    // Capture snapshot before the drag visually moves the card so we can
    // revert if the API call fails. The DnD library has already re-ordered
    // the DOM; onStatusChange is the source of truth — if it throws we must
    // force a board reload to snap the card back to its real column.
    setOrderPending(orderId, true);
    try {
      await onStatusChange(orderId, newStatus);
    } catch (err: any) {
      fireToast(err?.message ?? 'Status update failed.', 'Update failed');
      // Board reverts automatically: onStatusChange (useKitchenBoard) calls
      // loadBoard() in its own catch, pushing real server state back as
      // the orders prop. KanbanBoard is controlled — no local setOrders needed.
    } finally {
      setOrderPending(orderId, false);
    }
  }, [onStatusChange, setOrderPending]);

  // ── Card action handlers ─────────────────────────────────────────────────────
  const handleCardAction = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    setOrderPending(orderId, true);
    try {
      await onStatusChange(orderId, newStatus);
    } catch (err: any) {
      fireToast(err?.message ?? 'Status update failed.', 'Update failed');
    } finally {
      setOrderPending(orderId, false);
    }
  }, [onStatusChange, setOrderPending]);

  const handleChefAssign = useCallback(async (orderId: string, chefId: string) => {
    setOrderPending(orderId, true);
    try {
      await onChefAssign(orderId, chefId);
    } catch (err: any) {
      fireToast(err?.message ?? 'Chef assignment failed.', 'Assignment failed');
    } finally {
      setOrderPending(orderId, false);
    }
  }, [onChefAssign, setOrderPending]);

   // ── Auto-advance: when estimatedPrepTime elapses, move cooking→ready ────────
// ── Auto-advance: only during simulation mode ────────────────────────────
  // Real kitchen orders must be manually marked Ready by staff.
  // Simulation mode auto-advances to keep the demo flowing.
  useEffect(() => {
    const timerMap = autoAdvanceTimersRef.current;

    // If simulation is OFF — clear all pending auto-advance timers and stop
    if (!isSimulating) {
      for (const id of Object.keys(timerMap)) {
        clearTimeout(timerMap[id]);
        delete timerMap[id];
      }
      return;
    }

    const cookingOrders = safeOrders.filter(o => o.status === 'cooking');
    const currentIds    = new Set(cookingOrders.map(o => o.id));

    // Clear timers for orders no longer cooking
    for (const id of Object.keys(timerMap)) {
      if (!currentIds.has(id)) {
        clearTimeout(timerMap[id]);
        delete timerMap[id];
      }
    }

    for (const order of cookingOrders) {
      if (timerMap[order.id]) continue;
      if (!(order.assignedChefId || order.assignedTo)) continue;
      const prepMs = (order.estimatedPrepTime ?? 0) * 60_000;
      if (prepMs <= 0) continue;

      // Only start countdown from actual cookingStartedAt.
      // If startedAt is null the order hasn't actually started cooking yet — skip it.
      if (!order.startedAt) continue;
      const startedAt = order.startedAt.getTime();
      const remaining = Math.max(0, startedAt + prepMs - Date.now());

      // Only schedule if time is actually remaining.
      if (remaining <= 0) continue;
      timerMap[order.id] = setTimeout(async () => {
        delete timerMap[order.id];
        toast.info(`Auto-advancing ${order.orderNumber} to Ready`, {
          description: 'Prep time elapsed.',
          duration: 3000,
        });
        try { await onStatusChange(order.id, 'ready'); } catch { /* onStatusChange handles errors */ }
      }, remaining);
    }
  }, [safeOrders, onStatusChange, isSimulating]);

    // Clean up auto-advance timers on unmount
  useEffect(() => {
    return () => {
      for (const id of Object.keys(autoAdvanceTimersRef.current)) {
        clearTimeout(autoAdvanceTimersRef.current[id]);
      }
      autoAdvanceTimersRef.current = {};
    };
  }, []);

  // FIX: moved makeCookingChefHandler after handleChefAssign (correct dependency order)

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    // FIX: removed unnecessary extra outer wrapper div — single kanban-wrapper is enough
    <div className="kanban-wrapper">
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {columns.map((column) => {
            const columnOrders     = ordersByStatus[column.status];
            const Icon             = column.icon;
            const isDragActive     = draggingOrder !== null;
            const isSource         = isDragActive && draggingOrder!.status === column.status;
            const draggingIsLocked = isDragActive && isScheduledAndLocked(draggingOrder!);
            const isValidTarget    = isDragActive && !isSource && !draggingIsLocked
              && isValidDrop(draggingOrder!.status, column.status);
            const isInvalid        = isDragActive && !isSource
              && (draggingIsLocked || !isValidTarget);

            return (
              <div
                key={column.status}
                ref={columnRefs[column.status]}
                className={[
                  'kanban-column',
                  `kanban-column--${column.color}`,
                  isSource      ? 'kanban-column--source'         : '',
                  isValidTarget ? 'kanban-column--valid-target'   : '',
                  isInvalid     ? 'kanban-column--invalid-target' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="kanban-column__header">
                  <div className="kanban-column__title">
                    <Icon className={`kanban-column__icon kanban-column__icon--${column.status}`} />
                    <h3 className="kanban-column__label">{column.label}</h3>
                  </div>
                  <span className={`kanban-column__badge kanban-column__badge--${column.status}`}>
                    {columnOrders.length}
                  </span>
                </div>

                <Droppable droppableId={column.status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={[
                        'kanban-column__content',
                        snapshot.isDraggingOver ? 'kanban-column__content--dragging-over' : '',
                        isInvalid               ? 'kanban-column__content--drop-invalid' : '',
                        isValidTarget           ? 'kanban-column__content--drop-valid'   : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {columnOrders.map((order, index) => {
                        const isPending = pendingOrderIds.has(order.id);

                        // ── COOKING COLUMN ──────────────────────────────────
                        if (column.status === 'cooking') {
                          return (
                            <CookingDraggableCard
  key={order.id}
  order={order}
  index={index}
  isPending={isPending}
  assignableChefs={assignableChefs}
  onStateChange={handleCookingStateChange}
  onAction={() => handleCardAction(order.id, 'ready')}
  onChefChange={(value: string) => {
    // Capture order.id from render closure — stable for this card's lifetime.
    // Do not use cookingChefHandlers lookup: if the order left cooking between
    // the memo recompute and this click (backend poll), the handler would be
    // undefined and the assignment would be silently dropped.
    if (!value || value === '__none__') return;
    handleChefAssign(order.id, value);
  }}
/>
                          );
                        }

                        // ── QUEUE & READY COLUMNS ───────────────────────────
                        const countdown       = readyCountdowns[order.id];
                        const countdownUrgent = countdown !== undefined && countdown <= 5;

                        const nextStatusMap: Partial<Record<OrderStatus, OrderStatus>> = {
                          pending: 'cooking',
                          ready:   'completed',
                        };
                        const actionLabelMap: Partial<Record<OrderStatus, string>> = {
                          pending: 'Start Cooking',
                          ready:   'Complete',
                        };
                        const nextStatus      = nextStatusMap[order.status];
                        const actionLabel     = actionLabelMap[order.status];
                        const scheduledLocked = isScheduledAndLocked(order);

                        return (
                          <Draggable
                            key={order.id}
                            draggableId={order.id}
                            index={index}
                            isDragDisabled={isPending || scheduledLocked}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  ...(scheduledLocked ? {
                                    animation: 'scheduledGlow 3s ease-in-out infinite',
                                    cursor: 'default',
                                  } : {}),
                                }}
                                className={[
                                  'order-card',
                                  snapshot.isDragging   ? 'order-card--dragging'        : '',
                                  `order-card--${order.orderType}`,
                                  isPending             ? 'order-card--pending-api'      : '',
                                  scheduledLocked       ? 'order-card--scheduled-locked' : '',
                                ].filter(Boolean).join(' ')}
                              >
                                <div className="order-card__header">
                                  <div className="order-card__header-left">
                                    <span className="order-card__number" title={order.orderNumber}>
                                      {order.orderNumber}
                                    </span>
                                    <OrderTypeBadge orderType={order.orderType ?? 'normal'} />
                                    {scheduledLocked && <ScheduledLockBadge />}
                                  </div>
                                 <div className="order-card__meta">
  {order.status === 'ready' && countdown !== undefined && (
    <span className={[
      'order-card__countdown',
      countdownUrgent ? 'order-card__countdown--urgent' : '',
    ].filter(Boolean).join(' ')}>
      ✔ {countdown}s
    </span>
  )}
  {/* Only show timer for cooking/ready — pending orders have no active cook time */}
  {order.status !== 'pending' && <OrderTimer order={order} compact />}
</div>
                                </div>

                                <div className="order-card__customer">
                                  <User className="order-card__customer-icon" />
                                  <span className="order-card__customer-name">
                                    {order.customerName}
                                  </span>
                                  <span className="order-card__separator">•</span>
                                  <Clock className="order-card__time-icon" />
                                  {order.pickupTime === 'ASAP' ? (
                                    <span className="order-card__time" style={{ color: '#fb923c', fontWeight: 700 }}>ASAP</span>
                                  ) : order.pickupTime === 'TBD' || !order.pickupTime ? (
                                    <span className="order-card__time" style={{ color: '#6ee7b7', fontWeight: 600 }}>
                                      {order.orderType === 'scheduled' ? 'Tomorrow' : 'TBD'}
                                    </span>
                                  ) : (
                                    <span className="order-card__time">{order.pickupTime}</span>
                                  )}
                                </div>

                                {scheduledLocked && (
                                  <ScheduledInfoBanner pickupTime={order.pickupTime} />
                                )}

                                <div className="order-card__items">
                                  {order.items.slice(0, 2).map((item) => (
                                    <div key={item.id} className="order-card__item">
                                      <span className="order-card__item-quantity">
                                        {item.quantity}×
                                      </span>
                                      <span className="order-card__item-name">{item.name}</span>
                                    </div>
                                  ))}
                                  {order.items.length > 2 && (
                                    <span className="order-card__items-more">
                                      +{order.items.length - 2} more
                                    </span>
                                  )}
                                </div>

                                {column.status === 'pending' && (
                                  <div className="order-card__chef-row">
                                    {(order.assignedTo || order.assignedChefId) ? (
                                      <div style={{
                                        display: 'inline-flex', alignItems: 'center',
                                        gap: '0.3rem', padding: '0.2rem 0.5rem',
                                        borderRadius: '0.3rem', fontSize: '0.68rem',
                                        fontWeight: 500,
                                        background: 'rgba(99,102,241,0.10)',
                                        border: '1px solid rgba(99,102,241,0.25)',
                                        color: '#a5b4fc',
                                      }}>
                                        <ChefHat style={{ width: '0.65rem', height: '0.65rem', flexShrink: 0 }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {order.assignedTo ?? 'Chef assigned'}
                                        </span>
                                      </div>
                                    ) : (
                                      <Select
                                        value=""
                                        onValueChange={(value) => {
                                          if (!value || value === '__none__') return;
                                          handleChefAssign(order.id, value);
                                        }}
                                      >
                                        <SelectTrigger
                                          className="order-card__chef-select"
                                          disabled={isPending}
                                        >
                                          <SelectValue
                                            placeholder={isPending ? 'Updating…' : 'Assign chef…'}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {assignableChefs.length === 0 ? (
                                            <SelectItem value="__none__" disabled>
                                              No staff on shift
                                            </SelectItem>
                                          ) : assignableChefs.map((chef) => {
                                            const isFull = chef.activeOrders >= chef.maxCapacity;
                                            return (
                                              <SelectItem
                                                key={chef.chefId}
                                                value={chef.chefId}
                                                disabled={isFull}
                                              >
                                                <span className={`chef-option${isFull ? ' chef-option--full' : ''}`}>
                                                  <span className={`chef-option__status chef-option__status--${chef.status}`} />
                                                  {chef.name}
                                                  {isFull && (
                                                    <span className="chef-option__full-label">(Full)</span>
                                                  )}
                                                  <span className={`chef-option__load${isFull ? ' chef-option__load--full' : ''}`}>
                                                    {chef.activeOrders}/{chef.maxCapacity}
                                                  </span>
                                                </span>
                                              </SelectItem>
                                            );
                                          })}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                )}

                                {nextStatus && actionLabel && (
                                  <div className="order-card__footer">
                                    <button
                                      className={`order-card__action order-card__action--${order.status}`}
                                      onClick={() => !isPending && !scheduledLocked && handleCardAction(order.id, nextStatus)}
                                      disabled={isPending || scheduledLocked}
                                    >
                                      {isPending ? 'Updating…' : actionLabel}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}

                      {provided.placeholder}
                      {columnOrders.length === 0 && !snapshot.isDraggingOver && (
                        <div className="kanban-column__empty">No orders</div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}