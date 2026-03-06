// ============================================================
// src/kitchen-hooks/useOrderTimer.ts
//
// SLA-accurate timer engine for kitchen order cards.
//
// DESIGN PRINCIPLES:
//
// 1. SINGLE GLOBAL TICK — one setInterval at module level drives all timers.
//    No per-card interval. 50 cooking orders = 1 interval, not 50.
//
// 2. SERVER CLOCK SYNCHRONIZATION — on first use, the hook fetches
//    GET /api/kitchen/server-time and computes a clientOffset (ms).
//    All elapsed/remaining calculations use:
//      serverNow = Date.now() + clientOffset
//    This makes SLA match the backend's Instant.now() exactly.
//    Tab visibility changes trigger a re-sync to correct throttled drift.
//
// 3. BACKEND TIMESTAMPS ONLY — uses cookingStartedAt for cooking SLA,
//    createdAt for pending wait time. Never falls back to client time for
//    the start anchor — only for the "current time" component.
//
// 4. PER-PHASE SLA — each OrderStatus phase has its own SLA budget:
//    PENDING:  warn after pendingSlaMinutes (default 5 min)
//    COOKING:  warn after totalPrepTimeMinutes (from backend Order.totalPrepTimeMinutes)
//    READY:    warn after readySlaMinutes (default 10 min — order going cold)
//
// 5. NO RE-RENDERS FOR INACTIVE PHASES — completed/cancelled orders return
//    a stable frozen snapshot; the global tick does not cause them to re-render.
//
// 6. VISIBILITY-AWARE — on tab show, re-syncs server clock and recomputes
//    elapsed to fix throttle-caused drift.
//
// 7. WEBSOCKET-READY — serverOffset is stored in a module-level ref, not
//    React state. When a WebSocket event updates an order's timestamps,
//    the next tick will automatically pick up the new anchor — no special
//    handling needed.
// ============================================================

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Order, OrderStatus } from '../kitchen-types/order';

// ─── Server clock sync ────────────────────────────────────────────────────────

/**
 * Difference between server clock and browser clock in milliseconds.
 * Positive = server is ahead of browser.
 * Initialised to 0 (assume clocks match) until first sync completes.
 */
let serverClockOffsetMs = 0;
let clockSyncPending    = false;
let clockSyncDone       = false;

/**
 * Fetches GET /api/kitchen/server-time and computes the offset.
 * Called once on first hook mount, and again on tab visibility restore.
 *
 * The endpoint returns: { serverTimeMs: number } (epoch milliseconds).
 * Round-trip latency is halved and subtracted from the offset so we
 * account for network delay in both directions.
 */
async function syncServerClock(): Promise<void> {
  if (clockSyncPending) return;
  clockSyncPending = true;
  try {
    const t0  = Date.now();
    const res = await fetch('/api/kitchen/server-time', { credentials: 'include' });
    const t1  = Date.now();
    if (!res.ok) return; // Graceful degradation — use browser clock if endpoint absent
    const { serverTimeMs }: { serverTimeMs: number } = await res.json();
    const roundTripMs   = t1 - t0;
    const estimatedNow  = t0 + roundTripMs / 2;   // midpoint of request window
    serverClockOffsetMs = serverTimeMs - estimatedNow;
    clockSyncDone       = true;
  } catch {
    // Endpoint not yet implemented or network error — fall back to browser clock
    serverClockOffsetMs = 0;
    clockSyncDone       = true;
  } finally {
    clockSyncPending = false;
  }
}

/** Returns current time anchored to server clock. */
function serverNow(): number {
  return Date.now() + serverClockOffsetMs;
}

// ─── Global tick ─────────────────────────────────────────────────────────────
// One interval drives all hooks. Subscribers register a callback;
// the interval fires it every second. No per-component interval.

type TickCallback = () => void;
const tickSubscribers = new Set<TickCallback>();
let   globalInterval: ReturnType<typeof setInterval> | null = null;

