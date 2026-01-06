// src/ecs/loop.ts
/**
 * Fixed-timestep game loop.
 *
 * Key properties:
 * - Fixed 16ms tick (approximately 60 ticks/second)
 * - Accumulator pattern handles variable frame rates
 * - Catchup limit prevents death spiral when tab loses focus
 * - Pause support integrated at loop level
 */

import { runSystems } from './systems';
import { getGameState } from './queries';

// Timing constants
export const TICK_MS = 16; // ~62.5 ticks per second
const MAX_CATCHUP_TICKS = 10; // Prevent death spiral

// Loop state
let running = false;
let lastTime = 0;
let accumulator = 0;
let tick = 0;
let animationFrameId: number | null = null;

// Subscribers for tick updates (allows multiple React components to subscribe)
const tickSubscribers = new Set<() => void>();

/**
 * Subscribe to tick updates.
 * Called once per frame (after all ticks for that frame have run).
 * @returns Unsubscribe function
 */
export function subscribeToTick(callback: () => void): () => void {
  tickSubscribers.add(callback);
  return () => {
    tickSubscribers.delete(callback);
  };
}

/**
 * Notify all tick subscribers.
 */
function notifyTickSubscribers(): void {
  for (const callback of tickSubscribers) {
    callback();
  }
}

/**
 * Start the game loop.
 */
export function startLoop(): void {
  if (running) return;

  running = true;
  lastTime = performance.now();
  accumulator = 0;

  const loop = (timestamp: number) => {
    if (!running) {
      animationFrameId = null;
      return;
    }

    const frameTime = timestamp - lastTime;
    lastTime = timestamp;

    accumulator += frameTime;

    // Cap catchup to prevent death spiral
    if (accumulator > TICK_MS * MAX_CATCHUP_TICKS) {
      accumulator = TICK_MS * MAX_CATCHUP_TICKS;
    }

    // Run fixed-step updates
    let tickedThisFrame = false;
    while (accumulator >= TICK_MS) {
      // Check if paused
      const gameState = getGameState();
      const isPaused = gameState?.paused ?? false;

      if (!isPaused) {
        // Run all systems (InputSystem handles drainCommands internally)
        runSystems(TICK_MS);
        tick++;
      } else {
        // Even when paused, process commands (some commands work while paused)
        // InputSystem will handle them
        runSystems(0);
      }

      accumulator -= TICK_MS;
      tickedThisFrame = true;
    }

    // Notify subscribers (once per frame, not per tick)
    if (tickedThisFrame) {
      notifyTickSubscribers();
    }

    animationFrameId = requestAnimationFrame(loop);
  };

  animationFrameId = requestAnimationFrame(loop);
}

/**
 * Stop the game loop.
 */
export function stopLoop(): void {
  running = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

/**
 * Get the current tick number.
 */
export function getTick(): number {
  return tick;
}

/**
 * Reset the tick counter (used when starting a new game).
 */
export function resetTick(): void {
  tick = 0;
}

/**
 * Check if the loop is running.
 */
export function isLoopRunning(): boolean {
  return running;
}

/**
 * Get effective delta time, scaled by combat speed.
 * Systems should use this for time-based calculations.
 */
export function getEffectiveDelta(deltaMs: number): number {
  const gameState = getGameState();
  const multiplier = gameState?.combatSpeed?.multiplier ?? 1;
  return deltaMs * multiplier;
}
