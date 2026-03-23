// ============================================================
// src/components/KitchenDashboard/dashboard/InventoryPanel.tsx
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, AlertTriangle, TrendingDown, Search,
  Filter, ArrowUpDown, Truck, DollarSign, BarChart3,
  ChevronDown, RefreshCw, Trash2, X, Check, Clock,
  AlertCircle, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

// FIX: was '@/types/inventory' which doesn't exist — corrected to actual path
import { InventoryItem, InventoryCategory, StockStatus, InventoryAlert } from '../../../kitchen-types/inventory';

import '../styles/InventoryPanel.scss';

interface InventoryPanelProps {
  inventory:        InventoryItem[];
  alerts:           InventoryAlert[];
  stats: {
    totalItems:              number;
    lowStockItems:           number;
    criticalItems:           number;
    healthyItems:            number;
    totalValue:              number;
    overallCapacityPercent:  number;
    byCategory:              Record<string, { count: number; value: number; lowStock: number }>;
    unacknowledgedAlerts:    number;
  };
  loading:           boolean;
  error?:            string | null;
  getStockStatus:    (item: InventoryItem) => StockStatus;
  onUpdateStock:     (itemId: string, newStock: number) => Promise<void> | void;
  onRestockItem:     (itemId: string, quantity: number) => Promise<void> | void;
  onDeleteItem:      (itemId: string) => Promise<void> | void;
  onAcknowledgeAlert:(alertId: string) => void;
  refresh?:          () => void;
}

const categoryLabels: Record<InventoryCategory, string> = {
  proteins:   '🥩 Proteins',
  vegetables: '🥬 Vegetables',
  grains:     '🌾 Grains',
  sauces:     '🥫 Sauces',
  dairy:      '🧈 Dairy',
  spices:     '🌶️ Spices',
  beverages:  '🍵 Beverages',
};

type SortField = 'name' | 'stock' | 'category' | 'value';
type SortOrder = 'asc' | 'desc';

// ── Loading skeleton card ─────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="inventory-card inventory-card--skeleton">
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--badge" />
      <div className="skeleton-line skeleton-line--bar" />
      <div className="skeleton-line skeleton-line--details" />
      <div className="skeleton-line skeleton-line--button" />
    </div>
  );
}

// ── Format last restocked ─────────────────────────────────────────────────────

function formatRestocked(date: Date): string {
  const now     = new Date();
  const diffMs  = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMs / 3_600_000);
  const diffD   = Math.floor(diffMs / 86_400_000);
  if (diffMin < 2)  return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24)   return `${diffH}h ago`;
  if (diffD === 1)  return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Main component ────────────────────────────────────────────────────────────

