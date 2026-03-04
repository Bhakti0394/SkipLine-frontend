// src/kitchen-hooks/useKitchenBoard.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchBoard,
  fetchMenuItems,
  createOrder,
  changeOrderStatus,
  assignChef as assignChefApi,   // ← imported
  KanbanBoardResponse,
  OrderCardDto,
  MenuItemDto,
  StaffWorkloadDto,
} from '../kitchen-api/kitchenApi';
import { Order, OrderStatus } from '../kitchen-types/order';

const statusMap: Record<string, OrderStatus> = {
  PENDING: 'pending', COOKING: 'cooking', READY: 'ready', COMPLETED: 'completed',
};
const statusMapReverse: Record<string, string> = {
  pending: 'PENDING', cooking: 'COOKING', ready: 'READY', completed: 'COMPLETED',
};

const CUSTOMER_NAMES = [
  'Arjun Shah', 'Priya Mehta', 'Rohan Verma', 'Sneha Patel',
  'Vikram Nair', 'Ananya Joshi', 'Kabir Singh', 'Meera Iyer',
];
const MENU_ITEMS_FALLBACK = [
  { name: 'Butter Chicken', prepTime: 15 }, { name: 'Paneer Tikka', prepTime: 12 },
  { name: 'Dal Makhani', prepTime: 20 }, { name: 'Biryani', prepTime: 25 },
  { name: 'Naan', prepTime: 5 }, { name: 'Samosa', prepTime: 8 },
];

let orderCounter = 1000;
function generateOrderRef() { return `SIM-${++orderCounter}`; }
function pickRandom<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}
function generateLocalOrder(): Order {
  ++orderCounter;
  const items = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => {
    const m = MENU_ITEMS_FALLBACK[Math.floor(Math.random() * MENU_ITEMS_FALLBACK.length)];
    return { id: `sim-item-${orderCounter}-${i}`, name: m.name, quantity: Math.floor(Math.random() * 2) + 1, prepTime: m.prepTime };
  });
  const priorities = ['normal', 'normal', 'normal', 'high', 'urgent'] as const;
  return {
    id: `sim-${orderCounter}-${Date.now()}`,
    orderNumber: `SIM-${orderCounter}`,
    customerName: CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)],
    status: 'pending',
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    items,
    estimatedPrepTime: Math.max(...items.map(i => i.prepTime)),
    pickupTime: new Date(Date.now() + (Math.floor(Math.random() * 30) + 10) * 60000)
      .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    assignedTo: undefined, createdAt: new Date(), startedAt: undefined, completedAt: undefined,
  };
}

