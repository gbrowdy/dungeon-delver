// src/ecs/systems/cleanup.ts
/**
 * CleanupSystem - handles cleanup of consumed events and finished entities.
 * Runs LAST in system order to ensure:
 * - Animation events are processed by AnimationSystem before cleanup
 * - Death processing happens before entity removal
 * - One-frame flags are read by other systems before clearing
 * - Expired combatAnimation and visualEffects are cleared
 */

import { world } from '../world';
import {
  getGameState,
  getPlayer,
  dyingEntities,
  entitiesWithAttackReady,
  enemyQuery,
} from '../queries';
import { getTick, TICK_MS } from '../loop';

export function CleanupSystem(_deltaMs: number): void {
  const gameState = getGameState();
  const currentTick = getTick();

  // 1. Clean up consumed animation events
  if (gameState?.animationEvents) {
    gameState.animationEvents = gameState.animationEvents.filter(
      (event) => !event.consumed
    );
  }

  // 2. Clean up expired floatingEffects
  if (gameState?.floatingEffects) {
    gameState.floatingEffects = gameState.floatingEffects.filter((effect) => {
      const elapsed = (currentTick - effect.createdAtTick) * TICK_MS;
      return elapsed < effect.duration;
    });
  }

  // 3. Remove entities that have finished their death animation
  // Copy array to avoid mutation during iteration
  for (const entity of [...dyingEntities]) {
    const dying = entity.dying!;
    const elapsed = (currentTick - dying.startedAtTick) * TICK_MS;

    if (elapsed >= dying.duration) {
      // Don't remove player entity (needed for death screen)
      if (!entity.player) {
        world.remove(entity);
      }
    }
  }

  // 4. Clear one-frame flags (attackReady)
  // These are set by AttackTimingSystem and consumed by CombatSystem
  // Must be cleared after all systems have had a chance to read them
  // Copy array to avoid mutation during iteration
  for (const entity of [...entitiesWithAttackReady]) {
    world.removeComponent(entity, 'attackReady');
  }

  // 5. Clear expired combatAnimation on player and enemy
  // combatAnimation has startedAtTick and duration - clear when elapsed >= duration
  const player = getPlayer();
  if (player?.combatAnimation) {
    const elapsed = (currentTick - player.combatAnimation.startedAtTick) * TICK_MS;
    if (elapsed >= player.combatAnimation.duration) {
      delete player.combatAnimation;
    }
  }

  const enemy = enemyQuery.first;
  if (enemy?.combatAnimation) {
    const elapsed = (currentTick - enemy.combatAnimation.startedAtTick) * TICK_MS;
    if (elapsed >= enemy.combatAnimation.duration) {
      delete enemy.combatAnimation;
    }
  }

  // 6. Clear expired visualEffects (flash, shake, hitStop have untilTick)
  if (player?.visualEffects) {
    if (player.visualEffects.flash && currentTick >= player.visualEffects.flash.untilTick) {
      delete player.visualEffects.flash;
    }
    if (player.visualEffects.shake && currentTick >= player.visualEffects.shake.untilTick) {
      delete player.visualEffects.shake;
    }
    if (player.visualEffects.hitStop && currentTick >= player.visualEffects.hitStop.untilTick) {
      delete player.visualEffects.hitStop;
    }
    if (player.visualEffects.aura && currentTick >= player.visualEffects.aura.untilTick) {
      delete player.visualEffects.aura;
    }
  }

  if (enemy?.visualEffects) {
    if (enemy.visualEffects.flash && currentTick >= enemy.visualEffects.flash.untilTick) {
      delete enemy.visualEffects.flash;
    }
    if (enemy.visualEffects.aura && currentTick >= enemy.visualEffects.aura.untilTick) {
      delete enemy.visualEffects.aura;
    }
  }
}
