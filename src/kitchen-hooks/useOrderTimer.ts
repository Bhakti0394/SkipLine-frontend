// ============================================================
// src/kitchen-hooks/useOrderTimer.ts
// ============================================================
// FLOW:
//   PENDING  → pickup slot countdown / SLA urgency
//   COOKING  → NORMAL: elapsed since cookingStartedAt (↑)
//              EXPRESS: deadline countdown (↓), overdue (↑)
//   READY    → elapsed since readyAt (↑)
//   COMPLETED → frozen
// ============================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { Order } from '../kitchen-types/order';

// ─── Server clock sync ────────────────────────────────────────────────────────

const SERVER_TIME_URL =
  (import.meta.env.VITE_API_BASE_URL ?? '') + '/api/kitchen/server-time';
let serverClockOffsetMs = 0;
let clockSyncPending    = false;
let clockSyncDone       = false;
let lastSyncSuccessAt   = 0;
let lastSyncToken       = '';
const SYNC_RETRY_COOLDOWN_MS = 60_000;

function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Reset sync state when auth token changes (logout/re-login)
// so the new session gets a fresh server clock sync with the correct token.
export function resetServerClockSync(): void {
  serverClockOffsetMs = 0;
  clockSyncPending    = false;
  clockSyncDone       = false;
  lastSyncSuccessAt   = 0;
  lastSyncToken       = '';
}

async function syncServerClock(): Promise<void> {
  if (clockSyncPending) return;
  // Reset if auth token changed since last sync (logout/re-login scenario)
  const currentToken = localStorage.getItem('auth_token') ?? '';
  if (currentToken !== lastSyncToken) {
    clockSyncDone     = false;
    lastSyncSuccessAt = 0;
    lastSyncToken     = currentToken;
  }
  // If last sync succeeded recently, skip — but always allow retry after failure
  if (clockSyncDone && Date.now() - lastSyncSuccessAt < SYNC_RETRY_COOLDOWN_MS) return;
  clockSyncPending = true;
  try {
    const t0  = Date.now();
    const res = await fetch(SERVER_TIME_URL, {
      credentials: 'include',
      headers: getAuthHeader(),
    });
    const t1  = Date.now();
    if (!res.ok) return;
    const { serverTimeMs }: { serverTimeMs: number } = await res.json();
    serverClockOffsetMs = serverTimeMs - (t0 + (t1 - t0) / 2);
    clockSyncDone     = true;
    lastSyncSuccessAt = Date.now(); // only stamp on success — failure stays retryable
  } catch {
    serverClockOffsetMs = 0;
    // Do NOT set lastSyncSuccessAt — allows retry on next visibility change
    clockSyncDone = true;
  } finally {
    clockSyncPending = false;
  }
}
export function serverNow(): number {
  return Date.now() + serverClockOffsetMs;
}

// ─── Global tick ──────────────────────────────────────────────────────────────

type TickCallback = (nowMs: number) => void;

// Keyed by a stable symbol so HMR module re-execution and React StrictMode
// double-invocation both find the same singleton on the window object instead
// of creating a second Set and a second interval on the re-executed module.
const TICK_KEY      = Symbol.for('__skipline_tick_subscribers__');
const INTERVAL_KEY  = Symbol.for('__skipline_tick_interval__');

function getTickStore(): { subscribers: Set<TickCallback>; interval: ReturnType<typeof setInterval> | null } {
  const w = window as any;
  if (!w[TICK_KEY]) {
    w[TICK_KEY]      = new Set<TickCallback>();
    w[INTERVAL_KEY]  = null;
  }
  return { get subscribers() { return w[TICK_KEY]; }, get interval() { return w[INTERVAL_KEY]; },
           set interval(v) { w[INTERVAL_KEY] = v; } };
}

function subscribeToTick(cb: TickCallback): () => void {
  const store = getTickStore();
  store.subscribers.add(cb);
  if (store.interval === null && store.subscribers.size === 1) {
    store.interval = setInterval(() => {
      const now = serverNow();
      store.subscribers.forEach(fn => fn(now));
    }, 1000);
  }
  return () => {
    store.subscribers.delete(cb);
    if (store.subscribers.size === 0 && store.interval !== null) {
      clearInterval(store.interval);
      store.interval = null;
    }
  };
}

