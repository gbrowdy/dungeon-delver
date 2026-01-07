// src/ecs/hooks/useGameEngine.ts
/**
 * React hook that bridges React and the ECS game loop.
 *
 * Manages the game loop lifecycle and triggers React re-renders
 * when the ECS state changes (after each tick).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  startLoop,
  stopLoop,
  getTick,
  getRenderVersion,
  isLoopRunning,
  subscribeToTick,
} from '../loop';
import { world } from '../world';
import { createGameStateEntity } from '../factories';
import { getGameState } from '../queries';

export interface UseGameEngineOptions {
  /** Whether the game loop should be running */
  enabled: boolean;
}

export interface UseGameEngineResult {
  /** Current tick number (game time - only increments when unpaused) */
  tick: number;
  /** Render version (increments whenever systems run, use for React dependencies) */
  renderVersion: number;
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
  const [renderVersion, setRenderVersion] = useState(() => getRenderVersion());
  const [isRunning, setIsRunning] = useState(() => isLoopRunning());
  const initializedRef = useRef(false);

  // Initialize the ECS world with game state entity (only once)
  // Use synchronous check-and-set pattern to prevent race conditions in React 18 concurrent mode
  if (!initializedRef.current) {
    initializedRef.current = true;
    // Check if game state entity already exists before adding
    if (!getGameState()) {
      world.add(createGameStateEntity());
    }
  }

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
      setRenderVersion(getRenderVersion());
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

  return { tick, renderVersion, start, stop, isRunning };
}
