import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, AlertTriangle, TrendingDown, Plus, Search, 
  Filter, ArrowUpDown, Truck, DollarSign, BarChart3,
  ChevronDown, RefreshCw, Trash2, Edit2, X, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { InventoryItem, InventoryCategory, StockStatus, InventoryAlert } from '@/types/inventory';
import '../styles/InventoryPanel.scss';

interface InventoryPanelProps {
  inventory: InventoryItem[];
  alerts: InventoryAlert[];
  stats: {
    totalItems: number;
    lowStockItems: number;
    criticalItems: number;
    healthyItems: number;
    totalValue: number;
    overallCapacityPercent: number;
    byCategory: Record<string, { count: number; value: number; lowStock: number }>;
    unacknowledgedAlerts: number;
  };
  getStockStatus: (item: InventoryItem) => StockStatus;
  onUpdateStock: (itemId: string, newStock: number) => void;
  onRestockItem: (itemId: string, quantity: number) => void;
  onDeleteItem: (itemId: string) => void;
  onAcknowledgeAlert: (alertId: string) => void;
}

const categoryLabels: Record<InventoryCategory, string> = {
  proteins: '🥩 Proteins',
  vegetables: '🥬 Vegetables',
  grains: '🍚 Grains',
  sauces: '🥫 Sauces',
  dairy: '🧈 Dairy',
  spices: '🌶️ Spices',
  beverages: '🍵 Beverages',
};

type SortField = 'name' | 'stock' | 'category' | 'value';
type SortOrder = 'asc' | 'desc';

export function InventoryPanel({
  inventory,
  alerts,
  stats,
  getStockStatus,
  onUpdateStock,
  onRestockItem,
  onDeleteItem,
  onAcknowledgeAlert,
}: InventoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [restockQuantity, setRestockQuantity] = useState<number>(0);
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);

  const filteredAndSortedInventory = useMemo(() => {
    let result = [...inventory];

    if (searchQuery) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(item => item.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(item => getStockStatus(item) === statusFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'stock':
          comparison = (a.currentStock / a.maxCapacity) - (b.currentStock / b.maxCapacity);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'value':
          comparison = (a.currentStock * a.costPerUnit) - (b.currentStock * b.costPerUnit);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [inventory, searchQuery, categoryFilter, statusFilter, sortField, sortOrder, getStockStatus]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleRestock = () => {
    if (selectedItem && restockQuantity > 0) {
      onRestockItem(selectedItem.id, restockQuantity);
      setShowRestockDialog(false);
      setSelectedItem(null);
      setRestockQuantity(0);
    }
  };

  const openRestockDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setRestockQuantity(Math.min(20, item.maxCapacity - item.currentStock));
    setShowRestockDialog(true);
  };

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <div className="inventory-panel">
      {/* Stats Overview */}
      <div className="stats-grid">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="stat-card">
            <CardContent className="stat-card-content">
              <div className="stat-icon-wrapper stat-icon-primary">
                <Package className="stat-icon" />
              </div>
              <div className="stat-info">
                <p className="stat-value">{stats.totalItems}</p>
                <p className="stat-label">Total Items</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="stat-card">
            <CardContent className="stat-card-content">
              <div className="stat-icon-wrapper stat-icon-success">
                <Check className="stat-icon" />
              </div>
              <div className="stat-info">
                <p className="stat-value stat-value-success">{stats.healthyItems}</p>
                <p className="stat-label">In Stock</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="stat-card">
            <CardContent className="stat-card-content">
              <div className="stat-icon-wrapper stat-icon-warning">
                <TrendingDown className="stat-icon" />
              </div>
              <div className="stat-info">
                <p className="stat-value stat-value-warning">{stats.lowStockItems}</p>
                <p className="stat-label">Low Stock</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="stat-card">
            <CardContent className="stat-card-content">
              <div className="stat-icon-wrapper stat-icon-urgent">
                <AlertTriangle className="stat-icon" />
              </div>
              <div className="stat-info">
                <p className="stat-value stat-value-urgent">{stats.criticalItems}</p>
                <p className="stat-label">Critical</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="stat-card">
            <CardContent className="stat-card-content">
              <div className="stat-icon-wrapper stat-icon-accent">
                <DollarSign className="stat-icon" />
              </div>
              <div className="stat-info">
                <p className="stat-value">${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="stat-label">Total Value</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="stat-card">
            <CardContent className="stat-card-content">
              <div className="stat-icon-wrapper stat-icon-capacity">
                <BarChart3 className="stat-icon" />
              </div>
              <div className="stat-info">
                <p className="stat-value">{stats.overallCapacityPercent}%</p>
                <p className="stat-label">Capacity</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
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
                    <div className="alert-icon">
                      <AlertTriangle />
                    </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="alert-button"
                    onClick={() => setShowAlertsPanel(!showAlertsPanel)}
                  >
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAcknowledgeAlert(alert.id)}
                          >
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filters-row">
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as InventoryCategory | 'all')}>
              <SelectTrigger className="select-trigger">
                <Filter className="filter-icon" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(Object.keys(categoryLabels) as InventoryCategory[]).map(cat => (
                  <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StockStatus | 'all')}>
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

            <Button
              variant="outline"
              size="icon"
              onClick={() => handleSort('stock')}
              className="sort-button"
            >
              <ArrowUpDown />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      <div className="inventory-grid">
        <AnimatePresence mode="popLayout">
          {filteredAndSortedInventory.map((item, index) => {
            const status = getStockStatus(item);
            const stockPercent = Math.round((item.currentStock / item.maxCapacity) * 100);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className={`inventory-card status-${status}`}>
                  <CardContent className="inventory-card-content">
                    <div className="card-header">
                      <h3 className="item-name">{item.name}</h3>
                      <Badge className={`status-badge status-${status}`}>
                        {status === 'in-stock' && 'In Stock'}
                        {status === 'low-stock' && 'Low Stock'}
                        {status === 'critical' && 'Critical'}
                        {status === 'out-of-stock' && 'Out of Stock'}
                      </Badge>
                    </div>

                    <Badge variant="outline" className={`category-badge category-${item.category}`}>
                      {categoryLabels[item.category]}
                    </Badge>

                    <div className="card-body">
                      <div className="stock-section">
                        <div className="stock-level-header">
                          <span className="stock-level-label">Stock Level</span>
                          <span className={`stock-level-value stock-value-${status}`}>
                            {item.currentStock} / {item.maxCapacity} {item.unit}
                          </span>
                        </div>
                        <Progress 
                          value={stockPercent} 
                          className={`progress-bar progress-${status}`}
                        />
                      </div>

                      <div className="item-details">
                        <span>Min: {item.minThreshold} {item.unit}</span>
                        <span>${(item.currentStock * item.costPerUnit).toFixed(2)}</span>
                      </div>

                      {item.supplier && (
                        <div className="supplier-info">
                          <Truck className="truck-icon" />
                          <span className="supplier-name">{item.supplier}</span>
                        </div>
                      )}

                      <div className="card-actions">
                        <Button
                          className="restock-button"
                          onClick={() => openRestockDialog(item)}
                        >
                          <RefreshCw className="refresh-icon" />
                          Restock
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="delete-button"
                          onClick={() => onDeleteItem(item.id)}
                        >
                          <Trash2 className="trash-icon" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredAndSortedInventory.length === 0 && (
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

              <div className="input-group">
                <label className="input-label">Restock Quantity</label>
                <Input
                  type="number"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(Math.max(0, parseInt(e.target.value) || 0))}
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
            <Button onClick={handleRestock} disabled={restockQuantity <= 0}>
              <Check className="confirm-icon" />
              Confirm Restock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}