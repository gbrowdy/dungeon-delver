import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GameState, Item,
  StatusEffect, CombatSpeed, CharacterClass
} from '@/types/game';
import { CombatEvent } from '@/hooks/useBattleAnimation';
import { useEventQueue } from '@/hooks/useEventQueue';
import { useCombatLoop } from '@/hooks/useCombatLoop';
import { useCharacterSetup } from '@/hooks/useCharacterSetup';
import { useCombatTimers } from '@/hooks/useCombatTimers';
import { useRoomTransitions } from '@/hooks/useRoomTransitions';
import { useItemActions } from '@/hooks/useItemActions';
import { useProgressionActions } from '@/hooks/useProgressionActions';
import { useGameFlow } from '@/hooks/useGameFlow';
import { useCombatActions } from '@/hooks/useCombatActions';
import { usePowerActions } from '@/hooks/usePowerActions';
import { usePauseControl } from '@/hooks/usePauseControl';
import { usePathActions } from '@/hooks/usePathActions';
import { useShopState } from '@/hooks/useShopState';
import { FLOOR_CONFIG } from '@/constants/game';
import { COMBAT_EVENT_DELAYS } from '@/constants/balance';
import { GAME_PHASE, STATUS_EFFECT_TYPE } from '@/constants/enums';
import { logRecovery } from '@/utils/gameLogger';
import { CircularBuffer, MAX_COMBAT_LOG_SIZE } from '@/utils/circularBuffer';
import { deepClonePlayer } from '@/utils/stateUtils';
import { calculateStats } from '@/hooks/useCharacterSetup';
import {
  canEnhance,
  getEnhancementCost,
  enhanceItem,
} from '@/utils/enhancementUtils';

// Base combat tick interval (ms) - modified by speed multiplier
// At 1x: 2500ms per combat round (gives time to see intent + animations)
// At 2x: 1250ms per round
// At 3x: ~833ms per round (fast but still visible)
const BASE_COMBAT_INTERVAL = 2500;

