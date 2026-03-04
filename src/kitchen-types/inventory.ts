export type InventoryCategory = 'proteins' | 'vegetables' | 'grains' | 'sauces' | 'dairy' | 'spices' | 'beverages';
export type StockStatus = 'in-stock' | 'low-stock' | 'critical' | 'out-of-stock';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  currentStock: number;
  maxCapacity: number;
  unit: string;
  minThreshold: number; // Low stock warning
  criticalThreshold: number; // Critical level
  costPerUnit: number;
  lastRestocked: Date;
  expiryDate?: Date;
  supplier?: string;
}

export interface InventoryUsage {
  itemId: string;
  quantity: number;
}

export interface MenuItemIngredients {
  menuItemId: string;
  ingredients: InventoryUsage[];
}

export interface RestockHistory {
  id: string;
  itemId: string;
  quantity: number;
  cost: number;
  restockedAt: Date;
  restockedBy: string;
}

export interface InventoryAlert {
  id: string;
  itemId: string;
  type: 'low-stock' | 'critical' | 'expired' | 'expiring-soon';
  message: string;
  createdAt: Date;
  acknowledged: boolean;
}