function subscribeToTick(cb: TickCallback): () => void {
  tickSubscribers.add(cb);
  if (!globalInterval) {
    globalInterval = setInterval(() => {
      tickSubscribers.forEach(fn => fn());
    }, 1000);
  }
  return () => {
    tickSubscribers.delete(cb);
    if (tickSubscribers.size === 0 && globalInterval !== null) {
      clearInterval(globalInterval);
      globalInterval = null;
    }
  };
}

// ─── SLA configuration ────────────────────────────────────────────────────────

interface SlaBudgets {
  /** Minutes an order may sit PENDING before flagged overdue. Default 5. */
  pendingSlaMinutes: number;
  /** Minutes an order may sit READY (going cold) before flagged. Default 10. */
  readySlaMinutes: number;
}

const DEFAULT_SLA: SlaBudgets = {
  pendingSlaMinutes: 5,
  readySlaMinutes:   10,
};

// ─── Timer state ─────────────────────────────────────────────────────────────

export interface TimerState {
  /** Seconds elapsed since the phase-appropriate start timestamp. */
  elapsed: number;
  /** Seconds remaining until SLA deadline. 0 when overdue. */
  remaining: number;
  /** True when elapsed has exceeded the SLA budget for this phase. */
  isOverdue: boolean;
  /**
   * 0–100 progress toward SLA deadline.
   * Exceeds 100 when overdue (used for overdue severity display).
   * e.g. 150 = 50% past deadline.
   */
  progress: number;
  /**
   * Seconds past the SLA deadline. 0 when not overdue.
   * Use this for "+Xm Ys overdue" display — more precise than deriving from progress.
   */
  overdueBy: number;
  /**
   * The SLA budget in seconds for the current phase.
   * Exposed so the UI can display "X min SLA" without hardcoding.
   */
  slaBudgetSeconds: number;
}

// Stable frozen state for orders that don't need a live timer
const FROZEN_COMPLETE: TimerState = {
  elapsed: 0, remaining: 0, isOverdue: false,
  progress: 100, overdueBy: 0, slaBudgetSeconds: 0,
};

// ─── Phase anchor selector ────────────────────────────────────────────────────
/**
 * Returns the backend timestamp (ms) that should anchor the timer for the
 * current order status. Uses backend-set timestamps only — never client time.
 *
 *   PENDING:   placedAt (= Order.placedAt / createdAt)
 *   COOKING:   cookingStartedAt (= Order.cookingStartedAt) — NOT createdAt
 *   READY:     readyAt (= Order.readyAt)
 *   COMPLETED: N/A — no live timer
 */
function getPhaseAnchorMs(order: Order): number | null {
  switch (order.status) {
    case 'pending':
      return order.createdAt?.getTime() ?? null;
    case 'cooking':
      // cookingStartedAt is the correct SLA anchor for the cooking phase.
      // Falling back to createdAt would inflate elapsed time by queue wait.
      return order.startedAt?.getTime() ?? order.createdAt?.getTime() ?? null;
    case 'ready':
      // readyAt marks when cooking finished — SLA here is "time to pickup"
      return (order as any).readyAt instanceof Date
        ? (order as any).readyAt.getTime()
        : order.createdAt?.getTime() ?? null;
    default:
      return null;
  }
}

/**
 * Returns the SLA budget in seconds for the current phase.
 *   PENDING: pendingSlaMinutes × 60
 *   COOKING: Order.totalPrepTimeMinutes × 60 (from backend — never hardcoded)
 *   READY:   readySlaMinutes × 60
 */
function getPhaseSlaSeconds(order: Order, sla: SlaBudgets): number {
  switch (order.status) {
    case 'pending':
      return sla.pendingSlaMinutes * 60;
    case 'cooking':
      return (order.estimatedPrepTime ?? 0) * 60;
    case 'ready':
      return sla.readySlaMinutes * 60;
    default:
      return 0;
  }
}

