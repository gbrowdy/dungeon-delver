/**
 * Enchanter Stance Enhancements
 *
 * Two linear progression paths, one per stance.
 * At each level-up (3-15), player chooses which path to advance.
 * Enhancements only apply while in that stance.
 *
 * Implementation Status:
 *
 * ARCANE SURGE (burn effects):
 * - All burn effects are defined but burn DoT processing uses hardcoded values.
 * - TODO: Integrate burnDamagePercent, burnProcChance, burnDurationBonus, etc.
 *   into status-effect.ts burn tick processing.
 *
 * HEX VEIL (debuff effects) - Implemented:
 * - hexDamageReduction: combat.ts - reduces enemy damage
 * - hexDamageAmp: combat.ts - increases damage to hexed enemy
 * - hexDisableAbilities: enemy-ability.ts - prevents enemy abilities
 * - hexDamageAura: passive-effect.ts - deals damage per second
 *
 * HEX VEIL (debuff effects) - TODO:
 * - hexSlowPercent: enemy attack speed reduction (tier 2)
 * - hexRegen: HP regen while in hex stance (tier 4)
 * - hexLifesteal: heal on damage to hexed enemy (tier 6)
 * - hexArmorReduction: reduce enemy armor (tier 7)
 * - hexReflect: reflect damage from hexed enemy (tier 8)
 * - hexHealOnEnemyAttack: heal when enemy attacks (tier 12)
 */

import type { StanceEnhancement } from '@/types/paths';

export const ARCANE_SURGE_PATH_ENHANCEMENTS: StanceEnhancement[] = [
  {
    id: 'arcane_surge_1_searing_touch',
    name: 'Searing Touch',
    tier: 1,
    description: 'Burn damage +25%',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_damage_percent', value: 25 }],
  },
  {
    id: 'arcane_surge_2_volatile_magic',
    name: 'Volatile Magic',
    tier: 2,
    description: 'Burn proc chance +15% (35% total)',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_proc_chance', value: 15 }],
  },
  {
    id: 'arcane_surge_3_lingering_flames',
    name: 'Lingering Flames',
    tier: 3,
    description: 'Burn duration +2s',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_duration_bonus', value: 2 }],
  },
  {
    id: 'arcane_surge_4_stacking_inferno',
    name: 'Stacking Inferno',
    tier: 4,
    description: 'Burns can stack up to 3 times',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_max_stacks', value: 3 }],
  },
  {
    id: 'arcane_surge_5_rapid_combustion',
    name: 'Rapid Combustion',
    tier: 5,
    description: 'Burn ticks 25% faster',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_tick_rate', value: 25 }],
  },
  {
    id: 'arcane_surge_6_pyromaniac',
    name: 'Pyromaniac',
    tier: 6,
    description: '+20% damage vs burning enemies',
    stanceId: 'arcane_surge',
    effects: [{ type: 'damage_vs_burning', value: 20 }],
  },
  {
    id: 'arcane_surge_7_eternal_flame',
    name: 'Eternal Flame',
    tier: 7,
    description: 'Critical hits refresh burn duration',
    stanceId: 'arcane_surge',
    effects: [{ type: 'crit_refreshes_burn', value: true }],
  },
  {
    id: 'arcane_surge_8_soul_burn',
    name: 'Soul Burn',
    tier: 8,
    description: 'Heal 15% of burn damage dealt',
    stanceId: 'arcane_surge',
    effects: [{ type: 'lifesteal_from_burns', value: 15 }],
  },
  {
    id: 'arcane_surge_9_wildfire',
    name: 'Wildfire',
    tier: 9,
    description: 'Burn proc chance +25% (60% total)',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_proc_chance', value: 25 }],
  },
  {
    id: 'arcane_surge_10_meltdown',
    name: 'Meltdown',
    tier: 10,
    description: 'Burns deal +50% damage to low HP enemies (<30%)',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_execute_bonus', threshold: 30, value: 50 }],
  },
  {
    id: 'arcane_surge_11_infernal_mastery',
    name: 'Infernal Mastery',
    tier: 11,
    description: 'Burn damage +50%',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_damage_percent', value: 50 }],
  },
  {
    id: 'arcane_surge_12_soulfire',
    name: 'Soulfire',
    tier: 12,
    description: 'Burns ignore armor',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_ignores_armor', value: true }],
  },
  {
    id: 'arcane_surge_13_avatar_of_flame',
    name: 'Avatar of Flame',
    tier: 13,
    description: 'Burn ticks can critically strike',
    stanceId: 'arcane_surge',
    effects: [{ type: 'burn_can_crit', value: true }],
  },
];

