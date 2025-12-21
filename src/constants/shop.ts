/**
 * Shop and enhancement system constants
 * All shop-related configuration values in one place
 */

import { ShopTier } from '@/types/shop';

// === SHOP PRICING ===

/**
 * Price ranges for each shop tier (for reference/validation)
 * Used to ensure generated items fall within expected price ranges
 * Also used for enhancement cost calculation (20% of midpoint)
 */
export const SHOP_PRICE_RANGES = {
  starter: { min: 45, max: 45 },     // 10g per enhancement
  class: { min: 120, max: 120 },     // 25g per enhancement
  specialty: { min: 175, max: 275 }, // 45g per enhancement
  legendary: { min: 400, max: 450 }, // 85g per enhancement
} as const;

// === ENHANCEMENT SYSTEM ===

/**
 * Enhancement cost as a percentage of item's base price, rounded to nearest 5g
 * Example: Class tier (120g base) = 25g per level (120 * 0.20 = 24, rounded to 25)
 * Total cost to max: 75g (3 levels)
 */
export const ENHANCEMENT_COST_PERCENT = 0.20;

/**
 * Maximum enhancement level for any item
 */
export const MAX_ENHANCEMENT_LEVEL = 3;

/**
 * Enhancement bonus configuration per tier
 * Higher tiers get better bonuses per enhancement level
 */
export interface EnhancementBonus {
  perStatPerLevel: number; // Bonus applied to EACH stat per enhancement level
}

/**
 * Enhancement bonuses by item tier
 * ALL stats on an item are enhanced - multiplier applied to each stat per level
 *
 * Starter (45g items): +1 per stat per level
 * Class (120g items): +2 per stat per level
 * Specialty (175-275g items): +2 per stat per level
 * Legendary (400g items): +3 per stat per level
 *
 * Example (Warrior's Blade - Class tier, base: +4 Power, +5 Fortune):
 *   +0: +4 Power, +5 Fortune
 *   +1: +6 Power, +7 Fortune (25g)
 *   +2: +8 Power, +9 Fortune (50g total)
 *   +3: +10 Power, +11 Fortune (75g total, maxed)
 */
export const ENHANCEMENT_BONUSES: Record<ShopTier, EnhancementBonus> = {
  starter: {
    perStatPerLevel: 1,
  },
  class: {
    perStatPerLevel: 2,
  },
  specialty: {
    perStatPerLevel: 2,
  },
  legendary: {
    perStatPerLevel: 3,
  },
};

/**
 * Calculate total gold cost to enhance an item from current level to target level
 * Cost is based on item tier - higher tier items cost more to enhance
 *
 * @param tier - The item's shop tier
 * @param currentLevel - Current enhancement level (0-3)
 * @param targetLevel - Desired enhancement level (0-3)
 * @returns Total gold cost for the enhancement
 *
 * @example
 * getTotalEnhancementCost('class', 0, 3) // 75 (25 * 3) for a 120g item
 * getTotalEnhancementCost('legendary', 0, 3) // 255 (85 * 3) for a 425g item
 */
export function getTotalEnhancementCost(tier: ShopTier, currentLevel: number, targetLevel: number): number {
  if (currentLevel >= targetLevel) return 0;
  if (targetLevel > MAX_ENHANCEMENT_LEVEL) {
    targetLevel = MAX_ENHANCEMENT_LEVEL;
  }

  // Get the base price range for this tier
  const priceRange = SHOP_PRICE_RANGES[tier];
  const basePrice = Math.floor((priceRange.min + priceRange.max) / 2);

  // Calculate cost per level, rounded to nearest 5
  const rawCostPerLevel = Math.floor(basePrice * ENHANCEMENT_COST_PERCENT);
  const costPerLevel = Math.max(5, Math.round(rawCostPerLevel / 5) * 5);

  const levelsToEnhance = targetLevel - currentLevel;
  return levelsToEnhance * costPerLevel;
}

/**
 * Visual display strings for enhancement levels
 */
export const ENHANCEMENT_DISPLAY = {
  0: '',
  1: '+1',
  2: '+2',
  3: '+3',
} as const;

/**
 * Tailwind color classes for enhancement level display
 * Provides visual progression from common to legendary feel
 */
export const ENHANCEMENT_COLORS = {
  0: 'text-gray-400',
  1: 'text-green-400',
  2: 'text-blue-400',
  3: 'text-purple-400',
} as const;

// === SHOP UNLOCKS ===

/**
 * Floor requirements for shop features
 */
export const SHOP_UNLOCKS = {
  legendary: 3, // Floor number when legendary items become available
} as const;
