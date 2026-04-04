// ============================================================
// src/components/KitchenDashboard/dashboard/OrderQueue.tsx
// ============================================================

import { useMemo, useState, useCallback, useEffect } from 'react';
import { AlertTriangle, Zap, Users, Clock, ChefHat, CheckCircle2 } from 'lucide-react';
import { Order, OrderStatus } from '../../../kitchen-types/order';
import { StaffWorkloadDto, SlotCapacityDto } from '../../../kitchen-api/kitchenApi';
import { serverNow } from '../../../kitchen-hooks/useOrderTimer';
import '../styles/Orderqueue.scss';

interface OrderQueueProps {
  orders:         Order[];
  staff?:         StaffWorkloadDto[];
  upcomingSlots?: SlotCapacityDto[];
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onAssignChef?:  (orderId: string, chefId: string) => Promise<void>;
}

// -- helpers --
function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function formatSlotTime(iso: string): string {
  const diffMin = Math.round((new Date(iso).getTime() - serverNow()) / 60000);
  if (diffMin <= 0) return 'Now';
  if (diffMin < 60) return `+${diffMin}m`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m === 0 ? `+${h}h` : `+${h}h ${m}m`;
}

function slotPressure(slot: SlotCapacityDto): 'full' | 'near' | 'ok' {
  if (slot.remaining === 0) return 'full';
  return (slot.currentBookings / slot.maxCapacity) >= 0.7 ? 'near' : 'ok';
}

