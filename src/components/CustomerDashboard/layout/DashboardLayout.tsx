import { ReactNode } from 'react';
import { Header } from '../../CustomerDashboard/dashboard/Header';
import { Navigation } from '../../CustomerDashboard/dashboard/Navigation';
import { NotificationPopup } from '../../CustomerDashboard/dashboard/NotificationPopup';
import { mockUserMetrics } from '../../../customer-data/mockData';
import '../../../customer-main/index.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="customer-app">
      <Header userName="Alex Chen" streak={mockUserMetrics.streak} />
      <Navigation />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-12">
        {children}
      </div>

      {/* ✅ Mounts once globally — listens to show-notification-popup events */}
      <NotificationPopup />
    </div>
  );
}