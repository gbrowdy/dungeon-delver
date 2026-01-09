import type { Power } from '@/types/game';

/**
 * Archmage Path Powers
 *
 * Level 2: Choose Power 1 (Arcane Bolt vs Meteor Strike)
 * Level 4: Choose Power 2 (Arcane Empowerment vs Arcane Weakness)
 * Level 6: Choose Power 3 (Siphon Soul vs Arcane Surge)
 * Level 8: Subpath grants Power 4 (Spellstorm vs Annihilate)
 */

export interface PowerUpgrade {
  tier: 1 | 2;
  description: string;
  value?: number;
  cooldown?: number;
  resourceCost?: number;
  // Buff upgrades
  buffPower?: number;
  buffSpeed?: number;
  buffDuration?: number;
  buffCritChance?: number;
  // Debuff upgrades (field names must match base power properties)
  enemyVulnerable?: number;
  enemyVulnerableDuration?: number;
  enemySlowPercent?: number;
  // Sustain upgrades
  lifestealPercent?: number;
  shieldOnFullHeal?: number;
  // Utility upgrades
  chargeModify?: number;
  stunDuration?: number;
  healOnKill?: number;
  // Visual
  visualMultiHit?: { count: number; interval: number };
}

export interface ArchmagePower extends Power {
  upgrades: [PowerUpgrade, PowerUpgrade];
}

// =============================================================================
// LEVEL 2 POWERS (Choose Power 1)
// =============================================================================

/**
 * Arcane Bolt - Efficient spammable spell
 * Low cost, fast cooldown - good for sustained damage
 */
const ARCANE_BOLT: ArchmagePower = {
  id: 'arcane_bolt',
  name: 'Arcane Bolt',
  description: 'Deal 150% damage. Low charge cost.',
  icon: 'power-arcane_bolt',
  resourceCost: 15,
  cooldown: 4,
  effect: 'damage',
  value: 1.5,
  category: 'spell',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '180% damage, 12 charge cost',
      value: 1.8,
      resourceCost: 12,
    },
    {
      tier: 2,
      description: 'Cooldown reduced to 3s',
      cooldown: 3,
    },
  ],
};

/**
 * Meteor Strike - High damage nuke
 * High cost, slow cooldown - good for burst damage
 */
const METEOR_STRIKE: ArchmagePower = {
  id: 'meteor_strike',
  name: 'Meteor Strike',
  description: 'Deal 450% damage. High charge cost.',
  icon: 'power-meteor_strike',
  resourceCost: 60,
  cooldown: 12,
  effect: 'damage',
  value: 4.5,
  category: 'spell',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '550% damage',
      value: 5.5,
    },
    {
      tier: 2,
      description: 'Stuns enemy for 2s on hit',
      stunDuration: 2,
    },
  ],
};

// =============================================================================
// LEVEL 4 POWERS (Choose Power 2)
// =============================================================================

/**
 * Arcane Empowerment - Self-buff for power and speed
 * Offensive support - boost your own damage output
 */
const ARCANE_EMPOWERMENT: ArchmagePower = {
  id: 'arcane_empowerment',
  name: 'Arcane Empowerment',
  description: '+35% Power, +20% Speed for 6s.',
  icon: 'power-arcane_empowerment',
  resourceCost: 25,
  cooldown: 12,
  effect: 'buff',
  value: 0.35,
  category: 'buff',
  synergies: [],
  buffStats: [
    { stat: 'power', value: 0.35 },
    { stat: 'speed', value: 0.20 },
  ],
  buffDuration: 6,
  upgrades: [
    {
      tier: 1,
      description: '+45% Power, +30% Speed, 8s duration',
      buffPower: 0.45,
      buffSpeed: 0.30,
      buffDuration: 8,
    },
    {
      tier: 2,
      description: 'Also grants +15% critical hit chance',
      buffCritChance: 0.15,
    },
  ],
};

/**
 * Arcane Weakness - Debuff enemy to take more damage
 * Amplifies all damage sources - good for sustained fights
 */
const ARCANE_WEAKNESS: ArchmagePower = {
  id: 'arcane_weakness',
  name: 'Arcane Weakness',
  description: 'Enemy takes 25% more damage for 8s.',
  icon: 'power-arcane_weakness',
  resourceCost: 20,
  cooldown: 10,
  effect: 'debuff',
  value: 0,
  category: 'debuff',
  synergies: [],
  enemyVulnerable: 25,
  enemyVulnerableDuration: 8,
  upgrades: [
    {
      tier: 1,
      description: '35% more damage, 10s duration',
      enemyVulnerable: 35,
      enemyVulnerableDuration: 10,
    },
    {
      tier: 2,
      description: 'Enemy also attacks 20% slower',
      enemySlowPercent: 20,
    },
  ],
};

// =============================================================================
// LEVEL 6 POWERS (Choose Power 3)
// =============================================================================

/**
 * Siphon Soul - Damage with lifesteal
 * Sustain option - heal based on damage dealt
 */
const SIPHON_SOUL: ArchmagePower = {
  id: 'siphon_soul',
  name: 'Siphon Soul',
  description: 'Deal 200% damage. Heal 50% of damage dealt.',
  icon: 'power-siphon_soul',
  resourceCost: 35,
  cooldown: 8,
  effect: 'damage',
  value: 2.0,
  category: 'sustain',
  synergies: [],
  lifestealPercent: 50,
  upgrades: [
    {
      tier: 1,
      description: '250% damage, heal 75% of damage dealt',
      value: 2.5,
      lifestealPercent: 75,
    },
    {
      tier: 2,
      description: 'If this heals you to full, gain 15% max HP as shield',
      shieldOnFullHeal: 15,
    },
  ],
};

/**
 * Arcane Surge - Damage with cooldown reset
 * Utility option - enable combo chains by resetting other powers
 */
const ARCANE_SURGE_POWER: ArchmagePower = {
  id: 'arcane_surge_power',
  name: 'Arcane Surge',
  description: 'Deal 180% damage. Reset all other power cooldowns.',
  icon: 'power-arcane_surge',
  resourceCost: 50,
  cooldown: 15,
  effect: 'damage',
  value: 1.8,
  category: 'utility',
  synergies: [],
  resetAllCooldowns: true,
  upgrades: [
    {
      tier: 1,
      description: '220% damage, also restores 30 charges',
      value: 2.2,
      chargeModify: -30,
    },
    {
      tier: 2,
      description: 'Cooldown reduced to 12s',
      cooldown: 12,
    },
  ],
};
