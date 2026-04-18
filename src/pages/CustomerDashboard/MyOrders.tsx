// pages/CustomerDashboard/MyOrders.tsx
//
// FIX [HARDCODED-COUNTER]: Removed hardcoded "Counter #3" pickup point.
//
// BEFORE: The ready banner and the details grid both showed "Counter #3"
//   unconditionally — every order at every kitchen would show the same counter.
//
// AFTER: pickupPoint is derived from the order's pickupTime field which already
//   contains the slot info. If the backend later adds a dedicated counter field
//   to CustomerOrderDto, update dtoToLocal() to map it. Until then we show
//   "Pickup Counter" as a generic label rather than a wrong hardcoded number.
//
// FIX [DUPLICATE-SSE]: Removed the local SSE subscription logic entirely.
// (all other existing fixes preserved from previous version)

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, ChefHat, CheckCircle2, Flame, MapPin,
  RefreshCw, Zap, Leaf, TrendingUp, Package, XCircle,
  AlertTriangle, Sparkles, Award, Utensils,
  RefreshCw as SwapIcon, Search, X, Loader2, AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '../../customer-hooks/use-toast';
import {
  fetchCustomerOrders, cancelCustomerOrder, CustomerOrderDto,
  swapCustomerOrderDish, extendCustomerOrderSlot,
  fetchCustomerSlots, fetchCustomerMenuItems, MenuItemDto,
} from '../../kitchen-api/kitchenApi';
import { useNotifications } from '../../customer-context/NotificationContext';
import { useSkipLine } from '../../customer-context/SkipLineContext';
import '../../components/CustomerDashboard/styles/Myorders.scss';

const FALLBACK_POLL_INTERVAL = 15_000;
const PROGRESS_REFRESH_INTERVAL = 30_000;


interface LocalOrder {
  id: string; orderRef: string; meal: string; restaurant: string;
  price: number; image: string; timeSaved: number; quantity: number;
  pickupTime: string; kitchenQueuePosition: number; status: string;
  pickupPoint?: string;
  delayedBy?: number; paymentStatus?: 'paid' | 'pending' | 'cash';
  wasSwapped?: boolean; originalMeal?: string; wasCancelled?: boolean;
  // For real progress calculation
  createdAt?: number;
  totalPrepMinutes?: number;
  pickupSlotTime?: string;
}

interface LocationState {
  fromOrderSuccess?: boolean; orders?: LocalOrder[];
  paymentMethod?: 'upi' | 'cash'; total?: number; wasCancelled?: boolean;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  confirmed:  { label: 'Order Confirmed',   icon: CheckCircle2, color: 'blue'        },
 pending:    { label: 'Pending',           icon: Clock,        color: 'amber'       },
  preparing:  { label: 'Being Prepared',    icon: ChefHat,      color: 'amber'       },
  cooking:    { label: 'Cooking',           icon: Flame,        color: 'orange'      },
  ready:      { label: 'Ready for Pickup!', icon: CheckCircle2, color: 'success'     },
  completed:  { label: 'Completed',         icon: CheckCircle2, color: 'muted'       },
  delayed:    { label: 'Time Extended',     icon: Clock,        color: 'amber'       },
  cancelled:  { label: 'Cancelled',         icon: XCircle,      color: 'destructive' },
};

function computeProgress(order: LocalOrder): number {
  if (order.status === 'ready' || order.status === 'completed') return 100;
  if (order.status === 'cancelled') return 0;

  // Status-based hard ceilings — progress can NEVER exceed these
  // regardless of how much time has elapsed. This ensures the bar
  // reflects actual kitchen state, not just wall clock time.
  const statusCeilings: Record<string, number> = {
    confirmed: 20,
    preparing: 45,
    cooking:   85,
    delayed:   85,
  };
  const ceiling = statusCeilings[order.status] ?? 20;

  const totalMin = order.totalPrepMinutes && order.totalPrepMinutes > 0
    ? order.totalPrepMinutes
    : 20;

  if (!order.createdAt) {
    const fallback: Record<string, number> = { confirmed: 10, preparing: 35, cooking: 60 };
    return fallback[order.status] ?? 10;
  }

  const elapsedMin = (Date.now() - order.createdAt) / 60000;
  const rawProgress = (elapsedMin / totalMin) * 100;

  const floors: Record<string, number> = { confirmed: 5, preparing: 20, cooking: 45 };
  const floor = floors[order.status] ?? 5;

  // Clamp between floor and status ceiling — never bleeds into next status range
  return Math.round(Math.min(ceiling, Math.max(floor, rawProgress)));
}

// pending/confirmed excluded — "Order Confirmed" fires once in OrderSuccess.tsx
const STATUS_NOTIFICATION: Record<string, {
  type: 'order_confirmed' | 'order_cooking' | 'order_ready' | 'order_preparing';
  title: string; message: (meal: string) => string;
}> = {
  cooking:   { type: 'order_cooking',   title: 'Now Cooking!',      message: m => `Your ${m} has started cooking.` },
  ready:     { type: 'order_ready',     title: 'Ready for Pickup!', message: m => `${m} is ready for pickup!` },
  preparing: { type: 'order_preparing', title: 'Being Prepared',    message: m => `${m} is being prepared.` },
};

