// src/ecs/systems/flow.ts
/**
 * FlowSystem - handles game phase transitions, room advancement, and enemy spawning.
 * Runs AFTER DeathSystem to process scheduled transitions and spawns.
 *
 * Responsibilities:
 * - Process scheduled phase transitions (tick down delay, apply when complete)
 * - Process scheduled enemy spawns (tick down delay, spawn when complete)
 * - Handle room advancement when transitioning
 * - Check for floor completion and victory conditions
 */

import { world } from '../world';
import { getGameState, getPlayer } from '../queries';
import { getEffectiveDelta, getTick, TICK_MS } from '../loop';
import { generateEnemy } from '@/data/enemies';
import { FLOOR_CONFIG } from '@/constants/game';
import type { Entity, GamePhase, EnemyTier, ScheduledTransition, ScheduledSpawn } from '../components';

// Duration for enemy entering animation (matches CSS --anim-entering-phase)
const ENTERING_PHASE_DURATION_MS = 800;

/**
 * Add a message to the combat log.
 */
function addCombatLog(message: string): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.combatLog) {
    gameState.combatLog = [];
  }

  gameState.combatLog.push(message);
}

/**
 * Convert game Enemy type to ECS enemy entity.
 */
function addEnemyEntity(
  floor: number,
  room: number,
  totalRooms: number
): Entity | null {
  const enemy = generateEnemy(floor, room, totalRooms);

  // Determine tier for ECS
  let tier: EnemyTier = 'common';
  if (enemy.isBoss) {
    tier = 'boss';
  } else if (room > totalRooms * 0.6) {
    tier = 'rare';
  } else if (room > totalRooms * 0.3) {
    tier = 'uncommon';
  }

  // Create enemy entity with ECS components
  const entity = world.add({
    enemy: {
      id: `enemy-${floor}-${room}-${Date.now()}`,
      tier,
      name: enemy.name,
      isBoss: enemy.isBoss,
      isFinalBoss: floor === FLOOR_CONFIG.FINAL_BOSS_FLOOR && enemy.isBoss,
      abilities: enemy.abilities,
      intent: enemy.intent,
      modifiers: enemy.modifiers,
    },
    health: {
      current: enemy.health,
      max: enemy.maxHealth,
    },
    attack: {
      baseDamage: enemy.power,
      critChance: 0.05,
      critMultiplier: 1.5,
      variance: { min: 0.9, max: 1.1 },
    },
    defense: {
      value: enemy.armor,
      blockReduction: 0,
    },
    speed: {
      value: enemy.speed,
      attackInterval: Math.floor(2500 * (10 / enemy.speed)),
      accumulated: 0,
    },
    statusEffects: [],
    rewards: {
      xp: enemy.experienceReward,
      gold: enemy.goldReward,
    },
  });

  return entity;
}

/**
 * Process scheduled phase transitions.
 * Ticks down delay and applies transition when delay reaches 0.
 */
function processScheduledTransitions(effectiveDelta: number): void {
  const gameState = getGameState();
  if (!gameState?.scheduledTransitions?.length) return;

  const transitions = gameState.scheduledTransitions;
  const completedIndices: number[] = [];

  for (let i = 0; i < transitions.length; i++) {
    const transition = transitions[i];
    transition.delay -= effectiveDelta;

    if (transition.delay <= 0) {
      // Apply the phase transition
      applyPhaseTransition(transition.toPhase);
      completedIndices.push(i);
    }
  }

  // Remove completed transitions (in reverse order to maintain indices)
  for (let i = completedIndices.length - 1; i >= 0; i--) {
    transitions.splice(completedIndices[i], 1);
  }
}

/**
 * Apply a phase transition.
 */
function applyPhaseTransition(toPhase: GamePhase): void {
  const gameState = getGameState();
  if (!gameState) return;

  const fromPhase = gameState.phase;
  gameState.phase = toPhase;

  // Log the transition
  addCombatLog(`Phase: ${fromPhase} -> ${toPhase}`);

  // Handle phase-specific logic
  switch (toPhase) {
    case 'victory':
      addCombatLog('Victory! You have conquered the dungeon!');
      break;
    case 'defeat':
      addCombatLog('You have been defeated...');
      break;
    case 'floor-complete':
      // Floor completion handled elsewhere (rewards, etc.)
      break;
  }
}

