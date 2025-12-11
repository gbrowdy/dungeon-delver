import { useCallback } from 'react';
import { Player, Item, Stats } from '@/types/game';
import { getItemPrice } from '@/data/items';

/**
 * Hook for handling inventory and equipment management.
 */
export function useInventory() {
  /**
   * Buy an item (deducts gold)
   */
  const buyItem = useCallback((
    player: Player,
    item: Item,
    calculateStats: (p: Player) => Stats
  ): Player | null => {
    const price = getItemPrice(item);
    if (player.gold < price) return null;

    const updatedPlayer = {
      ...player,
      gold: player.gold - price,
      equippedItems: [...player.equippedItems, item],
    };
    updatedPlayer.currentStats = calculateStats(updatedPlayer);

    return updatedPlayer;
  }, []);

  /**
   * Claim an item for free (replaces existing item of same type)
   */
  const claimItem = useCallback((
    player: Player,
    item: Item,
    calculateStats: (p: Player) => Stats
  ): { player: Player; replacedItem: Item | null } => {
    // Remove any existing item of the same type
    const filteredItems = player.equippedItems.filter((e: Item) => e.type !== item.type);
    const replacedItem = player.equippedItems.find((e: Item) => e.type === item.type) || null;

    const updatedPlayer = {
      ...player,
      equippedItems: [...filteredItems, item],
    };
    updatedPlayer.currentStats = calculateStats(updatedPlayer);

    return { player: updatedPlayer, replacedItem };
  }, []);

  /**
   * Unequip an item
   */
  const unequipItem = useCallback((
    player: Player,
    itemId: string,
    calculateStats: (p: Player) => Stats
  ): Player => {
    const item = player.equippedItems.find((e: Item) => e.id === itemId);
    if (!item) return player;

    const updatedPlayer = {
      ...player,
      equippedItems: player.equippedItems.filter((e: Item) => e.id !== itemId),
      inventory: [...player.inventory, item],
    };
    updatedPlayer.currentStats = calculateStats(updatedPlayer);

    return updatedPlayer;
  }, []);

  /**
   * Equip an item from inventory
   */
  const equipItem = useCallback((
    player: Player,
    itemId: string,
    calculateStats: (p: Player) => Stats
  ): Player => {
    const item = player.inventory.find((e: Item) => e.id === itemId);
    if (!item) return player;

    // Remove any existing item of the same type from equipped
    const existingEquipped = player.equippedItems.find((e: Item) => e.type === item.type);
    let newEquipped = player.equippedItems;
    let newInventory = player.inventory.filter((e: Item) => e.id !== itemId);

    if (existingEquipped) {
      newEquipped = player.equippedItems.filter((e: Item) => e.id !== existingEquipped.id);
      newInventory = [...newInventory, existingEquipped];
    }

    const updatedPlayer = {
      ...player,
      equippedItems: [...newEquipped, item],
      inventory: newInventory,
    };
    updatedPlayer.currentStats = calculateStats(updatedPlayer);

    return updatedPlayer;
  }, []);

  /**
   * Get total stat bonuses from all equipped items
   */
  const getEquipmentBonuses = useCallback((player: Player): Partial<Stats> => {
    const bonuses: Partial<Stats> = {};

    player.equippedItems.forEach((item: Item) => {
      Object.entries(item.statBonus).forEach(([key, value]) => {
        const statKey = key as keyof Stats;
        bonuses[statKey] = (bonuses[statKey] || 0) + (value || 0);
      });
    });

    return bonuses;
  }, []);

  return {
    buyItem,
    claimItem,
    unequipItem,
    equipItem,
    getEquipmentBonuses,
  };
}