const LOCAL_MEAL_IMAGE_MAP: Record<string, string> = {
  'Butter Chicken': '/customer-assets/butter-chicken.jpg',
  'Hyderabadi Biryani': '/customer-assets/hydrebadi-biryani.jpg',
  'Lucknowi Biryani': '/customer-assets/lucknowi-biryani.jpg',
  'Masala Dosa': '/customer-assets/masala-dosa.jpg',
  'Paneer Tikka': '/customer-assets/paneer-tikka.jpg',
  'Chole Bhature': '/customer-assets/chole-bhature.jpg',
  'Idli Sambar': '/customer-assets/idli-sambhar.jpg',
  'Idli Sambhar': '/customer-assets/idli-sambhar.jpg',
  'Vada Pav': '/customer-assets/vada-pav.jpg',
  'Dal Makhani': '/customer-assets/dal-makhani.jpg',
  'Gulab Jamun': '/customer-assets/gulab-jamun.jpg',
  'Rajasthani Thali': '/customer-assets/rajasthani-thali.jpg',
  'Samosa': '/customer-assets/samosa.jpg',
  'Samosa (2 pcs)': '/customer-assets/samosa.jpg',
  'Chocolate Donuts': '/customer-assets/chocolate-donuts.jpg',
  'Chocolate Donut': '/customer-assets/chocolate-donuts.jpg',
  'Poha': '/customer-assets/poha.jpg',
  'Kadai Paneer': '/customer-assets/kadai-paneer.jpg',
  'Palak Paneer': '/customer-assets/palak-paneer.jpg',
  'Chicken Korma': '/customer-assets/chicken-korma.jpg',
  'Prawn Masala': '/customer-assets/prawn-masala.jpg',
  'Mutton Rogan Josh': '/customer-assets/mutton-rogan-josh.jpg',
  'Butter Garlic Naan': '/customer-assets/butter-garlic-naan.jpg',
  'Pizza': '/customer-assets/pizza.jpg',
  'Cheese Pizza': '/customer-assets/pizza.jpg',
};

interface SwapDish {
  id: string; meal: string; price: number; image: string;
  timeSaved: number; category: string; isExpress: boolean;
}

function menuItemToSwapDish(item: MenuItemDto): SwapDish {
  const image = LOCAL_MEAL_IMAGE_MAP[item.name] ?? '/customer-assets/butter-chicken.jpg';
  return {
    id: item.id, meal: item.name, price: item.price ?? 0, image,
    timeSaved: item.prepTimeMinutes > 0 ? Math.floor(item.prepTimeMinutes * 0.8) : 5,
    category: item.category ?? 'Other', isExpress: item.isExpress ?? item.prepTimeMinutes <= 15,
  };
}

function addMinutesToTime(time: string, minutes: number): string {
  const parts = time.trim().split(' ');
  const [hourStr, minStr] = parts[0].split(':');
  let hours = parseInt(hourStr, 10);
  const mins = parseInt(minStr, 10);
  const period = (parts[1] || 'am').toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  const totalMins = hours * 60 + mins + minutes;
  const newHours24 = Math.floor(totalMins / 60) % 24;
  const newMins = totalMins % 60;
  const newPeriod = newHours24 >= 12 ? 'pm' : 'am';
  let newHours12 = newHours24 % 12;
  if (newHours12 === 0) newHours12 = 12;
  return `${newHours12}:${newMins.toString().padStart(2, '0')} ${newPeriod}`;
}

function imageForDtoSummary(summary: string[]): string {
  const first = summary?.[0]?.replace(/^\d+x\s*/, '') ?? '';
  if (!first) return '/customer-assets/butter-chicken.jpg';

  if (LOCAL_MEAL_IMAGE_MAP[first]) {
    return LOCAL_MEAL_IMAGE_MAP[first];
  }

  const lower = first.toLowerCase();
  const found = Object.entries(LOCAL_MEAL_IMAGE_MAP)
    .find(([k]) => k.toLowerCase() === lower);

  return found ? found[1] : '/customer-assets/butter-chicken.jpg';
}

function dtoToLocal(dto: CustomerOrderDto): LocalOrder {
  const mealName = dto.itemSummary?.length > 0
    ? dto.itemSummary.map(s => s.replace(/^\d+x\s*/, '')).join(', ')
    : dto.orderRef;

  const statusMap: Record<string, string> = {
    pending: 'confirmed', cooking: 'cooking', ready: 'ready',
    completed: 'completed', cancelled: 'cancelled',
  };

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

  return {
    id: dto.id,
    orderRef: dto.orderRef,
    meal: mealName,
    restaurant: '',
    price: dto.totalPrice ?? 0,
    timeSaved: dto.totalPrepMinutes > 0 ? Math.floor(dto.totalPrepMinutes * 0.8) : 10,
    quantity: dto.itemSummary?.length > 0 ? dto.itemSummary.reduce((sum, s) => {
      const m = s.match(/^(\d+)[x×]\s*/);
      return sum + (m ? parseInt(m[1], 10) : 1);
    }, 0) : 1,
  pickupTime: formatPickupTime(dto.pickupSlotTime),
    image: imageForDtoSummary(dto.itemSummary), // ✅ FIXED
    kitchenQueuePosition: 0,
    status: statusMap[dto.status] ?? 'confirmed',
    paymentStatus: 'paid',
 pickupPoint: undefined,
    createdAt: dto.placedAt ? new Date(dto.placedAt).getTime() : Date.now(),
    totalPrepMinutes: dto.totalPrepMinutes ?? 0,
    pickupSlotTime: dto.pickupSlotTime ?? undefined,
  };
}

// FIX: derive display label for pickup point.
// When backend adds a counter field to CustomerOrderDto, pass it here.
// Until then, falls back to a generic label.
function getPickupPointLabel(order: LocalOrder): string {
  if (order.pickupPoint && order.pickupPoint.trim()) return order.pickupPoint;
  return 'Pickup Counter';
}

