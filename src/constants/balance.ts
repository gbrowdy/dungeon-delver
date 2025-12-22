/**
 * Game balance configuration
 * All tunable game balance values in one place for easy adjustment
 */

// === COMBAT BALANCE ===

export const COMBAT_BALANCE = {
  // Block ability - more expensive but still useful
  BLOCK_MANA_COST: 15, // Increased from 10
  BLOCK_DAMAGE_REDUCTION: 0.4, // Reduced from 0.5 - 40% damage reduction

  // Power cooldowns (time-based)
  COOLDOWN_TICK_INTERVAL: 100, // How often to tick cooldowns (ms)
  BASE_COOLDOWN_SPEED: 1.0, // Default cooldown recovery speed multiplier

  // Combat loop timing
  HERO_JITTER_ADVANTAGE: 50, // Hero gets a small head start (in ms) to break ties in their favor
  ATTACK_HOLD_DURATION: 200, // How long to hold progress at 100% after attack fires (ms)
  BASE_SPEED: 10, // Reference speed for interval calculations

  // Fortune scaling (Phase 1)
  FORTUNE_LINEAR_CAP: 15, // Full linear scaling up to this point
  FORTUNE_DIMINISH_RATE: 0.01, // Rate after cap (1% per fortune point)
  CRIT_DAMAGE_CAP: 2.5, // Maximum crit multiplier (250%)

  // Speed scaling (Phase 1)
  SPEED_LINEAR_CAP: 12, // Full linear scaling up to this point
  SPEED_DIMINISH_RATE: 0.04, // Rate after cap (4% per speed point)

  // Combo system
  MAX_COMBO_COUNT: 5,
  COMBO_DAMAGE_BONUS_PER_LEVEL: 0.1, // +10% damage per combo level

  // Stat caps (percentage)
  MAX_CRIT_CHANCE: 100,
  MAX_DODGE_CHANCE: 100,

  // Buff/debuff duration (turns)
  DEFAULT_BUFF_DURATION: 3,
  DEFAULT_POISON_DURATION: 3,
  DEFAULT_STUN_DURATION: 1,

  // Permanent effects (effectively infinite duration/cooldown)
  PERMANENT_DURATION: 999999, // Used for auras and once-per-combat/floor abilities

  // Enemy mechanics
  SHIELDED_DEFENSE_MULTIPLIER: 1.5, // Shielded enemies have 1.5x defense
  MULTI_HIT_DAMAGE_MODIFIER: 0.7, // Multi-hit does 70% damage per hit
  POISON_SCALING_PER_FLOOR: 0.1, // +10% poison damage per floor
} as const;

// === PATH PLAYSTYLE MODIFIERS ===
// These modifiers create fundamental differences between active and passive paths
// Active paths: Lower auto damage, stronger powers, faster cooldowns
// Passive paths: Higher auto damage, weaker powers, enhanced procs

export const PATH_PLAYSTYLE_MODIFIERS = {
  passive: {
    autoDamageMultiplier: 1.50,       // +50% auto-attack damage
    attackSpeedMultiplier: 1.25,      // +25% attack speed
    powerDamageMultiplier: 0.50,      // -50% power damage (Phase 5: → 0.25)
    cooldownMultiplier: 2.0,          // 2x longer cooldowns
    procChanceMultiplier: 1.50,       // +50% item proc chance
    procDamageMultiplier: 1.75,       // +75% proc damage
    armorEffectiveness: 1.25,         // +25% armor value
    blockEffectiveness: 1.25,         // +25% block reduction
  },
  active: {
    autoDamageMultiplier: 0.60,       // -40% auto-attack damage
    attackSpeedMultiplier: 0.85,      // -15% attack speed
    powerDamageMultiplier: 2.0,       // +100% power damage
    cooldownMultiplier: 0.60,         // 40% faster cooldowns
    resourceSystemEnabled: true,      // Uses unique resource (Phase 6)
  },
} as const;

export const COOLDOWN_FLOOR = 500; // Minimum cooldown in milliseconds (0.5s)

export type PathPlaystyle = keyof typeof PATH_PLAYSTYLE_MODIFIERS;

// === REWARD SCALING ===

export const REWARD_CONFIG = {
  // XP rewards - reduced for slower leveling
  BASE_ENEMY_XP: 5,  // Reduced from 5
  XP_PER_FLOOR: 3,   // Reduced from 5
  XP_PER_ROOM: 2,    // Reduced from 2
  BOSS_XP_MULTIPLIER: 2, // Reduced from 3

  // Gold rewards - balanced for early game affordability
  BASE_ENEMY_GOLD: 4,  // Buffed from 2 - better base income
  GOLD_PER_FLOOR: 2,   // Buffed from 1 - more scaling
  GOLD_PER_ROOM: 1,    // Buffed from 0 - deeper rooms reward more
  BOSS_GOLD_MULTIPLIER: 4, // Buffed from 3 - bosses are more rewarding
  GOLD_VARIANCE_MIN: 0.8,
  GOLD_VARIANCE_RANGE: 0.4, // 0.8 to 1.2 range

  // Level-based reward penalty
  LEVEL_PENALTY_PER_LEVEL: 0.25, // Increased from 0.20 - harder penalty
  LEVEL_PENALTY_MIN_MULTIPLIER: 0.10,

  // Enemy speed generation
  ENEMY_BASE_SPEED: 5,
  ENEMY_SPEED_RANGE: 10,

  // Enemy item drops - DISABLED (shop-only progression system)
  // Set all drop chances to 0 to disable random loot
  ENEMY_DROP_BASE_CHANCE: 0,
  ENEMY_DROP_GOLD_FIND_SCALING: 0,
  ENEMY_DROP_MAX_CHANCE: 0,
  BOSS_DROP_CHANCE: 0,
  BOSS_LEGENDARY_BOOST: 0,
} as const;

