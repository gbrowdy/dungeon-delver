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

// DEPRECATED: Stat upgrade constants removed - old upgrade purchase system replaced with shop
// Keeping minimal exports for backwards compatibility during migration
// TODO: Remove completely once all UI references are cleaned up
