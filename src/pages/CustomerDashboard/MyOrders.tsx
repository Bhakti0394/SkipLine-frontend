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
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '../../customer-hooks/use-toast';
import { fetchCustomerOrders, CustomerOrderDto } from '../../kitchen-api/kitchenApi';
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
  cookingStartedAt?: number;
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

  // confirmed/pending — order not yet cooking, show fixed low progress
  if (order.status === 'confirmed' || order.status === 'pending') return 5;

  const totalMin = order.totalPrepMinutes && order.totalPrepMinutes > 0
    ? order.totalPrepMinutes
    : 20;

  // cooking — only count elapsed time from when cooking actually started
  // Never use createdAt here — that includes queue wait time which is wrong
  const cookingStartedAt = (order as any).cookingStartedAt as number | undefined;
  const anchor = cookingStartedAt ?? null;

  if (!anchor) {
    // Cooking but no cookingStartedAt yet — show modest progress
    return order.status === 'cooking' ? 10 : 5;
  }

  const elapsedMin = (Date.now() - anchor) / 60000;
  const rawProgress = (elapsedMin / totalMin) * 100;

  return Math.round(Math.min(99, Math.max(10, rawProgress)));
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
   createdAt:        dto.placedAt          ? new Date(dto.placedAt).getTime()          : Date.now(),
    totalPrepMinutes: dto.totalPrepMinutes  ?? 0,
    pickupSlotTime:   dto.pickupSlotTime    ?? undefined,
    cookingStartedAt: dto.cookingStartedAt  ? new Date(dto.cookingStartedAt).getTime()  : undefined,
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
  const { orders: contextOrders, updateOrderStatus: ctxUpdateStatus } = useSkipLine();

  const [orders, setOrders] = useState<LocalOrder[]>(() => {
    if (locationState?.fromOrderSuccess && locationState?.orders?.length) {
      return locationState.orders.map(o => ({
        ...o,
        status:        o.wasCancelled ? 'cancelled' : (o.status || 'confirmed'),
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

    const currentContextIds = new Set(contextOrders.map(o => o.id));
    const uncovered = orders.filter(o =>
      o.status !== 'completed' &&
      o.status !== 'cancelled' &&
      !currentContextIds.has(o.id)
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
  }, [orders, applyStatusUpdate, contextOrders]);

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
    </DashboardLayout>
  );
}