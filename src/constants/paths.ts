/**
 * Path Selection Bonuses
 * Immediate stat bonuses applied when a player selects their path at level 2
 */

import type { Stats } from '@/types/game';

/**
 * Path Progression Constants
 * Defines when path-related choices become available
 */
export const PATH_PROGRESSION = {
  /** Level at which player chooses their path */
  PATH_SELECTION_LEVEL: 2,
  /** Level at which ability choices begin */
  FIRST_ABILITY_LEVEL: 3,
} as const;

/**
 * Calculate expected number of abilities for a given level
 * Players get one ability choice per level starting at FIRST_ABILITY_LEVEL
 */
export function getExpectedAbilityCount(level: number): number {
  if (level < PATH_PROGRESSION.FIRST_ABILITY_LEVEL) return 0;
  return level - PATH_PROGRESSION.FIRST_ABILITY_LEVEL + 1;
}

// Partial stats that can be applied as bonuses
export type PathStatBonus = Partial<Pick<Stats, 'maxHealth' | 'health' | 'power' | 'armor' | 'speed' | 'fortune'>>;

export const PATH_SELECTION_BONUSES: Record<string, PathStatBonus> = {
  // Warrior paths
  berserker: { power: 3, maxHealth: -5, health: -5 },  // Offense at cost of HP
  guardian: { armor: 2, maxHealth: 10, health: 10 },   // Pure defense

  // Mage paths
  archmage: { power: 3 },                              // Spell damage focus
  enchanter: { power: 1, fortune: 3 },                 // Proc focus

  // Rogue paths
  assassin: { power: 2, fortune: 5 },                   // Crit/damage focus
  duelist: { speed: 3, fortune: 3 },                    // Speed/evasion focus

  // Paladin paths
  paladin_crusader: { power: 2, armor: 1 },             // Offensive paladin
  paladin_protector: { maxHealth: 15, health: 15, armor: 1 }, // Defensive paladin
};
