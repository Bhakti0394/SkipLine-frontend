// ============================================================
// src/pages/KitchenDashboard/Index.tsx
// ============================================================
//
// ARCHITECTURE CHANGE (sidebar right panel):
//
// BEFORE (broken):
//   SimulationControls
//   CapacityMeter          ← shows capacity bar + staff rows (End Shift / Activate)
//   StaffController        ← shows ChefStations (same staff again) + modals
//     └─ ChefStations      ← duplicate staff list
//
//   Result: staff rendered TWICE, activate modal owned by StaffController but
//   triggered via pendingActivateId hop through Index state, remove modal owned
//   by StaffController while validation state lives in useKitchenBoard — two
//   completely separate modal systems for the same two actions.
//
// AFTER (fixed):
//   SimulationControls
//   CapacityMeter          ← SINGLE panel: capacity bar + staff + ALL modals
//                             (activate, remove, add chef)
//
//   StaffController / ChefStations are still available for the Analytics view
//   sidebar where full chef detail is appropriate.

import { useState, useCallback, useEffect, useRef } from 'react';
import { Clock, ChefHat, CheckCircle2, Timer, TrendingUp, Zap, X } from 'lucide-react';
import { toast } from 'sonner';

import { Header }             from '../../components/KitchenDashboard/dashboard/Header';
import { StatCard }           from '../../components/KitchenDashboard/dashboard/StatCard';
import { KanbanBoard }        from '../../components/KitchenDashboard/dashboard/KanbanBoard';
import { OrderQueue }         from '../../components/KitchenDashboard/dashboard/OrderQueue';
import { CapacityMeter }      from '../../components/KitchenDashboard/dashboard/CapacityMeter';
import { TimelineSlots }      from '../../components/KitchenDashboard/dashboard/TimelineSlots';
import { AnalyticsPanel }     from '../../components/KitchenDashboard/dashboard/AnalyticsPanel';
import { StaffController }    from '../../components/KitchenDashboard/dashboard/Staffcontroller';
import { SimulationControls } from '../../components/KitchenDashboard/dashboard/SimulationControls';
import { CompletedOrders }    from '../../components/KitchenDashboard/dashboard/CompletedOrders';
import { OrderDetailsModal }  from '../../components/KitchenDashboard/dashboard/OrderDetailsModal';
import { InventoryPanel }     from '../../components/KitchenDashboard/dashboard/InventoryPanel';

import { mockTimeSlots } from '../../kitchen-data/timeSlots';
import { Order, OrderStatus } from '../../kitchen-types/order';

import { useKitchenBoard }                         from '../../kitchen-hooks/useKitchenBoard';
import { canTransition }                           from '../../kitchen-hooks/Capacityengine';
import { useInventory }                            from '../../kitchen-hooks/useInventory';
import { useNotifications }                        from '../../kitchen-hooks/useNotifications';
import { useSettings }                             from '../../kitchen-hooks/useSettings';
import { useKeyboardShortcuts, showShortcutsHelp } from '../../kitchen-hooks/useKeyboardShortcuts';

import './Index.scss';

type ViewMode = 'kanban' | 'list' | 'analytics' | 'inventory';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   'Queue',
  cooking:   'Cooking',
  ready:     'Ready',
  completed: 'Completed',
};

const BACKEND_STATUS = {
  pending:   'PENDING',
  cooking:   'COOKING',
  ready:     'READY',
  completed: 'COMPLETED',
} as const satisfies Record<OrderStatus, import('../../kitchen-hooks/Capacityengine').BackendOrderStatus>;

const TOAST_ID = 'kitchen-global';

const showToast = (
  type: 'default' | 'success' | 'error' | 'warning',
  title: string,
  description: string,
  duration = 2500,
) => {
  toast.dismiss();
  const fn =
    type === 'success' ? toast.success :
    type === 'error'   ? toast.error   :
    type === 'warning' ? toast.warning :
    toast;
  fn(title, { description, duration, id: TOAST_ID });
};

