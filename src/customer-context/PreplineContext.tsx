import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem, Order, Meal, AddOn, UserMetrics, KitchenState } from '../customer-types/dashboard';
import { mockTimeSlots } from '../customer-data/mockData';
import butterChicken from '../customer-assets/butter-chicken.jpg';
import masalaDosa from '../customer-assets/masala-dosa.jpg';
import hydrebadiBiryani from '../customer-assets/hydrebadi-biryani.jpg';
import paneerTikka from '../customer-assets/paneer-tikka.jpg';
import choleBhature from '../customer-assets/chole-bhature.jpg';


interface PreplineContextType {
  // Cart
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemsCount: number;

  // Orders
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'kitchenQueuePosition'>) => Order;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  
  // Order History
  orderHistory: Order[];

  // Kitchen Queue
  kitchenState: KitchenState;
  getQueuePosition: (orderId: string) => number;

  // User Metrics
  metrics: UserMetrics;
  updateMetrics: (updates: Partial<UserMetrics>) => void;

  // Demo Controls
  resetDemo: () => void;
  simulateKitchenProgress: () => void;
}

const PreplineContext = createContext<PreplineContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CART: 'prepline_cart',
  ORDERS: 'prepline_orders',
  HISTORY: 'prepline_history',
  METRICS: 'prepline_metrics',
  KITCHEN: 'prepline_kitchen',
};

const defaultMetrics: UserMetrics = {
  timeSaved: 47,
  loyaltyPoints: 2450,
  activeOrders: 2,
  ordersThisMonth: 18,
  streak: 7,
  foodWasteReduced: 2.7,
  queueTimesSaved: 340,
};

// Demo order history for showcasing the app
const demoOrderHistory: Order[] = [
  {
    id: 'ORD-HIST1',
    meal: 'Butter Chicken',
    restaurant: 'Punjab Grill',
    image: butterChicken,

    status: 'completed',
    pickupTime: '12:30 PM',
    pickupSlotId: '3',
    estimatedReady: '0 min',
    price: 249,
    quantity: 1,
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    kitchenQueuePosition: 0,
    addOns: ['Extra Butter'],
    spiceLevel: 'medium',
    specialInstructions: '',
    createdAt: Date.now() - 86400000 * 2, // 2 days ago
    timeSaved: 18,
  },
  {
    id: 'ORD-HIST2',
    meal: 'Hyderabadi Biryani',
    restaurant: 'Paradise Biryani',
   image: hydrebadiBiryani,
status: 'completed',
    pickupTime: '1:00 PM',
    pickupSlotId: '4',
    estimatedReady: '0 min',
    price: 299,
    quantity: 2,
    paymentStatus: 'paid',
    paymentMethod: 'card',
    kitchenQueuePosition: 0,
    addOns: ['Raita', 'Papad'],
    spiceLevel: 'spicy',
    specialInstructions: 'Less oil please',
    createdAt: Date.now() - 86400000 * 3, // 3 days ago
    timeSaved: 22,
  },
  {
    id: 'ORD-HIST3',
    meal: 'Masala Dosa',
    restaurant: 'Saravana Bhavan',
   image: masalaDosa,
 status: 'completed',
    pickupTime: '11:30 AM',
    pickupSlotId: '1',
    estimatedReady: '0 min',
    price: 129,
    quantity: 1,
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    kitchenQueuePosition: 0,
    addOns: ['Extra Chutney'],
    spiceLevel: 'mild',
    specialInstructions: '',
    createdAt: Date.now() - 86400000 * 5, // 5 days ago
    timeSaved: 12,
  },
  {
    id: 'ORD-HIST4',
    meal: 'Paneer Tikka',
    restaurant: 'Barbeque Nation',
   image: paneerTikka,
 status: 'completed',
    pickupTime: '12:00 PM',
    pickupSlotId: '2',
    estimatedReady: '0 min',
    price: 199,
    quantity: 1,
    paymentStatus: 'cash',
    paymentMethod: 'cash',
    kitchenQueuePosition: 0,
    addOns: [],
    spiceLevel: 'medium',
    specialInstructions: '',
    createdAt: Date.now() - 86400000 * 7, // 7 days ago
    timeSaved: 15,
  },
  {
    id: 'ORD-HIST5',
    meal: 'Chole Bhature',
    restaurant: "Haldiram's",
   image: choleBhature,
 status: 'completed',
    pickupTime: '1:30 PM',
    pickupSlotId: '5',
    estimatedReady: '0 min',
    price: 149,
    quantity: 2,
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    kitchenQueuePosition: 0,
    addOns: ['Extra Pickle'],
    spiceLevel: 'spicy',
    specialInstructions: '',
    createdAt: Date.now() - 86400000 * 10, // 10 days ago
    timeSaved: 10,
  },
];

