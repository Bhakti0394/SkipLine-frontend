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

    if (settings.theme !== 'system') {
      root.classList.remove('dark', 'light');
      root.classList.add(settings.theme);
      return;
    }

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (dark: boolean) => {
      root.classList.toggle('dark', dark);
      root.classList.toggle('light', !dark);
    };
    // Stable handler reference — same function passed to both add and remove
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    apply(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
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
