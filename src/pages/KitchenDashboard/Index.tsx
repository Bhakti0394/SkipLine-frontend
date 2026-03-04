import { useState, useCallback, useEffect } from 'react';
import { Clock, ChefHat, CheckCircle2, Timer, TrendingUp, Zap } from 'lucide-react';
import { toast } from 'sonner';

// Components
import { Header }             from '../../components/KitchenDashboard/dashboard/Header';
import { StatCard }           from '../../components/KitchenDashboard/dashboard/StatCard';
import { KanbanBoard }        from '../../components/KitchenDashboard/dashboard/KanbanBoard';
import { OrderQueue }         from '../../components/KitchenDashboard/dashboard/OrderQueue';
import { CapacityMeter }      from '../../components/KitchenDashboard/dashboard/CapacityMeter';
import { TimelineSlots }      from '../../components/KitchenDashboard/dashboard/TimelineSlots';
import { AnalyticsPanel }     from '../../components/KitchenDashboard/dashboard/AnalyticsPanel';
import { StaffController }    from '../../components/KitchenDashboard/dashboard/StaffController';
import { SimulationControls } from '../../components/KitchenDashboard/dashboard/SimulationControls';
import { CompletedOrders }    from '../../components/KitchenDashboard/dashboard/CompletedOrders';
import { OrderDetailsModal }  from '../../components/KitchenDashboard/dashboard/OrderDetailsModal';
import { InventoryPanel }     from '../../components/KitchenDashboard/dashboard/InventoryPanel';

// Data & Types
import { mockTimeSlots } from '../../kitchen-data/mockOrders';
import { Order, OrderStatus } from '../../kitchen-types/order';

// Hooks
import { useKitchenBoard }     from '../../kitchen-hooks/useKitchenBoard';
import { useInventory }        from '../../kitchen-hooks/useInventory';
import { useNotifications }    from '../../kitchen-hooks/useNotifications';
import { useSettings }         from '../../kitchen-hooks/useSettings';
import { useKeyboardShortcuts, showShortcutsHelp } from '../../kitchen-hooks/useKeyboardShortcuts';

import './Index.scss';

type ViewMode = 'kanban' | 'list' | 'analytics' | 'inventory';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['cooking'],
  cooking:   ['ready'],
  ready:     ['completed'],
  completed: [],
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Queue', cooking: 'Cooking', ready: 'Ready', completed: 'Completed',
};

