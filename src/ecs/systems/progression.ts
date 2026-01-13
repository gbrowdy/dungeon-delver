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
import { getPathById } from '@/data/paths/registry';
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
          const pathId = player.pathProgression.pathId;
          const pathDef = getPathById(pathId);
          const choices = pathDef?.getPowerChoices?.(newLevel) ?? [];

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
          const pathId = player.path?.pathId;
          const stanceState = player.pathProgression.stanceProgression;

          if (pathId && stanceState) {
            const pathDef = getPathById(pathId);

            if (pathDef?.getEnhancementChoices) {
              // Determine tier values based on path type
              let tier1 = 0, tier2 = 0;
              if (pathId === 'guardian') {
                tier1 = stanceState.ironTier ?? 0;
                tier2 = stanceState.retributionTier ?? 0;
              } else if (pathId === 'enchanter') {
                tier1 = stanceState.arcaneSurgeTier ?? 0;
                tier2 = stanceState.hexVeilTier ?? 0;
              }

              const choices = pathDef.getEnhancementChoices(tier1, tier2);
              if (choices) {
                world.addComponent(player, 'pendingStanceEnhancement', {
                  pathId,
                  // Map to expected field names based on path
                  ...(pathId === 'guardian'
                    ? { ironChoice: choices.stance1, retributionChoice: choices.stance2 }
                    : { arcaneSurgeChoice: choices.stance1, hexVeilChoice: choices.stance2 }
                  ),
                });
              }
            }
          }
        }
      }
    }
  }
}
