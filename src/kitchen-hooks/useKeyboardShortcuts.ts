import { useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutAction[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

      if (keyMatch && ctrlMatch && shiftMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

export const showShortcutsHelp = () => {
  toast({
    title: '⌨️ Keyboard Shortcuts',
    description: `
      N - New Order
      S - Toggle Simulation
      1/2/3 - Switch Views
      ? - Show Help
    `,
  });
};
