/**
 * Power Synergy Utilities
 *
 * Helper functions for working with power synergies and player paths.
 */

import { Player, Power } from '@/types/game';
import { PowerSynergy } from '@/types/powers';
import { CLASS_DATA } from '@/data/classes';

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
    // Main path IDs
    'berserker': 'Berserker',
    'guardian': 'Guardian',
    'archmage': 'Archmage',
    'enchanter': 'Enchanter',
    'assassin': 'Assassin',
    'duelist': 'Duelist',
    'paladin_crusader': 'Crusader',
    'paladin_protector': 'Protector',

    // Warrior subpaths
    'warlord': 'Warlord',
    'executioner': 'Executioner',
    'fortress': 'Fortress',
    'avenger': 'Avenger',

    // Mage subpaths
    'elementalist': 'Elementalist',
    'destroyer': 'Destroyer',
    'spellweaver': 'Spellweaver',
    'sage': 'Sage',

    // Rogue subpaths
    'shadowblade': 'Shadowblade',
    'nightstalker': 'Nightstalker',
    'swashbuckler': 'Swashbuckler',
    'phantom': 'Phantom',

    // Paladin subpaths
    'templar': 'Templar',
    'inquisitor': 'Inquisitor',
    'sentinel': 'Sentinel',
    'martyr': 'Martyr',
  };

  return pathNames[pathId] ?? pathId;
}

/**
 * Get display name for a player that includes their path if selected.
 * Returns "PathName ClassName" when path is selected, otherwise just "ClassName".
 * Example: "Berserker Warrior", "Archmage Mage", or just "Warrior" if no path selected.
 */
export function getPlayerDisplayName(player: Player): string {
  const className = CLASS_DATA[player.class].name;

  if (player.path) {
    const pathName = getPathName(player.path.pathId);
    return `${pathName} ${className}`;
  }

  return className;
}
