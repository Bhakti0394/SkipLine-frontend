import { useState, useCallback, ReactNode, memo, useMemo, useEffect, useRef } from 'react';
import { Order } from '../../../kitchen-types/order';
import '../styles/Completedorders.scss';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(v: Date | string | undefined | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v as string);
  return isFinite(d.getTime()) ? d : null;
}

function getElapsed(o: Order): number {
  // prefer backend-computed elapsedMinutes (cook time only, excludes queue wait)
  const v = Number(o.elapsedMinutes);
  if (isFinite(v) && v > 0) return v;
  // fallback: derive from cookingStartedAt → completedAt only (not createdAt)
  const start = toDate((o as any).startedAt);
  const end   = toDate(o.completedAt);
  if (start && end) {
    const ms = end.getTime() - start.getTime();
    if (ms > 0 && ms < 24 * 60 * 60 * 1000) return ms / 60_000;
  }
  return 0;
}

function fmtMin(m: number) {
  if (!m || m <= 0) return '--';
  const mins = Math.floor(m);
  const secs = Math.round((m - mins) * 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function fmtTime(d: Date | null) {
  if (!d) return '--';
  try { return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return '--'; }
}

function calcMetrics(orders: Order[]) {
  const n = orders.length;
  if (!n) return { total: 0, avgTime: '—', onTime: '—', items: 0 };
  const elapsedArr = orders.map(getElapsed);
  const timed  = elapsedArr.filter(e => e > 0);
  const avg    = timed.length ? timed.reduce((s, e) => s + e, 0) / timed.length : 0;
  const fast   = orders.filter((o, i) =>
    elapsedArr[i] > 0 && o.estimatedPrepTime > 0 && elapsedArr[i] <= o.estimatedPrepTime
  ).length;
  const items  = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0);
  return {
    total:   n,
    avgTime: avg > 0 ? `${avg.toFixed(1)}m` : '—',
    onTime:  `${Math.round((fast / n) * 100)}%`,
    items,
  };
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const S = ({ s = 14, ch }: { s?: number; ch: ReactNode }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ch}</svg>
);
const ICheck  = ({ s }: { s?: number }) => <S s={s} ch={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M9 11l3 3L22 4"/></>}/>;
const IClock  = ({ s }: { s?: number }) => <S s={s} ch={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}/>;
const ISearch = ({ s }: { s?: number }) => <S s={s} ch={<><circle cx="11" cy="11" r="6"/><path d="M21 21l-4.35-4.35"/></>}/>;
const ITrend  = ({ s }: { s?: number }) => <S s={s} ch={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>}/>;
const IHash   = ({ s }: { s?: number }) => <S s={s} ch={<><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></>}/>;
const IUser   = ({ s }: { s?: number }) => <S s={s} ch={<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>}/>;
const IList   = ({ s }: { s?: number }) => <S s={s} ch={<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>}/>;
const IChev   = ({ open }: { open: boolean }) => (
  <S s={11} ch={<polyline points="9 18 15 12 9 6"
    style={{ transform: open ? 'rotate(90deg)' : 'none', transformOrigin: 'center', transition: 'transform .18s' }}/>}/>
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function Kpi({ label, val, icon, color }: { label: string; val: string | number; icon: ReactNode; color: string }) {
  return (
    <div className="co-kpi">
      <div className={`co-kpi__icon co-kpi__icon--${color}`}>{icon}</div>
      <span className={`co-kpi__val co-kpi__val--${color}`}>{val}</span>
      <span className="co-kpi__label">{label}</span>
    </div>
  );
}

// ─── Order Row ────────────────────────────────────────────────────────────────
function OrderRow({ order, open, onToggle }: { order: Order; open: boolean; onToggle: () => void }) {
  const elapsed  = getElapsed(order);
  const isOnTime = elapsed > 0 && order.estimatedPrepTime > 0 && elapsed <= order.estimatedPrepTime;
  const c        = isOnTime ? 'green' : 'amber';
  const doneAt   = toDate(order.completedAt);
  const chef     = order.assignedTo ?? '—';
  const itemStr  = order.items.map(i => i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name).join(' · ');

  return (
    <div
      className={`co-row${open ? ' co-row--open' : ''}`}
      onClick={onToggle} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onToggle()}
    >
      <div className="co-row__main">
        <span className={`co-row__dot co-row__dot--${c}`} />
        <span className="co-row__num">{order.orderNumber}</span>
        <span className={`co-badge co-badge--${order.orderType === 'express' ? 'amber' : order.orderType === 'scheduled' ? 'green' : 'blue'}`}>
          {order.orderType}
        </span>
        <span className="co-row__chef">{chef}</span>
        <span className={`co-row__time co-row__time--${c}`}>{fmtMin(elapsed)}</span>
        <span className="co-row__at">{fmtTime(doneAt)}</span>
        <span className="co-row__chev"><IChev open={open} /></span>
      </div>

      {open && (
        <div className="co-row__detail">
          {([
            [<IUser s={10}/>,  'Chef',  chef],
            [<IList s={10}/>,  'Items', itemStr || '—'],
            [<IClock s={10}/>, 'Cook',
              <span>
                <span className={`co-row__dt--${c}`}>{fmtMin(elapsed)}</span>
                <span className="co-row__est"> / est {order.estimatedPrepTime}m</span>
                <span className={`co-row__badge co-row__badge--${c}`}>{isOnTime ? '✓ On time' : '⚠ Late'}</span>
              </span>
            ],
          ] as [ReactNode, string, ReactNode][]).map(([icon, label, val]) => (
            <div key={label as string} className="co-row__drow">
              <span className="co-row__dicon">{icon}</span>
              <span className="co-row__dlabel">{label}</span>
              <span className="co-row__dval">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type SortKey = 'recent' | 'fastest' | 'slowest';

export const CompletedOrders = memo(function CompletedOrders({ orders }: { orders: Order[] }) {
 const [search,         setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort,           setSort]           = useState<SortKey>('recent');
  const [filter,         setFilter]         = useState('All');
  const [openId,         setOpenId]         = useState<string | null>(null);

  // Debounce search input — avoids O(n×m) scan on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(id);
  }, [search]);
 const toggle = useCallback((id: string) => setOpenId(p => p === id ? null : id), []);

const { types, list, m } = useMemo(() => {
    const types = ['All', ...Array.from(new Set(orders.map(o => o.orderType))).sort()];

    let list = [...orders]
      .sort((a, b) => (toDate(b.completedAt)?.getTime() ?? 0) - (toDate(a.completedAt)?.getTime() ?? 0))
      .filter(o => filter === 'All' || o.orderType === filter)
      .filter(o => {
        const q = debouncedSearch.toLowerCase();
        if (!q) return true;
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          (o.assignedTo ?? '').toLowerCase().includes(q) ||
          o.items.some(i => i.name.toLowerCase().includes(q))
        );
      });

    if (sort === 'fastest') list.sort((a, b) => getElapsed(a) - getElapsed(b));
    if (sort === 'slowest') list.sort((a, b) => getElapsed(b) - getElapsed(a));

    return { types, list, m: calcMetrics(list) };
  }, [orders, filter, debouncedSearch, sort]);

  const prevLengthRef = useRef(orders.length);
  useEffect(() => {
    const prevLen = prevLengthRef.current;
    prevLengthRef.current = orders.length;
    if (orders.length < prevLen) {
      setOpenId(prev => {
        if (prev === null) return null;
        // Check against `orders` (full list) — order still exists in dataset.
        const stillInOrders = orders.some(o => o.id === prev);
        if (!stillInOrders) return null;
        // Also check against `list` (filtered/searched view) — if the open row
        // is filtered out, clear it so stale expanded data is never shown when
        // the filter is removed and the row re-appears with potentially changed data.
        // list is declared above this effect — always in scope, always current.
        const stillInList = list.some(o => o.id === prev);
        return stillInList ? prev : null;
      });
    }
  }, [orders, list]); return (
    <div className="co-panel">

      {/* Header */}
      <div className="co-panel__header">
        <div className="co-panel__hl">
          <div className="co-panel__hicon"><ICheck s={15} /></div>
          <div>
            <p className="co-panel__title">Completed Orders</p>
            <p className="co-panel__sub">Kitchen history · live</p>
          </div>
        </div>
        <div className="co-panel__hr">
          <span className="co-panel__dot" />
          <span className="co-panel__count">{orders.length}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="co-panel__kpis">
        <Kpi label="Total"    val={m.total}   icon={<ICheck s={12}/>} color="green"  />
        <div className="co-panel__div" />
        <Kpi label="Avg Cook" val={m.avgTime} icon={<IClock s={12}/>} color="indigo" />
        <div className="co-panel__div" />
        <Kpi label="On Time"  val={m.onTime}  icon={<ITrend s={12}/>} color="amber"  />
        <div className="co-panel__div" />
        <Kpi label="Items"    val={m.items}   icon={<IHash  s={12}/>} color="purple" />
      </div>

      {/* Controls */}
      <div className="co-panel__controls">
        <label className="co-panel__search">
          <span className="co-panel__search-ic"><ISearch s={12} /></span>
          <input
            className="co-panel__search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order, chef, item…"
          />
        </label>
        <select className="co-panel__sort" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
          <option value="recent">Recent</option>
          <option value="fastest">Fastest</option>
          <option value="slowest">Slowest</option>
        </select>
      </div>

      {/* Filter pills */}
      <div className="co-panel__pills">
        {types.map(t => (
          <button key={t}
            className={`co-panel__pill${filter === t ? ' co-panel__pill--on' : ''}`}
            onClick={() => setFilter(t)}>
            {t}
          </button>
        ))}
        <span className="co-panel__rc">{list.length} result{list.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Col headers */}
      <div className="co-panel__cols">
        <span className="co-panel__col-num">Order</span>
        <span>Type</span>
        <span className="co-panel__col-chef">Chef</span>
        <span className="co-panel__col-time">Time</span>
        <span className="co-panel__col-at">Done</span>
      </div>

      {/* Rows — NO internal scroll, parent container scrolls */}
      <div className="co-panel__rows">
        {list.length === 0 ? (
          <div className="co-panel__empty">
            <ICheck s={20} />
            <p>{orders.length === 0 ? 'No completed orders yet' : 'Nothing matches'}</p>
          </div>
        ) : list.map(o => (
          <OrderRow key={o.id} order={o} open={openId === o.id} onToggle={() => toggle(o.id)} />
        ))}
      </div>

    </div>
  );
});

export default CompletedOrders;