import { useMemo } from 'react';
import { useGame } from '@/ecs/context/GameContext';
import { MainMenu } from './MainMenu';
import { ClassSelect } from './ClassSelect';
import { PathSelectionScreen } from './PathSelectionScreen';
import { CombatScreen } from './CombatScreen';
import { DeathScreen } from './DeathScreen';
import { FloorCompleteScreen } from './FloorCompleteScreen';
import { ShopScreen } from './ShopScreen';
import { VictoryScreen } from './VictoryScreen';
import { SimpleErrorBoundary } from '@/components/ErrorBoundary';
import { CombatErrorBoundary } from './CombatErrorBoundary';
import { getPathById, getAbilityChoices } from '@/data/paths';
import { generateShopState } from '@/utils/shopUtils';

export function Game() {
  const { player, enemy, gameState, heroProgress, enemyProgress, actions } = useGame();

  // Get ability choices for player if they have pending ability choice
  const abilityChoices = useMemo(() => {
    if (!player?.pendingAbilityChoice || !player?.path) {
      return null;
    }
    const pathDef = getPathById(player.path.pathId);
    if (!pathDef) return null;

    // Convert PlayerSnapshot to minimal player object for getAbilityChoices
    const playerForChoices = {
      level: player.level,
      path: player.path,
    };
    // TODO: Type getAbilityChoices parameters properly
    return getAbilityChoices(playerForChoices as unknown as Parameters<typeof getAbilityChoices>[0], pathDef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.pendingAbilityChoice, player?.path?.pathId, player?.path?.abilities?.length, player?.level]);

  // Compute shop state when in shop phase
  const shopState = useMemo(() => {
    if (gameState.phase !== 'shop' || !player) return null;
    return generateShopState(gameState.floor, player.characterClass, player.path?.pathId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.phase, gameState.floor, player?.characterClass, player?.path?.pathId]);

  // Check if hero is stunned
  const isHeroStunned = useMemo(() => {
    return player?.statusEffects?.some(e => e.type === 'stun') ?? false;
  }, [player?.statusEffects]);

  switch (gameState.phase) {
    case 'menu':
      return <MainMenu onStart={actions.startGame} />;

    case 'class-select':
      return <ClassSelect onSelect={actions.selectClass} />;

    case 'path-select':
      if (!player) return null;
      return <PathSelectionScreen characterClass={player.characterClass} onSelectPath={actions.selectPath} />;

    case 'combat':
      if (!player) return null;
      return (
        <CombatErrorBoundary
          onRetryFloor={actions.retryFloor}
          onReturnToMenu={actions.restartGame}
        >
          <CombatScreen
            player={player}
            enemy={enemy}
            gameState={gameState}
            heroProgress={heroProgress}
            enemyProgress={enemyProgress}
            isHeroStunned={isHeroStunned}
            abilityChoices={abilityChoices}
            onSelectAbility={actions.selectAbility}
          />
        </CombatErrorBoundary>
      );

    case 'floor-complete':
      if (!player) return null;
      return (
        <SimpleErrorBoundary>
          <FloorCompleteScreen
            player={player}
            floor={gameState.floor}
            onContinue={actions.continueFromFloorComplete}
            onVisitShop={actions.openShop}
          />
        </SimpleErrorBoundary>
      );

    case 'shop':
      if (!player || !shopState) return null;
      return (
        <SimpleErrorBoundary>
          <ShopScreen
            player={player}
            shopState={shopState}
            currentFloor={gameState.floor}
            onPurchase={actions.purchaseShopItem}
            onEnhance={actions.enhanceEquippedItem}
            onClose={actions.closeShop}
          />
        </SimpleErrorBoundary>
      );

    case 'defeat':
      if (!player) return null;
      return (
        <DeathScreen
          player={player}
          currentFloor={gameState.floor}
          onRetry={actions.retryFloor}
          onAbandon={actions.restartGame}
          onVisitShop={actions.openShop}
        />
      );

    case 'victory':
      if (!player) return null;
      return (
        <SimpleErrorBoundary>
          <VictoryScreen
            player={player}
            onNewRun={actions.restartGame}
            onReturnToMenu={actions.restartGame}
          />
        </SimpleErrorBoundary>
      );

    default:
      return <MainMenu onStart={actions.startGame} />;
  }
}
