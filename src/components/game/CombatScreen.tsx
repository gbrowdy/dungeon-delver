import { useState, useCallback, useMemo } from 'react';
import { GameState, CombatSpeed, Item } from '@/types/game';
import { BattleArena } from './BattleArena';
import { CombatLog } from './CombatLog';
import { CombatHeader } from './CombatHeader';
import { PlayerStatsPanel } from './PlayerStatsPanel';
import { PowersPanel } from './PowersPanel';
import { LevelUpPopup } from './LevelUpPopup';
import { ItemDropPopup } from './ItemDropPopup';
import { CombatEvent } from '@/hooks/useBattleAnimation';
import { useGameKeyboard } from '@/hooks/useGameKeyboard';
import { CombatProvider } from '@/contexts/CombatContext';

type BattlePhase = 'entering' | 'combat' | 'victory' | 'defeat' | 'transitioning';

/**
 * Props for the CombatScreen component.
 *
 * @property state - Full game state from useGameState
 * @property droppedItem - Item that was just dropped (if any)
 * @property lastCombatEvent - The most recent combat event for animations
 * @property heroProgress - Hero's attack progress (0-1)
 * @property enemyProgress - Enemy's attack progress (0-1)
 * @property isHeroStunned - Whether the hero is currently stunned
 * @property onUsePower - Handler for using a power
 * @property onTogglePause - Handler for toggling pause state
 * @property onSetCombatSpeed - Handler for changing combat speed
 * @property onActivateBlock - Handler for activating block
 * @property onTransitionComplete - Called when transitioning to next enemy
 * @property onEnemyDeathAnimationComplete - Called when enemy death animation finishes
 * @property onPlayerDeathAnimationComplete - Called when player death animation finishes
 * @property onDismissLevelUp - Called when level up popup is dismissed
 * @property onEquipDroppedItem - Called when dropped item is equipped
 * @property onDismissDroppedItem - Called when dropped item popup is dismissed
 */
interface CombatScreenProps {
  state: GameState;
  droppedItem: Item | null;
  lastCombatEvent: CombatEvent | null;
  heroProgress: number;
  enemyProgress: number;
  isHeroStunned: boolean;
  onUsePower: (powerId: string) => void;
  onTogglePause: () => void;
  onSetCombatSpeed: (speed: CombatSpeed) => void;
  onActivateBlock: () => void;
  onTransitionComplete?: () => void;
  onEnemyDeathAnimationComplete?: () => void;
  onPlayerDeathAnimationComplete?: () => void;
  onDismissLevelUp?: () => void;
  onEquipDroppedItem?: () => void;
  onDismissDroppedItem?: () => void;
}

/**
 * CombatScreen - Main combat UI container.
 *
 * Orchestrates the combat experience by:
 * - Providing combat context to child components
 * - Managing battle phase state
 * - Setting up keyboard shortcuts
 * - Rendering modals (level up, item drop)
 *
 * Child components receive state via CombatContext instead of props:
 * - CombatHeader: Floor info, gold, speed controls
 * - BattleArena: The main battle visualization
 * - PlayerStatsPanel: Player info, equipment, stats
 * - PowersPanel: Mana bar, powers, block button
 * - CombatLog: Combat event history
 */
