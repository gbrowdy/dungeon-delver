/**
 * Entity factory functions for ECS architecture.
 * Creates properly initialized entities for player, enemy, and game state.
 */

import type { Entity, GamePhase, EnemyTier } from '../components';
import type { CharacterClass, Power, EnemyAbility } from '@/types/game';
import { CLASS_DATA } from '@/data/classes';
import { generateEnemy } from '@/data/enemies';
import { FLOOR_CONFIG } from '@/constants/game';
import { COMBAT_BALANCE } from '@/constants/balance';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate attack interval from speed value.
 * Higher speed = lower interval (faster attacks).
 *
 * @param speed - The speed stat value
 * @param baseInterval - Base attack interval in ms (default 2500ms at speed 10)
 * @returns Attack interval in milliseconds
 */
export function calculateAttackInterval(
  speed: number,
  baseInterval: number = 2500
): number {
  // Formula: baseInterval * (baseSpeed / speed)
  // At speed 10: 2500 * (10/10) = 2500ms
  // At speed 20: 2500 * (10/20) = 1250ms (twice as fast)
  // At speed 5: 2500 * (10/5) = 5000ms (half as fast)
  return Math.floor(baseInterval * (COMBAT_BALANCE.BASE_SPEED / speed));
}

// ============================================================================
// Player Entity Factory
// ============================================================================

export interface CreatePlayerOptions {
  name: string;
  characterClass: CharacterClass;
  devOverrides?: {
    attackOverride?: number | null;
    defenseOverride?: number | null;
    goldOverride?: number | null;
  };
}

/**
 * Create a player entity with all required components initialized.
 * Uses class data to set base stats, starting power, and class-specific bonuses.
 */
export function createPlayerEntity(options: CreatePlayerOptions): Entity {
  const { name, characterClass } = options;
  const classData = CLASS_DATA[characterClass];
  const baseStats = classData.baseStats;

  // Deep clone the starting power to avoid mutation
  const startingPower: Power = { ...classData.startingPower };

  const entity: Entity = {
    // Identity tag
    player: true,

    // Identity component
    identity: {
      name,
      class: characterClass,
    },

    // Combat stats
    health: {
      current: baseStats.maxHealth,
      max: baseStats.maxHealth,
    },
    mana: {
      current: baseStats.maxMana,
      max: baseStats.maxMana,
    },
    attack: {
      baseDamage: baseStats.power,
      critChance: baseStats.fortune / 100, // Fortune converts to crit chance
      critMultiplier: 2.5,
      variance: { min: 0.85, max: 1.15 },
    },
    defense: {
      value: baseStats.armor,
      blockReduction: 0.4, // 40% damage reduction when blocking
    },
    speed: {
      value: baseStats.speed,
      attackInterval: calculateAttackInterval(baseStats.speed),
      accumulated: 0,
    },

    // Progression
    progression: {
      level: 1,
      xp: 0,
      xpToNext: FLOOR_CONFIG.STARTING_EXP_TO_LEVEL,
    },

    // Powers and equipment
    powers: [startingPower],
    equipment: {
      weapon: null,
      armor: null,
      accessory: null,
    },
    inventory: {
      gold: FLOOR_CONFIG.STARTING_GOLD,
      items: [],
    },

    // Status
    statusEffects: [],
    buffs: [],
    cooldowns: new Map(),

    // Regeneration
    regen: {
      healthPerSecond: classData.hpRegen ?? 0,
      manaPerSecond: 1,
      accumulated: 0,
    },

    // Combo tracking
    combo: {
      count: 0,
      lastPowerUsed: null,
    },

    // Ability tracking
    abilityTracking: {
      usedCombatAbilities: [],
      usedFloorAbilities: [],
      enemyAttackCounter: 0,
      abilityCounters: {},
    },
  };

  // Apply dev mode overrides if provided
  const overrides = options.devOverrides;
  if (overrides) {
    if (overrides.attackOverride != null && entity.attack) {
      entity.attack.baseDamage = overrides.attackOverride;
    }
    if (overrides.defenseOverride != null && entity.defense) {
      entity.defense.value = overrides.defenseOverride;
    }
    if (overrides.goldOverride != null && entity.inventory) {
      entity.inventory.gold = overrides.goldOverride;
    }
  }

  return entity;
}

