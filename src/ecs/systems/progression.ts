// src/ecs/systems/progression.ts
/**
 * ProgressionSystem - handles XP threshold detection, level-ups, and stat bonuses.
 * Runs AFTER DeathSystem which awards XP to the player.
 *
 * Responsibilities:
 * - Detect when player XP >= xpToNext
 * - Apply level-up stat bonuses
 * - Handle multiple level-ups if XP is high enough
 * - Set pendingLevelUp flag for UI popup
 * - Add combat log entries
 */

import { getGameState, getPlayer } from '../queries';
import { getTick, TICK_MS } from '../loop';
import { LEVEL_UP_BONUSES } from '@/constants/game';
import type { AnimationEvent, AnimationPayload } from '../components';

function queueAnimationEvent(
  type: AnimationEvent['type'],
  payload: AnimationPayload,
  durationTicks: number = 60
): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.animationEvents) {
    gameState.animationEvents = [];
  }

  const currentTick = getTick();
  gameState.animationEvents.push({
    id: `level-up-${currentTick}`,
    type,
    payload,
    createdAtTick: currentTick,
    displayUntilTick: currentTick + durationTicks,
    consumed: false,
  });
}

function addCombatLog(message: string): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.combatLog) {
    gameState.combatLog = [];
  }

  gameState.combatLog.push(message);
}

export function ProgressionSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (!gameState) return;

  // Only process during combat phase
  if (gameState.phase !== 'combat') return;

  const player = getPlayer();
  if (!player || !player.progression) return;

  // Check for level-up
  let leveledUp = false;
  while (
    player.progression.xp >= player.progression.xpToNext &&
    player.progression.xpToNext > 0
  ) {
    // Subtract xp required and increment level
    player.progression.xp -= player.progression.xpToNext;
    player.progression.level += 1;

    // Calculate new xp requirement
    player.progression.xpToNext = Math.floor(
      player.progression.xpToNext * LEVEL_UP_BONUSES.EXP_MULTIPLIER
    );

    // Apply stat bonuses
    if (player.health) {
      player.health.max += LEVEL_UP_BONUSES.MAX_HEALTH;
      // Note: Don't restore HP on level up - only increase max
    }

    if (player.mana) {
      player.mana.max += LEVEL_UP_BONUSES.MAX_MANA;
      // Note: Don't restore mana on level up - only increase max
    }

    if (player.attack) {
      player.attack.baseDamage += LEVEL_UP_BONUSES.POWER;
    }

    // Log the level up
    addCombatLog(`Level up! Now level ${player.progression.level}`);
    addCombatLog(
      `+${LEVEL_UP_BONUSES.MAX_HEALTH} Max HP, +${LEVEL_UP_BONUSES.MAX_MANA} Max Mana, +${LEVEL_UP_BONUSES.POWER} Power`
    );

    // Queue level-up animation
    queueAnimationEvent(
      'level_up',
      {
        type: 'level_up',
        newLevel: player.progression.level,
      },
      Math.ceil(1000 / TICK_MS)
    );

    leveledUp = true;
  }

  // Set pending level-up for UI popup (only once, even for multiple level-ups)
  if (leveledUp) {
    gameState.pendingLevelUp = player.progression.level;

    // Initialize popups if needed
    if (!gameState.popups) {
      gameState.popups = {};
    }
    gameState.popups.levelUp = { level: player.progression.level };

    // PAUSE combat during level-up
    // IMPORTANT: Field is 'paused' not 'isPaused' - loop.ts checks gameState?.paused
    gameState.paused = true;
  }
}
