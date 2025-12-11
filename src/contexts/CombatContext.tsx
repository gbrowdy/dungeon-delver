import { createContext, useContext, ReactNode, useMemo } from 'react';
import { GameState, CombatSpeed, Item, Player } from '@/types/game';
import { CombatEvent } from '@/hooks/useBattleAnimation';

/**
 * Combat state shared across all combat UI components.
 * Contains derived state from the game state relevant to combat.
 */
interface CombatState {
  /** The last combat event that occurred (attack, power use, etc.) */
  lastEvent: CombatEvent | null;
  /** Hero's attack progress (0-1) for the turn timer */
  heroProgress: number;
  /** Enemy's attack progress (0-1) for the turn timer */
  enemyProgress: number;
  /** Whether the hero is currently stunned */
  isHeroStunned: boolean;
  /** Whether powers can currently be used */
  canUsePowers: boolean;
  /** Current battle phase */
  battlePhase: 'entering' | 'combat' | 'victory' | 'defeat' | 'transitioning';
}

/**
 * Actions that can be performed during combat.
 */
interface CombatActions {
  /** Use a power by its ID */
  usePower: (powerId: string) => void;
  /** Toggle pause state */
  togglePause: () => void;
  /** Set combat speed (1x, 2x, 3x) */
  setCombatSpeed: (speed: CombatSpeed) => void;
  /** Activate the block ability */
  activateBlock: () => void;
}

/**
 * Callbacks for combat animation events.
 */
interface CombatCallbacks {
  /** Called when transitioning to the next enemy */
  onTransitionComplete?: () => void;
  /** Called when enemy death animation completes */
  onEnemyDeathComplete?: () => void;
  /** Called when player death animation completes */
  onPlayerDeathComplete?: () => void;
  /** Called when level up popup is dismissed */
  onDismissLevelUp?: () => void;
  /** Called when dropped item is equipped */
  onEquipDroppedItem?: () => void;
  /** Called when dropped item popup is dismissed */
  onDismissDroppedItem?: () => void;
  /** Called when battle phase changes */
  onPhaseChange?: (phase: CombatState['battlePhase']) => void;
}

/**
 * Full context value containing game state, combat state, actions, and callbacks.
 */
interface CombatContextValue {
  /** Full game state */
  gameState: GameState;
  /** Current player (convenience accessor) */
  player: Player;
  /** Item that was just dropped (if any) */
  droppedItem: Item | null;
  /** Combat-specific state */
  combatState: CombatState;
  /** Combat actions */
  actions: CombatActions;
  /** Animation callbacks */
  callbacks: CombatCallbacks;
}

const CombatContext = createContext<CombatContextValue | null>(null);

/**
 * Props for the CombatProvider component.
 */
export interface CombatProviderProps {
  children: ReactNode;
  /** Full game state from useGameState */
  gameState: GameState;
  /** Item that was just dropped */
  droppedItem: Item | null;
  /** Last combat event for animations */
  lastCombatEvent: CombatEvent | null;
  /** Hero attack progress (0-1) */
  heroProgress: number;
  /** Enemy attack progress (0-1) */
  enemyProgress: number;
  /** Whether hero is stunned */
  isHeroStunned: boolean;
  /** Whether powers can be used */
  canUsePowers: boolean;
  /** Current battle phase */
  battlePhase: CombatState['battlePhase'];
  /** Handler for using a power */
  onUsePower: (powerId: string) => void;
  /** Handler for toggling pause */
  onTogglePause: () => void;
  /** Handler for setting combat speed */
  onSetCombatSpeed: (speed: CombatSpeed) => void;
  /** Handler for activating block */
  onActivateBlock: () => void;
  /** Callback when transition completes */
  onTransitionComplete?: () => void;
  /** Callback when enemy death animation completes */
  onEnemyDeathAnimationComplete?: () => void;
  /** Callback when player death animation completes */
  onPlayerDeathAnimationComplete?: () => void;
  /** Callback when level up is dismissed */
  onDismissLevelUp?: () => void;
  /** Callback when dropped item is equipped */
  onEquipDroppedItem?: () => void;
  /** Callback when dropped item is dismissed */
  onDismissDroppedItem?: () => void;
  /** Callback when battle phase changes */
  onPhaseChange?: (phase: CombatState['battlePhase']) => void;
}

