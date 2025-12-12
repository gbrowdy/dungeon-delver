/**
 * Floor Theme System
 *
 * Each floor has multiple theme variants that affect enemy composition and modifiers.
 * Themes add variety and replayability to each run.
 */

import { EnemyAbilityType } from '@/types/game';

/**
 * Enemy composition modifiers - which enemy types appear more frequently
 */
export type EnemyCompositionType = 'striker' | 'tank' | 'swarm' | 'elite' | 'mixed';

/**
 * Floor theme definition
 */
export interface FloorTheme {
  id: string;
  name: string;
  description: string;

  /**
   * Enemy composition bias - affects which enemy types spawn more frequently
   * - striker: More high-damage, low-health enemies
   * - tank: More high-health, low-damage enemies
   * - swarm: More common enemies, fewer rare/boss
   * - elite: More rare enemies, stronger abilities
   * - mixed: Balanced composition
   */
  composition: EnemyCompositionType;

  /**
   * Stat modifiers for enemies in this theme
   * Multipliers applied to base stats (1.0 = normal, 1.2 = +20%, 0.8 = -20%)
   */
  statModifiers: {
    health: number;
    power: number;
    armor: number;
    speed: number;
  };

  /**
   * Which abilities are more common in this theme
   * Empty array = normal distribution
   */
  favoredAbilities: EnemyAbilityType[];

  /**
   * Chance for enemies to have extra abilities (0-1)
   * Stacks with normal ability chance
   */
  extraAbilityChance: number;
}

/**
 * Floor 1 - Tutorial/Learning Phase
 * Single theme, consistent experience
 */
export const FLOOR_1_THEMES: FloorTheme[] = [
  {
    id: 'proving_grounds',
    name: 'Proving Grounds',
    description: 'A balanced test of your skills.',
    composition: 'mixed',
    statModifiers: {
      health: 1.0,
      power: 1.0,
      armor: 1.0,
      speed: 1.0,
    },
    favoredAbilities: [],
    extraAbilityChance: 0,
  },
];

/**
 * Floor 2 - Offensive Themes
 * High speed, high damage challenges
 */
export const FLOOR_2_THEMES: FloorTheme[] = [
  {
    id: 'striker_gauntlet',
    name: 'Striker Gauntlet',
    description: 'Fast, hard-hitting enemies test your defenses.',
    composition: 'striker',
    statModifiers: {
      health: 0.85,
      power: 1.25,
      armor: 0.9,
      speed: 1.15,
    },
    favoredAbilities: ['multi_hit', 'enrage'],
    extraAbilityChance: 0.15,
  },
  {
    id: 'swarm_horde',
    name: 'Swarm Horde',
    description: 'Endless waves of weaker enemies.',
    composition: 'swarm',
    statModifiers: {
      health: 0.7,
      power: 0.9,
      armor: 0.8,
      speed: 1.1,
    },
    favoredAbilities: ['multi_hit', 'poison'],
    extraAbilityChance: 0.1,
  },
  {
    id: 'speed_trial',
    name: 'Speed Trial',
    description: 'Lightning-fast enemies overwhelm the unprepared.',
    composition: 'striker',
    statModifiers: {
      health: 0.9,
      power: 1.1,
      armor: 0.85,
      speed: 1.3,
    },
    favoredAbilities: ['multi_hit'],
    extraAbilityChance: 0.2,
  },
];

/**
 * Floor 3 - Defensive Themes
 * High health, high armor challenges
 */
export const FLOOR_3_THEMES: FloorTheme[] = [
  {
    id: 'tank_fortress',
    name: 'Tank Fortress',
    description: 'Heavily armored foes demand sustained damage.',
    composition: 'tank',
    statModifiers: {
      health: 1.3,
      power: 0.9,
      armor: 1.25,
      speed: 0.85,
    },
    favoredAbilities: ['shield', 'heal'],
    extraAbilityChance: 0.2,
  },
  {
    id: 'brute_coliseum',
    name: 'Brute Coliseum',
    description: 'Powerful juggernauts with devastating attacks.',
    composition: 'tank',
    statModifiers: {
      health: 1.2,
      power: 1.15,
      armor: 1.1,
      speed: 0.9,
    },
    favoredAbilities: ['enrage', 'shield'],
    extraAbilityChance: 0.25,
  },
  {
    id: 'attrition_test',
    name: 'Attrition Test',
    description: 'Regenerating enemies test your burst damage.',
    composition: 'tank',
    statModifiers: {
      health: 1.15,
      power: 0.95,
      armor: 1.05,
      speed: 0.95,
    },
    favoredAbilities: ['heal'],
    extraAbilityChance: 0.3,
  },
];

