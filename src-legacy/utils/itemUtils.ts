import { Item } from '@/types/game';
import { getEnhancedStats } from '@/utils/enhancementUtils';

/**
 * Format an item's stat bonuses as a readable string.
 * Includes enhancement bonuses if the item is enhanced.
 * Filters out undefined/zero values and formats stat names.
 *
 * @param item - The item to format stat bonuses for
 * @returns Formatted stat bonus string (e.g., "+5 attack, +3 defense")
 */
export function formatItemStatBonus(item: Item): string {
  if (!item?.statBonus) {
    return '';
  }

  // Use enhanced stats to include enhancement bonuses
  const stats = getEnhancedStats(item);

  return Object.entries(stats)
    .filter(([, val]): val is number => val !== undefined && val !== 0)
    .map(([stat, val]) => {
      const sign = val > 0 ? '+' : '';
      return `${sign}${val} ${stat}`;
    })
    .join(', ');
}