const Index = () => {
  const [viewMode,           setViewMode]           = useState<ViewMode>('kanban');
  const [selectedOrder,      setSelectedOrder]      = useState<Order | null>(null);
  const [completedPanelOpen, setCompletedPanelOpen] = useState(false);

  const pendingColumnRef = useRef<HTMLDivElement>(null);
  const cookingColumnRef = useRef<HTMLDivElement>(null);
  const readyColumnRef   = useRef<HTMLDivElement>(null);

  const scrollToColumn = useCallback((status: OrderStatus) => {
    const refMap: Partial<Record<OrderStatus, React.RefObject<HTMLDivElement>>> = {
      pending: pendingColumnRef,
      cooking: cookingColumnRef,
      ready:   readyColumnRef,
    };
    const ref = refMap[status];
    if (ref?.current) {
      setViewMode('kanban');
      requestAnimationFrame(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'center' });
      });
    }
  }, []);

  const openCompletedPanel = useCallback(() => setCompletedPanelOpen(true), []);

  // ── Notifications ──────────────────────────────────────────────────────────
const toastedOrderIds      = useRef<Set<string>>(new Set());
  const pendingNewOrders     = useRef<Order[]>([]);
  const batchToastTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks last notified status per order — prevents duplicate status notifications
  // when auto-advance and poll both trigger handleStatusChange for the same order.
  const lastNotifiedStatus   = useRef<Record<string, string>>({});

  const {
    notifications, markAsRead, markAllAsRead,
    deleteNotification, clearAll,
    notifyOrderStatus, notifyInventoryAlert,
    notifyNewOrder, notifyCapacity,
  } = useNotifications();

  const { settings, updateSettings } = useSettings();

  const flushNewOrderToasts = useCallback(() => {
    const batch = pendingNewOrders.current.splice(0);
    if (!batch.length) return;

    if (batch.length === 1) {
      const order = batch[0];
      const title =
        order.orderType === 'express'   ? '⚡ Express Order' :
        order.orderType === 'scheduled' ? '📅 Scheduled Order' :
                                          '🟢 New Order';
      showToast('default', title,
        `${order.orderNumber} · ${order.items.length} item(s) · Pickup ${order.pickupTime}`);
    } else {
      const expressCount = batch.filter(o => o.orderType === 'express').length;
      showToast('default',
        expressCount > 0 ? '⚡ New Orders' : '🟢 New Orders',
        `${batch.length} new orders added to the queue.`);
    }

    if (settings?.orderAlerts) {
      const typeRank: Record<string, number> = { express: 0, normal: 1, scheduled: 2 };
      const top = [...batch].sort(
        (a, b) => (typeRank[a.orderType ?? 'normal'] ?? 1) - (typeRank[b.orderType ?? 'normal'] ?? 1)
      )[0];
      notifyNewOrder(top);
    }
  }, [settings?.orderAlerts, notifyNewOrder]);

  // ── useKitchenBoard ────────────────────────────────────────────────────────
  const {
    orders, completedOrders, boardData, loading, error: backendError,
    counts, readyCountdowns, metrics, capacity,
    staff, allStaff, backupStaff, capacityPercent, currentCapacity, activatingChefId,
    updateOrderStatus, assignChef, addOrder, triggerBurst,
    refresh: refreshBoard,
    isSimulating, setIsSimulating, stopSimulation,
    simulationSpeed, setSimulationSpeed,
    simulationError, isSimTriggerPending,
    initiateStaffRemoval, confirmStaffRemoval, cancelStaffRemoval,
    removalValidation, removalTargetId,
    isValidatingRemoval, isConfirmingRemoval,
    activateBackupChef,
  } = useKitchenBoard(10000, useCallback((newOrders: Order[]) => {
    const fresh = newOrders.filter(o => !toastedOrderIds.current.has(o.id));
    if (!fresh.length) return;
    fresh.forEach(o => toastedOrderIds.current.add(o.id));
    pendingNewOrders.current.push(...fresh);
    if (batchToastTimer.current) clearTimeout(batchToastTimer.current);
    batchToastTimer.current = setTimeout(flushNewOrderToasts, 300);
  }, [flushNewOrderToasts]));

  useEffect(() => () => {
    if (batchToastTimer.current) clearTimeout(batchToastTimer.current);
  }, []);

  // Prune toastedOrderIds — remove IDs no longer on the active board so the
  // Set doesn't grow unbounded over a long kitchen session (hundreds of orders).
  useEffect(() => {
    const activeIds    = new Set(orders.map(o => o.id));
    const completedIds = new Set(completedOrders.map(o => o.id));
    for (const id of toastedOrderIds.current) {
      if (!activeIds.has(id) && !completedIds.has(id)) {
        toastedOrderIds.current.delete(id);
      }
    }
    // Prune lastNotifiedStatus for orders no longer on board
    for (const id of Object.keys(lastNotifiedStatus.current)) {
      if (!activeIds.has(id) && !completedIds.has(id)) {
        delete lastNotifiedStatus.current[id];
      }
    }
  }, [orders, completedOrders]);
  // ── Derived metrics ────────────────────────────────────────────────────────
  const efficiencyPercent:  number = metrics.efficiencyPercent;
  const avgCookTimeMinutes: number = metrics.avgCookTimeMinutes;

  const lateOrders = orders.filter(o =>
    o.status === 'cooking' &&
    o.elapsedMinutes != null &&
    o.estimatedPrepTime != null &&
    o.elapsedMinutes > o.estimatedPrepTime
  ).length;

  const avgDelayMinutes = (() => {
    const lateList = orders.filter(o =>
      o.status === 'cooking' &&
      o.elapsedMinutes != null &&
      o.estimatedPrepTime != null &&
      o.elapsedMinutes > o.estimatedPrepTime
    );
    if (!lateList.length) return 0;
    const totalDelay = lateList.reduce(
      (sum, o) => sum + (o.elapsedMinutes - (o.estimatedPrepTime ?? 0)), 0
    );
    return Math.round(totalDelay / lateList.length);
  })();

  const {
    inventory, alerts: inventoryAlerts, stats: inventoryStats,
    getStockStatus, updateStock, restockItem,
    consumeForOrder, deleteInventoryItem, acknowledgeAlert,
  } = useInventory();

  const stats = {
    pending:   counts.pending,
    cooking:   counts.cooking,
    ready:     counts.ready,
    completed: counts.completed,
  };

  // ── handleActivateBackupFromBanner ─────────────────────────────────────────
  const handleActivateBackupFromBanner = useCallback(async () => {
    const firstBackup = backupStaff[0];
    if (!firstBackup) { showToast('error', 'No backup staff available', ''); return; }
    try {
      await activateBackupChef(firstBackup.chefId);
      showToast('success', `${firstBackup.name} is now active`,
        'Queued orders will be assigned automatically.', 4000);
    } catch (err: any) {
      showToast('error', 'Could not activate chef', err.message ?? 'Please try again.');
    }
  }, [backupStaff, activateBackupChef]);

  // ── Capacity change notifications ──────────────────────────────────────────
  const prevCapacityRef    = useRef<{ isOverloaded: boolean; usedPercent: number } | null>(null);
  // Guard: skip the very first board load — capacity may already be high at page open.
  // Only fire toasts when a threshold is CROSSED during the session, not on initial paint.
  const capacityMounted = useRef(false);

  useEffect(() => {
    if (!boardData) return;

    const cooking     = counts.cooking;
    const pending     = counts.pending;
    const cap         = capacity.totalSlots;
    const pct         = cap > 0 ? Math.min(100, Math.round(((cooking + pending) / cap) * 100)) : 0;

    // First board load: record baseline silently, fire nothing
    if (!capacityMounted.current) {
      capacityMounted.current = true;
      prevCapacityRef.current = { isOverloaded: capacity.isOverloaded, usedPercent: pct };
      return;
    }

    const prev        = prevCapacityRef.current;
    const firstBackup = backupStaff[0];

    const prevPct          = prev?.usedPercent ?? 0;
    const crossedFull      =  capacity.isOverloaded && !prev?.isOverloaded;
    const crossedNearFull  = !capacity.isOverloaded && pct >= 80 && prevPct < 80;
    const crossedRecovered =  prev?.isOverloaded && !capacity.isOverloaded;

    if (crossedFull) {
      if (firstBackup) {
        toast.error('🔴 Kitchen Full — Activate Backup Chef', {
          id: TOAST_ID, duration: 8000,
          description: `All ${cap} slots occupied. New orders are being rejected.`,
          action: { label: `⚡ Activate ${firstBackup.name}`, onClick: handleActivateBackupFromBanner },
        });
      } else {
        toast.error('🔴 Kitchen Full — Add a Chef', {
          id: TOAST_ID, duration: 8000,
          description: `All ${cap} slots occupied. No backup staff on standby.`,
        });
      }
      notifyCapacity('full', { cooking, capacity: cap, pending, queueMax: cap * 2 });
    } else if (crossedNearFull) {
      if (firstBackup) {
        toast.warning('🟡 Kitchen Nearly Full', {
          id: TOAST_ID, duration: 6000,
          description: `${cooking + pending}/${cap} active orders. Tap to activate a backup chef.`,
          action: { label: `⚡ Activate ${firstBackup.name}`, onClick: handleActivateBackupFromBanner },
        });
      } else {
        toast.warning('🟡 Kitchen Nearly Full', {
          id: TOAST_ID, duration: 6000,
          description: `${cooking + pending}/${cap} active orders. Consider adding a chef.`,
        });
      }
      notifyCapacity('near_full', { cooking, capacity: cap, pending, queueMax: cap * 2 });
    } else if (crossedRecovered) {
      showToast('success', '🟢 Kitchen Capacity Freed',
        `Slots available again (${cooking}/${cap} cooking).`, 3000);
      notifyCapacity('recovered');
    }

    prevCapacityRef.current = { isOverloaded: capacity.isOverloaded, usedPercent: pct };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    capacity.isOverloaded,
    capacity.totalSlots,
    counts.cooking,
    counts.pending,
    handleActivateBackupFromBanner,
    notifyCapacity,
  ]);

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (
    orderId: string, status: OrderStatus, assignedTo?: string,
  ) => {
    const order = orders.find(o => o.id === orderId);

    if (order) {
     if (!canTransition(BACKEND_STATUS[order.status], BACKEND_STATUS[status])) {
        showToast('error', 'Invalid status change',
          `Cannot move from ${STATUS_LABELS[order.status]} → ${STATUS_LABELS[status]}.`);
        return;
      }

      // FIX: check both assignedTo (name) and assignedChefId — either confirms chef assigned
      if (order.status === 'cooking' && status === 'ready'
          && !order.assignedTo && !order.assignedChefId) {
        showToast('error', 'Assign a chef first',
          `Order ${order.orderNumber} needs a chef assigned before it can be marked ready.`);
        return;
      }
    }

    try {
     await updateOrderStatus(orderId, status);
      // Only notify if this is a new status for this order — deduplicates
      // auto-advance + manual clicks both calling handleStatusChange.
      if (order && settings?.orderAlerts) {
        const lastStatus = lastNotifiedStatus.current[orderId];
        if (lastStatus !== status) {
          lastNotifiedStatus.current[orderId] = status;
          notifyOrderStatus(order, status);
        }
      }
      if (status === 'cooking' && order) consumeForOrder(order);

      const messages: Partial<Record<OrderStatus, [string, string]>> = {
        cooking:   ['👨‍🍳 Now Cooking',     `Order ${order?.orderNumber ?? ''} has started cooking.`],
        ready:     ['✅ Ready for Pickup', `Order ${order?.orderNumber ?? ''} is ready for the customer!`],
        completed: ['🎉 Order Completed',  `Order ${order?.orderNumber ?? ''} has been completed.`],
      };
      const msg = messages[status];
      if (msg) {
        showToast(
          status === 'ready' ? 'success' : 'default',
          msg[0], msg[1],
          status === 'ready' ? 3000 : 2500,
        );
      }
    } catch (err: any) {
      showToast('error', 'Status update failed', err.message ?? 'Could not update order status.');
    }
  }, [updateOrderStatus, orders, consumeForOrder, notifyOrderStatus, settings?.orderAlerts]);

  // ── Other handlers ─────────────────────────────────────────────────────────
  const handleAddOrder = useCallback(() => {
    triggerBurst(1).catch(err =>
      showToast('error', 'Could not add order', err.message ?? 'Please try again.')
    );
  }, [triggerBurst]);

  const handleToggleSimulation = useCallback(() => {
    if (isSimulating) stopSimulation();
    else setIsSimulating(true);
  }, [isSimulating, stopSimulation, setIsSimulating]);

  // ── Inventory alerts ───────────────────────────────────────────────────────
  // Guard: skip initial load — only fire toasts when stock actually DROPS after mount.
  const prevStockRef         = useRef<Record<string, number>>({});
  const inventoryInitialized = useRef(false);

  useEffect(() => {
    if (!settings?.lowInventoryAlerts || inventory.length === 0) return;

    // First load: record baseline, no toasts
    if (!inventoryInitialized.current) {
      inventory.forEach(item => { prevStockRef.current[item.id] = item.currentStock; });
      inventoryInitialized.current = true;
      return;
    }

    // Only alert items whose stock actually dropped since last check
    const dropped = inventory.filter(item => {
      const prev = prevStockRef.current[item.id];
      return prev !== undefined && item.currentStock < prev;
    });

    dropped.forEach(item => {
      const status = getStockStatus(item);
      if (status === 'critical' || status === 'out-of-stock' || status === 'low-stock') {
        showToast('warning',
          `⚠️ ${status === 'out-of-stock' ? 'Out of stock' : 'Low stock'}`,
          `${item.name} is ${status.replace(/-/g, ' ')}.`, 4000);
        notifyInventoryAlert(item, status);
      }
    });

    // Update baseline for all items
    inventory.forEach(item => { prevStockRef.current[item.id] = item.currentStock; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory]);
  useKeyboardShortcuts([
    { key: 'n', description: 'Add new order',     action: handleAddOrder },
    { key: 's', description: 'Toggle simulation', action: handleToggleSimulation },
    { key: '1', description: 'Kanban view',       action: () => setViewMode('kanban') },
    { key: '2', description: 'List view',         action: () => setViewMode('list') },
    { key: '3', description: 'Analytics view',    action: () => setViewMode('analytics') },
    { key: '4', description: 'Inventory view',    action: () => setViewMode('inventory') },
    { key: '?', shift: true, description: 'Help', action: showShortcutsHelp },
  ]);

  // ── Shared render helpers ──────────────────────────────────────────────────

  const renderCapacityMeter = () => (
    <CapacityMeter
      capacity={capacity}
      staff={allStaff}
      boardData={boardData}
      onRemoveChef={initiateStaffRemoval}
      removalValidation={removalValidation}
      removalTargetId={removalTargetId}
      isValidatingRemoval={isValidatingRemoval}
      isConfirmingRemoval={isConfirmingRemoval}
      onConfirmRemoval={confirmStaffRemoval}
      onCancelRemoval={cancelStaffRemoval}
      onActivateChef={activateBackupChef}
      activatingChefId={activatingChefId}
      onChefAdded={refreshBoard}
    />
  );

  const renderSimulationControls = () => (
    <SimulationControls
      isSimulating={isSimulating}
      simulationSpeed={simulationSpeed}
      simulationError={simulationError}
      isSimTriggerPending={isSimTriggerPending}
      capacity={capacity}
      onToggleSimulation={handleToggleSimulation}
      onSetSpeed={setSimulationSpeed}
      onAddOne={() => triggerBurst(1)}
      onBurst={(count) => triggerBurst(count)}
    />
  );

  const renderStaffController = () => (
    <StaffController
      allStaff={allStaff}
      currentCapacity={currentCapacity}
      onInitiateRemoval={initiateStaffRemoval}
      onConfirmRemoval={confirmStaffRemoval}
      onCancelRemoval={cancelStaffRemoval}
      onActivateChef={activateBackupChef}
      removalValidation={removalValidation}
      removalTargetId={removalTargetId}
      isValidatingRemoval={isValidatingRemoval}
      isConfirmingRemoval={isConfirmingRemoval}
      activatingChefId={activatingChefId}
      externalActivateId={null}
      onExternalActivateHandled={() => {}}
      openAddChef={false}
      onAddChefHandled={() => {}}
      onChefAdded={refreshBoard}
    />
  );

  // ── Stat cards ─────────────────────────────────────────────────────────────
  // FIX: Pending = warning (orange) always — it's a queue waiting for action
  //      Cooking = success (green)  always — active cooking is good/in-progress
  const renderStatsCards = () => (
    <div className="stats-grid">
      <StatCard
        title="Pending"
        value={stats.pending}
        subtitle="In queue"
        icon={Clock}
        variant="warning"
        onClick={() => scrollToColumn('pending')}
        ariaLabel={`View ${stats.pending} pending orders in Queue column`}
      />
      <StatCard
        title="Cooking"
        value={stats.cooking}
        subtitle="In progress"
        icon={ChefHat}
        variant="success"
        onClick={() => scrollToColumn('cooking')}
        ariaLabel={`View ${stats.cooking} orders in Cooking column`}
      />
      <StatCard
        title="Ready"
        value={stats.ready}
        subtitle="For pickup"
        icon={CheckCircle2}
        variant="success"
        onClick={() => scrollToColumn('ready')}
        ariaLabel={`View ${stats.ready} orders ready for pickup`}
      />
      <StatCard
        title="Completed"
        value={stats.completed}
        subtitle="Today"
        icon={TrendingUp}
        variant="success"
        onClick={openCompletedPanel}
        historyHint
        ariaLabel={`View ${stats.completed} completed orders today`}
      />
      <StatCard
        title="Avg Time"
        value={avgCookTimeMinutes > 0 ? `${Math.round(avgCookTimeMinutes)}m` : '—'}
        subtitle={avgCookTimeMinutes > 0 ? 'Cook time today' : 'No data yet'}
        icon={Timer}
      />
      <StatCard
        title="Efficiency"
        value={`${Math.round(efficiencyPercent)}%`}
        subtitle={
          lateOrders > 0
            ? `${lateOrders} late · avg +${avgDelayMinutes}m delay`
            : 'On-time rate'
        }
        icon={Zap}
        variant={efficiencyPercent >= 80 ? 'success' : 'warning'}
      />
    </div>
  );

  // ── Views ──────────────────────────────────────────────────────────────────

  const renderKanbanView = () => (
    <div className="kanban-layout">
      <div className="kanban-layout__main">
        <KanbanBoard
          orders={orders}
          staff={staff}
          readyCountdowns={readyCountdowns}
          onStatusChange={handleStatusChange}
          onChefAssign={assignChef}
          columnRefs={{
            pending: pendingColumnRef,
            cooking: cookingColumnRef,
            ready:   readyColumnRef,
          }}
        />
      </div>
      <div className="kanban-layout__sidebar">
        {renderSimulationControls()}
        {renderCapacityMeter()}
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="list-layout">
      <div className="list-layout__main">
        <OrderQueue orders={orders} onStatusChange={handleStatusChange} />
      </div>
      <div className="list-layout__sidebar space-y-4">
        {renderSimulationControls()}
        {renderCapacityMeter()}
        <div className="hidden-mobile">
          <TimelineSlots slots={mockTimeSlots} />
        </div>
        <CompletedOrders orders={completedOrders} />
      </div>
    </div>
  );

  const renderAnalyticsView = () => (
    <div className="analytics-layout">
      <div className="analytics-layout__main">
        <div className="premium-panel">
          <div className="premium-panel__header">
            <h2 className="premium-panel__title">Kitchen Performance</h2>
          </div>
          <div className="premium-panel__content">
            <AnalyticsPanel
              orders={orders}
              completedOrders={completedOrders}
              efficiencyPercent={efficiencyPercent}
              avgCookTimeMinutes={avgCookTimeMinutes}
            />
          </div>
        </div>
      </div>
      <div className="analytics-layout__sidebar space-y-4">
        {renderSimulationControls()}
        {renderStaffController()}
        <CompletedOrders orders={completedOrders} />
      </div>
    </div>
  );

  const renderInventoryView = () => (
    <div className="inventory-layout">
      <InventoryPanel
        inventory={inventory}
        alerts={inventoryAlerts}
        stats={inventoryStats}
        getStockStatus={getStockStatus}
        onUpdateStock={updateStock}
        onRestockItem={restockItem}
        onDeleteItem={deleteInventoryItem}
        onAcknowledgeAlert={acknowledgeAlert}
      />
    </div>
  );

  const renderMainContent = () => {
    switch (viewMode) {
      case 'kanban':    return renderKanbanView();
      case 'list':      return renderListView();
      case 'analytics': return renderAnalyticsView();
      case 'inventory': return renderInventoryView();
      default:          return renderKanbanView();
    }
  };

  return (
    <div className="dashboard">
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        pendingCount={stats.pending}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDeleteNotification={deleteNotification}
        onClearAllNotifications={clearAll}
        settings={settings}
        onSettingsChange={updateSettings}
      />
      <div className="dashboard__stats-bar">
        <div className="dashboard__container">
          {renderStatsCards()}
        </div>
      </div>
      <main className="dashboard__main">
        <div className="dashboard__container">
          <div className="content-layout">{renderMainContent()}</div>
        </div>
      </main>

      {/* ── Completed Orders slide-in panel ── */}
      {completedPanelOpen && (
        <>
          <div
            onClick={() => setCompletedPanelOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.45)', zIndex: 40,
              backdropFilter: 'blur(2px)',
            }}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Completed Orders"
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 'min(420px, 100vw)', zIndex: 50,
              background: 'var(--color-card-bg, #1e1e2e)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
              animation: 'slideInRight 0.22s ease',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary, #f1f5f9)' }}>
                ✅ Completed Orders
              </span>
              <button
                onClick={() => setCompletedPanelOpen(false)}
                aria-label="Close completed orders panel"
                style={{
                  all: 'unset', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', padding: '0.25rem', borderRadius: '0.375rem',
                  color: 'var(--color-text-muted, #64748b)',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
              <CompletedOrders orders={completedOrders} />
            </div>
          </div>
        </>
      )}

      <OrderDetailsModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={handleStatusChange}
      />

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Index;