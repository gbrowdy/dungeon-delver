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
