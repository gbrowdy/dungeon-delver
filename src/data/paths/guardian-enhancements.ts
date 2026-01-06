/**
 * Guardian Stance Enhancements
 *
 * Two linear progression paths, one per stance.
 * At each level-up (3-15), player chooses which path to advance.
 * Enhancements only apply while in that stance.
 */

import type { StanceEnhancement, StanceEnhancementEffect } from '@/types/paths';

export const IRON_PATH_ENHANCEMENTS: StanceEnhancement[] = [
  {
    id: 'iron_1_fortified_skin',
    name: 'Fortified Skin',
    tier: 1,
    description: '+20% Armor',
    stanceId: 'iron_stance',
    effects: [{ type: 'armor_percent', value: 20 }],
  },
  {
    id: 'iron_2_damage_absorption',
    name: 'Damage Absorption',
    tier: 2,
    description: 'Damage reduction increased to 20%',
    stanceId: 'iron_stance',
    effects: [{ type: 'damage_reduction', value: 20 }],
  },
  {
    id: 'iron_3_regenerating_bulwark',
    name: 'Regenerating Bulwark',
    tier: 3,
    description: '+2 HP per second',
    stanceId: 'iron_stance',
    effects: [{ type: 'hp_regen', value: 2 }],
  },
  {
    id: 'iron_4_immovable',
    name: 'Immovable',
    tier: 4,
    description: 'Immune to slows and stuns',
    stanceId: 'iron_stance',
    effects: [{ type: 'cc_immunity', value: true }],
  },
  {
    id: 'iron_5_armor_scaling',
    name: 'Armor Scaling',
    tier: 5,
    description: '+1% damage reduction per 5 Armor',
    stanceId: 'iron_stance',
    effects: [{ type: 'armor_scaling_dr', perArmor: 5 }],
  },
  {
    id: 'iron_6_last_bastion',
    name: 'Last Bastion',
    tier: 6,
    description: 'Below 30% HP: +50% Armor',
    stanceId: 'iron_stance',
    effects: [{ type: 'low_hp_armor', threshold: 30, value: 50 }],
  },
  {
    id: 'iron_7_stalwart_recovery',
    name: 'Stalwart Recovery',
    tier: 7,
    description: '15% chance when hit: heal 5% max HP',
    stanceId: 'iron_stance',
    effects: [{ type: 'on_hit_heal_chance', chance: 15, healPercent: 5 }],
  },
  {
    id: 'iron_8_unbreakable',
    name: 'Unbreakable',
    tier: 8,
    description: "Can't take more than 20% max HP per hit",
    stanceId: 'iron_stance',
    effects: [{ type: 'max_damage_per_hit', percent: 20 }],
  },
  {
    id: 'iron_9_stone_form',
    name: 'Stone Form',
    tier: 9,
    description: 'Remove speed penalty (-15% → 0%)',
    stanceId: 'iron_stance',
    effects: [{ type: 'remove_speed_penalty', value: true }],
  },
  {
    id: 'iron_10_living_fortress',
    name: 'Living Fortress',
    tier: 10,
    description: '+25% max HP',
    stanceId: 'iron_stance',
    effects: [{ type: 'max_hp_percent', value: 25 }],
  },
  {
    id: 'iron_11_regeneration_surge',
    name: 'Regeneration Surge',
    tier: 11,
    description: 'HP regen doubled above 70% HP',
    stanceId: 'iron_stance',
    effects: [{ type: 'regen_multiplier_above_hp', threshold: 70, multiplier: 2 }],
  },
  {
    id: 'iron_12_juggernaut',
    name: 'Juggernaut',
    tier: 12,
    description: 'Armor reduces DoT damage',
    stanceId: 'iron_stance',
    effects: [{ type: 'armor_reduces_dot', value: true }],
  },
  {
    id: 'iron_13_immortal_bulwark',
    name: 'Immortal Bulwark',
    tier: 13,
    description: 'Once per floor: survive lethal at 1 HP',
    stanceId: 'iron_stance',
    effects: [{ type: 'survive_lethal', value: true }],
  },
];

