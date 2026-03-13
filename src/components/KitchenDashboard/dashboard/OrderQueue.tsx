// ============================================================
// OrderQueue.tsx
// FIX [F10/F12]: Added staff and onAssignChef props so OrderCard can show
// the chef assignment dropdown in the List view.
// Previously OrderQueue had no way to pass staff to OrderCard, so
// showAssignChef was always false and admins could never assign chefs
// from the List/Queue tab – only from the Kanban board.
// ============================================================

import { useState } from 'react';
import { Order, OrderStatus, ORDER_TYPE_WEIGHT } from '../../../kitchen-types/order';
import { StaffWorkloadDto } from '../../../kitchen-api/kitchenApi';
import { OrderCard } from './OrderCard';
import { Clock, ChefHat, CheckCircle2, Package } from 'lucide-react';
import '../styles/Orderqueue.scss';

interface OrderQueueProps {
  orders:          Order[];
  staff?:          StaffWorkloadDto[];   // FIX [F12]: now accepted, passed to OrderCard
  onStatusChange:  (orderId: string, status: OrderStatus) => Promise<void>;
  onAssignChef?:   (orderId: string, chefId: string) => Promise<void>; // FIX [F12]
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

export function OrderQueue({ orders, staff = [], onStatusChange, onAssignChef }: OrderQueueProps) {
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');

  const filteredOrders = activeTab === 'all'
    ? orders.filter(order => order.status !== 'completed')
    : orders.filter(order => order.status === activeTab);

  // Express-first sort: ORDER_TYPE_WEIGHT (express=0, normal=1, scheduled=2)
  // then by createdAt FIFO within each type.
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const tw = (ORDER_TYPE_WEIGHT[a.orderType] ?? 1) - (ORDER_TYPE_WEIGHT[b.orderType] ?? 1);
    if (tw !== 0) return tw;
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
              staff={staff}               // FIX [F10]: pass staff so chef dropdown works
              onStatusChange={onStatusChange}
              onAssignChef={onAssignChef} // FIX [F12]: pass handler through
            />
          ))
        )}
      </div>

    </div>
  );
}