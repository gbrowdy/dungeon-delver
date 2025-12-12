/**
 * Game constants - Magic numbers and configuration values
 * Extracted for better maintainability and tweaking
 */

import type { Stats } from '@/types/game';

// Combat timing (in milliseconds)
export const COMBAT_TIMING = {
  /** Delay before transitioning to next room */
  ROOM_TRANSITION_DELAY: 800,
  /** Delay before showing floor complete screen */
  FLOOR_COMPLETE_DELAY: 1000,
  /** Time between combat ticks */
  COMBAT_TICK_INTERVAL: 1200,
  /** Delay before enemy hit animation */
  ENEMY_HIT_DELAY: 150,
  /** Delay before enemy death animation */
  ENEMY_DEATH_DELAY: 300,
  /** Delay before enemy attack animation */
  ENEMY_ATTACK_DELAY: 500,
  /** Delay before player hit animation */
  PLAYER_HIT_DELAY: 650,
  /** Delay before player death animation */
  PLAYER_DEATH_DELAY: 800,
} as const;

// Combat mechanics
export const COMBAT_MECHANICS = {
  /** Mana regenerated per combat tick */
  MANA_REGEN_PER_TICK: 1, // Reduced from 2 - mana is more precious
  /** Base crit chance for enemies (percentage) */
  ENEMY_BASE_CRIT_CHANCE: 8, // Increased from 5 - enemies crit more often
  /** Damage variance minimum multiplier (0.8 = -20%) */
  DAMAGE_VARIANCE_MIN: 0.85,
  /** Damage variance range (0.3 = up to +15%) */
  DAMAGE_VARIANCE_RANGE: 0.3,
  /** Crit damage multiplier */
  CRIT_DAMAGE_MULTIPLIER: 2.5, // Increased from 2 - crits matter more
  /** Defense reduction factor (enemy defense / this value is subtracted from damage) */
  DEFENSE_REDUCTION_FACTOR: 1, // Changed from 2 - defense now fully subtracts (ATK - DEF)
} as const;

// Level up bonuses - simplified stat gains
export const LEVEL_UP_BONUSES = {
  MAX_HEALTH: 3, // +3 Health per level
  POWER: 1, // +1 Power per level
  MAX_MANA: 5, // +5 Mana per level
  // No other stat gains - real power comes from path abilities
  /** Experience required multiplier per level */
  EXP_MULTIPLIER: 1.5, // Reduced from 1.8 - faster leveling pace
} as const;

// Floor and room configuration
export const FLOOR_CONFIG = {
  /** Default number of rooms per floor */
  DEFAULT_ROOMS_PER_FLOOR: 5,
  /** Starting gold for new characters */
  STARTING_GOLD: 40, // Buffed from 25 - allows one early upgrade
  /** Starting experience required for level 2 */
  STARTING_EXP_TO_LEVEL: 100, // Reduced from 150 - faster first level
} as const;

// Enemy scaling - balanced curve
export const ENEMY_SCALING = {
  /** Health/attack multiplier increase per floor */
  PER_FLOOR_MULTIPLIER: 0.35, // Reduced from 0.45 - enemies don't outpace player as fast
  /** Health/attack multiplier increase per room */
  PER_ROOM_MULTIPLIER: 0.08, // Increased from 0.05 - room progression matters more
  /** Threshold for rare enemies (percentage of floor) */
  RARE_THRESHOLD: 0.7,
  /** Threshold for uncommon enemies (percentage of floor) */
  UNCOMMON_THRESHOLD: 0.4,
} as const;

// Enemy base stats by tier - adjusted for harder early game
export const ENEMY_BASE_STATS = {
  boss: { health: 100, attack: 16, defense: 6 },
  rare: { health: 55, attack: 13, defense: 4 },
  uncommon: { health: 38, attack: 11, defense: 3 },
  common: { health: 25, attack: 9, defense: 2 },
} as const;

// Animation constants
export const ANIMATION_TIMING = {
  /** Duration for enemy enter animation (ms) */
  ENEMY_ENTER_DURATION: 1500,
  /** Duration for floor complete animation (ms) */
  FLOOR_COMPLETE_DURATION: 600,
  /** Sprite frame animation interval (ms) */
  SPRITE_FRAME_INTERVAL: 300,
  /** Highlight effect duration (ms) */
  HIGHLIGHT_DURATION: 800,
} as const;