export const RETRIBUTION_PATH_ENHANCEMENTS: StanceEnhancement[] = [
  {
    id: 'retribution_1_sharpened_thorns',
    name: 'Sharpened Thorns',
    tier: 1,
    description: 'Reflect damage increased to 30%',
    stanceId: 'retribution_stance',
    effects: [{ type: 'reflect_percent', value: 30 }],
  },
  {
    id: 'retribution_2_vengeful_strikes',
    name: 'Vengeful Strikes',
    tier: 2,
    description: '+10% damage per hit taken (max 5 stacks)',
    stanceId: 'retribution_stance',
    effects: [{ type: 'damage_per_hit_stack', valuePerStack: 10, maxStacks: 5 }],
  },
  {
    id: 'retribution_3_blood_mirror',
    name: 'Blood Mirror',
    tier: 3,
    description: 'Heal 25% of damage reflected',
    stanceId: 'retribution_stance',
    effects: [{ type: 'heal_from_reflect', percent: 25 }],
  },
  {
    id: 'retribution_4_escalating_revenge',
    name: 'Escalating Revenge',
    tier: 4,
    description: 'Reflect +5% per hit (no cap)',
    stanceId: 'retribution_stance',
    effects: [{ type: 'reflect_scaling_per_hit', value: 5 }],
  },
  {
    id: 'retribution_5_counter_strike',
    name: 'Counter Strike',
    tier: 5,
    description: '20% chance to auto-attack when hit',
    stanceId: 'retribution_stance',
    effects: [{ type: 'counter_attack_chance', chance: 20 }],
  },
  {
    id: 'retribution_6_pain_conduit',
    name: 'Pain Conduit',
    tier: 6,
    description: 'Below 50% HP: reflect doubled',
    stanceId: 'retribution_stance',
    effects: [{ type: 'low_hp_reflect_multiplier', threshold: 50, multiplier: 2 }],
  },
  {
    id: 'retribution_7_thorns_aura',
    name: 'Thorns Aura',
    tier: 7,
    description: 'Enemies take 5 damage per second',
    stanceId: 'retribution_stance',
    effects: [{ type: 'passive_damage_aura', damagePerSecond: 5 }],
  },
  {
    id: 'retribution_8_retaliation',
    name: 'Retaliation',
    tier: 8,
    description: 'After hit: next attack +75% damage',
    stanceId: 'retribution_stance',
    effects: [{ type: 'next_attack_bonus_after_hit', value: 75 }],
  },
  {
    id: 'retribution_9_wrath_accumulator',
    name: 'Wrath Accumulator',
    tier: 9,
    description: '+2% Power per hit (permanent)',
    stanceId: 'retribution_stance',
    effects: [{ type: 'permanent_power_per_hit', value: 2 }],
  },
  {
    id: 'retribution_10_death_reflection',
    name: 'Death Reflection',
    tier: 10,
    description: 'Reflect ignores armor',
    stanceId: 'retribution_stance',
    effects: [{ type: 'reflect_ignores_armor', value: true }],
  },
  {
    id: 'retribution_11_explosive_thorns',
    name: 'Explosive Thorns',
    tier: 11,
    description: '25% on hit: deal 50% Power as burst',
    stanceId: 'retribution_stance',
    effects: [{ type: 'on_hit_burst_chance', chance: 25, powerPercent: 50 }],
  },
  {
    id: 'retribution_12_vengeance_incarnate',
    name: 'Vengeance Incarnate',
    tier: 12,
    description: 'Reflect can crit',
    stanceId: 'retribution_stance',
    effects: [{ type: 'reflect_can_crit', value: true }],
  },
  {
    id: 'retribution_13_avatar_of_punishment',
    name: 'Avatar of Punishment',
    tier: 13,
    description: 'Reflect kills heal 30% max HP',
    stanceId: 'retribution_stance',
    effects: [{ type: 'reflect_kill_heal', percent: 30 }],
  },
];

export function getGuardianEnhancement(
  path: 'iron' | 'retribution',
  tier: number
): StanceEnhancement | undefined {
  const enhancements = path === 'iron'
    ? IRON_PATH_ENHANCEMENTS
    : RETRIBUTION_PATH_ENHANCEMENTS;
  return enhancements.find(e => e.tier === tier);
}

export function getGuardianEnhancementChoices(
  ironTier: number,
  retributionTier: number
): { iron: StanceEnhancement | undefined; retribution: StanceEnhancement | undefined } {
  return {
    iron: getGuardianEnhancement('iron', ironTier + 1),
    retribution: getGuardianEnhancement('retribution', retributionTier + 1),
  };
}