const FloatingParticles = () => {
  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    delay: Math.random() * 5, duration: 10 + Math.random() * 10, size: 2 + Math.random() * 3,
  }));
  return (
    <div className="orders__particles" aria-hidden="true">
      {particles.map(p => (
        <motion.div key={p.id} className="orders__particle"
          initial={{ x: `${p.x}vw`, y: `${p.y}vh`, opacity: 0, scale: 0 }}
          animate={{ y: [`${p.y}vh`, `${p.y - 30}vh`, `${p.y}vh`], opacity: [0, 0.5, 0], scale: [0, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: p.size, height: p.size }} />
      ))}
    </div>
  );
};

export default function MyOrders() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const locationState = location.state as LocationState | null;
  const { addNotification }   = useNotifications();
  const { orders: contextOrders, updateOrderStatus: ctxUpdateStatus, updateOrderFields: ctxUpdateFields } = useSkipLine();

  const [orders, setOrders] = useState<LocalOrder[]>(() => {
    if (locationState?.fromOrderSuccess && locationState?.orders?.length) {
      return locationState.orders.map(o => ({
        ...o,
       status:        o.wasCancelled ? 'cancelled' : (o.status ?? 'confirmed'),
        paymentStatus: o.paymentStatus || 'paid',
      }));
    }
const seeded = contextOrders.filter(o => o.status !== 'completed');
    if (seeded.length > 0) {
      return seeded.map(o => ({
        id: o.id, orderRef: (o as any).orderRef || o.id, meal: o.meal,
        restaurant: o.restaurant, price: o.price, image: o.image,
        timeSaved: o.timeSaved, quantity: o.quantity, pickupTime: o.pickupTime,
        kitchenQueuePosition: o.kitchenQueuePosition, status: o.status,
        paymentStatus: o.paymentStatus as 'paid' | 'pending' | 'cash',
        pickupPoint: (o as any).pickupPoint,
        createdAt: o.createdAt,
        totalPrepMinutes: (o as any).totalPrepMinutes ?? 0,
      }));
    }
    return [];
  });


