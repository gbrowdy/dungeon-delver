// src/ecs/hooks/useGameEngine.ts
/**
 * React hook that bridges React and the ECS game loop.
 *
 * Manages the game loop lifecycle and triggers React re-renders
 * when the ECS state changes (after each tick).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  startLoop,
  stopLoop,
  getTick,
  isLoopRunning,
  subscribeToTick,
} from '../loop';

export interface UseGameEngineOptions {
  /** Whether the game loop should be running */
  enabled: boolean;
}

export interface UseGameEngineResult {
  /** Current tick number */
  tick: number;
  /** Start the game loop manually */
  start: () => void;
  /** Stop the game loop manually */
  stop: () => void;
  /** Whether loop is currently running */
  isRunning: boolean;
}

/**
 * Hook to manage the ECS game loop lifecycle.
 *
 * @example
 * ```tsx
 * function GameComponent() {
 *   const { tick, isRunning, start, stop } = useGameEngine({ enabled: true });
 *
 *   return (
 *     <div>
 *       <p>Tick: {tick}</p>
 *       <p>Running: {isRunning ? 'Yes' : 'No'}</p>
 *       <button onClick={stop}>Pause</button>
 *       <button onClick={start}>Resume</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useGameEngine({
  enabled,
}: UseGameEngineOptions): UseGameEngineResult {
  const [tick, setTick] = useState(() => getTick());
  const [isRunning, setIsRunning] = useState(() => isLoopRunning());

  // Handle enabled prop changes
  useEffect(() => {
    if (enabled) {
      startLoop();
      setIsRunning(true);
    } else {
      stopLoop();
      setIsRunning(false);
    }

    // Cleanup on unmount
    return () => {
      stopLoop();
    };
  }, [enabled]);

  // Subscribe to tick updates for React re-renders
  useEffect(() => {
    const unsubscribe = subscribeToTick(() => {
      setTick(getTick());
      setIsRunning(isLoopRunning());
    });

    return unsubscribe;
  }, []);

  // Manual start control
  const start = useCallback(() => {
    startLoop();
    setIsRunning(true);
  }, []);

  // Manual stop control
  const stop = useCallback(() => {
    stopLoop();
    setIsRunning(false);
  }, []);

  return { tick, start, stop, isRunning };
}