/**
 * Process scheduled enemy spawns.
 * Ticks down delay and spawns enemy when delay reaches 0.
 */
function processScheduledSpawns(effectiveDelta: number): void {
  const gameState = getGameState();
  if (!gameState?.scheduledSpawns?.length) return;

  const spawns = gameState.scheduledSpawns;
  const completedIndices: number[] = [];

  for (let i = 0; i < spawns.length; i++) {
    const spawn = spawns[i];
    spawn.delay -= effectiveDelta;

    if (spawn.delay <= 0) {
      // Spawn the enemy
      spawnNextEnemy();
      completedIndices.push(i);
    }
  }

  // Remove completed spawns (in reverse order to maintain indices)
  for (let i = completedIndices.length - 1; i >= 0; i--) {
    spawns.splice(completedIndices[i], 1);
  }
}

/**
 * Spawn the next enemy for the current room.
 */
function spawnNextEnemy(): void {
  const gameState = getGameState();
  if (!gameState?.floor) return;

  const floor = gameState.floor;

  // Increment room number
  floor.room += 1;

  // Check if this completes the floor
  if (floor.room > floor.totalRooms) {
    // Floor is complete - check for victory
    if (floor.number >= FLOOR_CONFIG.FINAL_BOSS_FLOOR) {
      // Victory!
      if (!gameState.scheduledTransitions) {
        gameState.scheduledTransitions = [];
      }
      gameState.scheduledTransitions.push({ toPhase: 'victory', delay: 0 });
      addCombatLog('The final boss has been defeated!');
    } else {
      // Schedule floor-complete transition
      if (!gameState.scheduledTransitions) {
        gameState.scheduledTransitions = [];
      }
      gameState.scheduledTransitions.push({ toPhase: 'floor-complete', delay: 0 });
    }
    return;
  }

  // Spawn the enemy
  const enemy = addEnemyEntity(floor.number, floor.room, floor.totalRooms);
  if (enemy?.enemy) {
    addCombatLog(`Room ${floor.room}: A ${enemy.enemy.name} appears!`);
  }

  // Start entering animation phase
  gameState.battlePhase = {
    phase: 'entering',
    startedAtTick: getTick(),
    duration: ENTERING_PHASE_DURATION_MS,
  };
  gameState.groundScrolling = true;

  // Clear transitioning flag
  gameState.isTransitioning = false;
}

/**
 * Process battle phase transitions (entering -> combat).
 */
function processBattlePhase(): void {
  const gameState = getGameState();
  if (!gameState?.battlePhase) return;

  const { phase, startedAtTick, duration } = gameState.battlePhase;

  // Only process entering phase transitions
  if (phase === 'entering' && duration) {
    const elapsed = (getTick() - startedAtTick) * TICK_MS;

    if (elapsed >= duration) {
      // Transition to combat phase
      gameState.battlePhase = {
        phase: 'combat',
        startedAtTick: getTick(),
      };
      gameState.groundScrolling = false;
    }
  }
}

/**
 * FlowSystem - main entry point.
 * Processes scheduled transitions and spawns each tick.
 */
export function FlowSystem(deltaMs: number): void {
  const gameState = getGameState();
  if (!gameState) return;

  // Only process during combat phase (or when transitioning out of it)
  const phase = gameState.phase;
  if (phase !== 'combat' && phase !== 'defeat' && phase !== 'victory') {
    // Still process transitions for non-combat phases
    // (e.g., shop -> combat, floor-complete -> combat)
    if (gameState.scheduledTransitions?.length) {
      const effectiveDelta = getEffectiveDelta(deltaMs);
      processScheduledTransitions(effectiveDelta);
    }
    return;
  }

  const effectiveDelta = getEffectiveDelta(deltaMs);

  // Process battle phase (entering -> combat)
  processBattlePhase();

  // Process scheduled transitions first
  processScheduledTransitions(effectiveDelta);

  // Process scheduled spawns
  processScheduledSpawns(effectiveDelta);
}
