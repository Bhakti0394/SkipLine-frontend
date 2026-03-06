// ============================================================
// CompletedOrders.tsx — File 1 look + File 2 backend
// ============================================================
//
// KEPT from File 1: SVG icon components with multiline formatting,
//                   JSX structure (left/right layout), slice(0,10),
//                   empty state, default export example removed (clean)
//
// KEPT from File 2: Order type from '../../../kitchen-types/order'
//                   (replaces local inline interface — single source of truth),
//                   formatElapsed() uses order.elapsedMinutes from backend
//                   (no frontend date arithmetic on startedAt/completedAt),
//                   isFast() uses order.elapsedMinutes vs estimatedPrepTime

import '../styles/Completedorders.scss';
import { Order } from '../../../kitchen-types/order';

// ─── Icons (File 1 multiline style) ──────────────────────────────────────────

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
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
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
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
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
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// ─── Helpers (File 2) ─────────────────────────────────────────────────────────

/**
 * Formats elapsedMinutes (from backend) as "m:ss".
 * No frontend date arithmetic — backend computes elapsed from cookingStartedAt.
 */
function formatElapsed(minutes: number): string {
  if (minutes <= 0) return '--';
  const m = Math.floor(minutes);
  const s = 0; // backend provides whole minutes only
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Order is "fast" if completed within estimated prep time.
 * Both values come from backend — no local calculation.
 */
function isFast(order: Order): boolean {
  return order.elapsedMinutes <= order.estimatedPrepTime;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CompletedOrdersProps {
  orders: Order[];
}

// ─── Component (File 1 JSX structure) ────────────────────────────────────────

export function CompletedOrders({ orders }: CompletedOrdersProps) {
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
        {orders.slice(0, 10).map((order) => (
          <div key={order.id} className="completed-item">

            {/* Left side — order info */}
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

            {/* Right side — elapsed time from backend */}
            <div className="completed-item__right">
              <span
                className={`completed-item__time ${
                  isFast(order)
                    ? 'completed-item__time--fast'
                    : 'completed-item__time--slow'
                }`}
              >
                {formatElapsed(order.elapsedMinutes)}
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

export default CompletedOrders;