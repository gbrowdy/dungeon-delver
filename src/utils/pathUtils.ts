/**
 * Path Utility Functions
 *
 * Non-hook utility functions for looking up path and ability definitions.
 * These functions can be used in any component without requiring hooks.
 */

import { PathDefinition, PathAbility } from '@/types/paths';
import { WARRIOR_PATHS } from '@/data/paths/warrior';
import { MAGE_PATHS } from '@/data/paths/mage';
import { ROGUE_PATHS } from '@/data/paths/rogue';
import { PALADIN_PATHS } from '@/data/paths/paladin';

/**
 * Get all path definitions as a flat array
 */
export function getAllPaths(): PathDefinition[] {
  return [
    ...Object.values(WARRIOR_PATHS),
    ...MAGE_PATHS,
    ...ROGUE_PATHS,
    ...PALADIN_PATHS,
  ];
}

/**
 * Get a specific path definition by ID
 */
export function getPathById(pathId: string): PathDefinition | null {
  return getAllPaths().find(p => p.id === pathId) || null;
}

/**
 * Get a specific ability definition by ID
 */
export function getAbilityById(abilityId: string): PathAbility | null {
  for (const path of getAllPaths()) {
    const ability = path.abilities.find(a => a.id === abilityId);
    if (ability) return ability;
  }
  return null;
}

/**
 * Get multiple ability definitions by their IDs
 */
export function getAbilitiesByIds(abilityIds: string[]): PathAbility[] {
  return abilityIds
    .map(id => getAbilityById(id))
    .filter((ability): ability is PathAbility => ability !== null);
}