// === ITEM BALANCE ===

export const ITEM_BALANCE = {
  // Rarity probability thresholds (cumulative)
  RARITY_THRESHOLD_COMMON: 0.5,      // < 0.5 = common (50%)
  RARITY_THRESHOLD_UNCOMMON: 0.75,   // 0.5-0.75 = uncommon (25%)
  RARITY_THRESHOLD_RARE: 0.9,        // 0.75-0.9 = rare (15%)
  RARITY_THRESHOLD_EPIC: 0.98,       // 0.9-0.98 = epic (8%)
  // >= 0.98 = legendary (2%)

  // Rarity effect chance (probability that item has special effect)
  EFFECT_CHANCE_COMMON: 0,
  EFFECT_CHANCE_UNCOMMON: 0,
  EFFECT_CHANCE_RARE: 0.3,
  EFFECT_CHANCE_EPIC: 0.6,
  EFFECT_CHANCE_LEGENDARY: 1.0,

  // Rarity value multipliers
  VALUE_MULTIPLIER_EPIC: 1.5,
  VALUE_MULTIPLIER_LEGENDARY: 1.5,
  PROC_CHANCE_MULTIPLIER_LEGENDARY: 1.25,

  // Stat scaling
  BASE_STAT_VALUE: 5,
  STAT_VALUE_PER_FLOOR: 1,
  BONUS_STAT_RATIO: 0.5, // Secondary stat is 50% of primary

  // Price calculation
  PRICE_BASE_MULTIPLIER: 10,
  PRICE_RARITY_MULTIPLIER: {
    common: 1,
    uncommon: 1.5,
    rare: 2.5,
    epic: 4,
    legendary: 6,
  },

  // Pity system for item drops
  PITY_THRESHOLD: 5, // After 5 non-rare items, boost next roll
  PITY_RARITY_BOOST: 0.25, // +25% to roll toward rare+ when pity triggers
} as const;

// === ITEM EFFECT VALUES ===

export const ITEM_EFFECTS = {
  // Weapon effects
  WEAPON: {
    ON_CRIT_DAMAGE_BONUS: 0.2, // +20% damage on crit
    ON_HIT_HEAL: 2,
    ON_HIT_HEAL_CHANCE: 0.10,
    ON_KILL_MANA: 5,
    ON_HIT_DAMAGE: 5,
    ON_HIT_DAMAGE_CHANCE: 0.1,
  },

  // Armor effects
  ARMOR: {
    COMBAT_START_DEFENSE: 5,
    ON_DAMAGED_HEAL: 2,
    ON_DAMAGED_HEAL_CHANCE: 0.2,
    TURN_START_HEAL: 1,
    ON_DAMAGED_MANA: 3,
    ON_DAMAGED_MANA_CHANCE: 0.25,
  },

  // Accessory effects
  ACCESSORY: {
    COMBAT_START_MANA: 15,
    ON_CRIT_HEAL: 5,
    TURN_START_MANA: 2,
    ON_KILL_HEAL: 4,
  },
} as const;

// === ENEMY ABILITY BALANCE ===

export const ENEMY_ABILITY_CONFIG = {
  // Floor-based ability scaling for better new player experience
  // Each floor defines: chance of enemy having abilities, max abilities possible
  FLOOR_SCALING: {
    1: { chance: 0.2, maxAbilities: 1 },  // 20% chance, max 1 ability
    2: { chance: 0.4, maxAbilities: 1 },  // 40% chance, max 1 ability
    3: { chance: 0.6, maxAbilities: 1 },  // 60% chance, max 1 ability
    4: { chance: 0.8, maxAbilities: 2 },  // 80% chance, max 2 abilities
  } as Record<number, { chance: number; maxAbilities: number }>,

  // Floor 5+ configuration (always has abilities)
  LATE_FLOOR_MIN_ABILITIES: 2,
  LATE_FLOOR_MAX_ABILITIES: 3,

  // Common ability chances (used for specific ability rolls)
  COMMON_ABILITY_CHANCE: 0.6,
  MEDIUM_ABILITY_CHANCE: 0.5,
  LOW_ABILITY_CHANCE: 0.4,
} as const;

// === POWER BALANCE ===

export const POWER_BALANCE = {
  // Vampiric Touch
  VAMPIRIC_HEAL_RATIO: 0.5, // Heal 50% of damage dealt

  // Battle Cry
  BATTLE_CRY_ATTACK_BOOST: 0.5, // +50% attack

  // Shield Wall
  SHIELD_WALL_DEFENSE_BOOST: 1.0, // +100% defense (double)

  // Mana Surge
  MANA_SURGE_RESTORE_RATIO: 0.5, // Restore 50% of max mana
} as const;

// === COMBAT EVENT TIMING ===
// These are delays for animation sequencing after attacks trigger

export const COMBAT_EVENT_DELAYS = {
  // Player attack sequence
  PLAYER_HIT_DELAY: 200,      // Delay after player attack before enemy hit event

  // Enemy attack sequence - now immediate since attacks have separate timers
  ENEMY_ATTACK_DELAY: 50,     // Small delay to let progress bar visually reset
  PLAYER_HIT_OFFSET: 250,     // Delay after enemy attack before player hit event

  // Event queue processing
  EVENT_QUEUE_TICK_INTERVAL: 30, // How often to check for scheduled events
} as const;
