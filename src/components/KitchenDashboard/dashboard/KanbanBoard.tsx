// src/components/KitchenDashboard/dashboard/KanbanBoard.tsx

import { Order, OrderStatus } from '../../../kitchen-types/order';
import { StaffWorkloadDto } from '../../../kitchen-api/kitchenApi';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AnimatePresence } from 'framer-motion';
import { Clock, ChefHat, CheckCircle2, User } from 'lucide-react';
import { OrderTimer } from './OrderTimer';
import { assignChef } from '../../../kitchen-api/kitchenApi';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/KitchenDashboard/ui/select";
import '../styles/Kanbanboard.scss';

interface KanbanBoardProps {
  orders: Order[];
  staff: StaffWorkloadDto[];
  onStatusChange: (orderId: string, status: OrderStatus, assignedTo?: string) => void;
  onChefAssigned?: () => void;
}

const columns: { status: OrderStatus; label: string; icon: React.ElementType; color: string }[] = [
  { status: 'pending', label: 'Queue',   icon: Clock,        color: 'pending' },
  { status: 'cooking', label: 'Cooking', icon: ChefHat,      color: 'cooking' },
  { status: 'ready',   label: 'Ready',   icon: CheckCircle2, color: 'ready'   },
];

export function KanbanBoard({ orders, staff, onStatusChange, onChefAssigned }: KanbanBoardProps) {

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const orderId   = result.draggableId;
    const newStatus = result.destination.droppableId as OrderStatus;
    const order     = orders.find(o => o.id === orderId);
    if (!order || order.status === newStatus) return;
    onStatusChange(orderId, newStatus);
  };

  const handleChefAssign = async (orderId: string, chefId: string) => {
    if (!chefId || chefId === '__none__') return;
    try {
      await assignChef(orderId, chefId);
      onChefAssigned?.();
    } catch (err: any) {
      console.error('[KanbanBoard] Chef assignment failed:', err.message);
    }
  };

  const getOrdersByStatus = (status: OrderStatus) =>
    orders
      .filter(o => o.status === status)
      .sort((a, b) => {
        const p: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
        return p[a.priority] - p[b.priority];
      });

  // Only show chefs not at full capacity
  const availableChefs = staff.filter(c => c.activeOrders < c.maxCapacity);

  // FIX: Find assigned chef ID from assignedTo name (backend stores name, we need ID for Select value)
  const getChefIdFromName = (name?: string): string => {
    if (!name) return '';
    return staff.find(c => c.name === name)?.chefId ?? '';
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {columns.map((column) => {
          const columnOrders = getOrdersByStatus(column.status);
          const Icon = column.icon;

          return (
            <div key={column.status} className={`kanban-column kanban-column--${column.color}`}>

              {/* Column Header */}
              <div className="kanban-column__header">
                <div className="kanban-column__title">
                  <Icon className={`kanban-column__icon kanban-column__icon--${column.status}`} />
                  <h3 className="kanban-column__label">{column.label}</h3>
                </div>
                <span className={`kanban-column__badge kanban-column__badge--${column.status}`}>
                  {columnOrders.length}
                </span>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={column.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={[
                      'kanban-column__content',
                      snapshot.isDraggingOver ? 'kanban-column__content--dragging' : '',
                    ].join(' ')}
                  >
                    <AnimatePresence>
                      {columnOrders.map((order, index) => (
                        <Draggable key={order.id} draggableId={order.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={[
                                'order-card',
                                snapshot.isDragging ? 'order-card--dragging' : '',
                                `order-card--${order.priority}`,
                              ].join(' ')}
                            >
                              {/* Order Header */}
                              <div className="order-card__header">
                                <span className="order-card__number">{order.orderNumber}</span>
                                <div className="order-card__meta">
                                  {order.priority !== 'normal' && (
                                    <span className={`order-card__priority order-card__priority--${order.priority}`}>
                                      {order.priority === 'urgent' ? '🔥' : '⚡'}
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

                              {/* ── Assign Chef — ALL columns except completed ── */}
                              {column.status !== 'completed' && !order.id.startsWith('sim-') && (
                                <div className="order-card__chef-row">
                                  <Select
                                    // FIX: value must be chefId (not name) to match SelectItem values
                                    value={getChefIdFromName(order.assignedTo)}
                                    onValueChange={(chefId) => handleChefAssign(order.id, chefId)}
                                  >
                                    <SelectTrigger className="order-card__chef-select">
                                      <SelectValue
                                        placeholder={
                                          order.assignedTo ? order.assignedTo : 'Assign chef…'
                                        }
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableChefs.length === 0 ? (
                                        <SelectItem value="__none__" disabled>
                                          All chefs at capacity
                                        </SelectItem>
                                      ) : (
                                        availableChefs.map((chef) => (
                                          <SelectItem key={chef.chefId} value={chef.chefId}>
                                            <span className="chef-option">
                                              <span
                                                className={[
                                                  'chef-option__status',
                                                  chef.loadPercent >= 80
                                                    ? 'chef-option__status--busy'
                                                    : chef.loadPercent >= 50
                                                    ? 'chef-option__status--half'
                                                    : 'chef-option__status--available',
                                                ].join(' ')}
                                              />
                                              {chef.name}
                                              <span className="chef-option__load">
                                                {chef.activeOrders}/{chef.maxCapacity}
                                              </span>
                                            </span>
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                            </div>
                          )}
                        </Draggable>
                      ))}
                    </AnimatePresence>
                    {provided.placeholder}

                    {columnOrders.length === 0 && (
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
  );
}