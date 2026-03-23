// ============================================================
// src/kitchen-hooks/useKitchenBoard.ts
// ============================================================
//
// FIXES IN THIS VERSION:
//
// FIX [ROLE-GUARD]: Added isKitchen role check at hook init.
//   When a CUSTOMER token is in localStorage, all API calls
//   (fetchBoard, fetchMenuItems, triggerSimulation, simulateAdvance)
//   are blocked at the source. This prevents 403 errors on the
//   customer checkout page caused by the kitchen hook firing in
//   a cached/previously-visited kitchen dashboard tab.
//
// FIX 1 [DEAD-VAR]: scheduleAutoComplete used undefined 'orderId' variable
//   in the timeout cleanup callback — should be 'order.id'.
//   This caused the countdown badge to stay stuck at "0s" after auto-complete.
//
// FIX 2 [RACE]: Poll (10s) and sim tick both called loadBoard() concurrently.
//   Now the sim tick skips loadBoard if a poll is already in-flight, using
//   a shared isLoadingRef flag. abortRef still cancels stale requests.
//
// FIX 3 [JITTER]: Fast-mode ticks fired at exact ms boundaries — all clients
//   hammered the backend simultaneously. Added ±1s random jitter to setInterval
//   so ticks spread naturally across the interval window.
//
// FIX [EXPRESS-TIME]: Express orders use 5/10/15 min windows only.
// FIX [SCHEDULED-PICKUP]: Scheduled orders show real date+time in Queue.
//
// FIX [STALE-STATE]: simulateAdvance() auto-promotes orders on the backend
//   (COOKING → READY) faster than the 10s poll cycle. When the chef clicks
//   "Mark ready" on a card the UI still shows as COOKING, the backend already
//   moved it to READY and returns 400 "Cannot transition from READY to READY".
//
//   Fix: in updateOrderStatus(), if the backend returns 400 and the response
//   body contains "Cannot transition from" + the target status is already the
//   current backend status, treat it as a success — reload the board and
//   resolve. This makes stale-state clicks idempotent instead of error-toasting.
//
// FIX [PICKUP-TIME]: resolvePickupTime now accepts an optional expressWindow
//   parameter (5 | 10 | 15) and returns "~5 min" / "~10 min" / "~15 min" for
//   express orders without a slot, instead of the generic "ASAP".
//   toFrontendOrder passes the already-computed expressMinutes value through.
//
// FIX [PICKUP-TIME-FALLBACK]: Normal and scheduled orders whose slot reservation
//   failed (silent catch in triggerSimulation) were showing "ASAP" — which is
//   only correct for express orders. They now show a derived pickup time based
//   on placedAt + totalPrepMinutes + 15 min buffer, formatted in en-IN locale.
//   This prevents misleading "ASAP" on timed pre-orders.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  fetchBoard, fetchMenuItems, createOrder, changeOrderStatus,
  assignChef as assignChefApi, activateChef as activateChefApi,
  removeChefFromShift as removeChefFromShiftApi,
  validateRemoval as validateRemovalApi,
  triggerSimulation, simulateAdvance, decodeOrderTypeFromRef,
  KanbanBoardResponse, OrderCardDto, MenuItemDto,
  StaffWorkloadDto, StaffRemovalValidationDto, SimulationResult,
  SlotCapacityDto,
} from '../kitchen-api/kitchenApi';
import {
  Order, OrderStatus, OrderType, CapacitySnapshot, BackendOrderStatus,
} from '../kitchen-types/order';
import { selectCapacity, canTransition } from './Capacityengine';

export type BackendStatus = BackendOrderStatus;
export { canTransition };

const statusMap: Record<BackendStatus, OrderStatus> = {
  PENDING: 'pending', COOKING: 'cooking', READY: 'ready', COMPLETED: 'completed',
};

const statusMapReverse: Record<OrderStatus, BackendStatus> = {
  pending: 'PENDING', cooking: 'COOKING', ready: 'READY', completed: 'COMPLETED',
};

