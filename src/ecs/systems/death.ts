// src/ecs/systems/death.ts
/**
 * DeathSystem - detects and handles entity deaths.
 * Runs AFTER all damage sources have been applied.
 * This ensures death is detected exactly once, preventing race conditions.
 */

import { world } from '../world';
import { dyingEntities, getGameState, getPlayer } from '../queries';
import { getTick, TICK_MS } from '../loop';
import type { Entity, AnimationEvent, AnimationPayload } from '../components';
import { getDevModeParams } from '@/utils/devMode';

const DEATH_ANIMATION_MS = 500;

function queueAnimationEvent(
  type: AnimationEvent['type'],
  payload: AnimationPayload,
  durationTicks: number = 30
): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.animationEvents) {
    gameState.animationEvents = [];
  }

  const currentTick = getTick();
  gameState.animationEvents.push({
    id: `death-${currentTick}`,
    type,
    payload,
    createdAtTick: currentTick,
    displayUntilTick: currentTick + durationTicks,
    consumed: false,
  });
}

function scheduleTransition(toPhase: Entity['phase'], delayMs: number): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.scheduledTransitions) {
    gameState.scheduledTransitions = [];
  }

  gameState.scheduledTransitions.push({ toPhase: toPhase!, delay: delayMs });
}

function addCombatLog(message: string): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.combatLog) {
    gameState.combatLog = [];
  }

  gameState.combatLog.push(message);
}

export function DeathSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (!gameState) return;

  // Check all entities with health for death
  for (const entity of world.with('health').without('dying')) {
    if (entity.health!.current <= 0) {
      // Mark as dying - MUST use addComponent for query reactivity
      world.addComponent(entity, 'dying', {
        startedAtTick: getTick(),
        duration: DEATH_ANIMATION_MS,
      });

      const isPlayer = !!entity.player;

      // Queue death animation
      queueAnimationEvent('death', {
        type: 'death',
        isPlayer,
      }, Math.ceil(DEATH_ANIMATION_MS / TICK_MS));

      if (isPlayer) {
        // Player death
        addCombatLog('You have been defeated!');
        scheduleTransition('defeat', DEATH_ANIMATION_MS);
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
          scheduleTransition('floor-complete', DEATH_ANIMATION_MS + 500);
        } else {
          // Schedule next enemy spawn (handled by FlowSystem)
          if (!gameState.scheduledSpawns) {
            gameState.scheduledSpawns = [];
          }
          gameState.scheduledSpawns.push({ delay: DEATH_ANIMATION_MS + 300 });
        }
      }
    }
  }

  // Clean up entities that finished dying
  for (const entity of dyingEntities) {
    const dying = entity.dying!;
    const elapsed = (getTick() - dying.startedAtTick) * TICK_MS;

    if (elapsed >= dying.duration) {
      if (!entity.player) {
        // Remove enemy entity
        world.remove(entity);
      }
      // Player entity stays (needed for death screen)
    }
  }
}
