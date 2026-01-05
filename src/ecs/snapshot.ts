// src/ecs/snapshot.ts
/**
 * Immutable snapshot types for React components.
 * These are created from ECS entities each tick and passed to React via context.
 * They're immutable to enable efficient React reconciliation with reference equality.
 */

import type { Entity, GamePhase, PopupState, PendingReward, AnimationEvent } from './components';
import type { CharacterClass, Power, Item, ActiveBuff, StatusEffect, PathResource, AttackModifier, EnemyAbility, EnemyIntent, ModifierEffect, EnemyStatDebuff } from '@/types/game';
import type { PlayerPath, PlayerStanceState } from '@/types/paths';
import { getPlayer, getGameState, enemyQuery } from './queries';

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Deep readonly type helper - makes all nested properties readonly.
 * Handles arrays, Maps, Sets, and plain objects recursively.
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

/**
 * Snapshot of player entity state for React components.
 * Contains all player data needed for rendering.
 */
export interface PlayerSnapshot {
  // Identity
  name: string;
  characterClass: CharacterClass;

  // Combat stats
  health: { current: number; max: number };
  mana: { current: number; max: number };
  attack: {
    baseDamage: number;
    critChance: number;
    critMultiplier: number;
    variance: { min: number; max: number };
  };
  defense: { value: number; blockReduction: number };
  speed: { value: number; attackInterval: number };

  // Progression
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;

  // Abilities
  powers: Power[];
  cooldowns: Map<string, { remaining: number; base: number }>;

  // Equipment
  equipment: {
    weapon: Item | null;
    armor: Item | null;
    accessory: Item | null;
  };
  inventory: Item[];

  // Status
  statusEffects: StatusEffect[];
  buffs: ActiveBuff[];
  shield: { value: number; remaining: number; maxDuration: number } | null;
  isBlocking: boolean;
  isDying: boolean;

  // Path
  path: PlayerPath | null;
  pathResource: PathResource | null;
  stanceState: PlayerStanceState | null;
  pendingAbilityChoice: boolean;

  // Combat modifiers
  attackModifiers: AttackModifier[];
  comboCount: number;
  lastPowerUsed: string | null;

  // Ability tracking
  abilityTracking: {
    usedCombatAbilities: string[];
    usedFloorAbilities: string[];
    enemyAttackCounter: number;
    abilityCounters: Record<string, number>;
  };

  // Regen
  healthRegen: number;
  manaRegen: number;
}

/**
 * Snapshot of enemy entity state for React components.
 */
export interface EnemySnapshot {
  // Identity
  id: string;
  name: string;
  tier: 'common' | 'uncommon' | 'rare' | 'boss';
  isBoss: boolean;
  isFinalBoss: boolean;

  // Combat stats
  health: { current: number; max: number };
  attack: { baseDamage: number };
  defense: { value: number };
  speed: { value: number; attackInterval: number };

  // Abilities
  abilities: EnemyAbility[];
  intent: EnemyIntent | null;
  modifiers: ModifierEffect[];

  // Status
  statusEffects: StatusEffect[];
  statDebuffs: EnemyStatDebuff[];
  isShielded: boolean;
  shieldTurnsRemaining: number;
  isEnraged: boolean;
  enrageTurnsRemaining: number;
  isDying: boolean;

  // Rewards
  xpReward: number;
  goldReward: number;
}

/**
 * Snapshot of game state entity for React components.
 */
export interface GameStateSnapshot {
  // Game flow
  phase: GamePhase;
  isPaused: boolean;
  combatSpeed: 1 | 2 | 3;
  isTransitioning: boolean;

  // Floor/room
  floor: number;
  room: number;
  totalRooms: number;
  floorTheme: string | undefined;

  // UI state
  popups: PopupState;
  pendingLevelUp: number | null;
  pendingRewards: PendingReward | null;

  // Animation events
  animationEvents: AnimationEvent[];

  // Combat log
  combatLog: string[];
}

// ============================================================================
// COMBAT SNAPSHOT
// ============================================================================

/**
 * Combined snapshot for combat UI.
 * Contains player, enemy, and game state snapshots along with attack progress.
 */
