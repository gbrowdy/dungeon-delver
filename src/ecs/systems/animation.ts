// src/ecs/systems/animation.ts
/**
 * AnimationSystem - manages visual event lifecycle.
 *
 * This system bridges ECS and React:
 * - Other systems queue animation events via queueAnimationEvent()
 * - React components consume events via snapshots
 * - This system marks events as consumed when their display duration expires
 *
 * Note: Events are NOT removed by this system - that's CleanupSystem's responsibility.
 */

import { getGameState } from '../queries';
import { getTick, TICK_MS } from '../loop';
import type { AnimationEvent, AnimationEventType, AnimationPayload } from '../components';

// Animation ID counter for unique event identification
let nextAnimationId = 0;

/**
 * Reset the animation ID counter.
 * Used in tests and when starting a new game.
 */
export function resetAnimationId(): void {
  nextAnimationId = 0;
}

/**
 * Get the next unique animation ID.
 */
function getNextAnimationId(): string {
  return `anim-${nextAnimationId++}`;
}

/**
 * Convert milliseconds to ticks.
 * Uses 16ms per tick (~60fps).
 */
function msToTicks(ms: number): number {
  return Math.ceil(ms / TICK_MS);
}

/**
 * Queue an animation event for React to consume.
 *
 * @param type - The animation event type (e.g., 'player_attack', 'enemy_hit')
 * @param payload - Event-specific data for rendering
 * @param durationMs - How long the event should be displayed (in milliseconds)
 */
export function queueAnimationEvent(
  type: AnimationEventType,
  payload: AnimationPayload,
  durationMs: number
): void {
  const gameState = getGameState();
  if (!gameState) return;

  // Initialize animationEvents array if not present
  if (!gameState.animationEvents) {
    gameState.animationEvents = [];
  }

  const currentTick = getTick();
  const durationTicks = msToTicks(durationMs);

  const event: AnimationEvent = {
    id: getNextAnimationId(),
    type,
    payload,
    createdAtTick: currentTick,
    displayUntilTick: currentTick + durationTicks,
    consumed: false,
  };

  gameState.animationEvents.push(event);
}

/**
 * AnimationSystem - processes animation event lifecycle each tick.
 *
 * Responsibilities:
 * 1. Mark events as consumed when displayUntilTick is reached
 *
 * Note: Does NOT remove consumed events - that's CleanupSystem's job.
 * This separation allows React to potentially animate "consumed" events
 * differently before they're removed.
 */
export function AnimationSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (!gameState) return;

  const events = gameState.animationEvents;
  if (!events || events.length === 0) return;

  const currentTick = getTick();

  // Mark events as consumed when their display duration has passed
  for (const event of events) {
    if (!event.consumed && currentTick >= event.displayUntilTick) {
      event.consumed = true;
    }
  }
}
