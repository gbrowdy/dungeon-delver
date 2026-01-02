import { Player } from '@/types/game';
import { isTestInvincible } from '@/hooks/useTestHooks';
import { deepClonePlayer } from '@/utils/stateUtils';

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
  /** Whether damage was blocked entirely (e.g., test invincibility) */
  blocked: boolean;
}

/**
 * Centralized function for applying damage to a player.
 *
 * This function handles:
 * - Test invincibility (for E2E testing)
 * - Shield absorption
 * - Health reduction with floor at 0
 * - Combat log generation
 *
 * @param player - The player to apply damage to
 * @param damage - Amount of damage to apply
 * @param source - Source of the damage (affects shield bypass)
 * @returns DamageResult with updated player and metadata
 *
 * @example
 * ```typescript
 * const result = applyDamageToPlayer(player, 25, 'enemy_attack');
 * if (result.player.currentStats.health <= 0) {
 *   // Handle death
 * }
 * ```
 */
export function applyDamageToPlayer(
  player: Player,
  damage: number,
  source: DamageSource
): DamageResult {
  const updatedPlayer = deepClonePlayer(player);
  const logs: string[] = [];

  // Check test invincibility first
  if (isTestInvincible()) {
    return {
      player: updatedPlayer,
      logs: ['[Test] Damage blocked by invincibility'],
      actualDamage: 0,
      shieldAbsorbed: 0,
      blocked: true,
    };
  }

  let remainingDamage = damage;
  let shieldAbsorbed = 0;

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
      logs.push(`Shield broken!`);
    }
  }

  // Apply remaining damage to health
  const healthBefore = updatedPlayer.currentStats.health;
  updatedPlayer.currentStats.health = Math.max(0, healthBefore - remainingDamage);
  const actualDamage = healthBefore - updatedPlayer.currentStats.health;

  return {
    player: updatedPlayer,
    logs,
    actualDamage,
    shieldAbsorbed,
    blocked: false,
  };
}
