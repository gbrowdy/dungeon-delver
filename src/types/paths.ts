/**
 * Path System Type Definitions
 *
 * The path system provides branching character progression:
 * - Each class has 2 paths (Active vs Passive playstyles)
 * - Each path branches into 2 subpaths at level 4+
 * - Players choose 1 of 2 abilities per level after selecting path
 * - Capstone ability unlocks at level 6
 */

import { CharacterClass } from '@/types/game';

/**
 * Path playstyle types
 * - active: Rewards power timing and active management
 * - passive: Works automatically without player intervention
 */
export type PathType = 'active' | 'passive';

/**
 * Trigger conditions for path ability effects
 * Extends the item trigger system with path-specific triggers
 */
export type PathAbilityTrigger =
  // Combat triggers (shared with item system)
  | 'on_hit'           // When player hits enemy
  | 'on_crit'          // When player lands critical hit
  | 'on_kill'          // When player kills enemy
  | 'on_damaged'       // When player takes damage
  | 'combat_start'     // At start of combat encounter
  | 'turn_start'       // At start of each combat turn
  // Path-specific triggers
  | 'on_power_use'     // When player uses a power
  | 'on_block'         // When player successfully blocks
  | 'on_dodge'         // When player dodges an attack
  | 'on_low_hp'        // When player HP falls below threshold
  | 'on_low_mana'      // When player mana falls below threshold
  | 'on_full_hp'       // When player is at max HP
  | 'on_combo'         // When player achieves power combo
  | 'on_status_inflict'// When player inflicts status effect
  | 'passive'          // Always active (stat bonuses, auras)
  | 'conditional';     // Activated based on condition check

/**
 * Stat types that can be modified by path abilities
 */
export type PathStatType = 'health' | 'maxHealth' | 'power' | 'armor' | 'speed' | 'mana' | 'maxMana' | 'fortune';

/**
 * Conditional checks for ability activation
 */
export interface PathAbilityCondition {
  type: 'hp_below' | 'hp_above' | 'mana_below' | 'mana_above' | 'enemy_hp_below' | 'combo_count';
  value: number; // Threshold value (percentage for HP/mana, absolute for combo)
}

/**
 * Stat modification types
 */
export interface StatModifier {
  stat: PathStatType;
  flatBonus?: number;      // Flat increase (e.g., +10 power)
  percentBonus?: number;   // Percentage increase (e.g., 0.15 for +15%)
}

/**
 * Power modification types (affects player powers)
 */
export interface PowerModifier {
  type: 'cooldown_reduction' | 'cost_reduction' | 'power_bonus' | 'combo_bonus';
  value: number;           // Amount of reduction/bonus (percentage or flat)
  powerIds?: string[];     // Specific powers to affect (empty = all powers)
}

/**
 * Damage conversion/reflection mechanics
 */
export interface DamageModifier {
  type: 'reflect' | 'convert_heal' | 'bonus_damage' | 'lifesteal';
  value: number;           // Percentage or flat amount
  condition?: PathAbilityCondition; // Optional conditional activation
}

/**
 * Status effect application
 */
export interface StatusApplication {
  statusType: 'poison' | 'stun' | 'slow' | 'bleed';
  damage?: number;         // Damage per turn (for DoTs)
  duration: number;        // Turns
  chance: number;          // Probability (0-1)
}

/**
 * Comprehensive effect definition for path abilities
 * Supports multiple effect types simultaneously
 */
export interface PathAbilityEffect {
  // Trigger conditions
  trigger: PathAbilityTrigger;
  condition?: PathAbilityCondition; // Optional conditional requirement

  // Effect types (can have multiple)
  statModifiers?: StatModifier[];   // Stat bonuses
  powerModifiers?: PowerModifier[]; // Power modifications
  damageModifier?: DamageModifier;  // Damage conversion/reflection

  // Direct effects
  heal?: number;                    // Flat heal amount
  damage?: number;                  // Bonus damage
  manaRestore?: number;             // Mana restoration

  // Status effects
  statusApplication?: StatusApplication; // Apply status to enemy

  // Special mechanics
  cleanse?: boolean;                // Remove status effects from player
  shield?: number;                  // Grant temporary shield (damage absorption)

  // Activation parameters
  chance?: number;                  // Proc chance (0-1), defaults to 1
  cooldown?: number;                // Internal cooldown in seconds (0 = no cooldown)
  duration?: number;                // Duration in turns (for buffs)
}

/**
 * Individual path ability definition
 * Represents a single choice in the path progression tree
 */
export interface PathAbility {
  id: string;                       // Unique identifier (e.g., 'warrior_rage_fury_strike')
  name: string;                     // Display name
  description: string;              // Effect description for UI
  icon: string;                     // Lucide icon name
  levelRequired: number;            // Minimum level to offer this ability
  isCapstone?: boolean;             // True if this is a level 6 capstone ability
  effects: PathAbilityEffect[];     // Ability effect definitions (abilities can have multiple effects)
  subpath: string | null;           // Which subpath this belongs to (null for core path abilities)
}

/**
 * Subpath definition (branches available from level 4+)
 * Each path splits into 2 subpaths at level 4
 */
export interface SubpathDefinition {
  id: string;                       // Unique identifier (e.g., 'warrior_rage_berserker')
  name: string;                     // Display name (e.g., 'Berserker')
  description: string;              // Flavor text and playstyle description
  icon: string;                     // Lucide icon name
  theme?: string;                   // Optional: thematic tag (e.g., 'control', 'burst_damage', 'tank')
}

/**
 * Complete path definition
 * Each class has 2 paths (active vs passive)
 */
export interface PathDefinition {
  id: string;                       // Unique identifier (e.g., 'warrior_rage')
  name: string;                     // Display name (e.g., 'Path of Rage')
  type: PathType;                   // Active or passive playstyle
  description: string;              // Flavor text and overview
  icon: string;                     // Lucide icon name
  abilities: PathAbility[];         // All abilities in this path
  subpaths: SubpathDefinition[];    // Subpath branches (available at level 4+)
  theme?: string;                   // Optional: thematic tag for the overall path
  className?: string;               // Optional: class name for reference (can be derived from abilities)
}

/**
 * Player's active path progression
 * Tracks which path, subpath, and abilities the player has chosen
 */
export interface PlayerPath {
  pathId: string;                   // Selected path ID
  subpathId?: string;               // Selected subpath ID (chosen at level 4)
  abilities: string[];              // IDs of chosen abilities (in order of selection)
}

/**
 * Path choice presentation for UI
 * Used when offering path selection at level 2
 */
export interface PathChoice {
  path: PathDefinition;
  previewAbilities: PathAbility[];  // First 2-3 abilities to show as preview
}

/**
 * Ability choice presentation for UI
 * Used when offering ability selection at level-up
 */
export interface AbilityChoice {
  abilities: [PathAbility, PathAbility]; // Always 2 choices per level
  level: number;                          // Level at which choice is offered
  isSubpathChoice?: boolean;              // True if this level (4) is subpath selection
}

/**
 * Subpath choice presentation for UI
 * Used specifically at level 4 for subpath selection
 */
export interface SubpathChoice {
  subpaths: [SubpathDefinition, SubpathDefinition]; // Always 2 subpath choices
  path: PathDefinition;                              // Parent path context
}
