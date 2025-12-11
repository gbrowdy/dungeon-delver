import { useCallback } from 'react';
import { GameState, Power, Item } from '@/types/game';
import { generateItem } from '@/data/items';
import { getPowerChoices } from '@/data/powers';
import { CombatEvent } from '@/hooks/useBattleAnimation';
import { calculateStats } from '@/hooks/useCharacterSetup';
import { GameFlowEvent } from '@/hooks/useGameFlow';
import { useTrackedTimeouts } from '@/hooks/useTrackedTimeouts';
import { usePauseControl } from '@/hooks/usePauseControl';
import {
  STAT_UPGRADE_VALUES,
  calculateUpgradeCost,
  UPGRADE_CONFIG,
} from '@/constants/game';
import { GAME_PHASE, PAUSE_REASON } from '@/constants/enums';
import { logStateTransition } from '@/utils/gameLogger';
import { deepClonePlayer } from '@/utils/stateUtils';
import { CircularBuffer, MAX_COMBAT_LOG_SIZE } from '@/utils/circularBuffer';

interface UseProgressionActionsOptions {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  clearCombatTimeouts: () => void;
  setLastCombatEvent: React.Dispatch<React.SetStateAction<CombatEvent | null>>;
  dispatchFlowEvent?: (event: GameFlowEvent) => void;
  droppedItem: Item | null;
}

/**
 * Hook for progression-related actions: floor completion, upgrades, game restart.
 *
 * Handles:
 * - Stat upgrades on floor completion
 * - Floor complete screen
 * - Continuing to the next floor
 * - Level up popup dismissal
 * - Game restart and floor retry
 */
