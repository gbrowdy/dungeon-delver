import type { Player } from '@/types/game';
import { deepClonePlayer } from '@/utils/stateUtils';
import { BUFF_STAT } from '@/constants/enums';

/**
 * Result of restoring health to a player.
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
 * Trigger types for path resource generation.
 */
export type ResourceTrigger = 'onHit' | 'onCrit' | 'onKill' | 'onBlock' | 'onDamaged' | 'onPowerUse';

/**
 * Result of generating path resources.
 */
export interface ResourceGenResult {
  /** Updated player with resource generated (cloned, not mutated) */
  player: Player;
  /** Actual amount generated (may be less if capped at max) */
  amountGenerated: number;
  /** Optional log message (e.g., "+5 Fury") */
  log?: string;
}

/**
 * Get the display name for a resource type.
 */
function getResourceDisplayName(type: string): string {
  const names: Record<string, string> = {
    fury: 'Fury',
    zeal: 'Zeal',
    momentum: 'Momentum',
    arcane_charges: 'Arcane Charges',
  };
  return names[type] || type;
}

/**
 * Generate path resource based on a trigger event.
 *
 * @param player - The player to generate resource for
 * @param trigger - The event that triggered generation
 * @returns ResourceGenResult with updated player and metadata
 *
 * @example
 * ```typescript
 * const result = generatePathResource(player, 'onHit');
 * player = result.player;
 * if (result.log) logs.push(result.log);
 * ```
 */
export function generatePathResource(
  player: Player,
  trigger: ResourceTrigger
): ResourceGenResult {
  const updatedPlayer = deepClonePlayer(player);

  // No path resource system
  if (!updatedPlayer.pathResource) {
    return {
      player: updatedPlayer,
      amountGenerated: 0,
    };
  }

  const generation = updatedPlayer.pathResource.generation[trigger] || 0;
  if (generation <= 0) {
    return {
      player: updatedPlayer,
      amountGenerated: 0,
    };
  }

  const currentResource = updatedPlayer.pathResource.current;
  const maxResource = updatedPlayer.pathResource.max;
  const newResource = Math.min(maxResource, currentResource + generation);
  const amountGenerated = newResource - currentResource;

  updatedPlayer.pathResource = {
    ...updatedPlayer.pathResource,
    current: newResource,
  };

  let log: string | undefined;
  if (amountGenerated > 0) {
    const resourceName = getResourceDisplayName(updatedPlayer.pathResource.type);
    log = `+${amountGenerated} ${resourceName}`;
  }

  return {
    player: updatedPlayer,
    amountGenerated,
    log,
  };
}

/**
 * Configuration for creating a buff.
 */
export interface BuffConfig {
  name: string;
  stat: typeof BUFF_STAT[keyof typeof BUFF_STAT];
  multiplier: number;
  duration: number;
  icon?: string;
  source?: string;
}

/**
 * Result of adding a buff to a player.
 */
export interface AddBuffResult {
  player: Player;
  log?: string;
}

/**
 * Get human-readable stat name for log messages.
 */
function getStatDisplayName(stat: typeof BUFF_STAT[keyof typeof BUFF_STAT]): string {
  const names: Record<string, string> = {
    [BUFF_STAT.POWER]: 'Power',
    [BUFF_STAT.ARMOR]: 'Armor',
    [BUFF_STAT.SPEED]: 'Speed',
    [BUFF_STAT.FORTUNE]: 'Fortune',
  };
  return names[stat] || stat;
}

/**
 * Add a temporary buff to a player.
 *
 * @param player - The player to add the buff to
 * @param config - Buff configuration
 * @returns AddBuffResult with updated player and log message
 *
 * @example
 * ```typescript
 * const result = addBuffToPlayer(player, {
 *   name: 'Power Surge',
 *   stat: BUFF_STAT.POWER,
 *   multiplier: 1.25,
 *   duration: 3,
 * });
 * player = result.player;
 * if (result.log) logs.push(result.log);
 * ```
 */
export function addBuffToPlayer(
  player: Player,
  config: BuffConfig
): AddBuffResult {
  const updatedPlayer = deepClonePlayer(player);

  const buff = {
    id: `buff-${config.source || config.name}-${crypto.randomUUID()}`,
    name: config.name,
    stat: config.stat,
    multiplier: config.multiplier,
    remainingTurns: config.duration,
    ...(config.icon ? { icon: config.icon } : {}),
  };

  updatedPlayer.activeBuffs.push(buff);

  const percentChange = Math.round((config.multiplier - 1) * 100);
  const statName = getStatDisplayName(config.stat);
  const log = `${statName} increased by ${percentChange}% for ${config.duration} turns!`;

  return {
    player: updatedPlayer,
    log,
  };
}
