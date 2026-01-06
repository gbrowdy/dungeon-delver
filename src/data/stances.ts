/**
 * Stance Definitions for Passive Paths
 *
 * Each passive path has 2 stances that provide distinct playstyle choices.
 * Stances are mutually exclusive - only one can be active at a time.
 * Players can switch stances with a 5-second cooldown.
 *
 * Path → Stance mapping:
 * - Guardian (Warrior) → Iron Stance, Retribution Stance
 * - Enchanter (Mage) → Arcane Stance, Disruption Stance
 * - Duelist (Rogue) → Evasion Stance, Counter Stance
 * - Protector (Paladin) → Healing Stance, Bulwark Stance
 */

import type { PassiveStance } from '@/types/paths';

/** Default cooldown for switching stances (milliseconds) */
export const DEFAULT_STANCE_COOLDOWN = 5000;

// ============================================================================
// GUARDIAN STANCES (Warrior - Passive Path)
// ============================================================================

export const GUARDIAN_STANCES: PassiveStance[] = [
  {
    id: 'iron_stance',
    name: 'Iron Stance',
    description: '+25% Armor, -15% Attack Speed. Reduce incoming damage by 15%.',
    icon: 'shield',
    effects: [
      { type: 'stat_modifier', stat: 'armor', percentBonus: 0.25 },
      { type: 'stat_modifier', stat: 'speed', percentBonus: -0.15 },
      { type: 'damage_modifier', damageType: 'incoming', multiplier: 0.85 },
    ],
    switchCooldown: DEFAULT_STANCE_COOLDOWN,
  },
  {
    id: 'retribution_stance',
    name: 'Retribution Stance',
    description: '+15% Power, +10% Armor. Reflect 20% of damage taken.',
    icon: 'swords',
    effects: [
      { type: 'stat_modifier', stat: 'power', percentBonus: 0.15 },
      { type: 'stat_modifier', stat: 'armor', percentBonus: 0.10 },
      { type: 'behavior_modifier', behavior: 'reflect_damage', value: 0.20 },
    ],
    switchCooldown: DEFAULT_STANCE_COOLDOWN,
  },
];

// ============================================================================
// ENCHANTER STANCES (Mage - Passive Path)
// ============================================================================

export const ENCHANTER_STANCES: PassiveStance[] = [
  {
    id: 'arcane_surge',
    name: 'Arcane Surge',
    description: '+15% Power, +10% Speed. 20% chance to proc Arcane Burn (bonus damage + DoT).',
    icon: 'sparkles',
    effects: [
      { type: 'stat_modifier', stat: 'power', percentBonus: 0.15 },
      { type: 'stat_modifier', stat: 'speed', percentBonus: 0.10 },
      { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 },
    ],
    switchCooldown: DEFAULT_STANCE_COOLDOWN,
  },
  {
    id: 'hex_veil',
    name: 'Hex Veil',
    description: '+15% Armor, +10% Speed. Enemies deal 15% less damage.',
    icon: 'shield-alert',
    effects: [
      { type: 'stat_modifier', stat: 'armor', percentBonus: 0.15 },
      { type: 'stat_modifier', stat: 'speed', percentBonus: 0.10 },
      { type: 'behavior_modifier', behavior: 'hex_aura', value: 0.15 },
    ],
    switchCooldown: DEFAULT_STANCE_COOLDOWN,
  },
];

// ============================================================================
// DUELIST STANCES (Rogue - Passive Path)
// ============================================================================

export const DUELIST_STANCES: PassiveStance[] = [
  {
    id: 'evasion_stance',
    name: 'Evasion Stance',
    description: '+20% Speed. Auto-negate 15% of attacks.',
    icon: 'wind',
    effects: [
      { type: 'stat_modifier', stat: 'speed', percentBonus: 0.20 },
      { type: 'behavior_modifier', behavior: 'auto_block', value: 0.15 },
    ],
    switchCooldown: DEFAULT_STANCE_COOLDOWN,
  },
  {
    id: 'counter_stance',
    name: 'Counter Stance',
    description: '+20% Power, +10% Speed. 25% chance to counter-attack when hit.',
    icon: 'swords',
    effects: [
      { type: 'stat_modifier', stat: 'power', percentBonus: 0.20 },
      { type: 'stat_modifier', stat: 'speed', percentBonus: 0.10 },
      { type: 'behavior_modifier', behavior: 'counter_attack', value: 0.25 },
    ],
    switchCooldown: DEFAULT_STANCE_COOLDOWN,
  },
];

// ============================================================================
// PROTECTOR STANCES (Paladin - Passive Path)
// ============================================================================

export const PROTECTOR_STANCES: PassiveStance[] = [
  {
    id: 'healing_stance',
    name: 'Healing Stance',
    description: '+50% HP regen, +10% max HP. Heal 3% of damage dealt.',
    icon: 'heart-pulse',
    effects: [
      { type: 'stat_modifier', stat: 'health', percentBonus: 0.50, applyTo: 'regen' },
      { type: 'stat_modifier', stat: 'maxHealth', percentBonus: 0.10 },
      { type: 'behavior_modifier', behavior: 'lifesteal', value: 0.03 },
    ],
    switchCooldown: DEFAULT_STANCE_COOLDOWN,
  },
  {
    id: 'bulwark_stance',
    name: 'Bulwark Stance',
    description: '+30% Armor, +15% max HP. Reduce incoming damage by 10%.',
    icon: 'shield-check',
    effects: [
      { type: 'stat_modifier', stat: 'armor', percentBonus: 0.30 },
      { type: 'stat_modifier', stat: 'maxHealth', percentBonus: 0.15 },
      { type: 'damage_modifier', damageType: 'incoming', multiplier: 0.90 },
    ],
    switchCooldown: DEFAULT_STANCE_COOLDOWN,
  },
];

// ============================================================================
// STANCE LOOKUP UTILITIES
// ============================================================================

/** Map of path IDs to their available stances */
export const PATH_STANCES: Record<string, PassiveStance[]> = {
  guardian: GUARDIAN_STANCES,
  enchanter: ENCHANTER_STANCES,
  duelist: DUELIST_STANCES,
  paladin_protector: PROTECTOR_STANCES,
};

/**
 * Get stances available for a given path ID
 * Returns empty array if path has no stances (active paths)
 */
export function getStancesForPath(pathId: string): PassiveStance[] {
  return PATH_STANCES[pathId] ?? [];
}

/**
 * Get the default stance ID for a path
 * Returns the first stance's ID, or undefined if no stances
 */
export function getDefaultStanceId(pathId: string): string | undefined {
  const stances = getStancesForPath(pathId);
  return stances[0]?.id;
}

/**
 * Check if a path has stances (is a passive path)
 */
export function pathHasStances(pathId: string): boolean {
  return (PATH_STANCES[pathId]?.length ?? 0) > 0;
}
