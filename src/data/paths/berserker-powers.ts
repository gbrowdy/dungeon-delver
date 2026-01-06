import type { Power } from '@/types/game';

/**
 * Berserker Path Powers
 *
 * Level 2: Choose Power 1 (Rage Strike vs Savage Slam)
 * Level 4: Choose Power 2 (Berserker Roar vs Reckless Charge)
 * Level 6: Choose Power 3 (Bloodthirst vs Unstoppable Force)
 * Level 8: Subpath grants Power 4 (Warcry vs Death Sentence)
 */

export interface PowerUpgrade {
  tier: 1 | 2;
  description: string;
  // Stat changes
  value?: number;
  cooldown?: number;
  resourceCost?: number;
  // Special effects
  damageThreshold?: number; // HP threshold for bonus damage
  guaranteedCrit?: boolean;
  stunDuration?: number;
  bonusDamageToStunned?: number;
  buffDuration?: number;
  buffPower?: number;
  buffSpeed?: number;
  lifesteal?: number;
  selfDamagePercent?: number;
  healOnKill?: number;
  shieldOnOverheal?: number;
  cooldownReductionOnKill?: number;
  deathImmunityDuration?: number;
  reflectDuringImmunity?: number;
}

export interface BerserkerPower extends Power {
  upgrades: [PowerUpgrade, PowerUpgrade]; // T1, T2
}

// Level 2 Powers
const RAGE_STRIKE: BerserkerPower = {
  id: 'rage_strike',
  name: 'Rage Strike',
  description: 'Deal 200% damage. +50% damage if below 50% HP.',
  icon: 'power-rage_strike',
  manaCost: 0,
  resourceCost: 30,
  cooldown: 5,
  effect: 'damage',
  value: 2.0,
  category: 'strike',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '240% damage, threshold 60% HP',
      value: 2.4,
      damageThreshold: 60,
    },
    {
      tier: 2,
      description: 'Guaranteed crit if below threshold',
      guaranteedCrit: true,
    },
  ],
};

const SAVAGE_SLAM: BerserkerPower = {
  id: 'savage_slam',
  name: 'Savage Slam',
  description: 'Deal 150% damage. Stun for 1.5s.',
  icon: 'power-savage_slam',
  manaCost: 0,
  resourceCost: 50,
  cooldown: 8,
  effect: 'damage',
  value: 1.5,
  category: 'control',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '180% damage, stun 2s',
      value: 1.8,
      stunDuration: 2,
    },
    {
      tier: 2,
      description: 'Stunned enemies take 25% more damage for 4s',
      bonusDamageToStunned: 0.25,
    },
  ],
};

// Level 4 Powers
const BERSERKER_ROAR: BerserkerPower = {
  id: 'berserker_roar',
  name: 'Berserker Roar',
  description: '+40% Power, +25% Speed for 6s.',
  icon: 'power-berserker_roar',
  manaCost: 0,
  resourceCost: 25,
  cooldown: 10,
  effect: 'buff',
  value: 0.4,
  category: 'buff',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '+50% Power, +35% Speed, 8s duration',
      buffPower: 0.5,
      buffSpeed: 0.35,
      buffDuration: 8,
    },
    {
      tier: 2,
      description: 'Also grants 15% lifesteal during buff',
      lifesteal: 0.15,
    },
  ],
};

const RECKLESS_CHARGE: BerserkerPower = {
  id: 'reckless_charge',
  name: 'Reckless Charge',
  description: 'Deal 150% damage. Lose 10% max HP.',
  icon: 'power-reckless_charge',
  manaCost: 0,
  resourceCost: 35,
  cooldown: 6,
  effect: 'damage',
  value: 1.5,
  category: 'sacrifice',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '200% damage, self-damage 8%',
      value: 2.0,
      selfDamagePercent: 8,
    },
    {
      tier: 2,
      description: 'If this kills, heal for 20% max HP',
      healOnKill: 20,
    },
  ],
};

