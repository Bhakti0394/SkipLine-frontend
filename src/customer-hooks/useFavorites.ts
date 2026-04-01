import { useState, useEffect, useCallback } from 'react';
// FIX: was '@/types/dashboard' which doesn't exist — corrected to actual path
import { Meal } from '../customer-types/dashboard';

const STORAGE_KEY = 'SkipLine_favorites';

export function useFavorites() {
  // Initialize directly from localStorage — avoids the write effect
  // firing on mount with [] before the read effect restores saved favorites.
  const [favorites, setFavorites] = useState<Meal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Write effect — skips the mount write because initial state is already
  // loaded from localStorage, not from a default empty array.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);
  const addFavorite = useCallback((meal: Meal) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === meal.id)) return prev;
      return [...prev, meal];
    });
  }, []);

  const removeFavorite = useCallback((mealId: string) => {
    setFavorites(prev => prev.filter(f => f.id !== mealId));
  }, []);

  const toggleFavorite = useCallback((meal: Meal) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === meal.id)) return prev.filter(f => f.id !== meal.id);
      return [...prev, meal];
    });
  }, []);

  const isFavorite = useCallback((mealId: string) => {
    return favorites.some(f => f.id === mealId);
  }, [favorites]);

  return { favorites, addFavorite, removeFavorite, toggleFavorite, isFavorite };
}