/**
 * Floor 4 - Advanced Themes
 * Elite enemies with complex mechanics
 */
export const FLOOR_4_THEMES: FloorTheme[] = [
  {
    id: 'trickster_maze',
    name: 'Trickster Maze',
    description: 'Cunning enemies with unpredictable abilities.',
    composition: 'elite',
    statModifiers: {
      health: 1.0,
      power: 1.1,
      armor: 1.0,
      speed: 1.15,
    },
    favoredAbilities: ['stun', 'poison', 'multi_hit'],
    extraAbilityChance: 0.35,
  },
  {
    id: 'elite_proving',
    name: 'Elite Proving',
    description: 'Only the strongest enemies remain.',
    composition: 'elite',
    statModifiers: {
      health: 1.15,
      power: 1.15,
      armor: 1.1,
      speed: 1.05,
    },
    favoredAbilities: ['enrage', 'shield', 'multi_hit'],
    extraAbilityChance: 0.4,
  },
  {
    id: 'chaos_mix',
    name: 'Chaos Mix',
    description: 'A wild mixture of enemy types and abilities.',
    composition: 'mixed',
    statModifiers: {
      health: 1.05,
      power: 1.05,
      armor: 1.05,
      speed: 1.1,
    },
    favoredAbilities: ['multi_hit', 'poison', 'stun', 'heal', 'enrage', 'shield'],
    extraAbilityChance: 0.3,
  },
];

/**
 * Floor 5 - Final Boss Themes
 * Culmination of the run with the hardest challenges
 */
export const FLOOR_5_THEMES: FloorTheme[] = [
  {
    id: 'the_summit',
    name: 'The Summit',
    description: 'The peak of challenge awaits.',
    composition: 'elite',
    statModifiers: {
      health: 1.2,
      power: 1.2,
      armor: 1.15,
      speed: 1.1,
    },
    favoredAbilities: ['enrage', 'shield', 'multi_hit'],
    extraAbilityChance: 0.45,
  },
  {
    id: 'dark_mirror',
    name: 'Dark Mirror',
    description: 'Enemies reflect your own power back at you.',
    composition: 'elite',
    statModifiers: {
      health: 1.1,
      power: 1.3,
      armor: 1.05,
      speed: 1.15,
    },
    favoredAbilities: ['multi_hit', 'enrage'],
    extraAbilityChance: 0.5,
  },
  {
    id: 'final_gauntlet',
    name: 'Final Gauntlet',
    description: 'An endurance test before the final boss.',
    composition: 'mixed',
    statModifiers: {
      health: 1.15,
      power: 1.15,
      armor: 1.1,
      speed: 1.05,
    },
    favoredAbilities: ['heal', 'shield', 'stun'],
    extraAbilityChance: 0.4,
  },
];

/**
 * All floor themes indexed by floor number (1-5)
 */
export const FLOOR_THEMES_BY_FLOOR: Record<number, FloorTheme[]> = {
  1: FLOOR_1_THEMES,
  2: FLOOR_2_THEMES,
  3: FLOOR_3_THEMES,
  4: FLOOR_4_THEMES,
  5: FLOOR_5_THEMES,
};

/**
 * Randomly select a theme for the given floor
 */
export function selectFloorTheme(floor: number): FloorTheme {
  const themes = FLOOR_THEMES_BY_FLOOR[floor] || FLOOR_1_THEMES;
  const index = Math.floor(Math.random() * themes.length);
  return themes[index];
}

/**
 * Get a theme by its ID
 */
export function getThemeById(themeId: string): FloorTheme | null {
  const allThemes = [
    ...FLOOR_1_THEMES,
    ...FLOOR_2_THEMES,
    ...FLOOR_3_THEMES,
    ...FLOOR_4_THEMES,
    ...FLOOR_5_THEMES,
  ];

  return allThemes.find(theme => theme.id === themeId) || null;
}
