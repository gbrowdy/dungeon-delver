import type { Player } from '@/types/game';
import { deepClonePlayer } from '@/utils/stateUtils';

/**
 * Result of restoring health or mana to a player.
 */
export interface RestoreResult {
  /** Updated player with restoration applied (cloned, not mutated) */
  player: Player;
  /** Actual amount restored (may be less if capped at max) */
  actualAmount: number;
  /** Optional log message describing the restoration */
  log?: string;
}

/**
 * Options for restoration functions.
 */
export interface RestoreOptions {
  /** Source of the restoration (e.g., "Divine Heal", "Life Steal") for log messages */
  source?: string;
}

/**
 * Restore health to a player, capping at maxHealth.
 *
 * @param player - The player to restore health to
 * @param amount - Amount of health to restore
 * @param options - Optional configuration (source for logging)
 * @returns RestoreResult with updated player and metadata
 *
 * @example
 * ```typescript
 * const result = restorePlayerHealth(player, 25, { source: 'Divine Heal' });
 * player = result.player;
 * if (result.log) logs.push(result.log);
 * ```
 */
export function restorePlayerHealth(
  player: Player,
  amount: number,
  options?: RestoreOptions
): RestoreResult {
  const updatedPlayer = deepClonePlayer(player);
  const currentHealth = updatedPlayer.currentStats.health;
  const maxHealth = updatedPlayer.currentStats.maxHealth;

  const newHealth = Math.min(maxHealth, currentHealth + amount);
  const actualAmount = newHealth - currentHealth;
  updatedPlayer.currentStats.health = newHealth;

  // Generate log message
  let log: string | undefined;
  if (actualAmount > 0) {
    if (options?.source) {
      log = `${options.source} restores ${actualAmount} HP`;
    } else {
      log = `Restored ${actualAmount} HP`;
    }
    if (newHealth >= maxHealth) {
      log += ' (full health)';
    }
  } else if (newHealth >= maxHealth) {
    log = options?.source
      ? `${options.source} restores 0 HP (full health)`
      : 'Restored 0 HP (full health)';
  }

  return {
    player: updatedPlayer,
    actualAmount,
    log,
  };
}

/**
 * Restore mana to a player, capping at maxMana.
 *
 * @param player - The player to restore mana to
 * @param amount - Amount of mana to restore
 * @param options - Optional configuration (source for logging)
 * @returns RestoreResult with updated player and metadata
 *
 * @example
 * ```typescript
 * const result = restorePlayerMana(player, 15, { source: 'Mana Potion' });
 * player = result.player;
 * if (result.log) logs.push(result.log);
 * ```
 */
export function restorePlayerMana(
  player: Player,
  amount: number,
  options?: RestoreOptions
): RestoreResult {
  const updatedPlayer = deepClonePlayer(player);
  const currentMana = updatedPlayer.currentStats.mana;
  const maxMana = updatedPlayer.currentStats.maxMana;

  const newMana = Math.min(maxMana, currentMana + amount);
  const actualAmount = newMana - currentMana;
  updatedPlayer.currentStats.mana = newMana;

  // Generate log message
  let log: string | undefined;
  if (actualAmount > 0) {
    if (options?.source) {
      log = `${options.source} restores ${actualAmount} MP`;
    } else {
      log = `Restored ${actualAmount} MP`;
    }
    if (newMana >= maxMana) {
      log += ' (full mana)';
    }
  } else if (newMana >= maxMana) {
    log = options?.source
      ? `${options.source} restores 0 MP (full mana)`
      : 'Restored 0 MP (full mana)';
  }

  return {
    player: updatedPlayer,
    actualAmount,
    log,
  };
}