// Demo active orders for overview
const demoActiveOrders: Order[] = [
  {
    id: 'ORD-DEMO1',
    meal: 'Butter Chicken',
    restaurant: 'Punjab Grill',
    image: butterChicken,
    status: 'cooking',
    pickupTime: '12:30 PM',
    pickupSlotId: '3',
    estimatedReady: '3 min',
    price: 249,
    quantity: 1,
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    kitchenQueuePosition: 1,
    addOns: ['Extra Butter'],
    spiceLevel: 'medium',
    specialInstructions: '',
    createdAt: Date.now() - 600000,
    timeSaved: 18,
  },
  {
    id: 'ORD-DEMO2',
    meal: 'Hyderabadi Biryani',
    restaurant: 'Paradise Biryani',
    image: hydrebadiBiryani,
    status: 'preparing',
    pickupTime: '1:00 PM',
    pickupSlotId: '4',
    estimatedReady: '12 min',
    price: 299,
    quantity: 2,
    paymentStatus: 'cash',
    paymentMethod: 'cash',
    kitchenQueuePosition: 2,
    addOns: ['Raita', 'Papad'],
    spiceLevel: 'spicy',
    specialInstructions: 'Less oil please',
    createdAt: Date.now() - 300000,
    timeSaved: 22,
  },
];