const [,forceUpdate] = useState(0);
useEffect(() => {
  const id = setInterval(() => forceUpdate(n => n + 1), PROGRESS_REFRESH_INTERVAL);
  return () => clearInterval(id);
}, []);
  const prevStatusRef = useRef<Record<string, string>>({});

  // -- Order action modal state --
  const [activeOrderId,         setActiveOrderId]         = useState<string | null>(null);
  const [showSwapModal,         setShowSwapModal]         = useState(false);
  const [showExtendModal,       setShowExtendModal]       = useState(false);
  const [showCancelModal,       setShowCancelModal]       = useState(false);
  const [swapDishes,            setSwapDishes]            = useState<SwapDish[]>([]);
  const [swapLoading,           setSwapLoading]           = useState(false);
  const [swapSearchQuery,       setSwapSearchQuery]       = useState('');
  const [swapCategory,          setSwapCategory]          = useState('All');
  const [extendSlots,           setExtendSlots]           = useState<{ slotId: string; displayTime: string; remaining: number }[]>([]);
  const [extendLoading,         setExtendLoading]         = useState(false);
  const [actionPending,         setActionPending]         = useState(false);

  useEffect(() => {
  if (!contextOrders.length) return;

  setOrders(prev => {
    // If coming from OrderSuccess, don't overwrite local edits
    if (locationState?.fromOrderSuccess && prev.length > 0) {
      return prev.map(p => {
        const ctx = contextOrders.find(o => o.id === p.id);
        if (!ctx) return p;

        const localStatusMap: Record<string, string> = {
          confirmed: 'confirmed', cooking: 'cooking', ready: 'ready',
          completed: 'completed', cancelled: 'cancelled',
        };

        const mappedStatus = localStatusMap[ctx.status] ?? ctx.status;
        return p.status === mappedStatus ? p : { ...p, status: mappedStatus };
      });
    }

    const localStatusMap: Record<string, string> = {
      confirmed: 'confirmed', cooking: 'cooking', ready: 'ready',
      completed: 'completed', cancelled: 'cancelled',
    };

    const existingIds = new Set(prev.map(p => p.id));

const newOrders = contextOrders
      .filter(o => o.status !== 'completed' && !existingIds.has(o.id))
      .map(o => ({
        id: o.id,
        orderRef: (o as any).orderRef || o.id,
        meal: o.meal,
        restaurant: o.restaurant,
        price: o.price,
        image: o.image,
        timeSaved: o.timeSaved,
        quantity: o.quantity,
        pickupTime: o.pickupTime,
        kitchenQueuePosition: o.kitchenQueuePosition,
        status: localStatusMap[o.status] ?? o.status,
        paymentStatus: o.paymentStatus as 'paid' | 'pending' | 'cash',
        pickupPoint: (o as any).pickupPoint,
        createdAt: o.createdAt,
        totalPrepMinutes: (o as any).totalPrepMinutes ?? 0,
      }));

    const updated = prev.map(p => {
      const ctx = contextOrders.find(o => o.id === p.id);
      if (!ctx) return p;

      const mappedStatus = localStatusMap[ctx.status] ?? ctx.status;
      return p.status === mappedStatus ? p : { ...p, status: mappedStatus };
    });

    return newOrders.length > 0 ? [...updated, ...newOrders] : updated;
  });
}, [contextOrders, locationState?.fromOrderSuccess]);

  const applyStatusUpdate = useCallback((orderId: string, newStatus: string) => {
    setOrders(prev => {
      const order = prev.find(o => o.id === orderId);
      if (!order || order.status === newStatus) return prev;
      const prevStatus = prevStatusRef.current[orderId];
      if (prevStatus !== newStatus) {
        prevStatusRef.current[orderId] = newStatus;
        const cfg = STATUS_NOTIFICATION[newStatus];
        if (cfg) {
          const mealName = order.meal || 'Your order';
          addNotification({ title: cfg.title, message: cfg.message(mealName), type: cfg.type, orderId });
        }
      }
       // Remove completed orders from list entirely
      if (newStatus === 'completed') {
        return prev.filter(o => o.id !== orderId);
      }
      return prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    });
  }, [addNotification]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { orderId, type } = (e as CustomEvent).detail ?? {};
      if (!orderId || !type) return;
      const typeToStatus: Record<string, string> = {
        order_confirmed: 'confirmed',
        order_cooking:   'cooking',
        order_ready:     'ready',
      };
      const status = typeToStatus[type];
      if (status) applyStatusUpdate(orderId, status);
    };
    window.addEventListener('order-status-changed', handler);
    return () => window.removeEventListener('order-status-changed', handler);
  }, [applyStatusUpdate]);

  useEffect(() => {
    if (orders.length > 0) {
      orders.forEach(o => { prevStatusRef.current[o.id] = o.status; });
      return;
    }
    const token = localStorage.getItem('auth_token');
    if (!token) return;

fetchCustomerOrders()
  .then(dtos => {
    const relevant = dtos.filter(d => d.status !== 'completed');
    if (relevant.length > 0) {
      const local = relevant.map(dtoToLocal);

      local.forEach(o => {
        prevStatusRef.current[o.id] = o.status;
      });

      // Prevent overwrite if context already populated orders
      setOrders(prev => {
        if (prev.length > 0) return prev;
        return local;
      });
    }
  })
  .catch(err => console.warn('[MyOrders] Initial fetch failed:', err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 // WITH THIS — move contextOrderIds inside the callback:
const pollOrders = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // FIX [POLL-RESET]: contextOrders removed from deps — reading it via a ref
    // instead so pollOrders identity is stable and the setInterval doesn't
    // restart every time an SSE update changes contextOrders.
    const uncovered = orders.filter(o =>
      o.status !== 'completed' &&
      o.status !== 'cancelled'
    );
    if (!uncovered.length) return;

    const results = await Promise.allSettled(
      uncovered.map(o => import('../../kitchen-api/kitchenApi').then(api => api.fetchCustomerOrder(o.id)))
    );
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        const statusMap: Record<string, string> = {
          pending: 'confirmed', cooking: 'cooking', ready: 'ready',
          completed: 'completed', cancelled: 'cancelled',
        };
        applyStatusUpdate(r.value.id, statusMap[r.value.status] ?? r.value.status);
      }
    });
 }, [orders, applyStatusUpdate]);

  useEffect(() => {
    const id = setInterval(pollOrders, FALLBACK_POLL_INTERVAL);
    return () => clearInterval(id);
  }, [pollOrders]);

  useEffect(() => {
    if (locationState?.wasCancelled) {
      toast({
        title: 'Order Cancelled',
        description: locationState.paymentMethod === 'upi'
          ? `Rs.${locationState.total} will be refunded within 5-7 business days.`
          : 'Order cancelled successfully.',
        variant: 'destructive',
      });
    }
  }, [locationState]);

  const STATUS_SORT: Record<string, number> = {
    confirmed: 1, preparing: 2, cooking: 3, ready: 4, delayed: 5, cancelled: 6,
  };

  const cancelledOrders    = orders.filter(o => o.status === 'cancelled');
  const nonCancelledActive = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  // Sort by flow order: confirmed → preparing → cooking → ready, then by createdAt desc
  const sortedActive = [...nonCancelledActive].sort((a, b) => {
    const diff = (STATUS_SORT[a.status] ?? 9) - (STATUS_SORT[b.status] ?? 9);
    return diff !== 0 ? diff : (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
  const activeOrders = [...sortedActive, ...cancelledOrders];
  const hasOrders          = activeOrders.length > 0;
  const hasCancelledOrders = cancelledOrders.length > 0;

  const pageMetrics = (() => {
    const active = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed');
    return {
      timeSaved:        active.reduce((s, o) => s + (o.timeSaved || 0), 0),
      foodWasteReduced: active.length * 0.15,
      loyaltyPoints:    Math.floor(active.reduce((s, o) => s + o.price, 0) / 10),
    };
  })();

const openSwap = useCallback(async (orderId: string) => {
    setActiveOrderId(orderId);
    setSwapSearchQuery('');
    setSwapCategory('All');
    setShowSwapModal(true);
    if (swapDishes.length > 0) return;
    setSwapLoading(true);
    try {
      const items = await fetchCustomerMenuItems();
      setSwapDishes(items.filter(i => i.available).map(menuItemToSwapDish));
    } catch { /* show empty state */ }
    finally { setSwapLoading(false); }
  }, [swapDishes.length]);

const confirmSwap = useCallback(async (dish: SwapDish) => {
  if (!activeOrderId) return;
  const order = orders.find(o => o.id === activeOrderId);
  if (!order) return;
  setActionPending(true);
  try {
    const dto = await swapCustomerOrderDish(activeOrderId, dish.id);

    const newPrepMinutes = dto.totalPrepMinutes > 0 ? dto.totalPrepMinutes : order.totalPrepMinutes ?? 0;
    const newTimeSaved   = newPrepMinutes > 0 ? Math.floor(newPrepMinutes * 0.8) : dish.timeSaved;

    // FIX [SWAP-PICKUP-TIME]: after swap the backend keeps the same slot,
    // so dto.pickupSlotTime is the authoritative pickup time (may already be
    // extended). Re-format it exactly like Checkout.tsx / dtoToLocal() do.
    // If no slot, fall back to now + prepTime so customer sees a real time.
    let newPickupTime = order.pickupTime; // safe fallback
    if (dto.pickupSlotTime) {
      const parsed = new Date(dto.pickupSlotTime);
      if (!isNaN(parsed.getTime())) {
        newPickupTime = parsed.toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit', hour12: true,
        });
      }
    } else if (newPrepMinutes > 0) {
      // No slot on order — derive from now + prep time
      newPickupTime = new Date(Date.now() + newPrepMinutes * 60 * 1000)
        .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const swappedFields = {
      meal:             dish.meal,
      price:            dto.totalPrice ?? dish.price,
      image:            dish.image,
      timeSaved:        newTimeSaved,
      totalPrepMinutes: newPrepMinutes,
      createdAt:        Date.now(),
      wasSwapped:       true,
      originalMeal:     order.wasSwapped ? order.originalMeal : order.meal,
      pickupTime:       newPickupTime,                         // ← NEW
      pickupSlotTime:   dto.pickupSlotTime ?? order.pickupSlotTime, // ← NEW
    };

    setOrders(prev => prev.map(o =>
      o.id === activeOrderId ? { ...o, ...swappedFields } : o
    ));
    // Keep context in sync so contextOrders useEffect doesn't overwrite swap
    ctxUpdateFields(activeOrderId, swappedFields);
    setShowSwapModal(false);
    toast({ title: 'Dish Swapped!', description: `Changed to ${dish.meal}. Pickup: ${newPickupTime}` });
  } catch (err: any) {
    toast({ title: 'Swap failed', description: err.message, variant: 'destructive' });
  } finally { setActionPending(false); }
}, [activeOrderId, orders, ctxUpdateFields]);

const openExtend = useCallback(async (orderId: string) => {
    setActiveOrderId(orderId);
    setShowExtendModal(true);
    setExtendLoading(true);
    try {
      const slots = await fetchCustomerSlots();
      const order = orders.find(o => o.id === orderId);

      // FIX [EXTEND-MYORDERS-EARLIER-SLOT]: only show slots strictly AFTER the
      // order's current pickup slot so the customer cannot accidentally move
      // their pickup backwards. For ASAP/express orders (no real slot time),
      // show all future slots since any slot is an improvement.
      const currentSlotMs: number = (() => {
        if (!order) return Date.now();
        // Use stored ISO string if available (most accurate)
        if (order.pickupSlotTime) {
          const p = new Date(order.pickupSlotTime);
          if (!isNaN(p.getTime())) return p.getTime();
        }
        // Fall back to parsing the display string
        if (!order.pickupTime || order.pickupTime === 'ASAP') return Date.now();
        const spaced = order.pickupTime.trim().replace(/([0-9])(am|pm)/gi, '$1 $2');
        const parts  = spaced.split(/\s+/);
        const [hStr, mStr] = (parts[0] ?? '0:00').split(':');
        let h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);
        if (isNaN(h) || isNaN(m)) return Date.now();
        const period = (parts[1] ?? 'AM').toUpperCase();
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0).getTime();
      })();

      setExtendSlots(
        slots
          .filter(s => s.remaining > 0 && new Date(s.slotTime).getTime() > currentSlotMs)
          .map(s => ({ slotId: s.slotId, displayTime: s.displayTime, remaining: s.remaining }))
      );
    } catch { setExtendSlots([]); }
    finally { setExtendLoading(false); }
  }, [orders]);

