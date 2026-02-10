// src/data/enemies.ts
//
// Enemy tier base stats, modifier definitions, and enemy generation.
// Design doc Section 5.

import type { EnemyTier, EnemyModifier, CombatEntity } from '@/types/game';
import {
  GROWTH_RATES,
  BOSS_HP_MULT_BASE,
  BOSS_HP_MULT_PER_FLOOR,
  BREAKPOINT_INTERVAL,
  BREAKPOINT_STAT_BOOST,
} from '@/math/balance';
import { getGrowthMultiplier } from '@/math/scaling';
import { getMaxHp } from '@/math/stats';

// ── Base Stats per Tier ─────────────────────────────────────────

export interface EnemyTierStats {
  hp: number;
  power: number;
  fortitude: number;
  speed: number;
}

export const ENEMY_TIERS: Record<EnemyTier, EnemyTierStats> = {
  common:   { hp: 40, power: 8,  fortitude: 7,  speed: 8 },
  uncommon: { hp: 55, power: 11, fortitude: 9,  speed: 9 },
  rare:     { hp: 75, power: 14, fortitude: 12, speed: 10 },
  boss:     { hp: 100, power: 16, fortitude: 14, speed: 7 },
};

// ── Modifier Definitions ────────────────────────────────────────

export interface ModifierDefinition {
  id: EnemyModifier;
  name: string;
  description: string;
}

/**
 * Modifier effects. Each modifier is either a stat multiplier or a flag.
 * The combat tick reads these to apply modifier behavior.
 *
 * Stat multipliers are applied during enemy generation.
 * Behavioral flags (berserker, venomous, shielded, regenerating)
 * are checked during the combat tick.
 */
export interface ModifierEffect {
  /** Stat multipliers applied at generation time */
  statMults?: Partial<Record<keyof EnemyTierStats, number>>;
  /** Behavioral flags read by the combat tick */
  behavior?: 'berserker' | 'venomous' | 'shielded' | 'regenerating';
}

export const MODIFIER_EFFECTS: Record<EnemyModifier, ModifierEffect> = {
  swift:        { statMults: { speed: 1.4 } },
  armored:      { statMults: { fortitude: 1.3 } },
  berserker:    { behavior: 'berserker' },     // Power * 1.5 below 30% HP (handled in tick)
  regenerating: { behavior: 'regenerating' },   // 2% max HP/sec (handled in tick)
  venomous:     { behavior: 'venomous' },       // Attacks apply poison (handled in tick)
  shielded:     { behavior: 'shielded' },       // 20% HP shield every 8s (handled in tick)
};

export const MODIFIER_LIST: EnemyModifier[] = [
  'swift', 'armored', 'berserker', 'regenerating', 'venomous', 'shielded',
];

// ── Tier Selection Probabilities ────────────────────────────────

/**
 * Returns a random enemy tier based on floor depth.
 * Boss tier is never randomly selected — bosses are placed by the flow system.
 */
export function selectEnemyTier(floor: number): EnemyTier {
  const roll = Math.random();

  // Rare chance increases with floor depth, capping at ~25%
  const rareChance = Math.min(0.05 + floor * 0.002, 0.25);
  // Uncommon starts at 20%, grows to ~40%
  const uncommonChance = Math.min(0.20 + floor * 0.002, 0.40);

  if (roll < rareChance) return 'rare';
  if (roll < rareChance + uncommonChance) return 'uncommon';
  return 'common';
}

// ── Modifier Selection ──────────────────────────────────────────

/**
 * Selects modifiers for an enemy based on tier and floor.
 * - Common enemies: no modifiers
 * - Uncommon: 0-1 modifier (chance increases with floor)
 * - Rare: 1-2 modifiers
 * - Boss: 1-2 modifiers (always at least 1)
 */
export function selectModifiers(tier: EnemyTier, floor: number): EnemyModifier[] {
  if (tier === 'common') return [];

  const pool = [...MODIFIER_LIST];
  const selected: EnemyModifier[] = [];

  const maxMods = tier === 'uncommon' ? 1 : 2;
  const guaranteedMods = tier === 'boss' || tier === 'rare' ? 1 : 0;

  // Chance for each additional modifier
  const modChance = Math.min(0.3 + floor * 0.005, 0.8);

  for (let i = 0; i < maxMods; i++) {
    if (i < guaranteedMods || Math.random() < modChance) {
      const idx = Math.floor(Math.random() * pool.length);
      selected.push(pool[idx]);
      pool.splice(idx, 1); // no duplicate modifiers
    }
  }

  return selected;
}

// ── Enemy Generation ────────────────────────────────────────────

export interface GeneratedEnemy {
  entity: CombatEntity;
  tier: EnemyTier;
  modifiers: EnemyModifier[];
}

/**
 * Generates a complete enemy for the given floor.
 *
 * 1. Pick tier (or use provided tier for bosses)
 * 2. Look up base stats
 * 3. Apply floor scaling via growth multiplier
 * 4. Apply boss HP multiplier if boss
 * 5. Apply breakpoint stat boost if on a breakpoint floor
 * 6. Apply modifier stat multipliers
 * 7. Compute derived stats (HP from fortitude)
 */
export function generateEnemy(
  floor: number,
  tierOverride?: EnemyTier,
  modifierOverride?: EnemyModifier[],
): GeneratedEnemy {
  const tier = tierOverride ?? selectEnemyTier(floor);
  const modifiers = modifierOverride ?? selectModifiers(tier, floor);
  const base = ENEMY_TIERS[tier];

  // Scale base stats with floor depth
  let hp = Math.round(base.hp * getGrowthMultiplier(floor, GROWTH_RATES.hp));
  let power = Math.round(base.power * getGrowthMultiplier(floor, GROWTH_RATES.power));
  let fortitude = Math.round(base.fortitude * getGrowthMultiplier(floor, GROWTH_RATES.fortitude));
  let speed = Math.round(base.speed * getGrowthMultiplier(floor, GROWTH_RATES.speed));

  // Boss HP multiplier: 2.5 + floor * 0.005
  if (tier === 'boss') {
    const bossHpMult = BOSS_HP_MULT_BASE + floor * BOSS_HP_MULT_PER_FLOOR;
    hp = Math.round(hp * bossHpMult);
  }

  // Breakpoint stat boost (every 25 floors)
  if (floor > 0 && floor % BREAKPOINT_INTERVAL === 0) {
    const boost = 1 + BREAKPOINT_STAT_BOOST;
    hp = Math.round(hp * boost);
    power = Math.round(power * boost);
    fortitude = Math.round(fortitude * boost);
    speed = Math.round(speed * boost);
  }

  // Apply modifier stat multipliers
  for (const mod of modifiers) {
    const effect = MODIFIER_EFFECTS[mod];
    if (effect.statMults) {
      if (effect.statMults.hp) hp = Math.round(hp * effect.statMults.hp);
      if (effect.statMults.power) power = Math.round(power * effect.statMults.power);
      if (effect.statMults.fortitude) fortitude = Math.round(fortitude * effect.statMults.fortitude);
      if (effect.statMults.speed) speed = Math.round(speed * effect.statMults.speed);
    }
  }

  // Use fortitude-based HP (enemies use their HP tier stat as base HP, then add fortitude bonus)
  const maxHp = getMaxHp(hp, fortitude);

  const entity: CombatEntity = {
    power,
    fortitude,
    speed,
    luck: 0, // enemies don't have luck
    basePower: power,
    baseSpeed: speed,
    hp: maxHp,
    maxHp,
    attackTimer: 0, // starts ready to attack immediately
    statusEffects: [],
  };

  return { entity, tier, modifiers };
}
