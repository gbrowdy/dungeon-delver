/**
 * Path Utility Functions
 *
 * Re-exports from registry plus additional utility functions.
 */

// Re-export all lookup functions from registry
export {
  getAllPaths,
  getPathById,
  getPathsForClass,
  getActivePaths,
  getPassivePaths,
  getAbilityById,
  getAbilitiesByIds,
  getPlayerActiveAbilities,
} from '@/data/paths/registry';

import { getPathById } from '@/data/paths/registry';
import type { PathDefinition, PathAbility, PlayerPath } from '@/types/paths';
import { PATH_RESOURCES } from '@/data/pathResources';
import { isFeatureEnabled } from '@/constants/features';

/**
 * Get ability choices for a player at their current level.
 * Returns a tuple of two abilities the player can choose from.
 */
export function getAbilityChoices(
  player: { level: number; path: PlayerPath | null },
  pathDef: PathDefinition
): [PathAbility, PathAbility] | null {
  if (!player.path) return null;

  const playerLevel = player.level;
  const chosenAbilities = player.path.abilities || [];

  // Find abilities available at this level that haven't been chosen
  const availableAbilities = pathDef.abilities.filter(ability => {
    // Must meet level requirement
    if (ability.levelRequired > playerLevel) return false;
    // Must not already be chosen
    if (chosenAbilities.includes(ability.id)) return false;
    return true;
  });

  // Group by level requirement to find pairs
  const abilityPairs = new Map<number, PathAbility[]>();
  for (const ability of availableAbilities) {
    const level = ability.levelRequired;
    if (!abilityPairs.has(level)) {
      abilityPairs.set(level, []);
    }
    abilityPairs.get(level)!.push(ability);
  }

  // Find the first level with exactly 2 unchosen abilities
  for (const [, abilities] of abilityPairs) {
    if (abilities.length >= 2) {
      return [abilities[0], abilities[1]];
    }
  }

  return null;
}

// ============================================================================
// PATH ABILITY UTILITIES (Replacements for deleted usePathAbilities hook)
// ============================================================================

interface PowerModifiers {
  cooldownReduction: number;
  costReduction: number;
}

/**
 * Get power modifiers (cooldown/cost reduction) from player's path abilities.
 */
export function getPowerModifiers(player: { path: PlayerPath | null }): PowerModifiers {
  if (!player.path) {
    return { cooldownReduction: 0, costReduction: 0 };
  }

  const pathDef = getPathById(player.path.pathId);
  if (!pathDef) {
    return { cooldownReduction: 0, costReduction: 0 };
  }

  let cooldownReduction = 0;
  let costReduction = 0;

  // Check abilities the player has for power modifiers
  for (const abilityId of player.path.abilities) {
    const ability = pathDef.abilities.find(a => a.id === abilityId);
    if (!ability) continue;

    for (const effect of ability.effects) {
      if (effect.powerModifiers) {
        for (const mod of effect.powerModifiers) {
          if (mod.type === 'cooldown_reduction') {
            cooldownReduction += mod.value;
          } else if (mod.type === 'cost_reduction') {
            costReduction += mod.value;
          }
        }
      }
    }
  }

  return { cooldownReduction, costReduction };
}

/**
 * Check if player's path uses the combo mechanic.
 */
export function hasComboMechanic(player: { path: PlayerPath | null }): boolean {
  if (!player.path) return false;

  const pathDef = getPathById(player.path.pathId);
  return pathDef?.hasComboMechanic ?? false;
}

/**
 * Check if player's path is a passive (non-active) path.
 */
export function isPassivePath(player: { path: PlayerPath | null }): boolean {
  if (!player.path) return false;

  const pathDef = getPathById(player.path.pathId);
  return pathDef?.type === 'passive';
}

/**
 * Get status immunities from player's path abilities.
 */
export function getStatusImmunities(player: { path: PlayerPath | null }): string[] {
  // For now, return empty array - status immunities would be defined in ability effects
  // This can be expanded when status immunity effects are added to path abilities
  if (!player.path) return [];
  return [];
}

/**
 * Check if a path uses the resource system.
 */
export function pathUsesResourceSystem(pathId: string | undefined): boolean {
  if (!isFeatureEnabled('ACTIVE_RESOURCE_SYSTEM')) return false;
  return pathId !== undefined && pathId in PATH_RESOURCES;
}
