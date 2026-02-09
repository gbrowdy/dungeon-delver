import { Player, Enemy } from '@/types/game';
import { deepClonePlayer, deepCloneEnemy } from '@/utils/cloneUtils';

/**
 * Source of damage for determining how it should be processed.
 * - enemy_attack: Standard enemy auto-attack
 * - enemy_ability: Damage from enemy special abilities
 * - reflect: Damage reflected back to player
 * - status_effect: Damage over time from status effects (poison, bleed)
 * - hp_cost: Self-inflicted HP cost from powers (bypasses shield)
 */
export type DamageSource = 'enemy_attack' | 'enemy_ability' | 'reflect' | 'status_effect' | 'hp_cost';

/**
 * Result of applying damage to a player.
 */
export interface DamageResult {
  /** Updated player with damage applied (cloned, not mutated) */
  player: Player;
  /** Combat log messages generated */
  logs: string[];
  /** Actual HP damage dealt (after shield absorption) */
  actualDamage: number;
  /** Amount of damage absorbed by shield */
  shieldAbsorbed: number;
  /** Whether shield was completely depleted by this damage */
  shieldBroken: boolean;
  /** Whether damage was blocked entirely (e.g., test invincibility) */
  blocked: boolean;
}

/**
 * Options for applying damage to a player.
 */
export interface DamageOptions {
  /** Minimum health to floor at (default: 0). Use 1 for HP costs that can't kill. */
  minHealth?: number;
}

/**
 * Centralized function for applying damage to a player.
 *
 * This function handles:
 * - Test invincibility (for E2E testing)
 * - Shield absorption (bypassed for hp_cost source)
 * - Health reduction with configurable floor
 * - Combat log generation
 *
 * @param player - The player to apply damage to
 * @param damage - Amount of damage to apply
 * @param source - Source of the damage (affects shield bypass)
 * @param options - Optional configuration (minHealth floor)
 * @returns DamageResult with updated player and metadata
 *
 * @example
 * ```typescript
 * // Standard damage (can kill)
 * const result = applyDamageToPlayer(player, 25, 'enemy_attack');
 *
 * // HP cost (can't kill, bypasses shield)
 * const costResult = applyDamageToPlayer(player, 10, 'hp_cost', { minHealth: 1 });
 * ```
 */
export function applyDamageToPlayer(
  player: Player,
  damage: number,
  source: DamageSource,
  options?: DamageOptions
): DamageResult {
  const updatedPlayer = deepClonePlayer(player);
  const logs: string[] = [];

  let remainingDamage = damage;
  let shieldAbsorbed = 0;
  let shieldBroken = false;

  // HP costs bypass shield (self-inflicted damage from powers)
  const bypassShield = source === 'hp_cost';

  // Apply shield absorption if applicable
  if (!bypassShield && updatedPlayer.shield && updatedPlayer.shield > 0) {
    shieldAbsorbed = Math.min(updatedPlayer.shield, remainingDamage);
    remainingDamage -= shieldAbsorbed;
    updatedPlayer.shield -= shieldAbsorbed;

    if (shieldAbsorbed > 0) {
      logs.push(`Shield absorbs ${shieldAbsorbed} damage!`);
    }
    if (updatedPlayer.shield <= 0) {
      updatedPlayer.shield = 0;
      updatedPlayer.shieldRemainingDuration = 0;
      shieldBroken = true;
      logs.push(`Shield broken!`);
    }
  }

  // Apply remaining damage to health
  const healthBefore = updatedPlayer.currentStats.health;
  const minHealth = options?.minHealth ?? 0;
  updatedPlayer.currentStats.health = Math.max(minHealth, healthBefore - remainingDamage);
  const actualDamage = healthBefore - updatedPlayer.currentStats.health;

  return {
    player: updatedPlayer,
    logs,
    actualDamage,
    shieldAbsorbed,
    shieldBroken,
    blocked: false,
  };
}

// ============================================================================
// ENEMY DAMAGE APPLICATION
// ============================================================================

/**
 * Source of damage to an enemy for determining how it should be processed.
 * - hero_attack: Standard hero auto-attack
 * - power: Player power/ability damage
 * - status_effect: Damage over time from status effects (poison, bleed)
 * - reflect: Reflected damage from items/path abilities
 * - path_ability: Damage from path ability triggers
 * - execute: Instant kill (Assassin momentum, etc.)
 */
export type EnemyDamageSource =
  | 'hero_attack'
  | 'power'
  | 'status_effect'
  | 'reflect'
  | 'path_ability'
  | 'execute';

/**
 * Result of applying damage to an enemy.
 */
export interface EnemyDamageResult {
  /** Updated enemy with damage applied (cloned, not mutated) */
  enemy: Enemy;
  /** Combat log messages generated */
  logs: string[];
  /** Actual damage dealt (0 if blocked by shield) */
  actualDamage: number;
  /** Whether damage was blocked entirely (enemy shield) */
  blocked: boolean;
  /** Whether this damage killed the enemy */
  killed: boolean;
}

/**
 * Generate a combat log message for enemy damage based on source.
 */
function getEnemyDamageLog(
  name: string,
  damage: number,
  source: EnemyDamageSource
): string {
  switch (source) {
    case 'status_effect':
      return `${name} takes ${damage} damage from status effect!`;
    case 'reflect':
      return `${name} takes ${damage} reflected damage!`;
    default:
      return `${name} takes ${damage} damage!`;
  }
}

/**
 * Centralized function for applying damage to an enemy.
 *
 * This function handles:
 * - Enemy shield blocking (bypassed by execute)
 * - Health reduction (clamped to 0)
 * - Execute instant kills
 * - Combat log generation
 *
 * @param enemy - The enemy to apply damage to
 * @param damage - Amount of damage to apply
 * @param source - Source of the damage (affects shield bypass and logging)
 * @returns EnemyDamageResult with updated enemy and metadata
 *
 * @example
 * ```typescript
 * // Standard hero attack
 * const result = applyDamageToEnemy(enemy, 25, 'hero_attack');
 *
 * // Execute (instant kill, bypasses shield)
 * const execResult = applyDamageToEnemy(enemy, 0, 'execute');
 * ```
 */
export function applyDamageToEnemy(
  enemy: Enemy,
  damage: number,
  source: EnemyDamageSource
): EnemyDamageResult {
  const updatedEnemy = deepCloneEnemy(enemy);
  const logs: string[] = [];

  // Check enemy shield first (blocks all damage except execute)
  if (updatedEnemy.isShielded && source !== 'execute') {
    logs.push(`${updatedEnemy.name}'s shield blocks the attack!`);
    return {
      enemy: updatedEnemy,
      logs,
      actualDamage: 0,
      blocked: true,
      killed: false,
    };
  }

  // Handle execute (instant kill)
  if (source === 'execute') {
    const actualDamage = updatedEnemy.health;
    updatedEnemy.health = 0;
    logs.push(`${updatedEnemy.name} executed!`);
    return {
      enemy: updatedEnemy,
      logs,
      actualDamage,
      blocked: false,
      killed: true,
    };
  }

  // Apply damage
  const healthBefore = updatedEnemy.health;
  updatedEnemy.health = Math.max(0, healthBefore - damage);
  const actualDamage = healthBefore - updatedEnemy.health;
  const killed = updatedEnemy.health <= 0;

  // Generate log based on source
  if (actualDamage > 0) {
    const logMessage = getEnemyDamageLog(updatedEnemy.name, actualDamage, source);
    logs.push(logMessage);
  }

  return {
    enemy: updatedEnemy,
    logs,
    actualDamage,
    blocked: false,
    killed,
  };
}
