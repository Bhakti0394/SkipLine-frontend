// components/CustomerDashboard/layout/DashboardLayout.tsx
//
// FIX [MISSING-MEMBER-TIER]: Header now receives a real `memberTier` prop.
// FIX [TIER-DOUBLE-COUNT]: totalOrders calculation corrected.
//
// BEFORE (broken tier calc):
//   const totalOrders = (metrics.ordersThisMonth ?? 0) + (orderHistory?.length ?? 0);
//
//   This DOUBLE-COUNTS because ordersThisMonth is the count of orders placed
//   this calendar month, and orderHistory contains ALL completed orders ever —
//   including those placed this month. A user with 10 total orders (all this
//   month) would show totalOrders = 10 + 10 = 20, jumping straight to Gold
//   tier even though they only have 10 real orders.
//
// AFTER:
//   totalOrders = orderHistory.length + activeOrders.length
//
//   orderHistory = all completed orders (from SkipLineContext, fetched from backend)
//   orders (active) = in-flight orders not yet completed
//   Together they represent the true all-time order count without double-counting.
//
// Tier thresholds (same as Profile.tsx):
//   Member     < 10 total orders
//   Silver    >= 10
//   Gold      >= 25
//   Platinum  >= 50
//   Legendary >= 100

import { ReactNode } from 'react';
import { Header }            from '../../CustomerDashboard/dashboard/Header';
import { Navigation }        from '../../CustomerDashboard/dashboard/Navigation';
import { NotificationPopup } from '../../CustomerDashboard/dashboard/NotificationPopup';
import { useAuth }           from '../../../context/AuthContext';
import { useSkipLine }       from '../../../customer-context/SkipLineContext';
import '../../../customer-main/index.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

function computeMemberTier(totalOrders: number): string {
  if (totalOrders >= 100) return 'Legendary';
  if (totalOrders >= 50)  return 'Platinum';
  if (totalOrders >= 25)  return 'Gold';
  if (totalOrders >= 10)  return 'Silver';
  return 'Member';
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user }                           = useAuth();
  const { metrics, orders, orderHistory }  = useSkipLine();

  const displayName =
    user?.fullName?.split(' ')[0] ??
    user?.email ??
    'Guest';

  const streak = metrics.streak ?? 0;

  // FIX: all-time order count = completed (history) + currently active.
  // Does NOT include ordersThisMonth which would double-count completed orders.
  const totalOrders = (orderHistory?.length ?? 0) + (orders?.length ?? 0);
  const memberTier  = computeMemberTier(totalOrders);

  return (
    <div className="customer-app">
      <Header userName={displayName} streak={streak} memberTier={memberTier} />
      <Navigation />

      <main className="customer-app__content">
        {children}
      </main>

      <NotificationPopup />
    </div>
  );
}