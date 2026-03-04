import { motion } from 'framer-motion';
import { Clock, Award, Zap, Leaf } from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { AnimatedKPI } from '../../components/CustomerDashboard/dashboard/AnimatedKPI';
import { KitchenGlance } from '../../components/CustomerDashboard/dashboard/KitchenGlance';
import { OrderFlowMini } from '../../components/CustomerDashboard/dashboard/OrderFlowMini';
import { StreakCard } from '../../components/CustomerDashboard/dashboard/StreakCard';
import { CartButton } from '../../components/CustomerDashboard/dashboard/CartButton';
import { usePrepline } from '../../customer-context/PreplineContext';
import '../../components/CustomerDashboard/styles/Index.scss';

const Index = () => {
  const { orders, metrics, kitchenState, orderHistory } = usePrepline();

  const activeOrders = orders.filter(o => o.status !== 'completed');

  const kitchenData = {
    topDish: { name: 'Butter Chicken', orders: 24 },
    busiestHour: { time: '12:30 PM', orders: 45 },
    avgPrepTime: 12,
    bottleneck: kitchenState.queuedOrders.length > 2 ? 'High queue volume' : undefined,
  };

  const hasActivity = activeOrders.length > 0 || orderHistory.length > 0;

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
            Good afternoon, <span className="highlight">Alex</span>
          </h1>
          <p className="dashboard-subtitle">
            Executive Dashboard • Real-time kitchen insights
          </p>
        </div>
      </motion.div>

      {!hasActivity ? (
        <div className="no-activity">
          <p>No active orders or historical activity yet.</p>
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="kpi-grid"
          >
            <AnimatedKPI icon={Clock} label="Time Saved This Month" value={metrics.timeSaved} suffix=" min" trend="up" trendValue="+12%" variant="primary" delay={0.1} />
            <AnimatedKPI icon={Award} label="Loyalty Points" value={metrics.loyaltyPoints} trend="up" trendValue="+180" variant="accent" delay={0.15} />
            <AnimatedKPI icon={Leaf} label="Food Waste Reduced" value={metrics.foodWasteReduced} suffix=" kg" trend="up" trendValue="+0.5kg" variant="success" delay={0.2} decimals={1} />
            <AnimatedKPI icon={Zap} label="Orders This Month" value={metrics.ordersThisMonth} trend="up" trendValue="+23%" variant="warning" delay={0.25} />
          </motion.div>

          <div className="main-grid">
            <StreakCard />
            <OrderFlowMini />
          </div>

          <div className="kitchen-section">
            <KitchenGlance {...kitchenData} />
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
                    {kitchenState.queuedOrders.length} orders waiting. Consider expanding kitchen capacity or adjusting pickup slots.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      <CartButton />
    </DashboardLayout>
  );
};

export default Index;