export function PreplineProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<UserMetrics>(defaultMetrics);
  const [kitchenState, setKitchenState] = useState<KitchenState>({
    activeOrders: [],
    queuedOrders: [],
  });

  // Load from localStorage on mount, with demo data fallback
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEYS.CART);
      const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      const savedMetrics = localStorage.getItem(STORAGE_KEYS.METRICS);
      const savedKitchen = localStorage.getItem(STORAGE_KEYS.KITCHEN);

      if (savedCart) setCart(JSON.parse(savedCart));
      
      // Use saved orders or demo orders
      if (savedOrders) {
        const parsedOrders = JSON.parse(savedOrders);
        setOrders(parsedOrders.length > 0 ? parsedOrders : demoActiveOrders);
      } else {
        setOrders(demoActiveOrders);
      }
      
      // Use saved history or demo history
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        setOrderHistory(parsedHistory.length > 0 ? parsedHistory : demoOrderHistory);
      } else {
        setOrderHistory(demoOrderHistory);
      }
      
      if (savedMetrics) setMetrics({ ...defaultMetrics, ...JSON.parse(savedMetrics) });
      
      if (savedKitchen) {
        setKitchenState(JSON.parse(savedKitchen));
      } else {
        // Initialize kitchen state with demo orders
        setKitchenState({
          activeOrders: demoActiveOrders.map(o => o.id),
          queuedOrders: [],
        });
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      // Fallback to demo data on error
      setOrders(demoActiveOrders);
      setOrderHistory(demoOrderHistory);
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    localStorage.setItem(STORAGE_KEYS.KITCHEN, JSON.stringify(kitchenState));
  }, [orders, kitchenState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(orderHistory));
  }, [orderHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(metrics));
  }, [metrics]);

  // Cart functions
  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    const newItem: CartItem = {
      ...item,
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setCart(prev => [...prev, newItem]);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const updateCartItem = useCallback((itemId: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = cart.reduce((total, item) => {
    const addOnsTotal = item.addOns.reduce((sum, addOn) => sum + addOn.price, 0);
    return total + (item.meal.price + addOnsTotal) * item.quantity;
  }, 0);

  const cartItemsCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Order functions
  const addOrder = useCallback((orderData: Omit<Order, 'id' | 'createdAt' | 'kitchenQueuePosition'>) => {
    const queuePosition = orders.filter(o => 
      o.status !== 'completed' && o.status !== 'ready'
    ).length + 1;

    const newOrder: Order = {
      ...orderData,
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      createdAt: Date.now(),
      kitchenQueuePosition: queuePosition,
    };

    setOrders(prev => [newOrder, ...prev]);
    
    // Update kitchen state
    setKitchenState(prev => {
      if (prev.activeOrders.length < 3) {
        return { ...prev, activeOrders: [...prev.activeOrders, newOrder.id] };
      }
      return { ...prev, queuedOrders: [...prev.queuedOrders, newOrder.id] };
    });

    // Update metrics - including streak increment for new orders
    const today = new Date().toDateString();
    const lastOrderDate = localStorage.getItem('prepline_last_order_date');
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    let streakIncrement = 0;
    if (lastOrderDate !== today) {
      // First order of the day - increment streak
      if (lastOrderDate === yesterday || !lastOrderDate) {
        streakIncrement = 1;
      } else if (lastOrderDate !== today) {
        // Streak broken - reset to 1
        streakIncrement = 1 - metrics.streak;
      }
      localStorage.setItem('prepline_last_order_date', today);
    }

    setMetrics(prev => {
      const newStreak = Math.max(1, prev.streak + streakIncrement);
      
      // Check for streak milestones and dispatch celebration
      const milestones = [3, 7, 14, 21, 30];
      if (streakIncrement > 0 && milestones.includes(newStreak)) {
        window.dispatchEvent(new CustomEvent('streak-milestone', {
          detail: { streak: newStreak }
        }));
      }
      
      return {
        ...prev,
        activeOrders: prev.activeOrders + 1,
        ordersThisMonth: prev.ordersThisMonth + 1,
        timeSaved: prev.timeSaved + orderData.timeSaved,
        loyaltyPoints: prev.loyaltyPoints + Math.floor(orderData.price / 10),
        foodWasteReduced: prev.foodWasteReduced + 0.15,
        queueTimesSaved: prev.queueTimesSaved + orderData.timeSaved,
        streak: newStreak,
      };
    });

    // Dispatch notification for new order confirmation
    window.dispatchEvent(new CustomEvent('order-status-changed', {
      detail: {
        title: '🎉 Order Confirmed!',
        message: `Your ${orderData.meal} order has been confirmed and will be prepared shortly.`,
        type: 'order_confirmed',
        orderId: newOrder.id,
      }
    }));

    return newOrder;
  }, [orders]);

  const updateOrderStatus = useCallback((orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        const updated = { ...order, status };
        
        // Dispatch notification event for status change
        const notificationData = getStatusNotification(status, order.meal);
        if (notificationData) {
          window.dispatchEvent(new CustomEvent('order-status-changed', {
            detail: { ...notificationData, orderId }
          }));
        }
        
        // If completed, move to history
        if (status === 'completed') {
          setOrderHistory(h => [updated, ...h]);
          setMetrics(m => ({ ...m, activeOrders: Math.max(0, m.activeOrders - 1) }));
          
          // Remove from kitchen state
          setKitchenState(ks => {
            const newActive = ks.activeOrders.filter(id => id !== orderId);
            const [nextOrder, ...remainingQueued] = ks.queuedOrders;
            return {
              activeOrders: nextOrder ? [...newActive, nextOrder] : newActive,
              queuedOrders: remainingQueued,
            };
          });
        }
        
        return updated;
      }
      return order;
    }));
  }, []);

  // Helper to get notification data based on status
  const getStatusNotification = (status: Order['status'], mealName: string) => {
    switch (status) {
      case 'confirmed':
        return {
          title: 'Order Confirmed!',
          message: `Your ${mealName} order has been confirmed and will be prepared shortly.`,
          type: 'order_confirmed' as const,
        };
      case 'preparing':
        return {
          title: 'Preparation Started',
          message: `The kitchen has started preparing your ${mealName}.`,
          type: 'order_preparing' as const,
        };
      case 'cooking':
        return {
          title: 'Now Cooking',
          message: `Your ${mealName} is being cooked to perfection.`,
          type: 'order_cooking' as const,
        };
      case 'ready':
        return {
          title: '🎉 Order Ready!',
          message: `Your ${mealName} is ready for pickup! Head to the counter.`,
          type: 'order_ready' as const,
        };
      default:
        return null;
    }
  };

  // Simulate kitchen progress
  const simulateKitchenProgress = useCallback(() => {
    setOrders(prev => prev.map(order => {
      if (order.status === 'completed') return order;
      
      const statusFlow: Order['status'][] = ['confirmed', 'preparing', 'cooking', 'ready'];
      const currentIndex = statusFlow.indexOf(order.status);
      
      if (currentIndex < statusFlow.length - 1) {
        const newStatus = statusFlow[currentIndex + 1];
        
        // Dispatch notification for status change
        const notificationData = getStatusNotification(newStatus, order.meal);
        if (notificationData) {
          window.dispatchEvent(new CustomEvent('order-status-changed', {
            detail: { ...notificationData, orderId: order.id }
          }));
        }
        
        // Update queue positions
        if (newStatus === 'ready') {
          setKitchenState(ks => {
            const newActive = ks.activeOrders.filter(id => id !== order.id);
            const [nextOrder, ...remainingQueued] = ks.queuedOrders;
            return {
              activeOrders: nextOrder ? [...newActive, nextOrder] : newActive,
              queuedOrders: remainingQueued,
            };
          });
        }
        
        return { ...order, status: newStatus };
      }
      return order;
    }));
  }, []);

  const getQueuePosition = useCallback((orderId: string) => {
    const activeIndex = kitchenState.activeOrders.indexOf(orderId);
    if (activeIndex !== -1) return 0; // Currently being prepared
    
    const queueIndex = kitchenState.queuedOrders.indexOf(orderId);
    if (queueIndex !== -1) return queueIndex + 1;
    
    return 0;
  }, [kitchenState]);

  // Reset demo
  const resetDemo = useCallback(() => {
    setCart([]);
    setOrders([]);
    setOrderHistory([]);
    setMetrics(defaultMetrics);
    setKitchenState({ activeOrders: [], queuedOrders: [] });
    
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }, []);

  const updateMetrics = useCallback((updates: Partial<UserMetrics>) => {
    setMetrics(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <PreplineContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateCartItem,
      clearCart,
      cartTotal,
      cartItemsCount,
      orders,
      addOrder,
      updateOrderStatus,
      orderHistory,
      kitchenState,
      getQueuePosition,
      metrics,
      updateMetrics,
      resetDemo,
      simulateKitchenProgress,
    }}>
      {children}
    </PreplineContext.Provider>
  );
}

export function usePrepline() {
  const context = useContext(PreplineContext);
  if (context === undefined) {
    throw new Error('usePrepline must be used within a PreplineProvider');
  }
  return context;
}
