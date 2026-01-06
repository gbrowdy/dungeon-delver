/**
 * Shared combat log utility for ECS systems.
 * Consolidates duplicate addCombatLog implementations from 10 files.
 */

import { getGameState } from '../queries';

const MAX_COMBAT_LOG_ENTRIES = 50;

/**
 * Add a message to the combat log.
 * Keeps only the last 50 entries.
 */
export function addCombatLog(message: string): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.combatLog) {
    gameState.combatLog = [];
  }

  gameState.combatLog.push(message);

  // Keep last 50 entries
  if (gameState.combatLog.length > MAX_COMBAT_LOG_ENTRIES) {
    gameState.combatLog.shift();
  }
}
