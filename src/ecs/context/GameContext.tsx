// src/ecs/context/GameContext.tsx
/* eslint-disable react-refresh/only-export-components */
/*
 * Note: This file intentionally uses `tick` as a useMemo dependency to trigger
 * recomputation of ECS state snapshots each game tick. The linter incorrectly
 * flags this as unnecessary because it doesn't detect that getPlayer/getActiveEnemy/
 * getGameState read from external ECS world state (not React state).
 */
/* eslint-disable react-hooks/exhaustive-deps */
/**
 * GameContext bridges ECS state to React components.
 *
 * This context:
 * 1. Runs the ECS game loop via useGameEngine
 * 2. Creates snapshots of ECS state each tick
 * 3. Provides the snapshots to React components
 * 4. Exposes action functions that dispatch commands to ECS
 */

import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
} from 'react';
import type { CharacterClass } from '@/types/game';
import { useGameEngine } from '../hooks/useGameEngine';
import { dispatch, Commands } from '../commands';
import { getPlayer, getActiveEnemy, getGameState } from '../queries';
import {
  PlayerSnapshot,
  EnemySnapshot,
  GameStateSnapshot,
  createPlayerSnapshot,
  createEnemySnapshot,
  createGameStateSnapshot,
  createDefaultGameStateSnapshot,
} from '../snapshot';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Actions available to React components for controlling the game.
 * These dispatch commands to the ECS command queue.
 */
export interface GameActions {
  // Game flow
  startGame: () => void;
  selectClass: (characterClass: CharacterClass) => void;
  selectPath: (pathId: string) => void;
  selectAbility: (abilityId: string) => void;
  selectSubpath: (subpathId: string) => void;

  // Combat
  usePower: (powerId: string) => void;
  activateBlock: () => void;

  // UI
  togglePause: () => void;
  setCombatSpeed: (speed: 1 | 2 | 3) => void;
  dismissLevelUp: () => void;

  // Progression
  continueFromFloorComplete: () => void;
  restartGame: () => void;
  retryFloor: () => void;

  // Shop
  openShop: () => void;
  closeShop: () => void;
  purchaseShopItem: (itemId: string, cost: number) => void;
  enhanceEquippedItem: (slot: 'weapon' | 'armor' | 'accessory') => void;

  // Items
  claimItem: (itemId: string) => void;

  // Animation callbacks
  handleTransitionComplete: () => void;
  handleEnemyDeathAnimationComplete: () => void;
  handlePlayerDeathAnimationComplete: () => void;
}

/**
 * Full context value containing ECS state snapshots and actions.
 */
export interface GameContextValue {
  // State snapshots (updated each tick)
  player: PlayerSnapshot | null;
  enemy: EnemySnapshot | null;
  gameState: GameStateSnapshot;

  // Combat timing (0-1 progress)
  heroProgress: number;
  enemyProgress: number;

  // Engine state
  tick: number;
  isRunning: boolean;

  // Actions
  actions: GameActions;
}

// ============================================================================
// CONTEXT
// ============================================================================

const GameContext = createContext<GameContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export interface GameProviderProps {
  children: ReactNode;
  /** Whether the game loop should run. Defaults to true. */
  enabled?: boolean;
}

/**
 * Provider component that wraps the game and provides ECS state to React.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <GameProvider>
 *       <Game />
 *     </GameProvider>
 *   );
 * }
 * ```
 */
