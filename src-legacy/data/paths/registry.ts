// src/data/paths/registry.ts
/**
 * Path Registry - Single source of truth for all path definitions.
 *
 * All systems should import path data from here, never from individual path files.
 * This eliminates duplicate imports and provides consistent lookup functions.
 */

import type { PathDefinition, PathAbility } from '@/types/paths';
import type { Entity } from '@/ecs/components';
import { WARRIOR_PATHS } from './warrior';
import { MAGE_PATHS } from './mage';
// rogue and paladin removed - see docs/class-designs/ for design docs

// ============================================================================
// REGISTRY
// ============================================================================

/**
 * All registered paths by class.
 * Add new classes here when implemented.
 */
const PATH_REGISTRY: Record<string, PathDefinition[]> = {
  warrior: Object.values(WARRIOR_PATHS),
  mage: MAGE_PATHS,
};

/**
 * Flattened array of all paths for iteration.
 */
const ALL_PATHS: PathDefinition[] = Object.values(PATH_REGISTRY).flat();

// ============================================================================
// LOOKUPS
// ============================================================================

/**
 * Get all registered path definitions.
 */
export function getAllPaths(): PathDefinition[] {
  return ALL_PATHS;
}

/**
 * Get a path definition by ID.
 */
export function getPathById(pathId: string): PathDefinition | undefined {
  return ALL_PATHS.find(p => p.id === pathId);
}

/**
 * Get all paths for a specific class.
 */
export function getPathsForClass(classId: string): PathDefinition[] {
  return PATH_REGISTRY[classId] ?? [];
}

/**
 * Get all active-type paths.
 */
export function getActivePaths(): PathDefinition[] {
  return ALL_PATHS.filter(p => p.type === 'active');
}

/**
 * Get all passive-type paths.
 */
export function getPassivePaths(): PathDefinition[] {
  return ALL_PATHS.filter(p => p.type === 'passive');
}

/**
 * Get a specific ability definition by ID (searches all paths).
 */
export function getAbilityById(abilityId: string): PathAbility | undefined {
  for (const path of ALL_PATHS) {
    const ability = path.abilities.find(a => a.id === abilityId);
    if (ability) return ability;
  }
  return undefined;
}

/**
 * Get multiple ability definitions by their IDs.
 */
export function getAbilitiesByIds(abilityIds: string[]): PathAbility[] {
  return abilityIds
    .map(id => getAbilityById(id))
    .filter((ability): ability is PathAbility => ability !== undefined);
}

/**
 * Get the active abilities for a player entity.
 * Returns abilities from the player's path that they have chosen.
 */
export function getPlayerActiveAbilities(player: Entity): PathAbility[] {
  if (!player.path) return [];

  const pathDef = getPathById(player.path.pathId);
  if (!pathDef) return [];

  return pathDef.abilities.filter(ability =>
    player.path!.abilities.includes(ability.id)
  );
}
