import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook for creating timeouts that are automatically cleaned up on unmount.
 * Prevents memory leaks and stale closure issues.
 *
 * Use this whenever you need setTimeout in a React component/hook to ensure
 * proper cleanup when the component unmounts.
 */
export function useTrackedTimeouts() {
  const activeTimersRef = useRef<NodeJS.Timeout[]>([]);

  const createTrackedTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      activeTimersRef.current = activeTimersRef.current.filter(t => t !== timer);
      callback();
    }, delay);
    activeTimersRef.current.push(timer);
    return timer;
  }, []);

  const clearAllTimers = useCallback(() => {
    activeTimersRef.current.forEach(clearTimeout);
    activeTimersRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeTimersRef.current.forEach(clearTimeout);
      activeTimersRef.current = [];
    };
  }, []);

  return { createTrackedTimeout, clearAllTimers };
}