// ─── SLA config ───────────────────────────────────────────────────────────────

interface SlaBudgets {
  expressPendingSlaMinutes: number;
  readySlaMinutes:          number;
}
const DEFAULT_SLA: SlaBudgets = {
  expressPendingSlaMinutes: 2,
  readySlaMinutes:          10,
};

// ─── TimerState ───────────────────────────────────────────────────────────────

export interface TimerState {
  elapsed:                number;
  orderAge:               number;
  cookingElapsed:         number;
  cookingDisplay:         string;
  isOverdue:              boolean;
  overdueBySeconds:       number;
  overdueDisplay:         string;
  expressDeadlineMs:      number | null;
  cookingTime:            number;
  eta:                    number;
  queuedTime:             number;
  remaining:              number;
  progress:               number;
  overdueBy:              number;
  slaBudgetSeconds:       number;
  pickupCountdownSeconds: number | null;
  isPendingUrgent:        boolean;
}

const FROZEN_COMPLETE: TimerState = {
  elapsed: 0, orderAge: 0,
  cookingElapsed: 0, cookingDisplay: '0s',
  isOverdue: false, overdueBySeconds: 0, overdueDisplay: '',
  expressDeadlineMs: null,
  cookingTime: 0, eta: 0, queuedTime: 0,
  remaining: 0, progress: 100, overdueBy: 0,
  slaBudgetSeconds: 0, pickupCountdownSeconds: null, isPendingUrgent: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMs(val: unknown): number | null {
  if (!val) return null;
  if (val instanceof Date)  return isNaN(val.getTime()) ? null : val.getTime();
  if (typeof val === 'number' && val > 0)
    return val < 1_000_000_000_000 ? val * 1000 : val;
  if (typeof val === 'string' && val.trim()) {
    const ms = new Date(val).getTime();
    return isNaN(ms) ? null : ms;
  }
  return null;
}

function resolveCookingStartMs(order: Order): number | null {
  const o = order as any;
  return (
    toMs(o.startedAt)        ??
    toMs(o.cookingStartedAt) ??
    toMs(o.cookStartedAt)    ??
    toMs(o.startTime)        ??
    null
  );
}

// FIX: resolveExpressDeadlineMs now respects cookingStartedAt.
//
// OLD (broken):
//   Fallback = createdAt + EXPRESS_MAX_MS (15min, hardcoded).
//   Example: order placed at 11:33 AM → deadline = 11:48 AM.
//   But simulation queues orders and only promotes them later — cooking may
//   start AT 11:48 AM, exactly when the deadline expires → instantly overdue.
//   Result: every express order showed "+Xm overdue" the moment it hit Cooking.
//
// NEW:
//   1. If order.pickupSlotMs is set (computed by toFrontendOrder with the
//      cookStart+2min buffer), use it — this is the pre-corrected value.
//   2. If not, apply the same buffer logic inline:
//      deadline = max(createdAt + EXPRESS_MAX_MS, cookStart + MIN_COOK_BUFFER_MS)
//      This guarantees at least MIN_COOK_BUFFER_MS (2min) of cook time before
//      the order is considered overdue, regardless of when it was placed.
//
// The cookingStartMs parameter is passed in (already resolved by the caller)
// so we don't re-resolve it here — avoids double Date object construction.
const EXPRESS_MAX_MS       = 15 * 60 * 1000; // 15 min from placement
const MIN_COOK_BUFFER_MS   =  2 * 60 * 1000; // at least 2 min after cook start

function resolveExpressDeadlineMs(order: Order, cookingStartMs: number | null): number | null {
  if (order.orderType !== 'express') return null;
  const o = order as any;

  const fromDeadline = toMs(o.pickupDeadlineAt);
  if (fromDeadline !== null) return fromDeadline;

  // FIX: read pickupSlotMs first — toFrontendOrder already applied the
  // cookStart+2min buffer when computing this field.
  const fromSlot = toMs(o.pickupSlotMs) ?? toMs(o.expressPickupSlotMs);
  if (fromSlot !== null) return fromSlot;

  // Fallback: compute with buffer so order isn't instantly overdue.
  const anchor = toMs(order.createdAt);
  if (anchor === null) return null;

  const fromPlacement = anchor + EXPRESS_MAX_MS;

  // If we know when cooking started, guarantee at least MIN_COOK_BUFFER_MS
  // of cook time so the order isn't overdue the moment it enters Cooking.
  if (cookingStartMs !== null) {
    return Math.max(fromPlacement, cookingStartMs + MIN_COOK_BUFFER_MS);
  }

  return fromPlacement;
}

function resolvePickupSlotMs(order: Order): number | null {
  const o   = order as any;
  const raw = toMs(o.pickupSlotMs) ?? toMs(o.pickupSlot);
  if (raw) return raw;

  const display = order.pickupTime;
  if (!display || display === 'TBD' || display === 'ASAP') return null;

  if (display.includes('T') || display.includes('-')) {
    const ms = new Date(display).getTime();
    if (!isNaN(ms)) return ms;
  }

  const parsed = new Date(`${new Date().toDateString()} ${display}`);
  return isNaN(parsed.getTime()) ? null : parsed.getTime();
}
function resolveReadyAnchorMs(order: Order, mountTimeMs: number): number {
  const o       = order as any;
  const readyAt = toMs(o.readyAt);
  if (readyAt !== null) return readyAt;
  const placedAtMs = toMs(order.createdAt);
  const prepMs     = (order.estimatedPrepTime ?? 0) * 60 * 1000;
  if (placedAtMs !== null && prepMs > 0) return placedAtMs + prepMs;
  // Use mountTimeMs (captured once when hook first ran for this order)
  // as the anchor — more stable than calling serverNow() inside useMemo
  // which would shift the anchor on every recompute.
  return mountTimeMs;
}

// ─── Format utilities (exported for OrderTimer.tsx) ───────────────────────────

export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

export function formatMinutes(seconds: number): string {
  return formatElapsed(seconds);
}

export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return r > 0 ? `${m}m ${r}s` : `${m}m`;
  return `${r}s`;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function formatOverdue(overdueBySeconds: number): string {
  return `+${formatElapsed(overdueBySeconds)}`;
}

// ─── Core hook ────────────────────────────────────────────────────────────────

export function useOrderTimer(order: Order, sla: SlaBudgets = DEFAULT_SLA): TimerState {
  const isTerminal = order.status === 'completed';

  const [nowMs, setNowMs] = useState<number>(() => serverNow());

  const mountedRef   = useRef(true);
  const mountTimeRef = useRef<number>(serverNow());

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (isTerminal) return;
    if (!clockSyncDone) syncServerClock();
    return subscribeToTick((ts) => {
      if (mountedRef.current) setNowMs(ts);
    });
  }, [isTerminal]);

  useEffect(() => {
    if (isTerminal) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncServerClock().then(() => {
          if (mountedRef.current) setNowMs(serverNow());
        });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isTerminal]);

  // Resolve stable primitive values outside useMemo so they can be deps.
  // FIX: cookingStartMs is resolved here and passed into resolveExpressDeadlineMs
  // so the deadline calculation has the cook-start buffer without needing a
  // second call to resolveCookingStartMs inside the memo.
  const cookingStartMs = resolveCookingStartMs(order);
  const pickupSlotMs   = (order as any).pickupSlotMs as number | undefined;

  // FIX: expressDeadlineMs is now resolved INSIDE useMemo (not outside) and
  // added to the deps array.
  //
  // OLD (broken): resolveExpressDeadlineMs(order) was called outside useMemo,
  // its return value was used inside the memo but NOT listed as a dep.
  // The memo never invalidated when the deadline changed (e.g. after cookingStartMs
  // was set on the first COOKING poll), so it kept showing stale overdue state.
  //
  // NEW: computed inside memo → always fresh when any dep changes.
  // cookingStartMs is in deps → any change to startedAt/cookingStartedAt
  // re-runs the memo and picks up the buffered deadline.

  return useMemo<TimerState>(() => {
    if (isTerminal) return FROZEN_COMPLETE;

    const now          = nowMs;
    const orderType    = order.orderType ?? 'normal';
    const isExpress    = orderType === 'express';
    const createdAtMs  = toMs(order.createdAt);
    const prepTimeSecs = (order.estimatedPrepTime ?? 0) * 60;
    const createdAge   = createdAtMs !== null
      ? Math.max(0, Math.floor((now - createdAtMs) / 1000))
      : 0;

    // ─── PENDING ──────────────────────────────────────────────────────────────
    if (order.status === 'pending') {
      const pickupMs = resolvePickupSlotMs(order);

      if (isExpress && pickupMs === null) {
        const slaBudgetSecs    = sla.expressPendingSlaMinutes * 60;
        const remaining        = Math.max(0, slaBudgetSecs - createdAge);
        const isOverdue        = createdAge > slaBudgetSecs;
        const overdueBySeconds = isOverdue ? createdAge - slaBudgetSecs : 0;
        return {
          elapsed: createdAge, orderAge: createdAge,
          cookingElapsed: 0, cookingDisplay: '0s',
          isOverdue, overdueBySeconds,
          overdueDisplay: isOverdue ? formatOverdue(overdueBySeconds) : '',
          expressDeadlineMs: null,
          cookingTime: 0, eta: 0, queuedTime: 0,
          remaining,
          progress: Math.min(100, Math.round((createdAge / slaBudgetSecs) * 100)),
          overdueBy: overdueBySeconds,
          slaBudgetSeconds: slaBudgetSecs,
          pickupCountdownSeconds: remaining,
          isPendingUrgent: isOverdue || remaining <= 30,
        };
      }

      if (pickupMs !== null) {
        const pcs             = Math.floor((pickupMs - now) / 1000);
        const releaseWinSecs  = prepTimeSecs + 5 * 60;
        const isPendingUrgent =
          (pcs <= releaseWinSecs && pcs > 0) ||
          (isExpress && pcs <= sla.expressPendingSlaMinutes * 60 && pcs > 0);
        const totalWindow     = createdAtMs ? pickupMs - createdAtMs : 3_600_000;
        const elapsed2        = createdAtMs ? now - createdAtMs : 0;
        const clamped         = Math.max(0, pcs);
        const isOverdue       = pcs < 0;
        const overdueBySeconds = isOverdue ? Math.abs(pcs) : 0;
        return {
          elapsed: createdAge, orderAge: createdAge,
          cookingElapsed: 0, cookingDisplay: '0s',
          isOverdue, overdueBySeconds,
          overdueDisplay: isOverdue ? formatOverdue(overdueBySeconds) : '',
          expressDeadlineMs: null,
          cookingTime: 0, eta: 0, queuedTime: 0,
          remaining: clamped,
          progress: Math.min(100, Math.round((elapsed2 / totalWindow) * 100)),
          overdueBy: overdueBySeconds,
          slaBudgetSeconds: 0, pickupCountdownSeconds: clamped, isPendingUrgent,
        };
      }

      return {
        elapsed: createdAge, orderAge: createdAge,
        cookingElapsed: 0, cookingDisplay: '0s',
        isOverdue: false, overdueBySeconds: 0, overdueDisplay: '',
        expressDeadlineMs: null,
        cookingTime: 0, eta: 0, queuedTime: 0,
        remaining: 0, progress: 0, overdueBy: 0,
        slaBudgetSeconds: 0, pickupCountdownSeconds: null, isPendingUrgent: false,
      };
    }

    // ─── COOKING ──────────────────────────────────────────────────────────────
    if (order.status === 'cooking') {

      if (isExpress) {
        // FIX: resolveExpressDeadlineMs now takes cookingStartMs so the fallback
        // applies the MIN_COOK_BUFFER_MS floor, preventing instant-overdue.
        const deadlineMs = resolveExpressDeadlineMs(order, cookingStartMs);
        if (deadlineMs !== null) {
          const secsRemaining    = Math.floor((deadlineMs - now) / 1000);
          const isOverdue        = secsRemaining <= 0;
          const overdueBySeconds = isOverdue ? Math.abs(secsRemaining) : 0;

          const windowSecs = createdAtMs
            ? Math.max(1, Math.floor((deadlineMs - createdAtMs) / 1000))
            : prepTimeSecs;
          const elapsed = createdAtMs
            ? Math.max(0, Math.floor((now - createdAtMs) / 1000))
            : 0;
          const progress = Math.min(100, Math.round((elapsed / windowSecs) * 100));
          const cookingElapsed = isOverdue ? overdueBySeconds : Math.max(0, secsRemaining);
          const cookingDisplay = isOverdue
            ? formatOverdue(overdueBySeconds)
            : formatCountdown(secsRemaining);

          return {
            elapsed: cookingElapsed, orderAge: createdAge,
            cookingElapsed, cookingDisplay,
            isOverdue, overdueBySeconds,
            overdueDisplay: isOverdue ? formatOverdue(overdueBySeconds) : '',
            expressDeadlineMs: deadlineMs,
            cookingTime: cookingElapsed,
            eta: isOverdue ? 0 : secsRemaining,
            queuedTime: cookingStartMs && createdAtMs
              ? Math.max(0, Math.floor((cookingStartMs - createdAtMs) / 1000))
              : 0,
            remaining: isOverdue ? 0 : secsRemaining,
            progress, overdueBy: overdueBySeconds,
            slaBudgetSeconds: windowSecs,
            pickupCountdownSeconds: isOverdue ? 0 : secsRemaining,
            isPendingUrgent: false,
          };
        }
      }

      // NORMAL / SCHEDULED: elapsed ↑, overdue when elapsed > prepTime
      const anchorMs       = cookingStartMs ?? now;
      const cookingElapsed = Math.max(0, Math.floor((now - anchorMs) / 1000));
      const eta            = prepTimeSecs > 0 ? Math.max(0, prepTimeSecs - cookingElapsed) : 0;
      const isOverdue      = prepTimeSecs > 0 && cookingElapsed > prepTimeSecs;
      const overdueBySeconds = isOverdue ? cookingElapsed - prepTimeSecs : 0;

      return {
        elapsed: cookingElapsed, orderAge: createdAge,
        cookingElapsed,
        cookingDisplay: formatElapsed(cookingElapsed),
        isOverdue, overdueBySeconds,
        overdueDisplay: isOverdue ? formatOverdue(overdueBySeconds) : '',
        expressDeadlineMs: null,
        cookingTime: cookingElapsed,
        eta,
        queuedTime: cookingStartMs && createdAtMs
          ? Math.max(0, Math.floor((cookingStartMs - createdAtMs) / 1000))
          : 0,
        remaining: eta,
        progress: prepTimeSecs > 0
          ? Math.min(100, Math.round((cookingElapsed / prepTimeSecs) * 100))
          : 0,
        overdueBy: overdueBySeconds,
        slaBudgetSeconds: prepTimeSecs,
        pickupCountdownSeconds: null,
        isPendingUrgent: false,
      };
    }

    // ─── READY ────────────────────────────────────────────────────────────────
    if (order.status === 'ready') {
      const readyAnchorMs    = resolveReadyAnchorMs(order, mountTimeRef.current);
      const slaBudgetSecs    = sla.readySlaMinutes * 60;
      const elapsed          = Math.max(0, Math.floor((now - readyAnchorMs) / 1000));
      const remaining        = Math.max(0, slaBudgetSecs - elapsed);
      const isOverdue        = elapsed > slaBudgetSecs;
      const overdueBySeconds = isOverdue ? elapsed - slaBudgetSecs : 0;

      return {
        elapsed, orderAge: elapsed,
        cookingElapsed: 0, cookingDisplay: '0s',
        isOverdue, overdueBySeconds,
        overdueDisplay: isOverdue ? formatOverdue(overdueBySeconds) : '',
        expressDeadlineMs: null,
        cookingTime: 0, eta: 0, queuedTime: 0,
        remaining,
        progress: Math.min(100, Math.round((elapsed / slaBudgetSecs) * 100)),
        overdueBy: overdueBySeconds,
        slaBudgetSeconds: slaBudgetSecs,
        pickupCountdownSeconds: null, isPendingUrgent: false,
      };
    }

    return FROZEN_COMPLETE;

  // eslint-disable-next-line react-hooks/exhaustive-deps
 // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    nowMs,
    order.id, order.status, order.orderType,
    cookingStartMs,
    pickupSlotMs,
    order.createdAt, order.estimatedPrepTime, order.pickupTime,
    // Use typed optional fields from Order — readyAt and completedAt
    // are declared on the Order interface so no cast needed.
    order.readyAt,
    // pickupDeadlineAt and expressPickupSlotMs are not on the Order type —
    // read via the already-resolved pickupSlotMs which covers both cases,
    // since toFrontendOrder merges expressPickupSlotMs into pickupSlotMs.
    sla,
  ]);
}