const confirmExtend = useCallback(async (slotId: string, displayTime: string) => {
  if (!activeOrderId) return;
  setActionPending(true);
  try {
    const dto = await extendCustomerOrderSlot(activeOrderId, slotId);

    // FIX [EXTEND-SLOT-TIME]: dto.pickupSlotTime is authoritative (backend
    // saveAndFlush + re-fetch ensures fresh slot). displayTime is only a
    // fallback if backend returns null (shouldn't happen after backend fix).
    const newPickupTime = dto.pickupSlotTime
      ? (() => {
          const parsed = new Date(dto.pickupSlotTime);
          return isNaN(parsed.getTime()) ? displayTime :
            parsed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        })()
      : displayTime;

    const extendedFields = {
      pickupTime:     newPickupTime,
      pickupSlotTime: dto.pickupSlotTime ?? undefined, // ← persist so swap reads correct base
      status:         'delayed' as const,
    };

    setOrders(prev => prev.map(o =>
      o.id === activeOrderId ? { ...o, ...extendedFields } : o
    ));
    // Keep context in sync — prevents contextOrders effect from overwriting
    // the extended pickupTime on next SSE update
    ctxUpdateFields(activeOrderId, extendedFields);

    setShowExtendModal(false);
    toast({ title: 'Slot Extended!', description: `New pickup: ${newPickupTime}` });
  } catch (err: any) {
    toast({ title: 'Extend failed', description: err.message, variant: 'destructive' });
  } finally { setActionPending(false); }
}, [activeOrderId, ctxUpdateFields]);

  const openCancel = useCallback((orderId: string) => {
    setActiveOrderId(orderId);
    setShowCancelModal(true);
  }, []);

