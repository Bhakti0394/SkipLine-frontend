// pages/CustomerDashboard/Index.tsx
//
// FIX: removed fetchBoard() call that was firing with a CUSTOMER JWT token.
//
// BEFORE: Index.tsx called fetchBoard() on mount to populate KitchenGlance.
//   fetchBoard() hits GET /api/kitchen/board which requires KITCHEN role.
//   When called from the customer dashboard the request goes out with a
//   CUSTOMER token → the backend returns 403 on every page load. The error
//   was silently swallowed (catch logged a warning) so the UI appeared fine,
//   but it created a noisy 403 in server logs on every customer visit.
//
// AFTER: Index.tsx now calls fetchCustomerKitchenSummary() which hits
//   GET /api/customer/kitchen-summary — the correct customer-facing endpoint
//   that requires CUSTOMER role and returns a CustomerKitchenSummaryDto
//   purpose-built for this widget. The data is richer (real top dish, busiest
//   hour, bottleneck detection) and comes from the right auth boundary.
//
//   deriveKitchenGlance() and the board-parsing logic are removed entirely
//   since the summary endpoint already does that work on the backend.

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
import { fetchCustomerKitchenSummary } from '../../kitchen-api/kitchenApi';
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

  // FIX: use fetchCustomerKitchenSummary() (requires CUSTOMER role, hits
  // /api/customer/kitchen-summary) instead of fetchBoard() (requires KITCHEN
  // role, hits /api/kitchen/board). The old call produced a 403 on every
  // customer dashboard load because the customer JWT doesn't have KITCHEN role.
  useEffect(() => {
    fetchCustomerKitchenSummary()
      .then(summary => {
        setKitchenData({
          topDish: {
            name:   summary.topDishName,
            orders: summary.topDishOrders,
          },
          busiestHour: {
            time:   summary.busiestHourTime,
            orders: summary.busiestHourOrders,
          },
          avgPrepTime: Math.round(summary.avgPrepMinutes),
          bottleneck:  summary.hasBottleneck
            ? (summary.bottleneckReason ?? 'Kitchen is running behind')
            : undefined,
        });
      })
      .catch(err => {
        // fetchCustomerKitchenSummary already returns the fallback on error,
        // so this path only fires on unexpected exceptions — keep fallback state.
        console.warn('[Index] Kitchen summary unavailable:', err.message);
      });
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
         kitchenCapacity={
  kitchenState.activeOrders.length > 3
    ? kitchenState.activeOrders.length + 2
    : 5
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