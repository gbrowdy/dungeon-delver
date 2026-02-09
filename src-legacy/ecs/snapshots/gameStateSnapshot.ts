// src/ecs/snapshots/gameStateSnapshot.ts
/**
 * Game state snapshot type and creation functions.
 */

import type { Entity, GamePhase, PopupState, PendingReward, AnimationEvent } from '../components';

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

  // Animation state
  battlePhase: 'entering' | 'combat' | 'transitioning' | 'defeat';
  groundScrolling: boolean;
  floatingEffects: ReadonlyArray<{
    id: string;
    type: string;
    value?: number;
    x: number;
    y: number;
    isCrit?: boolean;
  }>;
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

    // Animation state
    battlePhase: entity.battlePhase?.phase ?? 'combat',
    groundScrolling: entity.groundScrolling ?? false,
    floatingEffects: entity.floatingEffects ?? [],
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
    battlePhase: 'combat',
    groundScrolling: false,
    floatingEffects: [],
  };
}