export interface CombatSnapshot {
  readonly player: PlayerSnapshot | null;
  readonly enemy: EnemySnapshot | null;
  readonly gameState: GameStateSnapshot;
  readonly heroProgress: number; // 0-1, from speed.accumulated / attackInterval
  readonly enemyProgress: number; // 0-1, from speed.accumulated / attackInterval
}

// ============================================================================
// SNAPSHOT CREATION FUNCTIONS
// ============================================================================

/**
 * Create a player snapshot from an entity.
 * Returns null if the entity doesn't have required player components.
 */
export function createPlayerSnapshot(entity: Entity): PlayerSnapshot | null {
  if (!entity.player || !entity.health || !entity.mana || !entity.identity) {
    return null;
  }

  return {
    // Identity
    name: entity.identity.name,
    characterClass: entity.identity.class,

    // Combat stats
    health: { ...entity.health },
    mana: { ...entity.mana },
    attack: entity.attack ? { ...entity.attack } : {
      baseDamage: 0,
      critChance: 0,
      critMultiplier: 1,
      variance: { min: 0.85, max: 1.15 },
    },
    defense: entity.defense ? { ...entity.defense } : { value: 0, blockReduction: 0.4 },
    speed: entity.speed ? {
      value: entity.speed.value,
      attackInterval: entity.speed.attackInterval
    } : { value: 10, attackInterval: 2500 },

    // Progression
    level: entity.progression?.level ?? 1,
    xp: entity.progression?.xp ?? 0,
    xpToNext: entity.progression?.xpToNext ?? 100,
    gold: entity.inventory?.gold ?? 0,

    // Abilities
    powers: entity.powers ? [...entity.powers] : [],
    // Deep-copy cooldowns Map so mutations to entity don't affect snapshot
    cooldowns: entity.cooldowns
      ? new Map(Array.from(entity.cooldowns.entries()).map(([k, v]) => [k, { ...v }]))
      : new Map(),

    // Equipment
    equipment: entity.equipment ? {
      weapon: entity.equipment.weapon,
      armor: entity.equipment.armor,
      accessory: entity.equipment.accessory,
    } : { weapon: null, armor: null, accessory: null },
    inventory: entity.inventory?.items ? [...entity.inventory.items] : [],

    // Status
    statusEffects: entity.statusEffects ? [...entity.statusEffects] : [],
    buffs: entity.buffs ? [...entity.buffs] : [],
    shield: entity.shield ? { ...entity.shield } : null,
    isBlocking: !!entity.blocking,
    isDying: !!entity.dying,

    // Path
    path: entity.path ?? null,
    pathResource: entity.pathResource ?? null,
    stanceState: entity.stanceState ?? null,
    pendingAbilityChoice: entity.pendingAbilityChoice ?? false,

    // Combat modifiers
    attackModifiers: entity.attackModifiers ? [...entity.attackModifiers] : [],
    comboCount: entity.combo?.count ?? 0,
    lastPowerUsed: entity.combo?.lastPowerUsed ?? null,

    // Ability tracking
    abilityTracking: {
      usedCombatAbilities: entity.abilityTracking?.usedCombatAbilities ? [...entity.abilityTracking.usedCombatAbilities] : [],
      usedFloorAbilities: entity.abilityTracking?.usedFloorAbilities ? [...entity.abilityTracking.usedFloorAbilities] : [],
      enemyAttackCounter: entity.abilityTracking?.enemyAttackCounter ?? 0,
      abilityCounters: entity.abilityTracking?.abilityCounters ? { ...entity.abilityTracking.abilityCounters } : {},
    },

    // Regen
    healthRegen: entity.regen?.healthPerSecond ?? 0,
    manaRegen: entity.regen?.manaPerSecond ?? 0,
  };
}

/**
 * Create an enemy snapshot from an entity.
 * Returns null if the entity doesn't have required enemy components.
 */
