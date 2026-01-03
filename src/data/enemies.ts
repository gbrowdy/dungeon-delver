import { Enemy, EnemyAbility, EnemyIntent } from '@/types/game';
import {
  ENEMY_SCALING,
  ENEMY_BASE_STATS,
  FLOOR_CONFIG,
  FLOOR_MULTIPLIERS,
  ENEMY_STAT_SCALING,
  ROOM_SCALING,
} from '@/constants/game';
import { isFeatureEnabled } from '@/constants/features';
import { logError } from '@/utils/gameLogger';
import {
  COMBAT_BALANCE,
  REWARD_CONFIG,
  ENEMY_ABILITY_CONFIG,
} from '@/constants/balance';
import { generateFinalBoss } from './finalBoss';
import { FloorTheme } from '@/data/floorThemes';
import { getRandomModifiers, toModifierEffect, ModifierEffect } from '@/data/enemyModifiers';

/**
 * Default floor theme with neutral modifiers
 * Used when no floor theme is provided to generateEnemy
 */
const DEFAULT_FLOOR_THEME: FloorTheme = {
  id: 'default',
  name: 'Standard',
  description: 'A balanced floor with no special modifiers.',
  composition: 'mixed',
  statModifiers: {
    health: 1.0,
    power: 1.0,
    armor: 1.0,
    speed: 1.0,
  },
  favoredAbilities: [],
  extraAbilityChance: 0,
};

const ENEMY_NAMES = {
  common: ['Goblin', 'Skeleton', 'Slime', 'Rat', 'Spider', 'Imp', 'Zombie'],
  uncommon: ['Orc', 'Dark Elf', 'Werewolf', 'Ghost', 'Harpy', 'Minotaur'],
  rare: ['Vampire', 'Demon', 'Golem', 'Lich', 'Hydra Head'],
  boss: ['Dragon', 'Archdemon', 'Death Knight', 'Elder Lich', 'Titan'],
} as const;

// Bespoke prefixes for every ability combination
// Key format: sorted ability IDs joined by '+'
const ABILITY_COMBO_PREFIXES: Record<string, string> = {
  // Single abilities
  'double_strike': 'Swift',
  'triple_strike': 'Furious',
  'poison_bite': 'Venomous',
  'stunning_blow': 'Crushing',
  'regenerate': 'Undying',
  'enrage': 'Raging',
  'shield_bash': 'Armored',

  // Two-ability combinations
  'double_strike+enrage': 'Berserker',
  'double_strike+poison_bite': 'Viper',
  'double_strike+stunning_blow': 'Hammering',
  'enrage+triple_strike': 'Savage',
  'regenerate+stunning_blow': 'Eternal',
  'enrage+stunning_blow': 'Brutal',
  'enrage+regenerate': 'Unkillable',
  'poison_bite+regenerate': 'Plague',
  'poison_bite+stunning_blow': 'Paralyzing',
  'enrage+poison_bite': 'Feral',
  'poison_bite+triple_strike': 'Virulent',
  'enrage+shield_bash': 'Juggernaut',
  'shield_bash+stunning_blow': 'Sentinel',
  'regenerate+triple_strike': 'Relentless',

  // Three-ability combinations (rare/boss)
  'poison_bite+regenerate+stunning_blow': 'Pestilent',
  'enrage+poison_bite+triple_strike': 'Apocalypse',
  'enrage+shield_bash+triple_strike': 'Destroyer',
  'poison_bite+regenerate+triple_strike': 'Noxious',
  'enrage+regenerate+stunning_blow': 'Immortal',
  'enrage+shield_bash+stunning_blow': 'Invincible',
  'enrage+poison_bite+regenerate': 'Blighted',
  'double_strike+enrage+shield_bash': 'Champion',
  'double_strike+enrage+stunning_blow': 'Dominator',

  // Four-ability combinations (bosses)
  'enrage+poison_bite+regenerate+triple_strike': 'Cataclysmic',
  'double_strike+enrage+shield_bash+stunning_blow': 'Legendary',
  'enrage+poison_bite+regenerate+stunning_blow': 'Dread',
  'enrage+shield_bash+stunning_blow+triple_strike': 'Titanic',
};

