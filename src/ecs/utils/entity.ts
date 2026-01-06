/**
 * Shared entity utilities for ECS systems.
 */

import type { Entity } from '../components';

/**
 * Get the display name for an entity (player or enemy).
 */
export function getEntityName(entity: Entity): string {
  if (entity.player) {
    return entity.identity?.name ?? 'Hero';
  }
  if (entity.enemy) {
    return entity.enemy.name;
  }
  return 'Unknown';
}
