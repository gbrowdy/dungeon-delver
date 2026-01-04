/**
 * Path Utility Functions
 *
 * Non-hook utility functions for looking up path and ability definitions.
 * These functions can be used in any component without requiring hooks.
 */

import { PathDefinition, PathAbility, PlayerPath } from '@/types/paths';
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

/**
 * Get ability choices for a player at their current level.
 * Returns a tuple of two abilities the player can choose from.
 */
export function getAbilityChoices(
  player: { level: number; path: { pathId: string; abilities: string[] } | null },
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