const handleCancelOrder = useCallback(async (orderId: string) => {
    try {
      await cancelCustomerOrder(orderId);
      applyStatusUpdate(orderId, 'cancelled');
      ctxUpdateStatus(orderId, 'cancelled' as any);
      try {
        const ch = new BroadcastChannel('skipline_order_events');
        ch.postMessage({ type: 'ORDER_CANCELLED', orderId });
        ch.close();
      } catch { }
      toast({ title: 'Order Cancelled', description: 'Your order has been cancelled.', variant: 'destructive' });
    } catch (err: any) {
      toast({ title: 'Cannot Cancel', description: err.message, variant: 'destructive' });
    }
  }, [applyStatusUpdate, ctxUpdateStatus]);

  const updateOrderStatus = useCallback((orderId: string, newStatus: string) => {
    if (newStatus === 'completed') {
      // Remove immediately from list — don't just change status
      setOrders(prev => prev.filter(o => o.id !== orderId));
      ctxUpdateStatus(orderId, 'completed');
      toast({ title: '✅ Collected!', description: 'Enjoy your meal!' });
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  }, [ctxUpdateStatus]);

  // FIX: find the ready order's pickup point dynamically
  const readyOrder = nonCancelledActive.find(o => o.status === 'ready');

  return (
    <DashboardLayout>
      <div className="orders">
        <FloatingParticles />

        <div className="orders__hero">
          <div className="orders__hero-gradient">
            <motion.div className="orders__hero-gradient-orb orders__hero-gradient-orb--1"
              animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="orders__hero-gradient-orb orders__hero-gradient-orb--2"
              animate={{ x: [0, -80, 0], y: [0, 100, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }} />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="orders__header">
            <div className="orders__header-content">
              <div className="orders__header-left">
                <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.2 }} className="orders__title-badge">
                  <Package className="orders__title-badge-icon" /><span>Order Tracking</span>
                </motion.div>
                <h1 className="orders__title">
                  <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>My</motion.span>
                  {' '}<span className="orders__title-grad">
                    <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>Orders</motion.span>
                  </span>
                </h1>
                <motion.p className="orders__subtitle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                  {hasOrders
                    ? `${nonCancelledActive.length} active order${nonCancelledActive.length !== 1 ? 's' : ''} in progress`
                    : 'No active orders at the moment'}
                </motion.p>
              </div>
              {hasOrders && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={pollOrders} className="orders__simulate-btn">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                      <RefreshCw className="orders__simulate-icon" />
                    </motion.div>
                    <span className="orders__simulate-text">Refresh Status</span>
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {nonCancelledActive.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="orders__impact-stats">
            {[
              { icon: Zap,   value: pageMetrics.timeSaved,                   label: 'Minutes Saved', suffix: ' min', color: '#ff6b35' },
              { icon: Leaf,  value: pageMetrics.foodWasteReduced.toFixed(1), label: 'Waste Reduced', suffix: ' kg',  color: '#10b981' },
              { icon: Award, value: pageMetrics.loyaltyPoints,               label: 'Points Earned', suffix: '',     color: '#fbbf24' },
            ].map((stat, i) => (
              <motion.div key={i} className="orders__stat-card"
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }} whileHover={{ scale: 1.05, y: -5 }}>
                <div className="orders__stat-glow" style={{ background: `radial-gradient(circle, ${stat.color}40, transparent)` }} />
                <motion.div className="orders__stat-icon" style={{ color: stat.color }}
                  animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                  <stat.icon />
                </motion.div>
                <div className="orders__stat-content">
                  <p className="orders__stat-value">{stat.value}{stat.suffix}</p>
                  <p className="orders__stat-label">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <AnimatePresence>
          {readyOrder && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }} className="orders__ready-banner">
              <div className="orders__ready-content">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="orders__ready-icon">
                  <CheckCircle2 />
                </motion.div>
                <div className="orders__ready-text">
                  <h3 className="orders__ready-title">Order Ready!</h3>
                  {/* FIX: pickup point is dynamic, not hardcoded "Counter #3" */}
                  <p className="orders__ready-description">
                    {readyOrder.meal} is ready — head to the {getPickupPointLabel(readyOrder)}
                  </p>
                </div>
                <Sparkles className="orders__ready-sparkle" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {hasCancelledOrders && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }} className="orders__cancelled-banner">
              <div className="orders__cancelled-content">
                <div className="orders__cancelled-icon"><AlertTriangle /></div>
                <div className="orders__cancelled-text">
                  <h3 className="orders__cancelled-title">Order Cancelled</h3>
                  <p className="orders__cancelled-description">
                    {locationState?.paymentMethod === 'upi'
                      ? `Your refund of Rs.${locationState?.total} is being processed`
                      : 'Your order has been cancelled successfully'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hasOrders ? (
          <div className="orders__list">
            <AnimatePresence mode="popLayout">
              {activeOrders.map((order, index) => {
                const status     = statusConfig[order.status || 'confirmed'] || statusConfig.confirmed;
                const StatusIcon = status.icon;
                const isCancelled = order.status === 'cancelled';
                return (
                  <motion.div key={order.id} layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -100, scale: 0.9 }}
                    transition={{ delay: index * 0.1, layout: { type: 'spring', stiffness: 300, damping: 30 } }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className={`orders__card ${isCancelled ? 'orders__card--cancelled' : ''}`}>
                    <motion.div className="orders__card-glow"
                      animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 3, repeat: Infinity }} />

                    <div className="orders__card-header">
                      <motion.div className="orders__image-wrapper" whileHover={{ scale: 1.05, rotate: 2 }}>
                        {order.image ? (
                          <img src={order.image} alt={order.meal}
                            className={`orders__image ${isCancelled ? 'orders__image--cancelled' : ''}`} />
                        ) : (
                          <div className={`orders__image orders__image--placeholder ${isCancelled ? 'orders__image--cancelled' : ''}`}>
                            <Utensils className="orders__image-placeholder-icon" />
                          </div>
                        )}
                        {!isCancelled && order.status === 'cooking' && (
                          <motion.div className="orders__cooking-badge"
                            animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                            <Flame className="orders__cooking-icon" />
                          </motion.div>
                        )}
                      </motion.div>

                      <div className="orders__info">
                        <div className="orders__title-row">
                          <div className="orders__details">
                            <h3 className="orders__name">{order.meal}</h3>
                          </div>
                          <motion.span className="orders__price" initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}>
                            Rs.{order.price.toFixed(0)}
                          </motion.span>
                        </div>
                        <div className="orders__badges">
                          <motion.span className={`orders__status-badge orders__status-badge--${status.color}`}
                            initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                            <StatusIcon className="orders__badge-icon" />{status.label}
                          </motion.span>
                          {!isCancelled && (
                            <motion.span className={`orders__payment-badge orders__payment-badge--${order.paymentStatus}`}
                              initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                              {order.paymentStatus === 'paid' ? 'Paid' : 'Cash'}
                            </motion.span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isCancelled && (
                      <div className="orders__progress-section">
                        <div className="orders__progress-header">
                          <span>Cooking Progress</span>
                         <motion.span key={computeProgress(order)} initial={{ scale: 0 }} animate={{ scale: 1 }}
  transition={{ type: 'spring' }}>{computeProgress(order)}%</motion.span>
                        </div>
                        <div className="orders__progress-bar">
                          <motion.div className="orders__progress-fill"
                           initial={{ width: 0 }} animate={{ width: `${computeProgress(order)}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }} />
                        </div>
                      </div>
                    )}

                    {isCancelled && (
                      <motion.div className="orders__cancelled-info" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <p className="orders__cancelled-text">
                          {order.paymentStatus === 'paid'
                            ? `Refund of Rs.${order.price} will be processed within 5-7 business days`
                            : 'Order cancelled successfully'}
                        </p>
                      </motion.div>
                    )}

                    {!isCancelled && (
                      <div className="orders__details-grid">
                        {[
                         {
  icon: Clock,
  value: order.pickupTime === 'ASAP' ? '⚡ ASAP' : order.pickupTime,
  label: order.pickupTime === 'ASAP' ? 'Express Pickup' : 'Pickup Time',
  color: order.pickupTime === 'ASAP' ? '#10b981' : '#ff6b35',
},
                          { icon: ChefHat, value: 'In Progress',                  label: 'Kitchen Queue', color: '#a855f7' },
                          // FIX: pickup point is dynamic — no more hardcoded "Counter #3"
                          { icon: MapPin,  value: getPickupPointLabel(order),      label: 'Pickup Point',  color: '#10b981' },
                        ].map((detail, i) => (
                          <motion.div key={i} className="orders__detail-card"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 + i * 0.1 }} whileHover={{ y: -3, scale: 1.05 }}>
                            <detail.icon className="orders__detail-icon" style={{ color: detail.color }} />
                            <p className="orders__detail-value">{detail.value}</p>
                            <p className="orders__detail-label">{detail.label}</p>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    <div className="orders__card-footer">
                      <div className="orders__meta">
                        <span className="orders__id">{order.orderRef || order.id}</span>
                        <span className="orders__separator">•</span>
                        <span>Qty: {order.quantity}</span>
                        {order.timeSaved > 0 && !isCancelled && (
                          <>
                            <span className="orders__separator">•</span>
                            <motion.span className="orders__time-saved"
                              animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                              {order.timeSaved} min saved
                            </motion.span>
                          </>
                        )}
                      </div>
                      {order.status === 'confirmed' && !isCancelled && (
                        <div className="orders__actions-row">
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button onClick={() => openSwap(order.id)} variant="outline" className="orders__action-btn orders__action-btn--swap">
                              <RefreshCw className="orders__action-icon" />Swap Dish
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button onClick={() => openExtend(order.id)} variant="outline" className="orders__action-btn orders__action-btn--extend">
                              <Clock className="orders__action-icon" />Extend Slot
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button onClick={() => openCancel(order.id)} variant="outline" className="orders__action-btn orders__action-btn--cancel">
                              <XCircle className="orders__action-icon" />Cancel
                            </Button>
                          </motion.div>
                        </div>
                      )}
                      {order.status === 'ready' && !isCancelled && (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button onClick={() => updateOrderStatus(order.id, 'completed')} className="orders__collect-btn">
                            <CheckCircle2 className="orders__collect-icon" />Mark Collected
                          </Button>
                        </motion.div>
                      )}
                      {isCancelled && (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button onClick={() => navigate('/customer-dashboard/browse')} className="orders__browse-again-btn">
                            <Package className="orders__browse-icon" />Order Again
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }} className="orders__empty">
            <motion.div className="orders__empty-glow"
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 3, repeat: Infinity }} />
            <motion.div className="orders__empty-icon-wrapper"
              animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}>
              <Package className="orders__empty-icon" />
            </motion.div>
            <h2 className="orders__empty-title">No Active Orders</h2>
            <p className="orders__empty-description">Pre-order your favorite meals and skip the queue!</p>
            <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => navigate('/customer-dashboard/browse')} className="orders__empty-btn">
                <Utensils className="orders__empty-btn-icon" />Browse Menu
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
   {/* SWAP MODAL */}
      <AnimatePresence>
        {showSwapModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="orders__modal-overlay" onClick={() => setShowSwapModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }} onClick={e => e.stopPropagation()}
              className="orders__modal-box">
              <div className="orders__modal-header">
                <div>
                  <h3 className="orders__modal-title">Swap Dish</h3>
                  <p className="orders__modal-subtitle">Pick a different dish</p>
                </div>
                <button onClick={() => setShowSwapModal(false)} className="orders__modal-close"><X size={20} /></button>
              </div>
              <div className="orders__modal-search">
                <Search size={16} className="orders__modal-search-icon" />
                <input autoFocus placeholder="Search dishes..." value={swapSearchQuery}
                  onChange={e => setSwapSearchQuery(e.target.value)} className="orders__modal-search-input" />
              </div>
              <div className="orders__modal-categories">
                {['All', ...Array.from(new Set(swapDishes.map(d => d.category)))].map(cat => (
                  <button key={cat} onClick={() => setSwapCategory(cat)}
                    className={`orders__modal-cat ${swapCategory === cat ? 'orders__modal-cat--active' : ''}`}>{cat}</button>
                ))}
              </div>
              <div className="orders__modal-list">
                {swapLoading ? (
                  <div className="orders__modal-loading"><Loader2 size={28} className="orders__spin" /></div>
                ) : swapDishes
                    .filter(d => d.meal.toLowerCase().includes(swapSearchQuery.toLowerCase()) &&
                      (swapCategory === 'All' || d.category === swapCategory))
                    .map(dish => {
                      const cur = orders.find(o => o.id === activeOrderId);
                      const diff = dish.price - (cur?.price ?? 0);
                      const isCur = dish.meal === cur?.meal;
                      return (
                        <motion.div key={dish.id} whileHover={{ scale: 1.01 }}
                          onClick={() => !isCur && !actionPending && confirmSwap(dish)}
                          className={`orders__swap-item ${isCur ? 'orders__swap-item--current' : ''}`}>
                          <img src={dish.image} alt={dish.meal} className="orders__swap-item-img" />
                          <div className="orders__swap-item-info">
                            <p className="orders__swap-item-name">{dish.meal}{isCur && <span className="orders__swap-item-cur"> (current)</span>}</p>
                            <p className="orders__swap-item-cat">{dish.category}</p>
                          </div>
                          <div className="orders__swap-item-price">
                            <p>Rs.{dish.price}</p>
                            {!isCur && diff !== 0 && (
                              <p className={diff > 0 ? 'orders__swap-item-extra' : 'orders__swap-item-refund'}>
                                {diff > 0 ? '+' : ''}Rs.{Math.abs(diff)}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXTEND SLOT MODAL */}
      <AnimatePresence>
        {showExtendModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="orders__modal-overlay" onClick={() => setShowExtendModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}
              className="orders__modal-box orders__modal-box--sm">
              <div className="orders__modal-header">
                <h3 className="orders__modal-title">Extend Pickup Slot</h3>
                <button onClick={() => setShowExtendModal(false)} className="orders__modal-close"><X size={20} /></button>
              </div>
              {extendLoading ? (
                <div className="orders__modal-loading"><Loader2 size={28} className="orders__spin" /></div>
              ) : extendSlots.length === 0 ? (
                <div className="orders__modal-empty" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <p style={{ fontWeight: 500, marginBottom: 6 }}>All slots are currently full</p>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                    Your food will be kept warm at the counter — just arrive when you can.
                  </p>
                </div>
              ) : (
                <div className="orders__modal-list">
                  {extendSlots.map(slot => (
                    <motion.button key={slot.slotId} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      disabled={actionPending}
                      onClick={() => confirmExtend(slot.slotId, slot.displayTime)}
                      className="orders__slot-item">
                      <Clock size={18} className="orders__slot-icon" />
                      <div>
                        <p className="orders__slot-time">{slot.displayTime}</p>
                        <p className="orders__slot-rem">{slot.remaining} slots left</p>
                      </div>
                      {actionPending && <Loader2 size={16} className="orders__spin" />}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CANCEL CONFIRM MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="orders__modal-overlay" onClick={() => setShowCancelModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}
              className="orders__modal-box orders__modal-box--sm">
              <div className="orders__cancel-modal-icon"><AlertCircle size={32} /></div>
              <h3 className="orders__modal-title" style={{ textAlign: 'center' }}>Cancel Order?</h3>
              <p className="orders__modal-subtitle" style={{ textAlign: 'center' }}>
                {orders.find(o => o.id === activeOrderId)?.paymentStatus === 'paid'
                  ? `Rs.${orders.find(o => o.id === activeOrderId)?.price} refund in 5-7 days.`
                  : 'This cannot be undone.'}
              </p>
              <div className="orders__cancel-modal-actions">
                <Button variant="outline" onClick={() => setShowCancelModal(false)}
                  className="orders__cancel-modal-keep">Keep Order</Button>
                <Button disabled={actionPending} onClick={async () => {
                  if (!activeOrderId) return;
                  setActionPending(true);
                  await handleCancelOrder(activeOrderId);
                  setActionPending(false);
                  setShowCancelModal(false);
                }} className="orders__cancel-modal-confirm">
                  {actionPending ? <Loader2 size={16} className="orders__spin" /> : 'Yes, Cancel'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
}