// ============================================================================
// Enemy Entity Factory
// ============================================================================

export interface CreateEnemyOptions {
  floor: number;
  room: number;
  isBoss?: boolean;
  isFinalBoss?: boolean;
  roomsPerFloor?: number;
}

/**
 * Map old enemy tier strings to EnemyTier type.
 * The generateEnemy function doesn't return tier directly, so we infer it.
 */
function inferEnemyTier(
  isBoss: boolean,
  isFinalBoss: boolean | undefined,
  room: number,
  roomsPerFloor: number
): EnemyTier {
  if (isBoss || isFinalBoss) return 'boss';
  if (room > roomsPerFloor * 0.7) return 'rare';
  if (room > roomsPerFloor * 0.4) return 'uncommon';
  return 'common';
}

/**
 * Create an enemy entity from the existing generateEnemy function.
 * Converts the legacy Enemy type to the ECS entity format.
 */
export function createEnemyEntity(options: CreateEnemyOptions): Entity {
  const { floor, room, isFinalBoss } = options;
  const roomsPerFloor =
    options.roomsPerFloor ?? FLOOR_CONFIG.ROOMS_PER_FLOOR[floor - 1] ?? FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR;

  // Use the existing enemy generator
  const enemy = generateEnemy(floor, room, roomsPerFloor);

  // Determine tier
  const tier = inferEnemyTier(enemy.isBoss, isFinalBoss, room, roomsPerFloor);

  // Initialize cooldowns from abilities
  const cooldowns = new Map<string, { remaining: number; base: number }>();
  for (const ability of enemy.abilities) {
    cooldowns.set(ability.id, {
      remaining: ability.currentCooldown,
      base: ability.cooldown,
    });
  }

  return {
    // Enemy tag with metadata
    enemy: {
      tier,
      name: enemy.name,
      isBoss: enemy.isBoss,
      isFinalBoss: enemy.isFinalBoss,
      abilities: enemy.abilities.map((a: EnemyAbility) => ({ ...a })),
      intent: enemy.intent,
      modifiers: enemy.modifiers,
    },

    // Combat stats
    health: {
      current: enemy.health,
      max: enemy.maxHealth,
    },
    attack: {
      baseDamage: enemy.power,
      critChance: 0.05, // Enemies have 5% base crit
      critMultiplier: 1.5,
      variance: { min: 0.9, max: 1.1 },
    },
    defense: {
      value: enemy.armor,
      blockReduction: 0, // Enemies don't block
    },
    speed: {
      value: enemy.speed,
      attackInterval: calculateAttackInterval(enemy.speed),
      accumulated: 0,
    },

    // Status
    statusEffects: [],
    statDebuffs: [],

    // Rewards
    rewards: {
      xp: enemy.experienceReward,
      gold: enemy.goldReward,
    },

    // Cooldowns
    cooldowns,
  };
}

// ============================================================================
// Game State Entity Factory
// ============================================================================

export interface CreateGameStateOptions {
  initialPhase?: GamePhase;
}

/**
 * Create the game state singleton entity.
 * This entity holds all global game state that doesn't belong to player/enemy.
 */
export function createGameStateEntity(options?: CreateGameStateOptions): Entity {
  const phase = options?.initialPhase ?? 'menu';

  return {
    // Game state tag
    gameState: true,

    // Current phase
    phase,

    // Floor progression
    floor: {
      number: 1,
      room: 0,
      totalRooms: FLOOR_CONFIG.ROOMS_PER_FLOOR[0] ?? FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR,
      theme: undefined,
    },

    // Combat settings
    combatSpeed: {
      multiplier: 1,
    },
    paused: false,
    isTransitioning: false,

    // Animation and UI
    animationEvents: [],
    combatLog: [],

    // Popups
    popups: {},
    pendingLevelUp: null,

    // Scheduled events
    scheduledTransitions: [],
    scheduledSpawns: [],
  };
}
