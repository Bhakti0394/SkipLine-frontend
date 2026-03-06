// ============================================================
// KanbanBoard.tsx
// ============================================================

import React, { useMemo, useCallback, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DragStart } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChefHat, CheckCircle2, User, AlertCircle, X } from 'lucide-react';
import { OrderTimer } from './OrderTimer';
import { Order, OrderStatus } from '../../../kitchen-types/order';
import { StaffWorkloadDto } from '../../../kitchen-api/kitchenApi';
import { canTransition, BackendOrderStatus } from '../../../kitchen-hooks/Capacityengine';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import '../styles/Kanbanboard.scss';

// ─── Status transition helpers ────────────────────────────────────────────────

const toBackend: Record<OrderStatus, BackendOrderStatus> = {
  pending:   'PENDING',
  cooking:   'COOKING',
  ready:     'READY',
  completed: 'COMPLETED',
};

function isValidDrop(from: OrderStatus, to: OrderStatus): boolean {
  return canTransition(toBackend[from], toBackend[to]);
}

// ─── Column definitions ───────────────────────────────────────────────────────

const columns: { status: OrderStatus; label: string; icon: React.ElementType; color: string }[] = [
  { status: 'pending', label: 'Queue',   icon: Clock,        color: 'pending' },
  { status: 'cooking', label: 'Cooking', icon: ChefHat,      color: 'cooking' },
  { status: 'ready',   label: 'Ready',   icon: CheckCircle2, color: 'ready'   },
];

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2 };

// ─── Props ────────────────────────────────────────────────────────────────────

export interface KanbanBoardProps {
  orders:           Order[];
  staff:            StaffWorkloadDto[];
  readyCountdowns?: Record<string, number>;
  onStatusChange:   (orderId: string, status: OrderStatus) => Promise<void>;
  onChefAssign:     (orderId: string, chefId: string) => Promise<void>;
}

// ─── DragErrorBanner ─────────────────────────────────────────────────────────