export function InventoryPanel({
  inventory, alerts, stats,
  loading, error,
  getStockStatus,
  onUpdateStock, onRestockItem, onDeleteItem, onAcknowledgeAlert,
  refresh,
}: InventoryPanelProps) {
  const [searchQuery,       setSearchQuery]       = useState('');
  const [categoryFilter,    setCategoryFilter]    = useState<InventoryCategory | 'all'>('all');
  const [statusFilter,      setStatusFilter]      = useState<StockStatus | 'all'>('all');
  const [sortField,         setSortField]         = useState<SortField>('name');
  const [sortOrder,         setSortOrder]         = useState<SortOrder>('asc');
  const [selectedItem,      setSelectedItem]      = useState<InventoryItem | null>(null);
  const [restockQuantity,   setRestockQuantity]   = useState<number>(0);
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [showAlertsPanel,   setShowAlertsPanel]   = useState(false);
  const [restockingId,      setRestockingId]      = useState<string | null>(null);
  const [deletingId,        setDeletingId]        = useState<string | null>(null);
  const [confirmDeleteId,   setConfirmDeleteId]   = useState<string | null>(null);

  const filteredAndSortedInventory = useMemo(() => {
    let result = [...inventory];
    if (searchQuery) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (categoryFilter !== 'all') result = result.filter(i => i.category === categoryFilter);
    if (statusFilter   !== 'all') result = result.filter(i => getStockStatus(i) === statusFilter);

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':     cmp = a.name.localeCompare(b.name); break;
        case 'stock':    cmp = (a.currentStock / a.maxCapacity) - (b.currentStock / b.maxCapacity); break;
        case 'category': cmp = a.category.localeCompare(b.category); break;
        case 'value':    cmp = (a.currentStock * a.costPerUnit) - (b.currentStock * b.costPerUnit); break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [inventory, searchQuery, categoryFilter, statusFilter, sortField, sortOrder, getStockStatus]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(s => s === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const openRestockDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setRestockQuantity(Math.min(20, item.maxCapacity - item.currentStock));
    setShowRestockDialog(true);
  };

  const handleRestock = async () => {
    if (!selectedItem || restockQuantity <= 0) return;
    setRestockingId(selectedItem.id);
    try {
      await onRestockItem(selectedItem.id, restockQuantity);
      setShowRestockDialog(false);
      setSelectedItem(null);
      setRestockQuantity(0);
    } finally {
      setRestockingId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    setDeletingId(itemId);
    try {
      await onDeleteItem(itemId);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);

  // ── Error state ───────────────────────────────────────────────────────────
  if (error && !loading && inventory.length === 0) {
    return (
      <div className="inventory-panel">
        <div className="inv-error-state">
          <AlertCircle className="inv-error-icon" />
          <p className="inv-error-title">Could not load inventory</p>
          <p className="inv-error-msg">{error}</p>
          {refresh && (
            <Button className="inv-error-retry" onClick={refresh}>
              <RefreshCw style={{ width: 14, height: 14, marginRight: 6 }} />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-panel">

      {/* Stats Overview */}
      <div className="stats-grid">
        {[
          { icon: Package,      cls: 'primary',  val: stats.totalItems,   label: 'Total Items', valCls: '' },
          { icon: Check,        cls: 'success',  val: stats.healthyItems, label: 'In Stock',    valCls: 'stat-value-success' },
          { icon: TrendingDown, cls: 'warning',  val: stats.lowStockItems,label: 'Low Stock',   valCls: 'stat-value-warning' },
          { icon: AlertTriangle,cls: 'urgent',   val: stats.criticalItems,label: 'Critical',    valCls: 'stat-value-urgent' },
          { icon: DollarSign,   cls: 'accent',   val: `$${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, label: 'Total Value', valCls: '' },
          { icon: BarChart3,    cls: 'capacity', val: `${stats.overallCapacityPercent}%`, label: 'Capacity', valCls: '' },
        ].map(({ icon: Icon, cls, val, label, valCls }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="stat-card">
              <CardContent className="stat-card-content">
                <div className={`stat-icon-wrapper stat-icon-${cls}`}>
                  <Icon className="stat-icon" />
                </div>
                <div className="stat-info">
                  <p className={`stat-value ${valCls}`}>{val}</p>
                  <p className="stat-label">{label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alerts Banner */}
      <AnimatePresence>
        {unacknowledgedAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="alert-banner">
              <CardContent className="alert-banner-content">
                <div className="alert-banner-inner">
                  <div className="alert-banner-left">
                    <div className="alert-icon"><AlertTriangle /></div>
                    <div>
                      <p className="alert-title">
                        {unacknowledgedAlerts.length} Active Alert{unacknowledgedAlerts.length > 1 ? 's' : ''}
                      </p>
                      <p className="alert-message">
                        {unacknowledgedAlerts[0]?.message}
                        {unacknowledgedAlerts.length > 1 && ` (+${unacknowledgedAlerts.length - 1} more)`}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="alert-button"
                    onClick={() => setShowAlertsPanel(v => !v)}>
                    {showAlertsPanel ? 'Hide' : 'View All'}
                    <ChevronDown className={`chevron-icon ${showAlertsPanel ? 'rotate' : ''}`} />
                  </Button>
                </div>
                <AnimatePresence>
                  {showAlertsPanel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="alerts-list"
                    >
                      {unacknowledgedAlerts.map(alert => (
                        <div key={alert.id} className="alert-item">
                          <span>{alert.message}</span>
                          <Button variant="ghost" size="sm" onClick={() => onAcknowledgeAlert(alert.id)}>
                            <Check className="check-icon" />
                          </Button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters and Search */}
      <Card className="filter-card">
        <CardContent className="filter-card-content">
          <div className="search-wrapper">
            <Search className="search-icon" />
            <Input
              placeholder="Search inventory..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
          <div className="filters-row">
            <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as InventoryCategory | 'all')}>
              <SelectTrigger className="select-trigger">
                <Filter className="filter-icon" />
                <SelectValue placeholder="All..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All...</SelectItem>
                {(Object.keys(categoryLabels) as InventoryCategory[]).map(cat => (
                  <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StockStatus | 'all')}>
              <SelectTrigger className="select-trigger-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => handleSort('stock')} className="sort-button">
              <ArrowUpDown />
            </Button>

            {refresh && (
              <Button variant="outline" size="icon" onClick={refresh} className="sort-button" title="Refresh inventory">
                <RefreshCw style={{ width: 14, height: 14 }} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      <div className="inventory-grid">

        {/* Loading skeletons */}
        {loading && inventory.length === 0 && (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        )}

        <AnimatePresence mode="popLayout">
          {filteredAndSortedInventory.map((item, index) => {
            const status       = getStockStatus(item);
            const stockPct     = Math.round((item.currentStock / item.maxCapacity) * 100);
            const isDeleting   = deletingId  === item.id;
            const isRestocking = restockingId === item.id;
            const confirmDel   = confirmDeleteId === item.id;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: isDeleting ? 0.4 : 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className={`inventory-card status-${status}`}>
                  <CardContent className="inventory-card-content">

                    {/* Header */}
                    <div className="card-header">
                      <h3 className="item-name">{item.name}</h3>
                      <Badge className={`status-badge status-${status}`}>
                        {status === 'in-stock'     && 'In Stock'}
                        {status === 'low-stock'    && 'Low Stock'}
                        {status === 'critical'     && 'Critical'}
                        {status === 'out-of-stock' && 'Out of Stock'}
                      </Badge>
                    </div>

                    <Badge variant="outline" className={`category-badge category-${item.category}`}>
                      {categoryLabels[item.category]}
                    </Badge>

                    <div className="card-body">
                      {/* Stock bar */}
                      <div className="stock-section">
                        <div className="stock-level-header">
                          <span className="stock-level-label">Stock Level</span>
                          <span className={`stock-level-value stock-value-${status}`}>
                            {item.currentStock} / {item.maxCapacity} {item.unit}
                          </span>
                        </div>
                        <Progress value={stockPct} className={`progress-bar progress-${status}`} />
                      </div>

                      {/* Details row */}
                      <div className="item-details">
                        <span>Min: {item.minThreshold} {item.unit}</span>
                        <span>${(item.currentStock * item.costPerUnit).toFixed(2)}</span>
                      </div>

                      {/* Last restocked */}
                      <div className="restock-meta">
                        <Clock className="restock-meta__icon" />
                        <span>Restocked {formatRestocked(item.lastRestocked)}</span>
                      </div>

                      {/* Supplier */}
                      {item.supplier && (
                        <div className="supplier-info">
                          <Truck className="truck-icon" />
                          <span className="supplier-name">{item.supplier}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="card-actions">
                        {confirmDel ? (
                          <>
                            <Button
                              className="confirm-delete-button"
                              onClick={() => handleDelete(item.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting
                                ? <Loader2 className="spin-icon" />
                                : <Trash2 style={{ width: 14, height: 14, marginRight: 4 }} />
                              }
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="delete-button"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              <X style={{ width: 15, height: 15 }} />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              className="restock-button"
                              onClick={() => openRestockDialog(item)}
                              disabled={isRestocking || item.currentStock >= item.maxCapacity}
                            >
                              {isRestocking
                                ? <Loader2 className="spin-icon" />
                                : <RefreshCw className="refresh-icon" />
                              }
                              Restock
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="delete-button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="trash-icon" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {!loading && filteredAndSortedInventory.length === 0 && (
        <div className="empty-state">
          <Package className="empty-icon" />
          <p className="empty-text">No inventory items found</p>
        </div>
      )}

      {/* Restock Dialog */}
      <Dialog open={showRestockDialog} onOpenChange={setShowRestockDialog}>
        <DialogContent className="dialog-content">
          <DialogHeader>
            <DialogTitle className="dialog-title">
              <RefreshCw className="dialog-icon" />
              Restock {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="dialog-body">
              <div className="dialog-row">
                <span className="dialog-label">Current Stock</span>
                <span>{selectedItem.currentStock} {selectedItem.unit}</span>
              </div>
              <div className="dialog-row">
                <span className="dialog-label">Max Capacity</span>
                <span>{selectedItem.maxCapacity} {selectedItem.unit}</span>
              </div>
              <div className="dialog-row">
                <span className="dialog-label">Cost per Unit</span>
                <span>${selectedItem.costPerUnit.toFixed(2)}</span>
              </div>
              <div className="dialog-row">
                <span className="dialog-label">Last Restocked</span>
                <span>{formatRestocked(selectedItem.lastRestocked)}</span>
              </div>

              <div className="input-group">
                <label className="input-label">Restock Quantity</label>
                <Input
                  type="number"
                  value={restockQuantity}
                  onChange={e => setRestockQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  max={selectedItem.maxCapacity - selectedItem.currentStock}
                  className="quantity-input"
                />
                <p className="input-hint">
                  Max: {selectedItem.maxCapacity - selectedItem.currentStock} {selectedItem.unit}
                </p>
              </div>

              <div className="cost-summary">
                <div className="cost-summary-row">
                  <span>Estimated Cost</span>
                  <span className="cost-value">
                    ${(restockQuantity * selectedItem.costPerUnit).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestockDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRestock}
              disabled={restockQuantity <= 0 || restockingId !== null}
            >
              {restockingId ? <Loader2 className="spin-icon" /> : <Check className="confirm-icon" />}
              Confirm Restock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}