const Index = () => {
  const [viewMode, setViewMode]           = useState<ViewMode>('kanban');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const {
    notifications, markAsRead, markAllAsRead,
    deleteNotification, clearAll,
    notifyOrderStatus, notifyInventoryAlert,
  } = useNotifications();

  // ── useKitchenBoard ───────────────────────────────────────────────────────
  const {
    orders, completedOrders, boardData, loading, error: backendError,

    // Safe metrics object — use metrics.X, never boardData?.metrics.X directly
    metrics,

    // Staff
    staff,
    allStaff,
    backupStaff,
    backupStaffCount,
    capacityPercent,

    // Order actions
    updateOrderStatus, assignChef, addOrder,
    refresh: refreshBoard,

    // Simulation
    isSimulating, setIsSimulating,
    simulationSpeed, setSimulationSpeed,

    // Staff removal
    initiateStaffRemoval, confirmStaffRemoval, cancelStaffRemoval,
    removalValidation, removalTargetId, isValidatingRemoval, isConfirmingRemoval,

    // Chef activation
    activateBackupChef, activatingChefId,
  } = useKitchenBoard(10000);

  // ── Derive values that were wrongly destructured before ──────────────────
  // These were previously destructured from useKitchenBoard() directly but
  // the hook never returned them — causing undefined in the UI.

  const efficiencyPercent: number  = metrics.efficiencyPercent;        // fixes "undefined%"
  const avgCookTimeMinutes: number = metrics.avgCookTimeMinutes;        // fixes "—"
  const capacityPct: number        = metrics.capacityUtilizationPercent; // alias

  // Derived from live order counts + staff capacity
  const pendingCount  = orders.filter(o => o.status === 'pending').length;
  const cookingCount  = orders.filter(o => o.status === 'cooking').length;

  // Total active cooking slots = sum of maxCapacity for onShift staff
  const totalSlots    = staff.reduce((sum, s) => sum + s.maxCapacity, 0);
  const freeSlots     = Math.max(0, totalSlots - cookingCount);
  const isOverloaded  = capacityPercent > 100;
  const isAtCapacity  = capacityPercent >= 100;

  // Queue pressure tier
  const queuePressure: 'none' | 'low' | 'medium' | 'high' | 'critical' =
    pendingCount === 0          ? 'none'     :
    pendingCount <= 2           ? 'low'      :
    pendingCount <= 5           ? 'medium'   :
    pendingCount <= 10          ? 'high'     : 'critical';

  // Late orders = cooking orders past their estimated prep time
  const lateOrders    = orders.filter(o =>
    o.status === 'cooking' &&
    o.startedAt &&
    (Date.now() - new Date(o.startedAt).getTime()) / 60000 > (o.estimatedPrepTime ?? 999)
  ).length;

  const avgDelayMinutes = 0; // computed server-side; use 0 until backend sends it

  const {
    inventory, alerts: inventoryAlerts, stats: inventoryStats,
    getStockStatus, updateStock, restockItem,
    consumeForOrder, deleteInventoryItem, acknowledgeAlert,
  } = useInventory();

  const { settings, updateSettings } = useSettings();

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = {
    pending:   pendingCount,
    cooking:   cookingCount,
    ready:     orders.filter(o => o.status === 'ready').length,
    completed: completedOrders.length,
  };

  // ── Status change ─────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (
    orderId: string, status: OrderStatus, assignedTo?: string,
  ) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const allowed = ALLOWED_TRANSITIONS[order.status];
      if (!allowed.includes(status)) {
        toast.error('Invalid status change', {
          description: `Cannot move from ${STATUS_LABELS[order.status]} → ${STATUS_LABELS[status]}.`,
          duration: 5000,
        });
        return;
      }
    }
    try {
      await updateOrderStatus(orderId, status);
      if (order && settings?.orderAlerts) notifyOrderStatus(order, status);
      if (status === 'cooking' && order) consumeForOrder(order);
    } catch (err: any) {
      toast.error('Status update failed', {
        description: err.message ?? 'Could not update order status.',
        duration: 5000,
      });
    }
  }, [updateOrderStatus, orders, consumeForOrder, notifyOrderStatus, settings?.orderAlerts]);

  const handleAddOrder         = useCallback(() => { addOrder(); }, [addOrder]);
  const handleToggleSimulation = useCallback(() => { setIsSimulating(!isSimulating); }, [isSimulating, setIsSimulating]);

  // ── Activate first available backup chef (banner button handler) ──────────
  const handleActivateBackupFromBanner = useCallback(async () => {
    const firstBackup = backupStaff[0];
    if (!firstBackup) {
      toast.error('No backup staff available');
      return;
    }
    try {
      await activateBackupChef(firstBackup.chefId);
      toast.success(`${firstBackup.name} is now active`, {
        description: 'Queued orders will be assigned automatically.',
        duration: 4000,
      });
    } catch (err: any) {
      toast.error('Could not activate chef', {
        description: err.message ?? 'Please try again.',
        duration: 5000,
      });
    }
  }, [backupStaff, activateBackupChef]);

  // ── Inventory alerts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!settings?.lowInventoryAlerts) return;
    inventory.forEach(item => {
      const status = getStockStatus(item);
      if (status === 'critical' || status === 'out-of-stock' || status === 'low-stock') {
        notifyInventoryAlert(item, status);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory.map(i => i.currentStock).join(',')]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useKeyboardShortcuts([
    { key: 'n',  description: 'Add new order',     action: handleAddOrder },
    { key: 's',  description: 'Toggle simulation', action: handleToggleSimulation },
    { key: '1',  description: 'Kanban view',       action: () => setViewMode('kanban') },
    { key: '2',  description: 'List view',         action: () => setViewMode('list') },
    { key: '3',  description: 'Analytics view',    action: () => setViewMode('analytics') },
    { key: '4',  description: 'Inventory view',    action: () => setViewMode('inventory') },
    { key: '?',  shift: true, description: 'Help', action: showShortcutsHelp },
  ]);

  // ── Shared StaffController ────────────────────────────────────────────────
  const renderStaffController = () => (
    <StaffController
      allStaff={allStaff}
      capacityPercent={capacityPercent}
      onInitiateRemoval={initiateStaffRemoval}
      onConfirmRemoval={confirmStaffRemoval}
      onCancelRemoval={cancelStaffRemoval}
      onActivateChef={activateBackupChef}
      removalValidation={removalValidation}
      removalTargetId={removalTargetId}
      isValidating={isValidatingRemoval}
      isConfirming={isConfirmingRemoval}
      activatingChefId={activatingChefId}
    />
  );

  // ── Sub-renders ───────────────────────────────────────────────────────────

  const renderStatsCards = () => (
    <div className="stats-grid">
      <StatCard
        title="Pending"
        value={stats.pending}
        subtitle="In queue"
        icon={Clock}
        variant={stats.pending > 5 ? 'warning' : 'default'}
      />
      <StatCard
        title="Cooking"
        value={stats.cooking}
        subtitle="In progress"
        icon={ChefHat}
        variant="primary"
      />
      <StatCard
        title="Ready"
        value={stats.ready}
        subtitle="For pickup"
        icon={CheckCircle2}
        variant="success"
      />
      <StatCard
        title="Completed"
        value={stats.completed}
        subtitle="Today"
        icon={TrendingUp}
      />
      <StatCard
        title="Avg Time"
        value={avgCookTimeMinutes > 0 ? `${Math.round(avgCookTimeMinutes)}m` : '—'}
        subtitle="Last hour"
        icon={Timer}
        trend={{ value: 8, isPositive: true }}
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

  const renderSimulationControls = () => (
    <SimulationControls
      isSimulating={isSimulating}
      setIsSimulating={setIsSimulating}
      speed={simulationSpeed}
      setSpeed={setSimulationSpeed}
      onAddOrder={handleAddOrder}
      backendError={backendError}
    />
  );

  const renderKanbanView = () => (
    <div className="kanban-layout">
      <div className="kanban-layout__main">
        <KanbanBoard
          orders={orders}
          staff={staff}
          onStatusChange={handleStatusChange}
          onChefAssigned={refreshBoard}
          capacityPercent={capacityPercent}
          backupStaffCount={backupStaffCount}
          onActivateBackup={handleActivateBackupFromBanner}
        />
      </div>
      <div className="kanban-layout__sidebar">
        {renderSimulationControls()}
        <div className="sidebar-grid">
          <CapacityMeter
            percentage={capacityPercent}
            queuedOrders={stats.pending}
            backupStaffCount={backupStaffCount}
            freeSlots={freeSlots}
            isOverloaded={isOverloaded}
            queuePressure={queuePressure}
          />
          {renderStaffController()}
        </div>
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
        <CapacityMeter
          percentage={capacityPercent}
          queuedOrders={stats.pending}
          backupStaffCount={backupStaffCount}
          freeSlots={freeSlots}
          isOverloaded={isOverloaded}
          queuePressure={queuePressure}
        />
        <div className="hidden-mobile"><TimelineSlots slots={mockTimeSlots} /></div>
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
            <AnalyticsPanel orders={orders} completedOrders={completedOrders} />
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
        inventory={inventory} alerts={inventoryAlerts} stats={inventoryStats}
        getStockStatus={getStockStatus} onUpdateStock={updateStock}
        onRestockItem={restockItem} onDeleteItem={deleteInventoryItem}
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
        viewMode={viewMode} setViewMode={setViewMode}
        pendingCount={stats.pending}
        notifications={notifications}
        onMarkAsRead={markAsRead} onMarkAllAsRead={markAllAsRead}
        onDeleteNotification={deleteNotification} onClearAllNotifications={clearAll}
        settings={settings} onSettingsChange={updateSettings}
      />
      <main className="dashboard__main">
        <div className="dashboard__container">
          {renderStatsCards()}
          <div className="content-layout">{renderMainContent()}</div>
        </div>
      </main>
      <OrderDetailsModal
        order={selectedOrder} open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default Index;