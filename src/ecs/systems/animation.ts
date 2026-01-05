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

import { getGameState, getPlayer } from '../queries';
import { getTick, TICK_MS } from '../loop';
import { enemyQuery } from '../queries';
import type { AnimationEvent, AnimationEventType, AnimationPayload } from '../components';
import { COMBAT_ANIMATION } from '@/constants/enums';

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
 * 1. Process animation events and set combatAnimation components on entities
 * 2. Mark events as consumed when displayUntilTick is reached
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

  // Process unconsumed events and set combatAnimation on entities
  for (const event of events) {
    if (!event.consumed) {
      processAnimationEvent(event);
    }
  }

  // Mark events as consumed when their display duration has passed
  for (const event of events) {
    if (!event.consumed && currentTick >= event.displayUntilTick) {
      event.consumed = true;
    }
  }
}

/**
 * Process an animation event and set combatAnimation on the target entity.
 * Only processes each event once (on the tick it's created).
 */
function processAnimationEvent(event: AnimationEvent): void {
  const currentTick = getTick();

  // Only process events on the tick they're created to avoid re-processing
  if (event.createdAtTick !== currentTick) {
    return;
  }

  const durationMs = (event.displayUntilTick - event.createdAtTick) * TICK_MS;
  const gameState = getGameState();

  switch (event.type) {
    case 'enemy_hit': {
      const enemy = enemyQuery.first;
      if (enemy && event.payload.type === 'damage') {
        enemy.combatAnimation = {
          type: COMBAT_ANIMATION.HIT,
          startedAtTick: currentTick,
          duration: durationMs,
        };

        // Add floating damage effect
        addFloatingEffect(gameState, event.payload, 'enemy');
      }
      break;
    }
    case 'player_hit': {
      const player = getPlayer();
      if (player && event.payload.type === 'damage') {
        player.combatAnimation = {
          type: COMBAT_ANIMATION.HIT,
          startedAtTick: currentTick,
          duration: durationMs,
        };

        // Add visual shake effect
        if (!player.visualEffects) {
          player.visualEffects = {};
        }
        player.visualEffects.shake = {
          untilTick: currentTick + Math.ceil(durationMs / TICK_MS),
        };

        // Add floating damage effect
        addFloatingEffect(gameState, event.payload, 'player');
      }
      break;
    }
    // Add more event types as needed
  }
}

/**
 * Add a floating damage/heal effect to the game state.
 */
function addFloatingEffect(
  gameState: ReturnType<typeof getGameState>,
  payload: AnimationPayload,
  target: 'player' | 'enemy'
): void {
  if (!gameState) return;
  if (payload.type !== 'damage' && payload.type !== 'heal') return;

  if (!gameState.floatingEffects) {
    gameState.floatingEffects = [];
  }

  const currentTick = getTick();

  // Position based on target (these are relative positions that UI will use)
  const x = target === 'enemy' ? 0.7 : 0.3; // 70% right for enemy, 30% for player
  const y = 0.5; // Middle vertically

  gameState.floatingEffects.push({
    id: getNextAnimationId(),
    type: payload.type === 'damage' ? 'damage' : 'heal',
    value: payload.value,
    x,
    y,
    createdAtTick: currentTick,
    duration: 1000, // 1 second float animation
    isCrit: payload.type === 'damage' ? payload.isCrit : false,
  });
}
