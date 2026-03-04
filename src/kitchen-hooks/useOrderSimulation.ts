import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Order, OrderStatus, OrderPriority, OrderItem } from '../kitchen-types/order';
import { menuItems, customerNames, specialNotes } from '../kitchen-data/menuItems';
import {
  fetchBoard,
  fetchMenuItems,
  createOrder as apiCreateOrder,
  changeOrderStatus as apiChangeOrderStatus,
  OrderCardDto,
  MenuItemDto,
} from '../kitchen-api/kitchenApi';

// ─── Speed config ─────────────────────────────────────────────────────────────
const SPEED_INTERVALS: Record<'slow' | 'normal' | 'fast', number> = {
  slow: 25000,
  normal: 12000,
  fast: 5000,
};

// ─── Map backend OrderCardDto → frontend Order ────────────────────────────────
function mapBackendOrder(dto: OrderCardDto): Order {
  const statusMap: Record<string, OrderStatus> = {
    PENDING:   'pending',
    COOKING:   'cooking',
    READY:     'ready',
    COMPLETED: 'completed',
  };

  return {
    id:          dto.id,
    orderNumber: dto.orderRef,
    customerName: dto.itemSummary?.[0] ?? 'Customer',
    items: dto.itemSummary.map((name, i) => ({
      id:       `${dto.id}-${i}`,
      name,
      quantity: 1,
      prepTime: dto.totalPrepMinutes,
    })),
    status:            statusMap[dto.status] ?? 'pending',
    priority:          dto.isLate ? 'urgent' : 'normal',
    pickupTime:        dto.pickupSlotTime ?? '',
    createdAt:         new Date(dto.placedAt),
    estimatedPrepTime: dto.totalPrepMinutes,
    assignedTo:        dto.assignedChefName ?? undefined,
    backendId:         dto.id,
  } as Order & { backendId: string };
}

// ─── Local order generators (for simulation) ──────────────────────────────────
const generatePickupTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + Math.floor(Math.random() * 45) + 15);
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const generatePriority = (): OrderPriority => {
  const rand = Math.random();
  if (rand < 0.1) return 'urgent';
  if (rand < 0.3) return 'high';
  return 'normal';
};

const generateLocalItems = (backendItems: MenuItemDto[]): OrderItem[] => {
  const pool = backendItems.length > 0 ? backendItems : menuItems;
  const numItems = Math.floor(Math.random() * 3) + 1;
  const items: OrderItem[] = [];
  const used = new Set<string>();
  for (let i = 0; i < numItems; i++) {
    let item = pool[Math.floor(Math.random() * pool.length)] as any;
    let attempts = 0;
    while (used.has(item.id) && attempts < 10) {
      item = pool[Math.floor(Math.random() * pool.length)] as any;
      attempts++;
    }
    used.add(item.id);
    const note = specialNotes[Math.floor(Math.random() * specialNotes.length)];
    items.push({
      id:       `${Date.now()}-${i}`,
      name:     item.name,
      quantity: Math.floor(Math.random() * 2) + 1,
      prepTime: item.prepTimeMinutes ?? item.prepTime ?? 10,
      notes:    note || undefined,
    });
  }
  return items;
};

