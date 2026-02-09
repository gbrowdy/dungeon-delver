import type { Power } from '@/types/game';

// Path synergy interface for power definitions
export interface PowerSynergy {
  pathId: string;
  description: string;
}

export interface PowerDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  resourceCost: number;
  cooldown: number;
  category: 'strike' | 'burst' | 'execute' | 'control' | 'buff' | 'sacrifice' | 'heal';
  effect: 'damage' | 'heal' | 'buff' | 'debuff';
  value: number;
  synergies: PowerSynergy[];
  maxLevel?: number;
  additionalEffects?: string;
}

/**
 * POWER CATEGORIES:
 *
 * Powers are VERBS, not numbers. Each power does something mechanically distinct.
 *
 * - STRIKE: Single reliable hit (Crushing Blow, Power Strike)
 * - BURST: Multiple small hits that proc on-hit effects (Fan of Knives, Flurry)
 * - EXECUTE: Bonus damage vs low HP enemies (Ambush, Coup de Grace)
 * - CONTROL: Change combat flow (Frost Nova, Stunning Blow)
 * - BUFF: Temporary stat boost (Battle Cry, Inner Focus)
 * - SACRIFICE: Spend HP for effect (Reckless Swing, Blood Pact)
 * - HEAL: Restore HP (Divine Heal, Regeneration)
 */

/**
 * UNLOCKABLE POWERS
 *
 * Redesigned with verb-focused mechanics and path synergies.
 * Each power has a unique mechanical identity.
 */
