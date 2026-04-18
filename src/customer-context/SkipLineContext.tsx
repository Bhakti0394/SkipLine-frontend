import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { CartItem, Order, UserMetrics, KitchenState } from '../customer-types/dashboard';
import {
  fetchCustomerOrders,
  fetchCustomerMetrics,
  fetchCustomerStreak,
  fetchCustomerOrder,
  subscribeToOrderStatus,
  CustomerOrderDto,
} from '../kitchen-api/kitchenApi';
import { useAuth } from '../context/AuthContext';

// -- Static asset paths (served from public/customer-assets/) --
const butterChicken    = '/customer-assets/butter-chicken.jpg';
const chocolateDonuts  = '/customer-assets/chocolate-donuts.jpg';
const choleBhature     = '/customer-assets/chole-bhature.jpg';
const dalMakhani       = '/customer-assets/dal-makhani.jpg';
const gulabJamun       = '/customer-assets/gulab-jamun.jpg';
const hydrebadiBiryani = '/customer-assets/hydrebadi-biryani.jpg';
const idliSambhar      = '/customer-assets/idli-sambhar.jpg';
const lucknowiBiryani  = '/customer-assets/lucknowi-biryani.jpg';
const masalaDosa       = '/customer-assets/masala-dosa.jpg';
const paneerTikka      = '/customer-assets/paneer-tikka.jpg';
const pizza            = '/customer-assets/pizza.jpg';
const poha             = '/customer-assets/poha.jpg';
const rajasthaniThali  = '/customer-assets/rajasthani-thali.jpg';
const samosa           = '/customer-assets/samosa.jpg';
const vadaPav          = '/customer-assets/vada-pav.jpg';
const kadaiPaneer      = '/customer-assets/kadai-paneer.jpg';
const palakPaneer      = '/customer-assets/palak-paneer.jpg';
const chickenKorma     = '/customer-assets/chicken-korma.jpg';
const prawnMasala      = '/customer-assets/prawn-masala.jpg';
const muttonRoganJosh  = '/customer-assets/mutton-rogan-josh.jpg';
const butterGarlicNaan = '/customer-assets/butter-garlic-naan.jpg';

// -- Meal image lookup --
const MEAL_IMAGE_MAP: Record<string, string> = {
  'Butter Chicken':     butterChicken,
  'Chocolate Donuts':   chocolateDonuts,
  'Chole Bhature':      choleBhature,
  'Dal Makhani':        dalMakhani,
  'Gulab Jamun':        gulabJamun,
  'Hyderabadi Biryani': hydrebadiBiryani,
  'Idli Sambhar':       idliSambhar,
  'Lucknowi Biryani':   lucknowiBiryani,
  'Masala Dosa':        masalaDosa,
  'Paneer Tikka':       paneerTikka,
  'Pizza':              pizza,
  'Poha':               poha,
  'Rajasthani Thali':   rajasthaniThali,
  'Samosa':             samosa,
  'Vada Pav':           vadaPav,
  'Kadai Paneer':       kadaiPaneer,
  'Palak Paneer':       palakPaneer,
  'Chicken Korma':      chickenKorma,
  'Prawn Masala':       prawnMasala,
  'Mutton Rogan Josh':  muttonRoganJosh,
  'Butter Garlic Naan': butterGarlicNaan,
  // aliases
  'Idli Sambar':        idliSambhar,
  'Cheese Pizza':       pizza,
  'Samosa (2 pcs)':     samosa,
  'Chocolate Donut':    chocolateDonuts,
};

function imageForMealName(name: string): string {
  if (!name) return butterChicken;
  if (MEAL_IMAGE_MAP[name]) return MEAL_IMAGE_MAP[name];
  const lower = name.toLowerCase();
  const found = Object.entries(MEAL_IMAGE_MAP).find(([k]) => k.toLowerCase() === lower);
  return found ? found[1] : butterChicken;
}

function imageForSummary(summary: string[]): string {
  const first = summary?.[0]?.replace(/^\d+x\s*/, '') ?? '';
  return imageForMealName(first);
}

