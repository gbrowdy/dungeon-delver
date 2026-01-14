import type { Item } from '@/types/game';
import type { ShopItem, ShopTier } from '@/types/shop';
import * as Icons from 'lucide-react';
import { TIER_TO_RARITY } from './constants';

/**
 * Convert a ShopItem to the Item type expected by the game engine.
 * Maps shop-specific fields to the standard Item interface.
 */
export function shopItemToItem(shopItem: ShopItem): Item {
  return {
    id: shopItem.id,
    name: shopItem.name,
    type: shopItem.type,
    rarity: TIER_TO_RARITY[shopItem.tier],
    statBonus: shopItem.stats,
    description: shopItem.description,
    icon: shopItem.icon,
    effect: shopItem.effect,
    enhancementLevel: shopItem.enhancementLevel ?? 0,
    maxEnhancement: 3,
    tier: shopItem.tier,
  };
}

/**
 * Get the Lucide icon component for an item.
 * Item data stores icon names directly as valid Lucide icon names (e.g., 'Sword', 'Axe', 'Wand2').
 * Falls back to 'Package' if the icon doesn't exist.
 */
export function getItemIcon(iconName: string): keyof typeof Icons {
  // Check if the icon exists in Lucide icons
  if (iconName in Icons) {
    return iconName as keyof typeof Icons;
  }
  return 'Package';
}

/**
 * Tier hierarchy for comparison: starter < class < specialty < legendary
 * Returns true if newItemTier is lower than equippedItemTier (i.e., a downgrade)
 */
export function isDowngrade(newItemTier: ShopTier, equippedItemTier: ShopTier): boolean {
  const tierOrder: ShopTier[] = ['starter', 'class', 'specialty', 'legendary'];
  const newTierIndex = tierOrder.indexOf(newItemTier);
  const equippedTierIndex = tierOrder.indexOf(equippedItemTier);

  // Guard against invalid tier values (indexOf returns -1)
  if (newTierIndex === -1 || equippedTierIndex === -1) {
    return false;
  }

  return newTierIndex < equippedTierIndex;
}
