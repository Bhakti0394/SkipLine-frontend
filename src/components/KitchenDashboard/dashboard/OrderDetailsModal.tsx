import React from 'react';
import { Order } from '@/types/order';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { OrderTimer } from './OrderTimer';
import { Clock, User, ChefHat, CheckCircle2, Flame, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import '../styles/Orderdetailsmodal.scss';

interface OrderDetailsModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, status: Order['status']) => void;
}

const statusFlow: Order['status'][] = ['pending', 'cooking', 'ready', 'completed'];

export function OrderDetailsModal({ 
  order, 
  open, 
  onClose, 
  onStatusChange 
}: OrderDetailsModalProps) {
  if (!order) return null;

  const currentStatusIndex = statusFlow.indexOf(order.status);
  const nextStatus = statusFlow[currentStatusIndex + 1];

  const priorityConfig = {
    urgent: { 
      label: 'Urgent', 
      icon: Flame, 
      className: 'urgent' 
    },
    high: { 
      label: 'High Priority', 
      icon: AlertTriangle, 
      className: 'high' 
    },
    normal: { 
      label: 'Normal', 
      icon: null, 
      className: 'normal' 
    },
  };

  const priority = priorityConfig[order.priority];

  const getStatusIconClass = (status: string, index: number) => {
    const isActive = index <= currentStatusIndex;
    const isCurrent = status === order.status;
    
    let className = 'status-icon';
    className += isActive ? ' active' : ' inactive';
    className += isCurrent ? ' current' : '';
    
    return className;
  };

  const getActionButtonClass = (status: string) => {
    let className = 'action-btn';
    
    if (status === 'pending') {
      className += ' status-pending';
    } else if (status === 'cooking') {
      className += ' status-cooking';
    } else if (status === 'ready') {
      className += ' status-ready';
    }
    
    return className;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="order-details-modal">
        <DialogHeader className="modal-header">
          <DialogTitle className="modal-title">
            <span className="order-number">{order.orderNumber}</span>
            <span className={`priority-badge ${priority.className}`}>
              {priority.icon && <priority.icon />}
              {priority.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="modal-content">
          {/* Customer Info */}
          <div className="customer-info">
            <div className="info-item">
              <User />
              <span className="info-value">{order.customerName}</span>
            </div>
            <div className="info-item">
              <Clock />
              Pickup: <span className="info-value">{order.pickupTime}</span>
            </div>
          </div>

          {/* Timer */}
          <div className="timer-section">
            <OrderTimer order={order} />
          </div>

          {/* Status Progress */}
          <div className="status-progress">
            {statusFlow.slice(0, -1).map((status, index) => {
              const isActive = index <= currentStatusIndex;
              const isCurrent = status === order.status;
              
              return (
                <div key={status} className="status-step">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                    }}
                    className={getStatusIconClass(status, index)}
                  >
                    {status === 'pending' && <Clock />}
                    {status === 'cooking' && <ChefHat />}
                    {status === 'ready' && <CheckCircle2 />}
                  </motion.div>
                  {index < 2 && (
                    <div 
                      className={`status-connector ${
                        index < currentStatusIndex ? 'active' : 'inactive'
                      }`} 
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Items */}
          <div className="items-section">
            <h4>Order Items</h4>
            <div className="items-list">
              {order.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="order-item"
                >
                  <div className="item-content">
                    <span className="item-quantity">{item.quantity}×</span>
                    <div className="item-details">
                      <p>{item.name}</p>
                      {item.notes && (
                        <p className="item-notes">📝 {item.notes}</p>
                      )}
                    </div>
                  </div>
                  <span className="prep-time">{item.prepTime}m</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {nextStatus && (
            <div className="modal-actions">
              <button
                className="close-btn"
                onClick={onClose}
              >
                Close
              </button>
              <button
                className={getActionButtonClass(order.status)}
                onClick={() => {
                  onStatusChange(order.id, nextStatus);
                  onClose();
                }}
              >
                {order.status === 'pending' && '🍳 Start Cooking'}
                {order.status === 'cooking' && '✅ Mark Ready'}
                {order.status === 'ready' && '🎉 Complete'}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}