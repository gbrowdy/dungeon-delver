import { useCallback } from 'react';
import { GameState, Item, Power } from '@/types/game';
import { getItemPrice } from '@/data/items';
import { isPowerUpgrade, applyPowerUpgrade } from '@/data/powers';
import { calculateStats } from '@/hooks/useCharacterSetup';
import { GameFlowEvent } from '@/hooks/useGameFlow';
import { useTrackedTimeouts } from '@/hooks/useTrackedTimeouts';

interface UseItemActionsOptions {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  droppedItem: Item | null;
  setDroppedItem: React.Dispatch<React.SetStateAction<Item | null>>;
  dispatchFlowEvent?: (event: GameFlowEvent) => void;
}

/**
 * Hook for item-related actions: buying, claiming, equipping, and learning powers.
 *
 * Handles:
 * - Buying items from the shop
 * - Claiming free items on floor completion
 * - Equipping dropped items from combat
 * - Learning new powers or upgrading existing ones
 */
export function useItemActions({
  setState,
  droppedItem,
  setDroppedItem,
  dispatchFlowEvent,
}: UseItemActionsOptions) {
  // Track timeouts for proper cleanup on unmount
  const { createTrackedTimeout } = useTrackedTimeouts();

  const buyItem = useCallback((itemIndex: number) => {
    setState((prev: GameState) => {
      const item = prev.shopItems[itemIndex];
      if (!item) return prev;

      const price = getItemPrice(item);
      if (!prev.player || prev.player.gold < price) return prev;

      const player = {
        ...prev.player,
        gold: prev.player.gold - price,
        equippedItems: [...prev.player.equippedItems, item],
      };
      player.currentStats = calculateStats(player);

      return {
        ...prev,
        player,
        shopItems: prev.shopItems.filter((_, i) => i !== itemIndex),
        combatLog: [...prev.combatLog, `Bought ${item.name} for ${price} gold!`],
      };
    });
  }, [setState]);

  const learnPower = useCallback((powerIndex: number) => {
    setState((prev: GameState) => {
      const selectedChoice = prev.availablePowers[powerIndex];
      if (!selectedChoice || !prev.player) return prev;

      // Check if this is an upgrade or a new power
      if (isPowerUpgrade(selectedChoice)) {
        // Find the power to upgrade and apply the upgrade
        const updatedPowers = prev.player.powers.map((p: Power) => {
          if (p.id === selectedChoice.powerId) {
            return applyPowerUpgrade(p);
          }
          return p;
        });

        return {
          ...prev,
          player: {
            ...prev.player,
            powers: updatedPowers,
          },
          availablePowers: [], // Clear powers after selection
          combatLog: [...prev.combatLog, `Upgraded ${selectedChoice.powerName} to level ${selectedChoice.newLevel}!`],
        };
      } else {
        // It's a new power - add it to the list
        const newPower: Power = { ...selectedChoice, upgradeLevel: 1 };
        return {
          ...prev,
          player: {
            ...prev.player,
            powers: [...prev.player.powers, newPower],
          },
          availablePowers: [], // Clear powers after selection
          combatLog: [...prev.combatLog, `Learned new power: ${selectedChoice.name}!`],
        };
      }
    });
  }, [setState]);

  // Claim a free item reward on floor completion (replaces existing item of same type)
  const claimItem = useCallback((itemIndex: number) => {
    setState((prev: GameState) => {
      const item = prev.shopItems[itemIndex];
      if (!item || !prev.player) return prev;

      // Remove any existing item of the same type, then add the new item
      const filteredItems = prev.player.equippedItems.filter((e: Item) => e.type !== item.type);
      const replacedItem = prev.player.equippedItems.find((e: Item) => e.type === item.type);

      const player = {
        ...prev.player,
        equippedItems: [...filteredItems, item],
      };
      player.currentStats = calculateStats(player);

      const message = replacedItem
        ? `Replaced ${replacedItem.name} with ${item.name}!`
        : `Claimed ${item.name}!`;

      return {
        ...prev,
        player,
        shopItems: prev.shopItems.filter((_, i) => i !== itemIndex),
        combatLog: [...prev.combatLog, message],
      };
    });
  }, [setState]);

  // Equip a dropped item from combat (replaces existing item of same type)
  const equipDroppedItem = useCallback(() => {
    if (!droppedItem) return;

    setState((prev: GameState) => {
      if (!prev.player) return prev;

      // Remove any existing item of the same type, then add the new item
      const filteredItems = prev.player.equippedItems.filter((e: Item) => e.type !== droppedItem.type);
      const replacedItem = prev.player.equippedItems.find((e: Item) => e.type === droppedItem.type);

      const player = {
        ...prev.player,
        equippedItems: [...filteredItems, droppedItem],
      };
      player.currentStats = calculateStats(player);

      const message = replacedItem
        ? `Equipped ${droppedItem.name}, replacing ${replacedItem.name}!`
        : `Equipped ${droppedItem.name}!`;

      return {
        ...prev,
        player,
        combatLog: [...prev.combatLog, message],
        isPaused: false, // Unpause after equipping
        pauseReason: null,
      };
    });

    setDroppedItem(null);
    // Dispatch event after item popup is dismissed to trigger next transition
    // Use tracked timeout to ensure React has processed the state update first
    createTrackedTimeout(() => dispatchFlowEvent?.({ type: 'ITEM_POPUP_DISMISSED' }), 0);
  }, [droppedItem, setState, setDroppedItem, dispatchFlowEvent, createTrackedTimeout]);

  // Dismiss a dropped item without equipping - also unpause the game
  const dismissDroppedItem = useCallback(() => {
    setDroppedItem(null);
    setState((prev: GameState) => ({
      ...prev,
      isPaused: false,
      pauseReason: null,
    }));
    // Dispatch event after item popup is dismissed to trigger next transition
    // Use tracked timeout to ensure React has processed the state update first
    createTrackedTimeout(() => dispatchFlowEvent?.({ type: 'ITEM_POPUP_DISMISSED' }), 0);
  }, [setState, setDroppedItem, dispatchFlowEvent, createTrackedTimeout]);

  return {
    buyItem,
    learnPower,
    claimItem,
    equipDroppedItem,
    dismissDroppedItem,
  };
}
