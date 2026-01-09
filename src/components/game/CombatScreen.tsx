import { useCallback, useMemo, useEffect } from 'react';
import { CombatSpeed } from '@/types/game';
import { PathAbility } from '@/types/paths';
import { BattleArena } from './BattleArena';
import { CombatLog } from './CombatLog';
import { CombatHeader } from './CombatHeader';
import { PlayerStatsPanel } from './PlayerStatsPanel';
import { PowersPanel } from './PowersPanel';
import { LevelUpPopup } from './LevelUpPopup';
import { AbilityChoicePopup } from './AbilityChoicePopup';
import { PowerChoicePopup } from './PowerChoicePopup';
import { UpgradeChoicePopup } from './UpgradeChoicePopup';
import { StanceEnhancementPopup } from './StanceEnhancementPopup';
import { useGameKeyboard } from '@/hooks/useGameKeyboard';
import { useGameActions } from '@/ecs/context/GameContext';
import type { PlayerSnapshot, EnemySnapshot, GameStateSnapshot } from '@/ecs/snapshot';

interface CombatScreenProps {
  player: PlayerSnapshot;
  enemy: EnemySnapshot | null;
  gameState: GameStateSnapshot;
  heroProgress: number;
  enemyProgress: number;
  isHeroStunned: boolean;
  abilityChoices?: [PathAbility, PathAbility] | null;
  onSelectAbility?: (abilityId: string) => void;
}

export function CombatScreen({
  player,
  enemy,
  gameState,
  heroProgress,
  enemyProgress,
  isHeroStunned,
  abilityChoices,
  onSelectAbility,
}: CombatScreenProps) {
  const actions = useGameActions();

  // Powers are only usable when in active combat
  const canUsePowers = !!enemy && gameState.battlePhase === 'combat' && !gameState.isPaused;

  // Keyboard shortcut handlers
  const keyboardHandlers = useMemo(() => ({
    togglePause: actions.togglePause,
    onUsePower: (index: number) => {
      const power = player.powers[index];
      if (power && canUsePowers) {
        actions.usePower(power.id);
      }
    },
    setCombatSpeed: actions.setCombatSpeed,
  }), [actions, player.powers, canUsePowers]);

  useGameKeyboard({
    ...keyboardHandlers,
    enabled: gameState.battlePhase === 'combat',
  });

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
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
        <CombatHeader
          floor={gameState.floor}
          room={gameState.room}
          totalRooms={gameState.totalRooms}
          gold={player.gold}
          isPaused={gameState.isPaused}
          combatSpeed={gameState.combatSpeed}
          onTogglePause={actions.togglePause}
          onSetCombatSpeed={actions.setCombatSpeed}
        />

        <BattleArena
          player={player}
          enemy={enemy}
          isPaused={gameState.isPaused}
          animationEvents={gameState.animationEvents}
          battlePhase={gameState.battlePhase}
          groundScrolling={gameState.groundScrolling}
          floatingEffects={gameState.floatingEffects}
          onPhaseChange={useCallback(() => {}, [])}
          onTransitionComplete={actions.handleTransitionComplete}
          onEnemyDeathAnimationComplete={actions.handleEnemyDeathAnimationComplete}
          onPlayerDeathAnimationComplete={actions.handlePlayerDeathAnimationComplete}
          isFloorComplete={gameState.room >= gameState.totalRooms && !enemy}
          heroProgress={heroProgress}
          enemyProgress={enemyProgress}
          isStunned={isHeroStunned}
        />

        <PowersPanel
          player={player}
          canUsePowers={canUsePowers}
          onUsePower={actions.usePower}
        />

        <PlayerStatsPanel player={player} />

        <CombatLog logs={gameState.combatLog} />
      </div>

      {/* Popups - show one at a time, level up takes priority */}
      {gameState.pendingLevelUp ? (
        <LevelUpPopup newLevel={gameState.pendingLevelUp} onContinue={actions.dismissLevelUp} />
      ) : abilityChoices && onSelectAbility ? (
        <AbilityChoicePopup
          abilities={abilityChoices}
          onSelectAbility={onSelectAbility}
          playerLevel={player.level}
        />
      ) : player.pendingPowerChoice ? (
        <PowerChoicePopup />
      ) : player.pendingUpgradeChoice ? (
        <UpgradeChoicePopup />
      ) : player.pendingStanceEnhancement ? (
        <StanceEnhancementPopup />
      ) : null}
    </div>
  );
}