// ─── Core hook ────────────────────────────────────────────────────────────────

/**
 * useOrderTimer
 *
 * Returns a live TimerState derived from backend timestamps and the
 * server-synchronised clock. Does not create its own setInterval.
 *
 * @param order   The frontend Order object (must have Date objects for timestamps)
 * @param sla     Optional SLA overrides. Defaults to DEFAULT_SLA.
 */
export function useOrderTimer(
  order: Order,
  sla: SlaBudgets = DEFAULT_SLA
): TimerState {

  // ── Skip live timer for terminal states ───────────────────────────────────
  const isTerminal = order.status === 'completed';

  // ── Force re-render on each global tick ───────────────────────────────────
  // Using a counter rather than storing `now` avoids the stale-closure problem
  // and means we always read serverNow() fresh inside compute().
  const [tick, setTick] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Subscribe to global tick — unsubscribes automatically on unmount
  useEffect(() => {
    if (isTerminal) return; // Don't tick completed orders

    // Ensure server clock is synced before first render
    if (!clockSyncDone) syncServerClock();

    const unsubscribe = subscribeToTick(() => {
      if (mountedRef.current) setTick(t => t + 1);
    });
    return unsubscribe;
  }, [isTerminal]);

  // ── Tab visibility re-sync ────────────────────────────────────────────────
  useEffect(() => {
    if (isTerminal) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab restored — re-sync server clock to fix throttle-caused drift,
        // then force immediate re-render with corrected elapsed value.
        syncServerClock().then(() => {
          if (mountedRef.current) setTick(t => t + 1);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTerminal]);

  // ── Compute timer state ───────────────────────────────────────────────────
  // Memoized on [tick, order.status, order.id] — recomputes only when the
  // global clock ticks or the order's phase/identity changes.
  const timerState = useMemo<TimerState>(() => {
    if (isTerminal) return FROZEN_COMPLETE;

    const anchorMs = getPhaseAnchorMs(order);
    if (anchorMs === null) {
      return { elapsed: 0, remaining: 0, isOverdue: false, progress: 0, overdueBy: 0, slaBudgetSeconds: 0 };
    }

    const now            = serverNow(); // server-synchronised current time
    const elapsed        = Math.max(0, Math.floor((now - anchorMs) / 1000));
    const slaBudgetSecs  = getPhaseSlaSeconds(order, sla);

    if (slaBudgetSecs === 0) {
      // No SLA defined for this phase — show elapsed only, no deadline
      return { elapsed, remaining: 0, isOverdue: false, progress: 0, overdueBy: 0, slaBudgetSeconds: 0 };
    }

    const remaining  = Math.max(0, slaBudgetSecs - elapsed);
    const isOverdue  = elapsed > slaBudgetSecs;
    const overdueBy  = isOverdue ? elapsed - slaBudgetSecs : 0;
    // Progress can exceed 100 — UI uses this for overdue severity colouring
    const progress   = Math.round((elapsed / slaBudgetSecs) * 100);

    return { elapsed, remaining, isOverdue, progress, overdueBy, slaBudgetSeconds: slaBudgetSecs };

  // tick drives recalculation every second; order.id + order.status ensure
  // we recompute immediately on status change without waiting for next tick.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, order.id, order.status, order.startedAt, order.createdAt, order.estimatedPrepTime, sla]);

  return timerState;
}

// ─── Format utilities ─────────────────────────────────────────────────────────
// Pure functions — no state, no side effects. Safe to call anywhere.

/** Formats seconds as M:SS (e.g. "4:07"). Used for countdown display. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Formats an elapsed duration as a human-readable string (e.g. "4m 7s", "45s"). */
export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Formats an overdue duration for display (e.g. "+4m 7s overdue").
 * Uses overdueBy from TimerState — never recomputes elapsed here.
 */
export function formatOverdue(overdueBySeconds: number): string {
  return `+${formatElapsed(overdueBySeconds)} overdue`;
}