const DragErrorBanner = React.memo(function DragErrorBanner({
  message, onDismiss,
}: { message: string; onDismiss: () => void }) {
  return (
    <motion.div
      className="kanban-error-banner"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
    >
      <AlertCircle className="kanban-error-banner__icon" />
      <span className="kanban-error-banner__message">{message}</span>
      <button className="kanban-error-banner__dismiss" onClick={onDismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </motion.div>
  );
});

// ─── KanbanBoard ─────────────────────────────────────────────────────────────

export const KanbanBoard = React.memo(function KanbanBoard({
  orders,
  staff,
  readyCountdowns = {},
  onStatusChange,
  onChefAssign,
}: KanbanBoardProps) {

  const safeOrders = orders ?? [];

  const [pendingOrderIds, setPendingOrderIds] = useState<Set<string>>(new Set());
  const setOrderPending = useCallback((id: string, val: boolean) => {
    setPendingOrderIds(prev => {
      const next = new Set(prev);
      val ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  const [dragError, setDragError]         = useState<string | null>(null);
  const dismissError                      = useCallback(() => setDragError(null), []);
  const [draggingOrder, setDraggingOrder] = useState<Order | null>(null);

  // Only show chefs that are on shift — full chefs are kept so the select
  // can show them as disabled (user sees capacity state, not a confusing empty list)
  const assignableChefs = useMemo(
    () => (staff ?? []).filter(s => s.onShift),
    [staff],
  );

  const ordersByStatus = useMemo(() => {
    const map: Record<OrderStatus, Order[]> = {
      pending: [], cooking: [], ready: [], completed: [],
    };
    for (const order of safeOrders) {
      if (map[order.status] !== undefined) map[order.status].push(order);
    }
    for (const status of Object.keys(map) as OrderStatus[]) {
      map[status].sort((a, b) => {
        const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (p !== 0) return p;
        const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (t !== 0) return t;
        return a.pickupTime.localeCompare(b.pickupTime);
      });
    }
    return map;
  }, [safeOrders]);

  const handleDragStart = useCallback((start: DragStart) => {
    setDragError(null);
    setDraggingOrder(safeOrders.find(o => o.id === start.draggableId) ?? null);
  }, [safeOrders]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    setDraggingOrder(null);
    if (!result.destination) return;

    const orderId   = result.draggableId;
    const newStatus = result.destination.droppableId as OrderStatus;
    const order     = safeOrders.find(o => o.id === orderId);

    if (!order || order.status === newStatus) return;

    // FIX: removed the chef-required guard here.
    // The backend's transition() auto-assigns a chef when moving to COOKING,
    // so we just call onStatusChange and let the backend handle it.
    if (!isValidDrop(order.status, newStatus)) return;

    setOrderPending(orderId, true);
    try {
      await onStatusChange(orderId, newStatus);
    } catch (err: any) {
      setDragError(err?.message ?? 'Status update failed. Please try again.');
    } finally {
      setOrderPending(orderId, false);
    }
  }, [safeOrders, onStatusChange, setOrderPending]);

  return (
    <div className="kanban-wrapper">

      <AnimatePresence>
        {dragError && (
          <DragErrorBanner key="drag-error" message={dragError} onDismiss={dismissError} />
        )}
      </AnimatePresence>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {columns.map((column) => {
            const columnOrders  = ordersByStatus[column.status];
            const Icon          = column.icon;
            const isDragActive  = draggingOrder !== null;
            const isSource      = isDragActive && draggingOrder!.status === column.status;
            const isValidTarget = isDragActive && !isSource && isValidDrop(draggingOrder!.status, column.status);
            const isInvalid     = isDragActive && !isSource && !isValidTarget;

            return (
              <div
                key={column.status}
                className={[
                  'kanban-column',
                  `kanban-column--${column.color}`,
                  isSource      ? 'kanban-column--source'         : '',
                  isValidTarget ? 'kanban-column--valid-target'   : '',
                  isInvalid     ? 'kanban-column--invalid-target' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="kanban-column__header">
                  <div className="kanban-column__title">
                    <Icon className={`kanban-column__icon kanban-column__icon--${column.status}`} />
                    <h3 className="kanban-column__label">{column.label}</h3>
                  </div>
                  <span className={`kanban-column__badge kanban-column__badge--${column.status}`}>
                    {columnOrders.length}
                  </span>
                </div>

                <Droppable droppableId={column.status} isDropDisabled={isDragActive && isInvalid}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={[
                        'kanban-column__content',
                        snapshot.isDraggingOver ? 'kanban-column__content--dragging'     : '',
                        isInvalid              ? 'kanban-column__content--drop-invalid' : '',
                        isValidTarget          ? 'kanban-column__content--drop-valid'   : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <AnimatePresence>
                        {columnOrders.map((order, index) => {
                          const isPending       = pendingOrderIds.has(order.id);
                          const countdown       = readyCountdowns[order.id];
                          const countdownUrgent = countdown !== undefined && countdown <= 5;

                          const nextStatusMap: Partial<Record<OrderStatus, OrderStatus>> = {
                            cooking: 'ready',
                            ready:   'completed',
                          };
                          const actionLabelMap: Partial<Record<OrderStatus, string>> = {
                            cooking: 'Mark Ready',
                            ready:   'Complete',
                          };
                          const nextStatus  = nextStatusMap[order.status];
                          const actionLabel = actionLabelMap[order.status];

                          const handleAction = async () => {
                            if (!nextStatus) return;
                            setOrderPending(order.id, true);
                            try { await onStatusChange(order.id, nextStatus); }
                            catch (err) { console.error('[KanbanBoard] Status change failed:', err); }
                            finally { setOrderPending(order.id, false); }
                          };

                          const handleChefChange = async (value: string) => {
                            if (!value || value === '__none__') return;
                            setOrderPending(order.id, true);
                            try { await onChefAssign(order.id, value); }
                            catch (err) { console.error('[KanbanBoard] Chef assign failed:', err); }
                            finally { setOrderPending(order.id, false); }
                          };

                          return (
                            <Draggable
                              key={order.id}
                              draggableId={order.id}
                              index={index}
                              isDragDisabled={isPending}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={[
                                    'order-card',
                                    snapshot.isDragging ? 'order-card--dragging'    : '',
                                    `order-card--${order.priority}`,
                                    isPending           ? 'order-card--pending-api' : '',
                                  ].filter(Boolean).join(' ')}
                                >
                                  {/* Header */}
                                  <div className="order-card__header">
                                    <span className="order-card__number">{order.orderNumber}</span>
                                    <div className="order-card__meta">
                                      {order.priority !== 'normal' && (
                                        <span className={`order-card__priority order-card__priority--${order.priority}`}>
                                          {order.priority === 'urgent' ? '🔥' : '⚡'}
                                        </span>
                                      )}
                                      {order.status === 'ready' && countdown !== undefined && (
                                        <span
                                          className={[
                                            'order-card__countdown',
                                            countdownUrgent ? 'order-card__countdown--urgent' : '',
                                          ].filter(Boolean).join(' ')}
                                          title="Auto-completes when timer reaches 0"
                                        >
                                          ✓ {countdown}s
                                        </span>
                                      )}
                                      <OrderTimer order={order} compact />
                                    </div>
                                  </div>

                                  {/* Customer */}
                                  <div className="order-card__customer">
                                    <User className="order-card__customer-icon" />
                                    <span className="order-card__customer-name">{order.customerName}</span>
                                    <span className="order-card__separator">•</span>
                                    <Clock className="order-card__time-icon" />
                                    <span className="order-card__time">{order.pickupTime}</span>
                                  </div>

                                  {/* Items */}
                                  <div className="order-card__items">
                                    {order.items.slice(0, 2).map((item) => (
                                      <div key={item.id} className="order-card__item">
                                        <span className="order-card__item-quantity">{item.quantity}×</span>
                                        <span className="order-card__item-name">{item.name}</span>
                                      </div>
                                    ))}
                                    {order.items.length > 2 && (
                                      <span className="order-card__items-more">
                                        +{order.items.length - 2} more
                                      </span>
                                    )}
                                  </div>

                                  {/* Queue column: chef assign select */}
                                  {column.status === 'pending' && (
                                    <div className="order-card__chef-row">
                                      <Select
                                        value={order.assignedChefId ?? ''}
                                        onValueChange={handleChefChange}
                                        disabled={isPending}
                                      >
                                        <SelectTrigger className="order-card__chef-select">
                                          <SelectValue placeholder={order.assignedTo ?? 'Assign chef…'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {assignableChefs.length === 0 ? (
                                            <SelectItem value="__none__" disabled>No staff on shift</SelectItem>
                                          ) : (
                                            assignableChefs.map((chef) => {
                                              const isFull = chef.activeOrders >= chef.maxCapacity;
                                              return (
                                                <SelectItem key={chef.chefId} value={chef.chefId} disabled={isFull}>
                                                  <span className={`chef-option${isFull ? ' chef-option--full' : ''}`}>
                                                    <span className={`chef-option__status chef-option__status--${chef.status}`} />
                                                    {chef.name}
                                                    {isFull && <span className="chef-option__full-label">(Full)</span>}
                                                    <span className={`chef-option__load${isFull ? ' chef-option__load--full' : ''}`}>
                                                      {chef.activeOrders}/{chef.maxCapacity}
                                                    </span>
                                                  </span>
                                                </SelectItem>
                                              );
                                            })
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  {/* Cooking column:
                                      - chef assigned → read-only badge (normal flow)
                                      - no chef assigned → select (auto-assign failed fallback) */}
                                  {column.status === 'cooking' && (
                                    order.assignedChefId || order.assignedTo ? (
                                      <div className="order-card__chef-badge">
                                        <span className="order-card__chef-badge-dot" />
                                        <span className="order-card__chef-badge-name">
                                          {order.assignedTo ?? order.assignedChefId}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="order-card__chef-row">
                                        <Select
                                          value=""
                                          onValueChange={handleChefChange}
                                          disabled={isPending}
                                        >
                                          <SelectTrigger className="order-card__chef-select">
                                            <SelectValue placeholder="Assign chef…" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {assignableChefs.length === 0 ? (
                                              <SelectItem value="__none__" disabled>No staff on shift</SelectItem>
                                            ) : (
                                              assignableChefs.map((chef) => {
                                                const isFull = chef.activeOrders >= chef.maxCapacity;
                                                return (
                                                  <SelectItem key={chef.chefId} value={chef.chefId} disabled={isFull}>
                                                    <span className={`chef-option${isFull ? ' chef-option--full' : ''}`}>
                                                      <span className={`chef-option__status chef-option__status--${chef.status}`} />
                                                      {chef.name}
                                                      {isFull && <span className="chef-option__full-label">(Full)</span>}
                                                      <span className={`chef-option__load${isFull ? ' chef-option__load--full' : ''}`}>
                                                        {chef.activeOrders}/{chef.maxCapacity}
                                                      </span>
                                                    </span>
                                                  </SelectItem>
                                                );
                                              })
                                            )}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )
                                  )}

                                  {/* Action footer */}
                                  {nextStatus && actionLabel && (
                                    <div className="order-card__footer">
                                      <button
                                        className={`order-card__action order-card__action--${order.status}`}
                                        onClick={handleAction}
                                        disabled={isPending}
                                      >
                                        {isPending ? 'Updating…' : actionLabel}
                                      </button>
                                    </div>
                                  )}

                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                      </AnimatePresence>
                      {provided.placeholder}

                      {columnOrders.length === 0 && !snapshot.isDraggingOver && (
                        <div className="kanban-column__empty">No orders</div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
});