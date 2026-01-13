// src/ecs/systems/passive-effect/hooks.ts
/**
 * Passive effect combat hooks - called by combat and death systems.
 *
 * These hooks READ from computed values (never compute) and RETURN results
 * for the calling system to apply. They may mutate only their own entity's
 * passiveEffectState.
 */

import type { Entity } from '../../components';
import { addCombatLog, queueAnimationEvent } from '../../utils';

// ============================================================================
// RESULT INTERFACES
// ============================================================================

export interface PreDamageResult {
  finalDamage: number;
  damageReduced: number;
  wasCapped: boolean;
}

export interface OnDamagedResult {
  reflectDamage: number;
  reflectIgnoresArmor: boolean;
  reflectCanCrit: boolean;
  counterAttackTriggered: boolean;
  healAmount: number;
  healOnReflectPercent: number;
  healOnReflectKillPercent: number;
}

export interface SurviveLethalResult {
  survived: boolean;
  healthToSet: number;
}

// ============================================================================
// COMBAT HOOKS
// ============================================================================

/**
 * Process damage before it's applied.
 * Called by combat.ts when player is about to take damage.
 *
 * READS from entity.passiveEffectState.computed - never computes.
 */
export function processPreDamage(player: Entity, incomingDamage: number): PreDamageResult {
  const computed = player.passiveEffectState?.computed;
  if (!computed) {
    return { finalDamage: incomingDamage, damageReduced: 0, wasCapped: false };
  }

  let damage = incomingDamage;
  let damageReduced = 0;
  let wasCapped = false;

  // Apply base damage reduction (from computed)
  if (computed.damageReductionPercent > 0) {
    const reduction = Math.round(damage * (computed.damageReductionPercent / 100));
    damage -= reduction;
    damageReduced += reduction;
  }

  // Apply conditional armor bonus as additional DR (simplified conversion)
  if (computed.conditionalArmorPercent > 0) {
    const bonusReduction = Math.round(damage * (computed.conditionalArmorPercent / 200));
    damage -= bonusReduction;
    damageReduced += bonusReduction;
  }

  // Apply max damage per hit cap (Unbreakable)
  if (computed.maxDamagePerHitPercent !== null && player.health) {
    const maxDamage = Math.round(player.health.max * (computed.maxDamagePerHitPercent / 100));
    if (damage > maxDamage) {
      damageReduced += damage - maxDamage;
      damage = maxDamage;
      wasCapped = true;
    }
  }

  // Ensure minimum 1 damage
  damage = Math.max(1, damage);

  return { finalDamage: damage, damageReduced, wasCapped };
}

/**
 * Process effects when player takes damage.
 * Called by combat.ts after player receives damage.
 *
 * READS from entity.passiveEffectState.computed.
 * MUTATES only player's passiveEffectState (own entity).
 * RETURNS damage values for combat.ts to apply to attacker.
 */
export function processOnDamaged(player: Entity, damage: number): OnDamagedResult {
  const state = player.passiveEffectState;
  const computed = state?.computed;

  const result: OnDamagedResult = {
    reflectDamage: 0,
    reflectIgnoresArmor: false,
    reflectCanCrit: false,
    counterAttackTriggered: false,
    healAmount: 0,
    healOnReflectPercent: 0,
    healOnReflectKillPercent: 0,
  };

  if (!state || !computed) return result;

  // Track hit taken (mutate own entity state)
  state.combat.hitsTaken += 1;

  // Calculate reflect damage (read from computed + combat state)
  let totalReflectPercent = computed.baseReflectPercent + state.combat.reflectBonusPercent;
  totalReflectPercent *= computed.conditionalReflectMultiplier;

  if (totalReflectPercent > 0) {
    result.reflectDamage = Math.round(damage * (totalReflectPercent / 100));
    result.reflectIgnoresArmor = computed.reflectIgnoresArmor;
    result.reflectCanCrit = computed.reflectCanCrit;
    result.healOnReflectPercent = computed.healOnReflectPercent;
    result.healOnReflectKillPercent = computed.healOnReflectKillPercent;
  }

  // Increment reflect scaling (mutate own entity state)
  if (computed.reflectScalingPerHit > 0) {
    state.combat.reflectBonusPercent += computed.reflectScalingPerHit;
    // Update pre-computed total for snapshot (ECS: systems compute, snapshots copy)
    computed.currentTotalReflectPercent = computed.baseReflectPercent + state.combat.reflectBonusPercent;
  }

  // Counter-attack check (read from computed)
  if (computed.counterAttackChance > 0 && Math.random() * 100 < computed.counterAttackChance) {
    result.counterAttackTriggered = true;
  }

  // Damage stacks (read config from computed, mutate own state)
  if (computed.damageStackConfig) {
    if (state.combat.damageStacks < computed.damageStackConfig.maxStacks) {
      state.combat.damageStacks += 1;
    }
  }

  // On-hit heal chance (read from computed, return heal for combat.ts to apply)
  if (computed.healOnDamagedChance > 0 && Math.random() * 100 < computed.healOnDamagedChance) {
    if (player.health) {
      const heal = Math.round(player.health.max * (computed.healOnDamagedPercent / 100));
      // DO NOT mutate player.health here - return heal amount for combat.ts to apply
      result.healAmount += heal;
    }
  }

  // Grant next attack bonus (read from computed, mutate own state)
  if (computed.nextAttackBonusOnDamaged > 0) {
    state.combat.nextAttackBonus = computed.nextAttackBonusOnDamaged;
  }

  return result;
}

// ============================================================================
// SURVIVE LETHAL HOOK
// ============================================================================

/**
 * Check if player should survive lethal damage.
 * Called by death.ts when player HP reaches 0.
 *
 * READS from entity.passiveEffectState.computed.hasSurviveLethal
 * MUTATES only own passiveEffectState (floor.survivedLethal)
 * RETURNS result for death.ts to apply health change
 *
 * @returns { survived: boolean, healthToSet: number } for death.ts to apply
 */
export function checkSurviveLethal(player: Entity): SurviveLethalResult {
  const state = player.passiveEffectState;
  const computed = state?.computed;

  if (!computed?.hasSurviveLethal || !state || !player.health) {
    return { survived: false, healthToSet: 0 };
  }

  // Check if already used this floor
  if (state.floor.survivedLethal) {
    return { survived: false, healthToSet: 0 };
  }

  // Mark as used (mutate own entity state only)
  state.floor.survivedLethal = true;

  addCombatLog('Immortal Bulwark prevents death!');
  queueAnimationEvent('item_proc', {
    type: 'item',
    itemName: 'Immortal Bulwark',
    effectDescription: 'Survived lethal!',
  });

  // Return result for death.ts to apply (DO NOT mutate health here)
  return { survived: true, healthToSet: 1 };
}
