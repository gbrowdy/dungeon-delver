/**
 * Fortune Calculation Utilities
 *
 * These utilities derive combat and loot mechanics from the Fortune stat.
 * Fortune is a unified luck stat that affects critical hits, dodging, and item drops.
 */

import { isFeatureEnabled } from '@/constants/features';
import { COMBAT_BALANCE } from '@/constants/balance';

/**
 * Validates that a numeric input is finite (not NaN or Infinity).
 * Logs an error and returns a safe default if invalid.
 */
function validateFiniteNumber(
  value: number,
  functionName: string,
  defaultValue: number
): number {
  if (!Number.isFinite(value)) {
    console.error(
      `[CRITICAL] ${functionName} received invalid value: ${value}`
    );
    return defaultValue;
  }
  return value;
}

/**
 * Calculates critical hit chance based on fortune stat.
 *
 * With FORTUNE_DIMINISHING_RETURNS enabled:
 * - 0-15 fortune: Linear scaling (5% → 35%)
 * - 15+ fortune: Diminished scaling (35% → 50% cap)
 *
 * Legacy formula: 5% base + (fortune * 2%), capped at 50%
 *
 * @param fortune - The character's fortune stat
 * @returns Crit chance as a decimal (0.05 = 5%), capped at 50%
 */
export function getCritChance(fortune: number): number {
  const validatedFortune = validateFiniteNumber(fortune, 'getCritChance', 0);
  const clampedFortune = Math.max(0, validatedFortune);

  if (!isFeatureEnabled('FORTUNE_DIMINISHING_RETURNS')) {
    // Legacy formula
    const baseCritChance = 0.05;
    const fortuneBonus = clampedFortune * 0.02;
    return Math.min(baseCritChance + fortuneBonus, 0.5);
  }

  // Diminishing returns after FORTUNE_LINEAR_CAP
  // 0-15: Linear (5% → 35%)
  // 15+: Diminished (35% → 50% cap)
  if (clampedFortune <= COMBAT_BALANCE.FORTUNE_LINEAR_CAP) {
    return 0.05 + clampedFortune * 0.02;
  }

  const linearPortion = 0.05 + COMBAT_BALANCE.FORTUNE_LINEAR_CAP * 0.02; // 35%
  const diminishedPortion =
    (clampedFortune - COMBAT_BALANCE.FORTUNE_LINEAR_CAP) *
    COMBAT_BALANCE.FORTUNE_DIMINISH_RATE;

  return Math.min(linearPortion + diminishedPortion, 0.5);
}

/**
 * Calculates critical hit damage multiplier based on fortune stat.
 *
 * With FORTUNE_DIMINISHING_RETURNS enabled:
 * - Formula: 150% base + (fortune * 4%), capped at 250%
 *
 * Legacy formula: 150% base + (fortune * 5%), no cap
 *
 * @param fortune - The character's fortune stat
 * @returns Crit damage multiplier as a decimal (1.5 = 150%)
 */
export function getCritDamage(fortune: number): number {
  const validatedFortune = validateFiniteNumber(fortune, 'getCritDamage', 0);
  const clampedFortune = Math.max(0, validatedFortune);
  const baseCritDamage = 1.5; // 150% base (1.5x multiplier)

  if (!isFeatureEnabled('FORTUNE_DIMINISHING_RETURNS')) {
    // Legacy formula (no cap!)
    return baseCritDamage + clampedFortune * 0.05;
  }

  // Capped at CRIT_DAMAGE_CAP (250%)
  const fortuneBonus = clampedFortune * 0.04;
  const maxBonus = COMBAT_BALANCE.CRIT_DAMAGE_CAP - baseCritDamage; // 1.0 (100% bonus)

  return baseCritDamage + Math.min(fortuneBonus, maxBonus);
}

/**
 * Calculates dodge chance based on fortune stat.
 *
 * Formula: fortune * 1%
 * Example: 10 fortune = 10% dodge chance
 *
 * @param fortune - The character's fortune stat
 * @returns Dodge chance as a decimal (0.1 = 10%), capped at 25%
 */
export function getDodgeChance(fortune: number): number {
  const validatedFortune = validateFiniteNumber(fortune, 'getDodgeChance', 0);
  const dodgeChance = Math.max(0, validatedFortune) * 0.01; // 1% per fortune point (non-negative)

  // Cap at 25% to prevent excessive dodging
  return Math.min(dodgeChance, 0.25);
}

/**
 * Calculates item drop quality bonus based on fortune stat.
 *
 * This multiplier affects rarity rolls for item drops, making higher
 * rarity items more likely to drop.
 *
 * Formula: 1.0 + (fortune * 2%)
 * Example: 10 fortune = 1.2x quality multiplier (20% better rolls)
 *
 * @param fortune - The character's fortune stat
 * @returns Quality bonus multiplier (1.2 = 20% bonus)
 */
export function getDropQualityBonus(fortune: number): number {
  const validatedFortune = validateFiniteNumber(
    fortune,
    'getDropQualityBonus',
    0
  );
  const baseMultiplier = 1.0;
  const fortuneBonus = Math.max(0, validatedFortune) * 0.02; // 2% per fortune point (non-negative)

  return baseMultiplier + fortuneBonus;
}

/**
 * Calculates proc chance bonus for item effects based on fortune stat.
 *
 * This multiplier affects the trigger chance of on-hit, on-crit, and
 * other conditional item effects.
 *
 * Formula: 1.0 + (fortune * 1%)
 * Example: 10 fortune = 1.1x proc multiplier (10% more procs)
 *
 * @param fortune - The character's fortune stat
 * @returns Proc chance multiplier (1.1 = 10% bonus)
 */
export function getProcChanceBonus(fortune: number): number {
  const validatedFortune = validateFiniteNumber(
    fortune,
    'getProcChanceBonus',
    0
  );
  const baseMultiplier = 1.0;
  const fortuneBonus = Math.max(0, validatedFortune) * 0.01; // 1% per fortune point (non-negative)

  return baseMultiplier + fortuneBonus;
}
