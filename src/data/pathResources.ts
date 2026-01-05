/**
 * Path Resource Definitions (Phase 6: Active Path Resources)
 *
 * Each active path has a unique resource that replaces mana:
 * - Berserker (Warrior): Fury - Builds from combat, empowers at high stacks
 * - Archmage (Mage): Arcane Charges - Builds from spell casts, stacking damage
 * - Assassin (Rogue): Momentum - Builds from crits/abilities, enables execute
 * - Crusader (Paladin): Zeal - Builds from holy combat, enables smite bursts
 */

import type { PathResource } from '@/types/game';

/**
 * Default mana resource for pre-level-2 players only
 * Note: Passive paths have NO resource (stances, not powers)
 * Note: Mana regeneration is handled by RegenSystem
 */
export const DEFAULT_MANA_RESOURCE: PathResource = {
  type: 'mana',
  current: 50,
  max: 50,
  color: '#3b82f6', // blue-500
  resourceBehavior: 'spend',
  generation: {},
};

/**
 * Resource definitions keyed by path ID
 * Only active paths have custom resources
 *
 * resourceBehavior:
 * - 'spend': Powers cost resource (Fury, Momentum, Zeal)
 * - 'gain': Powers add to resource (Arcane Charges - reverse mana)
 */
export const PATH_RESOURCES: Record<string, PathResource> = {
  berserker: {
    type: 'fury',
    current: 0,
    max: 100,
    color: '#dc2626', // red-600
    resourceBehavior: 'spend',
    generation: {
      onHit: 8,
      onDamaged: 12,
    },
    // No decay - continuous auto-combat means always "in combat"
    // Amplify threshold: spend at 80+ for bonus damage
    thresholds: [
      {
        value: 80,
        effect: {
          type: 'damage_bonus',
          value: 0.3,
          description: '+30% power damage at 80+ Fury',
        },
      },
    ],
  },

  archmage: {
    type: 'arcane_charges',
    current: 0,
    max: 100,
    color: '#9333ea', // purple-600
    resourceBehavior: 'gain', // Casting ADDS charges (reverse mana)
    generation: {
      // No combat generation - charges come from casting powers
    },
    decay: {
      rate: 5,
      tickInterval: 1000,
    },
    // Passive damage bonus based on current charges
    // At 100: can't cast until decay brings you below
    thresholds: [
      {
        value: 1,
        effect: {
          type: 'damage_bonus',
          value: 0.005, // +0.5% per charge = +50% at 100
          description: '+0.5% spell damage per charge',
        },
      },
    ],
  },

  assassin: {
    type: 'momentum',
    current: 0,
    max: 5,
    color: '#eab308', // yellow-500
    resourceBehavior: 'spend',
    generation: {
      onCrit: 1,
      onPowerUse: 1,
    },
    // No decay - small pool with sparse generation
    thresholds: [
      {
        value: 5,
        effect: {
          type: 'special',
          description: 'Execute enemies below 20% HP + reset cooldowns',
        },
      },
    ],
  },

  crusader: {
    type: 'zeal',
    current: 0,
    max: 10,
    color: '#f5f5f5', // neutral-100
    resourceBehavior: 'spend',
    generation: {
      onPowerUse: 2,
      onHit: 1,
      onBlock: 1,
      onKill: 3,
    },
    // No decay - small pool with combat-based generation
    thresholds: [
      {
        value: 10,
        effect: {
          type: 'special',
          description: 'Guaranteed crit + holy burst damage',
        },
      },
    ],
  },

  // Alias for paladin crusader path (pathId includes class prefix)
  paladin_crusader: {
    type: 'zeal',
    current: 0,
    max: 10,
    color: '#f5f5f5', // neutral-100
    resourceBehavior: 'spend',
    generation: {
      onPowerUse: 2,
      onHit: 1,
      onBlock: 1,
      onKill: 3,
    },
    thresholds: [
      {
        value: 10,
        effect: {
          type: 'special',
          description: 'Guaranteed crit + holy burst damage',
        },
      },
    ],
  },
};

/**
 * Get the resource definition for a path
 * Returns default mana if path not found or is passive
 */
export function getPathResource(pathId: string | undefined): PathResource {
  if (!pathId) return { ...DEFAULT_MANA_RESOURCE };
  return PATH_RESOURCES[pathId] ? { ...PATH_RESOURCES[pathId] } : { ...DEFAULT_MANA_RESOURCE };
}

/**
 * Get display name for a resource type
 */
export function getResourceDisplayName(type: PathResource['type']): string {
  switch (type) {
    case 'fury': return 'Fury';
    case 'arcane_charges': return 'Arcane Charges';
    case 'momentum': return 'Momentum';
    case 'zeal': return 'Zeal';
    case 'mana': return 'Mana';
    default: return 'Resource';
  }
}
