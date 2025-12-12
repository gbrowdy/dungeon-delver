import { Enemy, EnemyAbility, EnemyIntent } from '@/types/game';
import {
  ENEMY_SCALING,
  ENEMY_BASE_STATS,
  FLOOR_CONFIG,
} from '@/constants/game';
import {
  COMBAT_BALANCE,
  REWARD_CONFIG,
  ENEMY_ABILITY_CONFIG,
} from '@/constants/balance';
import { generateFinalBoss } from './finalBoss';
import { FloorTheme } from '@/data/floorThemes';
import { getRandomModifiers, toModifierEffect, ModifierEffect } from '@/data/enemyModifiers';

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
    icon: '⚔️⚔️',
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
    icon: '🐍',
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
    icon: '💫',
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
    icon: '💚',
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
    icon: '😤',
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
    icon: '🛡️',
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
    icon: '⚔️⚔️⚔️',
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
  let numAbilities = 0;
  if (isBoss) {
    // Bosses always get 2-3 abilities
    numAbilities = Math.min(2 + Math.floor(floor / 3), abilityPool.length);
  } else if (floor >= ENEMY_ABILITY_CONFIG.FLOOR_FOR_3_ABILITIES) {
    // Late floors: up to 2 abilities
    numAbilities = Math.min(Math.random() < 0.5 ? 2 : 1, abilityPool.length);
  } else if (floor >= ENEMY_ABILITY_CONFIG.FLOOR_FOR_2_ABILITIES) {
    // Mid floors: 1 ability likely
    numAbilities = Math.random() < 0.7 ? 1 : 0;
  } else {
    // Early floors: small chance of 1 ability
    numAbilities = Math.random() < ENEMY_ABILITY_CONFIG.EARLY_FLOOR_ABILITY_CHANCE ? 1 : 0;
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
    icon: '⚔️',
  };
}

// Validation constants
const MIN_FLOOR = 1;
const MAX_FLOOR = 100;
const MIN_ROOM = 1;
const MIN_ROOMS_PER_FLOOR = 1;

/**
 * Generates an enemy based on floor, room, and difficulty parameters.
 * Includes input validation to ensure safe parameter ranges.
 * On Floor 5, Room 5 (final room), spawns the final boss instead of a regular enemy.
 * @param floor The current floor number
 * @param room The current room number
 * @param roomsPerFloor Total rooms per floor
 * @param floorTheme Optional floor theme to apply stat modifiers and ability biases
 */
export function generateEnemy(floor: number, room: number, roomsPerFloor: number, floorTheme?: FloorTheme): Enemy {
  // Input validation - validate AFTER converting to ensure bounds
  // Use Math.max/min to clamp values safely
  floor = Math.max(MIN_FLOOR, Math.min(MAX_FLOOR, Math.floor(Number(floor) || MIN_FLOOR)));
  room = Math.max(MIN_ROOM, Math.floor(Number(room) || MIN_ROOM));
  roomsPerFloor = Math.max(MIN_ROOMS_PER_FLOOR, Math.floor(Number(roomsPerFloor) || MIN_ROOMS_PER_FLOOR));

  // Ensure room doesn't exceed roomsPerFloor
  room = Math.min(room, roomsPerFloor);

  const isBoss = room === roomsPerFloor;

  // Check if this should be the final boss
  // Final boss appears on Floor 5, last room
  if (floor === FLOOR_CONFIG.FINAL_BOSS_FLOOR && isBoss) {
    return generateFinalBoss();
  }
  const difficultyMultiplier = 1 + (floor - 1) * ENEMY_SCALING.PER_FLOOR_MULTIPLIER + (room - 1) * ENEMY_SCALING.PER_ROOM_MULTIPLIER;

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

  // Apply floor theme stat modifiers if theme is provided
  let themeHealthMult = 1;
  let themePowerMult = 1;
  let themeArmorMult = 1;
  let themeSpeedMult = 1;

  if (floorTheme) {
    themeHealthMult = floorTheme.statModifiers.health;
    themePowerMult = floorTheme.statModifiers.power;
    themeArmorMult = floorTheme.statModifiers.armor;
    themeSpeedMult = floorTheme.statModifiers.speed;
  }

  // Calculate base stats with difficulty and theme multipliers
  const health = Math.floor(baseHealth * difficultyMultiplier * statMultiplier * themeHealthMult);
  const power = Math.floor(basePower * difficultyMultiplier * statMultiplier * themePowerMult);

  // Armor and speed may be modified by modifiers, so use let
  let armor = Math.floor(baseArmor * difficultyMultiplier * statMultiplier * themeArmorMult);
  let speed = REWARD_CONFIG.ENEMY_BASE_SPEED + Math.floor(Math.random() * REWARD_CONFIG.ENEMY_SPEED_RANGE);

  // Apply base theme speed multiplier
  speed = Math.floor(speed * themeSpeedMult);

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