export const POWER_DEFINITIONS: PowerDefinition[] = [
  // ============================================================================
  // STRIKE POWERS - Single reliable hits
  // ============================================================================
  {
    id: 'crushing-blow',
    name: 'Crushing Blow',
    description: 'A devastating single strike dealing 150% damage',
    icon: 'power-crushing_blow',
    resourceCost: 30,
    cooldown: 5,
    category: 'strike',
    effect: 'damage',
    value: 1.5,
    synergies: [
      { pathId: 'berserker', description: 'Low HP bonuses increase damage' },
      { pathId: 'guardian', description: 'Triggers counter-attack effects' },
      { pathId: 'paladin_crusader', description: 'Deals bonus holy damage' },
    ],
  },
  {
    id: 'power-strike',
    name: 'Power Strike',
    description: 'Basic but effective strike dealing 120% damage',
    icon: 'power-power_strike',
    resourceCost: 20,
    cooldown: 3,
    category: 'strike',
    effect: 'damage',
    value: 1.2,
    synergies: [
      { pathId: 'guardian', description: 'Benefits from armor scaling' },
      { pathId: 'paladin_protector', description: 'Grants HP regen on hit' },
    ],
  },

  // ============================================================================
  // BURST POWERS - Multiple hits (great for on-hit procs)
  // ============================================================================
  {
    id: 'fan-of-knives',
    name: 'Fan of Knives',
    description: '5 quick hits of 30% damage each (150% total, procs on-hit effects)',
    icon: 'power-fan_of_knives',
    resourceCost: 35,
    cooldown: 6,
    category: 'burst',
    effect: 'damage',
    value: 1.5, // Total damage, delivered as 5x 0.3
    synergies: [
      { pathId: 'assassin', description: 'Each hit can crit independently' },
      { pathId: 'duelist', description: 'Triggers riposte effects multiple times' },
    ],
    additionalEffects: 'Hits 5 times for 30% damage each',
  },
  {
    id: 'flurry',
    name: 'Flurry',
    description: '3 rapid strikes of 50% damage each (150% total)',
    icon: 'power-flurry',
    resourceCost: 25,
    cooldown: 4,
    category: 'burst',
    effect: 'damage',
    value: 1.5,
    synergies: [
      { pathId: 'berserker', description: 'Speed bonuses reduce cooldown' },
      { pathId: 'assassin', description: 'Builds kill chain momentum' },
    ],
    additionalEffects: 'Hits 3 times for 50% damage each',
  },

  // ============================================================================
  // EXECUTE POWERS - Bonus vs low HP enemies
  // ============================================================================
  {
    id: 'ambush',
    name: 'Ambush',
    description: 'Deal 100% damage, doubled against enemies below 25% HP',
    icon: 'power-ambush',
    resourceCost: 30,
    cooldown: 5,
    category: 'execute',
    effect: 'damage',
    value: 1.0,
    synergies: [
      { pathId: 'assassin', description: 'Guaranteed crit on execute' },
      { pathId: 'berserker', description: 'Resets cooldown on kill' },
    ],
    additionalEffects: 'Deals 200% damage to enemies below 25% HP',
  },
  {
    id: 'coup-de-grace',
    name: 'Coup de Grace',
    description: 'Massive 250% damage strike to enemies below 30% HP, else 80%',
    icon: 'power-coup_de_grace',
    resourceCost: 40,
    cooldown: 8,
    category: 'execute',
    effect: 'damage',
    value: 0.8,
    synergies: [
      { pathId: 'berserker', description: 'Executioner synergy amplifies damage' },
      { pathId: 'assassin', description: 'Instantly resets on kill' },
    ],
    additionalEffects: 'Deals 250% damage to enemies below 30% HP',
  },

  // ============================================================================
  // CONTROL POWERS - Change combat flow
  // ============================================================================
  {
    id: 'frost-nova',
    name: 'Frost Nova',
    description: 'Deal 110% damage and slow enemy attack speed by 30% for 4s',
    icon: 'power-frost_nova',
    resourceCost: 35,
    cooldown: 6,
    category: 'control',
    effect: 'debuff',
    value: 1.1,
    synergies: [
      { pathId: 'archmage', description: 'Elementalist combos with ice affinity' },
      { pathId: 'enchanter', description: 'DoT effects extended' },
    ],
    additionalEffects: 'Slows enemy by 30% for 4 seconds',
  },
  {
    id: 'stunning-blow',
    name: 'Stunning Blow',
    description: 'Deal 100% damage with 40% chance to stun for 2s',
    icon: 'power-stunning_blow',
    resourceCost: 30,
    cooldown: 5,
    category: 'control',
    effect: 'debuff',
    value: 1.0,
    synergies: [
      { pathId: 'berserker', description: 'Warlord increases stun chance' },
      { pathId: 'guardian', description: 'Extends stun duration' },
    ],
    additionalEffects: '40% chance to stun for 2 seconds',
  },

  // ============================================================================
  // BUFF POWERS - Temporary stat boosts
  // ============================================================================
  {
    id: 'battle-cry',
    name: 'Battle Cry',
    description: 'Gain +50% Power and +30% Speed for 6 seconds',
    icon: 'power-battle_cry',
    resourceCost: 40,
    cooldown: 10,
    category: 'buff',
    effect: 'buff',
    value: 0.5,
    synergies: [
      { pathId: 'berserker', description: 'Battle Trance reduces cooldown' },
      { pathId: 'paladin_crusader', description: 'Amplifies smite damage' },
    ],
    additionalEffects: 'Also grants +30% Speed',
  },
  {
    id: 'inner-focus',
    name: 'Inner Focus',
    description: 'Gain +40% Fortune (crit/dodge/proc chance) for 5 seconds',
    icon: 'power-inner_focus',
    resourceCost: 30,
    cooldown: 8,
    category: 'buff',
    effect: 'buff',
    value: 0.4,
    synergies: [
      { pathId: 'assassin', description: 'Shadowblade crit synergies activate' },
      { pathId: 'duelist', description: 'Boosts dodge-based procs' },
    ],
  },

  // ============================================================================
  // SACRIFICE POWERS - Spend HP for effect
  // ============================================================================
  {
    id: 'reckless-swing',
    name: 'Reckless Swing',
    description: 'Spend 15% max HP to deal 200% damage',
    icon: 'power-reckless_swing',
    resourceCost: 25,
    cooldown: 4,
    category: 'sacrifice',
    effect: 'damage',
    value: 2.0,
    synergies: [
      { pathId: 'berserker', description: 'Lowers HP to trigger damage bonuses' },
      { pathId: 'paladin_protector', description: 'Martyr benefits from sacrifice' },
    ],
    additionalEffects: 'Costs 15% max HP',
  },
  {
    id: 'blood-pact',
    name: 'Blood Pact',
    description: 'Spend 20% max HP to restore 50 resource',
    icon: 'power-blood_pact',
    resourceCost: 0,
    cooldown: 12,
    category: 'sacrifice',
    effect: 'heal',
    value: 50,
    synergies: [
      { pathId: 'berserker', description: 'Enables more power usage' },
      { pathId: 'archmage', description: 'Enables more spell casts' },
    ],
    additionalEffects: 'Costs 20% max HP, restores resource instead of HP',
  },

  // ============================================================================
  // HEAL POWERS - Restore HP
  // ============================================================================
  {
    id: 'divine-heal',
    name: 'Divine Heal',
    description: 'Restore 60% of max HP',
    icon: 'power-divine_heal',
    resourceCost: 40,
    cooldown: 10,
    category: 'heal',
    effect: 'heal',
    value: 0.6,
    synergies: [
      { pathId: 'paladin_protector', description: 'Sentinel boosts healing received' },
      { pathId: 'guardian', description: 'Synergizes with regen effects' },
    ],
  },
  {
    id: 'regeneration',
    name: 'Regeneration',
    description: 'Restore 10% max HP immediately, then 3% per second for 5s',
    icon: 'power-regeneration',
    resourceCost: 30,
    cooldown: 8,
    category: 'heal',
    effect: 'heal',
    value: 0.1,
    synergies: [
      { pathId: 'paladin_protector', description: 'Regen scaling amplifies HoT' },
      { pathId: 'enchanter', description: 'DoT amplification extends duration' },
    ],
    additionalEffects: 'Heals 3% max HP per second for 5 seconds (25% total)',
  },

  // ============================================================================
  // ADDITIONAL UNIQUE POWERS
  // ============================================================================
  {
    id: 'earthquake',
    name: 'Earthquake',
    description: 'Massive tremor deals 250% damage',
    icon: 'power-earthquake',
    resourceCost: 60,
    cooldown: 12,
    category: 'strike',
    effect: 'damage',
    value: 2.5,
    synergies: [
      { pathId: 'berserker', description: 'Devastating at low HP' },
      { pathId: 'archmage', description: 'Destroyer amplifies spell power' },
    ],
  },
  {
    id: 'vampiric-touch',
    name: 'Vampiric Touch',
    description: 'Deal 120% damage and heal for 100% of damage dealt',
    icon: 'power-vampiric_touch',
    resourceCost: 45,
    cooldown: 7,
    category: 'heal',
    effect: 'damage',
    value: 1.2,
    synergies: [
      { pathId: 'berserker', description: 'Bloodbath synergy sustains berserker' },
      { pathId: 'paladin_protector', description: 'Healing amplification applies' },
    ],
    additionalEffects: 'Heals for 100% of damage dealt',
  },
];

// Convert PowerDefinition to Power for compatibility
export const UNLOCKABLE_POWERS: Power[] = POWER_DEFINITIONS.map(def => ({
  id: def.id,
  name: def.name,
  description: def.description,
  resourceCost: def.resourceCost,
  cooldown: def.cooldown,
  effect: def.effect,
  value: def.value,
  icon: def.icon,
  category: def.category,
  synergies: def.synergies,
}));
