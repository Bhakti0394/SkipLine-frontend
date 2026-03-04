import React from 'react';
import '../styles/Completedorders.scss';

// Lucide icons as simple SVG components
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  startedAt?: string | Date;
  completedAt?: string | Date;
  estimatedPrepTime: number;
}

interface CompletedOrdersProps {
  orders: Order[];
}

export function CompletedOrders({ orders }: CompletedOrdersProps) {
  // Format preparation time
  const formatPrepTime = (order: Order): string => {
    if (!order.startedAt || !order.completedAt) return '--';
    
    const startTime = new Date(order.startedAt).getTime();
    const endTime = new Date(order.completedAt).getTime();
    const diff = endTime - startTime;
    
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if order was completed fast or slow
  const isFastOrder = (order: Order): boolean => {
    if (!order.startedAt || !order.completedAt) return true;
    
    const diff = new Date(order.completedAt).getTime() - new Date(order.startedAt).getTime();
    const mins = Math.floor(diff / 60000);
    
    return mins <= order.estimatedPrepTime;
  };

  return (
    <div className="completed-orders">
      {/* Header */}
      <div className="completed-orders__header">
        <h3 className="completed-orders__title">
          <CheckCircleIcon className="completed-orders__title-icon" />
          Completed
        </h3>
        <span className="completed-orders__count">{orders.length} orders</span>
      </div>

      {/* Orders list */}
      <div className="completed-orders__list">
        {orders.slice(0, 10).map((order, index) => (
          <div key={order.id} className="completed-item">
            {/* Left side - Order info */}
            <div className="completed-item__left">
              <CheckCircleIcon className="completed-item__icon" />
              
              <span className="completed-item__order-number">
                {order.orderNumber}
              </span>
              
              <div className="completed-item__customer">
                <UserIcon className="completed-item__customer-icon" />
                <span className="completed-item__customer-name">
                  {order.customerName}
                </span>
              </div>
            </div>

            {/* Right side - Time info */}
            <div className="completed-item__right">
              <span 
                className={`completed-item__time ${
                  isFastOrder(order) 
                    ? 'completed-item__time--fast' 
                    : 'completed-item__time--slow'
                }`}
              >
                {formatPrepTime(order)}
              </span>
              <ClockIcon className="completed-item__clock-icon" />
            </div>
          </div>
        ))}

        {/* Empty state */}
        {orders.length === 0 && (
          <p className="completed-orders__empty">
            No completed orders yet
          </p>
        )}
      </div>
    </div>
  );
}

// Example usage with sample data
export default function CompletedOrdersExample() {
  const sampleOrders: Order[] = [
    {
      id: '1',
      orderNumber: '#2881',
      customerName: 'Rachel G.',
      startedAt: new Date(Date.now() - 12 * 60000),
      completedAt: new Date(),
      estimatedPrepTime: 15,
    },
    {
      id: '2',
      orderNumber: '#2879',
      customerName: 'Kevin N.',
      startedAt: new Date(Date.now() - 19 * 60000),
      completedAt: new Date(),
      estimatedPrepTime: 15,
    },
    {
      id: '3',
      orderNumber: '#2875',
      customerName: 'Sarah M.',
      startedAt: new Date(Date.now() - 10 * 60000),
      completedAt: new Date(),
      estimatedPrepTime: 15,
    },
  ];

  return <CompletedOrders orders={sampleOrders} />;
}