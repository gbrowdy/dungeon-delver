import { CharacterClass, ItemType, ItemEffect, Stats } from './game';

/**
 * Shop item tier determines price range and enhancement bonuses
 * - starter: Basic gear, 50g, always available
 * - class: Class-specific gear, 150g, updates with path choice
 * - specialty: Rotating selection, 175-275g, 2-3 items per run
 * - legendary: Premium gear, 400-450g, unlocks floor 3+, 1 item per run
 */
export type ShopTier = 'starter' | 'class' | 'specialty' | 'legendary';

/**
 * Shop item definition
 * Extends base Item concept with shop-specific properties
 */
export interface ShopItem {
  id: string;
  name: string;
  type: ItemType;
  price: number;
  stats: Partial<Stats>;
  effect?: ItemEffect;
  tier: ShopTier;
  icon: string;
  description: string;

  // Class/path restrictions
  classRestriction?: CharacterClass; // If set, only this class can buy
  pathRestriction?: string; // Path ID if path-specific

  // For class gear that changes with path choice
  // When player chooses a path, class gear items are replaced with path-specific versions
  replacedBy?: string; // ID of item that replaces this after path choice

  // Enhancement tracking (added when purchased)
  enhancementLevel?: number; // 0-3, only set on purchased items
}

/**
 * Shop state - manages all shop sections and purchase tracking
 */
export interface ShopState {
  starterGear: ShopItem[]; // Always same 3 items
  classGear: ShopItem[]; // 3 items, updates when player chooses path
  todaysSelection: ShopItem[]; // 2-3 items, rotates each run
  legendary: ShopItem | null; // 1 item, unlocks floor 3+, rotates each run
  purchasedItems: string[]; // IDs of items bought this run
}

/**
 * Shop rotation configuration for randomized item selection
 * Used to generate todaysSelection and legendary items deterministically
 */
export interface ShopRotation {
  specialtyPool: ShopItem[]; // Full pool to draw todaysSelection from
  legendaryPool: ShopItem[]; // Full pool to draw legendary from
  seed: number; // For deterministic rotation per run
}

/**
 * Enhancement bonus configuration per tier
 * Higher tiers get better enhancement bonuses
 */
export interface EnhancementBonus {
  perLevel: number; // Primary stat bonus per enhancement level
  secondary?: number; // Secondary stat bonus (specialty/legendary only)
}

/**
 * Enhancement system constants
 */
export const ENHANCEMENT_CONFIG: Record<ShopTier, EnhancementBonus> = {
  starter: {
    perLevel: 1, // +1 primary stat per level
  },
  class: {
    perLevel: 2, // +2 primary stat per level
  },
  specialty: {
    perLevel: 2, // +2 primary stat per level
    secondary: 1, // +1 secondary stat per level
  },
  legendary: {
    perLevel: 3, // +3 primary stat per level
    secondary: 2, // +2 secondary stat per level
  },
};

/**
 * Enhancement costs and limits
 */
export const ENHANCEMENT_COST = 25; // Flat cost per level
export const MAX_ENHANCEMENT = 3; // Maximum enhancement level

/**
 * Shop section price ranges (for reference/validation)
 */
export const SHOP_PRICE_RANGES = {
  starter: { min: 50, max: 50 },
  class: { min: 150, max: 150 },
  specialty: { min: 175, max: 275 },
  legendary: { min: 400, max: 450 },
} as const;

/**
 * Shop unlock requirements
 */
export const SHOP_UNLOCKS = {
  legendary: 3, // Floor number when legendary items unlock
} as const;
