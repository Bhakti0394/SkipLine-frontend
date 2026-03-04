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
  timeSaved: number; // minutes saved by pre-ordering
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
  foodWasteReduced: number; // kg of food waste prevented
  queueTimesSaved: number; // total queue time saved
}

export interface KitchenState {
  activeOrders: string[]; // order IDs currently being prepared (max 3)
  queuedOrders: string[]; // orders waiting to be prepared
}

export interface MealFeedback {
  id: string;
  mealId: string;
  rating: number; // 1-5 stars
  comment: string;
  userName: string;
  createdAt: number;
}
