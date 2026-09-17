import { useState, useEffect, useRef, useCallback } from 'react';
import { refreshLock, cancelLock } from '../api/appsScript';

interface UseBookingLockProps {
  lockId: string | null;
  expiresAt: string | null;
  onExpire: () => void;
}

export function useBookingLock({ lockId, expiresAt, onExpire }: UseBookingLockProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calculateTimeRemaining = useCallback(() => {
    if (!expiresAt) return 0;
    const expiry = new Date(expiresAt).getTime();
    const now = Date.now();
    const remaining = Math.max(0, expiry - now);
    return Math.floor(remaining / 1000); // seconds
  }, [expiresAt]);

  const sendHeartbeat = useCallback(async () => {
    if (!lockId) return;

    try {
      const response = await refreshLock(lockId);
      // Update the expiration time if needed
      if (response.expiresAt) {
        // Trigger a re-calculation
        setTimeRemaining(calculateTimeRemaining());
      }
    } catch (error) {
      console.error('Heartbeat failed:', error);
    }
  }, [lockId, calculateTimeRemaining]);

  const releaseLock = useCallback(async () => {
    if (!lockId) return;

    try {
      await cancelLock(lockId);
    } catch (error) {
      console.error('Failed to release lock:', error);
    }

    // Clean up intervals
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [lockId]);

  useEffect(() => {
    if (!lockId || !expiresAt) {
      setTimeRemaining(0);
      return;
    }

    // Initial time calculation
    const initial = calculateTimeRemaining();
    setTimeRemaining(initial);

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        onExpire();
      }
    }, 1000);

    // Start heartbeat (every 60 seconds)
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 60000);

    // Cleanup on unmount
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [lockId, expiresAt, calculateTimeRemaining, sendHeartbeat, onExpire]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    releaseLock,
  };
}
