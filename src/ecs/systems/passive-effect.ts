// src/ecs/systems/passive-effect.ts
/**
 * PassiveEffectSystem - processes passive path effects (Guardian, Enchanter, etc.)
 *
 * ECS Architecture:
 * - recomputePassiveEffects(): Called on stance/enhancement change, writes to entity.passiveEffectState.computed
 * - updateConditionalEffects(): Called each tick, updates conditional values based on current HP
 * - PassiveEffectSystem(): Tick function - updates conditionals, processes auras
 * - Combat hooks (processPreDamage, etc.): READ from computed, never compute
 *
 * Data flow:
 *   Change event -> recomputePassiveEffects() -> entity.computed
 *   Each tick -> updateConditionalEffects() -> entity.computed.conditional*
 *   Combat -> READ entity.computed
 *   Snapshot -> COPY entity state
 */

import { world } from '../world';
import type { Entity, PassiveEffectState, ComputedPassiveEffects } from '../components';
import { getPlayer, getActiveEnemy, getGameState } from '../queries';
import { getEffectiveDelta } from '../loop';
import { getGuardianEnhancementById } from '@/data/paths/guardian-enhancements';
import { getEnchanterEnhancementById } from '@/data/paths/enchanter-enhancements';
import { getStancesForPath } from '@/data/stances';
import { addCombatLog, queueAnimationEvent } from '../utils';
import type { StanceEnhancementEffect } from '@/types/paths';

// ============================================================================
// DEFAULT/INITIAL STATE CREATION
// ============================================================================

/**
 * Create default computed effects (all zeroed/neutral).
 */
