// src/ecs/systems/cleanup.ts
/**
 * CleanupSystem - handles cleanup of consumed events and finished entities.
 * Runs LAST in system order to ensure:
 * - Animation events are processed by AnimationSystem before cleanup
 * - Death processing happens before entity removal
 * - One-frame flags are read by other systems before clearing
 */

import { world } from '../world';
import {
  getGameState,
  getPlayer,
  getActiveEnemy,
  dyingEntities,
  entitiesWithAttackReady,
} from '../queries';
import { getTick, TICK_MS } from '../loop';

export function CleanupSystem(_deltaMs: number): void {
  const gameState = getGameState();

  // 1. Clean up consumed animation events
  if (gameState?.animationEvents) {
    gameState.animationEvents = gameState.animationEvents.filter(
      (event) => !event.consumed
    );
  }

  // 2. Remove entities that have finished their death animation
  // Copy array to avoid mutation during iteration
  for (const entity of [...dyingEntities]) {
    const dying = entity.dying!;
    const elapsed = (getTick() - dying.startedAtTick) * TICK_MS;

    if (elapsed >= dying.duration) {
      // Don't remove player entity (needed for death screen)
      if (!entity.player) {
        world.remove(entity);
      }
    }
  }

  // 3. Clear one-frame flags (attackReady)
  // These are set by AttackTimingSystem and consumed by CombatSystem
  // Must be cleared after all systems have had a chance to read them
  // Copy array to avoid mutation during iteration
  for (const entity of [...entitiesWithAttackReady]) {
    world.removeComponent(entity, 'attackReady');
  }
}
