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

/**
 * Complete set of path playstyle modifiers.
 * All values must be positive numbers.
 * A value of 1.0 means "no change" (neutral/identity).
 * Values < 1.0 reduce the stat, > 1.0 increase it.
 */
export interface PathPlaystyleModifiers {
  readonly autoDamageMultiplier: number;
  readonly attackSpeedMultiplier: number;
  readonly powerDamageMultiplier: number;
  readonly cooldownMultiplier: number;
  readonly procChanceMultiplier: number;
  readonly procDamageMultiplier: number;
  readonly armorEffectiveness: number;
  readonly blockEffectiveness: number;
}

/**
 * Path-specific feature flags (separate from numeric modifiers)
 */
export interface PathFeatures {
  readonly resourceSystemEnabled?: boolean; // Phase 6: unique resource system
}

export const PATH_PLAYSTYLE_MODIFIERS: {
  passive: PathPlaystyleModifiers;
  active: PathPlaystyleModifiers;
} = {
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
    procChanceMultiplier: 1.0,        // No proc bonus (neutral)
    procDamageMultiplier: 1.0,        // No proc damage bonus (neutral)
    armorEffectiveness: 1.0,          // No armor bonus (neutral)
    blockEffectiveness: 1.0,          // No block bonus (neutral)
  },
};

/** Path-specific feature flags */
export const PATH_FEATURES: { passive: PathFeatures; active: PathFeatures } = {
  passive: { resourceSystemEnabled: false },
  active: { resourceSystemEnabled: true }, // Phase 6: unique resource system
};

export const COOLDOWN_FLOOR = 500; // Minimum cooldown in milliseconds (0.5s)
export const COOLDOWN_FLOOR_SECONDS = COOLDOWN_FLOOR / 1000; // Same value in seconds for use with power cooldowns

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

// === ITEM TIER VALUE BUDGETS (Phase 4) ===
// Defines how much total "stat point value" each item tier should provide
// Used to ensure consistent value scaling across tiers

export const ITEM_TIER_BUDGETS = {
  // Starter items: Very basic, single stat bonuses
  STARTER: {
    statPoints: 3,       // e.g., +3 Power or +15 Health
    effectValue: 0,      // No effects
    priceRange: { min: 40, max: 50 },
  },
  // Class items: Dual-stat with small class-specific effects
  CLASS: {
    statPoints: 8,       // e.g., +4 Power, +5 Fortune
    effectValue: 1,      // Small effect worth ~1 stat point
    priceRange: { min: 100, max: 140 },
  },
  // Specialty items: Strong stats with meaningful effects
  SPECIALTY: {
    statPoints: 10,      // e.g., +5 Power, +3 Speed
    effectValue: 3,      // Meaningful effect worth ~3 stat points
    priceRange: { min: 140, max: 220 },
  },
  // Legendary items: Powerful stats with build-defining effects
  LEGENDARY: {
    statPoints: 14,      // e.g., +7 Power, +5 Armor
    effectValue: 6,      // Powerful effect worth ~6 stat points
    priceRange: { min: 320, max: 400 },
  },
} as const;

// Convert effects to stat point equivalents for value comparison
// These values are used to audit item balance and ensure consistency
export const EFFECT_VALUES = {
  // Healing effects (value per trigger)
  ON_HIT_HEAL_2: 0.5,           // Heal 2 on hit ≈ 0.5 stat points
  ON_HIT_HEAL_5: 1.0,           // Heal 5 on hit ≈ 1 stat point
  ON_KILL_HEAL_5: 0.5,          // Heal 5% max HP on kill ≈ 0.5 stat points
  LIFESTEAL_10: 2.5,            // 10% lifesteal ≈ 2.5 stat points
  HP_REGEN_1: 1.5,              // +1 HP/sec ≈ 1.5 stat points

  // Damage effects
  ON_CRIT_BONUS_20: 1.0,        // +20% crit damage ≈ 1 stat point
  ON_CRIT_BONUS_50: 2.5,        // +50% crit damage ≈ 2.5 stat points
  ON_HIT_DAMAGE_5: 0.8,         // +5 damage on hit ≈ 0.8 stat points
  EXECUTE_50_BELOW_25: 3.0,     // +50% damage vs low HP ≈ 3 stat points
  LOW_HP_DAMAGE_10: 1.0,        // +10% damage below 50% HP ≈ 1 stat point

  // Mana effects
  ON_KILL_MANA_5: 0.3,          // +5 mana on kill ≈ 0.3 stat points
  ON_CRIT_MANA_3: 0.5,          // +3 mana on crit ≈ 0.5 stat points
  MANA_REGEN_2: 1.0,            // +2 mana/sec ≈ 1 stat point
  POWER_COST_REDUCTION_20: 2.0, // -20% power cost ≈ 2 stat points

  // Defensive effects
  BLOCK_ENHANCEMENT_50: 2.0,    // Block 50% more effective ≈ 2 stat points
  DAMAGE_REFLECT_3: 1.0,        // Reflect 3 damage ≈ 1 stat point
  DAMAGE_REDUCTION_5: 2.5,      // -5% damage taken ≈ 2.5 stat points
  DODGE_CHANCE_5: 1.5,          // +5% dodge chance ≈ 1.5 stat points

  // Utility effects
  GOLD_BONUS_25: 0.5,           // +25% gold ≈ 0.5 stat points (economy)
  COOLDOWN_REDUCTION_10: 0.5,   // -10% cooldowns ≈ 0.5 stat points
  COOLDOWN_REDUCTION_15: 0.8,   // -15% cooldowns ≈ 0.8 stat points

  // Legendary-tier effects (build-defining)
  SURVIVE_LETHAL: 5.0,          // Survive lethal damage ≈ 5 stat points
  REVIVE_30: 4.0,               // Revive with 30% HP ≈ 4 stat points
  TRIPLE_CRIT: 4.0,             // 3x crit multiplier ≈ 4 stat points
  POWER_DAMAGE_50: 4.0,         // +50% power damage ≈ 4 stat points
  IGNORE_DODGE: 3.0,            // Attacks ignore dodge ≈ 3 stat points
} as const;

// Stat point values for raw stats (used in value calculations)
export const STAT_POINT_VALUES = {
  power: 1.0,      // 1 power = 1 stat point
  armor: 1.0,      // 1 armor = 1 stat point
  speed: 0.5,      // 2 speed = 1 stat point (speed is abundant)
  fortune: 0.5,    // 2 fortune = 1 stat point (crit chance)
  maxHealth: 0.2,  // 5 health = 1 stat point
  health: 0.2,     // 5 health = 1 stat point
  maxMana: 0.15,   // 6-7 mana = 1 stat point
  mana: 0.15,      // 6-7 mana = 1 stat point
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
