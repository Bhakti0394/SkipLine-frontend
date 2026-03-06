// ============================================================
// OrderQueue.tsx — File 1 look + File 2 backend
// FIX: onStatusChange typed as Promise<void> to match OrderCard
// ============================================================

import { useState } from 'react';
import { Order, OrderStatus } from '../../../kitchen-types/order';
import { OrderCard } from './OrderCard';
import { Clock, ChefHat, CheckCircle2, Package } from 'lucide-react';
import '../styles/Orderqueue.scss';

interface OrderQueueProps {
  orders:         Order[];
  // FIX: async to match OrderCard's expected signature
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
}

interface Tab {
  status: OrderStatus | 'all';
  label:  string;
  icon:   React.ElementType;
}

const tabs: Tab[] = [
  { status: 'all',     label: 'All',     icon: Package      },
  { status: 'pending', label: 'Pending', icon: Clock        },
  { status: 'cooking', label: 'Cooking', icon: ChefHat      },
  { status: 'ready',   label: 'Ready',   icon: CheckCircle2 },
];

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2 };

export function OrderQueue({ orders, onStatusChange }: OrderQueueProps) {
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');

  const filteredOrders = activeTab === 'all'
    ? orders.filter(order => order.status !== 'completed')
    : orders.filter(order => order.status === activeTab);

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const getOrderCount = (status: OrderStatus | 'all'): number => {
    if (status === 'all') return orders.filter(order => order.status !== 'completed').length;
    return orders.filter(order => order.status === status).length;
  };

  return (
    <div className="order-queue">

      {/* Tab Navigation */}
      <div className="order-queue__tabs">
        {tabs.map((tab) => {
          const count    = getOrderCount(tab.status);
          const isActive = activeTab === tab.status;

          return (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab.status)}
              className={`order-queue__tab ${isActive ? 'order-queue__tab--active' : ''}`}
            >
              <tab.icon className="order-queue__tab-icon" />
              <span className="order-queue__tab-label">{tab.label}</span>
              <span className={`order-queue__tab-count ${isActive ? 'order-queue__tab-count--active' : ''}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Order List */}
      <div className="order-queue__list">
        {sortedOrders.length === 0 ? (
          <div className="order-queue__empty">
            <Package className="order-queue__empty-icon" />
            <p className="order-queue__empty-text">No orders in this category</p>
          </div>
        ) : (
          sortedOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={onStatusChange}
              // staff not passed — OrderQueue has no chef assignment role
            />
          ))
        )}
      </div>

    </div>
  );
}