// Power cost of each ability (reduces enemy stats as compensation)
const ABILITY_POWER_COST: Record<string, number> = {
  double_strike: 0.08,   // 8% stat reduction
  triple_strike: 0.12,   // 12% stat reduction
  poison_bite: 0.10,     // 10% stat reduction
  stunning_blow: 0.12,   // 12% stat reduction (stun is powerful)
  regenerate: 0.08,      // 8% stat reduction
  enrage: 0.06,          // 6% stat reduction (temporary buff)
  shield_bash: 0.06,     // 6% stat reduction (defensive)
};

// Enemy abilities pool - chances increased for more dynamic combat
const ENEMY_ABILITIES: Record<string, EnemyAbility> = {
  // Common abilities
  double_strike: {
    id: 'double_strike',
    name: 'Double Strike',
    type: 'multi_hit',
    value: 2, // Number of hits
    cooldown: 3,
    currentCooldown: 0,
    chance: 0.5, // 50% chance when off cooldown
    icon: 'ability-multi_hit',
    description: 'Attacks twice in quick succession',
  },
  poison_bite: {
    id: 'poison_bite',
    name: 'Poison Bite',
    type: 'poison',
    value: 3, // Damage per turn for 3 turns
    cooldown: 4,
    currentCooldown: 0,
    chance: 0.45, // 45% chance
    icon: 'ability-poison',
    description: 'Inflicts poison dealing damage over time',
  },
  // Uncommon abilities
  stunning_blow: {
    id: 'stunning_blow',
    name: 'Stunning Blow',
    type: 'stun',
    value: 1, // Stun duration in turns
    cooldown: 5,
    currentCooldown: 0,
    chance: 0.35, // 35% chance
    icon: 'ability-stun',
    description: 'A heavy blow that stuns the target',
  },
  regenerate: {
    id: 'regenerate',
    name: 'Regenerate',
    type: 'heal',
    value: 0.15, // Heal 15% of max HP
    cooldown: 4,
    currentCooldown: 0,
    chance: 0.5, // 50% chance
    icon: 'ability-heal',
    description: 'Recovers health over time',
  },
  // Rare/Boss abilities
  enrage: {
    id: 'enrage',
    name: 'Enrage',
    type: 'enrage',
    value: 0.5, // +50% attack
    cooldown: 6,
    currentCooldown: 0,
    chance: 0.4, // 40% chance
    icon: 'ability-enrage',
    description: 'Becomes enraged, increasing attack power',
  },
  shield_bash: {
    id: 'shield_bash',
    name: 'Shield Bash',
    type: 'shield',
    value: 2, // Shield duration in turns
    cooldown: 5,
    currentCooldown: 0,
    chance: 0.35, // 35% chance
    icon: 'ability-shield',
    description: 'Raises a shield, reducing incoming damage',
  },
  triple_strike: {
    id: 'triple_strike',
    name: 'Triple Strike',
    type: 'multi_hit',
    value: 3,
    cooldown: 5,
    currentCooldown: 0,
    chance: 0.4, // 40% chance
    icon: 'ability-triple_strike',
    description: 'Unleashes three rapid attacks',
  },
};

// Which abilities each enemy type can have
const ENEMY_ABILITY_POOLS: Record<string, string[]> = {
  // Common enemies - simple abilities
  Goblin: ['double_strike'],
  Skeleton: ['double_strike'],
  Slime: ['poison_bite'],
  Rat: ['poison_bite'],
  Spider: ['poison_bite', 'stunning_blow'],
  Imp: ['double_strike'],
  Zombie: ['stunning_blow'],
  // Uncommon enemies - better abilities
  Orc: ['double_strike', 'enrage'],
  'Dark Elf': ['double_strike', 'poison_bite'],
  Werewolf: ['triple_strike', 'enrage'],
  Ghost: ['stunning_blow', 'regenerate'],
  Harpy: ['double_strike', 'stunning_blow'],
  Minotaur: ['stunning_blow', 'enrage'],
  // Rare enemies - powerful abilities
  Vampire: ['regenerate', 'stunning_blow', 'enrage'],
  Demon: ['triple_strike', 'enrage', 'poison_bite'],
  Golem: ['shield_bash', 'stunning_blow', 'enrage'],
  Lich: ['poison_bite', 'regenerate', 'stunning_blow'],
  'Hydra Head': ['triple_strike', 'poison_bite', 'regenerate'],
  // Boss enemies - multiple powerful abilities
  Dragon: ['triple_strike', 'enrage', 'shield_bash'],
  Archdemon: ['triple_strike', 'poison_bite', 'enrage', 'regenerate'],
  'Death Knight': ['stunning_blow', 'enrage', 'shield_bash', 'double_strike'],
  'Elder Lich': ['poison_bite', 'stunning_blow', 'regenerate', 'enrage'],
  Titan: ['triple_strike', 'stunning_blow', 'enrage', 'shield_bash'],
};