const AUTO_COMPLETE_DELAY_MS = 20_000;

const SPEED_INTERVALS: Record<'slow' | 'normal' | 'fast', number> = {
  slow: 25_000, normal: 12_000, fast: 5_000,
};

// FIX [JITTER]: max random ms added to each interval to spread tick load.
const JITTER_MS = 1_000;

const EMPTY_METRICS = {
  totalOrdersToday: 0, completedOrdersToday: 0, avgCookTimeMinutes: 0,
  efficiencyPercent: 0, capacityUtilizationPercent: 0, lateOrdersCount: 0, activeChefCount: 0,
};

// ── EXPRESS time options ────────────────────────────────────────────────────
const EXPRESS_OPTIONS = [5, 10, 15] as const;
type ExpressMinutes   = typeof EXPRESS_OPTIONS[number];

// ── Helpers ─────────────────────────────────────────────────────────────────

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const ORDER_TYPE_HASH_TABLE: Exclude<OrderType, 'scheduled'>[] = [
  'normal',  'express', 'normal',  'normal',  'normal',
  'express', 'normal',  'normal',  'normal',  'normal',
  'express', 'normal',  'normal',  'express', 'normal',
  'normal',  'express', 'normal',  'normal',  'normal',
];

function resolveOrderType(dto: OrderCardDto): OrderType {
  if (dto.orderType) {
    const t = dto.orderType.toLowerCase();
    if (t === 'express' || t === 'scheduled' || t === 'normal') return t as OrderType;
  }
  const ref = dto.orderRef ?? '';
  if (ref.includes('-SCHEDULED')) return 'scheduled';
  if (ref.includes('-EXPRESS'))   return 'express';
  if (ref.includes('-NORMAL'))    return 'normal';
  const decoded = decodeOrderTypeFromRef(ref);
  if (decoded === 'scheduled' || decoded === 'express') return decoded;
  return ORDER_TYPE_HASH_TABLE[simpleHash(dto.id + ref) % ORDER_TYPE_HASH_TABLE.length];
}

function safeDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function resolvePickupTime(
  dto:            OrderCardDto,
  resolvedType:   OrderType,
  expressWindow?: ExpressMinutes,
): string {
  if (dto.pickupSlotTime) {
    const slotDate = new Date(dto.pickupSlotTime);
    const today    = new Date();

    const sameDay = (a: Date, b: Date) =>
      a.getDate()     === b.getDate() &&
      a.getMonth()    === b.getMonth() &&
      a.getFullYear() === b.getFullYear();

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const timeStr = slotDate.toLocaleTimeString('en-IN', {
      hour:   'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (sameDay(slotDate, today))    return timeStr;
    if (sameDay(slotDate, tomorrow)) return `Tomorrow ${timeStr}`;
    return slotDate.toLocaleDateString('en-IN', { weekday: 'short' }) + ' ' + timeStr;
  }

  if (resolvedType === 'express') {
    if (expressWindow) return `~${expressWindow} min`;
    return 'ASAP';
  }

  if (resolvedType === 'scheduled') {
    const placed = safeDate(dto.placedAt);
    if (placed) {
      const tmrw = new Date(placed);
      tmrw.setDate(placed.getDate() + 1);
      const timeStr = tmrw.toLocaleTimeString('en-IN', {
        hour:   'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `Tomorrow ~${timeStr}`;
    }
    return 'Tomorrow';
  }

  const placed = safeDate(dto.placedAt);
  if (placed) {
    const BUFFER_MS  = 15 * 60_000;
    const prepMs     = (dto.totalPrepMinutes > 0 ? dto.totalPrepMinutes : 15) * 60_000;
    const pickup     = new Date(placed.getTime() + prepMs + BUFFER_MS);
    return pickup.toLocaleTimeString('en-IN', {
      hour:   'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return 'ASAP';
}

function toFrontendOrder(dto: OrderCardDto): Order {
  const items = dto.itemSummary.map((summary, i) => {
    const match = summary.match(/^(\d+)x (.+)$/);
    return {
      id:         `${dto.id}-item-${i}`,
      menuItemId: '',
      name:       match ? match[2] : summary,
      quantity:   match ? parseInt(match[1], 10) : 1,
      prepTime:   dto.totalPrepMinutes,
    };
  });

  const isCompleted      = dto.status === 'COMPLETED';
  const placedAt         = safeDate(dto.placedAt);
  const cookingStartedAt = safeDate(dto.cookingStartedAt);
  const readyAt          = safeDate(dto.readyAt);

  let completedAt: Date | undefined = safeDate(dto.completedAt);
  if (!completedAt && isCompleted) {
    completedAt = readyAt ?? placedAt ?? new Date();
  }

  let elapsedMinutes = dto.elapsedMinutes;
  if (elapsedMinutes === 0 && cookingStartedAt) {
    const cookEnd = completedAt ?? readyAt;
    if (cookEnd) {
      const ms = cookEnd.getTime() - cookingStartedAt.getTime();
      if (ms > 0 && ms < 8 * 60 * 60 * 1000) elapsedMinutes = ms / 60_000;
    }
  }

  const resolvedType = resolveOrderType(dto);

  let expressMinutes: ExpressMinutes | undefined;
  let expressPickupSlotMs: number | undefined;

  if (resolvedType === 'express' && !dto.pickupSlotTime) {
    expressMinutes      = EXPRESS_OPTIONS[simpleHash(dto.id) % EXPRESS_OPTIONS.length];
    const base          = placedAt ?? new Date();
    const fromPlacement = base.getTime() + expressMinutes * 60_000;
    const anchor        = cookingStartedAt ?? base;
    const MIN_BUFFER_MS = 2 * 60_000;
    expressPickupSlotMs = Math.max(fromPlacement, anchor.getTime() + MIN_BUFFER_MS);
  }

  const resolvedEstimatedPrepTime: number =
    resolvedType === 'express' && expressMinutes !== undefined
      ? expressMinutes
      : dto.totalPrepMinutes;

  return {
    id:                dto.id,
    orderNumber:       dto.orderRef,
    customerName:      dto.customerName ?? dto.orderRef,
    status:            statusMap[dto.status as BackendStatus] ?? 'pending',
    backendStatus:     dto.status as BackendOrderStatus,
    orderType:         resolvedType,
    items,
    estimatedPrepTime: resolvedEstimatedPrepTime,
    elapsedMinutes,
    pickupTime:     resolvePickupTime(dto, resolvedType, expressMinutes),
    assignedTo:     dto.assignedChefName ?? undefined,
    assignedChefId: dto.assignedChefId   ?? undefined,
    createdAt:      placedAt ?? new Date(),
    startedAt:      cookingStartedAt,
    ...(readyAt     ? { readyAt }     : {}),
    completedAt,
    ...(dto.pickupSlotTime
          ? { pickupSlotMs: new Date(dto.pickupSlotTime).getTime() }
          : expressPickupSlotMs !== undefined
            ? { pickupSlotMs: expressPickupSlotMs }
            : {}
    ),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface AutoCompleteEntry {
  timeout:  ReturnType<typeof setTimeout>;
  interval: ReturnType<typeof setInterval>;
}

export function useKitchenBoard(
  pollingIntervalMs = 10_000,
  onNewOrders?: (orders: Order[]) => void,
) {
  // ── FIX [ROLE-GUARD] ──────────────────────────────────────────────────────
  // Read the role once at hook init. If the logged-in user is not KITCHEN,
  // every useEffect that touches the backend returns early immediately.
  // This prevents 403 errors on the customer dashboard caused by this hook
  // firing API calls (/api/kitchen/*) with a CUSTOMER JWT token — which
  // happens when the kitchen tab was previously visited and React keeps the
  // hook alive across navigation.
  //
  // Why localStorage (not a prop or context)?
  //   • AuthContext is in a different React tree (customer vs kitchen app)
  //   • Both apps share localStorage — it's the only reliable cross-tree signal
  //   • The value is set synchronously on login and cleared on logout
  //   • We only read it once — no subscription needed
  const isKitchen = localStorage.getItem('auth_role') === 'KITCHEN';
  // ── end role guard ────────────────────────────────────────────────────────

  const [boardData, setBoardData]             = useState<KanbanBoardResponse | null>(null);
  const [orders, setOrders]                   = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [menuItems, setMenuItems]             = useState<MenuItemDto[]>([]);

  const [isSimulating, setIsSimulating]               = useState(false);
  const [simulationSpeed, setSimulationSpeed]         = useState<'slow' | 'normal' | 'fast'>('normal');
  const [simulationError, setSimulationError]         = useState<string | null>(null);
  const [isSimTriggerPending, setIsSimTriggerPending] = useState(false);

  const [removalTargetId, setRemovalTargetId]         = useState<string | null>(null);
  const [removalValidation, setRemovalValidation]     = useState<StaffRemovalValidationDto | null>(null);
  const [isValidatingRemoval, setIsValidatingRemoval] = useState(false);
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);

  const [activatingChefId, setActivatingChefId] = useState<string | null>(null);
  const [readyCountdowns, setReadyCountdowns]   = useState<Record<string, number>>({});

  const simIntervalRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCompleteRefs = useRef<Record<string, AutoCompleteEntry>>({});
  const knownOrderIds    = useRef<Set<string>>(new Set());
  const isFirstLoad      = useRef(true);
  const onNewOrdersRef   = useRef(onNewOrders);
  useEffect(() => { onNewOrdersRef.current = onNewOrders; }, [onNewOrders]);

  const isSimulatingRef = useRef(isSimulating);
  useEffect(() => { isSimulatingRef.current = isSimulating; }, [isSimulating]);

  const boardDataRef = useRef<KanbanBoardResponse | null>(null);
  useEffect(() => { boardDataRef.current = boardData; }, [boardData]);

  const ordersRef = useRef<Order[]>([]);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  // FIX [RACE]: track whether a board load is currently in-flight.
  const isLoadingRef = useRef(false);

  const capacity: CapacitySnapshot = useMemo(() => selectCapacity(boardData), [boardData]);
  const staff: StaffWorkloadDto[]  = useMemo(() => boardData?.staff ?? [], [boardData]);
  const metrics                    = useMemo(() => boardData?.metrics ?? EMPTY_METRICS, [boardData]);
  const capacityPercent            = metrics.capacityUtilizationPercent;
  const allStaff                   = staff;
  const backupStaff                = useMemo(() => staff.filter(s => !s.onShift), [staff]);
  const backupStaffCount           = backupStaff.length;

  const counts = useMemo(() => ({
    pending:   (boardData?.columns.PENDING   ?? []).length,
    cooking:   (boardData?.columns.COOKING   ?? []).length,
    ready:     (boardData?.columns.READY     ?? []).length,
    completed: boardData?.metrics.completedOrdersToday ?? 0,
  }), [boardData]);

  // FIX [ROLE-GUARD]: only fetch menu items when KITCHEN role is active
  useEffect(() => {
    if (!isKitchen) return;
    fetchMenuItems()
      .then(items => setMenuItems(items.filter(i => i.available)))
      .catch(err => console.warn('[useKitchenBoard] Menu items unavailable:', err.message));
  }, [isKitchen]);

  const abortRef = useRef<AbortController | null>(null);

  const loadBoard = useCallback(async () => {
    // FIX [ROLE-GUARD]: never hit /api/kitchen/board with a CUSTOMER token
    if (!isKitchen) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    isLoadingRef.current = true;

    try {
      const data = await fetchBoard(controller.signal);
      if (controller.signal.aborted) return;

      setBoardData(data);

      const activeOrders = [
        ...(data.columns.PENDING ?? []),
        ...(data.columns.COOKING ?? []),
        ...(data.columns.READY   ?? []),
      ].map(toFrontendOrder);

      if (isFirstLoad.current) {
        activeOrders.forEach(o => knownOrderIds.current.add(o.id));
        isFirstLoad.current = false;
      } else {
        const brandNew = activeOrders.filter(
          o => o.status === 'pending' && !knownOrderIds.current.has(o.id)
        );
        brandNew.forEach(o => knownOrderIds.current.add(o.id));
        if (brandNew.length > 0) onNewOrdersRef.current?.(brandNew);
        activeOrders
          .filter(o => o.status !== 'pending' && !knownOrderIds.current.has(o.id))
          .forEach(o => knownOrderIds.current.add(o.id));
      }

      setOrders(activeOrders);
      setCompletedOrders((data.columns.COMPLETED ?? []).slice(0, 50).map(toFrontendOrder));
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message ?? 'Failed to load board');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [isKitchen]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // FIX [ROLE-GUARD]: only start polling when KITCHEN role is active
  useEffect(() => {
    if (!isKitchen) return;
    loadBoard();
  }, [loadBoard, isKitchen]);

  useEffect(() => {
    if (!isKitchen) return;
    const id = setInterval(loadBoard, pollingIntervalMs);
    return () => clearInterval(id);
  }, [loadBoard, pollingIntervalMs, isKitchen]);

  // ── Auto-complete timers ─────────────────────────────────────────────────

  const cancelAutoComplete = useCallback((orderId: string) => {
    const entry = autoCompleteRefs.current[orderId];
    if (entry) {
      clearTimeout(entry.timeout);
      clearInterval(entry.interval);
      delete autoCompleteRefs.current[orderId];
      setReadyCountdowns(prev => { const n = { ...prev }; delete n[orderId]; return n; });
    }
  }, []);

  const scheduleAutoComplete = useCallback((order: Order) => {
    if (!isSimulatingRef.current) return;
    if (autoCompleteRefs.current[order.id]) return;

    setReadyCountdowns(prev => ({ ...prev, [order.id]: AUTO_COMPLETE_DELAY_MS / 1000 }));

    const interval = setInterval(() => {
      setReadyCountdowns(prev => {
        const current = prev[order.id];
        if (current === undefined) return prev;
        if (current <= 1) return { ...prev, [order.id]: 0 };
        return { ...prev, [order.id]: current - 1 };
      });
    }, 1000);

    const timeout = setTimeout(async () => {
      delete autoCompleteRefs.current[order.id];
      clearInterval(interval);
      setReadyCountdowns(prev => { const n = { ...prev }; delete n[order.id]; return n; });
      try { await changeOrderStatus(order.id, 'COMPLETED'); await loadBoard(); }
      catch { await loadBoard(); }
    }, AUTO_COMPLETE_DELAY_MS);

    autoCompleteRefs.current[order.id] = { timeout, interval };
  }, [loadBoard]);

  useEffect(() => {
    const readyIds = new Set(orders.filter(o => o.status === 'ready').map(o => o.id));
    for (const id of Object.keys(autoCompleteRefs.current)) {
      if (!readyIds.has(id)) cancelAutoComplete(id);
    }
    for (const order of orders) {
      if (order.status === 'ready' && !autoCompleteRefs.current[order.id]) {
        scheduleAutoComplete(order);
      }
    }
  }, [orders, cancelAutoComplete, scheduleAutoComplete]);

  useEffect(() => {
    if (!isSimulating) {
      for (const id of Object.keys(autoCompleteRefs.current)) {
        cancelAutoComplete(id);
      }
    }
  }, [isSimulating, cancelAutoComplete]);

  useEffect(() => {
    return () => {
      for (const id of Object.keys(autoCompleteRefs.current)) {
        const e = autoCompleteRefs.current[id];
        clearTimeout(e.timeout);
        clearInterval(e.interval);
      }
      autoCompleteRefs.current = {};
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const updateOrderStatus = useCallback(async (
    orderId: string, newStatus: OrderStatus,
  ) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const fromBackend = order.backendStatus ?? statusMapReverse[order.status];
    const toBackend   = statusMapReverse[newStatus];

    if (!canTransition(fromBackend, toBackend)) {
      throw new Error(`Illegal transition: ${fromBackend} → ${toBackend}`);
    }

    if (toBackend === 'COMPLETED') cancelAutoComplete(orderId);

    // Optimistic update
    const previousOrders = orders;
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: newStatus } : o
    ));

    try {
      await changeOrderStatus(orderId, toBackend);
      await loadBoard();
    } catch (err: any) {
      // FIX [STALE-STATE]: if backend already moved the order to target status,
      // treat 400 "Cannot transition from X to X" as a success.
      const msg = (err.message ?? '').toLowerCase();
      const alreadyThere =
        msg.includes('cannot transition') &&
        msg.includes(toBackend.toLowerCase());

      if (alreadyThere) {
        console.info(
          `[updateOrderStatus] Order ${orderId} already in ${toBackend} on backend ` +
          `(stale frontend state) — treating as success and reloading board.`
        );
        await loadBoard();
        return;
      }

      console.warn(
        `[updateOrderStatus] ${fromBackend}→${toBackend} failed for order ${orderId}:`,
        err.message,
        '— reverting optimistic update and refreshing board.',
      );
      setOrders(previousOrders);
      await loadBoard();
      throw err;
    }
  }, [orders, loadBoard, cancelAutoComplete]);

  const assignChef = useCallback(async (orderId: string, chefId: string) => {
    try {
      await assignChefApi(orderId, chefId);
    } catch (err: any) {
      await loadBoard();
      throw err;
    }
    await loadBoard();
  }, [loadBoard]);

  const addOrder = useCallback(async (orderRef: string, menuItemIds: string[]): Promise<string> => {
    const id = await createOrder(orderRef, menuItemIds);
    await new Promise(r => setTimeout(r, 300));
    await loadBoard();
    return id;
  }, [loadBoard]);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimulationError(null);
  }, []);

  const runSimulationTick = useCallback(async () => {
    // FIX [ROLE-GUARD]: never trigger simulation with a CUSTOMER token
    if (!isKitchen) return;
    if (menuItems.length === 0) { setSimulationError('No menu items loaded'); return; }
    if (capacity.isOverloaded) {
      setSimulationError('Kitchen is at full capacity — simulation paused');
      setIsSimulating(false);
      return;
    }
    setIsSimTriggerPending(true);
    try {
      const slots: SlotCapacityDto[] = boardDataRef.current?.upcomingSlots ?? [];
      const result: SimulationResult = await triggerSimulation(1, menuItems, slots);
      if (result.rejected > 0 && result.reason) {
        setSimulationError(result.reason);
        if (result.reason.includes('full capacity')) setIsSimulating(false);
      } else {
        setSimulationError(null);
      }
      if (result.generated > 0) {
        try { await simulateAdvance(); } catch { /* best-effort */ }
        await new Promise(r => setTimeout(r, 300));
        if (!isLoadingRef.current) {
          await loadBoard();
        }
      }
    } catch (err: any) {
      setSimulationError(err.message);
    } finally {
      setIsSimTriggerPending(false);
    }
  }, [isKitchen, menuItems, capacity.isOverloaded, loadBoard]);

  // FIX [JITTER]: recursive setTimeout so each tick gets a fresh jitter offset.
  useEffect(() => {
    if (simIntervalRef.current) {
      clearTimeout(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    // FIX [ROLE-GUARD]: never start simulation loop for non-kitchen users
    if (!isSimulating || !isKitchen) return;

    const baseMs = SPEED_INTERVALS[simulationSpeed];

    const scheduleTick = () => {
      const jitter = Math.floor(Math.random() * JITTER_MS * 2) - JITTER_MS;
      const delay  = Math.max(1000, baseMs + jitter);
      simIntervalRef.current = setTimeout(async () => {
        await runSimulationTick().catch(console.error);
        if (isSimulatingRef.current) scheduleTick();
      }, delay);
    };

    scheduleTick();

    return () => {
      if (simIntervalRef.current) {
        clearTimeout(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, [isSimulating, isKitchen, simulationSpeed, runSimulationTick]);

  const activateBackupChef = useCallback(async (chefId: string) => {
    setActivatingChefId(chefId);
    try {
      const updatedStaff = await activateChefApi(chefId);
      setBoardData(prev => prev ? { ...prev, staff: updatedStaff } : prev);
      await loadBoard();
    } catch (err: any) {
      await loadBoard();
      throw err;
    } finally {
      setActivatingChefId(null);
    }
  }, [loadBoard]);

  const removeChefFromShift = useCallback(async (chefId: string) => {
    try {
      const updatedStaff = await removeChefFromShiftApi(chefId);
      setBoardData(prev => prev ? { ...prev, staff: updatedStaff } : prev);
      await loadBoard();
    } catch (err: any) {
      await loadBoard();
      throw err;
    }
  }, [loadBoard]);

  const initiateStaffRemoval = useCallback(async (chefId: string) => {
    setRemovalTargetId(chefId);
    setIsValidatingRemoval(true);
    try {
      const validation = await validateRemovalApi(chefId);
      setRemovalValidation(validation);
    } catch (err: any) {
      setRemovalTargetId(null);
      throw err;
    } finally {
      setIsValidatingRemoval(false);
    }
  }, []);

  const confirmStaffRemoval = useCallback(async () => {
    if (!removalTargetId) return;
    setIsConfirmingRemoval(true);
    try {
      await removeChefFromShift(removalTargetId);
    } finally {
      setIsConfirmingRemoval(false);
      setRemovalTargetId(null);
      setRemovalValidation(null);
    }
  }, [removalTargetId, removeChefFromShift]);

  const cancelStaffRemoval = useCallback(() => {
    setRemovalTargetId(null);
    setRemovalValidation(null);
    setIsValidatingRemoval(false);
    setIsConfirmingRemoval(false);
  }, []);

  const removeOrder = useCallback((orderId: string) => {
    setCompletedOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  const triggerBurst = useCallback(async (count: number): Promise<SimulationResult> => {
    // FIX [ROLE-GUARD]: never burst simulate with a CUSTOMER token
    if (!isKitchen) return { generated: 0, rejected: count, reason: 'Not authorized' };
    if (menuItems.length === 0) throw new Error('No menu items loaded — cannot simulate');
    if (capacity.isOverloaded) {
      return { generated: 0, rejected: count, reason: 'Kitchen is at full capacity' };
    }
    setIsSimTriggerPending(true);
    try {
      const slots: SlotCapacityDto[] = boardDataRef.current?.upcomingSlots ?? [];
      const result = await triggerSimulation(count, menuItems, slots);
      if (result.generated > 0) {
        try { await simulateAdvance(); } catch { /* best-effort */ }
        await new Promise(r => setTimeout(r, 300));
        await loadBoard();
      }
      setSimulationError(result.reason ?? null);
      return result;
    } finally {
      setIsSimTriggerPending(false);
    }
  }, [isKitchen, menuItems, capacity.isOverloaded, loadBoard]);

  return {
    orders, completedOrders, boardData, loading, error,
    counts, readyCountdowns,
    metrics, staff, allStaff, backupStaff, backupStaffCount,
    capacity, capacityPercent, currentCapacity: capacity.totalSlots,
    addOrder, updateOrderStatus, assignChef, removeOrder, refresh: loadBoard,
    activateBackupChef, activatingChefId, removeChefFromShift,
    initiateStaffRemoval, confirmStaffRemoval, cancelStaffRemoval,
    removalValidation, removalTargetId, isValidatingRemoval, isConfirmingRemoval,
    isSimulating, setIsSimulating, stopSimulation,
    simulationSpeed, setSimulationSpeed,
    simulationError, isSimTriggerPending, triggerBurst, menuItems,
    canTransition,
  };
}