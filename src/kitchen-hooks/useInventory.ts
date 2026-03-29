// ============================================================
// src/kitchen-hooks/useInventory.ts
// ============================================================
//
// REWRITE: inventory now fetches from and writes to the backend.
//
// KEY CHANGES vs old version:
//   - Removed all initialInventory / inventoryData.ts imports
//   - fetchInventory() on mount + 30s polling
//   - updateStock, restockItem, deleteInventoryItem all call backend
//     with optimistic updates + rollback on failure
//   - consumeForOrder still works locally (backend does not expose
//     per-ingredient consume endpoint yet — see NOTE below)
//   - Alerts are derived from live backend data (no separate storage)
//   - Added loading / error state for the panel to show skeleton/error
//
// NOTE on consumeForOrder:
//   The backend's OrderService already deducts ingredients when an order
//   is cooked (if you wire it up in OrderService.startCooking). The
//   frontend consumeForOrder is kept as a best-effort local deduction
//   so the UI reflects changes immediately without waiting for the next
//   poll. The 30s poll will sync the true backend value.

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, StockStatus, InventoryAlert, InventoryCategory } from '../kitchen-types/inventory';
import { menuIngredients } from '../kitchen-data/inventoryData';
import { Order } from '../kitchen-types/order';
import {
  fetchInventory,
  updateInventoryStock,
  restockInventoryItem,
  deleteInventoryItem as deleteInventoryItemApi,
  InventoryItemDto,
} from '../kitchen-api/kitchenApi';

// ── Convert backend DTO → frontend InventoryItem ─────────────────────────────

function toInventoryItem(dto: InventoryItemDto): InventoryItem {
  return {
    id:                dto.id,
    name:              dto.name,
    category:          dto.category as InventoryCategory,
    currentStock:      dto.currentStock,
    maxCapacity:       dto.maxCapacity,
    unit:              dto.unit,
    minThreshold:      dto.minThreshold,
    criticalThreshold: dto.criticalThreshold,
    costPerUnit:       dto.costPerUnit,
    supplier:          dto.supplier,
    lastRestocked:     new Date(dto.lastRestocked),
    expiryDate:        dto.expiryDate ? new Date(dto.expiryDate) : undefined,
  };
}

const POLL_INTERVAL_MS = 30_000; // 30s — inventory changes slowly

