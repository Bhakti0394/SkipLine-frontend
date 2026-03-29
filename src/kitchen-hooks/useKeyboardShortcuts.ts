import { useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutAction[]) => {
  // Store shortcuts in a ref so the listener never needs to be torn down
  // and re-added on every render when the caller passes a new array literal.
  const shortcutsRef = useRef(shortcuts);
  useEffect(() => { shortcutsRef.current = shortcuts; });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) return;

      for (const shortcut of shortcutsRef.current) {
        const keyMatch   = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch  = shortcut.ctrl  ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        if (keyMatch && ctrlMatch && shiftMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // empty — listener registered once, reads latest shortcuts via ref
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
