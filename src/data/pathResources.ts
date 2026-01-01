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
 * Default mana resource for passive paths and pre-level-2 players
 * Note: Mana regeneration is handled by useCombatTimers, not by this config
 */
export const DEFAULT_MANA_RESOURCE: PathResource = {
  type: 'mana',
  current: 50,
  max: 50,
  color: '#3b82f6', // blue-500
  generation: {},
};

/**
 * Resource definitions keyed by path ID
 * Only active paths have custom resources
 */
export const PATH_RESOURCES: Record<string, PathResource> = {
  berserker: {
    type: 'fury',
    current: 0,
    max: 100,
    color: '#dc2626', // red-600
    generation: {
      onHit: 8,
      onDamaged: 12,
    },
    decay: {
      rate: 3,
      tickInterval: 1000,
      outOfCombatOnly: true,
    },
    // Multiple thresholds at same value = multiple effects that trigger together
    thresholds: [
      {
        value: 80,
        effect: {
          type: 'cost_reduction',
          value: 0.5,
          description: 'Power costs reduced by 50%',
        },
      },
      {
        value: 80,
        effect: {
          type: 'damage_bonus',
          value: 0.3,
          description: '+30% power damage',
        },
      },
      {
        value: 100,
        effect: {
          type: 'special',
          description: 'Kill at max Fury: Full HP restore',
        },
      },
    ],
  },

  archmage: {
    type: 'arcane_charges',
    current: 0,
    max: 5,
    color: '#9333ea', // purple-600
    generation: {
      onPowerUse: 1,
    },
    thresholds: [
      {
        value: 1,
        effect: {
          type: 'damage_bonus',
          value: 0.10,
          description: '+10% spell damage per charge',
        },
      },
    ],
  },

  assassin: {
    type: 'momentum',
    current: 0,
    max: 5,
    color: '#eab308', // yellow-500
    generation: {
      onCrit: 1,
      onPowerUse: 1,
    },
    decay: {
      rate: 1,
      tickInterval: 4000,
    },
    thresholds: [
      {
        value: 5,
        effect: {
          type: 'special',
          description: 'Execute enemies below 20% HP, reset all cooldowns',
        },
      },
    ],
  },

  crusader: {
    type: 'zeal',
    current: 0,
    max: 10,
    color: '#f5f5f5', // neutral-100
    generation: {
      onPowerUse: 2,
      onHit: 1,
      onBlock: 1,
      onKill: 3,
    },
    decay: {
      rate: 1,
      tickInterval: 3000,
    },
    thresholds: [
      {
        value: 5,
        effect: {
          type: 'damage_bonus',
          value: 0.20,
          description: '+20% holy damage on powers',
        },
      },
      {
        value: 10,
        effect: {
          type: 'special',
          description: 'Guaranteed critical + burst damage',
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