export function useProgressionActions({
  setState,
  clearCombatTimeouts,
  setLastCombatEvent,
  dispatchFlowEvent,
  droppedItem,
}: UseProgressionActionsOptions) {
  // Track timeouts for proper cleanup on unmount
  const { createTrackedTimeout } = useTrackedTimeouts();

  // Use pause control hook for consistent pause/unpause behavior
  const { pause, unpause } = usePauseControl({ setState });

  // Apply a stat upgrade on floor completion (costs gold)
  const applyFloorUpgrade = useCallback((upgradeId: string) => {
    const config = UPGRADE_CONFIG[upgradeId];
    if (!config) return;

    setState((prev: GameState) => {
      if (!prev.player) return prev;

      const { stat, upgradeType, label } = config;
      const purchaseCount = prev.player.upgradePurchases[upgradeType];
      const cost = calculateUpgradeCost(upgradeType, purchaseCount);
      const value = STAT_UPGRADE_VALUES[upgradeType];

      if (prev.player.gold < cost) return prev;

      const player = deepClonePlayer(prev.player);
      player.gold -= cost;

      // Increment purchase count
      player.upgradePurchases = {
        ...player.upgradePurchases,
        [upgradeType]: purchaseCount + 1,
      };

      // Apply to base stats using typed key - protect against prototype pollution
      if (Object.prototype.hasOwnProperty.call(player.baseStats, stat)) {
        player.baseStats[stat] += value;
      } else {
        console.error('Invalid stat key for upgrade:', stat);
        return prev;
      }

      // Recalculate current stats
      player.currentStats = calculateStats(player);

      // For HP/MP upgrades, also restore the added amount
      if (stat === 'maxHealth') {
        player.currentStats.health = Math.min(
          player.currentStats.maxHealth,
          player.currentStats.health + value
        );
      }
      if (stat === 'maxMana') {
        player.currentStats.mana = Math.min(
          player.currentStats.maxMana,
          player.currentStats.mana + value
        );
      }

      // Format value for display
      let displayValue: string;
      if (upgradeType === 'CRIT' || upgradeType === 'DODGE') {
        displayValue = `+${value}%`;
      } else if (upgradeType === 'HP_REGEN' || upgradeType === 'MP_REGEN' || upgradeType === 'COOLDOWN_SPEED' || upgradeType === 'CRIT_DAMAGE' || upgradeType === 'GOLD_FIND') {
        displayValue = `+${value}`;
      } else {
        displayValue = `+${value}`;
      }

      prev.combatLog.add(`Purchased ${displayValue} ${label}!`);
      return {
        ...prev,
        player,
      };
    });
  }, [setState]);

  const continueFromShop = useCallback(() => {
    setState((prev: GameState) => ({
      ...prev,
      gamePhase: GAME_PHASE.COMBAT,
      shopItems: [],
      availablePowers: [],
    }));
  }, [setState]);

  const showFloorComplete = useCallback(() => {
    setState((prev: GameState) => {
      if (!prev.player) return prev;

      const nextFloorNum = prev.currentFloor + 1;

      // Generate shop items - one of each type
      const items = [
        generateItem(nextFloorNum, 'weapon'),
        generateItem(nextFloorNum, 'armor'),
        generateItem(nextFloorNum, 'accessory'),
      ];

      // Offer 2 power choices every 2 floors (floors 2, 4, 6, etc.)
      // Can be new powers or upgrades to existing powers
      const shouldOfferPowers = prev.currentFloor % 2 === 0;
      const powerChoices = shouldOfferPowers ? getPowerChoices(prev.player.powers, 2) : [];

      // Clear combat log for new floor
      const newCombatLog = new CircularBuffer<string>(MAX_COMBAT_LOG_SIZE);

      return {
        ...prev,
        gamePhase: GAME_PHASE.FLOOR_COMPLETE,
        combatLog: newCombatLog,
        shopItems: items,
        availablePowers: powerChoices,
      };
    });
  }, [setState]);

  // Dismiss level up popup and resume game
  // If there's a pending item drop, transition to item_drop pause instead of clearing
  // Dispatches LEVEL_UP_DISMISSED event to trigger next transition if needed
  const dismissLevelUp = useCallback(() => {
    // Check if there's a pending item drop that should show next
    if (droppedItem) {
      setState((prev: GameState) => ({
        ...prev,
        pendingLevelUp: null,
      }));
      pause(PAUSE_REASON.ITEM_DROP, 'level_up_to_item_drop');
      // Don't dispatch LEVEL_UP_DISMISSED - item popup will handle the transition
    } else {
      setState((prev: GameState) => ({
        ...prev,
        pendingLevelUp: null,
      }));
      unpause('dismiss_level_up');
      // Dispatch event after state update to trigger next transition
      // Use tracked timeout to ensure React has processed the state update first
      // (setState is async, so getState() would return stale state if called synchronously)
      createTrackedTimeout(() => dispatchFlowEvent?.({ type: 'LEVEL_UP_DISMISSED' }), 0);
    }
  }, [setState, dispatchFlowEvent, droppedItem, createTrackedTimeout, pause, unpause]);

  const continueFromFloorComplete = useCallback(() => {
    setState((prev: GameState) => {
      if (!prev.player) return prev;

      logStateTransition(GAME_PHASE.FLOOR_COMPLETE, GAME_PHASE.COMBAT, `next_floor:${prev.currentFloor + 1}`);

      // Reset health and mana to full when moving to next floor
      const player = { ...prev.player };
      // Recalculate stats to ensure equipment bonuses are applied
      player.currentStats = calculateStats(player);
      // Then restore health/mana to max
      player.currentStats = {
        ...player.currentStats,
        health: player.currentStats.maxHealth,
        mana: player.currentStats.maxMana,
      };
      // Reset power cooldowns for fresh start on new floor
      player.powers = player.powers.map((p: Power) => ({ ...p, currentCooldown: 0 }));

      const combatLog = new CircularBuffer<string>(MAX_COMBAT_LOG_SIZE);
      combatLog.add(`Entering Floor ${prev.currentFloor + 1}... Health and Mana restored!`);

      return {
        ...prev,
        player,
        currentFloor: prev.currentFloor + 1,
        currentRoom: 0,
        gamePhase: GAME_PHASE.COMBAT,
        combatLog,
        shopItems: [],
        availablePowers: [],
        isTransitioning: false,
      };
    });
  }, [setState]);

  // applyUpgrade now delegates to applyFloorUpgrade for consistency
  const applyUpgrade = useCallback((upgradeId: string) => {
    // Use the same upgrade logic as floor complete screen
    applyFloorUpgrade(upgradeId);
  }, [applyFloorUpgrade]);

  const restartGame = useCallback(() => {
    clearCombatTimeouts(); // Clean up pending timeouts
    setLastCombatEvent(null); // Clear any leftover combat events
    logStateTransition('*', GAME_PHASE.MENU, 'restart_game');
    setState({
      player: null,
      currentEnemy: null,
      currentFloor: 1,
      currentRoom: 0,
      roomsPerFloor: 5,
      combatLog: new CircularBuffer<string>(MAX_COMBAT_LOG_SIZE),
      gamePhase: GAME_PHASE.MENU,
      isPaused: false,
      pauseReason: null,
      combatSpeed: 1,
      pendingLevelUp: null,
      itemPityCounter: 0,
      shopItems: [],
      availablePowers: [],
      isTransitioning: false,
    });
  }, [clearCombatTimeouts, setLastCombatEvent, setState]);

  const retryFloor = useCallback(() => {
    clearCombatTimeouts(); // Clean up pending timeouts
    setLastCombatEvent(null); // Clear any leftover combat events
    logStateTransition('defeat', GAME_PHASE.COMBAT, 'retry_floor');
    setState((prev: GameState) => {
      if (!prev.player) return prev;

      // Reset HP/MP to max and start floor from room 0
      const player = { ...prev.player };
      // Recalculate stats to ensure equipment bonuses are applied
      player.currentStats = calculateStats(player);
      // Then restore health/mana to max
      player.currentStats = {
        ...player.currentStats,
        health: player.currentStats.maxHealth,
        mana: player.currentStats.maxMana,
      };
      // Reset power cooldowns
      player.powers = player.powers.map((p: Power) => ({ ...p, currentCooldown: 0 }));
      // Reset combat state
      player.activeBuffs = [];
      player.statusEffects = [];
      player.isBlocking = false;
      player.comboCount = 0;
      player.lastPowerUsed = null;
      player.isDying = false; // Clear dying state on retry

      prev.combatLog.add(`Retrying Floor ${prev.currentFloor}...`);
      return {
        ...prev,
        player,
        currentRoom: 0,
        currentEnemy: null,
        gamePhase: GAME_PHASE.COMBAT,
        isPaused: false,
        pauseReason: null,
        isTransitioning: false,
      };
    });
  }, [clearCombatTimeouts, setLastCombatEvent, setState]);

  const startGame = useCallback(() => {
    logStateTransition(GAME_PHASE.MENU, GAME_PHASE.CLASS_SELECT, 'start_game');
    setState((prev: GameState) => ({ ...prev, gamePhase: GAME_PHASE.CLASS_SELECT }));
  }, [setState]);

  return {
    applyFloorUpgrade,
    continueFromShop,
    showFloorComplete,
    dismissLevelUp,
    continueFromFloorComplete,
    applyUpgrade,
    restartGame,
    retryFloor,
    startGame,
  };
}
