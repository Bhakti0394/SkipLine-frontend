// src/kitchen-hooks/use-toast.ts

import { toast } from 'sonner';

const ERROR_TOAST_ID = 'kitchen-error-singleton';
const COOLDOWN_MS    = 2000;
const DISMISS_MS     = 2500;

let _lastMessage = '';
let _lastShownAt = 0;

export function toastError(message: string, title = 'Invalid move'): void {
  const now = Date.now();
  if (_lastMessage === message && now - _lastShownAt < COOLDOWN_MS) return;
  _lastMessage = message;
  _lastShownAt = now;
  toast.error(title, {
    id:          ERROR_TOAST_ID,  // ← this is what prevents stacking
    description: message,
    duration:    DISMISS_MS,
  });
}

export function toastSuccess(message: string, title = 'Done'): void {
  toast.success(title, { description: message, duration: DISMISS_MS });
}

export { toast };