export function createEnemySnapshot(entity: Entity): EnemySnapshot | null {
  if (!entity.enemy || !entity.health) {
    return null;
  }

  return {
    // Identity
    id: entity.enemy.id,
    name: entity.enemy.name,
    tier: entity.enemy.tier,
    isBoss: entity.enemy.isBoss,
    isFinalBoss: entity.enemy.isFinalBoss ?? false,

    // Combat stats
    health: { ...entity.health },
    attack: entity.attack ? { baseDamage: entity.attack.baseDamage } : { baseDamage: 0 },
    defense: entity.defense ? { value: entity.defense.value } : { value: 0 },
    speed: entity.speed ? {
      value: entity.speed.value,
      attackInterval: entity.speed.attackInterval
    } : { value: 10, attackInterval: 2500 },

    // Abilities
    abilities: entity.enemy.abilities ? [...entity.enemy.abilities] : [],
    intent: entity.enemy.intent,
    modifiers: entity.enemy.modifiers ? [...entity.enemy.modifiers] : [],

    // Status
    statusEffects: entity.statusEffects ? [...entity.statusEffects] : [],
    statDebuffs: entity.statDebuffs ? [...entity.statDebuffs] : [],
    isShielded: entity.enemyFlags?.isShielded ?? false,
    shieldTurnsRemaining: entity.enemyFlags?.shieldTurnsRemaining ?? 0,
    isEnraged: entity.enemyFlags?.isEnraged ?? false,
    enrageTurnsRemaining: entity.enemyFlags?.enrageTurnsRemaining ?? 0,
    isDying: !!entity.dying,

    // Rewards
    xpReward: entity.rewards?.xp ?? 0,
    goldReward: entity.rewards?.gold ?? 0,
  };
}

/**
 * Create a game state snapshot from an entity.
 * Returns a default snapshot if the entity doesn't have required components.
 */
export function createGameStateSnapshot(entity: Entity): GameStateSnapshot {
  return {
    // Game flow
    phase: entity.phase ?? 'menu',
    isPaused: entity.paused ?? false,
    combatSpeed: entity.combatSpeed?.multiplier ?? 1,
    isTransitioning: entity.isTransitioning ?? false,

    // Floor/room
    floor: entity.floor?.number ?? 1,
    room: entity.floor?.room ?? 1,
    totalRooms: entity.floor?.totalRooms ?? 5,
    floorTheme: entity.floor?.theme,

    // UI state
    popups: entity.popups ?? {},
    pendingLevelUp: entity.pendingLevelUp ?? null,
    pendingRewards: entity.pendingRewards ?? null,

    // Animation events
    animationEvents: entity.animationEvents ? [...entity.animationEvents] : [],

    // Combat log
    combatLog: entity.combatLog ? [...entity.combatLog] : [],
  };
}

/**
 * Create a default game state snapshot for when no game state entity exists.
 */
export function createDefaultGameStateSnapshot(): GameStateSnapshot {
  return {
    phase: 'menu',
    isPaused: false,
    combatSpeed: 1,
    isTransitioning: false,
    floor: 1,
    room: 1,
    totalRooms: 5,
    floorTheme: undefined,
    popups: {},
    pendingLevelUp: null,
    pendingRewards: null,
    animationEvents: [],
    combatLog: [],
  };
}

/**
 * Create a full CombatSnapshot by querying the ECS world.
 * Returns player/enemy as null if entities don't exist.
 * Pure function - queries world but has no side effects.
 */
export function createCombatSnapshot(): CombatSnapshot {
  const playerEntity = getPlayer();
  // Use enemyQuery.first to include dying enemies (for death animation)
  // instead of getActiveEnemy() which excludes them
  const enemyEntity = enemyQuery.first;
  const gameStateEntity = getGameState();

  // Calculate attack progress (0-1, clamped)
  let heroProgress = 0;
  if (playerEntity?.speed) {
    heroProgress = playerEntity.speed.accumulated / playerEntity.speed.attackInterval;
    heroProgress = Math.min(1, Math.max(0, heroProgress));
  }

  let enemyProgress = 0;
  if (enemyEntity?.speed) {
    enemyProgress = enemyEntity.speed.accumulated / enemyEntity.speed.attackInterval;
    enemyProgress = Math.min(1, Math.max(0, enemyProgress));
  }

  return {
    player: playerEntity ? createPlayerSnapshot(playerEntity) : null,
    enemy: enemyEntity ? createEnemySnapshot(enemyEntity) : null,
    gameState: gameStateEntity
      ? createGameStateSnapshot(gameStateEntity)
      : createDefaultGameStateSnapshot(),
    heroProgress,
    enemyProgress,
  };
}
