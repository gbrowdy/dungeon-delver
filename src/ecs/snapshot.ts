// src/ecs/snapshot.ts
/**
 * Immutable snapshot types for React components.
 * These are created from ECS entities each tick and passed to React via context.
 * They're immutable to enable efficient React reconciliation with reference equality.
 *
 * This file re-exports snapshot types from focused modules and provides
 * the combined CombatSnapshot for the combat UI.
 */

// Re-export all snapshot types and creation functions from submodules
export * from './snapshots';

import { getPlayer, getGameState, enemyQuery } from './queries';
import {
  createPlayerSnapshot,
  createEnemySnapshot,
  createGameStateSnapshot,
  createDefaultGameStateSnapshot,
  type PlayerSnapshot,
  type EnemySnapshot,
  type GameStateSnapshot,
} from './snapshots';

// ============================================================================
// COMBAT SNAPSHOT
// ============================================================================

/**
 * Combined snapshot for combat UI.
 * Contains player, enemy, and game state snapshots along with attack progress.
 */
export interface CombatSnapshot {
  readonly player: PlayerSnapshot | null;
  readonly enemy: EnemySnapshot | null;
  readonly gameState: GameStateSnapshot;
  readonly heroProgress: number; // 0-1, from speed.accumulated / attackInterval
  readonly enemyProgress: number; // 0-1, from speed.accumulated / attackInterval
}

/**
 * Create a full CombatSnapshot by querying the ECS world.
 * Returns player/enemy as null if entities don't exist.
 * Pure function - queries world but has no side effects.
 */
export function createCombatSnapshot(): CombatSnapshot {
  const playerEntity = getPlayer();
  // Use enemyQuery.first to include dying enemies (for death animation)
  // instead of getActiveEnemy() which excludes them
  const enemyEntity = enemyQuery.first;
  const gameStateEntity = getGameState();

  // Calculate attack progress (0-1, clamped)
  let heroProgress = 0;
  if (playerEntity?.speed) {
    heroProgress = playerEntity.speed.accumulated / playerEntity.speed.attackInterval;
    heroProgress = Math.min(1, Math.max(0, heroProgress));
  }

  let enemyProgress = 0;
  if (enemyEntity?.speed) {
    enemyProgress = enemyEntity.speed.accumulated / enemyEntity.speed.attackInterval;
    enemyProgress = Math.min(1, Math.max(0, enemyProgress));
  }

  return {
    player: playerEntity ? createPlayerSnapshot(playerEntity) : null,
    enemy: enemyEntity ? createEnemySnapshot(enemyEntity) : null,
    gameState: gameStateEntity
      ? createGameStateSnapshot(gameStateEntity)
      : createDefaultGameStateSnapshot(),
    heroProgress,
    enemyProgress,
  };
}
