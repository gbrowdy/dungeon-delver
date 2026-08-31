// src/store/actions/shop.ts
//
// Shop card generation. Called after clearing a boss floor.
// Generates 5 cards (mix of stat boosts and items). Player selects exactly 2.
// At least 1 item card is guaranteed. May include tier upgrades for equipped items.

import type { GameState, ShopCard, StatType, ItemId, ItemSlot, Item } from '@/types/game';
import { getStatProbabilities } from '@/data/classes';
import { getDraftPickValue } from '@/math/scaling';
import { ALL_ITEMS } from '@/data/items';

const ALL_STATS: StatType[] = ['power', 'fortitude', 'speed', 'luck'];
const ITEM_SLOTS: ItemSlot[] = ['weapon', 'armor', 'accessory'];

/**
 * Generate 5 shop cards. At least 1 item. May include tier upgrades.
 * Player selects exactly 2. No duplicate items offered.
 * Items favor empty equipment slots.
 */
export function generateShopCards(state: GameState): ShopCard[] {
  const cards: ShopCard[] = [];
  const probs = getStatProbabilities(state.classId);
  const offeredItemIds = new Set<ItemId>();

  // Guarantee at least 1 item card
  const firstItem = generateItemCard(state, offeredItemIds);
  cards.push(firstItem);
  if (firstItem.itemId) offeredItemIds.add(firstItem.itemId);

  // Maybe add a tier upgrade for an equipped item
  const upgradeCard = maybeGenerateUpgradeCard(state);
  if (upgradeCard) {
    cards.push(upgradeCard);
    if (upgradeCard.itemId) offeredItemIds.add(upgradeCard.itemId);
  }

  // Fill remaining with stat boosts and maybe more items
  while (cards.length < 5) {
    if (Math.random() < 0.3 && cards.filter(c => c.type === 'item').length < 3) {
      const itemCard = generateItemCard(state, offeredItemIds);
      cards.push(itemCard);
      if (itemCard.itemId) offeredItemIds.add(itemCard.itemId);
    } else {
      cards.push(generateStatBoostCard(state, probs));
    }
  }

  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

function generateStatBoostCard(
  state: GameState,
  probs: Record<StatType, number>,
): ShopCard {
  // Pick a stat weighted by class
  const weights = ALL_STATS.map(s => probs[s]);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  let stat: StatType = 'power';
  for (let i = 0; i < ALL_STATS.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { stat = ALL_STATS[i]; break; }
  }

  const value = getDraftPickValue(state.floor, stat);

  return { type: 'stat_boost', stat, statValue: value };
}

function generateItemCard(state: GameState, offeredIds: Set<ItemId>): ShopCard {
  // Prefer items for empty equipment slots (70% chance to target empty slot)
  const emptySlots = ITEM_SLOTS.filter(slot => !state.equippedItems[slot]);
  const candidates = emptySlots.length > 0 && Math.random() < 0.7
    ? ALL_ITEMS.filter(i => emptySlots.includes(i.slot) && !offeredIds.has(i.id as ItemId))
    : ALL_ITEMS.filter(i => !offeredIds.has(i.id as ItemId));

  // Fallback to any non-duplicate item, or any item if all offered
  const pool = candidates.length > 0
    ? candidates
    : ALL_ITEMS.filter(i => !offeredIds.has(i.id as ItemId));
  const finalPool = pool.length > 0 ? pool : ALL_ITEMS;

  const item = finalPool[Math.floor(Math.random() * finalPool.length)];
  return { type: 'item', itemId: item.id as ItemId };
}

function maybeGenerateUpgradeCard(state: GameState): ShopCard | null {
  // Check if player has equipped items that can be upgraded
  const equippedItems: Item[] = [];
  for (const slot of ITEM_SLOTS) {
    const item = state.equippedItems[slot];
    if (item) equippedItems.push(item);
  }

  if (equippedItems.length === 0) return null;
  if (Math.random() > 0.5) return null; // 50% chance to offer upgrade

  const item = equippedItems[Math.floor(Math.random() * equippedItems.length)];
  return { type: 'item', itemId: item.id, isUpgrade: true };
}
