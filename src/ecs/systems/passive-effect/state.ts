// src/ecs/systems/passive-effect/state.ts
/**
 * Passive effect state management - creation, initialization, and reset functions.
 */

import { world } from '../../world';
import type { Entity, PassiveEffectState, ComputedPassiveEffects } from '../../components';

/**
 * Create default computed effects (all zeroed/neutral).
 */
export function createDefaultComputed(): ComputedPassiveEffects {
  return {
    armorPercent: 0,
    powerPercent: 0,
    speedPercent: 0,
    maxHealthPercent: 0,
    healthRegenFlat: 0,
    damageReductionPercent: 0,
    maxDamagePerHitPercent: null,
    armorReducesDot: false,
    baseReflectPercent: 0,
    currentTotalReflectPercent: 0,
    reflectIgnoresArmor: false,
    reflectCanCrit: false,
    healOnReflectPercent: 0,
    healOnReflectKillPercent: 0,
    reflectScalingPerHit: 0,
    counterAttackChance: 0,
    damageStackConfig: null,
    healOnDamagedChance: 0,
    healOnDamagedPercent: 0,
    nextAttackBonusOnDamaged: 0,
    permanentPowerPerHit: 0,
    onHitBurstChance: 0,
    onHitBurstPowerPercent: 0,
    damageAuraPerSecond: 0,
    hasSurviveLethal: false,
    isImmuneToStuns: false,
    isImmuneToSlows: false,
    removeSpeedPenalty: false,
    lowHpArmorThreshold: 0,
    lowHpArmorBonus: 0,
    lowHpReflectThreshold: 0,
    lowHpReflectMultiplier: 1,
    highHpRegenThreshold: 100,
    highHpRegenMultiplier: 1,
    conditionalArmorPercent: 0,
    conditionalDamageReduction: 0,
    conditionalReflectMultiplier: 1,
    conditionalRegenMultiplier: 1,

    // Burn effects
    burnDamagePercent: 0,
    burnProcChance: 0,
    burnDurationBonus: 0,
    burnMaxStacks: 1,
    burnTickRateMultiplier: 1,
    damageVsBurning: 0,
    critRefreshesBurn: false,
    lifestealFromBurns: 0,
    burnExecuteThreshold: 0,
    burnExecuteBonus: 0,
    burnIgnoresArmor: false,
    burnCanCrit: false,

    // Hex effects
    hexDamageReduction: 0,
    hexSlowPercent: 0,
    hexDamageAmp: 0,
    hexRegen: 0,
    hexIntensityMultiplier: 1,
    hexLifesteal: 0,
    hexArmorReduction: 0,
    hexReflect: 0,
    hexDamageAura: 0,
    hexHealOnEnemyAttack: 0,
    hexDisableAbilities: false,
  };
}

/**
 * Create initial passive effect state with zeroed values.
 */
export function createInitialState(): PassiveEffectState {
  return {
    combat: {
      hitsTaken: 0,
      hitsDealt: 0,
      nextAttackBonus: 0,
      damageStacks: 0,
      reflectBonusPercent: 0,
    },
    floor: {
      survivedLethal: false,
    },
    permanent: {
      powerBonusPercent: 0,
    },
    computed: createDefaultComputed(),
  };
}

/**
 * Initialize passive effect state on a player entity.
 * Called when player selects a passive path.
 */
export function initializePassiveEffectState(player: Entity): void {
  if (!player.passiveEffectState) {
    world.addComponent(player, 'passiveEffectState', createInitialState());
  }
}

/**
 * Reset combat-specific tracking (when new enemy spawns).
 * Preserves: floor, permanent, computed
 */
export function resetCombatState(player: Entity): void {
  if (!player.passiveEffectState) return;

  player.passiveEffectState.combat = {
    hitsTaken: 0,
    hitsDealt: 0,
    nextAttackBonus: 0,
    damageStacks: 0,
    reflectBonusPercent: 0,
  };

  // Reset currentTotalReflectPercent to base (combat bonus is now 0)
  const computed = player.passiveEffectState.computed;
  computed.currentTotalReflectPercent = computed.baseReflectPercent;
}

/**
 * Reset floor-specific tracking (when new floor starts).
 * Also resets combat state. Preserves: permanent, computed
 */
export function resetFloorState(player: Entity): void {
  if (!player.passiveEffectState) return;

  player.passiveEffectState.floor = {
    survivedLethal: false,
  };
  resetCombatState(player);
}
