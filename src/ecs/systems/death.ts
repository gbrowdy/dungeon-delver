// src/ecs/systems/death.ts
/**
 * DeathSystem - detects and handles entity deaths.
 * Runs AFTER all damage sources have been applied.
 * This ensures death is detected exactly once, preventing race conditions.
 */

import { world } from '../world';
import { getGameState, getPlayer } from '../queries';
import { getTick } from '../loop';
import type { Entity } from '../components';
import { getDevModeParams } from '@/utils/devMode';
import { queueAnimationEvent, addCombatLog } from '../utils';
import { checkSurviveLethal } from './passive-effect';

// Player death needs longer animation than enemy death
const ENEMY_DEATH_ANIMATION_MS = 500;
const PLAYER_DEATH_ANIMATION_MS = 2300; // 800ms animation + 1500ms pause for dramatic effect

function scheduleTransition(toPhase: Entity['phase'], delayMs: number): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.scheduledTransitions) {
    gameState.scheduledTransitions = [];
  }

  gameState.scheduledTransitions.push({ toPhase: toPhase!, delay: delayMs });
}

export function DeathSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (!gameState) return;

  // Check all entities with health for death
  for (const entity of world.with('health').without('dying')) {
    if (entity.health!.current <= 0) {
      const isPlayer = !!entity.player;

      // === Death immunity check (for player only) ===
      if (isPlayer && entity.statusEffects) {
        const hasDeathImmunity = entity.statusEffects.some(
          effect => effect.type === 'death_immunity' && effect.remainingTurns > 0
        );
        if (hasDeathImmunity) {
          // Survive at 1 HP instead of dying
          entity.health!.current = 1;
          addCombatLog('Death immunity saves you!');
          continue;
        }
      }

      // === Passive effect survive lethal check (Immortal Bulwark) ===
      if (isPlayer && entity.passiveEffectState && checkSurviveLethal(entity)) {
        continue;
      }

      const deathDuration = isPlayer ? PLAYER_DEATH_ANIMATION_MS : ENEMY_DEATH_ANIMATION_MS;

      // Mark as dying - MUST use addComponent for query reactivity
      world.addComponent(entity, 'dying', {
        startedAtTick: getTick(),
        duration: deathDuration,
      });

      // Clear any pending attack to prevent posthumous hits
      if (entity.attackReady) {
        world.removeComponent(entity, 'attackReady');
      }

      // Stop attack timer accumulation by resetting it
      if (entity.speed) {
        entity.speed.accumulated = 0;
      }

      // NOTE: We do NOT queue a death animation event here anymore!
      // The combat system already queues player_hit/enemy_hit events with targetDied=true,
      // and those events handle death animations properly (showing the killing blow first).
      // Creating a separate 'death' event would override the combat event and skip
      // the attack animation that dealt the killing blow.

      if (isPlayer) {
        // Player death - longer transition for dramatic effect
        addCombatLog('You have been defeated!');
        scheduleTransition('defeat', PLAYER_DEATH_ANIMATION_MS);
      } else if (entity.enemy) {
        // Enemy death
        addCombatLog(`${entity.enemy.name} has been defeated!`);

        // Calculate and store rewards
        const xpReward = entity.rewards?.xp ?? 10;
        const goldReward = entity.rewards?.gold ?? 5;

        // Apply XP multiplier from dev mode
        const devParams = getDevModeParams();
        const xpToAward = xpReward * devParams.xpMultiplier;

        // Apply rewards to player
        const player = getPlayer();
        if (player) {
          if (player.progression) {
            player.progression.xp += xpToAward;
          }
          if (player.inventory) {
            player.inventory.gold += goldReward;
          }
          addCombatLog(`Gained ${xpToAward} XP and ${goldReward} gold!`);
        }

        // Check for floor complete or spawn next enemy
        const floor = gameState.floor;
        if (floor && floor.room >= floor.totalRooms) {
          // Floor complete
          scheduleTransition('floor-complete', ENEMY_DEATH_ANIMATION_MS + 500);
        } else {
          // Schedule next enemy spawn (handled by FlowSystem)
          if (!gameState.scheduledSpawns) {
            gameState.scheduledSpawns = [];
          }
          gameState.scheduledSpawns.push({ delay: ENEMY_DEATH_ANIMATION_MS + 300 });
        }
      }
    }
  }
}