const playNotificationSound = (priority: OrderPriority) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const beep = (freq: number, type: OscillatorType, vol: number, delay: number, dur: number) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.frequency.value = freq;
        osc.type = type;
        gain.gain.value = vol;
        osc.start();
        setTimeout(() => osc.stop(), dur);
      }, delay);
    };
    if (priority === 'urgent') {
      beep(880, 'square', 0.1, 0, 100);
      beep(880, 'square', 0.1, 150, 100);
      beep(880, 'square', 0.1, 300, 100);
    } else if (priority === 'high') {
      beep(660, 'sine', 0.08, 0, 150);
      beep(660, 'sine', 0.08, 200, 150);
    } else {
      beep(523, 'sine', 0.05, 0, 200);
    }
  } catch { /* silent */ }
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useOrderSimulation = (
  initialOrders: Order[] = [],
  notifyNewOrder?: (order: Order) => void,
  notifySystem?: (title: string, message: string) => void,
) => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [isSimulating, setIsSimulatingState] = useState(false);
  const [simulationSpeed, setSimulationSpeedState] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [backendItems, setBackendItems] = useState<MenuItemDto[]>([]);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isLoadingFromBackend, setIsLoadingFromBackend] = useState(true);

  const orderCounterRef = useRef(2860);
  const speedRef = useRef(simulationSpeed);
  const activeToastRef = useRef<string | number | null>(null);

  useEffect(() => { speedRef.current = simulationSpeed; }, [simulationSpeed]);

  // ── ON MOUNT: Load existing orders from backend ────────────────────────────
  useEffect(() => {
    const loadFromBackend = async () => {
      try {
        const [board, items] = await Promise.all([
          fetchBoard(),
          fetchMenuItems(),
        ]);

        // Rehydrate all non-completed orders from board
        const active: Order[] = [
          ...board.columns.PENDING.map(mapBackendOrder),
          ...board.columns.COOKING.map(mapBackendOrder),
          ...board.columns.READY.map(mapBackendOrder),
        ];

        const completed: Order[] = board.columns.COMPLETED.map(mapBackendOrder);

        setOrders(active);
        setCompletedOrders(completed.slice(0, 50));
        setBackendItems(items.filter((i: MenuItemDto) => i.available));
        setBackendError(null);

        // Set order counter above the highest existing order number
        const allNums = [...active, ...completed]
          .map(o => parseInt(o.orderNumber.replace('#', '')))
          .filter(n => !isNaN(n));
        if (allNums.length > 0) {
          orderCounterRef.current = Math.max(...allNums);
        }
      } catch {
        // Backend offline — start with empty state, use mock data for simulation
        setBackendError('Backend offline — orders will not persist');
        try {
          const items = await fetchMenuItems();
          setBackendItems(items.filter((i: MenuItemDto) => i.available));
        } catch { /* fully offline */ }
      } finally {
        setIsLoadingFromBackend(false);
      }
    };

    loadFromBackend();
  }, []);

  // ── Poll backend every 30s to stay in sync ────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const board = await fetchBoard();
        const active: Order[] = [
          ...board.columns.PENDING.map(mapBackendOrder),
          ...board.columns.COOKING.map(mapBackendOrder),
          ...board.columns.READY.map(mapBackendOrder),
        ];
        // Only update if simulation is paused (avoid overwriting live sim state)
        if (!isSimulating) {
          setOrders(active);
          setCompletedOrders(board.columns.COMPLETED.map(mapBackendOrder).slice(0, 50));
        }
      } catch { /* silent — keep showing current state */ }
    }, 30000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // ── setIsSimulating ────────────────────────────────────────────────────────
  const setIsSimulating = useCallback((value: boolean) => {
    setIsSimulatingState(value);
    const speedLabel = { slow: '0.5x', normal: '1x', fast: '2x' }[speedRef.current];
    if (activeToastRef.current) toast.dismiss(activeToastRef.current);
    if (value) {
      activeToastRef.current = toast.success('▶ Simulation Started', {
        description: `Generating orders at ${speedLabel} speed`,
        duration: 3000,
      });
      notifySystem?.('Simulation Started', `Running at ${speedLabel}`);
    } else {
      activeToastRef.current = toast.info('⏸ Simulation Paused', {
        description: 'Order generation stopped',
        duration: 3000,
      });
      notifySystem?.('Simulation Paused', 'Order generation stopped');
    }
  }, [notifySystem]);

  // ── setSimulationSpeed ─────────────────────────────────────────────────────
  const setSimulationSpeed = useCallback((speed: 'slow' | 'normal' | 'fast') => {
    setSimulationSpeedState(speed);
    const labels = { slow: '0.5x — every 25s', normal: '1x — every 12s', fast: '2x — every 5s' };
    if (activeToastRef.current) toast.dismiss(activeToastRef.current);
    activeToastRef.current = toast.info(`⚡ Speed: ${labels[speed]}`, { duration: 2000 });
    notifySystem?.('Speed Changed', `Simulation at ${labels[speed]}`);
  }, [notifySystem]);

  // ── generateNewOrder ───────────────────────────────────────────────────────
  const generateNewOrder = useCallback((): Order => {
    const items = generateLocalItems(backendItems);
    const priority = generatePriority();
    const estimatedPrepTime = Math.max(...items.map(i => i.prepTime)) + (items.length - 1) * 2;
    orderCounterRef.current += 1;
    return {
      id:            `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderNumber:   `#${orderCounterRef.current}`,
      customerName:  customerNames[Math.floor(Math.random() * customerNames.length)],
      items,
      status:        'pending',
      priority,
      pickupTime:    generatePickupTime(),
      createdAt:     new Date(),
      estimatedPrepTime,
    };
  }, [backendItems]);

  // ── addOrder: optimistic UI + persist to backend ───────────────────────────
  const addOrder = useCallback(async (order?: Order) => {
    const newOrder = order || generateNewOrder();

    // Optimistic UI update
    setOrders(prev => [newOrder, ...prev]);
    playNotificationSound(newOrder.priority);

    // Toast
    if (activeToastRef.current) toast.dismiss(activeToastRef.current);
    const priorityPrefix =
      newOrder.priority === 'urgent' ? '🔥 URGENT' :
      newOrder.priority === 'high'   ? '⚡ High Priority' : '🆕 New Order';
    const toastFn =
      newOrder.priority === 'urgent' ? toast.error :
      newOrder.priority === 'high'   ? toast.warning : toast.success;
    activeToastRef.current = toastFn(
      `${priorityPrefix} — ${newOrder.orderNumber}`,
      {
        description: `${newOrder.items.length} item(s) for ${newOrder.customerName} · Pickup: ${newOrder.pickupTime}`,
        duration: 4000,
      }
    );

    notifyNewOrder?.(newOrder);

    // Persist to backend
    if (backendItems.length > 0) {
      try {
        const menuItemIds = newOrder.items
          .map(item => backendItems.find(b => b.name === item.name)?.id)
          .filter(Boolean) as string[];

        if (menuItemIds.length > 0) {
          const backendId = await apiCreateOrder(newOrder.orderNumber, menuItemIds as any);
          // Patch local order with real backend UUID so status changes can sync
          setOrders(prev => prev.map(o =>
            o.id === newOrder.id ? { ...o, id: backendId, backendId } : o
          ));
        }
      } catch { /* offline — order stays local only */ }
    }

    return newOrder;
  }, [generateNewOrder, backendItems, notifyNewOrder]);

  // ── updateOrderStatus ──────────────────────────────────────────────────────
  const updateOrderStatus = useCallback(async (
    orderId: string,
    status: OrderStatus,
    assignedTo?: string,
  ) => {
    let backendId: string | undefined;

    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      backendId = (order as any).backendId ?? order.id;

      const updates: Partial<Order> = { status };
      if (status === 'cooking'   && !order.startedAt)   updates.startedAt   = new Date();
      if (status === 'completed' && !order.completedAt) updates.completedAt = new Date();
      if (assignedTo) updates.assignedTo = assignedTo;

      if (status === 'completed') {
        setTimeout(() => {
          setOrders(p => p.filter(o => o.id !== orderId));
          setCompletedOrders(p => [{ ...order, ...updates } as Order, ...p].slice(0, 50));
        }, 2000);
      }

      return { ...order, ...updates };
    }));

    // Sync status to backend
    if (backendId) {
      try {
        await apiChangeOrderStatus(backendId, status.toUpperCase());
      } catch { /* fail silently */ }
    }
  }, []);

  const removeOrder = useCallback((orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  // ── Auto-generate orders when simulation is running ────────────────────────
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.7) addOrder();
    }, SPEED_INTERVALS[simulationSpeed]);
    return () => clearInterval(interval);
  }, [isSimulating, simulationSpeed, addOrder]);

  return {
    orders,
    setOrders,
    completedOrders,
    isSimulating,
    setIsSimulating,
    simulationSpeed,
    setSimulationSpeed,
    addOrder,
    updateOrderStatus,
    removeOrder,
    generateNewOrder,
    backendError,
    isLoadingFromBackend,
  };
};