interface AbilityResult {
  abilities: EnemyAbility[];
  powerCost: number; // Total stat reduction multiplier (0.0 to 1.0)
  prefix: string | null; // Name prefix based on primary ability
}

/**
 * Get abilities for an enemy based on its name and difficulty
 * Returns abilities, their total power cost, and a name prefix
 */
function getEnemyAbilities(baseName: string, floor: number, isBoss: boolean): AbilityResult {
  const abilityPool = ENEMY_ABILITY_POOLS[baseName] || [];
  if (abilityPool.length === 0) {
    return { abilities: [], powerCost: 0, prefix: null };
  }

  // Determine how many abilities this enemy gets
  // Floor-based scaling for better new player experience (see ENEMY_ABILITY_CONFIG.FLOOR_SCALING)
  let numAbilities = 0;

  if (isBoss) {
    // Bosses always get 2-3 abilities based on floor progression
    numAbilities = Math.min(2 + Math.floor(floor / 3), abilityPool.length);
  } else {
    // Non-boss ability scaling uses config-driven approach
    const floorConfig = ENEMY_ABILITY_CONFIG.FLOOR_SCALING[floor];

    if (floorConfig) {
      // Floors 1-4: use scaling table
      if (Math.random() < floorConfig.chance) {
        // Random count from 1 to maxAbilities (inclusive)
        // When maxAbilities=1: always 1
        // When maxAbilities=2: 50% chance of 1, 50% chance of 2
        numAbilities = 1 + Math.floor(Math.random() * floorConfig.maxAbilities);
      }
    } else {
      // Floor 5+: always has 2-3 abilities
      const { LATE_FLOOR_MIN_ABILITIES, LATE_FLOOR_MAX_ABILITIES } = ENEMY_ABILITY_CONFIG;
      const range = LATE_FLOOR_MAX_ABILITIES - LATE_FLOOR_MIN_ABILITIES + 1;
      numAbilities = LATE_FLOOR_MIN_ABILITIES + Math.floor(Math.random() * range);
    }

    // Cap by available ability pool
    numAbilities = Math.min(numAbilities, abilityPool.length);
  }

  if (numAbilities === 0) {
    return { abilities: [], powerCost: 0, prefix: null };
  }

  // Randomly select abilities
  const shuffled = [...abilityPool].sort(() => Math.random() - 0.5);
  const selectedIds = shuffled.slice(0, numAbilities);

  let totalPowerCost = 0;
  const abilities = selectedIds.map(id => {
    const ability = ENEMY_ABILITIES[id];
    if (!ability) return null;

    // Add power cost
    totalPowerCost += ABILITY_POWER_COST[id] ?? 0;

    // Scale ability damage with floor
    const scaledAbility = { ...ability };
    if (scaledAbility.type === 'poison') {
      scaledAbility.value = Math.floor(scaledAbility.value * (1 + (floor - 1) * 0.2));
    }
    return scaledAbility;
  }).filter((a): a is EnemyAbility => a !== null);

  // Generate combo key by sorting ability IDs and joining with '+'
  const comboKey = [...selectedIds].sort().join('+');
  const prefix = ABILITY_COMBO_PREFIXES[comboKey] ?? null;

  return { abilities, powerCost: totalPowerCost, prefix };
}

/**
 * Get an ability by its ID (for testing)
 */
export function getAbilityById(id: string): EnemyAbility | undefined {
  return ENEMY_ABILITIES[id] ? { ...ENEMY_ABILITIES[id] } : undefined;
}

/**
 * Calculate enemy's next intent based on abilities and cooldowns
 */
