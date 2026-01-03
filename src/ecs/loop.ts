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
import { drainCommands } from './commands';
import { getGameState } from './queries';

// Timing constants
export const TICK_MS = 16; // ~60 ticks per second
const MAX_CATCHUP_TICKS = 10; // Prevent death spiral

// Loop state
let running = false;
let lastTime = 0;
let accumulator = 0;
let tick = 0;
let animationFrameId: number | null = null;

// Callback for React updates
let onTickCallback: (() => void) | null = null;

/**
 * Start the game loop.
 * @param onTick - Called after each frame (not each tick) to update React
 */
export function startLoop(onTick: () => void): void {
  if (running) return;

  running = true;
  lastTime = performance.now();
  accumulator = 0;
  onTickCallback = onTick;

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
        // Process commands at start of tick
        const commands = drainCommands();
        // Commands will be handled by InputSystem (to be implemented)
        // For now, just drain them
        void commands;

        // Run all systems
        runSystems(TICK_MS);
        tick++;
      } else {
        // Even when paused, drain commands (some commands work while paused)
        drainCommands();
      }

      accumulator -= TICK_MS;
      tickedThisFrame = true;
    }

    // Notify React (once per frame, not per tick)
    if (tickedThisFrame && onTickCallback) {
      onTickCallback();
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
  onTickCallback = null;
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