export const HEX_VEIL_PATH_ENHANCEMENTS: StanceEnhancement[] = [
  {
    id: 'hex_veil_1_weakening_hex',
    name: 'Weakening Hex',
    tier: 1,
    description: 'Enemy damage reduced by additional 10% (25% total)',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_damage_reduction', value: 10 }],
  },
  {
    id: 'hex_veil_2_chilling_curse',
    name: 'Chilling Curse',
    tier: 2,
    description: 'Enemy attacks 15% slower',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_slow_percent', value: 15 }],
  },
  {
    id: 'hex_veil_3_vulnerability',
    name: 'Vulnerability',
    tier: 3,
    description: 'Hexed enemy takes 10% more damage',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_damage_amp', value: 10 }],
  },
  {
    id: 'hex_veil_4_arcane_drain',
    name: 'Arcane Drain',
    tier: 4,
    description: 'Regenerate 1 HP per second while enemy is hexed',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_regen', value: 1 }],
  },
  {
    id: 'hex_veil_5_deep_curse',
    name: 'Deep Curse',
    tier: 5,
    description: 'Hex effects intensify by 20%',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_intensity', value: 20 }],
  },
  {
    id: 'hex_veil_6_mana_leech',
    name: 'Mana Leech',
    tier: 6,
    description: 'Heal 5% of damage dealt to hexed enemy',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_lifesteal', value: 5 }],
  },
  {
    id: 'hex_veil_7_curse_of_frailty',
    name: 'Curse of Frailty',
    tier: 7,
    description: 'Hexed enemy has -15% armor',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_armor_reduction', value: 15 }],
  },
  {
    id: 'hex_veil_8_retributive_hex',
    name: 'Retributive Hex',
    tier: 8,
    description: 'Reflect 15% damage from hexed enemy',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_reflect', value: 15 }],
  },
  {
    id: 'hex_veil_9_suffocating_curse',
    name: 'Suffocating Curse',
    tier: 9,
    description: 'Hexed enemy takes 5 damage per second',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_damage_aura', value: 5 }],
  },
  {
    id: 'hex_veil_10_curse_mastery',
    name: 'Curse Mastery',
    tier: 10,
    description: 'All hex effects +30%',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_intensity', value: 30 }],
  },
  {
    id: 'hex_veil_11_doom_mark',
    name: 'Doom Mark',
    tier: 11,
    description: 'Hexed enemy takes 25% more damage',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_damage_amp', value: 25 }],
  },
  {
    id: 'hex_veil_12_life_drain_aura',
    name: 'Life Drain Aura',
    tier: 12,
    description: 'Heal 3% max HP when hexed enemy attacks',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_heal_on_enemy_attack', value: 3 }],
  },
  {
    id: 'hex_veil_13_master_hexer',
    name: 'Master Hexer',
    tier: 13,
    description: 'Disable enemy special abilities',
    stanceId: 'hex_veil',
    effects: [{ type: 'hex_disable_abilities', value: true }],
  },
];

export function getEnchanterEnhancement(
  path: 'arcane_surge' | 'hex_veil',
  tier: number
): StanceEnhancement | undefined {
  const enhancements = path === 'arcane_surge'
    ? ARCANE_SURGE_PATH_ENHANCEMENTS
    : HEX_VEIL_PATH_ENHANCEMENTS;
  return enhancements.find(e => e.tier === tier);
}

export function getEnchanterEnhancementChoices(
  arcaneSurgeTier: number,
  hexVeilTier: number
): { arcaneSurge: StanceEnhancement | undefined; hexVeil: StanceEnhancement | undefined } {
  return {
    arcaneSurge: getEnchanterEnhancement('arcane_surge', arcaneSurgeTier + 1),
    hexVeil: getEnchanterEnhancement('hex_veil', hexVeilTier + 1),
  };
}

export function getEnchanterEnhancementById(enhancementId: string): StanceEnhancement | undefined {
  const allEnhancements = [...ARCANE_SURGE_PATH_ENHANCEMENTS, ...HEX_VEIL_PATH_ENHANCEMENTS];
  return allEnhancements.find(e => e.id === enhancementId);
}
