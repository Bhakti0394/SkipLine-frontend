import { useState, useEffect } from 'react';
import { Order } from '@/types/order';

interface TimerState {
  elapsed: number;
  remaining: number;
  isOverdue: boolean;
  progress: number;
}

export const useOrderTimer = (order: Order): TimerState => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const startTime = order.startedAt || order.createdAt;
  const elapsed = Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000);
  const totalSeconds = order.estimatedPrepTime * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);
  const isOverdue = elapsed > totalSeconds && order.status === 'cooking';
  const progress = Math.min(100, (elapsed / totalSeconds) * 100);

  return { elapsed, remaining, isOverdue, progress };
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatElapsed = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};