function toFrontendOrder(dto: OrderCardDto): Order {
  const items = dto.itemSummary.map((summary, i) => {
    const match = summary.match(/^(\d+)x (.+)$/);
    return {
      id: `${dto.id}-item-${i}`,
      name: match ? match[2] : summary,
      quantity: match ? parseInt(match[1]) : 1,
      prepTime: dto.totalPrepMinutes,
    };
  });
  return {
    id: dto.id,
    orderNumber: dto.orderRef,
    // FIX: customerName should NOT be assignedChefName — use orderRef as fallback
    customerName: `Order ${dto.orderRef}`,
    status: statusMap[dto.status] ?? 'pending',
    priority: dto.isLate ? 'urgent' : 'normal',
    items,
    estimatedPrepTime: dto.totalPrepMinutes,
    pickupTime: dto.pickupSlotTime
      ? new Date(dto.pickupSlotTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : 'TBD',
    // FIX: assignedTo correctly set from assignedChefName
    assignedTo: dto.assignedChefName ?? undefined,
    createdAt: new Date(dto.placedAt),
    startedAt: undefined,
    completedAt: undefined,
  };
}

const SPEED_INTERVALS: Record<string, number> = { slow: 25000, normal: 12000, fast: 5000 };

export function useKitchenBoard(pollingIntervalMs = 10000) {
  const [boardData, setBoardData] = useState<KanbanBoardResponse | null>(null);
  const [backendOrders, setBackendOrders] = useState<Order[]>([]);
  const [backendCompleted, setBackendCompleted] = useState<Order[]>([]);
  const [simOrders, setSimOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemDto[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const orders = [...backendOrders, ...simOrders.filter(o => o.status !== 'completed')];
  const completedOrders = [...backendCompleted, ...simOrders.filter(o => o.status === 'completed')];

  // Staff from boardData (live)
  const staff: StaffWorkloadDto[] = boardData?.staff ?? [];

  // Capacity from boardData metrics
  const capacityPercent: number = boardData?.metrics.capacityUtilizationPercent ?? 0;

  useEffect(() => {
    fetchMenuItems()
      .then(items => { console.log('[useKitchenBoard] Loaded', items.length, 'menu items'); setMenuItems(items); })
      .catch(err => console.warn('[useKitchenBoard] Menu items unavailable, using local sim:', err.message));
  }, []);

  const loadBoard = useCallback(async () => {
    try {
      const data = await fetchBoard();
      setBoardData(data);
      setBackendOrders([
        ...(data.columns.PENDING ?? []),
        ...(data.columns.COOKING ?? []),
        ...(data.columns.READY ?? []),
      ].map(toFrontendOrder));
      setBackendCompleted((data.columns.COMPLETED ?? []).map(toFrontendOrder));
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

  const addOrder = useCallback(async () => {
    if (menuItems.length === 0) {
      setSimOrders(prev => [...prev, generateLocalOrder()]);
      return;
    }
    try {
      await createOrder(
        generateOrderRef(),
        pickRandom(menuItems, Math.floor(Math.random() * 3) + 1).map(m => m.id)
      );
      await loadBoard();
    } catch {
      setSimOrders(prev => [...prev, generateLocalOrder()]);
    }
  }, [menuItems, loadBoard]);

  useEffect(() => {
    if (simIntervalRef.current) { clearInterval(simIntervalRef.current); simIntervalRef.current = null; }
    if (isSimulating) {
      simIntervalRef.current = setInterval(() => addOrder().catch(console.error), SPEED_INTERVALS[simulationSpeed] ?? 8000);
    }
    return () => { if (simIntervalRef.current) clearInterval(simIntervalRef.current); };
  }, [isSimulating, simulationSpeed, addOrder]);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    if (simOrders.some(o => o.id === orderId)) {
      setSimOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      return;
    }
    setBackendOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    try {
      await changeOrderStatus(orderId, statusMapReverse[newStatus]);
      await loadBoard();
    } catch (err: any) {
      await loadBoard();
      throw err;
    }
  }, [simOrders, loadBoard]);

  // ── NEW: assign chef to a backend order ──────────────────────────────────────
  const assignChef = useCallback(async (orderId: string, chefId: string) => {
    const chef = staff.find(s => s.chefId === chefId);
    // Optimistic update
    setBackendOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, assignedTo: chef?.name ?? chefId } : o)
    );
    try {
      await assignChefApi(orderId, chefId);
      await loadBoard();
    } catch (err: any) {
      await loadBoard();
      throw err;
    }
  }, [staff, loadBoard]);

  return {
    orders,
    completedOrders,
    boardData,
    loading,
    error,
    staff,            // ← exposed for OrderCard & ChefStations
    capacityPercent,  // ← exposed for CapacityMeter
    updateOrderStatus,
    assignChef,       // ← exposed for OrderCard
    removeOrder: async (id: string) => { setSimOrders(prev => prev.filter(o => o.id !== id)); await loadBoard(); },
    addOrder,
    refresh: loadBoard,
    isSimulating, setIsSimulating,
    simulationSpeed, setSimulationSpeed,
    setOrders: setSimOrders,
    generateNewOrder: addOrder,
  };
}