// -- Attention card --
function AttentionCard({ order, staff, onStatusChange, onAssignChef }: {
  order:          Order;
  staff:          StaffWorkloadDto[];
  onStatusChange: (id: string, status: OrderStatus) => Promise<void>;
  onAssignChef?:  (id: string, chefId: string) => Promise<void>;
}) {
  const [selected,   setSelected]   = useState('');
  const [assigning,  setAssigning]  = useState(false);
  const [assignErr,  setAssignErr]  = useState<string | null>(null);

  useEffect(() => {
    setSelected('');
    setAssignErr(null);
  }, [order.id, order.assignedTo]);

  const isOverdue = order.status === 'cooking'
    && order.elapsedMinutes != null
    && order.estimatedPrepTime != null
    && order.elapsedMinutes > order.estimatedPrepTime;

  const isScheduledLocked = order.orderType === 'scheduled' && order.status === 'pending' && !order.assignedTo;
  const isUnassigned   = !order.assignedTo && order.status === 'pending';
  const delayMin       = isOverdue
    ? Math.round((order.elapsedMinutes ?? 0) - (order.estimatedPrepTime ?? 0))
    : 0;
  const availableChefs = staff.filter(s => s.onShift && s.status !== 'full');

  const orderTypeEmoji =
    order.orderType === 'express'   ? '⚡' :
    order.orderType === 'scheduled' ? '📅' : '●';

const handleAssign = async (chefId: string) => {
  if (!chefId || !onAssignChef || assigning) return;
  setAssigning(true);
  setAssignErr(null);
  try {
    await onAssignChef(order.id, chefId);
    setSelected('');    // ← only reset on success
  } catch (e: any) {
    setAssignErr(e?.message ?? 'Assign failed');
    // leave selected intact so user sees which chef failed
  } finally {
    setAssigning(false);
  }
};

  return (
    <div className={`oq-card oq-card--${isOverdue ? 'overdue' : 'unassigned'}`}>
      <div className="oq-card__header">
        <div className="oq-card__title-row">
          <span className="oq-card__ref">{order.orderNumber}</span>
          <span className={`oq-card__type oq-card__type--${order.orderType}`}>
            {orderTypeEmoji} {order.orderType}
          </span>
        </div>
        <span className={`oq-card__badge oq-card__badge--${isOverdue ? 'overdue' : isScheduledLocked ? 'scheduled' : 'unassigned'}`}>
          {isOverdue ? `+${delayMin}m overdue` : isScheduledLocked ? 'Pre-booked — assign chef' : 'Unassigned'}
        </span>
      </div>

      <div className="oq-card__meta">
        <span>{order.customerName}</span>
        <span className="oq-card__dot" />
        <span>{order.items.map(i => i.name).join(', ')}</span>
      </div>

      {order.assignedTo && (
        <div className="oq-card__chef">
          <ChefHat size={12} />
          <span>{order.assignedTo}</span>
        </div>
      )}

      <div className="oq-card__actions">
        {isOverdue && (
          <button className="oq-btn oq-btn--danger" onClick={() => onStatusChange(order.id, 'ready')}>
            Mark ready
          </button>
        )}
        {isUnassigned && availableChefs.length > 0 && (
          <>
            <select
              className="oq-select"
              value={selected}
              disabled={assigning}
              onChange={e => { setSelected(e.target.value); handleAssign(e.target.value); }}
            >
              <option value="" disabled>Assign chef</option>
              {availableChefs.map(c => (
                <option key={c.chefId} value={c.chefId}>
                  {c.name} ({c.activeOrders}/{c.maxCapacity})
                </option>
              ))}
            </select>
            {assignErr && (
              <span className="oq-card__no-chef" style={{ color: '#ef4444' }}>{assignErr}</span>
            )}
          </>
        )}
        {isUnassigned && availableChefs.length === 0 && (
          <span className="oq-card__no-chef">No chefs available</span>
        )}
      </div>
    </div>
  );
}
// -- Chef bar --
function ChefBar({ chef }: { chef: StaffWorkloadDto }) {
 const pct   = chef.maxCapacity > 0
    ? Math.min(100, Math.round((chef.activeOrders / chef.maxCapacity) * 100))
    : 0;
  const state = chef.status === 'full' ? 'full' : chef.status === 'busy' ? 'busy' : 'free';

  return (
    <div className="oq-chef">
      <div className="oq-chef__header">
        <div className="oq-chef__identity">
          <div className={`oq-chef__avatar oq-chef__avatar--${state}`}>
            {getInitials(chef.name)}
          </div>
          <span className="oq-chef__name">{chef.name}</span>
        </div>
        <span className={`oq-chef__label oq-chef__label--${state}`}>
          {chef.activeOrders}/{chef.maxCapacity}
          {state === 'full' ? ' — full' : state === 'busy' ? ' — busy' : ' — free'}
        </span>
      </div>
      <div className="oq-chef__track">
        <div className={`oq-chef__fill oq-chef__fill--${state}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// -- Main --
export function OrderQueue({
  orders,
  staff = [],
  upcomingSlots = [],
  onStatusChange,
  onAssignChef,
}: OrderQueueProps) {
  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'completed'), [orders]);

 // AFTER — correct, self-contained:
const attentionOrders = useMemo(() => {
    const nowMs = Date.now();
    const overdue = activeOrders.filter(o => {
      if (o.status !== 'cooking') return false;
      // Prefer live clock over poll-updated elapsedMinutes (which lags by up to 10s).
      // Use startedAt if available for real-time overdue detection.
      const startedAt = (o as any).startedAt;
      if (startedAt && o.estimatedPrepTime > 0) {
        const startMs = startedAt instanceof Date
          ? startedAt.getTime()
          : new Date(startedAt).getTime();
        const liveElapsedMin = (nowMs - startMs) / 60_000;
        return liveElapsedMin > o.estimatedPrepTime;
      }
      // Fallback to backend-computed value
      return (
        o.elapsedMinutes != null &&
        o.estimatedPrepTime != null &&
        o.elapsedMinutes > o.estimatedPrepTime
      );
    });
  const unassigned = activeOrders
      .filter(o => o.status === 'pending' && !o.assignedTo && o.orderType !== 'scheduled')
      .sort((a, b) => {
        const w = (a.orderType === 'express' ? 0 : 1) - (b.orderType === 'express' ? 0 : 1);
        if (w !== 0) return w;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    return [...overdue, ...unassigned];  // ← this line was missing
  }, [activeOrders]);                    // ← closing was missing

  const expressQueued  = useMemo(() => activeOrders.filter(o => o.orderType === 'express' && o.status === 'pending').length, [activeOrders]);
  const activeChefs    = useMemo(() => staff.filter(s => s.onShift), [staff]);
  const availableChefs = useMemo(() => activeChefs.filter(s => s.status !== 'full').length, [activeChefs]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const timelineSlots = useMemo(() => {
    const now = Date.now();
    return upcomingSlots.filter(s => new Date(s.slotTime).getTime() > now).slice(0, 4);
  }, [upcomingSlots, tick]);

  return (
    <div className="order-queue">

      {/* KPI strip */}
      <div className="order-queue__kpi-strip">
        <div className="order-queue__kpi order-queue__kpi--danger">
          <AlertTriangle size={14} />
          <div>
            <div className="order-queue__kpi-value">{attentionOrders.length}</div>
            <div className="order-queue__kpi-label">Needs action</div>
          </div>
        </div>
        <div className="order-queue__kpi order-queue__kpi--warning">
          <Zap size={14} />
          <div>
            <div className="order-queue__kpi-value">{expressQueued}</div>
            <div className="order-queue__kpi-label">Express queued</div>
          </div>
        </div>
        <div className={`order-queue__kpi order-queue__kpi--${availableChefs === 0 && activeChefs.length > 0 ? 'danger' : 'success'}`}>
          <Users size={14} />
          <div>
            <div className="order-queue__kpi-value">{availableChefs}/{activeChefs.length}</div>
            <div className="order-queue__kpi-label">Chefs available</div>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="order-queue__body">

        {/* Left — Needs attention */}
        <div className="order-queue__col">
          <div className="order-queue__col-header">
            <AlertTriangle size={12} />
            <span>Needs attention</span>
            {attentionOrders.length > 0 && (
              <span className="order-queue__col-badge order-queue__col-badge--danger">
                {attentionOrders.length}
              </span>
            )}
          </div>
          {attentionOrders.length === 0 ? (
            <div className="order-queue__empty">
              <CheckCircle2 size={20} />
              <p>All clear</p>
            </div>
          ) : (
            <div className="order-queue__list">
              {attentionOrders.map(o => (
                <AttentionCard
                  key={o.id}
                  order={o}
                  staff={staff}
                  onStatusChange={onStatusChange}
                  onAssignChef={onAssignChef}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right — Chef workload */}
        <div className="order-queue__col">
          <div className="order-queue__col-header">
            <ChefHat size={12} />
            <span>Chef workload</span>
            <span className="order-queue__col-badge">{activeChefs.length} on shift</span>
          </div>
          {activeChefs.length === 0 ? (
            <div className="order-queue__empty">
              <ChefHat size={20} />
              <p>No chefs on shift</p>
            </div>
          ) : (
            <div className="order-queue__chef-list">
              {activeChefs.map(c => <ChefBar key={c.chefId} chef={c} />)}
            </div>
          )}
        </div>

      </div>

      {/* Pickup timeline */}
      {timelineSlots.length > 0 && (
        <div className="order-queue__timeline">
          <div className="order-queue__col-header">
            <Clock size={12} />
            <span>Pickup timeline</span>
          </div>
          <div className="order-queue__timeline-rows">
            {timelineSlots.map(slot => {
              const pressure = slotPressure(slot);
              const fillPct  = Math.round((slot.currentBookings / slot.maxCapacity) * 100);
              return (
               <div key={slot.slotId} className="order-queue__timeline-row">
                  <span className="order-queue__timeline-time">{formatSlotTime(slot.slotTime)}</span>
                  <div className="order-queue__timeline-track">
                    <div
                      className={`order-queue__timeline-fill order-queue__timeline-fill--${pressure}`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                  <span className={`order-queue__timeline-count order-queue__timeline-count--${pressure}`}>
                    {slot.currentBookings}/{slot.maxCapacity}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="order-queue__timeline-legend">
            <span className="order-queue__legend-dot order-queue__legend-dot--ok" />Available
            <span className="order-queue__legend-dot order-queue__legend-dot--near" />Near full
            <span className="order-queue__legend-dot order-queue__legend-dot--full" />Full
          </div>
        </div>
      )}

    </div>
  );
}