// UI constants
export const UI_CONSTANTS = {
  /** Maximum combat log entries to keep */
  MAX_COMBAT_LOG_ENTRIES: 50,
  /** Pixel scale for sprites */
  DEFAULT_SPRITE_SCALE: 4,
} as const;

// Shop pricing
export const SHOP_PRICING = {
  /** Base price multiplier for items */
  ITEM_PRICE_MULTIPLIER: 5,
} as const;

// Stat upgrade base costs (before scaling) - balanced for early game accessibility
export const STAT_UPGRADE_BASE_COSTS = {
  HP: 20, // Reduced from 25 - affordable first upgrade
  ATTACK: 30, // Reduced from 40 - key combat upgrade
  DEFENSE: 40, // Reduced from 50 - defensive option
  CRIT: 35, // Reduced from 45
  DODGE: 35, // Reduced from 45
  MANA: 18, // Reduced from 20
  SPEED: 45, // Reduced from 55
  HP_REGEN: 50, // Reduced from 60
  MP_REGEN: 35, // Reduced from 40
  COOLDOWN_SPEED: 60, // Reduced from 75
  CRIT_DAMAGE: 55, // Reduced from 65
  GOLD_FIND: 40, // Reduced from 50
} as const;

// Cost multiplier per purchase (1.15 = +15% per upgrade)
export const STAT_UPGRADE_SCALING = {
  HP: 1.15,
  ATTACK: 1.20,
  DEFENSE: 1.25,
  CRIT: 1.12,
  DODGE: 1.15,
  MANA: 1.10,
  SPEED: 1.30,
  HP_REGEN: 1.25,
  MP_REGEN: 1.20,
  COOLDOWN_SPEED: 1.35,
  CRIT_DAMAGE: 1.22,
  GOLD_FIND: 1.18,
} as const;

// Value gained per upgrade
export const STAT_UPGRADE_VALUES = {
  HP: 12,
  ATTACK: 2,
  DEFENSE: 1,
  CRIT: 2,
  DODGE: 2,
  MANA: 15,
  SPEED: 1,
  HP_REGEN: 0.5,
  MP_REGEN: 0.5,
  COOLDOWN_SPEED: 0.05,
  CRIT_DAMAGE: 0.10,
  GOLD_FIND: 0.05,
} as const;

// Stat upgrade type for type-safe access
export type StatUpgradeType = keyof typeof STAT_UPGRADE_BASE_COSTS;

// Mapping from upgrade ID to stat key and upgrade type
// Used by floor complete screen and upgrade system
export const UPGRADE_CONFIG: Record<string, { stat: keyof Stats; upgradeType: StatUpgradeType; label: string }> = {
  'hp-up': { stat: 'maxHealth', upgradeType: 'HP', label: 'HP' },
  'atk-up': { stat: 'attack', upgradeType: 'ATTACK', label: 'ATK' },
  'def-up': { stat: 'defense', upgradeType: 'DEFENSE', label: 'DEF' },
  'crit-up': { stat: 'critChance', upgradeType: 'CRIT', label: 'CRIT' },
  'dodge-up': { stat: 'dodgeChance', upgradeType: 'DODGE', label: 'DODGE' },
  'mana-up': { stat: 'maxMana', upgradeType: 'MANA', label: 'MP' },
  'speed-up': { stat: 'speed', upgradeType: 'SPEED', label: 'SPD' },
  'hpregen-up': { stat: 'hpRegen', upgradeType: 'HP_REGEN', label: 'HP Regen' },
  'mpregen-up': { stat: 'mpRegen', upgradeType: 'MP_REGEN', label: 'MP Regen' },
  'cooldown-up': { stat: 'cooldownSpeed', upgradeType: 'COOLDOWN_SPEED', label: 'Cooldown' },
  'critdmg-up': { stat: 'critDamage', upgradeType: 'CRIT_DAMAGE', label: 'Crit DMG' },
  'goldfind-up': { stat: 'goldFind', upgradeType: 'GOLD_FIND', label: 'Gold Find' },
} as const;

// Helper function for calculating upgrade cost based on purchase count
export function calculateUpgradeCost(
  stat: StatUpgradeType,
  purchaseCount: number
): number {
  const baseCost = STAT_UPGRADE_BASE_COSTS[stat];
  const scaling = STAT_UPGRADE_SCALING[stat];
  return Math.floor(baseCost * Math.pow(scaling, purchaseCount));
}

// Legacy exports for backwards compatibility (will be removed)
export const STAT_UPGRADE_COSTS = STAT_UPGRADE_BASE_COSTS;
