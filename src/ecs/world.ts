// src/ecs/world.ts
/**
 * ECS World - the container for all entities and components.
 * Uses miniplex for efficient entity management and queries.
 */

import { World } from 'miniplex';
import type { Entity } from './components';

// Create the singleton world instance
export const world = new World<Entity>();

// Track next entity ID for enemies
let nextEnemyId = 100;

export function getNextEnemyId(): number {
  return nextEnemyId++;
}

export function resetEnemyIdCounter(): void {
  nextEnemyId = 100;
}

/**
 * Clear all entities from the world.
 * Used when starting a new game.
 */
export function clearWorld(): void {
  // Remove all entities (convert to array first to avoid iterator modification issues)
  const entities = Array.from(world.entities);
  for (const entity of entities) {
    world.remove(entity);
  }
  resetEnemyIdCounter();
}