// Level 6 Powers
const BLOODTHIRST: BerserkerPower = {
  id: 'bloodthirst',
  name: 'Bloodthirst',
  description: 'Deal 160% damage. Heal 100% of damage dealt.',
  icon: 'power-bloodthirst',
  manaCost: 0,
  resourceCost: 50,
  cooldown: 8,
  effect: 'damage',
  value: 1.6,
  category: 'heal',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '200% damage, overheal becomes shield (max 20% HP)',
      value: 2.0,
      shieldOnOverheal: 20,
    },
    {
      tier: 2,
      description: 'Cooldown reduced by 2s per kill',
      cooldownReductionOnKill: 2,
    },
  ],
};

const UNSTOPPABLE_FORCE: BerserkerPower = {
  id: 'unstoppable_force',
  name: 'Unstoppable Force',
  description: 'Deal 300% damage. Immune to death for 3s.',
  icon: 'power-unstoppable_force',
  manaCost: 0,
  resourceCost: 60,
  cooldown: 12,
  effect: 'damage',
  value: 3.0,
  category: 'strike',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: '400% damage, immunity 4s',
      value: 4.0,
      deathImmunityDuration: 4,
    },
    {
      tier: 2,
      description: 'During immunity, reflect 50% damage taken',
      reflectDuringImmunity: 0.5,
    },
  ],
};

// Level 8 Subpath Powers
const WARCRY: BerserkerPower = {
  id: 'warcry',
  name: 'Warcry',
  description: 'Stun 2s, enemy -25% damage for 8s.',
  icon: 'power-warcry',
  manaCost: 0,
  resourceCost: 40,
  cooldown: 15,
  effect: 'debuff',
  value: 0,
  category: 'control',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: 'Stun 2.5s, debuff -35% damage',
      stunDuration: 2.5,
    },
    {
      tier: 2,
      description: 'Your attacks during stun deal +50% damage',
      bonusDamageToStunned: 0.5,
    },
  ],
};

const DEATH_SENTENCE: BerserkerPower = {
  id: 'death_sentence',
  name: 'Death Sentence',
  description: '200% damage. 500% if enemy <30% HP. Kill resets all CDs.',
  icon: 'power-death_sentence',
  manaCost: 0,
  resourceCost: 70,
  cooldown: 10,
  effect: 'damage',
  value: 2.0,
  category: 'execute',
  synergies: [],
  upgrades: [
    {
      tier: 1,
      description: 'Threshold 35% HP, execute damage 600%',
      damageThreshold: 35,
      value: 6.0,
    },
    {
      tier: 2,
      description: 'Kills also restore 50% max HP',
      healOnKill: 50,
    },
  ],
};

// Power lookup by level
const POWER_CHOICES_BY_LEVEL: Record<number, [BerserkerPower, BerserkerPower]> = {
  2: [RAGE_STRIKE, SAVAGE_SLAM],
  4: [BERSERKER_ROAR, RECKLESS_CHARGE],
  6: [BLOODTHIRST, UNSTOPPABLE_FORCE],
};

// Subpath powers
const SUBPATH_POWERS: Record<string, BerserkerPower> = {
  warlord: WARCRY,
  executioner: DEATH_SENTENCE,
};

export const BERSERKER_POWERS = {
  rage_strike: RAGE_STRIKE,
  savage_slam: SAVAGE_SLAM,
  berserker_roar: BERSERKER_ROAR,
  reckless_charge: RECKLESS_CHARGE,
  bloodthirst: BLOODTHIRST,
  unstoppable_force: UNSTOPPABLE_FORCE,
  warcry: WARCRY,
  death_sentence: DEATH_SENTENCE,
};

export function getBerserkerPowerChoices(level: number): BerserkerPower[] {
  return POWER_CHOICES_BY_LEVEL[level] ?? [];
}

export function getBerserkerSubpathPower(subpathId: string): BerserkerPower | undefined {
  return SUBPATH_POWERS[subpathId];
}

export function getBerserkerPowerUpgrade(powerId: string, tier: number): PowerUpgrade | undefined {
  const power = BERSERKER_POWERS[powerId as keyof typeof BERSERKER_POWERS];
  if (!power || tier < 1 || tier > 2) return undefined;
  return power.upgrades[tier - 1];
}