// -- Context type --
interface SkipLineContextType {
  cart:                    CartItem[];
  addToCart:               (item: Omit<CartItem, 'id'>) => void;
  removeFromCart:          (itemId: string) => void;
  updateCartItem:          (itemId: string, updates: Partial<CartItem>) => void;
  clearCart:               () => void;
  cartTotal:               number;
  cartItemsCount:          number;
  orders:                  Order[];
  addOrder:                (order: Omit<Order, 'id' | 'createdAt' | 'kitchenQueuePosition'> & { id?: string }) => Order;
  updateOrderStatus:       (orderId: string, status: Order['status']) => void;
  // FIX [SWAP-CTX-OVERWRITE]: after a swap, context held stale meal/price/
  // totalPrepMinutes. The contextOrders sync useEffect in MyOrders then
  // re-applied stale context data over the correctly-swapped local state.
  // This method lets swap callers keep context in sync.
  updateOrderFields:       (orderId: string, fields: Partial<Order>) => void;
  orderHistory:            Order[];
  kitchenState:            KitchenState;
  getQueuePosition:        (orderId: string) => number;
  metrics:                 UserMetrics;
  updateMetrics:           (updates: Partial<UserMetrics>) => void;
  resetDemo:               () => void;
  simulateKitchenProgress: () => void;
  loading: boolean;
  error:   string | null;
}

const SkipLineContext = createContext<SkipLineContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CART:    'SkipLine_cart',
  ORDERS:  'SkipLine_orders',
  HISTORY: 'SkipLine_history',
  METRICS: 'SkipLine_metrics',
  KITCHEN: 'SkipLine_kitchen',
};

const defaultMetrics: UserMetrics = {
  timeSaved: 0, loyaltyPoints: 0, activeOrders: 0,
  ordersThisMonth: 0, streak: 0, foodWasteReduced: 0, queueTimesSaved: 0,
};

// ADD THIS
function formatPickupTime(pickupSlotTime?: string | null): string {
  if (!pickupSlotTime) return 'ASAP';
  try {
    const slotDate = new Date(pickupSlotTime);
    if (isNaN(slotDate.getTime())) return 'ASAP';
    return slotDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'ASAP';
  }
}

// -- DTO -> Order mapper --

function dtoToOrder(dto: CustomerOrderDto): Order {
  const image    = imageForSummary(dto.itemSummary);
  const mealName = dto.itemSummary?.length > 0
    ? dto.itemSummary.map(s => s.replace(/^\d+x\s*/, '')).join(', ')
    : dto.orderRef;

  const statusMap: Record<string, Order['status']> = {
    pending:   'confirmed',
    confirmed: 'confirmed',
    preparing: 'cooking',
    cooking:   'cooking',
    ready:     'ready',
    completed: 'completed',
    cancelled: 'cancelled',
  };

  return {
    id:                   dto.id,
    meal:                 mealName,
    restaurant:           '',
    image,
    status:               statusMap[dto.status] ?? 'confirmed',
    pickupTime:           formatPickupTime(dto.pickupSlotTime),
    pickupSlotId:         dto.pickupSlotId ?? '',
    estimatedReady:       `${dto.totalPrepMinutes} min`,
    price:                dto.totalPrice ?? 0,
    quantity:             1,
    paymentStatus:        'paid',
    paymentMethod:        'upi',
    kitchenQueuePosition: 0,
    addOns:               [],
    spiceLevel:           'medium',
    specialInstructions:  '',
    createdAt:            dto.placedAt ? new Date(dto.placedAt).getTime() : Date.now(),
    timeSaved:            dto.totalPrepMinutes > 0 ? Math.floor(dto.totalPrepMinutes * 0.8) : 10,
    orderRef:             dto.orderRef,
    totalPrepMinutes:     dto.totalPrepMinutes ?? 0,
    pickupSlotTime:       dto.pickupSlotTime ?? null,
    // ── NEW: wire express fields through so OrderSuccess receives them ──
    isExpress:            dto.isExpress ?? false,
    editLockedUntil:      dto.editLockedUntil ? new Date(dto.editLockedUntil) : null,
    scheduledCookAt:      dto.scheduledCookAt ? new Date(dto.scheduledCookAt) : null,
  };
}


