/**
 * Item Value Calculator
 *
 * Utilities to calculate the "stat point value" of items for balance auditing.
 * Used to ensure consistent value scaling across item tiers.
 */

import { STAT_POINT_VALUES, ITEM_TIER_BUDGETS } from '@/constants/balance';
import type { ShopItem, ShopItemTier } from '@/types/shop';

/**
 * Calculate the raw stat point value of an item's stats.
 * Unknown stats are logged as warnings to help catch typos and missing mappings.
 */
export function calculateStatValue(
  stats: Partial<Record<string, number>>,
  itemId?: string
): number {
  let totalValue = 0;

  for (const [stat, value] of Object.entries(stats)) {
    if (value === undefined) continue;

    const statWeight = STAT_POINT_VALUES[stat as keyof typeof STAT_POINT_VALUES];
    if (statWeight !== undefined) {
      totalValue += value * statWeight;
    } else if (process.env.NODE_ENV !== 'production') {
      // Log unknown stats in development to catch typos and missing mappings
      console.warn(
        `[itemValueCalculator] Unknown stat "${stat}" with value ${value}` +
          (itemId ? ` on item "${itemId}"` : '') +
          ` - not included in value calculation. Add to STAT_POINT_VALUES if valid.`
      );
    }
  }

  return Math.round(totalValue * 100) / 100; // Round to 2 decimal places
}

/**
 * Estimate the effect value of an item based on its effect description.
 * This is a heuristic - effects are complex and context-dependent.
 * Returns 0.5 as default for unrecognized effects (logged in development).
 */
export function estimateEffectValue(item: ShopItem): number {
  if (!item.effect) return 0;

  // Guard against missing description
  if (!item.effect.description) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[itemValueCalculator] Item "${item.id}" has an effect but no description. ` +
          `Returning default value 0.5.`
      );
    }
    return 0.5;
  }

  const desc = item.effect.description.toLowerCase();
  const rawValue = item.effect.value ?? 0;
  const rawChance = item.effect.chance ?? 1;

  // Guard against NaN/Infinity values
  const value = Number.isFinite(rawValue) ? rawValue : 0;
  const chance = Number.isFinite(rawChance) ? rawChance : 1;

  if (!Number.isFinite(rawValue) || !Number.isFinite(rawChance)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[itemValueCalculator] Item "${item.id}" has invalid effect value (${rawValue}) ` +
          `or chance (${rawChance}). Using defaults.`
      );
    }
  }

  // Healing effects
  if (desc.includes('heal') && desc.includes('on kill')) {
    return 0.5 * chance;
  }
  // Crit-based healing (e.g., "Heal 5 HP on critical hit")
  if (desc.includes('heal') && desc.includes('crit')) {
    return (value >= 5 ? 1.0 : 0.5) * chance;
  }
  if (desc.includes('heal') && desc.includes('on hit')) {
    return (value >= 5 ? 1.0 : 0.5) * chance;
  }
  if (desc.includes('heal') && desc.includes('damage dealt')) {
    return value * 25; // Lifesteal: 10% = 2.5 points
  }
  if (desc.includes('hp per second') || desc.includes('hp/sec')) {
    return 1.5 * value;
  }
  if (desc.includes('regenerate') && desc.includes('hp')) {
    return 1.5 * value;
  }
  // General healing (e.g., "Heal 1 HP per second")
  if (desc.includes('heal') && desc.includes('per second')) {
    return 1.5 * value;
  }

  // Damage effects
  if (desc.includes('crit') && desc.includes('damage')) {
    return value >= 0.5 ? 2.5 : 1.0;
  }
  if (desc.includes('below') && desc.includes('hp') && desc.includes('damage')) {
    return value >= 0.5 ? 3.0 : 1.0;
  }
  if (desc.includes('bonus damage') && desc.includes('on hit')) {
    return 0.8 * chance;
  }
  if (desc.includes('3x damage') || desc.includes('3x crit')) {
    return 4.0;
  }

  // Mana effects - check mana + dodge before general dodge
  if (desc.includes('mana') && desc.includes('dodge')) {
    // Mana restoration on dodge (e.g., "50% chance to restore 5 mana on dodge")
    return 0.5 * value * chance;
  }
  if (desc.includes('mana') && desc.includes('on kill')) {
    return 0.3;
  }
  if (desc.includes('mana') && desc.includes('on crit')) {
    return 0.5;
  }
  if (desc.includes('mana') && (desc.includes('per second') || desc.includes('/sec'))) {
    return 1.0 * value;
  }
  if (desc.includes('mana') && desc.includes('regeneration')) {
    return 1.0 * value;
  }
  if (desc.includes('cost') && desc.includes('less')) {
    return 2.0 * (value || 0.2);
  }
  if (desc.includes('refund')) {
    return 2.0 * (value || 0.15);
  }

  // Defensive effects
  if (desc.includes('block') && desc.includes('effective')) {
    return 2.0 * (value || 0.5);
  }
  if (desc.includes('reflect') && desc.includes('damage')) {
    return 1.0;
  }
  if (desc.includes('reduce') && desc.includes('damage')) {
    return 2.5 * (value || 0.05);
  }
  if (desc.includes('dodge') && desc.includes('chance')) {
    // Dodge chance buff (e.g., "+5% dodge chance")
    return 1.5 * (value || 0.05);
  }
  if (desc.includes('avoid') && desc.includes('damage')) {
    return 3.0 * chance;
  }

  // Utility effects
  if (desc.includes('gold')) {
    return 0.5;
  }
  if (desc.includes('cooldown')) {
    return value >= 0.15 ? 0.8 : 0.5;
  }

  // Legendary effects
  if (desc.includes('survive') || desc.includes('lethal')) {
    return 5.0;
  }
  if (desc.includes('revive')) {
    return 4.0;
  }
  if (desc.includes('power') && desc.includes('more damage')) {
    return 4.0 * (value || 0.5);
  }
  if (desc.includes('ignore') && desc.includes('dodge')) {
    return 3.0;
  }

  // Stun/slow effects
  if (desc.includes('stun')) {
    return 2.0 * chance;
  }
  if (desc.includes('slow')) {
    return 1.0 * chance;
  }
  // Attack speed reduction (similar to slow)
  if (desc.includes('attack speed') && desc.includes('reduce')) {
    return 1.0 * chance;
  }

  // Healing effectiveness buff
  if (desc.includes('healing') && desc.includes('effectiveness')) {
    return 1.5 * (value || 0.15);
  }

  // On-hit bonus damage with chance
  if (desc.includes('chance') && desc.includes('deal') && desc.includes('damage')) {
    return 0.8 * chance;
  }

  // Crit-based mana restore
  if (desc.includes('crit') && desc.includes('restore') && desc.includes('mana')) {
    return 1.0;
  }

  // Early combat buffs (first X turns)
  if (desc.includes('first') && desc.includes('turns')) {
    return 1.0;
  }

  // Stacking damage buffs
  if (desc.includes('stack')) {
    return 2.0;
  }

  // Default: minor effect - log in development for awareness
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[itemValueCalculator] Effect "${desc.substring(0, 50)}..." ` +
        `for item "${item.id}" didn't match any known patterns. Using default value 0.5.`
    );
  }
  return 0.5;
}

