import { useCallback } from 'react';
import { GameState, Power, Item } from '@/types/game';
import { generateItem } from '@/data/items';
import { getPowerChoices } from '@/data/powers';
import { CombatEvent } from '@/hooks/useBattleAnimation';
import { calculateStats } from '@/hooks/useCharacterSetup';
import { GameFlowEvent } from '@/hooks/useGameFlow';
import { useTrackedTimeouts } from '@/hooks/useTrackedTimeouts';
import { usePauseControl } from '@/hooks/usePauseControl';
// STAT_UPGRADE imports removed - old upgrade system deprecated
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

  // DEPRECATED: Stat upgrade system removed
  // This function is kept as a no-op for backwards compatibility
  const applyFloorUpgrade = useCallback((_upgradeId: string) => {
    // No-op - upgrade system removed
    console.warn('applyFloorUpgrade called but upgrade system has been removed');
  }, []);

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
  // If player reached level 2 without a path, transition to path selection screen
  // If player has a path and leveled up, trigger ability choice
  // Dispatches LEVEL_UP_DISMISSED event to trigger next transition if needed
  const dismissLevelUp = useCallback(() => {
    setState((prev: GameState) => {
      if (!prev.player) return prev;

      // Check if player reached level 2 and needs to choose a path
      if (prev.player.level === 2 && prev.player.path === null) {
        logStateTransition(prev.gamePhase, GAME_PHASE.PATH_SELECT, 'level_2_path_selection');
        return {
          ...prev,
          pendingLevelUp: null,
          gamePhase: GAME_PHASE.PATH_SELECT,
          isPaused: false,
          pauseReason: null,
        };
      }

      // Check if player has a path and should choose an ability (level 3+)
      // Set pendingAbilityChoice flag which will trigger the AbilityChoicePopup
      if (prev.player.path && prev.player.level >= 3) {
        const updatedPlayer = deepClonePlayer(prev.player);
        updatedPlayer.pendingAbilityChoice = true;

        return {
          ...prev,
          player: updatedPlayer,
          pendingLevelUp: null,
          // Keep paused if there's an item drop, otherwise unpause
          isPaused: !!droppedItem,
          pauseReason: droppedItem ? PAUSE_REASON.ITEM_DROP : null,
        };
      }

      // No path-related transition needed
      // Check if there's a pending item drop that should show next
      if (droppedItem) {
        return {
          ...prev,
          pendingLevelUp: null,
          isPaused: true,
          pauseReason: PAUSE_REASON.ITEM_DROP,
        };
      }

      // Just unpause and continue
      return {
        ...prev,
        pendingLevelUp: null,
        isPaused: false,
        pauseReason: null,
      };
    });

    // Dispatch flow event if no special transition happened
    createTrackedTimeout(() => dispatchFlowEvent?.({ type: 'LEVEL_UP_DISMISSED' }), 0);
  }, [setState, dispatchFlowEvent, droppedItem, createTrackedTimeout]);

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

  // DEPRECATED: Legacy upgrade system removed
  const applyUpgrade = useCallback((_upgradeId: string) => {
    // No-op - upgrade system removed
    console.warn('applyUpgrade called but upgrade system has been removed');
  }, []);

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
      shopState: null,
      previousPhase: null,
      deathFloor: null,
    });
  }, [clearCombatTimeouts, setLastCombatEvent, setState]);

  const retryFloor = useCallback(() => {
    clearCombatTimeouts(); // Clean up pending timeouts
    setLastCombatEvent(null); // Clear any leftover combat events
    logStateTransition('defeat', GAME_PHASE.COMBAT, 'retry_floor');
    setState((prev: GameState) => {
      if (!prev.player) return prev;

      // PRESERVE on retry: gold, equipment, level, path, baseStats
      // RESET: HP/MP to max, room to 0, combat state (buffs/effects/cooldowns)
      const player = deepClonePlayer(prev.player);
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

      // Determine which floor to retry
      const floorToRetry = prev.deathFloor ?? prev.currentFloor;

      // Clear combat log and add retry message
      const combatLog = new CircularBuffer<string>(MAX_COMBAT_LOG_SIZE);
      combatLog.add(`Retrying Floor ${floorToRetry}... Health and Mana restored!`);

      return {
        ...prev,
        player,
        currentFloor: floorToRetry, // Use death floor if available
        currentRoom: 0, // Reset to room 0 (will generate room 1 enemy on combat start)
        currentEnemy: null, // Will regenerate on combat start
        combatLog,
        gamePhase: GAME_PHASE.COMBAT,
        isPaused: false,
        pauseReason: null,
        isTransitioning: false,
        deathFloor: null, // Clear death floor after retry starts
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