function createDefaultComputed(): ComputedPassiveEffects {
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
    burnDamagePercent: 100,
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
function createInitialState(): PassiveEffectState {
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

// ============================================================================
// STATE RESET FUNCTIONS
// ============================================================================

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

// ============================================================================
// EFFECT COMPUTATION (called on stance/enhancement change)
// ============================================================================

/**
 * Get enhancement effects for the currently active stance only.
 */
function getActiveStanceEnhancements(player: Entity): StanceEnhancementEffect[] {
  const stanceProgression = player.pathProgression?.stanceProgression;
  const activeStanceId = player.stanceState?.activeStanceId;
  if (!stanceProgression || !activeStanceId) return [];

  const effects: StanceEnhancementEffect[] = [];

  for (const enhancementId of stanceProgression.acquiredEnhancements) {
    // Try Guardian first, then Enchanter
    let enhancement = getGuardianEnhancementById(enhancementId);
    if (!enhancement) {
      enhancement = getEnchanterEnhancementById(enhancementId);
    }
    if (!enhancement) continue;

    // Only include enhancements for the active stance
    if (enhancement.stanceId !== activeStanceId) continue;

    effects.push(...enhancement.effects);
  }

  return effects;
}

/**
 * Recompute all passive effects from stance + enhancements.
 * Called when:
 * - Stance switches (SWITCH_STANCE command)
 * - Enhancement acquired (SELECT_STANCE_ENHANCEMENT command)
 *
 * Writes to entity.passiveEffectState.computed
 */
export function recomputePassiveEffects(player: Entity): void {
  const state = player.passiveEffectState;
  if (!state) return;

  // Reset computed to defaults
  const computed = createDefaultComputed();

  // Get base stance effects
  const stances = getStancesForPath(player.path?.pathId ?? '');
  const activeStance = stances.find(s => s.id === player.stanceState?.activeStanceId);

  if (activeStance) {
    for (const effect of activeStance.effects) {
      if (effect.type === 'stat_modifier') {
        const bonus = (effect.percentBonus ?? 0) * 100; // Convert 0.25 to 25
        switch (effect.stat) {
          case 'armor': computed.armorPercent += bonus; break;
          case 'power': computed.powerPercent += bonus; break;
          case 'speed': computed.speedPercent += bonus; break;
        }
      } else if (effect.type === 'damage_modifier' && effect.damageType === 'incoming') {
        // Round to avoid floating-point precision issues (e.g., (1 - 0.85) * 100 = 15.000000000000002)
        computed.damageReductionPercent += Math.round((1 - effect.multiplier) * 100);
      } else if (effect.type === 'behavior_modifier') {
        if (effect.behavior === 'reflect_damage') {
          computed.baseReflectPercent += effect.value * 100;
        } else if (effect.behavior === 'counter_attack') {
          computed.counterAttackChance += effect.value * 100;
        }
      }
    }
  }

  // Aggregate enhancement effects (only for active stance)
  const enhancements = getActiveStanceEnhancements(player);
  for (const effect of enhancements) {
    switch (effect.type) {
      case 'armor_percent':
        computed.armorPercent += effect.value;
        break;
      case 'damage_reduction':
        computed.damageReductionPercent += effect.value;
        break;
      case 'hp_regen':
        computed.healthRegenFlat += effect.value;
        break;
      case 'cc_immunity':
        computed.isImmuneToStuns = true;
        computed.isImmuneToSlows = true;
        break;
      case 'low_hp_armor':
        computed.lowHpArmorThreshold = effect.threshold;
        computed.lowHpArmorBonus = effect.value;
        break;
      case 'on_hit_heal_chance':
        computed.healOnDamagedChance = effect.chance;
        computed.healOnDamagedPercent = effect.healPercent;
        break;
      case 'max_damage_per_hit':
        computed.maxDamagePerHitPercent = effect.percent;
        break;
      case 'remove_speed_penalty':
        computed.removeSpeedPenalty = true;
        break;
      case 'max_hp_percent':
        computed.maxHealthPercent += effect.value;
        break;
      case 'regen_multiplier_above_hp':
        computed.highHpRegenThreshold = effect.threshold;
        computed.highHpRegenMultiplier = effect.multiplier;
        break;
      case 'armor_reduces_dot':
        computed.armorReducesDot = true;
        break;
      case 'survive_lethal':
        computed.hasSurviveLethal = true;
        break;
      case 'reflect_percent':
        computed.baseReflectPercent = effect.value; // Replaces base
        break;
      case 'damage_per_hit_stack':
        computed.damageStackConfig = { valuePerStack: effect.valuePerStack, maxStacks: effect.maxStacks };
        break;
      case 'heal_from_reflect':
        computed.healOnReflectPercent = effect.percent;
        break;
      case 'reflect_scaling_per_hit':
        computed.reflectScalingPerHit = effect.value;
        break;
      case 'counter_attack_chance':
        computed.counterAttackChance = effect.chance;
        break;
      case 'low_hp_reflect_multiplier':
        computed.lowHpReflectThreshold = effect.threshold;
        computed.lowHpReflectMultiplier = effect.multiplier;
        break;
      case 'passive_damage_aura':
        computed.damageAuraPerSecond = effect.damagePerSecond;
        break;
      case 'next_attack_bonus_after_hit':
        computed.nextAttackBonusOnDamaged = effect.value;
        break;
      case 'permanent_power_per_hit':
        computed.permanentPowerPerHit = effect.value;
        break;
      case 'reflect_ignores_armor':
        computed.reflectIgnoresArmor = true;
        break;
      case 'on_hit_burst_chance':
        computed.onHitBurstChance = effect.chance;
        computed.onHitBurstPowerPercent = effect.powerPercent;
        break;
      case 'reflect_can_crit':
        computed.reflectCanCrit = true;
        break;
      case 'reflect_kill_heal':
        computed.healOnReflectKillPercent = effect.percent;
        break;
      case 'armor_scaling_dr':
        // This is a dynamic effect that depends on current armor
        // Will be handled in updateConditionalEffects if needed
        break;

      // Burn effects (Arcane Surge stance)
      case 'burn_damage_percent':
        computed.burnDamagePercent += effect.value;
        break;
      case 'burn_proc_chance':
        computed.burnProcChance += effect.value;
        break;
      case 'burn_duration_bonus':
        computed.burnDurationBonus += effect.value;
        break;
      case 'burn_max_stacks':
        computed.burnMaxStacks = Math.max(computed.burnMaxStacks, effect.value);
        break;
      case 'burn_tick_rate':
        computed.burnTickRateMultiplier *= (1 + effect.value / 100);
        break;
      case 'damage_vs_burning':
        computed.damageVsBurning += effect.value;
        break;
      case 'crit_refreshes_burn':
        computed.critRefreshesBurn = effect.value;
        break;
      case 'lifesteal_from_burns':
        computed.lifestealFromBurns += effect.value;
        break;
      case 'burn_execute_bonus':
        computed.burnExecuteThreshold = effect.threshold;
        computed.burnExecuteBonus = effect.value;
        break;
      case 'burn_ignores_armor':
        computed.burnIgnoresArmor = effect.value;
        break;
      case 'burn_can_crit':
        computed.burnCanCrit = effect.value;
        break;

      // Hex effects (Hex Veil stance)
      case 'hex_damage_reduction':
        computed.hexDamageReduction += effect.value;
        break;
      case 'hex_slow_percent':
        computed.hexSlowPercent += effect.value;
        break;
      case 'hex_damage_amp':
        computed.hexDamageAmp += effect.value;
        break;
      case 'hex_regen':
        computed.hexRegen += effect.value;
        break;
      case 'hex_intensity':
        computed.hexIntensityMultiplier *= (1 + effect.value / 100);
        break;
      case 'hex_lifesteal':
        computed.hexLifesteal += effect.value;
        break;
      case 'hex_armor_reduction':
        computed.hexArmorReduction += effect.value;
        break;
      case 'hex_reflect':
        computed.hexReflect += effect.value;
        break;
      case 'hex_damage_aura':
        computed.hexDamageAura += effect.value;
        break;
      case 'hex_heal_on_enemy_attack':
        computed.hexHealOnEnemyAttack += effect.value;
        break;
      case 'hex_disable_abilities':
        computed.hexDisableAbilities = effect.value;
        break;
    }
  }

  // Set currentTotalReflectPercent = base + combat bonus (combat bonus is preserved during recompute)
  computed.currentTotalReflectPercent = computed.baseReflectPercent + state.combat.reflectBonusPercent;

  // Write computed values to entity
  state.computed = computed;
}

// ============================================================================
// CONDITIONAL EFFECT UPDATES (called each tick)
// ============================================================================

/**
 * Update conditional effect values based on current HP.
 * Called each tick by PassiveEffectSystem.
 */
function updateConditionalEffects(player: Entity): void {
  const state = player.passiveEffectState;
  if (!state?.computed || !player.health) return;

  const computed = state.computed;
  const hpPercent = (player.health.current / player.health.max) * 100;

  // Last Bastion: +armor% when below threshold
  if (computed.lowHpArmorThreshold > 0 && hpPercent < computed.lowHpArmorThreshold) {
    computed.conditionalArmorPercent = computed.lowHpArmorBonus;
  } else {
    computed.conditionalArmorPercent = 0;
  }

  // Pain Conduit: reflect multiplier when below threshold
  if (computed.lowHpReflectThreshold > 0 && hpPercent < computed.lowHpReflectThreshold) {
    computed.conditionalReflectMultiplier = computed.lowHpReflectMultiplier;
  } else {
    computed.conditionalReflectMultiplier = 1;
  }

  // Regeneration Surge: regen multiplier when above threshold
  if (computed.highHpRegenThreshold < 100 && hpPercent > computed.highHpRegenThreshold) {
    computed.conditionalRegenMultiplier = computed.highHpRegenMultiplier;
  } else {
    computed.conditionalRegenMultiplier = 1;
  }
}

// ============================================================================
// COMBAT HOOKS (read from computed, never compute)
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

export interface SurviveLethalResult {
  survived: boolean;
  healthToSet: number;
}

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

// ============================================================================
// SYSTEM TICK FUNCTION
// ============================================================================

/**
 * PassiveEffectSystem - main tick function.
 * Runs early in the tick loop, before combat.
 *
 * Responsibilities:
 * 1. Update conditional bonuses based on current HP
 * 2. Process continuous effects (damage auras)
 */
export function PassiveEffectSystem(deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  const player = getPlayer();
  if (!player?.passiveEffectState) return;

  const effectiveDelta = getEffectiveDelta(deltaMs);
  const computed = player.passiveEffectState.computed;

  // 1. Update conditional effects based on current HP
  updateConditionalEffects(player);

  // 2. Process damage aura (Thorns Aura)
  if (computed.damageAuraPerSecond > 0) {
    const enemy = getActiveEnemy();
    if (enemy?.health && !enemy.dying) {
      const auraDamage = Math.round(computed.damageAuraPerSecond * (effectiveDelta / 1000));
      if (auraDamage > 0) {
        enemy.health.current = Math.max(0, enemy.health.current - auraDamage);
      }
    }
  }

  // 3. Process hex damage aura (only in hex_veil stance)
  // Note: getActiveEnemy() uses activeEnemyQuery which already excludes dying enemies
  if (player.stanceState?.activeStanceId === 'hex_veil' && computed.hexDamageAura > 0) {
    const enemy = getActiveEnemy();
    if (enemy?.health) {
      const hexAuraDamage = computed.hexDamageAura * computed.hexIntensityMultiplier;
      const auraDamage = Math.round(hexAuraDamage * (effectiveDelta / 1000));
      if (auraDamage > 0) {
        enemy.health.current = Math.max(0, enemy.health.current - auraDamage);
      }
    }
  }
}
