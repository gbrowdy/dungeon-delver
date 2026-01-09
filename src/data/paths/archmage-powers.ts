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
