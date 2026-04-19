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
  if (!ms) return '–';
  // Use en-IN to match resolvePickupTime in useKitchenBoard — consistent
  // time format across the pickup row and the slot display.
  return new Date(ms).toLocaleTimeString('en-IN', {
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
//
// FIX [PICKUP-DISPLAY]: No longer tries to parse "~5 min" / "~10 min" /
// "~15 min" as a Date — those strings are not parseable and always produced
// an Invalid Date → null, causing the express pickup row to show "ASAP".
//
// For express orders the caller should pass expressDeadlineMs (from the hook)
// directly as the pickup value. resolvePickupMs is now only used for
// normal/scheduled orders that have a real slot time or a clock-time string.
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
  // FIX: skip "~X min" strings — they are express window labels, not parseable times.
  // expressDeadlineMs from the hook is the correct source for express pickup ms.
  if (!display || display === 'TBD' || display === 'ASAP' || display.startsWith('~')) return null;
  if (display.startsWith('Tomorrow')) return null; // scheduled — no epoch available from string
  if (display.includes('T') || display.includes('-')) {
    const ms = new Date(display).getTime();
    if (!isNaN(ms)) return ms;
  }
  const parsed = new Date(`${new Date().toDateString()} ${display}`);
  return isNaN(parsed.getTime()) ? null : parsed.getTime();
}

// ── Render pickup value — never shows a bare dash ────────────────────────────
//
// FIX [PICKUP-DISPLAY]: Added expressDeadlineMs parameter.
// Priority order:
//   1. expressDeadlineMs (express orders) → formatted clock time e.g. "7:35 PM"
//   2. pickup ms (normal/scheduled slot)  → formatted clock time e.g. "6:45 PM"
//   3. pickupTime is "~X min"             → show directly e.g. "~10 min"
//   4. pickupTime is "ASAP"               → orange ASAP badge
//   5. pickupTime is a real string        → show it directly
//   6. fallback                           → "Tomorrow" (scheduled) or "TBD"
//
// Before this fix, express orders with no pickupSlotMs fell straight to
// branch 4 ("ASAP") because resolvePickupMs returned null for "~X min" strings
// and expressDeadlineMs was never consulted here.
function PickupValue({
  pickup,
  pickupTime,
  orderType,
  expressDeadlineMs,
}: {
  pickup:            number | null;
  pickupTime:        string;
  orderType:         string;
  expressDeadlineMs: number | null;
}) {
  // 1. Express with a computed deadline → show clock time
  if (expressDeadlineMs) {
    return (
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {clockTime(expressDeadlineMs)}
      </span>
    );
  }

  // 2. Normal/scheduled slot ms → show clock time
  if (pickup) {
    return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{clockTime(pickup)}</span>;
  }

  // 3. Express window label e.g. "~5 min", "~10 min", "~15 min"
  if (pickupTime && pickupTime.startsWith('~') && pickupTime.endsWith('min')) {
    return (
      <span style={{
        color: '#fb923c', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.04em',
      }}>
        {pickupTime}
      </span>
    );
  }

  // 4. Generic ASAP badge
  if (pickupTime === 'ASAP') {
    return (
      <span style={{
        color: '#fb923c', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.04em',
      }}>
        ASAP
      </span>
    );
  }

  // 5. Real string (e.g. "Tomorrow 11:00 AM", "Wed 2:00 PM")
  if (pickupTime && pickupTime !== 'TBD' && pickupTime !== '—') {
    return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{pickupTime}</span>;
  }

  // 6. Fallback
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
      // Non-express orders in Queue have no meaningful countdown until cooking starts.
      // Show nothing — a blank timer is better than "0s to pickup" or stale SLA counts.
      if (!isExpress) return null;

      const hasSlot = pickupCountdownSeconds !== null;

      if (!hasSlot) {
        // Express SLA countdown — only show if time is actually remaining.
        // If the order has been in queue longer than the SLA budget, don't
        // show "0s left" — just show a static urgent badge instead.
        const countdownSecs = Math.max(0, slaBudgetSeconds - orderAge);
        if (countdownSecs === 0) {
          return (
            <div className="order-timer-compact order-timer-compact--overdue">
              <AlertTriangle className="order-timer-compact__warn-icon" />
              <span className="order-timer-compact__overdue">Waiting in queue</span>
            </div>
          );
        }
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
          <Zap className="order-timer-compact__icon" />
          <span className="order-timer-compact__eta">{formatCountdown(pickupCountdownSeconds!)} to pickup</span>
          {isPendingUrgent && (
            <span className="order-timer-compact__overdue">
              <AlertTriangle className="order-timer-compact__warn-icon" />soon!
            </span>
          )}
        </div>
      );
    }

    if (order.status === 'cooking') {
      const secsLeft = expressDeadlineMs !== null
        ? Math.max(0, eta)
        : (eta > 0 ? eta : null);
      const isLate = isOverdue;
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
              ? `+${formatCountdown(overdueBySeconds)}`
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
    // Non-express orders: show est. prep time only — no countdown
    if (!isExpress) {
      return (
        <div className="order-timer">
          {(order.estimatedPrepTime ?? 0) > 0 && (
            <div className="order-timer__row order-timer__row--muted">
              <span className="order-timer__row-label">
                <Timer className="order-timer__row-icon" />Est. prep
              </span>
              <span className="order-timer__row-value">{order.estimatedPrepTime}m</span>
            </div>
          )}
        </div>
      );
    }

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
         {(order.estimatedPrepTime ?? 0) > 0 && (
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
          {(order.estimatedPrepTime ?? 0) > 0 && (
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
        {(order.estimatedPrepTime ?? 0) > 0 && (
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
    const startMs = resolveCookStartMs(order);

    const pickup = isExpress
      ? (expressDeadlineMs ?? resolvePickupMs(order))
      : resolvePickupMs(order);

    // Use hook-derived values — eta and isOverdue are computed from the
    // reactive nowMs tick inside useOrderTimer, never stale.
    const secsLeft = isOverdue ? null : (eta > 0 ? eta : 0);
    const isLate   = isOverdue;

    // Use hook-computed progress directly — avoids calling serverNow() in render
    const pct = Math.round(progress);

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
            FIX [PICKUP-DISPLAY]: PickupValue now receives expressDeadlineMs so
            express orders show a real clock time ("7:35 PM") instead of "ASAP".
            Priority: expressDeadlineMs → pickup ms → "~X min" label → ASAP → TBD */}
        <div className="order-timer__row">
          <span className="order-timer__row-label">
            <Clock className="order-timer__row-icon" />
            Pickup
          </span>
          <span className="order-timer__row-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <PickupValue
              pickup={pickup}
              pickupTime={order.pickupTime}
              orderType={order.orderType}
              expressDeadlineMs={isExpress ? expressDeadlineMs : null}
            />
          </span>
        </div>

        {/* Row 3 – Time left */}
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
            {isOverdue
              ? `+${formatCountdown(overdueBySeconds)}`
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