return {
    id:                   dto.id,
    meal:                 mealName,
    restaurant:           '',
    image,
    status:               statusMap[dto.status] ?? 'confirmed',
    pickupTime:           formatPickupTime(dto.pickupSlotTime),
    pickupSlotId:         dto.pickupSlotId ?? '',
    estimatedReady:       `${dto.totalPrepMinutes} min`,
    price:                dto.totalPrice ?? 0,
    quantity:             1,
    paymentStatus:        'paid',
    paymentMethod:        'upi',
    kitchenQueuePosition: 0,
    addOns:               [],
    spiceLevel:           'medium',
    specialInstructions:  '',
    createdAt:            dto.placedAt ? new Date(dto.placedAt).getTime() : Date.now(),
    timeSaved:            dto.totalPrepMinutes > 0 ? Math.floor(dto.totalPrepMinutes * 0.8) : 10,
    orderRef:             dto.orderRef,
    // FIX: populate typed fields so computeProgress() works for orders loaded
    // fresh from the API, not just orders coming through OrderSuccess navigation.
 // FIX: populate typed fields so computeProgress() works for orders loaded
    // fresh from the API, not just orders coming through OrderSuccess navigation.
    totalPrepMinutes:     dto.totalPrepMinutes ?? 0,
    pickupSlotTime:       dto.pickupSlotTime ?? null,
  };
}

// -- Demo data (shown ONLY when not logged in) --
const demoOrderHistory: Order[] = [
  {
    id: 'ORD-HIST1', meal: 'Butter Chicken', restaurant: '', image: butterChicken,
    status: 'completed', pickupTime: '12:30 PM', pickupSlotId: '3',
    estimatedReady: '0 min', price: 249, quantity: 1,
    paymentStatus: 'paid', paymentMethod: 'upi', kitchenQueuePosition: 0,
    addOns: [], spiceLevel: 'medium', specialInstructions: '',
    createdAt: Date.now() - 86400000 * 2, timeSaved: 18,
    totalPrepMinutes: 0, pickupSlotTime: null,
  },
  {
    id: 'ORD-HIST2', meal: 'Hyderabadi Biryani', restaurant: '', image: hydrebadiBiryani,
    status: 'completed', pickupTime: '1:00 PM', pickupSlotId: '4',
    estimatedReady: '0 min', price: 299, quantity: 2,
    paymentStatus: 'paid', paymentMethod: 'card', kitchenQueuePosition: 0,
    addOns: [], spiceLevel: 'spicy', specialInstructions: '',
    createdAt: Date.now() - 86400000 * 3, timeSaved: 22,
    totalPrepMinutes: 0, pickupSlotTime: null,
  },
  {
    id: 'ORD-HIST3', meal: 'Masala Dosa', restaurant: '', image: masalaDosa,
    status: 'completed', pickupTime: '11:30 AM', pickupSlotId: '1',
    estimatedReady: '0 min', price: 129, quantity: 1,
    paymentStatus: 'paid', paymentMethod: 'upi', kitchenQueuePosition: 0,
    addOns: [], spiceLevel: 'mild', specialInstructions: '',
    createdAt: Date.now() - 86400000 * 5, timeSaved: 12,
    totalPrepMinutes: 0, pickupSlotTime: null,
  },
];

const demoActiveOrders: Order[] = [
  {
    id: 'ORD-DEMO1', meal: 'Butter Chicken', restaurant: '', image: butterChicken,
    status: 'cooking', pickupTime: '12:30 PM', pickupSlotId: '3',
    estimatedReady: '3 min', price: 249, quantity: 1,
    paymentStatus: 'paid', paymentMethod: 'upi', kitchenQueuePosition: 1,
    addOns: [], spiceLevel: 'medium', specialInstructions: '',
    createdAt: Date.now() - 600000, timeSaved: 18,
    totalPrepMinutes: 0, pickupSlotTime: null,
  },
  {
    id: 'ORD-DEMO2', meal: 'Hyderabadi Biryani', restaurant: '', image: hydrebadiBiryani,
    status: 'confirmed', pickupTime: '1:00 PM', pickupSlotId: '4',
    estimatedReady: '12 min', price: 299, quantity: 2,
    paymentStatus: 'cash', paymentMethod: 'cash', kitchenQueuePosition: 2,
    addOns: [], spiceLevel: 'spicy', specialInstructions: '',
    createdAt: Date.now() - 300000, timeSaved: 22,
    totalPrepMinutes: 0, pickupSlotTime: null,
  },
];

