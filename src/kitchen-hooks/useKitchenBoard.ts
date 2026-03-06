// ============================================================
// src/kitchen-hooks/useKitchenBoard.ts
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  fetchBoard,
  fetchMenuItems,
  createOrder,
  changeOrderStatus,
  assignChef as assignChefApi,
  activateChef as activateChefApi,
  removeChefFromShift as removeChefFromShiftApi,
  validateRemoval as validateRemovalApi,
  triggerSimulation,
  KanbanBoardResponse,
  OrderCardDto,
  MenuItemDto,
  StaffWorkloadDto,
  StaffRemovalValidationDto,
  SimulationResult,
} from '../kitchen-api/kitchenApi';
import { Order, OrderStatus, CapacitySnapshot, BackendOrderStatus } from '../kitchen-types/order';

export type BackendStatus = BackendOrderStatus;

// ─── Valid transition graph ───────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<BackendStatus, BackendStatus[]> = {
  PENDING:   ['COOKING'],
  COOKING:   ['READY'],
  READY:     ['COMPLETED'],
  COMPLETED: [],
};

export function canTransition(from: BackendStatus, to: BackendStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Status maps ──────────────────────────────────────────────────────────────

const statusMap: Record<BackendStatus, OrderStatus> = {
  PENDING:   'pending',
  COOKING:   'cooking',
  READY:     'ready',
  COMPLETED: 'completed',
};

const statusMapReverse: Record<OrderStatus, BackendStatus> = {
  pending:   'PENDING',
  cooking:   'COOKING',
  ready:     'READY',
  completed: 'COMPLETED',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_COMPLETE_DELAY_MS = 20_000;

const SPEED_INTERVALS: Record<'slow' | 'normal' | 'fast', number> = {
  slow:   25_000,
  normal: 12_000,
  fast:    5_000,
};

const EMPTY_METRICS = {
  totalOrdersToday:           0,
  completedOrdersToday:       0,
  avgCookTimeMinutes:         0,
  efficiencyPercent:          0,
  capacityUtilizationPercent: 0,
  lateOrdersCount:            0,
  activeChefCount:            0,
};

// ─── DTO → frontend Order ─────────────────────────────────────────────────────

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

  return {
    id:                dto.id,
    orderNumber:       dto.orderRef,
    customerName:      dto.customerName ?? dto.orderRef,
    status:            statusMap[dto.status as BackendStatus] ?? 'pending',
    backendStatus:     dto.status as BackendOrderStatus,
    priority:          dto.isLate ? 'urgent' : 'normal',
    items,
    estimatedPrepTime: dto.totalPrepMinutes,
    elapsedMinutes:    dto.elapsedMinutes,
    pickupTime:        dto.pickupSlotTime
      ? new Date(dto.pickupSlotTime).toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit',
        })
      : 'TBD',
    assignedTo:     dto.assignedChefName ?? undefined,
    assignedChefId: dto.assignedChefId   ?? undefined,
    createdAt:      new Date(dto.placedAt),
    startedAt:      undefined,
    completedAt:    undefined,
  };
}

// ─── Capacity selector ────────────────────────────────────────────────────────

export function selectCapacity(boardData: KanbanBoardResponse | null): CapacitySnapshot {
  if (!boardData) {
    return { totalSlots: 0, cookingCount: 0, freeSlots: 0, capacityPct: 0, isOverloaded: false };
  }

  const onShiftStaff  = boardData.staff.filter(s => s.onShift);
  const totalSlots    = onShiftStaff.reduce((sum, s) => sum + s.maxCapacity, 0);
  const maxQueueDepth = Math.max(totalSlots * 2, 10);

  const cookingCount = (boardData.columns.COOKING ?? []).length;
  const pendingCount = (boardData.columns.PENDING  ?? []).length;

  const freeSlots   = Math.max(0, totalSlots - cookingCount);
  const capacityPct = totalSlots > 0
    ? Math.min(100, Math.round((cookingCount / totalSlots) * 100))
    : 0;

  const cookingFull  = cookingCount >= totalSlots && totalSlots > 0;
  const queueFull    = pendingCount >= maxQueueDepth;
  const isOverloaded = cookingFull && queueFull;

  return { totalSlots, cookingCount, freeSlots, capacityPct, isOverloaded };
}

