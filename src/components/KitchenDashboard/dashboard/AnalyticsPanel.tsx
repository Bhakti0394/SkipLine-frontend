// ============================================================
// src/components/KitchenDashboard/dashboard/AnalyticsPanel.tsx
// ============================================================
//
// CHANGES IN THIS VERSION:
//   - Removed QueuePressure   (duplicated top stat bar)
//   - Removed ChefUtil        (duplicated List view Chef Workload)
//   - Removed staff prop / StaffWorkloadDto import
//   - Peak Hours: always 24-col grid, labels every 3rd hour,
//     peak cell highlighted with outline, quiet→busy legend bar
//   - Late Orders: larger ring (80×80, r=32), stats in bordered
//     card layout with sub-label, semantic green/amber/red color

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Order } from '../../../kitchen-types/order';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import '../styles/Analyticspanel.scss';

interface AnalyticsPanelProps {
  orders:              Order[];
  completedOrders:     Order[];
  efficiencyPercent:   number;
  avgCookTimeMinutes:  number;
  throughputPerHour?:  number;  // optional — not rendered, kept for future use
  totalOrdersToday?:   number;  // optional — passed via lateOrdersCount path
  lateOrdersCount?:    number;
}

const fade = (delay = 0) => ({
  initial:    { opacity: 0, y: 10 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] as const },
});

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.min(100, Math.round((num / den) * 100));
}

// ── Peak Hour Heatmap ─────────────────────────────────────────────────────────