const INITIAL_STATE: GameState = {
  player: null,
  currentEnemy: null,
  currentFloor: 1,
  currentRoom: 0,
  roomsPerFloor: FLOOR_CONFIG.ROOMS_PER_FLOOR[0] ?? FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR,
  currentFloorTheme: null,
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
};

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  // shopItems and availablePowers are now part of GameState to prevent race conditions
  const [lastCombatEvent, setLastCombatEvent] = useState<CombatEvent | null>(null);
  const [droppedItem, setDroppedItem] = useState<Item | null>(null);

  // Refs to prevent race conditions in death detection
  // React's setState is async, so multiple rapid attacks could both pass isDying checks
  // These refs provide atomic flags that are checked synchronously
  const playerDeathProcessedRef = useRef<boolean>(false);
  const enemyDeathProcessedRef = useRef<string | null>(null); // tracks enemy ID to handle new enemies

  // Use event queue for combat events instead of setTimeout cascades
  const { scheduleEvent: scheduleCombatEvent, clearAllEvents: clearCombatTimeouts } = useEventQueue<CombatEvent>({
    onEvent: setLastCombatEvent,
    tickInterval: COMBAT_EVENT_DELAYS.EVENT_QUEUE_TICK_INTERVAL,
  });

  // Use the shop state hook
  const shopStateManager = useShopState();

  // Use the extracted character setup hook (needs shopStateManager)
  const { selectClass: selectClassBase } = useCharacterSetup(setState);

  // Wrap selectClass to also initialize shop
  const selectClass = useCallback((characterClass: CharacterClass) => {
    selectClassBase(characterClass);
    // Shop will be initialized when openShop is called
  }, [selectClassBase]);

  // Use the pause control hook
  const { togglePause } = usePauseControl({ setState });

  // Use the path actions hook
  const {
    selectPath: selectPathBase,
    selectAbility,
    selectSubpath,
    getAbilityChoices,
    getPathById,
  } = usePathActions({ setState });

  // Wrap selectPath to also update shop
  const selectPath = useCallback((pathId: string) => {
    selectPathBase(pathId);
    // Update shop with new path-specific gear
    // Note: We don't initialize the shop here - it will be initialized with the correct
    // path when the player first visits the shop via openShop()
  }, [selectPathBase]);

  // Use the extracted room transitions hook
  const {
    nextRoom,
    nextRoomRef,
    handleEnemyDeathAnimationComplete,
    handlePlayerDeathAnimationComplete,
  } = useRoomTransitions(setState);

  // Create getState callback for game flow (avoids stale closure)
  const getState = useCallback(() => state, [state]);

  // Use the extracted progression actions hook (needs to be before useGameFlow)
  // This provides showFloorComplete which is needed by useGameFlow
  const {
    applyFloorUpgrade,
    continueFromShop,
    showFloorComplete,
    dismissLevelUp,
    continueFromFloorComplete,
    applyUpgrade,
    restartGame,
    retryFloor,
    startGame,
  } = useProgressionActions({
    setState,
    clearCombatTimeouts,
    setLastCombatEvent,
    dispatchFlowEvent: undefined, // Will be set after useGameFlow
    droppedItem
  });

  // Use event-driven game flow system
  const { dispatch: dispatchFlowEvent } = useGameFlow({
    getState,
    nextRoom,
    showFloorComplete,
  });

  // Use the extracted item actions hook (with flow event dispatch)
  const {
    buyItem,
    learnPower,
    claimItem,
    equipDroppedItem,
    dismissDroppedItem,
  } = useItemActions({ setState, droppedItem, setDroppedItem, dispatchFlowEvent });

  // Use the extracted combat actions hook
  const {
    performHeroAttack,
    performEnemyAttack,
    activateBlock,
  } = useCombatActions({
    setState,
    setLastCombatEvent,
    setDroppedItem,
    scheduleCombatEvent,
    combatSpeed: state.combatSpeed,
    enemyDeathProcessedRef,
    playerDeathProcessedRef,
  });

  // Use the extracted power actions hook
  const { usePower } = usePowerActions({
    setState,
    setLastCombatEvent,
    scheduleCombatEvent,
    enemyDeathProcessedRef,
    combatSpeed: state.combatSpeed,
  });



  // Set combat speed (1x, 2x, 3x)
  const setCombatSpeed = useCallback((speed: CombatSpeed) => {
    setState((prev: GameState) => ({ ...prev, combatSpeed: speed }));
  }, []);

  // Shop actions
  const openShop = useCallback(() => {
    setState((prev: GameState) => {
      if (!prev.player) return prev;

      // Initialize shop if not already initialized
      let newShopState = prev.shopState;
      if (!newShopState) {
        // initializeShop returns the new state immediately
        newShopState = shopStateManager.initializeShop(
          prev.player.class,
          prev.player.path?.pathId || null,
          prev.currentFloor
        );
      }

      return {
        ...prev,
        previousPhase: prev.gamePhase,
        gamePhase: GAME_PHASE.SHOP,
        shopState: newShopState,
      };
    });
  }, [shopStateManager]);

  const closeShop = useCallback(() => {
    setState((prev: GameState) => ({
      ...prev,
      gamePhase: prev.previousPhase || GAME_PHASE.FLOOR_COMPLETE,
      previousPhase: null,
    }));
  }, []);

  const purchaseShopItem = useCallback((itemId: string) => {
    setState((prev: GameState) => {
      if (!prev.player || !prev.shopState) return prev;

      const result = shopStateManager.purchaseItem(itemId, prev.player);

      if (!result.success || !result.item || !result.updatedShopState) {
        console.warn('Purchase failed:', result.message);
        return prev;
      }

      // Clone player and update gold
      const updatedPlayer = deepClonePlayer(prev.player);
      updatedPlayer.gold -= shopStateManager.getItemById(itemId)?.price || 0;

      // Add item to equipped items (replacing existing item of same type)
      const itemType = result.item.type;
      updatedPlayer.equippedItems = [
        ...updatedPlayer.equippedItems.filter(i => i.type !== itemType),
        result.item,
      ];

      // Recalculate stats using the centralized function
      updatedPlayer.currentStats = calculateStats(updatedPlayer);

      return {
        ...prev,
        player: updatedPlayer,
        shopState: result.updatedShopState,
      };
    });
  }, [shopStateManager]);

  const enhanceEquippedItem = useCallback((itemId: string) => {
    setState((prev: GameState) => {
      if (!prev.player) return prev;

      // Find the item in equipped items
      const item = prev.player.equippedItems.find(item => item.id === itemId);
      if (!item) {
        console.warn('Item not found in equipped items:', itemId);
        return prev;
      }

      // Check if enhancement is possible
      if (!canEnhance(item)) {
        console.warn('Item is already at max enhancement:', item.name);
        return prev;
      }

      const cost = getEnhancementCost(item);
      if (prev.player.gold < cost) {
        console.warn('Not enough gold for enhancement. Need:', cost, 'Have:', prev.player.gold);
        return prev;
      }

      // Clone player
      const updatedPlayer = deepClonePlayer(prev.player);

      // Deduct gold
      updatedPlayer.gold -= cost;

      // Enhance the item (creates new item with increased level)
      const enhancedItem = enhanceItem(item);

      // Replace item in equipped items (replace the matching item)
      updatedPlayer.equippedItems = updatedPlayer.equippedItems.map(i =>
        i.id === itemId ? enhancedItem : i
      );

      // Recalculate stats using the centralized function
      updatedPlayer.currentStats = calculateStats(updatedPlayer);

      return {
        ...prev,
        player: updatedPlayer,
      };
    });
  }, []);

  // Use frame-rate independent combat loop with separate hero/enemy timers
  // Also stop combat if player is dying (reached 0 HP)
  const shouldRunCombatLoop = state.gamePhase === GAME_PHASE.COMBAT && !state.isPaused && !!state.currentEnemy && !state.currentEnemy.isDying && !state.player?.isDying;

  // Separate condition for timers (regen/cooldowns) - should run during combat even without enemy
  // This allows cooldowns to continue ticking during room transitions
  const shouldRunCombatTimers = state.gamePhase === GAME_PHASE.COMBAT && !state.isPaused && !state.player?.isDying;

  // Get hero and enemy speed stats for attack timing
  const heroSpeed = state.player?.currentStats.speed ?? 10;
  const enemySpeed = state.currentEnemy?.speed ?? 10;

  // Check if hero is stunned - show purple progress bar
  const isHeroStunned = state.player?.statusEffects.some((e: StatusEffect) => e.type === STATUS_EFFECT_TYPE.STUN) ?? false;

  const { heroProgress, enemyProgress } = useCombatLoop({
    onHeroAttack: performHeroAttack,
    onEnemyAttack: performEnemyAttack,
    heroSpeed,
    enemySpeed,
    baseInterval: BASE_COMBAT_INTERVAL,
    enabled: shouldRunCombatLoop,
    combatSpeedMultiplier: state.combatSpeed,
  });

  // Use extracted combat timers hook for HP/MP regen and power cooldowns
  // Uses separate condition so cooldowns continue during room transitions
  useCombatTimers(setState, shouldRunCombatTimers);

  // Called when walk animation completes (after enemy already cleared)
  // This clears the transitioning flag - the recovery useEffect will handle spawning
  const handleTransitionComplete = useCallback(() => {
    setState((prev: GameState) => {
      if (prev.gamePhase !== GAME_PHASE.COMBAT) return prev;
      if (prev.currentEnemy) return prev; // Enemy shouldn't exist at this point

      // Clear transitioning flag - walk animation is complete
      // The recovery useEffect will detect this and spawn the next enemy
      return { ...prev, isTransitioning: false };
    });
  }, []);

  // Initial room spawn - only when entering combat phase with no enemy at room 0
  // The animation-driven transitions handle subsequent rooms
  // Uses ref to avoid having nextRoom in dependencies (Issue 14 fix)
  useEffect(() => {
    // Only spawn first enemy when:
    // - In combat phase
    // - Not paused
    // - No current enemy (and no dying enemy)
    // - At room 0 (start of floor)
    const hasNoEnemy = !state.currentEnemy;
    if (state.gamePhase === GAME_PHASE.COMBAT && !state.isPaused && hasNoEnemy && state.currentRoom === 0) {
      // First room of a floor - spawn immediately (no animation transition needed)
      nextRoomRef.current?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nextRoomRef is stable (useRef pattern)
  }, [state.gamePhase, state.isPaused, state.currentEnemy, state.currentRoom]);

  // Fallback: Clear stuck dying enemies
  // The animation system normally handles death, but if it gets stuck,
  // this effect clears the enemy after a short delay.
  // Note: Popup dismissals are now handled by the event-driven useGameFlow system
  useEffect(() => {
    // Only act if enemy is stuck in dying state
    if (
      state.gamePhase !== GAME_PHASE.COMBAT ||
      !state.currentEnemy?.isDying
    ) {
      return;
    }

    // Give animation system time to handle it, then force clear
    const timeout = setTimeout(() => {
      logRecovery('fallback_clear_dying_enemy', {
        room: state.currentRoom,
        enemyId: state.currentEnemy?.id
      });
      setState((prev: GameState) => {
        if (prev.currentEnemy?.isDying) {
          return { ...prev, currentEnemy: null };
        }
        return prev;
      });
    }, 2000); // 2 second timeout as fallback

    return () => clearTimeout(timeout);
  }, [state.gamePhase, state.currentEnemy?.isDying, state.currentEnemy?.id, state.currentRoom]);

  // Recovery effect: Spawn next enemy when all conditions are ready
  // This handles the case where handleTransitionComplete ran but pendingLevelUp was still set,
  // and then the level-up popup was dismissed afterward. Without this, the game would be stuck
  // because handleTransitionComplete only fires once (from the animation callback).
  useEffect(() => {
    // Only act in combat phase
    if (state.gamePhase !== GAME_PHASE.COMBAT) return;
    // Only when enemy is cleared (death animation complete)
    if (state.currentEnemy) return;
    // Only when not paused
    if (state.isPaused) return;
    // Only when no pending popups
    if (state.pendingLevelUp) return;
    // Only when no pending item drop popup (droppedItem is separate state)
    if (droppedItem) return;
    // Only for rooms after the first (initial spawn is handled separately)
    if (state.currentRoom === 0) return;
    // Don't spawn while hero is walking to next room - wait for animation to complete
    if (state.isTransitioning) return;

    // All conditions met - spawn next enemy or show floor complete
    if (state.currentRoom < state.roomsPerFloor) {
      nextRoom();
    } else {
      showFloorComplete();
    }
  }, [
    state.gamePhase,
    state.currentEnemy,
    state.isPaused,
    state.pendingLevelUp,
    state.currentRoom,
    state.roomsPerFloor,
    state.isTransitioning,
    droppedItem,
    nextRoom,
    showFloorComplete,
  ]);

  // Reset death tracking refs when game restarts or player respawns
  useEffect(() => {
    // Reset player death ref when player is no longer dying (respawned/restarted)
    if (state.player && !state.player.isDying) {
      playerDeathProcessedRef.current = false;
    }
    // Reset when game phase changes to menu or class select (full restart)
    if (state.gamePhase === GAME_PHASE.MENU || state.gamePhase === GAME_PHASE.CLASS_SELECT) {
      playerDeathProcessedRef.current = false;
      enemyDeathProcessedRef.current = null;
    }
  }, [state.player, state.gamePhase]);

  // Reset enemy death tracking when a new enemy spawns
  // This ensures each enemy's death can be processed exactly once
  useEffect(() => {
    if (state.currentEnemy && !state.currentEnemy.isDying) {
      enemyDeathProcessedRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally depend only on enemy ID, not entire enemy object
  }, [state.currentEnemy?.id]);

  // Cleanup all combat timeouts on unmount
  useEffect(() => {
    return () => {
      clearCombatTimeouts();
    };
  }, [clearCombatTimeouts]);

  return {
    state,
    shopItems: state.shopItems,
    availablePowers: state.availablePowers,
    droppedItem,
    lastCombatEvent,
    heroProgress: shouldRunCombatLoop ? heroProgress : 0,
    enemyProgress: shouldRunCombatLoop ? enemyProgress : 0,
    isHeroStunned,
    getAbilityChoices,
    getPathById,
    actions: {
      startGame,
      selectClass,
      selectPath,
      selectAbility,
      selectSubpath,
      usePower,
      buyItem,
      learnPower,
      claimItem,
      equipDroppedItem,
      dismissDroppedItem,
      applyFloorUpgrade,
      continueFromShop,
      continueFromFloorComplete,
      togglePause,
      dismissLevelUp,
      restartGame,
      retryFloor,
      applyUpgrade,
      setCombatSpeed,
      activateBlock,
      handleTransitionComplete,
      handleEnemyDeathAnimationComplete,
      handlePlayerDeathAnimationComplete,
      openShop,
      closeShop,
      purchaseShopItem,
      enhanceEquippedItem,
    },
  };
}