export function calculateEnemyIntent(enemy: Enemy): EnemyIntent {
  // Check for abilities that are off cooldown
  const readyAbilities = enemy.abilities.filter(
    (a: EnemyAbility) => a.currentCooldown === 0
  );

  // If any abilities are ready, roll for each one and pick the first that succeeds
  // This makes ability usage more predictable while still having randomness
  if (readyAbilities.length > 0) {
    // Shuffle ready abilities for variety
    const shuffled = [...readyAbilities].sort(() => Math.random() - 0.5);

    for (const ability of shuffled) {
      // Roll against the ability's chance
      if (Math.random() < ability.chance) {
        return {
          type: 'ability',
          ability,
          damage: ability.type === 'multi_hit'
            ? Math.floor(enemy.power * COMBAT_BALANCE.MULTI_HIT_DAMAGE_MODIFIER * ability.value) // Multi-hit total damage
            : ability.type === 'poison'
              ? ability.value * COMBAT_BALANCE.DEFAULT_POISON_DURATION // Total poison damage over duration
              : undefined,
          icon: ability.icon,
        };
      }
    }
  }

  // Default: basic attack
  return {
    type: 'attack',
    damage: enemy.power,
    icon: 'ability-attack',
  };
}

// Validation constants
const MIN_FLOOR = 1;
const MAX_FLOOR = 100;
const MIN_ROOM = 1;
const MIN_ROOMS_PER_FLOOR = 1;

/**
 * Calculate difficulty multiplier for enemy scaling
 * Uses exponential floor scaling when ENEMY_SCALING_V2 is enabled
 *
 * Note: This function assumes sanitized inputs (floor >= 1, room >= 1).
 * Input validation is handled by generateEnemy() before calling this function.
 */
function getDifficultyMultiplier(floor: number, room: number): number {
  // Development-time assertion for invalid inputs
  if (import.meta.env.DEV) {
    if (floor < 1 || room < 1 || !Number.isFinite(floor) || !Number.isFinite(room)) {
      logError('getDifficultyMultiplier called with invalid inputs', { floor, room });
    }
  }

  if (!isFeatureEnabled('ENEMY_SCALING_V2')) {
    // Legacy linear scaling
    return 1 + (floor - 1) * ENEMY_SCALING.PER_FLOOR_MULTIPLIER + (room - 1) * ENEMY_SCALING.PER_ROOM_MULTIPLIER;
  }

  // Exponential floor scaling + linear room scaling
  const floorIndex = Math.min(floor - 1, FLOOR_MULTIPLIERS.length - 1);
  const floorMult = FLOOR_MULTIPLIERS[floorIndex];

  // Log if fallback is used - indicates potential misconfiguration
  if (floorMult === undefined) {
    logError('FLOOR_MULTIPLIERS access returned undefined, using fallback', {
      floorIndex,
      floor,
      arrayLength: FLOOR_MULTIPLIERS.length,
    });
    return 1.0 * (1 + (room - 1) * ROOM_SCALING.MULTIPLIER);
  }

  const roomMult = 1 + (room - 1) * ROOM_SCALING.MULTIPLIER;
  return floorMult * roomMult;
}

/**
 * Apply per-stat scaling rates when ENEMY_SCALING_V2 is enabled
 * Different stats scale at different rates to prevent spongy enemies
 */
interface StatMultipliers {
  health: number;
  power: number;
  armor: number;
  speed: number;
}

function getStatMultipliers(baseMult: number): StatMultipliers {
  // Sanity check - baseMult should always be >= 1.0
  if (!Number.isFinite(baseMult) || baseMult < 0.1) {
    logError('getStatMultipliers received invalid baseMult', { baseMult });
    baseMult = 1.0; // Safe fallback
  }

  if (!isFeatureEnabled('ENEMY_SCALING_V2')) {
    // Legacy: all stats scale uniformly
    return {
      health: baseMult,
      power: baseMult,
      armor: baseMult,
      speed: 1, // Speed doesn't scale in legacy mode
    };
  }

  // New: separate scaling rates for each stat
  // Speed uses additive scaling: starts at 1x, adds scaled portion of difficulty increase
  // Formula: 1 + (baseMult - 1) * rate means at baseMult=3.0 with rate=0.8: 1 + 2*0.8 = 2.6x
  return {
    health: baseMult * ENEMY_STAT_SCALING.HEALTH,
    power: baseMult * ENEMY_STAT_SCALING.POWER,
    armor: baseMult * ENEMY_STAT_SCALING.ARMOR,
    speed: 1 + (baseMult - 1) * ENEMY_STAT_SCALING.SPEED,
  };
}

