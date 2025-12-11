import { Item } from '@/types/game';

/**
 * Format an item's stat bonuses as a readable string.
 * Filters out undefined/zero values and formats stat names.
 *
 * @param item - The item to format stat bonuses for
 * @returns Formatted stat bonus string (e.g., "+5 attack, +3 defense")
 */
export function formatItemStatBonus(item: Item): string {
  if (!item?.statBonus) {
    return '';
  }

  return Object.entries(item.statBonus)
    .filter(([, val]): val is number => val !== undefined && val !== 0)
    .map(([stat, val]) => {
      const sign = val > 0 ? '+' : '';
      return `${sign}${val} ${stat}`;
    })
    .join(', ');
}
