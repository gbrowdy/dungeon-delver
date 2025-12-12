/**
 * Path Selection Bonuses
 * Immediate stat bonuses applied when a player selects their path at level 2
 */

import type { Stats } from '@/types/game';

// Partial stats that can be applied as bonuses
export type PathStatBonus = Partial<Pick<Stats, 'maxHealth' | 'health' | 'power' | 'armor' | 'speed' | 'maxMana' | 'mana' | 'fortune'>>;

export const PATH_SELECTION_BONUSES: Record<string, PathStatBonus> = {
  // Warrior paths
  berserker: { power: 3, maxHealth: -5, health: -5 },  // Offense at cost of HP
  guardian: { armor: 2, maxHealth: 10, health: 10 },   // Pure defense

  // Mage paths
  archmage: { power: 3, maxMana: 10, mana: 10 },       // Spell damage focus
  enchanter: { power: 1, maxMana: 20, mana: 20 },      // Mana sustain focus

  // Rogue paths
  assassin: { power: 2, fortune: 5 },                   // Crit/damage focus
  duelist: { speed: 3, fortune: 3 },                    // Speed/evasion focus

  // Paladin paths
  paladin_crusader: { power: 2, armor: 1 },             // Offensive paladin
  paladin_protector: { maxHealth: 15, health: 15, armor: 1 }, // Defensive paladin
};