/**
 * Provider component that wraps combat UI and provides combat context.
 *
 * @example
 * ```tsx
 * <CombatProvider
 *   gameState={state}
 *   droppedItem={droppedItem}
 *   lastCombatEvent={lastCombatEvent}
 *   heroProgress={heroProgress}
 *   enemyProgress={enemyProgress}
 *   isHeroStunned={isHeroStunned}
 *   canUsePowers={canUsePowers}
 *   battlePhase={battlePhase}
 *   onUsePower={handleUsePower}
 *   onTogglePause={handleTogglePause}
 *   onSetCombatSpeed={handleSetCombatSpeed}
 *   onActivateBlock={handleActivateBlock}
 * >
 *   <CombatHeader />
 *   <BattleArena />
 *   <PlayerStatsPanel />
 *   <PowersPanel />
 *   <CombatLog />
 * </CombatProvider>
 * ```
 */
export function CombatProvider({
  children,
  gameState,
  droppedItem,
  lastCombatEvent,
  heroProgress,
  enemyProgress,
  isHeroStunned,
  canUsePowers,
  battlePhase,
  onUsePower,
  onTogglePause,
  onSetCombatSpeed,
  onActivateBlock,
  onTransitionComplete,
  onEnemyDeathAnimationComplete,
  onPlayerDeathAnimationComplete,
  onDismissLevelUp,
  onEquipDroppedItem,
  onDismissDroppedItem,
  onPhaseChange,
}: CombatProviderProps) {
  const value = useMemo<CombatContextValue>(() => ({
    gameState,
    player: gameState.player!,
    droppedItem,
    combatState: {
      lastEvent: lastCombatEvent,
      heroProgress,
      enemyProgress,
      isHeroStunned,
      canUsePowers,
      battlePhase,
    },
    actions: {
      usePower: onUsePower,
      togglePause: onTogglePause,
      setCombatSpeed: onSetCombatSpeed,
      activateBlock: onActivateBlock,
    },
    callbacks: {
      onTransitionComplete,
      onEnemyDeathComplete: onEnemyDeathAnimationComplete,
      onPlayerDeathComplete: onPlayerDeathAnimationComplete,
      onDismissLevelUp,
      onEquipDroppedItem,
      onDismissDroppedItem,
      onPhaseChange,
    },
  }), [
    gameState,
    droppedItem,
    lastCombatEvent,
    heroProgress,
    enemyProgress,
    isHeroStunned,
    canUsePowers,
    battlePhase,
    onUsePower,
    onTogglePause,
    onSetCombatSpeed,
    onActivateBlock,
    onTransitionComplete,
    onEnemyDeathAnimationComplete,
    onPlayerDeathAnimationComplete,
    onDismissLevelUp,
    onEquipDroppedItem,
    onDismissDroppedItem,
    onPhaseChange,
  ]);

  return (
    <CombatContext.Provider value={value}>
      {children}
    </CombatContext.Provider>
  );
}

/**
 * Hook to access combat context. Must be used within a CombatProvider.
 *
 * @returns The combat context value containing state, actions, and callbacks
 * @throws Error if used outside of CombatProvider
 *
 * @example
 * ```tsx
 * function PowersPanel() {
 *   const { player, combatState, actions } = useCombat();
 *
 *   return (
 *     <div>
 *       {player.powers.map(power => (
 *         <PowerButton
 *           key={power.id}
 *           power={power}
 *           currentMana={player.currentStats.mana}
 *           onUse={() => actions.usePower(power.id)}
 *           disabled={!combatState.canUsePowers}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCombat(): CombatContextValue {
  const context = useContext(CombatContext);
  if (!context) {
    throw new Error('useCombat must be used within a CombatProvider');
  }
  return context;
}

/**
 * Hook to access only the player from combat context.
 * Use this when you only need player data, not full combat state.
 */
export function useCombatPlayer(): Player {
  const { player } = useCombat();
  return player;
}

/**
 * Hook to access only combat actions.
 * Use this when you only need to trigger actions, not read state.
 */
export function useCombatActions(): CombatActions {
  const { actions } = useCombat();
  return actions;
}

/**
 * Hook to access only combat state.
 * Use this when you only need to read combat state, not player data.
 */
export function useCombatState(): CombatState {
  const { combatState } = useCombat();
  return combatState;
}
