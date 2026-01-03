// src/ecs/queries.ts
/**
 * Reusable miniplex queries for finding entities.
 * Queries are live - they automatically update when entities change.
 */

import { world } from './world';
import type { Entity } from './components';

// Player queries
export const playerQuery = world.with('player', 'health', 'mana');
export const playerWithStatsQuery = world.with('player', 'health', 'mana', 'attack', 'defense', 'speed');

// Enemy queries
export const enemyQuery = world.with('enemy', 'health');
export const activeEnemyQuery = world.with('enemy', 'health').without('dying');
export const dyingEnemyQuery = world.with('enemy', 'dying');

// Combat queries
export const attackersQuery = world.with('health', 'attack', 'speed').without('dying');
export const entitiesWithCooldowns = world.with('cooldowns');
export const entitiesWithStatusEffects = world.with('statusEffects');
export const entitiesWithRegen = world.with('regen', 'health');
export const entitiesWithAttackReady = world.with('attackReady');
export const dyingEntities = world.with('dying');

// Game state query
export const gameStateQuery = world.with('gameState', 'phase');

/**
 * Helper to get the player entity (or null if not found)
 */
export function getPlayer(): Entity | undefined {
  return playerQuery.first;
}

/**
 * Helper to get the current enemy (or null if not found)
 */
export function getActiveEnemy(): Entity | undefined {
  return activeEnemyQuery.first;
}

/**
 * Helper to get the game state entity
 */
export function getGameState(): Entity | undefined {
  return gameStateQuery.first;
}
