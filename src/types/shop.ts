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

  // Path synergies for UI highlighting
  pathSynergies?: string[]; // Path IDs this item synergizes with

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

// Re-export constants from @/constants/shop for backwards compatibility
// These should be imported from @/constants/shop in new code
export {
  ENHANCEMENT_COST,
  MAX_ENHANCEMENT_LEVEL as MAX_ENHANCEMENT,
  ENHANCEMENT_BONUSES as ENHANCEMENT_CONFIG,
  SHOP_PRICE_RANGES,
  SHOP_UNLOCKS,
  getTotalEnhancementCost,
} from '@/constants/shop';
