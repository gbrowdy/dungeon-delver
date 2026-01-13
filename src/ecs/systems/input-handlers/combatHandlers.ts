// src/ecs/systems/input-handlers/combatHandlers.ts
/**
 * Handlers for combat control commands: speed, pause, popups, animations.
 */

import type { Command } from '../../commands';
import type { CommandHandler } from './types';

type SetCombatSpeedCommand = Extract<Command, { type: 'SET_COMBAT_SPEED' }>;
type TogglePauseCommand = Extract<Command, { type: 'TOGGLE_PAUSE' }>;
type DismissPopupCommand = Extract<Command, { type: 'DISMISS_POPUP' }>;
type MarkAnimationsConsumedCommand = Extract<Command, { type: 'MARK_ANIMATIONS_CONSUMED' }>;

export const handleSetCombatSpeed: CommandHandler<SetCombatSpeedCommand> = (cmd, ctx) => {
  const { gameState } = ctx;
  if (gameState) {
    gameState.combatSpeed = { multiplier: cmd.speed };
  }
};

export const handleTogglePause: CommandHandler<TogglePauseCommand> = (_cmd, ctx) => {
  const { gameState } = ctx;
  if (gameState) {
    gameState.paused = !gameState.paused;
  }
};

export const handleDismissPopup: CommandHandler<DismissPopupCommand> = (cmd, ctx) => {
  const { player, gameState } = ctx;
  if (gameState?.popups) {
    // Clear the specific popup
    const popupKey = cmd.popupType as keyof typeof gameState.popups;
    if (popupKey in gameState.popups) {
      delete gameState.popups[popupKey];
    }

    // After dismissing level-up, check if player needs to select a path
    if (cmd.popupType === 'levelUp' && player) {
      const level = player.progression?.level ?? 1;
      const hasPath = !!player.path;

      // At level 2+, if player hasn't selected a path yet, go to path selection
      if (level >= 2 && !hasPath) {
        gameState.phase = 'path-select';
      }

      // Always clear pendingLevelUp after dismissing level-up popup
      gameState.pendingLevelUp = null;

      // Only unpause if no other popups are pending
      // (power choice, upgrade choice, stance enhancement need the game paused)
      const hasOtherPendingPopup =
        player.pendingPowerChoice ||
        player.pendingUpgradeChoice ||
        player.pendingStanceEnhancement;

      if (!hasOtherPendingPopup) {
        gameState.paused = false;
      }
    }
  }
};

export const handleMarkAnimationsConsumed: CommandHandler<MarkAnimationsConsumedCommand> = (
  cmd,
  ctx
) => {
  const { gameState } = ctx;
  if (gameState?.animationEvents) {
    for (const event of gameState.animationEvents) {
      if (cmd.ids.includes(event.id)) {
        event.consumed = true;
      }
    }
  }
};