// ─── Auto-complete timer entry ────────────────────────────────────────────────

interface AutoCompleteEntry {
  timeout:  ReturnType<typeof setTimeout>;
  interval: ReturnType<typeof setInterval>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useKitchenBoard(pollingIntervalMs = 10_000) {
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

  const simIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCompleteRefs = useRef<Record<string, AutoCompleteEntry>>({});

  // ── Derived ────────────────────────────────────────────────────────────────

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
    completed: (boardData?.columns.COMPLETED ?? []).length,
  }), [boardData]);

  // ── Menu items ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMenuItems()
      .then(items => setMenuItems(items.filter(i => i.available)))
      .catch(err => console.warn('[useKitchenBoard] Menu items unavailable:', err.message));
  }, []);

  // ── Board load ─────────────────────────────────────────────────────────────
  const loadBoard = useCallback(async () => {
    try {
      const data = await fetchBoard();
      setBoardData(data);
      setOrders([
        ...(data.columns.PENDING ?? []),
        ...(data.columns.COOKING ?? []),
        ...(data.columns.READY   ?? []),
      ].map(toFrontendOrder));
      setCompletedOrders((data.columns.COMPLETED ?? []).slice(0, 50).map(toFrontendOrder));
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  useEffect(() => {
    const id = setInterval(loadBoard, pollingIntervalMs);
    return () => clearInterval(id);
  }, [loadBoard, pollingIntervalMs]);

  // ── Auto-complete timers ───────────────────────────────────────────────────
  const cancelAutoComplete = useCallback((orderId: string) => {
    const entry = autoCompleteRefs.current[orderId];
    if (entry) {
      clearTimeout(entry.timeout);
      clearInterval(entry.interval);
      delete autoCompleteRefs.current[orderId];
      setReadyCountdowns(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  }, []);

  const scheduleAutoComplete = useCallback((order: Order) => {
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
      setReadyCountdowns(prev => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
      try {
        await changeOrderStatus(order.id, 'COMPLETED');
        await loadBoard();
      } catch (err) {
        console.warn('[AutoComplete] Failed to complete order', order.id, err);
        await loadBoard();
      }
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
    return () => {
      for (const id of Object.keys(autoCompleteRefs.current)) {
        const entry = autoCompleteRefs.current[id];
        clearTimeout(entry.timeout);
        clearInterval(entry.interval);
      }
      autoCompleteRefs.current = {};
    };
  }, []);

  // ── updateOrderStatus ──────────────────────────────────────────────────────
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const fromBackend = order.backendStatus ?? statusMapReverse[order.status];
    const toBackend   = statusMapReverse[newStatus];

    if (!canTransition(fromBackend, toBackend)) {
      throw new Error(
        `Illegal transition: ${fromBackend} → ${toBackend}. ` +
        `Allowed from ${fromBackend}: ${VALID_TRANSITIONS[fromBackend].join(', ') || 'none'}`
      );
    }

    if (toBackend === 'COMPLETED') cancelAutoComplete(orderId);

    const previousOrders = orders;
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: newStatus, backendStatus: toBackend } : o)
    );

    try {
      await changeOrderStatus(orderId, toBackend);
      // Reload so backend auto-assignment is reflected (backend assigns chef on COOKING transition)
      await loadBoard();
    } catch (err: any) {
      setOrders(previousOrders);
      await loadBoard();
      throw err;
    }
  }, [orders, loadBoard, cancelAutoComplete]);

  // ── assignChef ─────────────────────────────────────────────────────────────
  // FIX: removed optimistic status update — don't set status:'cooking' before
  // both API calls confirm. Let loadBoard() sync the real state after both complete.
  const assignChef = useCallback(async (orderId: string, chefId: string) => {
    const order = orders.find(o => o.id === orderId);
    try {
      await assignChefApi(orderId, chefId);
      if (order?.status === 'pending') {
        await changeOrderStatus(orderId, 'COOKING');
      }
      await loadBoard();
    } catch (err: any) {
      await loadBoard();
      throw err;
    }
  }, [orders, loadBoard]);

  // ── addOrder ───────────────────────────────────────────────────────────────
  const addOrder = useCallback(async (orderRef: string, menuItemIds: string[]): Promise<string> => {
    const id = await createOrder(orderRef, menuItemIds);
    await new Promise(r => setTimeout(r, 300));
    await loadBoard();
    return id;
  }, [loadBoard]);

  // ── stopSimulation ────────────────────────────────────────────────────────
  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimulationError(null);
  }, []);

  // ── Simulation tick ────────────────────────────────────────────────────────
  const runSimulationTick = useCallback(async () => {
    if (menuItems.length === 0) { setSimulationError('No menu items loaded'); return; }

    if (capacity.isOverloaded) {
      setSimulationError('Kitchen is at full capacity — simulation paused');
      setIsSimulating(false);
      return;
    }

    setIsSimTriggerPending(true);
    try {
      const result: SimulationResult = await triggerSimulation(1, menuItems);
      if (result.rejected > 0 && result.reason) {
        setSimulationError(result.reason);
        if (result.reason.includes('full capacity') || result.reason.includes('at full capacity')) {
          setIsSimulating(false);
        }
      } else {
        setSimulationError(null);
      }
      if (result.generated > 0) {
        await new Promise(r => setTimeout(r, 300));
        await loadBoard();
      }
    } catch (err: any) {
      setSimulationError(err.message);
    } finally {
      setIsSimTriggerPending(false);
    }
  }, [menuItems, capacity.isOverloaded, loadBoard]);

  useEffect(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (isSimulating) {
      simIntervalRef.current = setInterval(
        () => runSimulationTick().catch(console.error),
        SPEED_INTERVALS[simulationSpeed]
      );
    }
    return () => { if (simIntervalRef.current) clearInterval(simIntervalRef.current); };
  }, [isSimulating, simulationSpeed, runSimulationTick]);

  // ── activateBackupChef ─────────────────────────────────────────────────────
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

  // ── removeChefFromShift ────────────────────────────────────────────────────
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

  // ── Staff removal flow ─────────────────────────────────────────────────────
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

  // ── removeOrder ────────────────────────────────────────────────────────────
  const removeOrder = useCallback((orderId: string) => {
    setCompletedOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  // ── triggerBurst ───────────────────────────────────────────────────────────
  const triggerBurst = useCallback(async (count: number): Promise<SimulationResult> => {
    if (menuItems.length === 0) throw new Error('No menu items loaded — cannot simulate');
    if (capacity.isOverloaded) {
      return { generated: 0, rejected: count, reason: 'Kitchen is at full capacity' };
    }
    setIsSimTriggerPending(true);
    try {
      const result = await triggerSimulation(count, menuItems);
      if (result.generated > 0) {
        await new Promise(r => setTimeout(r, 300));
        await loadBoard();
      }
      setSimulationError(result.reason ?? null);
      return result;
    } finally {
      setIsSimTriggerPending(false);
    }
  }, [menuItems, capacity.isOverloaded, loadBoard]);

  return {
    orders,
    completedOrders,
    boardData,
    loading,
    error,

    counts,
    readyCountdowns,

    metrics,
    staff,
    allStaff,
    backupStaff,
    backupStaffCount,
    capacity,
    capacityPercent,
    currentCapacity: capacity.totalSlots,

    addOrder,
    updateOrderStatus,
    assignChef,
    removeOrder,
    refresh: loadBoard,

    activateBackupChef,
    activatingChefId,
    removeChefFromShift,

    initiateStaffRemoval,
    confirmStaffRemoval,
    cancelStaffRemoval,
    removalValidation,
    removalTargetId,
    isValidatingRemoval,
    isConfirmingRemoval,

    isSimulating,
    setIsSimulating,
    stopSimulation,
    simulationSpeed,
    setSimulationSpeed,
    simulationError,
    isSimTriggerPending,
    triggerBurst,
    menuItems,

    canTransition,
  };
}