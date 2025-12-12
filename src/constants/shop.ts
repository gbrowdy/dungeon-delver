/**
 * Shop and enhancement system constants
 * All shop-related configuration values in one place
 */

import { ShopTier } from '@/types/shop';

// === ENHANCEMENT SYSTEM ===

/**
 * Flat cost per enhancement level
 * Example: +0 -> +1 costs 25g, +1 -> +2 costs 25g, +2 -> +3 costs 25g
 * Total cost to max: 75g
 */
export const ENHANCEMENT_COST = 25;

/**
 * Maximum enhancement level for any item
 */
export const MAX_ENHANCEMENT_LEVEL = 3;

/**
 * Enhancement bonus configuration per tier
 * Higher tiers get better bonuses per enhancement level
 */
export interface EnhancementBonus {
  primaryPerLevel: number; // Bonus to primary stat per level
  secondaryPerLevel?: number; // Bonus to secondary stat (specialty/legendary only)
}

/**
 * Enhancement bonuses by item tier
 *
 * Starter (50g items): +1 primary per level
 * Class (150g items): +2 primary per level
 * Specialty (200g items): +2 primary + 1 secondary per level
 * Legendary (400g items): +3 primary + 2 secondary per level
 *
 * Example (Warrior's Blade - Class tier):
 *   +0: +4 Power, +5% Crit
 *   +1: +6 Power, +5% Crit (25g)
 *   +2: +8 Power, +5% Crit (50g total)
 *   +3: +10 Power, +5% Crit (75g total, maxed)
 */
export const ENHANCEMENT_BONUSES: Record<ShopTier, EnhancementBonus> = {
  starter: {
    primaryPerLevel: 1,
  },
  class: {
    primaryPerLevel: 2,
  },
  specialty: {
    primaryPerLevel: 2,
    secondaryPerLevel: 1,
  },
  legendary: {
    primaryPerLevel: 3,
    secondaryPerLevel: 2,
  },
};

/**
 * Calculate total gold cost to enhance an item from current level to target level
 *
 * @param currentLevel - Current enhancement level (0-3)
 * @param targetLevel - Desired enhancement level (0-3)
 * @returns Total gold cost for the enhancement
 *
 * @example
 * getTotalEnhancementCost(0, 3) // 75 (25 * 3)
 * getTotalEnhancementCost(1, 3) // 50 (25 * 2)
 * getTotalEnhancementCost(2, 3) // 25 (25 * 1)
 */
export function getTotalEnhancementCost(currentLevel: number, targetLevel: number): number {
  if (currentLevel >= targetLevel) return 0;
  if (targetLevel > MAX_ENHANCEMENT_LEVEL) {
    targetLevel = MAX_ENHANCEMENT_LEVEL;
  }
  const levelsToEnhance = targetLevel - currentLevel;
  return levelsToEnhance * ENHANCEMENT_COST;
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

// === SHOP PRICING ===

/**
 * Price ranges for each shop tier (for reference/validation)
 * Used to ensure generated items fall within expected price ranges
 */
export const SHOP_PRICE_RANGES = {
  starter: { min: 50, max: 50 },
  class: { min: 150, max: 150 },
  specialty: { min: 175, max: 275 },
  legendary: { min: 400, max: 450 },
} as const;

// === SHOP UNLOCKS ===

/**
 * Floor requirements for shop features
 */
export const SHOP_UNLOCKS = {
  legendary: 3, // Floor number when legendary items become available
} as const;
