import { useState, useCallback, useEffect } from 'react';
import { KitchenSettings, defaultSettings } from '../kitchen-types/settings';

const STORAGE_KEY = 'SkipLine-settings';

export function useSettings() {
  const [settings, setSettings] = useState<KitchenSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  const updateSettings = useCallback((newSettings: KitchenSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    
    if (settings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      root.classList.toggle('light', !prefersDark);
    } else {
      root.classList.remove('dark', 'light');
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);

  // Apply compact mode
  useEffect(() => {
    document.documentElement.classList.toggle('compact', settings.compactMode);
  }, [settings.compactMode]);

  // Apply animations preference
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', !settings.showAnimations);
  }, [settings.showAnimations]);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
