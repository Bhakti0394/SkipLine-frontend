// ============================================================
// src/components/KitchenDashboard/dashboard/OrderTimer.tsx
// ============================================================
// PENDING  → pickup slot countdown / SLA timer
// COOKING  → Pick-in | Pickup | Time left ↓  (clean, chef-friendly)
// READY    → "Ready for Xm"
// ============================================================

import { Order } from '../../../kitchen-types/order';
import {
  useOrderTimer,
  serverNow,
  formatElapsed,
  formatMinutes,
  formatOverdue,
  formatCountdown,
} from '../../../kitchen-hooks/useOrderTimer';
import { motion } from 'framer-motion';
import { Clock, ChefHat, Zap, AlertTriangle, Calendar, Timer, LogIn } from 'lucide-react';
import '../styles/Ordertimer.scss';

interface OrderTimerProps {
  order:    Order;
  compact?: boolean;
}

// ── Format a timestamp ms → "12:30 PM" ───────────────────────────────────────
function clockTime(ms: number | null | undefined): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// ── Resolve cooking-start ms from order ──────────────────────────────────────
function resolveCookStartMs(order: Order): number | null {
  const o = order as any;
  for (const v of [o.startedAt, o.cookingStartedAt, o.cookStartedAt, o.startTime]) {
    if (!v) continue;
    if (v instanceof Date && !isNaN(v.getTime())) return v.getTime();
    if (typeof v === 'number' && v > 0) return v < 1_000_000_000_000 ? v * 1000 : v;
    if (typeof v === 'string') { const ms = new Date(v).getTime(); if (!isNaN(ms)) return ms; }
  }
  return null;
}

// ── Resolve pickup ms from order ─────────────────────────────────────────────
function resolvePickupMs(order: Order): number | null {
  if (order.pickupSlotMs) return order.pickupSlotMs;
  const o = order as any;
  for (const key of ['expressPickupSlotMs', 'pickupDeadlineAt', 'pickupSlot']) {
    const v = o[key];
    if (!v) continue;
    if (typeof v === 'number' && v > 0) return v < 1_000_000_000_000 ? v * 1000 : v;
    const ms = new Date(v).getTime();
    if (!isNaN(ms)) return ms;
  }
  const display = order.pickupTime;
  if (!display || display === 'TBD' || display === 'ASAP') return null;
  if (display.includes('T') || display.includes('-')) {
    const ms = new Date(display).getTime();
    if (!isNaN(ms)) return ms;
  }
  const parsed = new Date(`${new Date().toDateString()} ${display}`);
  return isNaN(parsed.getTime()) ? null : parsed.getTime();
}

// ── Render pickup value — never shows a bare dash ────────────────────────────
// Priority:
//   1. pickup ms → formatted clock time  e.g. "5:24 PM"
//   2. pickupTime === 'ASAP' → orange ASAP badge
//   3. pickupTime is a real string (not TBD/empty) → show it directly
//   4. fallback → "TBD" (muted, explicit, not a dash)
function PickupValue({ pickup, pickupTime, orderType }: { pickup: number | null; pickupTime: string; orderType: string }) {
  if (pickup) {
    return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{clockTime(pickup)}</span>;
  }
  if (pickupTime === 'ASAP') {
    return (
      <span style={{
        color: '#fb923c', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.04em',
      }}>
        ASAP
      </span>
    );
  }
  if (pickupTime && pickupTime !== 'TBD' && pickupTime !== '—') {
    return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{pickupTime}</span>;
  }
  // Scheduled + no slot = tomorrow. Others = TBD.
  const label = orderType === 'scheduled' ? 'Tomorrow' : 'TBD';
  const color = orderType === 'scheduled' ? '#6ee7b7' : 'rgba(148,163,184,0.55)';
  return (
    <span style={{ color, fontWeight: 600, fontSize: '0.68rem' }}>
      {label}
    </span>
  );
}

