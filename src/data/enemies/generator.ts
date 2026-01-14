/**
 * Enemy generation logic
 */

import type { Enemy } from '@/types/game';
import {
  ENEMY_SCALING,
  ENEMY_BASE_STATS,
  FLOOR_CONFIG,
} from '@/constants/game';
import { REWARD_CONFIG } from '@/constants/balance';
import { logError } from '@/utils/gameLogger';
import { generateFinalBoss } from '../finalBoss';
import type { FloorTheme } from '@/data/floorThemes';
import { getRandomModifiers, toModifierEffect, type ModifierEffect } from '@/data/enemyModifiers';

import { ENEMY_NAMES } from './names';
import { getEnemyAbilities } from './abilities';
import { getDifficultyMultiplier, getStatMultipliers } from './scaling';
import { calculateEnemyIntent } from './intent';

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
