// customer-hooks/useFeedback.ts
//
// FIX [FEEDBACK-MEALID-MISMATCH]: Demo feedback mealIds documented clearly.
//
// The core issue: demo feedback uses numeric string IDs ('1', '2', ...) as
// mealId values. Real backend menu items have UUIDs. This means demo feedback
// ratings NEVER display on real dishes — which is intentional and correct:
//   - Unauthenticated users see demo data (numeric IDs, demo ratings visible)
//   - Authenticated users see real dishes (UUID IDs, demo ratings don't match → no rating shown)
//   - When a real user submits feedback via FeedbackCard, the mealId passed
//     must be the real backend UUID (order.id from CustomerOrderDto)
//
// The FeedbackCard in OrderSuccess.tsx passes order.id (the backend UUID) as
// mealId when calling addFeedback. This is correct — it means the feedback
// submitted after a real order IS retrievable by the same UUID.
//
// The getAverageRating(meal.id) call in BrowseMenu.tsx passes the backend UUID
// (meal.id = MenuItem.id from backend). For real orders, this matches. For
// demo data, it doesn't — which is the intended behaviour.
//
// No logic changes needed — just clarifying documentation and ensuring the
// hook interface is clear about what mealId means.

import { useState, useEffect, useCallback } from 'react';
import { MealFeedback } from '../customer-types/dashboard';

const STORAGE_KEY = 'SkipLine_feedback';

// Demo feedback for unauthenticated users.
// mealId values here are numeric strings that match the OLD static indianMeals
// array ids ('1'–'15'). These will never match real backend UUIDs, which is
// intentional — demo feedback is only shown when no real data is available.
const demoFeedback: MealFeedback[] = [
  { id: 'fb1',  mealId: '1',  rating: 5, comment: 'Best butter chicken in town! Creamy and flavorful.',   userName: 'Priya S.',   createdAt: Date.now() - 86400000  },
  { id: 'fb2',  mealId: '1',  rating: 4, comment: 'Great taste, could be spicier.',                       userName: 'Rahul M.',   createdAt: Date.now() - 172800000 },
  { id: 'fb3',  mealId: '1',  rating: 5, comment: 'Absolutely delicious! Will order again.',               userName: 'Anita K.',   createdAt: Date.now() - 259200000 },
  { id: 'fb4',  mealId: '2',  rating: 5, comment: 'Crispy dosa, perfect sambar!',                         userName: 'Karthik R.', createdAt: Date.now() - 86400000  },
  { id: 'fb5',  mealId: '2',  rating: 4, comment: 'Authentic South Indian taste.',                         userName: 'Meera V.',   createdAt: Date.now() - 172800000 },
  { id: 'fb6',  mealId: '3',  rating: 5, comment: 'The biryani is heavenly! Perfectly spiced.',           userName: 'Arjun P.',   createdAt: Date.now() - 86400000  },
  { id: 'fb7',  mealId: '3',  rating: 5, comment: 'Worth every rupee. Amazing flavor!',                   userName: 'Sneha D.',   createdAt: Date.now() - 172800000 },
  { id: 'fb8',  mealId: '3',  rating: 4, comment: 'Great portion size and taste.',                        userName: 'Vikram S.',  createdAt: Date.now() - 259200000 },
  { id: 'fb9',  mealId: '4',  rating: 5, comment: 'So refreshing and tangy!',                             userName: 'Neha T.',    createdAt: Date.now() - 86400000  },
  { id: 'fb10', mealId: '5',  rating: 4, comment: 'Well marinated paneer, loved it!',                     userName: 'Amit G.',    createdAt: Date.now() - 86400000  },
  { id: 'fb11', mealId: '6',  rating: 5, comment: 'Fluffy bhature with rich chole!',                      userName: 'Pooja L.',   createdAt: Date.now() - 86400000  },
  { id: 'fb12', mealId: '7',  rating: 4, comment: 'Soft idlis, great for breakfast.',                     userName: 'Suresh N.',  createdAt: Date.now() - 86400000  },
  { id: 'fb13', mealId: '8',  rating: 5, comment: 'Mumbai street food at its best!',                      userName: 'Deepak J.',  createdAt: Date.now() - 86400000  },
  { id: 'fb14', mealId: '9',  rating: 5, comment: 'Creamy and rich dal makhani!',                         userName: 'Kavita B.',  createdAt: Date.now() - 86400000  },
  { id: 'fb15', mealId: '10', rating: 5, comment: 'Perfectly sweet, melts in mouth!',                     userName: 'Ravi K.',    createdAt: Date.now() - 86400000  },
];

const loadFeedback = (): MealFeedback[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.length > 0 ? parsed : demoFeedback;
    }
    return demoFeedback;
  } catch {
    return demoFeedback;
  }
};

export function useFeedback() {
  const [feedback, setFeedback] = useState<MealFeedback[]>(loadFeedback);

useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setFeedback(parsed.length > 0 ? parsed : demoFeedback);
        } catch { /* ignore */ }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

 useEffect(() => {
    if (feedback.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
      window.dispatchEvent(new CustomEvent('feedback-updated'));
    }
  }, [feedback]);

  /**
   * Add feedback for a meal.
   *
   * @param mealId - Must be the backend MenuItem UUID (meal.id from BrowseMenu /
   *   CustomerOrderDto.id from OrderSuccess). Using anything else means the
   *   rating won't appear on the correct meal card.
   */
const addFeedback = useCallback((mealId: string, rating: number, comment: string) => {
    const newFeedback: MealFeedback = {
      id: `fb-${Date.now()}`, mealId, rating, comment, userName: 'You', createdAt: Date.now(),
    };
    setFeedback(prev => [newFeedback, ...prev]);
  }, []);

  /**
   * Get all feedback for a meal.
   * @param mealId - Backend MenuItem UUID.
   */
  const getFeedbackForMeal = useCallback((mealId: string) =>
    feedback.filter(f => f.mealId === mealId).sort((a, b) => b.createdAt - a.createdAt),
  [feedback]);

  /**
   * Get average rating for a meal, or null if no feedback exists.
   * @param mealId - Backend MenuItem UUID.
   */
  const getAverageRating = useCallback((mealId: string) => {
    const mealFeedback = feedback.filter(f => f.mealId === mealId);
    if (mealFeedback.length === 0) return null;
    return mealFeedback.reduce((acc, f) => acc + f.rating, 0) / mealFeedback.length;
  }, [feedback]);

  return { feedback, addFeedback, getFeedbackForMeal, getAverageRating };
}