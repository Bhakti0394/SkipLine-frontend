import { useState, useCallback, useMemo, useEffect } from 'react';
import { InventoryItem, StockStatus, InventoryAlert } from '../kitchen-types/inventory';
import { initialInventory, menuIngredients } from '../kitchen-data/inventoryData';
import { Order } from '../kitchen-types/order';

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [alerts,    setAlerts]    = useState<InventoryAlert[]>([]);

  const getStockStatus = useCallback((item: InventoryItem): StockStatus => {
    if (item.currentStock <= 0)                          return 'out-of-stock';
    if (item.currentStock <= item.criticalThreshold)     return 'critical';
    if (item.currentStock <= item.minThreshold)          return 'low-stock';
    return 'in-stock';
  }, []);

  const generateAlerts = useCallback((items: InventoryItem[]) => {
    const newAlerts: InventoryAlert[] = [];
    const now = new Date();

    items.forEach(item => {
      const status = getStockStatus(item);

      if (status === 'critical' || status === 'out-of-stock') {
        newAlerts.push({
          id: `alert-${item.id}-critical`,
          itemId: item.id,
          type: 'critical',
          message: `${item.name} is critically low (${item.currentStock} ${item.unit} remaining)`,
          createdAt: now,
          acknowledged: false,
        });
      } else if (status === 'low-stock') {
        newAlerts.push({
          id: `alert-${item.id}-low`,
          itemId: item.id,
          type: 'low-stock',
          message: `${item.name} is running low (${item.currentStock} ${item.unit} remaining)`,
          createdAt: now,
          acknowledged: false,
        });
      }

      // Check for expiring items
      if (item.expiryDate) {
        const daysUntilExpiry = Math.ceil(
          (item.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry <= 0) {
          newAlerts.push({
            id: `alert-${item.id}-expired`,
            itemId: item.id,
            type: 'expired',
            message: `${item.name} has expired!`,
            createdAt: now,
            acknowledged: false,
          });
        } else if (daysUntilExpiry <= 3) {
          newAlerts.push({
            id: `alert-${item.id}-expiring`,
            itemId: item.id,
            type: 'expiring-soon',
            message: `${item.name} expires in ${daysUntilExpiry} day(s)`,
            createdAt: now,
            acknowledged: false,
          });
        }
      }
    });

    setAlerts(newAlerts);
  }, [getStockStatus]);

  // ── Seed alerts on first mount so the bell count is accurate immediately ──
  // This does NOT trigger any toast — Index.tsx's inventoryInitialized guard
  // handles the toast side-effect and skips it on the first render.
  useEffect(() => {
    generateAlerts(initialInventory);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  const updateStock = useCallback((itemId: string, newStock: number) => {
    setInventory(prev => {
      const updated = prev.map(item =>
        item.id === itemId
          ? { ...item, currentStock: Math.max(0, Math.min(newStock, item.maxCapacity)) }
          : item
      );
      generateAlerts(updated);
      return updated;
    });
  }, [generateAlerts]);

  const restockItem = useCallback((itemId: string, quantity: number) => {
    setInventory(prev => {
      const updated = prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              currentStock: Math.min(item.currentStock + quantity, item.maxCapacity),
              lastRestocked: new Date(),
            }
          : item
      );
      generateAlerts(updated);
      return updated;
    });
  }, [generateAlerts]);

  const consumeForOrder = useCallback((order: Order) => {
    setInventory(prev => {
      let updated = [...prev];

      order.items.forEach(orderItem => {
        const menuRecipe = menuIngredients.find(m => m.menuItemId === orderItem.id);
        if (menuRecipe) {
          menuRecipe.ingredients.forEach(ingredient => {
            updated = updated.map(invItem =>
              invItem.id === ingredient.itemId
                ? {
                    ...invItem,
                    currentStock: Math.max(
                      0,
                      invItem.currentStock - ingredient.quantity * orderItem.quantity
                    ),
                  }
                : invItem
            );
          });
        }
      });

      generateAlerts(updated);
      return updated;
    });
  }, [generateAlerts]);

  const addInventoryItem = useCallback((item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = { ...item, id: `inv-${Date.now()}` };
    setInventory(prev => [...prev, newItem]);
  }, []);

  const deleteInventoryItem = useCallback((itemId: string) => {
    setInventory(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const stats = useMemo(() => {
    const totalItems      = inventory.length;
    const lowStockItems   = inventory.filter(i => getStockStatus(i) === 'low-stock').length;
    const criticalItems   = inventory.filter(i =>
      getStockStatus(i) === 'critical' || getStockStatus(i) === 'out-of-stock'
    ).length;
    const healthyItems    = inventory.filter(i => getStockStatus(i) === 'in-stock').length;
    const totalValue      = inventory.reduce((s, i) => s + i.currentStock * i.costPerUnit, 0);
    const capacityUsed    = inventory.reduce((s, i) => s + i.currentStock, 0);
    const totalCapacity   = inventory.reduce((s, i) => s + i.maxCapacity, 0);
    const overallCapacityPercent = Math.round((capacityUsed / totalCapacity) * 100);

    const byCategory = inventory.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = { count: 0, value: 0, lowStock: 0 };
      acc[item.category].count++;
      acc[item.category].value += item.currentStock * item.costPerUnit;
      if (getStockStatus(item) !== 'in-stock') acc[item.category].lowStock++;
      return acc;
    }, {} as Record<string, { count: number; value: number; lowStock: number }>);

    return {
      totalItems,
      lowStockItems,
      criticalItems,
      healthyItems,
      totalValue,
      overallCapacityPercent,
      byCategory,
      unacknowledgedAlerts: alerts.filter(a => !a.acknowledged).length,
    };
  }, [inventory, alerts, getStockStatus]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev =>
      prev.map(alert => alert.id === alertId ? { ...alert, acknowledged: true } : alert)
    );
  }, []);

  return {
    inventory,
    alerts,
    stats,
    getStockStatus,
    updateStock,
    restockItem,
    consumeForOrder,
    addInventoryItem,
    deleteInventoryItem,
    acknowledgeAlert,
  };
}