export function OrderTimer({ order, compact = false }: OrderTimerProps) {
  const {
    cookingElapsed,
    cookingDisplay,
    isOverdue,
    overdueBySeconds,
    overdueDisplay,
    expressDeadlineMs,
    eta,
    progress,
    pickupCountdownSeconds,
    isPendingUrgent,
    slaBudgetSeconds,
    orderAge,
  } = useOrderTimer(order);

  if (order.status === 'completed') return null;

  const orderType = order.orderType ?? 'normal';
  const isExpress = orderType === 'express';

  // ── COMPACT ───────────────────────────────────────────────────────────────

  if (compact) {
    if (order.status === 'pending') {
      const hasSlot = pickupCountdownSeconds !== null;
      if (isExpress && !hasSlot) {
        const countdownSecs = Math.max(0, slaBudgetSeconds - orderAge);
        return (
          <div className={`order-timer-compact${isPendingUrgent ? ' order-timer-compact--overdue' : ''}`}>
            <Timer className="order-timer-compact__icon" />
            <span className="order-timer-compact__eta">{formatCountdown(countdownSecs)} left</span>
            {isPendingUrgent && (
              <span className="order-timer-compact__overdue">
                <AlertTriangle className="order-timer-compact__warn-icon" />urgent!
              </span>
            )}
          </div>
        );
      }
      return (
        <div className={`order-timer-compact${isPendingUrgent ? ' order-timer-compact--overdue' : ''}`}>
          {isExpress
            ? <Zap className="order-timer-compact__icon" />
            : <Calendar className="order-timer-compact__icon" />
          }
          {hasSlot
            ? <span className="order-timer-compact__eta">{formatCountdown(pickupCountdownSeconds!)} to pickup</span>
            : <span className="order-timer-compact__age">~{order.estimatedPrepTime ?? '?'}m est.</span>
          }
          {isPendingUrgent && (
            <span className="order-timer-compact__overdue">
              <AlertTriangle className="order-timer-compact__warn-icon" />soon!
            </span>
          )}
        </div>
      );
    }

    if (order.status === 'cooking') {
      const pickup   = resolvePickupMs(order) ?? expressDeadlineMs ?? null;
      const secsLeft = pickup ? Math.max(0, Math.floor((pickup - serverNow()) / 1000)) : null;
      const isLate   = pickup !== null && serverNow() > pickup;
      return (
        <div className={`order-timer-compact${isLate ? ' order-timer-compact--overdue' : ''}`}>
          {isLate
            ? <AlertTriangle className="order-timer-compact__warn-icon" />
            : isExpress
              ? <Zap className="order-timer-compact__icon" />
              : <ChefHat className="order-timer-compact__icon" />
          }
          <span className="order-timer-compact__eta">
            {isLate
              ? `+${formatCountdown(Math.abs(Math.floor((serverNow() - pickup!) / 1000)))}`
              : secsLeft !== null
                ? `${formatCountdown(secsLeft)} left`
                : cookingDisplay
            }
          </span>
        </div>
      );
    }

    // READY compact
    return (
      <div className="order-timer-compact">
        <Clock className="order-timer-compact__icon" />
        <span className="order-timer-compact__age">{formatMinutes(orderAge)}</span>
      </div>
    );
  }

  // ── FULL ──────────────────────────────────────────────────────────────────

  // ── PENDING full ──────────────────────────────────────────────────────────
  if (order.status === 'pending') {
    const hasSlot = pickupCountdownSeconds !== null;

    if (isExpress && !hasSlot) {
      const countdownSecs = Math.max(0, slaBudgetSeconds - orderAge);
      return (
        <div className={`order-timer${isPendingUrgent ? ' order-timer--overdue' : ''}`}>
          <div className="order-timer__row">
            <span className="order-timer__row-label">
              {isPendingUrgent
                ? <AlertTriangle className="order-timer__row-icon order-timer__row-icon--warn" />
                : <Timer className="order-timer__row-icon" />
              }
              {isPendingUrgent ? 'Urgent – prepare now!' : 'Arrives in'}
            </span>
            <span className={`order-timer__row-value${isPendingUrgent ? ' order-timer__row-value--overdue' : ' order-timer__row-value--eta'}`}>
              {countdownSecs > 0 ? formatCountdown(countdownSecs) : 'Now'}
            </span>
          </div>
          {order.estimatedPrepTime > 0 && (
            <div className="order-timer__row order-timer__row--muted">
              <span className="order-timer__row-label">
                <Zap className="order-timer__row-icon" />Est. prep
              </span>
              <span className="order-timer__row-value">{order.estimatedPrepTime}m</span>
            </div>
          )}
        </div>
      );
    }

    if (hasSlot) {
      return (
        <div className={`order-timer${isPendingUrgent ? ' order-timer--overdue' : ''}`}>
          <div className="order-timer__row">
            <span className="order-timer__row-label">
              {isExpress
                ? <Zap className="order-timer__row-icon" />
                : <Calendar className="order-timer__row-icon" />
              }
              {isPendingUrgent
                ? (isExpress ? 'Arriving soon!' : 'Start soon!')
                : (isExpress ? 'Arrives in'    : 'Pickup in')
              }
            </span>
            <span className={`order-timer__row-value${isPendingUrgent ? ' order-timer__row-value--overdue' : ' order-timer__row-value--eta'}`}>
              {pickupCountdownSeconds! > 0 ? formatCountdown(pickupCountdownSeconds!) : 'Now'}
            </span>
          </div>
          {order.estimatedPrepTime > 0 && (
            <div className="order-timer__row order-timer__row--muted">
              <span className="order-timer__row-label">
                <Zap className="order-timer__row-icon" />Est. prep
              </span>
              <span className="order-timer__row-value">{order.estimatedPrepTime}m</span>
            </div>
          )}
          {isPendingUrgent && (
            <div className="order-timer__bar-track">
              <motion.div
                className="order-timer__bar-fill"
                style={{ background: isExpress ? 'var(--ot-color-overdue)' : 'var(--ot-color-warning)' }}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="order-timer">
        <div className="order-timer__row">
          <span className="order-timer__row-label">
            <Calendar className="order-timer__row-icon" />Pickup in
          </span>
          <span className="order-timer__row-value">No slot</span>
        </div>
        {order.estimatedPrepTime > 0 && (
          <div className="order-timer__row order-timer__row--muted">
            <span className="order-timer__row-label">
              <Zap className="order-timer__row-icon" />Est. prep
            </span>
            <span className="order-timer__row-value">{order.estimatedPrepTime}m</span>
          </div>
        )}
      </div>
    );
  }

  // ── COOKING full – clean 3-row layout ─────────────────────────────────────
  if (order.status === 'cooking') {
    const startMs  = resolveCookStartMs(order);
    const pickup   = resolvePickupMs(order) ?? expressDeadlineMs ?? null;
    const now      = serverNow();
    const secsLeft = pickup !== null ? Math.max(0, Math.floor((pickup - now) / 1000)) : null;
    const isLate   = pickup !== null && now > pickup;

    let pct: number;
    if (pickup !== null && startMs !== null) {
      pct = Math.min(100, Math.round(((now - startMs) / Math.max(1, pickup - startMs)) * 100));
    } else if (order.estimatedPrepTime > 0) {
      pct = Math.min(100, Math.round((cookingElapsed / (order.estimatedPrepTime * 60)) * 100));
    } else {
      pct = 0;
    }

    const barColor = pct >= 90 ? 'var(--ot-color-overdue)'
                   : pct >= 70 ? 'var(--ot-color-warning)'
                   : 'var(--ot-color-ok)';

    return (
      <div className="order-timer">

        {/* Row 1 – Pick-in */}
        <div className="order-timer__row">
          <span className="order-timer__row-label">
            <LogIn className="order-timer__row-icon" />
            Pick-in
          </span>
          <span className="order-timer__row-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {startMs ? clockTime(startMs) : 'Just started'}
          </span>
        </div>

        {/* Row 2 – Pickup
            FIX: was `pickup ? clockTime(pickup) : (order.pickupTime === 'ASAP' ? 'ASAP' : '—')`
            For normal/scheduled orders with no pickupSlotMs, pickup is null AND
            pickupTime is 'TBD' → the old code fell through to '—'.
            Now uses <PickupValue> which always shows something meaningful:
            clock time → ASAP (orange) → pickupTime string → 'TBD' (muted).
            Never shows a bare dash. */}
        <div className="order-timer__row">
          <span className="order-timer__row-label">
            <Clock className="order-timer__row-icon" />
            Pickup
          </span>
          <span className="order-timer__row-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <PickupValue pickup={pickup} pickupTime={order.pickupTime} orderType={order.orderType} />
          </span>
        </div>

        {/* Row 3 – Time left: always counts DOWN to 0, then shows overdue.
            express → secsLeft from pickup deadline (already a countdown)
            normal  → eta from hook = prepTimeSecs - cookingElapsed (countdown)
            0 = done, chef should mark ready. Overdue = red +time. */}
        <div className="order-timer__row">
          <span className="order-timer__row-label">
            <Timer className="order-timer__row-icon" />
            Time left
          </span>
          <span
            className={[
              'order-timer__row-value order-timer__row-value--primary',
              (isLate || isOverdue) ? 'order-timer__row-value--overdue' : 'order-timer__row-value--eta',
            ].join(' ')}
            style={{
              fontSize:           '1rem',
              fontWeight:         700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {(isLate || isOverdue)
              ? `+${formatCountdown(isLate
                  ? Math.abs(Math.floor((now - pickup!) / 1000))
                  : overdueBySeconds)}`
              : secsLeft !== null
                ? (secsLeft === 0 ? 'Done!' : formatCountdown(secsLeft))
                : (eta > 0 ? formatCountdown(eta) : 'Done!')
            }
          </span>
        </div>

        {/* Progress bar */}
        <div className="order-timer__bar-track">
          <motion.div
            className="order-timer__bar-fill"
            style={{ background: barColor }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <span className="order-timer__bar-label">{pct}%</span>
        </div>

      </div>
    );
  }

  // ── READY full ────────────────────────────────────────────────────────────
  return (
    <div className="order-timer">
      <div className="order-timer__row">
        <span className="order-timer__row-label">
          <Clock className="order-timer__row-icon" />Ready for
        </span>
        <span className="order-timer__row-value">{formatMinutes(orderAge)}</span>
      </div>
    </div>
  );
}