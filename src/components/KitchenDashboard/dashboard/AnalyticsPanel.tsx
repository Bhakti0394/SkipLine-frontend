// ============================================================
// AnalyticsPanel.tsx — File 1 look (motion animations) + File 2 backend
// ============================================================
//
// KEPT from File 1:  motion animations on KPI cards, chart cards, fadeUp helper
// KEPT from File 2:  real props (efficiencyPercent, avgCookTimeMinutes),
//                    useMemo for all derived data, real hourly chart from
//                    actual orders, real throughput from last-hour completions,
//                    correct import path, no Math.random()

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Order } from '../../../kitchen-types/order';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { TrendingUp, Clock, Zap, Target } from 'lucide-react';
import '../styles/Analyticspanel.scss';

interface AnalyticsPanelProps {
  orders:             Order[];
  completedOrders:    Order[];
  // Real metrics from backend — no Math.random()
  efficiencyPercent:  number;
  avgCookTimeMinutes: number;
}

// File 1: motion helper
const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 12 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export function AnalyticsPanel({
  orders,
  completedOrders,
  efficiencyPercent,
  avgCookTimeMinutes,
}: AnalyticsPanelProps) {
  const now = new Date();

  // File 2: real hourly data derived from actual orders (no random baseline)
  const hourlyData = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const hour = new Date(now);
      hour.setHours(now.getHours() - 7 + i, 0, 0, 0);
      const nextHour = new Date(hour);
      nextHour.setHours(hour.getHours() + 1);

      const hourLabel = hour.toLocaleTimeString('en-US', { hour: 'numeric' });

      const completed = completedOrders.filter(o => {
        if (!o.completedAt) return false;
        const t = new Date(o.completedAt).getTime();
        return t >= hour.getTime() && t < nextHour.getTime();
      }).length;

      const placed = [...orders, ...completedOrders].filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= hour.getTime() && t < nextHour.getTime();
      }).length;

      return { hour: hourLabel, orders: placed, completed };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedOrders.length, orders.length]);

  // File 2: memoised status / priority breakdowns
  const statusData = useMemo(() => [
    { name: 'Pending', value: orders.filter(o => o.status === 'pending').length, color: '#64748b' },
    { name: 'Cooking', value: orders.filter(o => o.status === 'cooking').length, color: '#f59e0b' },
    { name: 'Ready',   value: orders.filter(o => o.status === 'ready').length,   color: '#10b981' },
  ], [orders]);

  const priorityData = useMemo(() => [
    { name: 'Urgent', count: orders.filter(o => o.priority === 'urgent').length, color: '#ef4444' },
    { name: 'High',   count: orders.filter(o => o.priority === 'high').length,   color: '#f97316' },
    { name: 'Normal', count: orders.filter(o => o.priority === 'normal').length, color: '#6366f1' },
  ], [orders]);

  const totalActive = orders.filter(o => o.status !== 'completed').length;

  // File 2: real throughput — completions in the last 60 minutes
  const lastHourCompleted = useMemo(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return completedOrders.filter(o =>
      o.completedAt && new Date(o.completedAt).getTime() > oneHourAgo
    ).length;
  }, [completedOrders]);

  const stats = [
    { icon: TrendingUp, label: 'Throughput', value: lastHourCompleted,                                                              unit: '/hr',                          cls: 'primary' },
    { icon: Clock,      label: 'Avg Time',   value: avgCookTimeMinutes > 0 ? Math.round(avgCookTimeMinutes) : '—',                  unit: avgCookTimeMinutes > 0 ? 'min' : '', cls: 'amber'   },
    { icon: Zap,        label: 'Efficiency', value: Math.round(efficiencyPercent),                                                  unit: '%',                            cls: 'emerald' },
    { icon: Target,     label: 'Active',     value: totalActive,                                                                    unit: '',                             cls: 'red'     },
  ];

  return (
    <div className="ap">

      {/* ── KPI Row — File 1: motion.div with staggered fadeUp ── */}
      <div className="ap__kpi-grid">
        {stats.map((s, i) => (
          <motion.div key={s.label} className={`ap__kpi ap__kpi--${s.cls}`} {...fadeUp(i * 0.07)}>
            <div className="ap__kpi-top">
              <s.icon className="ap__kpi-icon" />
              <span className="ap__kpi-label">{s.label}</span>
            </div>
            <div className="ap__kpi-val">
              {s.value}<span className="ap__kpi-unit">{s.unit}</span>
            </div>
            <div className="ap__kpi-glow" />
          </motion.div>
        ))}
      </div>

      {/* ── Area Chart — File 1: motion.div wrapper ── */}
      <motion.div className="ap__card" {...fadeUp(0.18)}>
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
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="hour"
                axisLine={false} tickLine={false}
                tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 9, fontFamily: 'inherit' }}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background:     'rgba(15,23,42,0.92)',
                  border:         '1px solid rgba(99,102,241,0.3)',
                  borderRadius:   8,
                  fontSize:       11,
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
          <span className="ap__legend-item ap__legend-item--indigo">Orders</span>
          <span className="ap__legend-item ap__legend-item--emerald">Completed</span>
        </div>
      </motion.div>

      {/* ── Bottom Row: Pie + Bar ── */}
      <div className="ap__bottom-row">

        {/* Status Donut — File 1: motion.div wrapper */}
        <motion.div className="ap__card ap__card--half" {...fadeUp(0.26)}>
          <div className="ap__card-head">
            <span className="ap__card-title">Status</span>
          </div>
          <div className="ap__donut-wrap">
            <div className="ap__donut-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData} cx="50%" cy="50%"
                    innerRadius="55%" outerRadius="80%"
                    dataKey="value" strokeWidth={0} paddingAngle={3}
                  >
                    {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="ap__donut-center">
                <span className="ap__donut-total">{statusData.reduce((a, b) => a + b.value, 0)}</span>
                <span className="ap__donut-sub">total</span>
              </div>
            </div>
            <div className="ap__dot-legend">
              {statusData.map(s => (
                <div key={s.name} className="ap__dot-row">
                  <span className="ap__dot" style={{ background: s.color }} />
                  <span className="ap__dot-name">{s.name}</span>
                  <span className="ap__dot-val">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Priority Bar — File 1: motion.div wrapper */}
        <motion.div className="ap__card ap__card--half" {...fadeUp(0.32)}>
          <div className="ap__card-head">
            <span className="ap__card-title">Priority</span>
          </div>
          <div className="ap__bar-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priorityData} layout="vertical"
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="name"
                  axisLine={false} tickLine={false} width={42}
                  tick={{ fill: 'rgba(148,163,184,0.8)', fontSize: 9, fontFamily: 'inherit' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    background:   'rgba(15,23,42,0.92)',
                    border:       '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize:     11,
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={14}>
                  {priorityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>
    </div>
  );
}