/**
 * Power System Type Definitions
 *
 * Powers are verbs, not numbers - each power should be mechanically distinct.
 * Categories ensure variety in gameplay and interaction with the stat system.
 */

/**
 * Power categories - each power should be mechanically distinct
 *
 * - strike: Single reliable hit
 * - burst: Multiple small hits (good for proc effects)
 * - execute: Bonus damage vs low HP enemies
 * - control: Change combat flow (slow, stun, etc.)
 * - buff: Temporary stat boost
 * - sacrifice: Spend HP for powerful effect
 * - heal: Restore HP
 */
export type PowerCategory =
  | 'strike'    // Single reliable hit
  | 'burst'     // Multiple small hits (good for proc effects)
  | 'execute'   // Bonus damage vs low HP enemies
  | 'control'   // Change combat flow (slow, stun, etc.)
  | 'buff'      // Temporary stat boost
  | 'sacrifice' // Spend HP for powerful effect
  | 'heal';     // Restore HP

/**
 * Path synergy information for powers
 * Shows which paths work well with specific powers
 */
export interface PowerSynergy {
  pathId: string;           // Which path this synergizes with
  description: string;      // Why it synergizes (shown in UI)
}

/**
 * Power effect types
 * Defines what a power actually does mechanically
 */
export interface PowerEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'multi_hit' | 'dot';
  baseValue: number;
  scaling?: number;  // Scales with power stat

  // For multi-hit powers (burst category)
  hitCount?: number;

  // For execute powers
  executeThreshold?: number;  // Enemy HP % for bonus (e.g., 0.3 = below 30%)
  executeBonus?: number;      // Bonus damage multiplier (e.g., 2.0 = double damage)

  // For control powers
  statusEffect?: string;      // 'slow', 'stun', 'bleed', 'poison'
  statusDuration?: number;    // Duration in turns
  statusChance?: number;      // Probability (0-1)

  // For buff powers
  buffStat?: string;          // Which stat to buff ('power', 'armor', 'speed', 'fortune')
  buffValue?: number;         // Amount to buff (flat or multiplier)
  buffDuration?: number;      // Duration in turns

  // For sacrifice powers
  hpCost?: number;            // Percentage of max HP (e.g., 0.2 = 20% HP)
}

/**
 * How power changes at each upgrade level
 * Powers can be upgraded to level 3
 */
export interface PowerLevelEffect {
  level: number;
  valueBonus?: number;        // +X to base value
  cooldownReduction?: number; // -X seconds
  costReduction?: number;     // -X resource cost
  additionalEffect?: string;  // Description of new effect at this level
}

/**
 * Extended Power interface with categories and synergies
 * This is the complete power definition for the game
 */
export interface PowerDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  resourceCost: number;
  cooldown: number;

  // NEW: Category and synergies
  category: PowerCategory;
  synergies?: PowerSynergy[];  // Which paths this power works well with

  // Effect details
  effect: PowerEffect;

  // Upgrade information (powers can be upgraded to level 3)
  maxLevel: number;
  levelEffects?: PowerLevelEffect[];  // Changes at each level
}
