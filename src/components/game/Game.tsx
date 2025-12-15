import { useMemo } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { MainMenu } from './MainMenu';
import { ClassSelect } from './ClassSelect';
import { PathSelectionScreen } from './PathSelectionScreen';
import { CombatScreen } from './CombatScreen';
import { DeathScreen } from './DeathScreen';
import { FloorCompleteScreen } from './FloorCompleteScreen';
import { ShopScreen } from './ShopScreen';
import { VictoryScreen } from './VictoryScreen';
import { GameErrorBoundary, SimpleErrorBoundary } from '@/components/ErrorBoundary';
import { CombatErrorBoundary } from './CombatErrorBoundary';

export function Game() {
  const { state, shopItems, availablePowers, droppedItem, lastCombatEvent, heroProgress, enemyProgress, isHeroStunned, getAbilityChoices, getPathById, actions } = useGameState();

  // Get ability choices for player if they have pending ability choice
  // Memoize to prevent re-shuffling on every render (which caused flickering)
  // Only recalculate when pendingAbilityChoice changes or player chooses an ability
  const abilityChoices = useMemo(() => {
    if (!state.player?.pendingAbilityChoice || !state.player?.path) {
      return null;
    }
    const pathDef = getPathById(state.player.path.pathId);
    return pathDef ? getAbilityChoices(state.player, pathDef) : null;
  }, [
    state.player?.pendingAbilityChoice,
    state.player?.path?.pathId,
    state.player?.path?.abilities.length, // Recalculate when abilities change
    state.player?.level,
    getPathById,
    getAbilityChoices,
  ]);

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
            availablePowers={availablePowers}
            onLearnPower={actions.learnPower}
            onContinue={actions.continueFromFloorComplete}
            onVisitShop={actions.openShop}
          />
        </SimpleErrorBoundary>
      );

    case 'shop':
      if (!state.player || !state.shopState) return null;
      return (
        <SimpleErrorBoundary>
          <ShopScreen
            player={state.player}
            shopState={state.shopState}
            currentFloor={state.currentFloor}
            onPurchase={actions.purchaseShopItem}
            onEnhance={actions.enhanceEquippedItem}
            onClose={actions.closeShop}
          />
        </SimpleErrorBoundary>
      );

    case 'defeat':
      if (!state.player) return null;
      return (
        <DeathScreen
          player={state.player}
          currentFloor={state.currentFloor}
          onRetry={actions.retryFloor}
          onAbandon={actions.restartGame}
          onVisitShop={actions.openShop}
        />
      );

    case 'victory':
      if (!state.player) return null;
      return (
        <SimpleErrorBoundary>
          <VictoryScreen
            player={state.player}
            onNewRun={actions.restartGame}
            onReturnToMenu={actions.restartGame}
          />
        </SimpleErrorBoundary>
      );

    default:
      return <MainMenu onStart={actions.startGame} />;
  }
}
