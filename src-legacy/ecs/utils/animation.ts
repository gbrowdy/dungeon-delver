// src/ecs/utils/animation.ts
/**
 * Shared animation utilities for ECS systems.
 * Consolidates duplicate queueAnimationEvent implementations.
 */

import { getGameState } from '../queries';
import { getTick } from '../loop';
import type { AnimationEventType, AnimationPayload } from '../components';

/**
 * Generate a unique animation ID using crypto.randomUUID().
 * Replaces module-level counters that never reset between games.
 */
export function getNextAnimationId(): string {
  return crypto.randomUUID();
}

/**
 * Queue an animation event for the AnimationSystem to process.
 *
 * @param eventType - The type of animation event
 * @param payload - Event-specific data
 * @param durationTicks - How long the animation lasts in game ticks (default 45 = ~720ms)
 */
export function queueAnimationEvent(
  eventType: AnimationEventType,
  payload: AnimationPayload,
  durationTicks: number = 45
): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.animationEvents) {
    gameState.animationEvents = [];
  }

  gameState.animationEvents.push({
    id: getNextAnimationId(),
    type: eventType,
    payload,
    createdAtTick: getTick(),
    displayUntilTick: getTick() + durationTicks,
    consumed: false,
  });
}
