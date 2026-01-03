/**
 * Combat Utilities
 *
 * Centralized utilities for common combat operations that don't fit in other specific modules.
 * Currently handles path trigger result application to enemies.
 */

import type { Enemy } from '@/types/game';
import { applyDamageToEnemy } from '@/utils/damageUtils';

/**
 * Result from path ability triggers that can affect enemies.
 * This matches the shape of TriggerResult from usePathAbilities.
 */
export interface PathTriggerResult {
  damageAmount?: number;
  reflectedDamage?: number;
  statusEffects?: Array<{
    type: string;
    value?: number;
    damage?: number;
    duration: number;
  }>;
}

/**
 * Result of applying a path trigger to an enemy.
 */
export interface ApplyTriggerResult {
  enemy: Enemy;
  logs: string[];
}

/**
 * Apply path ability trigger results to an enemy.
 *
 * Centralizes the common pattern of applying damageAmount and reflectedDamage
 * from path ability triggers (TriggerResult). This utility prevents code duplication
 * across useCombatActions, usePowerActions, and useRoomTransitions.
 *
 * The function handles:
 * - Path ability damage (damageAmount) using 'path_ability' source
 * - Reflected damage (reflectedDamage) using 'reflect' source
 * - Proper logging and enemy state cloning
 *
 * Note: Status effects and debuffs from trigger results should be applied separately
 * using applyTriggerResultToEnemy() from combatActionHelpers.ts
 *
 * @param enemy - The enemy to apply trigger results to
 * @param triggerResult - The result from path ability trigger processing
 * @returns Updated enemy and combat logs
 *
 * @example
 * ```typescript
 * const onHitResult = processPathTrigger(player, enemy, 'on_hit');
 * const { enemy: updatedEnemy, logs } = applyPathTriggerToEnemy(enemy, onHitResult);
 * ```
 */
export function applyPathTriggerToEnemy(
  enemy: Enemy,
  triggerResult: PathTriggerResult
): ApplyTriggerResult {
  let updatedEnemy = enemy;
  const logs: string[] = [];

  // Apply path ability damage if present
  if (triggerResult.damageAmount && triggerResult.damageAmount > 0) {
    const damageResult = applyDamageToEnemy(updatedEnemy, triggerResult.damageAmount, 'path_ability');
    updatedEnemy = damageResult.enemy;
    logs.push(...damageResult.logs);
  }

  // Apply reflected damage if present
  if (triggerResult.reflectedDamage && triggerResult.reflectedDamage > 0) {
    const reflectResult = applyDamageToEnemy(updatedEnemy, triggerResult.reflectedDamage, 'reflect');
    updatedEnemy = reflectResult.enemy;
    logs.push(...reflectResult.logs);
  }

  return { enemy: updatedEnemy, logs };
}

/**
 * Calculate a combat delay scaled by combat speed.
 *
 * This centralizes the common pattern of dividing base delays by combat speed
 * to get the actual delay in milliseconds. Used throughout combat timing code.
 *
 * @param baseDelay - Base delay in milliseconds (must be non-negative)
 * @param combatSpeed - Combat speed multiplier (must be positive, typically 1, 2, or 3)
 * @returns Scaled delay in milliseconds (integer), or 0 for invalid inputs
 *
 * @example
 * ```typescript
 * const scaledDelay = getScaledDelay(COMBAT_EVENT_DELAYS.PLAYER_HIT_DELAY, combatSpeed);
 * ```
 */
export function getScaledDelay(baseDelay: number, combatSpeed: number): number {
  // Guard against invalid combatSpeed (zero, negative, or non-finite)
  if (!Number.isFinite(combatSpeed) || combatSpeed <= 0) {
    return 0;
  }
  // Guard against negative baseDelay
  if (baseDelay < 0) {
    return 0;
  }
  return Math.floor(baseDelay / combatSpeed);
}
