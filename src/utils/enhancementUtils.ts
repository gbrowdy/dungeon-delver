/**
 * Enhancement utility functions for the shop system
 * Handles enhancement calculations, cost, and stat bonuses
 */

import type { Item, Stats } from '@/types/game';
import type { ShopTier } from '@/types/shop';
import {
  ENHANCEMENT_COST,
  MAX_ENHANCEMENT_LEVEL,
  ENHANCEMENT_BONUSES,
} from '@/constants/shop';

/**
 * Get the primary and secondary stats from an item's stat bonus
 * Primary is the first non-zero stat, secondary is the second
 */
function getPrimaryAndSecondaryStats(statBonus: Partial<Stats>): {
  primary: keyof Stats | null;
  secondary: keyof Stats | null;
} {
  const stats = Object.entries(statBonus).filter(([_, v]) => v && v !== 0);
  return {
    primary: stats[0]?.[0] as keyof Stats ?? null,
    secondary: stats[1]?.[0] as keyof Stats ?? null,
  };
}

/**
 * Get the enhanced stats for an item (base stats + enhancement bonus)
 * This is what the item actually provides when equipped
 *
 * @param item - The item to calculate enhanced stats for
 * @returns The combined base + enhancement stats
 *
 * @example
 * // Warrior's Blade: base { power: 4, fortune: 5 }, tier: 'class', enhancementLevel: 2
 * // Enhancement bonus: 2 * 2 = +4 to primary (power)
 * // Result: { power: 8, fortune: 5 }
 */
export function getEnhancedStats(item: Item): Partial<Stats> {
  // Start with base stats
  const enhancedStats = { ...item.statBonus };

  // If no tier or no enhancement level, return base stats
  if (!item.tier || item.enhancementLevel === 0) {
    return enhancedStats;
  }

  // Get enhancement config for this tier
  const enhancementConfig = ENHANCEMENT_BONUSES[item.tier];
  if (!enhancementConfig) {
    // Fallback: treat unknown tiers as 'starter'
    const starterConfig = ENHANCEMENT_BONUSES.starter;
    const { primary } = getPrimaryAndSecondaryStats(item.statBonus);

    if (primary && enhancedStats[primary] !== undefined) {
      enhancedStats[primary] = (enhancedStats[primary] ?? 0) +
        (starterConfig.primaryPerLevel * item.enhancementLevel);
    }

    return enhancedStats;
  }

  // Determine primary and secondary stats
  const { primary, secondary } = getPrimaryAndSecondaryStats(item.statBonus);

  // Apply primary stat bonus
  if (primary && enhancedStats[primary] !== undefined) {
    enhancedStats[primary] = (enhancedStats[primary] ?? 0) +
      (enhancementConfig.primaryPerLevel * item.enhancementLevel);
  }

  // Apply secondary stat bonus (if tier supports it and item has secondary stat)
  if (secondary && enhancementConfig.secondaryPerLevel && enhancedStats[secondary] !== undefined) {
    enhancedStats[secondary] = (enhancedStats[secondary] ?? 0) +
      (enhancementConfig.secondaryPerLevel * item.enhancementLevel);
  }

  return enhancedStats;
}

/**
 * Check if an item can be enhanced (not at max level)
 *
 * @param item - The item to check
 * @returns True if the item can be enhanced further
 */
export function canEnhance(item: Item): boolean {
  return item.enhancementLevel < item.maxEnhancement;
}

/**
 * Get the cost to enhance an item by one level
 *
 * @param item - The item to check enhancement cost for
 * @returns The gold cost to enhance, or 0 if already at max
 */
export function getEnhancementCost(item: Item): number {
  if (!canEnhance(item)) {
    return 0;
  }
  return ENHANCEMENT_COST;
}

/**
 * Enhance an item by one level (returns new item, doesn't mutate)
 *
 * @param item - The item to enhance
 * @returns A new item with enhancementLevel increased by 1
 * @throws Error if item is already at max enhancement level
 */
export function enhanceItem(item: Item): Item {
  if (!canEnhance(item)) {
    throw new Error(`Item ${item.name} is already at max enhancement level`);
  }

  return {
    ...item,
    statBonus: { ...item.statBonus },
    effect: item.effect ? { ...item.effect } : undefined,
    enhancementLevel: item.enhancementLevel + 1,
  };
}

/**
 * Get the display name with enhancement level (e.g., "Warrior's Blade +2")
 *
 * @param item - The item to get the display name for
 * @returns The item name with enhancement suffix if enhanced
 */
export function getEnhancedItemName(item: Item): string {
  if (item.enhancementLevel === 0) {
    return item.name;
  }
  return `${item.name} +${item.enhancementLevel}`;
}

/**
 * Get the stat bonus preview for the next enhancement level
 * Shows what stats will be gained when enhancing
 *
 * @param item - The item to preview enhancement for
 * @returns The additional stats from the next enhancement, or null if at max
 *
 * @example
 * // Warrior's Blade (class tier): { power: 4, fortune: 5 }, enhancementLevel: 1
 * // Next level will add +2 power (primaryPerLevel)
 * // Returns: { power: 2 }
 */
export function getNextEnhancementBonus(item: Item): Partial<Stats> | null {
  if (!canEnhance(item)) {
    return null;
  }

  // Get enhancement config for this tier
  const tier = item.tier || 'starter';
  const enhancementConfig = ENHANCEMENT_BONUSES[tier];

  if (!enhancementConfig) {
    // Fallback to starter config
    const { primary } = getPrimaryAndSecondaryStats(item.statBonus);
    if (!primary) return null;

    return {
      [primary]: ENHANCEMENT_BONUSES.starter.primaryPerLevel,
    } as Partial<Stats>;
  }

  // Determine primary and secondary stats
  const { primary, secondary } = getPrimaryAndSecondaryStats(item.statBonus);

  const bonus: Partial<Stats> = {};

  // Add primary bonus
  if (primary) {
    bonus[primary] = enhancementConfig.primaryPerLevel;
  }

  // Add secondary bonus if applicable
  if (secondary && enhancementConfig.secondaryPerLevel) {
    bonus[secondary] = enhancementConfig.secondaryPerLevel;
  }

  return Object.keys(bonus).length > 0 ? bonus : null;
}
