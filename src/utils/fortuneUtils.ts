/**
 * Fortune Calculation Utilities
 *
 * These utilities derive combat and loot mechanics from the Fortune stat.
 * Fortune is a unified luck stat that affects critical hits, dodging, and item drops.
 */

/**
 * Calculates critical hit chance based on fortune stat.
 *
 * Formula: 5% base + (fortune * 2%)
 * Example: 10 fortune = 25% crit chance
 *
 * @param fortune - The character's fortune stat
 * @returns Crit chance as a decimal (0.05 = 5%), capped at 50%
 */
export function getCritChance(fortune: number): number {
  const baseCritChance = 0.05; // 5% base
  const fortuneBonus = Math.max(0, fortune) * 0.02; // 2% per fortune point (non-negative)
  const critChance = baseCritChance + fortuneBonus;

  // Cap at 50% to prevent guaranteed crits
  return Math.min(critChance, 0.5);
}

/**
 * Calculates critical hit damage multiplier based on fortune stat.
 *
 * Formula: 150% base + (fortune * 5%)
 * Example: 10 fortune = 200% crit damage (2x damage)
 *
 * @param fortune - The character's fortune stat
 * @returns Crit damage multiplier as a decimal (1.5 = 150%)
 */
export function getCritDamage(fortune: number): number {
  const baseCritDamage = 1.5; // 150% base (1.5x multiplier)
  const fortuneBonus = Math.max(0, fortune) * 0.05; // 5% per fortune point (non-negative)

  return baseCritDamage + fortuneBonus;
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
  const dodgeChance = Math.max(0, fortune) * 0.01; // 1% per fortune point (non-negative)

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
  const baseMultiplier = 1.0;
  const fortuneBonus = Math.max(0, fortune) * 0.02; // 2% per fortune point (non-negative)

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
  const baseMultiplier = 1.0;
  const fortuneBonus = Math.max(0, fortune) * 0.01; // 1% per fortune point (non-negative)

  return baseMultiplier + fortuneBonus;
}