/**
 * Calculate the total value of an item (stats + effects)
 */
export function calculateTotalItemValue(item: ShopItem): number {
  const statValue = calculateStatValue(item.stats, item.id);
  const effectValue = estimateEffectValue(item);
  return Math.round((statValue + effectValue) * 100) / 100;
}

/**
 * Calculate value per gold for an item.
 * Returns 0 if price is invalid (zero or negative).
 */
export function calculateValuePerGold(item: ShopItem): number {
  if (item.price <= 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        `[itemValueCalculator] Item "${item.id}" has invalid price ${item.price}. ` +
          `Cannot calculate value per gold. Returning 0.`
      );
    }
    return 0;
  }
  const totalValue = calculateTotalItemValue(item);
  return Math.round((totalValue / item.price) * 1000) / 1000; // Value per 1 gold
}

/**
 * Get the expected value budget for an item tier.
 * Returns a default budget for unknown tiers (logged in development).
 */
export function getTierBudget(
  tier: ShopItemTier
): { statPoints: number; effectValue: number; total: number } {
  const tierKey = tier.toUpperCase() as keyof typeof ITEM_TIER_BUDGETS;
  const budget = ITEM_TIER_BUDGETS[tierKey];

  if (!budget) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        `[itemValueCalculator] Unknown tier "${tier}" - no budget defined. ` +
          `Add tier to ITEM_TIER_BUDGETS. Returning default budget.`
      );
    }
    // Return a sensible default rather than crashing
    return {
      statPoints: 5,
      effectValue: 1,
      total: 6,
    };
  }

  return {
    statPoints: budget.statPoints,
    effectValue: budget.effectValue,
    total: budget.statPoints + budget.effectValue,
  };
}

/**
 * Check if an item meets its tier's value budget
 */
export function checkItemValueBudget(item: ShopItem): {
  tier: ShopItemTier;
  statValue: number;
  effectValue: number;
  totalValue: number;
  expectedTotal: number;
  valuePerGold: number;
  status: 'underpowered' | 'balanced' | 'overpowered';
} {
  const statValue = calculateStatValue(item.stats, item.id);
  const effectValue = estimateEffectValue(item);
  const totalValue = statValue + effectValue;
  const budget = getTierBudget(item.tier);
  const valuePerGold = calculateValuePerGold(item);

  // Allow 20% variance from expected total
  const lowerBound = budget.total * 0.8;
  const upperBound = budget.total * 1.2;

  let status: 'underpowered' | 'balanced' | 'overpowered';
  if (totalValue < lowerBound) {
    status = 'underpowered';
  } else if (totalValue > upperBound) {
    status = 'overpowered';
  } else {
    status = 'balanced';
  }

  return {
    tier: item.tier,
    statValue: Math.round(statValue * 100) / 100,
    effectValue: Math.round(effectValue * 100) / 100,
    totalValue: Math.round(totalValue * 100) / 100,
    expectedTotal: budget.total,
    valuePerGold: Math.round(valuePerGold * 1000) / 1000,
    status,
  };
}

export type ItemValueAudit = ReturnType<typeof checkItemValueBudget>;
