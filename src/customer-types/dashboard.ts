// customer-types/dashboard.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central type definitions for the customer-facing dashboard.
//
// CHANGE LOG
//   • CartItem.menuItemId added — the backend UUID needed when calling
//     POST /api/customer/orders (PlaceOrderRequest.menuItemIds).
//     Previously CartItem had no way to surface the real UUID to Checkout.tsx,
//     which meant order placement was impossible without scraping meal.id.
//     Now addToCart() receives menuItemId explicitly from OrderModal so the
//     Checkout page can build the correct payload without guessing.
//   • Order.orderType? added — Checkout.tsx passes orderType inside addOrder();
//     without this field TypeScript rejects the extra property on object literals.
//   • Order.wasSwapped? and Order.originalMeal? added — used by OrderSuccess.tsx
//     and SkipLineContext to track swap state on active orders.
// ─────────────────────────────────────────────────────────────────────────────

export type OrderType = 'express' | 'normal' | 'scheduled';

export interface Meal {
  id:          string;   // backend UUID (MenuItem.id)
  name:        string;
  restaurant:  string;
  image:       string;
  price:       number;
  prepTime:    number;
  rating:      number;
  category:    string;
  isExpress?:  boolean;
}

export interface AddOn {
  id:    string;
  name:  string;
  price: number;
  icon:  string;
}

export interface MealFeedback {
  id:         string;
  mealId:     string;
  rating:     number;
  comment:    string;
  userName:   string;
  createdAt:  number;
}

export interface CartItem {
  id:                  string;   // local cart UUID (not backend UUID)
  /**
   * The backend MenuItem UUID.
   * Used by Checkout to build PlaceOrderRequest.menuItemIds.
   * Equals meal.id for items fetched from the real backend.
   */
  menuItemId:          string;
  meal:                Meal;
  quantity:            number;
  addOns:              AddOn[];
  spiceLevel:          string;
  specialInstructions: string;
  pickupSlotId:        string;
  pickupTime:          string;
  isScheduled:         boolean;
  scheduledDate?:      string;
  orderType:           OrderType;
}

export type OrderStatus =
  | 'confirmed'
  | 'cooking'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'delayed';

export interface Order {
  id:                   string;
  meal:                 string;
  restaurant:           string;
  image:                string;
  status:               OrderStatus;
  pickupTime:           string;
  pickupSlotId:         string;
  estimatedReady:       string;
  price:                number;
  quantity:             number;
  paymentStatus:        'paid' | 'cash' | 'pending';
  paymentMethod:        'upi' | 'card' | 'cash' | 'wallet';
  kitchenQueuePosition: number;
  addOns:               string[];
  spiceLevel:           string;
  specialInstructions:  string;
  createdAt:            number;
  timeSaved:            number;
  orderRef?:            string;
  // FIX: Checkout.tsx passes orderType inside addOrder() — must be on Order
  // or TypeScript rejects the extra property on the object literal.
  orderType?:           OrderType;
  // FIX: OrderSuccess.tsx and SkipLineContext track these on active orders.
  wasSwapped?:          boolean;
  originalMeal?:        string;
  totalPrepMinutes?:    number;
  pickupSlotTime?:      string | null;
  isExpress?:           boolean;
  editLockedUntil?:     Date | null;
  scheduledCookAt?:     Date | null;
}
export interface TimeSlot {
  id:             string;
  time:           string;
  queueLevel:     'low' | 'medium' | 'high';
  availableSlots: number;
  estimatedWait:  number;
}

export interface UserMetrics {
  timeSaved:        number;
  loyaltyPoints:    number;
  activeOrders:     number;
  ordersThisMonth:  number;
  streak:           number;
  foodWasteReduced: number;
  queueTimesSaved:  number;
}

export interface KitchenState {
  activeOrders: string[];
  queuedOrders: string[];
}