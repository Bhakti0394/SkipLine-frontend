// components/CustomerDashboard/layout/DashboardLayout.tsx
//
// FIX [MISSING-MEMBER-TIER]: Header now receives a real `memberTier` prop.
//
// BEFORE: DashboardLayout only passed `userName` and `streak` to Header.
//   Header had a `memberTier` prop added in the last fix but DashboardLayout
//   never passed it — so Header always fell back to the default "Member" and
//   the hardcoded "Premium" fix had no effect.
//
// AFTER: memberTier is computed here from real order count (same thresholds
//   as Profile.tsx) and passed through to Header. Both Profile page and Header
//   badge now show the same tier.
//
// Tier thresholds:
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
  const { user }                  = useAuth();
  const { metrics, orderHistory } = useSkipLine();

  const displayName =
    user?.fullName?.split(' ')[0] ??
    user?.email ??
    'Guest';

  const streak = metrics.streak ?? 0;

  // FIX: compute real tier — same logic as Profile.tsx
  const totalOrders = (metrics.ordersThisMonth ?? 0) + (orderHistory?.length ?? 0);
  const memberTier  = computeMemberTier(totalOrders);

  return (
    <div className="customer-app">
      {/* FIX: pass memberTier so Header badge shows real tier, not hardcoded "Premium" */}
      <Header userName={displayName} streak={streak} memberTier={memberTier} />
      <Navigation />

      <main className="customer-app__content">
        {children}
      </main>

      <NotificationPopup />
    </div>
  );
}