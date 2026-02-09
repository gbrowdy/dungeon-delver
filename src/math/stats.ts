// src/math/stats.ts
//
// Derived stats from the 4 core stats.
// Design doc Section 2: HP, attack interval, crit chance, crit damage, dodge chance.
// All formulas are pure — no side effects.

import {
  MIN_SPEED,
  HP_PER_FORTITUDE,
  ATTACK_INTERVAL_NUMERATOR,
  CRIT_CHANCE_BASE,
  CRIT_CHANCE_PER_LUCK,
  CRIT_CHANCE_CAP,
  CRIT_DAMAGE_BASE,
  CRIT_DAMAGE_PER_LUCK,
  CRIT_DAMAGE_CAP,
  DODGE_PER_LUCK,
  DODGE_CHANCE_CAP,
} from './balance';

/**
 * HP = base_hp + (fortitude * HP_PER_FORTITUDE)
 */
export function getMaxHp(baseHp: number, fortitude: number): number {
  return baseHp + fortitude * HP_PER_FORTITUDE;
}

/**
 * attack_interval = ATTACK_INTERVAL_NUMERATOR / max(speed, MIN_SPEED) ms
 *
 * Speed has natural diminishing returns: going 10->20 halves the interval,
 * but 100->110 barely moves it. This is why Speed draft picks stay flat (+1/+2).
 */
export function getAttackInterval(speed: number): number {
  const effectiveSpeed = Math.max(speed, MIN_SPEED);
  return Math.round(ATTACK_INTERVAL_NUMERATOR / effectiveSpeed);
}

/**
 * crit_chance = min(CRIT_CHANCE_BASE + luck * CRIT_CHANCE_PER_LUCK, CRIT_CHANCE_CAP)
 * Hard cap: 60%
 */
export function getCritChance(luck: number): number {
  return Math.min(CRIT_CHANCE_BASE + luck * CRIT_CHANCE_PER_LUCK, CRIT_CHANCE_CAP);
}

/**
 * crit_damage = CRIT_DAMAGE_BASE + min(luck * CRIT_DAMAGE_PER_LUCK, CRIT_DAMAGE_CAP - CRIT_DAMAGE_BASE)
 * Cap: 2.5x (at luck 25+)
 */
export function getCritDamage(luck: number): number {
  return CRIT_DAMAGE_BASE + Math.min(luck * CRIT_DAMAGE_PER_LUCK, CRIT_DAMAGE_CAP - CRIT_DAMAGE_BASE);
}

/**
 * dodge_chance = min(luck * DODGE_PER_LUCK, DODGE_CHANCE_CAP)
 * Hard cap: 30%. Player-only (enemies cannot dodge).
 */
export function getDodgeChance(luck: number): number {
  return Math.min(luck * DODGE_PER_LUCK, DODGE_CHANCE_CAP);
}