function PeakHours({ allOrders }: { allOrders: Order[] }) {
  const cells = useMemo(() => {
    const counts = new Array(24).fill(0);
    allOrders.forEach(o => {
      const h = new Date(o.createdAt).getHours();
      counts[h]++;
    });
    const max = Math.max(...counts, 1);
    return counts.map((c, h) => ({
      h,
      c,
      intensity: c / max,
      label: h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`,
    }));
  }, [allOrders]);

  const peakHour = cells.reduce((a, b) => (b.c > a.c ? b : a), cells[0]);

  return (
    <div className="ap__card ap__card--full">
      <div className="ap__card-head">
        <span className="ap__card-title">Peak Hours</span>
        {peakHour.c > 0 && (
          <span className="ap__badge-amber">🔥 {peakHour.label}</span>
        )}
      </div>

      <div className="ap__heatmap">
        {cells.map(cell => (
          <div
            key={cell.h}
            className={[
              'ap__heatcell',
              cell.h === peakHour.h && peakHour.c > 0 ? 'ap__heatcell--peak' : '',
            ].join(' ').trim()}
            title={`${cell.label}: ${cell.c} orders`}
            style={{
              background:
                cell.intensity === 0
                  ? 'rgba(255,255,255,0.04)'
                  : `rgba(99,102,241,${(0.15 + cell.intensity * 0.82).toFixed(2)})`,
            }}
          />
        ))}
      </div>

      {/* Hour labels — every 3rd to avoid crowding */}
      <div className="ap__heat-labels">
        {cells.map(cell => (
          <span key={cell.h} className="ap__heat-label">
            {cell.h % 3 === 0 ? cell.label : ''}
          </span>
        ))}
      </div>

      {/* Quiet → Busy legend */}
      <div className="ap__heat-legend">
        <span className="ap__heat-legend-text">Quiet</span>
        <div className="ap__heat-legend-bar" />
        <span className="ap__heat-legend-text">Busy</span>
      </div>
    </div>
  );
}

// ── Late Orders Tracker ───────────────────────────────────────────────────────

function LateTracker({
  lateCount,
  totalToday,
  orders,
}: {
  lateCount:  number;
  totalToday: number;
  orders:     Order[];
}) {
  const currentLate = orders.filter(
    o =>
      o.status === 'cooking' &&
      o.elapsedMinutes != null &&
      o.estimatedPrepTime != null &&
      o.elapsedMinutes > o.estimatedPrepTime,
  ).length;

  const latePct       = pct(lateCount, totalToday);
  const circumference = 2 * Math.PI * 32;
  const dash          = (latePct / 100) * circumference;

  const ringColor =
    latePct >= 30 ? '#ef4444' :
    latePct >= 15 ? '#f59e0b' :
                    '#10b981';

  // Badge variant
  const badgeClass =
    currentLate > 0 ? 'ap__badge-alert' :
    latePct > 0     ? 'ap__badge-amber'  :
                      'ap__badge-green';

  const badgeText =
    currentLate > 0 ? `${currentLate} active now` :
    latePct > 0     ? `${latePct}% late today`    :
                      'On time';

  return (
    <div className="ap__card ap__card--full">
      <div className="ap__card-head">
        <span className="ap__card-title">Late Orders</span>
        <span className={badgeClass}>
          {currentLate > 0 && (
            <AlertTriangle style={{ width: '0.55rem', height: '0.55rem' }} />
          )}
          {badgeText}
        </span>
      </div>

      <div className="ap__late-body">
        {/* Ring — 80×80 for better presence */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          className="ap__late-ring"
        >
          <circle
            cx="40" cy="40" r="32"
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="6"
          />
          <circle
            cx="40" cy="40" r="32"
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={circumference * 0.25}
            style={{
              filter: `drop-shadow(0 0 4px ${ringColor}66)`,
              transition: 'stroke-dasharray 0.7s ease',
            }}
          />
          <text
            x="40" y="36"
            textAnchor="middle"
            fill="#f1f5f9"
            fontSize="15"
            fontWeight="500"
            fontFamily="inherit"
          >
            {latePct}%
          </text>
          <text
            x="40" y="51"
            textAnchor="middle"
            fill="rgba(148,163,184,0.55)"
            fontSize="9"
            fontFamily="inherit"
          >
            late rate
          </text>
        </svg>

        {/* Stats grid with dividers */}
        <div className="ap__late-stats">
          <div className="ap__late-stat">
            <span className="ap__late-num" style={{ color: ringColor }}>{lateCount}</span>
            <span className="ap__late-lbl">Today</span>
            <span className="ap__late-sublbl">late orders</span>
          </div>
          <div className="ap__late-divider" />
          <div className="ap__late-stat">
            <span
              className="ap__late-num"
              style={{ color: currentLate > 0 ? '#ef4444' : 'rgba(148,163,184,0.5)' }}
            >
              {currentLate}
            </span>
            <span className="ap__late-lbl">Active now</span>
            <span className="ap__late-sublbl">overdue</span>
          </div>
          <div className="ap__late-divider" />
          <div className="ap__late-stat">
            <span className="ap__late-num" style={{ color: 'rgba(226,232,240,0.55)' }}>
              {totalToday}
            </span>
            <span className="ap__late-lbl">Total today</span>
            <span className="ap__late-sublbl">all orders</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AnalyticsPanel({
  orders,
  completedOrders,
  efficiencyPercent,
  avgCookTimeMinutes,
  throughputPerHour,
  totalOrdersToday,
  lateOrdersCount = 0,
}: AnalyticsPanelProps) {
 
// 1️⃣ All orders combined
const allOrders = useMemo(
  () => [...orders, ...completedOrders],
  [orders, completedOrders]
);

// 2️⃣ Hourly data depends on allOrders and completedOrders
const hourlyData = useMemo(() => {
  const now = new Date();
  return Array.from({ length: 8 }, (_, i) => {
    const hour = new Date(now);
    hour.setHours(now.getHours() - 7 + i, 0, 0, 0);
    const nextHour = new Date(hour);
    nextHour.setHours(hour.getHours() + 1);
    const label = hour.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true });
    const completed = completedOrders.filter(o => {
      if (!o.completedAt) return false;
      const t = new Date(o.completedAt).getTime();
      return t >= hour.getTime() && t < nextHour.getTime();
    }).length;
    const placed = allOrders.filter(o => {
      const t = new Date(o.createdAt).getTime();
      return t >= hour.getTime() && t < nextHour.getTime();
    }).length;
    return { hour: label, orders: placed, completed };
  });
}, [allOrders, completedOrders]);

  const orderTypeData = useMemo(
    () => [
      { name: 'Express',   count: allOrders.filter(o => o.orderType === 'express').length,   color: '#fb923c' },
      { name: 'Normal',    count: allOrders.filter(o => o.orderType === 'normal').length,    color: '#6366f1' },
      { name: 'Scheduled', count: allOrders.filter(o => o.orderType === 'scheduled').length, color: '#6ee7b7' },
    ],
    [allOrders],
  );

  return (
    <div className="ap">

      {/* Row 1 — Order Volume chart */}
      <motion.div className="ap__card ap__card--full" {...fade(0)}>
        <div className="ap__card-head">
          <span className="ap__card-title">Order Volume</span>
          <span className="ap__card-badge">Last 8h</span>
        </div>
        <div className="ap__area-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="og" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 9, fontFamily: 'inherit' }}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.94)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 8,
                  fontSize: 11,
                  backdropFilter: 'blur(12px)',
                }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="orders"    stroke="#6366f1" strokeWidth={1.5} fill="url(#og)" dot={false} />
              <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={1.5} fill="url(#cg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="ap__legend">
          <span className="ap__legend-item ap__legend-item--indigo">Orders placed</span>
          <span className="ap__legend-item ap__legend-item--emerald">Completed</span>
        </div>
      </motion.div>

      {/* Row 2 — Peak Hour Heatmap */}
      <motion.div className="ap__card--full" {...fade(0.06)}>
        <PeakHours allOrders={allOrders} />
      </motion.div>

      {/* Row 3 — Late Tracker */}
      <motion.div className="ap__card--full" {...fade(0.10)}>
        <LateTracker
          lateCount={lateOrdersCount}
          totalToday={totalOrdersToday ?? orders.length + completedOrders.length}
          orders={orders}
        />
      </motion.div>

      {/* Row 4 — Order Types */}
      <motion.div className="ap__card ap__card--full" {...fade(0.14)}>
        <div className="ap__card-head">
          <span className="ap__card-title">Order Types</span>
          <span className="ap__card-badge">{allOrders.length} total</span>
        </div>
        <div className="ap__bar-wrap ap__bar-wrap--tall">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={orderTypeData}
              layout="vertical"
              margin={{ top: 0, right: 32, bottom: 0, left: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                width={62}
                tick={{ fill: 'rgba(148,163,184,0.8)', fontSize: 9, fontFamily: 'inherit' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  background: 'rgba(15,23,42,0.92)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                itemStyle={{ color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                maxBarSize={16}
                label={{ position: 'right', fill: 'rgba(148,163,184,0.7)', fontSize: 9 }}
              >
                {orderTypeData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

    </div>
  );
}