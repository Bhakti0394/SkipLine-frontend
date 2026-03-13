// ============================================================
// src/customer-types/dashboard.ts
// ============================================================

// Order type — derived from how the customer placed the order
export type OrderType = 'express' | 'normal' | 'scheduled';

export interface Order {
  id: string;
  meal: string;
  restaurant: string;
  image: string;
  status: 'confirmed' | 'preparing' | 'cooking' | 'ready' | 'completed';
  pickupTime: string;
  pickupSlotId: string;
  estimatedReady: string;
  price: number;
  quantity: number;
  paymentStatus: 'paid' | 'cash';
  paymentMethod: 'upi' | 'cash' | 'card';
  kitchenQueuePosition: number;
  addOns: string[];
  spiceLevel: string;
  specialInstructions: string;
  createdAt: number;
  timeSaved: number;
  orderType?: OrderType;       // optional so existing demo orders don't break
  isScheduled?: boolean;       // optional
  scheduledDate?: string;      // optional
}

export interface CartItem {
  id: string;
  meal: Meal;
  quantity: number;
  addOns: AddOn[];
  spiceLevel: string;
  specialInstructions: string;
  pickupSlotId: string;
  pickupTime: string;
  orderType?: OrderType;       // optional — set by OrderModal
  isScheduled?: boolean;       // optional
  scheduledDate?: string;      // optional
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  icon: string;
}

export interface Meal {
  id: string;
  name: string;
  restaurant: string;
  image: string;
  price: number;
  prepTime: number;
  rating: number;
  category: string;
  isExpress?: boolean;
}

export interface TimeSlot {
  id: string;
  time: string;
  queueLevel: 'low' | 'medium' | 'high';
  availableSlots: number;
  estimatedWait: number;
}

export interface UserMetrics {
  timeSaved: number;
  loyaltyPoints: number;
  activeOrders: number;
  ordersThisMonth: number;
  streak: number;
  foodWasteReduced: number;
  queueTimesSaved: number;
}

export interface KitchenState {
  activeOrders: string[];
  queuedOrders: string[];
}

export interface MealFeedback {
  id: string;
  mealId: string;
  rating: number;
  comment: string;
  userName: string;
  createdAt: number;
}