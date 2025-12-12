/**
 * Power Synergy Utilities
 *
 * Helper functions for working with power synergies and player paths.
 */

import { Power } from '@/types/game';
import { PowerSynergy } from '@/types/powers';

/**
 * Extended Power interface with synergies
 * This is the expected type after Task 6.1 completes
 */
export interface PowerWithSynergies extends Power {
  synergies?: PowerSynergy[];
}

/**
 * Check if a power has synergy with the player's path
 */
export function hasSynergy(power: PowerWithSynergies, playerPathId: string | null): boolean {
  if (!playerPathId || !power.synergies) return false;
  return power.synergies.some(s => s.pathId === playerPathId);
}

/**
 * Get synergy description for a power and player's path
 */
export function getSynergyDescription(power: PowerWithSynergies, playerPathId: string | null): string | null {
  if (!playerPathId || !power.synergies) return null;
  const synergy = power.synergies.find(s => s.pathId === playerPathId);
  return synergy?.description ?? null;
}

/**
 * Get synergy for a power and player's path
 */
export function getSynergy(power: PowerWithSynergies, playerPathId: string | null): PowerSynergy | null {
  if (!playerPathId || !power.synergies) return null;
  return power.synergies.find(s => s.pathId === playerPathId) ?? null;
}

/**
 * Get the path name from path ID for display purposes
 * This will need to be updated based on the actual path data structure
 */
export function getPathName(pathId: string): string {
  // Map path IDs to display names
  const pathNames: Record<string, string> = {
    'warrior_rage': 'RAGE',
    'warrior_defense': 'DEFENSE',
    'mage_fire': 'FIRE',
    'mage_ice': 'ICE',
    'rogue_shadow': 'SHADOW',
    'rogue_precision': 'PRECISION',
    'paladin_holy': 'HOLY',
    'paladin_retribution': 'RETRIBUTION',

    // Subpath IDs (if needed)
    'berserker': 'BERSERKER',
    'duelist': 'DUELIST',
    'guardian': 'GUARDIAN',
    'protector': 'PROTECTOR',
    'elementalist': 'ELEMENTALIST',
    'spellblade': 'SPELLBLADE',
    'assassin': 'ASSASSIN',
    'gambler': 'GAMBLER',
    'vampire': 'VAMPIRE',
  };

  return pathNames[pathId] ?? pathId.toUpperCase();
}
