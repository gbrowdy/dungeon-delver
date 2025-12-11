import { useGameState } from '@/hooks/useGameState';
import { MainMenu } from './MainMenu';
import { ClassSelect } from './ClassSelect';
import { CombatScreen } from './CombatScreen';
import { DeathScreen } from './DeathScreen';
import { FloorCompleteScreen } from './FloorCompleteScreen';
import { GameErrorBoundary, SimpleErrorBoundary } from '@/components/ErrorBoundary';

export function Game() {
  const { state, shopItems, availablePowers, droppedItem, lastCombatEvent, heroProgress, enemyProgress, isHeroStunned, actions } = useGameState();

  switch (state.gamePhase) {
    case 'menu':
      return <MainMenu onStart={actions.startGame} />;

    case 'class-select':
      return <ClassSelect onSelect={actions.selectClass} />;

    case 'combat':
      return (
        <SimpleErrorBoundary>
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
          />
        </SimpleErrorBoundary>
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
            onUpgrade={actions.applyFloorUpgrade}
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
          onUpgrade={actions.applyUpgrade}
          onRetry={actions.retryFloor}
          onAbandon={actions.restartGame}
        />
      );
      
    default:
      return <MainMenu onStart={actions.startGame} />;
  }
}
