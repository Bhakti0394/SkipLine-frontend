import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Award, Zap, Leaf } from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { AnimatedKPI } from '../../components/CustomerDashboard/dashboard/AnimatedKPI';
import { KitchenGlance } from '../../components/CustomerDashboard/dashboard/KitchenGlance';
import { OrderFlowMini } from '../../components/CustomerDashboard/dashboard/OrderFlowMini';
import { StreakCard } from '../../components/CustomerDashboard/dashboard/StreakCard';
import { CartButton } from '../../components/CustomerDashboard/dashboard/CartButton';
import { useSkipLine } from '../../customer-context/SkipLineContext';
import { useAuth } from '../../context/AuthContext';
import { fetchBoard, KanbanBoardResponse } from '../../kitchen-api/kitchenApi';
import '../../components/CustomerDashboard/styles/Index.scss';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function computeTrend(value: number, suffix = ''): string | undefined {
  if (!value || value <= 0) return undefined;
  if (value >= 1000) return `+${(value / 1000).toFixed(1)}k${suffix}`;
  return `+${Math.round(value)}${suffix}`;
}

interface KitchenGlanceData {
  topDish:     { name: string; orders: number };
  busiestHour: { time: string; orders: number };
  avgPrepTime: number;
  bottleneck?: string;
}

function formatHour(h: number): string {
  if (h === 0)  return '12:00 AM';
  if (h < 12)   return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

function deriveKitchenGlance(board: KanbanBoardResponse): KitchenGlanceData {
  const allOrders = [
    ...board.columns.PENDING,
    ...board.columns.COOKING,
    ...board.columns.READY,
    ...board.columns.COMPLETED,
  ];

  // Top dish — most ordered item by quantity across all orders today
  const itemCounts: Record<string, number> = {};
  for (const order of allOrders) {
    for (const item of order.itemSummary) {
      const name = item.replace(/^\d+x\s*/, '');
      const qty  = parseInt(item.match(/^(\d+)x/)?.[1] ?? '1', 10);
      itemCounts[name] = (itemCounts[name] ?? 0) + qty;
    }
  }
  const topEntry = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
  const topDish  = topEntry
    ? { name: topEntry[0], orders: topEntry[1] }
    : { name: 'No orders yet', orders: 0 };

  // Avg prep time from board metrics
  const avgPrepTime = Math.round(board.metrics.avgCookTimeMinutes) || 0;

  // Busiest hour — from placedAt timestamps
  const hourCounts: Record<number, number> = {};
  for (const order of allOrders) {
    if (order.placedAt) {
      const h = new Date(order.placedAt).getHours();
      hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    }
  }
  const busiestEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  const busiestHour  = busiestEntry
    ? { time: formatHour(parseInt(busiestEntry[0], 10)), orders: busiestEntry[1] }
    : { time: '—', orders: 0 };

  // Bottleneck from late orders / capacity
  const bottleneck = board.metrics.lateOrdersCount > 0
    ? `${board.metrics.lateOrdersCount} order${board.metrics.lateOrdersCount > 1 ? 's' : ''} running late`
    : board.metrics.capacityUtilizationPercent >= 90
    ? 'Kitchen near full capacity'
    : undefined;

  return { topDish, busiestHour, avgPrepTime, bottleneck };
}

const FALLBACK_KITCHEN: KitchenGlanceData = {
  topDish:     { name: '—', orders: 0 },
  busiestHour: { time: '—', orders: 0 },
  avgPrepTime: 0,
  bottleneck:  undefined,
};

const Index = () => {
  const { user }                      = useAuth();
  const { metrics, kitchenState }     = useSkipLine();
  const [kitchenData, setKitchenData] = useState<KitchenGlanceData>(FALLBACK_KITCHEN);

  const firstName = user?.fullName?.split(' ')[0] ?? user?.email ?? 'there';

  const timeSavedTrend       = computeTrend(metrics.timeSaved,        ' min');
  const loyaltyTrend         = computeTrend(metrics.loyaltyPoints);
  const foodWasteTrend       = computeTrend(metrics.foodWasteReduced, ' kg');
  const ordersThisMonthTrend = computeTrend(metrics.ordersThisMonth);

  // Fetch board once on mount to populate Kitchen at a Glance with real data.
  // The board endpoint requires KITCHEN role — if the customer token lacks it,
  // the fetch will 403 and we silently fall back to the placeholder state.
  useEffect(() => {
    const controller = new AbortController();
    fetchBoard(controller.signal)
      .then(board => {
        setKitchenData(deriveKitchenGlance(board));
        console.log('[Index] Kitchen at a Glance synced from board');
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('[Index] Board fetch failed, using fallback kitchen data:', err.message);
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <DashboardLayout>
      <div className="dashboard-background" />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="dashboard-header"
      >
        <div>
          <h1 className="dashboard-title">
            {getGreeting()}, <span className="highlight">{firstName}</span>
          </h1>
          <p className="dashboard-subtitle">
            Customer Dashboard • Real-time order tracking
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="kpi-grid"
      >
        <AnimatedKPI
          icon={Clock}
          label="Time Saved This Month"
          value={metrics.timeSaved}
          suffix=" min"
          trend={metrics.timeSaved > 0 ? 'up' : undefined}
          trendValue={timeSavedTrend}
          variant="primary"
          delay={0.1}
        />
        <AnimatedKPI
          icon={Award}
          label="Loyalty Points"
          value={metrics.loyaltyPoints}
          trend={metrics.loyaltyPoints > 0 ? 'up' : undefined}
          trendValue={loyaltyTrend}
          variant="accent"
          delay={0.15}
        />
        <AnimatedKPI
          icon={Leaf}
          label="Food Waste Reduced"
          value={metrics.foodWasteReduced}
          suffix=" kg"
          trend={metrics.foodWasteReduced > 0 ? 'up' : undefined}
          trendValue={foodWasteTrend}
          variant="success"
          delay={0.2}
          decimals={1}
        />
        <AnimatedKPI
          icon={Zap}
          label="Orders This Month"
          value={metrics.ordersThisMonth}
          trend={metrics.ordersThisMonth > 0 ? 'up' : undefined}
          trendValue={ordersThisMonthTrend}
          variant="warning"
          delay={0.25}
        />
      </motion.div>

      <div className="main-grid">
        <StreakCard />
        <OrderFlowMini />
      </div>

      <div className="kitchen-section">
        <KitchenGlance
          topDish={kitchenData.topDish}
          busiestHour={kitchenData.busiestHour}
          avgPrepTime={kitchenData.avgPrepTime}
          bottleneck={
            kitchenData.bottleneck ??
            (kitchenState.queuedOrders.length > 2 ? 'High queue volume' : undefined)
          }
        />
      </div>

      {kitchenState.queuedOrders.length > 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="queue-alert"
        >
          <div className="alert-content">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="alert-indicator"
            />
            <div>
              <p className="alert-title">Queue Capacity Alert</p>
              <p className="alert-description">
                {kitchenState.queuedOrders.length} orders waiting. Consider expanding
                kitchen capacity or adjusting pickup slots.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <CartButton />
    </DashboardLayout>
  );
};

export default Index;