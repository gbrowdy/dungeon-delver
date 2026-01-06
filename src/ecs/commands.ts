// src/ecs/commands.ts
/**
 * Command system for handling user input.
 * Commands are queued and processed at the start of each tick.
 * This ensures deterministic execution order and prevents race conditions.
 */

import type { Item } from '@/types/game';

// All possible commands
export type Command =
  // Combat actions
  | { type: 'ACTIVATE_POWER'; powerId: string }
  | { type: 'BLOCK' }
  // Game speed
  | { type: 'SET_COMBAT_SPEED'; speed: 1 | 2 | 3 }
  | { type: 'TOGGLE_PAUSE' }
  // Character setup
  | { type: 'SELECT_CLASS'; classId: string }
  | { type: 'START_GAME' }
  // Path system
  | { type: 'SELECT_PATH'; pathId: string }
  | { type: 'SELECT_ABILITY'; abilityId: string }
  | { type: 'SELECT_SUBPATH'; subpathId: string }
  | { type: 'SWITCH_STANCE'; stanceId: string }
  // Room/floor progression
  | { type: 'ADVANCE_ROOM' }
  | { type: 'GO_TO_SHOP' }
  | { type: 'LEAVE_SHOP' }
  // Death handling
  | { type: 'RETRY_FLOOR' }
  | { type: 'ABANDON_RUN' }
  // UI events
  | { type: 'DISMISS_POPUP'; popupType: string }
  | { type: 'MARK_ANIMATIONS_CONSUMED'; ids: string[] }
  // Shop
  | { type: 'PURCHASE_ITEM'; item: Item; cost: number }
  | { type: 'ENHANCE_ITEM'; slot: 'weapon' | 'armor' | 'accessory' };

// Command queue - processed at start of each tick
export const commandQueue: Command[] = [];

/**
 * Dispatch a command to be processed on the next tick.
 * Can be called from React at any time.
 */
export function dispatch(command: Command): void {
  commandQueue.push(command);
}

/**
 * Drain and return all queued commands.
 * Called by InputSystem at the start of each tick.
 */
export function drainCommands(): Command[] {
  return commandQueue.splice(0);
}

/**
 * Clear all pending commands.
 * Called when resetting game state (abandon, new game).
 */
export function clearCommands(): void {
  commandQueue.length = 0;
}

/**
 * Type-safe command creators for use in React components.
 */
export const Commands = {
  // Combat
  activatePower: (powerId: string): Command => ({
    type: 'ACTIVATE_POWER',
    powerId,
  }),
  block: (): Command => ({
    type: 'BLOCK',
  }),

  // Game speed
  setCombatSpeed: (speed: 1 | 2 | 3): Command => ({
    type: 'SET_COMBAT_SPEED',
    speed,
  }),
  togglePause: (): Command => ({
    type: 'TOGGLE_PAUSE',
  }),

  // Character setup
  selectClass: (classId: string): Command => ({
    type: 'SELECT_CLASS',
    classId,
  }),
  startGame: (): Command => ({
    type: 'START_GAME',
  }),

  // Path system
  selectPath: (pathId: string): Command => ({
    type: 'SELECT_PATH',
    pathId,
  }),
  selectAbility: (abilityId: string): Command => ({
    type: 'SELECT_ABILITY',
    abilityId,
  }),
  selectSubpath: (subpathId: string): Command => ({
    type: 'SELECT_SUBPATH',
    subpathId,
  }),
  switchStance: (stanceId: string): Command => ({
    type: 'SWITCH_STANCE',
    stanceId,
  }),

  // Room/floor
  advanceRoom: (): Command => ({
    type: 'ADVANCE_ROOM',
  }),
  goToShop: (): Command => ({
    type: 'GO_TO_SHOP',
  }),
  leaveShop: (): Command => ({
    type: 'LEAVE_SHOP',
  }),

  // Death
  retryFloor: (): Command => ({
    type: 'RETRY_FLOOR',
  }),
  abandonRun: (): Command => ({
    type: 'ABANDON_RUN',
  }),

  // UI
  dismissPopup: (popupType: string): Command => ({
    type: 'DISMISS_POPUP',
    popupType,
  }),
  markAnimationsConsumed: (ids: string[]): Command => ({
    type: 'MARK_ANIMATIONS_CONSUMED',
    ids,
  }),

  // Shop
  purchaseItem: (item: Item, cost: number): Command => ({
    type: 'PURCHASE_ITEM',
    item,
    cost,
  }),
  enhanceItem: (slot: 'weapon' | 'armor' | 'accessory'): Command => ({
    type: 'ENHANCE_ITEM',
    slot,
  }),
};