export function GameProvider({ children, enabled = true }: GameProviderProps) {
  // Use the game engine hook to manage the game loop
  const { tick, isRunning } = useGameEngine({ enabled });

  // Create memoized snapshots from ECS state.
  // These depend on `tick` to trigger recomputation each game tick.
  const player = useMemo(() => {
    const entity = getPlayer();
    return entity ? createPlayerSnapshot(entity) : null;
  }, [tick]);

  const enemy = useMemo(() => {
    const entity = getActiveEnemy();
    return entity ? createEnemySnapshot(entity) : null;
  }, [tick]);

  const gameState = useMemo(() => {
    const entity = getGameState();
    return entity ? createGameStateSnapshot(entity) : createDefaultGameStateSnapshot();
  }, [tick]);

  // Calculate progress from speed components
  const heroProgress = useMemo(() => {
    const entity = getPlayer();
    if (!entity?.speed) return 0;
    const progress = entity.speed.accumulated / entity.speed.attackInterval;
    return Math.min(1, Math.max(0, progress));
  }, [tick]);

  const enemyProgress = useMemo(() => {
    const entity = getActiveEnemy();
    if (!entity?.speed) return 0;
    const progress = entity.speed.accumulated / entity.speed.attackInterval;
    return Math.min(1, Math.max(0, progress));
  }, [tick]);

  // Action implementations - dispatch commands to ECS
  // Memoized since they don't depend on tick
  const actions = useMemo<GameActions>(() => ({
    // Game flow
    startGame: () => {
      dispatch(Commands.startGame());
    },
    selectClass: (characterClass: CharacterClass) => {
      dispatch(Commands.selectClass(characterClass));
    },
    selectPath: (pathId: string) => {
      dispatch(Commands.selectPath(pathId));
    },
    selectAbility: (abilityId: string) => {
      dispatch(Commands.selectAbility(abilityId));
    },
    selectSubpath: (subpathId: string) => {
      dispatch(Commands.selectSubpath(subpathId));
    },

    // Combat
    usePower: (powerId: string) => {
      dispatch(Commands.activatePower(powerId));
    },
    activateBlock: () => {
      dispatch(Commands.block());
    },

    // UI
    togglePause: () => {
      dispatch(Commands.togglePause());
    },
    setCombatSpeed: (speed: 1 | 2 | 3) => {
      dispatch(Commands.setCombatSpeed(speed));
    },
    dismissLevelUp: () => {
      dispatch(Commands.dismissPopup('levelUp'));
    },

    // Progression
    continueFromFloorComplete: () => {
      dispatch(Commands.advanceRoom());
    },
    restartGame: () => {
      dispatch(Commands.abandonRun());
    },
    retryFloor: () => {
      dispatch(Commands.retryFloor());
    },

    // Shop
    openShop: () => {
      dispatch(Commands.goToShop());
    },
    closeShop: () => {
      dispatch(Commands.leaveShop());
    },
    purchaseShopItem: (itemId: string, cost: number) => {
      dispatch(Commands.purchaseItem(itemId, cost));
    },
    enhanceEquippedItem: (slot: 'weapon' | 'armor' | 'accessory') => {
      dispatch(Commands.enhanceItem(slot));
    },

    // Items
    claimItem: (_itemId: string) => {
      // TODO: Add CLAIM_ITEM command when item drop system is migrated
      console.warn('claimItem not yet implemented in ECS');
    },

    // Animation callbacks
    handleTransitionComplete: () => {
      dispatch(Commands.advanceRoom());
    },
    handleEnemyDeathAnimationComplete: () => {
      dispatch(Commands.dismissPopup('enemyDeath'));
    },
    handlePlayerDeathAnimationComplete: () => {
      dispatch(Commands.dismissPopup('playerDeath'));
    },
  }), []);

  const value = useMemo<GameContextValue>(() => ({
    player,
    enemy,
    gameState,
    heroProgress,
    enemyProgress,
    tick,
    isRunning,
    actions,
  }), [player, enemy, gameState, heroProgress, enemyProgress, tick, isRunning, actions]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access the full game context.
 * Must be used within a GameProvider.
 *
 * @throws Error if used outside of GameProvider
 *
 * @example
 * ```tsx
 * function CombatScreen() {
 *   const { player, enemy, gameState, actions } = useGame();
 *
 *   if (!player || !enemy) return null;
 *
 *   return (
 *     <div>
 *       <p>Player HP: {player.health.current}/{player.health.max}</p>
 *       <p>Enemy HP: {enemy.health.current}/{enemy.health.max}</p>
 *       <button onClick={() => actions.usePower('fireball')}>Fireball</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

/**
 * Hook to access only the player snapshot.
 * Use this when you only need player data, not full game state.
 */
export function usePlayer(): PlayerSnapshot | null {
  return useGame().player;
}

/**
 * Hook to access only the enemy snapshot.
 * Use this when you only need enemy data, not full game state.
 */
export function useEnemy(): EnemySnapshot | null {
  return useGame().enemy;
}

/**
 * Hook to access only the game state snapshot.
 * Use this when you only need game state, not player/enemy data.
 */
export function useGameState(): GameStateSnapshot {
  return useGame().gameState;
}

/**
 * Hook to access only the game actions.
 * Use this when you only need to trigger actions, not read state.
 */
export function useGameActions(): GameActions {
  return useGame().actions;
}

/**
 * Hook to access attack progress values.
 * Returns { heroProgress, enemyProgress } as values from 0-1.
 */
export function useAttackProgress(): { heroProgress: number; enemyProgress: number } {
  const { heroProgress, enemyProgress } = useGame();
  return { heroProgress, enemyProgress };
}