export function useInventory() {
  const [inventory, setInventory]   = useState<InventoryItem[]>([]);
  const [alerts,    setAlerts]      = useState<InventoryAlert[]>([]);
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState<string | null>(null);

  // ── Stock status ──────────────────────────────────────────────────────────

  const getStockStatus = useCallback((item: InventoryItem): StockStatus => {
    if (item.currentStock <= 0)                       return 'out-of-stock';
    if (item.currentStock <= item.criticalThreshold)  return 'critical';
    if (item.currentStock <= item.minThreshold)       return 'low-stock';
    return 'in-stock';
  }, []);

  // ── Alert generation (derived from live inventory) ────────────────────────

  const generateAlerts = useCallback((items: InventoryItem[]) => {
    const now = new Date();
    const newAlerts: InventoryAlert[] = [];

    items.forEach(item => {
      const status = (() => {
        if (item.currentStock <= 0)                       return 'out-of-stock';
        if (item.currentStock <= item.criticalThreshold)  return 'critical';
        if (item.currentStock <= item.minThreshold)       return 'low-stock';
        return 'in-stock';
      })();

      if (status === 'critical' || status === 'out-of-stock') {
        newAlerts.push({
          id:           `alert-${item.id}-critical`,
          itemId:       item.id,
          type:         'critical',
          message:      `${item.name} is critically low (${item.currentStock} ${item.unit} remaining)`,
          createdAt:    now,
          acknowledged: false,
        });
      } else if (status === 'low-stock') {
        newAlerts.push({
          id:           `alert-${item.id}-low`,
          itemId:       item.id,
          type:         'low-stock',
          message:      `${item.name} is running low (${item.currentStock} ${item.unit} remaining)`,
          createdAt:    now,
          acknowledged: false,
        });
      }

      if (item.expiryDate) {
        const daysLeft = Math.ceil(
          (item.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 0) {
          newAlerts.push({
            id: `alert-${item.id}-expired`, itemId: item.id,
            type: 'expired', message: `${item.name} has expired!`,
            createdAt: now, acknowledged: false,
          });
        } else if (daysLeft <= 3) {
          newAlerts.push({
            id: `alert-${item.id}-expiring`, itemId: item.id,
            type: 'expiring-soon',
            message: `${item.name} expires in ${daysLeft} day(s)`,
            createdAt: now, acknowledged: false,
          });
        }
      }
    });

    // Preserve acknowledgements from existing alerts
    setAlerts(prev => {
      const acked = new Set(prev.filter(a => a.acknowledged).map(a => a.id));
      return newAlerts.map(a => ({ ...a, acknowledged: acked.has(a.id) }));
    });
  }, []);

  // ── Load from backend ─────────────────────────────────────────────────────

const abortRef      = useRef<AbortController | null>(null);
  const inventoryRef  = useRef<InventoryItem[]>([]);

  const loadInventory = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const dtos  = await fetchInventory();
      if (ctrl.signal.aborted) return;
    const items = dtos.map(toInventoryItem);
      inventoryRef.current = items;
      setInventory(items);
      generateAlerts(items);
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message ?? 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [generateAlerts]);

  useEffect(() => {
    loadInventory();
    return () => { abortRef.current?.abort(); };
  }, [loadInventory]);

  // 30s poll
  useEffect(() => {
    const id = setInterval(loadInventory, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadInventory]);

  // ── updateStock ───────────────────────────────────────────────────────────
  // Optimistic update — rollback on error

  const updateStock = useCallback(async (itemId: string, newStock: number) => {
    // Capture snapshot via ref read — never stale regardless of concurrent calls
    const prev = inventoryRef.current.find(i => i.id === itemId);
    if (!prev) return;

    // Optimistic
  setInventory(cur => {
      const next = cur.map(i =>
        i.id === itemId
          ? { ...i, currentStock: Math.max(0, Math.min(newStock, i.maxCapacity)) }
          : i
      );
      inventoryRef.current = next;
      return next;
    });

    try {
      const dto     = await updateInventoryStock(itemId, newStock);
      const updated = toInventoryItem(dto);
      setInventory(cur => {
        const next = cur.map(i => i.id === itemId ? updated : i);
        generateAlerts(next);
        return next;
      });
    } catch (err: any) {
      // Rollback
      setInventory(cur => cur.map(i => i.id === itemId ? prev : i));
      throw err;
    }
  }, [ generateAlerts]);

  // ── restockItem ───────────────────────────────────────────────────────────

const restockItem = useCallback(async (itemId: string, quantity: number) => {
    const prev = inventoryRef.current.find(i => i.id === itemId);
    if (!prev) return;

    // Optimistic — also update ref so a concurrent call reads the correct prev
    setInventory(cur => {
      const next = cur.map(i =>
        i.id === itemId
          ? { ...i, currentStock: Math.min(i.currentStock + quantity, i.maxCapacity), lastRestocked: new Date() }
          : i
      );
      inventoryRef.current = next;
      return next;
    });

    try {
      const dto     = await restockInventoryItem(itemId, quantity);
      const updated = toInventoryItem(dto);
      setInventory(cur => {
        const next = cur.map(i => i.id === itemId ? updated : i);
        inventoryRef.current = next;
        generateAlerts(next);
        return next;
      });
    } catch (err: any) {
      // Revert to the snapshot captured before this call's optimistic update.
      // Concurrent calls each hold their own prev — only this item is reverted.
      setInventory(cur => {
        const next = cur.map(i => i.id === itemId ? prev : i);
        inventoryRef.current = next;
        return next;
      });
      throw err;
    }
  }, [generateAlerts]);

  // ── deleteInventoryItem ───────────────────────────────────────────────────

const deleteInventoryItem = useCallback(async (itemId: string) => {
    // Capture snapshot from ref — always current, never empty from batching
    const snapshot = [...inventoryRef.current];
    setInventory(cur => {
      const next = cur.filter(i => i.id !== itemId);
      inventoryRef.current = next;
      return next;
    });

    try {
      await deleteInventoryItemApi(itemId);
      setInventory(cur => { generateAlerts(cur); return cur; });
    } catch (err: any) {
      inventoryRef.current = snapshot;
      setInventory(snapshot);
      throw err;
    }
  }, [generateAlerts]);

  // ── consumeForOrder (local best-effort — backend syncs on next poll) ──────

  const consumeForOrder = useCallback((order: Order) => {
    setInventory(prev => {
      let updated = [...prev];
      order.items.forEach(orderItem => {
       const recipe = menuIngredients.find(m => m.menuItemId === orderItem.menuItemId);
        if (recipe) {
          recipe.ingredients.forEach(ingredient => {
            updated = updated.map(inv =>
              inv.id === ingredient.itemId
                ? { ...inv, currentStock: Math.max(0, inv.currentStock - ingredient.quantity * orderItem.quantity) }
                : inv
            );
          });
        }
      });
      generateAlerts(updated);
      return updated;
    });
  }, [generateAlerts]);

  // ── acknowledgeAlert ──────────────────────────────────────────────────────

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev =>
      prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
    );
  }, []);

  // ── stats ─────────────────────────────────────────────────────────────────

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
    const overallCapacityPercent = totalCapacity > 0
      ? Math.round((capacityUsed / totalCapacity) * 100)
      : 0;

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

  return {
    inventory,
    alerts,
    stats,
    loading,
    error,
    getStockStatus,
    updateStock,
    restockItem,
    consumeForOrder,
    deleteInventoryItem,
    acknowledgeAlert,
    refresh: loadInventory,
  };
}