// src/data/classes.ts
//
// Class definitions. Design doc Section 3.
// Each class is a stat weight line + one innate formula identifier.
// Zero bespoke content — adding a new class is ~5 lines.

import type { StatType } from '@/types/game';

export interface ClassInnate {
  id: string;
  name: string;
  description: string;
}

export interface ClassDefinition {
  id: string;
  name: string;
  description: string;
  /** Stat weights bias draft pick offerings toward these stats */
  statWeights: Record<StatType, number>;
  /** The one scaling formula that defines this class */
  innate: ClassInnate;
}

export const CLASSES: Record<string, ClassDefinition> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    description: 'A stalwart fighter who can take hits others cannot.',
    statWeights: { power: 3, fortitude: 3, speed: 1, luck: 1 },
    innate: {
      id: 'toughness',
      name: 'Toughness',
      description: 'Fortitude counts as 1.5x in damage reduction formula.',
    },
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    description: 'A precise striker whose crits devastate enemies.',
    statWeights: { power: 1, fortitude: 1, speed: 3, luck: 3 },
    innate: {
      id: 'precision',
      name: 'Precision',
      description: 'Crit damage multiplier increased by 50%.',
    },
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    description: 'A channeler whose luck fuels devastating power.',
    statWeights: { power: 3, fortitude: 1, speed: 1, luck: 3 },
    innate: {
      id: 'amplify',
      name: 'Amplify',
      description: 'All damage multiplied by 1 + (luck * 0.005).',
    },
  },
};

/** Ordered array for UI display */
export const CLASS_LIST: ClassDefinition[] = [
  CLASSES.warrior,
  CLASSES.rogue,
  CLASSES.mage,
];

/**
 * Returns stat weights normalized to probabilities (sum to 1).
 * Used by draft pick generation to bias offerings.
 */
export function getStatProbabilities(classId: string): Record<StatType, number> {
  const classDef = CLASSES[classId];
  if (!classDef) throw new Error(`Unknown class: ${classId}`);

  const weights = classDef.statWeights;
  const total = weights.power + weights.fortitude + weights.speed + weights.luck;

  return {
    power: weights.power / total,
    fortitude: weights.fortitude / total,
    speed: weights.speed / total,
    luck: weights.luck / total,
  };
}