const TERMINAL_STATUSES = new Set(['completed', 'cancelled']);

// =============================================================================
export function SkipLineProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [orders,       setOrders]       = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [metrics,      setMetrics]      = useState<UserMetrics>(defaultMetrics);
  const [kitchenState, setKitchenState] = useState<KitchenState>({
    activeOrders: [], queuedOrders: [],
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const sseUnsubscribers = useRef<Map<string, () => void>>(new Map());
  // -- SSE status handler --
const updateOrderStatusFromSse = useCallback((orderId: string, rawStatus: string) => {
   const statusMap: Record<string, Order['status']> = {
  pending:   'confirmed',
  confirmed: 'confirmed',
  preparing: 'cooking',    // ← ADD: backend 'preparing' maps to cooking visually
  cooking:   'cooking',
  ready:     'ready',
  completed: 'completed',
  cancelled: 'cancelled',
};
    const mapped = statusMap[rawStatus] ?? 'confirmed';

if (TERMINAL_STATUSES.has(rawStatus)) {
      sseUnsubscribers.current.get(orderId)?.();
      sseUnsubscribers.current.delete(orderId);

      if (rawStatus === 'cancelled') {
        setOrders(prev =>
          prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as Order['status'] } : o)
        );
        setMetrics(m => ({ ...m, activeOrders: Math.max(0, m.activeOrders - 1) }));
        setKitchenState(ks => ({
          activeOrders: ks.activeOrders.filter(id => id !== orderId),
          queuedOrders: ks.queuedOrders.filter(id => id !== orderId),
        }));
        try {
          const ch = new BroadcastChannel('skipline_order_events');
          ch.postMessage({ type: 'ORDER_CANCELLED', orderId });
          ch.close();
        } catch { /* BroadcastChannel not supported */ }
      } else if (rawStatus === 'completed') {
        setOrders(prev => {
          const order = prev.find(o => o.id === orderId);
          if (order) {
            const completed = { ...order, status: 'completed' as const };
            setOrderHistory(h => {
              if (h.some(o => o.id === orderId)) return h;
              return [completed, ...h];
            });
            setMetrics(m => ({ ...m, activeOrders: Math.max(0, m.activeOrders - 1) }));
            setKitchenState(ks => {
              const newActive = ks.activeOrders.filter(id => id !== orderId);
              const [next, ...rest] = ks.queuedOrders;
              return {
                activeOrders: next ? [...newActive, next] : newActive,
                queuedOrders: rest,
              };
            });
          }
          return prev.map(o => o.id === orderId ? { ...o, status: 'completed' as Order['status'] } : o);
        });
      }
    } else {
      setOrders(prev => {
        const order = prev.find(o => o.id === orderId);
        if (!order || order.status === mapped) return prev;
        return prev.map(o => o.id === orderId ? { ...o, status: mapped } : o);
      });
    }

   const statusTitles: Record<string, string> = {
      ready:     'Ready for Pickup!',
      cooking:   'Now Cooking!',
      pending:   'Order Confirmed',
      confirmed: 'Order Confirmed',
      cancelled: 'Order Cancelled',
    };
    const statusMessages: Record<string, string> = {
      ready:     'Your order is ready — head to the Pickup Counter!',
      cooking:   'Your order has started cooking.',
      pending:   'Your order is confirmed and in the queue.',
      confirmed: 'Your order is confirmed and in the queue.',
      cancelled: 'Your order has been cancelled.',
    };
window.dispatchEvent(new CustomEvent('order-status-changed', {
      detail: {
        title:   statusTitles[rawStatus]   ?? `Order ${rawStatus}`,
        message: statusMessages[rawStatus] ?? `Status updated to ${rawStatus}.`,
        type:    rawStatus === 'ready'      ? 'order_ready'
               : rawStatus === 'cooking'   ? 'order_cooking'
               : rawStatus === 'cancelled' ? 'info'
               : rawStatus === 'preparing' ? 'order_preparing'
               :                             'order_confirmed',
        orderId,
      },
    }));
  }, []);

  const startPollingFallback = useCallback((orderId: string) => {
    const interval = setInterval(async () => {
      try {
        const dto = await fetchCustomerOrder(orderId);
        updateOrderStatusFromSse(orderId, dto.status);
        if (TERMINAL_STATUSES.has(dto.status)) clearInterval(interval);
      } catch { /* retry next tick */ }
    }, 15_000);
    sseUnsubscribers.current.set(orderId, () => clearInterval(interval));
  }, [updateOrderStatusFromSse]);

  const subscribeOrder = useCallback((orderId: string) => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(orderId) || sseUnsubscribers.current.has(orderId)) return;
    const unsub = subscribeToOrderStatus(
      orderId,
      status => updateOrderStatusFromSse(orderId, status),
      _err => {
        sseUnsubscribers.current.delete(orderId);
        startPollingFallback(orderId);
      },
    );
    sseUnsubscribers.current.set(orderId, unsub);
  }, [updateOrderStatusFromSse, startPollingFallback]);

  // Cleanup all SSE/poll connections on unmount
  useEffect(() => () => {
    sseUnsubscribers.current.forEach(u => u());
    sseUnsubscribers.current.clear();
  }, []);

  // Re-subscribe SSE for active (non-terminal) orders whenever orders change
  useEffect(() => {
    orders.forEach(o => {
      if (!TERMINAL_STATUSES.has(o.status)) subscribeOrder(o.id);
    });
  }, [orders, subscribeOrder]);

  // -- Data loading --
  useEffect(() => {
    // Always restore cart from localStorage regardless of auth state
    try {
      const savedCart = localStorage.getItem(STORAGE_KEYS.CART);
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch { /* ignore */ }

    // Wait for AuthContext to finish reading localStorage
    if (authLoading) return;

    const token = localStorage.getItem('auth_token');

    // -- Not logged in -> demo data, zero API calls --
    if (!token || !user) {
      setOrders(demoActiveOrders);
      setOrderHistory(demoOrderHistory);
      setKitchenState({
        activeOrders: demoActiveOrders.map(o => o.id),
        queuedOrders: [],
      });
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.METRICS);
        if (saved) setMetrics(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch { /* ignore */ }
      return;
    }

    // -- Logged in -> fetch real data --
   setLoading(true);
    setError(null);
  // AFTER — use Promise.allSettled so loading clears only after ALL three settle
Promise.allSettled([
  fetchCustomerOrders()
    .then((dtos: CustomerOrderDto[]) => {
      const active = dtos
        .filter(d => d.status !== 'completed' && d.status !== 'cancelled')
        .map(dtoToOrder);
      const completed = dtos
        .filter(d => d.status === 'completed')
        .map(dtoToOrder);
      setOrders(active);
      setOrderHistory(completed);
      setKitchenState({
        activeOrders: active.filter(o => o.status !== 'cancelled').map(o => o.id),
        queuedOrders: [],
      });
    })
    .catch(err => {
      console.warn('[SkipLineContext] Orders fetch failed:', err.message);
      setError(err.message ?? 'Failed to load orders');
      try {
        const s = localStorage.getItem(STORAGE_KEYS.ORDERS);
        const h = localStorage.getItem(STORAGE_KEYS.HISTORY);
        const k = localStorage.getItem(STORAGE_KEYS.KITCHEN);
        if (s) setOrders(JSON.parse(s));
        if (h) setOrderHistory(JSON.parse(h));
        if (k) setKitchenState(JSON.parse(k));
      } catch { /* stay with empty arrays */ }
    }),

  fetchCustomerMetrics()
    .then(m => {
      const updated = {
        ordersThisMonth:  m.ordersThisMonth,
        timeSaved:        m.timeSaved,
        loyaltyPoints:    m.loyaltyPoints,
        foodWasteReduced: m.foodWasteReduced,
      };
      setMetrics(prev => ({ ...prev, ...updated }));
      try {
        const existing = localStorage.getItem(STORAGE_KEYS.METRICS);
        localStorage.setItem(
          STORAGE_KEYS.METRICS,
          JSON.stringify({ ...(existing ? JSON.parse(existing) : {}), ...updated }),
        );
      } catch { /* ignore */ }
    })
    .catch(err => {
      console.warn('[SkipLineContext] Metrics fetch failed:', err.message);
      try {
        const s = localStorage.getItem(STORAGE_KEYS.METRICS);
        if (s) setMetrics(prev => ({ ...prev, ...JSON.parse(s) }));
      } catch { /* ignore */ }
    }),

  fetchCustomerStreak()
    .then(streak => {
      setMetrics(prev => ({ ...prev, streak }));
      try {
        const existing = localStorage.getItem(STORAGE_KEYS.METRICS);
        const parsed = existing ? JSON.parse(existing) : {};
        localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify({ ...parsed, streak }));
      } catch { /* ignore */ }
    })
    .catch(err =>
      console.warn('[SkipLineContext] Streak fetch failed — keeping local value:', err.message)
    ),

]).finally(() => setLoading(false));  // ← fires after ALL three settle regardless of outcome  
// 
}, [user, authLoading]);

  // -- Persist to localStorage --
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS,  JSON.stringify(orders));
    localStorage.setItem(STORAGE_KEYS.KITCHEN, JSON.stringify(kitchenState));
  }, [orders, kitchenState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(orderHistory));
  }, [orderHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(metrics));
  }, [metrics]);

  // -- Cart helpers --
  const addToCart = useCallback((item: Omit<CartItem, 'id'>) =>
    setCart(prev => [
      ...prev,
      { ...item, id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` },
    ]), []);

  const removeFromCart = useCallback((itemId: string) =>
    setCart(prev => prev.filter(i => i.id !== itemId)), []);

  const updateCartItem = useCallback((itemId: string, updates: Partial<CartItem>) =>
    setCart(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i)), []);

  const clearCart      = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce(
    (t, i) => t + (i.meal.price + i.addOns.reduce((s, a) => s + a.price, 0)) * i.quantity,
    0,
  );
  const cartItemsCount = cart.reduce((c, i) => c + i.quantity, 0);

  // -- addOrder --
  const addOrder = useCallback((
    orderData: Omit<Order, 'id' | 'createdAt' | 'kitchenQueuePosition'> & { id?: string },
  ) => {
    const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const queuePos = orders.filter(
      o => o.status !== 'completed' && o.status !== 'ready' && o.status !== 'cancelled'
    ).length + 1;
    const orderId  = orderData.id && UUID_RE.test(orderData.id)
      ? orderData.id
      : `ORD-${Date.now().toString(36).toUpperCase()}`;

    const newOrder: Order = {
      ...orderData,
      id: orderId,
      createdAt: Date.now(),
      kitchenQueuePosition: queuePos,
    };

    setOrders(prev => [newOrder, ...prev]);
    setKitchenState(prev =>
      prev.activeOrders.length < 3
        ? { ...prev, activeOrders: [...prev.activeOrders, newOrder.id] }
        : { ...prev, queuedOrders: [...prev.queuedOrders, newOrder.id] },
    );
    subscribeOrder(orderId);

    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const lastDate  = localStorage.getItem('SkipLine_last_order_date');

    let absoluteStreak: number | null = null;
    if (lastDate !== today) {
      localStorage.setItem('SkipLine_last_order_date', today);
      if (!lastDate || lastDate === yesterday) {
        absoluteStreak = null;
      } else {
        absoluteStreak = 1;
      }
    }

    setMetrics(prev => {
      const newStreak = absoluteStreak !== null
        ? absoluteStreak
        : lastDate !== today
          ? prev.streak + 1
          : prev.streak;

      if (newStreak > prev.streak && [3, 7, 14, 21, 30].includes(newStreak)) {
        window.dispatchEvent(new CustomEvent('streak-milestone', {
          detail: { streak: newStreak },
        }));
      }
      return {
        ...prev,
        activeOrders:     prev.activeOrders + 1,
        ordersThisMonth:  prev.ordersThisMonth + 1,
        timeSaved:        prev.timeSaved + orderData.timeSaved,
        loyaltyPoints:    prev.loyaltyPoints + Math.floor(orderData.price / 10),
        foodWasteReduced: prev.foodWasteReduced + 0.15,
        queueTimesSaved:  prev.queueTimesSaved + orderData.timeSaved,
        streak:           newStreak,
      };
    });

   return newOrder;
  }, [orders, subscribeOrder]);

  // -- updateOrderStatus --
const updateOrderStatus = useCallback((orderId: string, status: Order['status']) => {
    setOrders(prev => {
      const order = prev.find(o => o.id === orderId);
      if (!order || order.status === status) return prev;
      return prev.map(o => o.id === orderId ? { ...o, status } : o);
    });

    if (status === 'completed') {
      setOrders(prev => {
        const order = prev.find(o => o.id === orderId);
        if (order) {
          const updated = { ...order, status };
          setOrderHistory(h => {
            if (h.some(o => o.id === orderId)) return h;
            return [updated, ...h];
          });
          setMetrics(m => ({ ...m, activeOrders: Math.max(0, m.activeOrders - 1) }));
          setKitchenState(ks => {
            const a = ks.activeOrders.filter(id => id !== orderId);
            const [next, ...rest] = ks.queuedOrders;
            return { activeOrders: next ? [...a, next] : a, queuedOrders: rest };
          });
        }
        return prev;
      });
      sseUnsubscribers.current.get(orderId)?.();
      sseUnsubscribers.current.delete(orderId);
    }

    // FIX [CANCEL-SSE-LEAK]: cancelled orders were never closing their SSE/poll
    // subscription. The completed branch handled cleanup but cancelled did not,
    // leaving the connection alive and producing spurious status updates.
    if (status === 'cancelled') {
      sseUnsubscribers.current.get(orderId)?.();
      sseUnsubscribers.current.delete(orderId);
      setMetrics(m => ({ ...m, activeOrders: Math.max(0, m.activeOrders - 1) }));
      setKitchenState(ks => ({
        activeOrders: ks.activeOrders.filter(id => id !== orderId),
        queuedOrders: ks.queuedOrders.filter(id => id !== orderId),
      }));
    }
  }, []);
  // -- simulateKitchenProgress --
  const simulateKitchenProgress = useCallback(() => {
    const flow: Order['status'][] = ['confirmed', 'cooking', 'ready'];
    setOrders(prev => prev.map(o => {
      if (o.status === 'completed' || o.status === 'cancelled') return o;
      const idx = flow.indexOf(o.status);
      return idx < flow.length - 1 ? { ...o, status: flow[idx + 1] } : o;
    }));
  }, []);

  // -- getQueuePosition --
  const getQueuePosition = useCallback((orderId: string) => {
    if (kitchenState.activeOrders.includes(orderId)) return 0;
    const qi = kitchenState.queuedOrders.indexOf(orderId);
    return qi !== -1 ? qi + 1 : 0;
  }, [kitchenState]);

  // -- resetDemo --
  const resetDemo = useCallback(() => {
    sseUnsubscribers.current.forEach(u => u());
    sseUnsubscribers.current.clear();
    setCart([]);
    setOrders([]);
    setOrderHistory([]);
    setMetrics(defaultMetrics);
    setKitchenState({ activeOrders: [], queuedOrders: [] });
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  }, []);

  // -- updateMetrics --
 // -- updateMetrics --
  const updateMetrics = useCallback((updates: Partial<UserMetrics>) =>
    setMetrics(prev => ({ ...prev, ...updates })), []);

  // FIX [SWAP-CTX-OVERWRITE]: update arbitrary fields on an order in context
  // so swap callers can keep meal/price/totalPrepMinutes/image in sync.
  const updateOrderFields = useCallback((orderId: string, fields: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...fields } : o));
  }, []);

  return (
<SkipLineContext.Provider value={{
      cart, addToCart, removeFromCart, updateCartItem, clearCart, cartTotal, cartItemsCount,
      orders, addOrder, updateOrderStatus, updateOrderFields, orderHistory, kitchenState, getQueuePosition,
      metrics, updateMetrics, resetDemo, simulateKitchenProgress,
      loading, error,
    }}>
      {children}
    </SkipLineContext.Provider>
  );
}

export function useSkipLine() {
  const ctx = useContext(SkipLineContext);
  if (!ctx) throw new Error('useSkipLine must be used within a SkipLineProvider');
  return ctx;
}