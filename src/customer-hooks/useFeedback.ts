import { useState, useEffect, useCallback } from 'react';
import { MealFeedback } from '@/types/dashboard';

const STORAGE_KEY = 'SkipLine_feedback';

// Demo feedback data
const demoFeedback: MealFeedback[] = [
  { id: 'fb1', mealId: '1', rating: 5, comment: 'Best butter chicken in town! Creamy and flavorful.', userName: 'Priya S.', createdAt: Date.now() - 86400000 },
  { id: 'fb2', mealId: '1', rating: 4, comment: 'Great taste, could be spicier.', userName: 'Rahul M.', createdAt: Date.now() - 172800000 },
  { id: 'fb3', mealId: '1', rating: 5, comment: 'Absolutely delicious! Will order again.', userName: 'Anita K.', createdAt: Date.now() - 259200000 },
  { id: 'fb4', mealId: '2', rating: 5, comment: 'Crispy dosa, perfect sambar!', userName: 'Karthik R.', createdAt: Date.now() - 86400000 },
  { id: 'fb5', mealId: '2', rating: 4, comment: 'Authentic South Indian taste.', userName: 'Meera V.', createdAt: Date.now() - 172800000 },
  { id: 'fb6', mealId: '3', rating: 5, comment: 'The biryani is heavenly! Perfectly spiced.', userName: 'Arjun P.', createdAt: Date.now() - 86400000 },
  { id: 'fb7', mealId: '3', rating: 5, comment: 'Worth every rupee. Amazing flavor!', userName: 'Sneha D.', createdAt: Date.now() - 172800000 },
  { id: 'fb8', mealId: '3', rating: 4, comment: 'Great portion size and taste.', userName: 'Vikram S.', createdAt: Date.now() - 259200000 },
  { id: 'fb9', mealId: '4', rating: 5, comment: 'So refreshing and tangy!', userName: 'Neha T.', createdAt: Date.now() - 86400000 },
  { id: 'fb10', mealId: '5', rating: 4, comment: 'Well marinated paneer, loved it!', userName: 'Amit G.', createdAt: Date.now() - 86400000 },
  { id: 'fb11', mealId: '6', rating: 5, comment: 'Fluffy bhature with rich chole!', userName: 'Pooja L.', createdAt: Date.now() - 86400000 },
  { id: 'fb12', mealId: '7', rating: 4, comment: 'Soft idlis, great for breakfast.', userName: 'Suresh N.', createdAt: Date.now() - 86400000 },
  { id: 'fb13', mealId: '8', rating: 5, comment: 'Mumbai street food at its best!', userName: 'Deepak J.', createdAt: Date.now() - 86400000 },
  { id: 'fb14', mealId: '9', rating: 5, comment: 'Creamy and rich dal makhani!', userName: 'Kavita B.', createdAt: Date.now() - 86400000 },
  { id: 'fb15', mealId: '10', rating: 5, comment: 'Perfectly sweet, melts in mouth!', userName: 'Ravi K.', createdAt: Date.now() - 86400000 },
  { id: 'fb16', mealId: '11', rating: 5, comment: 'Full thali experience, amazing variety!', userName: 'Sanjay M.', createdAt: Date.now() - 86400000 },
  { id: 'fb17', mealId: '12', rating: 5, comment: 'Lucknowi style done right!', userName: 'Fatima A.', createdAt: Date.now() - 86400000 },
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

  // Listen for storage changes from other components/tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setFeedback(parsed.length > 0 ? parsed : demoFeedback);
        } catch {
          // Ignore parse errors
        }
      }
    };

    // Custom event for same-tab updates
    const handleCustomUpdate = () => {
      setFeedback(loadFeedback());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('feedback-updated', handleCustomUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('feedback-updated', handleCustomUpdate);
    };
  }, []);

  useEffect(() => {
    if (feedback.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
    }
  }, [feedback]);

  const addFeedback = useCallback((mealId: string, rating: number, comment: string) => {
    const newFeedback: MealFeedback = {
      id: `fb-${Date.now()}`,
      mealId,
      rating,
      comment,
      userName: 'You',
      createdAt: Date.now(),
    };
    setFeedback(prev => {
      const updated = [newFeedback, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new CustomEvent('feedback-updated'));
      return updated;
    });
  }, []);

  const getFeedbackForMeal = useCallback((mealId: string) => {
    return feedback.filter(f => f.mealId === mealId).sort((a, b) => b.createdAt - a.createdAt);
  }, [feedback]);

  const getAverageRating = useCallback((mealId: string) => {
    const mealFeedback = feedback.filter(f => f.mealId === mealId);
    if (mealFeedback.length === 0) return null;
    const sum = mealFeedback.reduce((acc, f) => acc + f.rating, 0);
    return sum / mealFeedback.length;
  }, [feedback]);

  return { feedback, addFeedback, getFeedbackForMeal, getAverageRating };
}
