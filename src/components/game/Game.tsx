import { useGameState } from '@/hooks/useGameState';
import { MainMenu } from './MainMenu';
import { ClassSelect } from './ClassSelect';
import { PathSelectionScreen } from './PathSelectionScreen';
import { CombatScreen } from './CombatScreen';
import { DeathScreen } from './DeathScreen';
import { FloorCompleteScreen } from './FloorCompleteScreen';
import { GameErrorBoundary, SimpleErrorBoundary } from '@/components/ErrorBoundary';
import { CombatErrorBoundary } from './CombatErrorBoundary';

export function Game() {
  const { state, shopItems, availablePowers, droppedItem, lastCombatEvent, heroProgress, enemyProgress, isHeroStunned, getAbilityChoices, getPathById, actions } = useGameState();

  // Get ability choices for player if they have pending ability choice
  const abilityChoices = state.player?.pendingAbilityChoice && state.player?.path
    ? (() => {
        const pathDef = getPathById(state.player.path.pathId);
        return pathDef ? getAbilityChoices(state.player, pathDef) : null;
      })()
    : null;

  switch (state.gamePhase) {
    case 'menu':
      return <MainMenu onStart={actions.startGame} />;

    case 'class-select':
      return <ClassSelect onSelect={actions.selectClass} />;

    case 'path-select':
      if (!state.player) return null;
      return <PathSelectionScreen characterClass={state.player.class} onSelectPath={actions.selectPath} />;

    case 'combat':
      return (
        <CombatErrorBoundary
          onRetryFloor={actions.retryFloor}
          onReturnToMenu={actions.restartGame}
        >
          <CombatScreen
            state={state}
            droppedItem={droppedItem}
            lastCombatEvent={lastCombatEvent}
            heroProgress={heroProgress}
            enemyProgress={enemyProgress}
            isHeroStunned={isHeroStunned}
            onUsePower={actions.usePower}
            onTogglePause={actions.togglePause}
            onSetCombatSpeed={actions.setCombatSpeed}
            onActivateBlock={actions.activateBlock}
            onTransitionComplete={actions.handleTransitionComplete}
            onEnemyDeathAnimationComplete={actions.handleEnemyDeathAnimationComplete}
            onPlayerDeathAnimationComplete={actions.handlePlayerDeathAnimationComplete}
            onDismissLevelUp={actions.dismissLevelUp}
            onEquipDroppedItem={actions.equipDroppedItem}
            onDismissDroppedItem={actions.dismissDroppedItem}
            abilityChoices={abilityChoices}
            onSelectAbility={actions.selectAbility}
          />
        </CombatErrorBoundary>
      );
      
    case 'floor-complete':
      if (!state.player) return null;
      return (
        <SimpleErrorBoundary>
          <FloorCompleteScreen
            player={state.player}
            floor={state.currentFloor}
            shopItems={shopItems}
            availablePowers={availablePowers}
            onClaimItem={actions.claimItem}
            onLearnPower={actions.learnPower}
            onContinue={actions.continueFromFloorComplete}
          />
        </SimpleErrorBoundary>
      );

    case 'defeat':
      if (!state.player) return null;
      return (
        <DeathScreen
          player={state.player}
          floor={state.currentFloor}
          room={state.currentRoom}
          onRetry={actions.retryFloor}
          onAbandon={actions.restartGame}
        />
      );
      
    default:
      return <MainMenu onStart={actions.startGame} />;
  }
}