/**
 * Generates an enemy based on floor, room, and difficulty parameters.
 * Includes input validation to ensure safe parameter ranges.
 * On Floor 5, Room 5 (final room), spawns the final boss instead of a regular enemy.
 * @param floor The current floor number
 * @param room The current room number
 * @param roomsPerFloor Total rooms per floor
 * @param floorTheme Floor theme to apply stat modifiers and ability biases (defaults to neutral theme)
 */
export function generateEnemy(floor: number, room: number, roomsPerFloor: number, floorTheme: FloorTheme = DEFAULT_FLOOR_THEME): Enemy {
  // Capture raw values before sanitization for logging
  const rawFloor = floor;
  const rawRoom = room;
  const rawRoomsPerFloor = roomsPerFloor;

  // Input validation - validate AFTER converting to ensure bounds
  // Use Math.max/min to clamp values safely
  floor = Math.max(MIN_FLOOR, Math.min(MAX_FLOOR, Math.floor(Number(floor) || MIN_FLOOR)));
  room = Math.max(MIN_ROOM, Math.floor(Number(room) || MIN_ROOM));
  roomsPerFloor = Math.max(MIN_ROOMS_PER_FLOOR, Math.floor(Number(roomsPerFloor) || MIN_ROOMS_PER_FLOOR));

  // Ensure room doesn't exceed roomsPerFloor
  room = Math.min(room, roomsPerFloor);

  // Log if any values were sanitized - indicates caller bug
  if (rawFloor !== floor || rawRoom !== room || rawRoomsPerFloor !== roomsPerFloor) {
    logError('generateEnemy received invalid inputs that were sanitized', {
      raw: { floor: rawFloor, room: rawRoom, roomsPerFloor: rawRoomsPerFloor },
      sanitized: { floor, room, roomsPerFloor },
    });
  }

  const isBoss = room === roomsPerFloor;

  // Check if this should be the final boss
  // Final boss appears on Floor 5, last room
  if (floor === FLOOR_CONFIG.FINAL_BOSS_FLOOR && isBoss) {
    return generateFinalBoss();
  }

  // Calculate difficulty scaling (uses new exponential system when ENEMY_SCALING_V2 enabled)
  const baseDifficultyMult = getDifficultyMultiplier(floor, room);
  const statMults = getStatMultipliers(baseDifficultyMult);

  // Determine enemy tier for stat selection and modifier assignment
  let namePool: readonly string[];
  let baseHealth: number;
  let basePower: number;
  let baseArmor: number;
  let enemyTier: 'common' | 'uncommon' | 'rare' | 'boss';

  if (isBoss) {
    namePool = ENEMY_NAMES.boss;
    baseHealth = ENEMY_BASE_STATS.boss.health;
    basePower = ENEMY_BASE_STATS.boss.power;
    baseArmor = ENEMY_BASE_STATS.boss.armor;
    enemyTier = 'boss';
  } else if (room > roomsPerFloor * ENEMY_SCALING.RARE_THRESHOLD) {
    namePool = ENEMY_NAMES.rare;
    baseHealth = ENEMY_BASE_STATS.rare.health;
    basePower = ENEMY_BASE_STATS.rare.power;
    baseArmor = ENEMY_BASE_STATS.rare.armor;
    enemyTier = 'rare';
  } else if (room > roomsPerFloor * ENEMY_SCALING.UNCOMMON_THRESHOLD) {
    namePool = ENEMY_NAMES.uncommon;
    baseHealth = ENEMY_BASE_STATS.uncommon.health;
    basePower = ENEMY_BASE_STATS.uncommon.power;
    baseArmor = ENEMY_BASE_STATS.uncommon.armor;
    enemyTier = 'uncommon';
  } else {
    namePool = ENEMY_NAMES.common;
    baseHealth = ENEMY_BASE_STATS.common.health;
    basePower = ENEMY_BASE_STATS.common.power;
    baseArmor = ENEMY_BASE_STATS.common.armor;
    enemyTier = 'common';
  }
  
  const nameIndex = Math.floor(Math.random() * namePool.length);
  const baseName = namePool[nameIndex] ?? 'Unknown';

  // Assign modifiers based on enemy tier
  let modifiers: ModifierEffect[] = [];
  if (enemyTier === 'rare') {
    // Rare enemies get 1 modifier
    const selectedModifiers = getRandomModifiers(1);
    modifiers = selectedModifiers.map(toModifierEffect);
  } else if (enemyTier === 'boss') {
    // Boss enemies get 1-2 modifiers
    const modifierCount = Math.random() < 0.5 ? 1 : 2;
    const selectedModifiers = getRandomModifiers(modifierCount);
    modifiers = selectedModifiers.map(toModifierEffect);
  }

  // Get abilities for this enemy (determines prefix and power cost)
  const { abilities, powerCost, prefix: abilityPrefix } = getEnemyAbilities(baseName, floor, isBoss);

  // Build enemy name with modifier and ability prefixes
  // Priority: [Modifier Prefix(es)] [Ability Prefix] [Base Name]
  // e.g., "Swift Venomous Spider" or "Armored Berserker Orc"
  const namePrefixes: string[] = [];

  // Add modifier prefixes
  if (modifiers.length > 0) {
    namePrefixes.push(...modifiers.map(m => m.name));
  }

  // Add ability prefix
  if (abilityPrefix) {
    namePrefixes.push(abilityPrefix);
  }

  const displayName = namePrefixes.length > 0
    ? `${namePrefixes.join(' ')} ${baseName}`
    : baseName;

  // Apply power budget: enemies with abilities have slightly reduced base stats
  // This makes abilities feel like a trade-off rather than pure power creep
  const statMultiplier = 1 - powerCost;

  // Apply floor theme stat modifiers
  const themeHealthMult = floorTheme.statModifiers.health;
  const themePowerMult = floorTheme.statModifiers.power;
  const themeArmorMult = floorTheme.statModifiers.armor;
  const themeSpeedMult = floorTheme.statModifiers.speed;

  // Calculate base stats with per-stat difficulty multipliers and theme multipliers
  // When ENEMY_SCALING_V2 is enabled, each stat scales at a different rate
  const health = Math.floor(baseHealth * statMults.health * statMultiplier * themeHealthMult);
  const power = Math.floor(basePower * statMults.power * statMultiplier * themePowerMult);

  // Armor and speed may be modified by modifiers, so use let
  let armor = Math.floor(baseArmor * statMults.armor * statMultiplier * themeArmorMult);
  let speed = REWARD_CONFIG.ENEMY_BASE_SPEED + Math.floor(Math.random() * REWARD_CONFIG.ENEMY_SPEED_RANGE);

  // Apply speed scaling (new system applies difficulty-based speed scaling)
  speed = Math.floor(speed * statMults.speed * themeSpeedMult);

  // Apply modifier-specific stat changes
  for (const modifier of modifiers) {
    // Swift modifier: increase speed
    if (modifier.id === 'swift' && modifier.speedBonus) {
      speed = Math.floor(speed * (1 + modifier.speedBonus));
    }
    // Armored modifier: increase armor
    if (modifier.id === 'armored' && modifier.armorBonus) {
      armor = Math.floor(armor * (1 + modifier.armorBonus));
    }
  }

  const enemy: Enemy = {
    id: `enemy-${Date.now()}-${Math.random()}`,
    name: displayName,
    health,
    maxHealth: health,
    power,
    armor,
    speed,
    experienceReward: Math.floor((REWARD_CONFIG.BASE_ENEMY_XP * 2 + floor * REWARD_CONFIG.XP_PER_FLOOR + room * REWARD_CONFIG.XP_PER_ROOM) * (isBoss ? REWARD_CONFIG.BOSS_XP_MULTIPLIER : 1)),
    goldReward: Math.floor((REWARD_CONFIG.BASE_ENEMY_GOLD + floor * REWARD_CONFIG.GOLD_PER_FLOOR + room * REWARD_CONFIG.GOLD_PER_ROOM) * (isBoss ? REWARD_CONFIG.BOSS_GOLD_MULTIPLIER : 1) * (REWARD_CONFIG.GOLD_VARIANCE_MIN + Math.random() * REWARD_CONFIG.GOLD_VARIANCE_RANGE)),
    isBoss,
    abilities,
    intent: null, // Will be calculated before combat
    statusEffects: [],
    isShielded: false,
    isEnraged: false,
    modifiers: modifiers.length > 0 ? modifiers : undefined,
  };

  // Calculate initial intent
  enemy.intent = calculateEnemyIntent(enemy);

  return enemy;
}
