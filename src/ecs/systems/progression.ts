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
import { queueAnimationEvent, addCombatLog } from '../utils';
import { getBerserkerPowerChoices } from '@/data/paths/berserker-powers';
import { getArchmagePowerChoices } from '@/data/paths/archmage-powers';
import { getGuardianEnhancementChoices } from '@/data/paths/guardian-enhancements';
import { world } from '../world';

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

    if (player.attack) {
      player.attack.baseDamage += LEVEL_UP_BONUSES.POWER;
    }

    // Log the level up
    addCombatLog(`Level up! Now level ${player.progression.level}`);
    addCombatLog(
      `+${LEVEL_UP_BONUSES.MAX_HEALTH} Max HP, +${LEVEL_UP_BONUSES.POWER} Power`
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

    // Path-aware level-up choices
    const newLevel = player.progression.level;
    if (player.pathProgression) {
      if (player.pathProgression.pathType === 'active') {
        // Active path: Power levels (2,4,6,8) or Upgrade levels (3,5,7,9+)
        const isPowerLevel = [2, 4, 6, 8].includes(newLevel);

        if (isPowerLevel) {
          let choices: import('@/types/game').Power[] = [];
          const pathId = player.pathProgression.pathId;

          if (pathId === 'berserker') {
            choices = getBerserkerPowerChoices(newLevel);
          } else if (pathId === 'archmage') {
            choices = getArchmagePowerChoices(newLevel);
          }
          // TODO: Add assassin, crusader when implemented

          if (choices.length > 0) {
            world.addComponent(player, 'pendingPowerChoice', {
              level: newLevel,
              choices,
            });
          }
        } else if (newLevel >= 3) {
          // Upgrade level - find upgradeable powers (those not at max tier)
          const upgradeablePowers =
            player.pathProgression.powerUpgrades
              ?.filter((p) => p.currentTier < 2)
              .map((p) => p.powerId) ?? [];

          if (upgradeablePowers.length > 0) {
            world.addComponent(player, 'pendingUpgradeChoice', {
              powerIds: upgradeablePowers,
            });
          }
        }
      } else if (player.pathProgression.pathType === 'passive') {
        // Passive path: Stance enhancement choice every level from 3-15
        if (newLevel >= 3 && newLevel <= 15) {
          const stanceState = player.pathProgression.stanceProgression;
          const choices = getGuardianEnhancementChoices(
            stanceState?.ironTier ?? 0,
            stanceState?.retributionTier ?? 0
          );

          if (choices.iron && choices.retribution) {
            world.addComponent(player, 'pendingStanceEnhancement', {
              ironChoice: choices.iron,
              retributionChoice: choices.retribution,
            });
          }
        }
      }
    }
  }
}
