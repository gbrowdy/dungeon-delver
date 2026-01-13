// src/ecs/systems/input-handlers/index.ts
/**
 * Handler registry for input commands.
 * Maps command types to their handler functions.
 */

import type { Command } from '../../commands';
import type { CommandHandler, HandlerContext } from './types';

// Import handlers from domain modules
import { handleActivatePower } from './powerHandlers';
import {
  handleSetCombatSpeed,
  handleTogglePause,
  handleDismissPopup,
  handleMarkAnimationsConsumed,
} from './combatHandlers';
import { handlePurchaseItem, handleEnhanceItem } from './shopHandlers';
import {
  handleStartGame,
  handleRestartGame,
  handleAdvanceRoom,
  handleGoToShop,
  handleLeaveShop,
  handleRetryFloor,
  handleAbandonRun,
} from './flowHandlers';
import { handleSelectClass } from './classHandlers';
import {
  handleSelectPath,
  handleSelectAbility,
  handleSelectSubpath,
  handleSwitchStance,
  handleSelectPower,
  handleUpgradePower,
  handleSelectStanceEnhancement,
} from './pathHandlers';

// Export types for external use
export type { HandlerContext, CommandHandler } from './types';

/**
 * Registry mapping command types to their handler functions.
 */
export const handlers: Record<Command['type'], CommandHandler<Command>> = {
  // Power activation
  ACTIVATE_POWER: handleActivatePower as CommandHandler<Command>,

  // Combat control
  SET_COMBAT_SPEED: handleSetCombatSpeed as CommandHandler<Command>,
  TOGGLE_PAUSE: handleTogglePause as CommandHandler<Command>,
  DISMISS_POPUP: handleDismissPopup as CommandHandler<Command>,
  MARK_ANIMATIONS_CONSUMED: handleMarkAnimationsConsumed as CommandHandler<Command>,

  // Shop
  PURCHASE_ITEM: handlePurchaseItem as CommandHandler<Command>,
  ENHANCE_ITEM: handleEnhanceItem as CommandHandler<Command>,

  // Game flow
  START_GAME: handleStartGame as CommandHandler<Command>,
  RESTART_GAME: handleRestartGame as CommandHandler<Command>,
  ADVANCE_ROOM: handleAdvanceRoom as CommandHandler<Command>,
  GO_TO_SHOP: handleGoToShop as CommandHandler<Command>,
  LEAVE_SHOP: handleLeaveShop as CommandHandler<Command>,
  RETRY_FLOOR: handleRetryFloor as CommandHandler<Command>,
  ABANDON_RUN: handleAbandonRun as CommandHandler<Command>,

  // Class selection
  SELECT_CLASS: handleSelectClass as CommandHandler<Command>,

  // Path system
  SELECT_PATH: handleSelectPath as CommandHandler<Command>,
  SELECT_ABILITY: handleSelectAbility as CommandHandler<Command>,
  SELECT_SUBPATH: handleSelectSubpath as CommandHandler<Command>,
  SWITCH_STANCE: handleSwitchStance as CommandHandler<Command>,
  SELECT_POWER: handleSelectPower as CommandHandler<Command>,
  UPGRADE_POWER: handleUpgradePower as CommandHandler<Command>,
  SELECT_STANCE_ENHANCEMENT: handleSelectStanceEnhancement as CommandHandler<Command>,
};