export function CombatScreen({
  state,
  droppedItem,
  lastCombatEvent,
  heroProgress,
  enemyProgress,
  isHeroStunned,
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
}: CombatScreenProps) {
  const { player, currentEnemy, currentRoom, roomsPerFloor, isPaused, combatLog, pendingLevelUp } = state;
  const [battlePhase, setBattlePhase] = useState<BattlePhase>('entering');

  const handlePhaseChange = useCallback((phase: BattlePhase) => {
    setBattlePhase(phase);
  }, []);

  // Powers are only usable when in active combat (not entering, transitioning, etc.)
  const canUsePowers = !!currentEnemy && battlePhase === 'combat' && !isPaused;

  // Memoize keyboard shortcut handlers to avoid recreating on every render
  const keyboardHandlers = useMemo(() => ({
    togglePause: onTogglePause,
    onUsePower: (index: number) => {
      const power = player?.powers[index];
      if (power && canUsePowers) {
        onUsePower(power.id);
      }
    },
    activateBlock: () => {
      if (canUsePowers) {
        onActivateBlock();
      }
    },
    setCombatSpeed: onSetCombatSpeed,
  }), [onTogglePause, onUsePower, onActivateBlock, onSetCombatSpeed, player?.powers, canUsePowers]);

  // Enable keyboard shortcuts during combat
  useGameKeyboard({
    ...keyboardHandlers,
    enabled: battlePhase === 'combat',
  });

  if (!player) return null;

  return (
    <CombatProvider
      gameState={state}
      droppedItem={droppedItem}
      lastCombatEvent={lastCombatEvent}
      heroProgress={heroProgress}
      enemyProgress={enemyProgress}
      isHeroStunned={isHeroStunned}
      canUsePowers={canUsePowers}
      battlePhase={battlePhase}
      onUsePower={onUsePower}
      onTogglePause={onTogglePause}
      onSetCombatSpeed={onSetCombatSpeed}
      onActivateBlock={onActivateBlock}
      onTransitionComplete={onTransitionComplete}
      onEnemyDeathAnimationComplete={onEnemyDeathAnimationComplete}
      onPlayerDeathAnimationComplete={onPlayerDeathAnimationComplete}
      onDismissLevelUp={onDismissLevelUp}
      onEquipDroppedItem={onEquipDroppedItem}
      onDismissDroppedItem={onDismissDroppedItem}
      onPhaseChange={handlePhaseChange}
    >
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-2 sm:p-3 relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-900/10 rounded-full blur-[120px]" />
        </div>

        {/* Pixel stars */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="pixel-star" style={{ top: '5%', left: '10%', animationDelay: '0s' }} />
          <div className="pixel-star" style={{ top: '15%', right: '8%', animationDelay: '0.7s' }} />
          <div className="pixel-star" style={{ top: '70%', left: '5%', animationDelay: '1.2s' }} />
          <div className="pixel-star" style={{ top: '80%', right: '12%', animationDelay: '1.8s' }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-1.5 sm:space-y-2">
          {/* Header with floor info, gold, and controls */}
          <CombatHeader />

          {/* Battle Arena - animated combat visualization */}
          <BattleArena
            player={player}
            enemy={currentEnemy}
            isPaused={isPaused}
            lastCombatEvent={lastCombatEvent}
            gamePhase={state.gamePhase}
            onPhaseChange={handlePhaseChange}
            onTransitionComplete={onTransitionComplete}
            onEnemyDeathAnimationComplete={onEnemyDeathAnimationComplete}
            onPlayerDeathAnimationComplete={onPlayerDeathAnimationComplete}
            isFloorComplete={currentRoom >= roomsPerFloor && !currentEnemy}
            heroProgress={heroProgress}
            enemyProgress={enemyProgress}
            isStunned={isHeroStunned}
          />

          {/* Powers and abilities - immediately after battle on mobile for easy access */}
          <PowersPanel />

          {/* Player stats, equipment, and XP */}
          <PlayerStatsPanel />

          {/* Combat event log */}
          <CombatLog logs={combatLog} />
        </div>

        {/* Level Up Popup */}
        {pendingLevelUp && onDismissLevelUp && (
          <LevelUpPopup newLevel={pendingLevelUp} onContinue={onDismissLevelUp} />
        )}

        {/* Item Drop Popup */}
        {droppedItem && player && onEquipDroppedItem && onDismissDroppedItem && (
          <ItemDropPopup
            item={droppedItem}
            player={player}
            onEquip={onEquipDroppedItem}
            onDismiss={onDismissDroppedItem}
          />
        )}
      </div>
    </CombatProvider>
  );
}
