/**
 * Enhancement utility functions for the shop system
 * Handles enhancement calculations, cost, and stat bonuses
 */

import type { Item, Stats } from '@/types/game';
import type { ShopTier } from '@/types/shop';
import {
  ENHANCEMENT_COST_PERCENT,
  MAX_ENHANCEMENT_LEVEL,
  ENHANCEMENT_BONUSES,
} from '@/constants/shop';
import { SHOP_PRICE_RANGES } from '@/constants/shop';

/**
 * Get the enhanced stats for an item (base stats + enhancement bonus)
 * This is what the item actually provides when equipped
 *
 * Enhancement bonuses apply to ALL stats on the item, not just primary.
 * The bonus per stat per level is determined by the item's tier.
 *
 * @param item - The item to calculate enhanced stats for
 * @returns The combined base + enhancement stats
 *
 * @example
 * // Warrior's Blade: base { power: 4, fortune: 5 }, tier: 'class', enhancementLevel: 2
 * // Class tier: +2 per stat per level
 * // Enhancement bonus: 2 * 2 = +4 to EACH stat
 * // Result: { power: 8, fortune: 9 }
 */
export function getEnhancedStats(item: Item): Partial<Stats> {
  const enhancedStats = { ...item.statBonus };

  if (!item.tier || item.enhancementLevel === 0) {
    return enhancedStats;
  }

  // Use tier config or fall back to starter (with warning)
  let enhancementConfig = ENHANCEMENT_BONUSES[item.tier];
  if (!enhancementConfig) {
    console.warn(
      `[enhancementUtils] Unknown item tier "${item.tier}" for item "${item.name}". ` +
        `Falling back to starter tier bonuses.`
    );
    enhancementConfig = ENHANCEMENT_BONUSES.starter;
  }

  const bonusPerStat = enhancementConfig.perStatPerLevel * item.enhancementLevel;

  // Apply bonus to ALL non-zero stats
  for (const key of Object.keys(enhancedStats)) {
    const statKey = key as keyof Stats;
    const currentValue = enhancedStats[statKey];
    if (currentValue !== undefined && currentValue !== 0) {
      enhancedStats[statKey] = currentValue + bonusPerStat;
    }
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
 * Cost scales with the item's tier (based on typical price for that tier)
 *
 * @param item - The item to check enhancement cost for
 * @returns The gold cost to enhance, or 0 if already at max
 *
 * @example
 * // Starter item (45g base) = 10g per enhancement (20% of 45, rounded to nearest 5)
 * // Class item (120g base) = 25g per enhancement (20% of 120, rounded to nearest 5)
 * // Specialty item (~225g base) = 45g per enhancement (20% of 225)
 * // Legendary item (~425g base) = 85g per enhancement (20% of 425, rounded to nearest 5)
 */
export function getEnhancementCost(item: Item): number {
  if (!canEnhance(item)) {
    return 0;
  }

  // Get the base price range for this tier
  const tier = item.tier || 'starter';
  if (!item.tier) {
    console.warn(
      `[enhancementUtils] Item "${item.name}" has no tier set. ` +
        `Defaulting to 'starter' for enhancement cost.`
    );
  }
  const priceRange = SHOP_PRICE_RANGES[tier];

  // Use the midpoint of the price range as the base for percentage calculation
  const basePrice = Math.floor((priceRange.min + priceRange.max) / 2);

  // Calculate cost as percentage of base price, rounded to nearest 5
  const rawCost = Math.floor(basePrice * ENHANCEMENT_COST_PERCENT);
  return Math.max(5, Math.round(rawCost / 5) * 5); // Round to nearest 5, minimum 5g
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
 * Shows what stats will be gained when enhancing (ALL stats get bonus)
 *
 * @param item - The item to preview enhancement for
 * @returns The additional stats from the next enhancement, or null if at max
 *
 * @example
 * // Warrior's Blade (class tier): { power: 4, fortune: 5 }, enhancementLevel: 1
 * // Next level will add +2 to EACH stat (perStatPerLevel)
 * // Returns: { power: 2, fortune: 2 }
 */
export function getNextEnhancementBonus(item: Item): Partial<Stats> | null {
  if (!canEnhance(item)) {
    return null;
  }

  // Get enhancement config for this tier (fall back to starter for consistency with getEnhancedStats)
  const tier = item.tier || 'starter';
  let enhancementConfig = ENHANCEMENT_BONUSES[tier];

  if (!enhancementConfig) {
    console.warn(
      `[enhancementUtils] Unknown item tier "${tier}" for item "${item.name}". ` +
        `Falling back to starter tier for enhancement preview.`
    );
    enhancementConfig = ENHANCEMENT_BONUSES.starter;
  }

  const bonus: Partial<Stats> = {};
  const bonusPerStat = enhancementConfig.perStatPerLevel;

  // Add bonus to ALL non-zero stats on the item
  for (const [key, value] of Object.entries(item.statBonus)) {
    if (value !== undefined && value !== 0) {
      bonus[key as keyof Stats] = bonusPerStat;
    }
  }

  return Object.keys(bonus).length > 0 ? bonus : null;
}
