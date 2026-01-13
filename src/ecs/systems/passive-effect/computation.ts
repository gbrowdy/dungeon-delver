// src/ecs/systems/passive-effect/computation.ts
/**
 * Passive effect computation - calculates computed values from stance and enhancements.
 */

import type { Entity } from '../../components';
import { createDefaultComputed } from './state';
import { getGuardianEnhancementById } from '@/data/paths/guardian-enhancements';
import { getEnchanterEnhancementById } from '@/data/paths/enchanter-enhancements';
import { getStancesForPath } from '@/data/stances';
import type { StanceEnhancementEffect } from '@/types/paths';

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

/**
 * Update conditional effect values based on current HP.
 * Called each tick by PassiveEffectSystem.
 *
 * Note: This function is internal to the passive-effect system.
 */
export function updateConditionalEffects(player: Entity): void {
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
