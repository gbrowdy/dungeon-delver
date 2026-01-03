# ECS Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the multi-timer React hooks architecture with a clean ECS pattern using miniplex, eliminating race conditions and timer desynchronization.

**Architecture:** Single fixed-timestep game loop (16ms ticks) with ordered system execution. miniplex manages entities/components, React receives read-only snapshots for rendering. Commands queue user input for processing at tick start.

**Tech Stack:** miniplex ^2.0.0, @miniplex/react ^2.0.0, Vitest for testing, existing React/TypeScript/Vite setup.

---

## Phase 1: Core Infrastructure

### Task 1.1: Install miniplex Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install miniplex packages**

Run: `npm install miniplex @miniplex/react`

**Step 2: Verify installation**

Run: `npm ls miniplex`
Expected: Shows miniplex@2.x.x and @miniplex/react@2.x.x

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add miniplex ECS library"
```

---

### Task 1.2: Create Component Type Definitions

**Files:**
- Create: `src/ecs/components.ts`

**Step 1: Write the component types**

```typescript
// src/ecs/components.ts
/**
 * ECS Component definitions for the game.
 * Components are plain data - no methods, no behavior.
 * Each optional property represents a component that can be attached to an entity.
 */

import type {
  CharacterClass,
  Power,
  Item,
  ActiveBuff,
  StatusEffect,
  EnemyAbility,
  EnemyIntent,
  AttackModifier,
  PathResource,
  EnemyStatDebuff,
  ModifierEffect,
} from '@/types/game';
import type { PlayerPath } from '@/types/paths';

// Game phases
export type GamePhase =
  | 'menu'
  | 'class-select'
  | 'path-select'
  | 'combat'
  | 'shop'
  | 'floor-complete'
  | 'victory'
  | 'defeat';

// Enemy tiers
export type EnemyTier = 'common' | 'uncommon' | 'rare' | 'boss';

// Animation event types
export type AnimationEventType =
  | 'player_attack'
  | 'enemy_attack'
  | 'player_hit'
  | 'enemy_hit'
  | 'player_block'
  | 'spell_cast'
  | 'death'
  | 'level_up'
  | 'status_applied'
  | 'status_removed'
  | 'item_proc'
  | 'power_used';

// Animation event payload types
export type AnimationPayload =
  | { type: 'damage'; value: number; isCrit: boolean; blocked: boolean }
  | { type: 'heal'; value: number; source: string }
  | { type: 'spell'; powerId: string; value: number }
  | { type: 'death'; isPlayer: boolean }
  | { type: 'status'; effectType: string; applied: boolean }
  | { type: 'item'; itemName: string; effectDescription: string }
  | { type: 'block'; reduction: number }
  | { type: 'level_up'; newLevel: number };

// Animation event
export interface AnimationEvent {
  id: string;
  type: AnimationEventType;
  payload: AnimationPayload;
  createdAtTick: number;
  displayUntilTick: number;
  consumed: boolean;
}

// Scheduled transition
export interface ScheduledTransition {
  toPhase: GamePhase;
  delay: number; // ms remaining
}

// Scheduled enemy spawn
export interface ScheduledSpawn {
  delay: number; // ms remaining
}

// Popup state
export interface PopupState {
  levelUp?: { level: number };
  death?: { floor: number };
  victory?: { finalFloor: number };
  abilityChoice?: { abilities: string[] };
}

// Reward for floor completion
export interface PendingReward {
  xp: number;
  gold: number;
  powers?: (Power | { isUpgrade: true; powerId: string })[];
  items?: Item[];
}

/**
 * Entity type - all possible components an entity can have.
 * miniplex uses this to provide type-safe queries.
 */
export interface Entity {
  // === IDENTITY TAGS ===
  /** Marks this entity as the player */
  player?: true;
  /** Marks this entity as an enemy with metadata */
  enemy?: {
    tier: EnemyTier;
    name: string;
    isBoss: boolean;
    isFinalBoss?: boolean;
    abilities: EnemyAbility[];
    intent: EnemyIntent | null;
    modifiers?: ModifierEffect[];
  };
  /** Marks this entity as the game state singleton */
  gameState?: true;

  // === COMBAT STATS ===
  health?: {
    current: number;
    max: number;
  };
  mana?: {
    current: number;
    max: number;
  };
  attack?: {
    baseDamage: number;
    critChance: number; // 0-1
    critMultiplier: number;
    variance: { min: number; max: number };
  };
  defense?: {
    value: number;
    blockReduction: number;
  };
  speed?: {
    value: number;
    attackInterval: number; // calculated from value
    accumulated: number; // ms toward next attack
  };

  // === STATUS ===
  statusEffects?: StatusEffect[];
  statDebuffs?: EnemyStatDebuff[]; // For enemies - stat reductions from player
  shield?: {
    value: number;
    remaining: number; // duration in seconds
    maxDuration: number;
  };
  buffs?: ActiveBuff[];
  blocking?: {
    reduction: number;
  };
  dying?: {
    startedAtTick: number;
    duration: number; // ms
  };
  /** Enemy-specific flags */
  enemyFlags?: {
    isShielded?: boolean;
    shieldTurnsRemaining?: number;
    isEnraged?: boolean;
    enrageTurnsRemaining?: number;
    basePower?: number; // before enrage
  };

  // === TIMING ===
  cooldowns?: Map<string, { remaining: number; base: number }>;
  regen?: {
    healthPerSecond: number;
    manaPerSecond: number;
    accumulated: number; // ms since last regen tick
  };

  // === COMBAT ACTIONS ===
  /** Set when entity is ready to attack this tick */
  attackReady?: {
    damage: number;
    isCrit: boolean;
  };
  /** Set when player is casting a power */
  casting?: {
    powerId: string;
    startedAtTick: number;
  };
  /** Temporary attack modifiers (shadow_dance, ambush, etc) */
  attackModifiers?: AttackModifier[];

  // === PROGRESSION ===
  progression?: {
    level: number;
    xp: number;
    xpToNext: number;
  };
  path?: PlayerPath;
  pendingAbilityChoice?: boolean;
  powers?: Power[];
  equipment?: {
    weapon: Item | null;
    armor: Item | null;
    accessory: Item | null;
  };
  inventory?: {
    gold: number;
    items: Item[];
  };
  /** Player identity */
  identity?: {
    name: string;
    class: CharacterClass;
  };
  /** Path resource for active paths */
  pathResource?: PathResource;
  /** Ability tracking */
  abilityTracking?: {
    usedCombatAbilities: string[];
    usedFloorAbilities: string[];
    enemyAttackCounter: number;
    abilityCounters: Record<string, number>;
  };
  /** Combo tracking */
  combo?: {
    count: number;
    lastPowerUsed: string | null;
  };

  // === GAME FLOW (game state entity only) ===
  phase?: GamePhase;
  floor?: {
    number: number;
    room: number;
    totalRooms: number;
    theme?: string;
  };
  combatSpeed?: {
    multiplier: 1 | 2 | 3;
  };
  paused?: boolean;
  isTransitioning?: boolean;

  // === ANIMATION (game state entity only) ===
  animationEvents?: AnimationEvent[];
  combatLog?: string[];

  // === UI STATE (game state entity only) ===
  popups?: PopupState;
  pendingRewards?: PendingReward;
  pendingLevelUp?: number | null;
  scheduledTransitions?: ScheduledTransition[];
  scheduledSpawns?: ScheduledSpawn[];

  // === REWARDS ===
  rewards?: {
    xp: number;
    gold: number;
  };
}

// Entity ID constants
export const PLAYER_ENTITY_ID = 1;
export const GAME_STATE_ENTITY_ID = 2;
export const ENEMY_ENTITY_ID_START = 100;
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/ecs/components.ts
git commit -m "feat(ecs): add component type definitions"
```

---

### Task 1.3: Create World and Queries

**Files:**
- Create: `src/ecs/world.ts`
- Create: `src/ecs/queries.ts`

**Step 1: Create the world**

```typescript
// src/ecs/world.ts
/**
 * ECS World - the container for all entities and components.
 * Uses miniplex for efficient entity management and queries.
 */

import { World } from 'miniplex';
import type { Entity } from './components';

// Create the singleton world instance
export const world = new World<Entity>();

// Track next entity ID for enemies
let nextEnemyId = 100;

export function getNextEnemyId(): number {
  return nextEnemyId++;
}

export function resetEnemyIdCounter(): void {
  nextEnemyId = 100;
}

/**
 * Clear all entities from the world.
 * Used when starting a new game.
 */
export function clearWorld(): void {
  // Remove all entities
  for (const entity of world.entities) {
    world.remove(entity);
  }
  resetEnemyIdCounter();
}
```

**Step 2: Create queries**

```typescript
// src/ecs/queries.ts
/**
 * Reusable miniplex queries for finding entities.
 * Queries are live - they automatically update when entities change.
 */

import { world } from './world';

// Player queries
export const playerQuery = world.with('player', 'health', 'mana');
export const playerWithStatsQuery = world.with('player', 'health', 'mana', 'attack', 'defense', 'speed');

// Enemy queries
export const enemyQuery = world.with('enemy', 'health');
export const activeEnemyQuery = world.with('enemy', 'health').without('dying');
export const dyingEnemyQuery = world.with('enemy', 'dying');

// Combat queries
export const attackersQuery = world.with('health', 'attack', 'speed').without('dying');
export const entitiesWithCooldowns = world.with('cooldowns');
export const entitiesWithStatusEffects = world.with('statusEffects');
export const entitiesWithRegen = world.with('regen', 'health');
export const entitiesWithAttackReady = world.with('attackReady');
export const dyingEntities = world.with('dying');

// Game state query
export const gameStateQuery = world.with('gameState', 'phase');

/**
 * Helper to get the player entity (or null if not found)
 */
export function getPlayer(): Entity | undefined {
  return playerQuery.first;
}

/**
 * Helper to get the current enemy (or null if not found)
 */
export function getActiveEnemy(): Entity | undefined {
  return activeEnemyQuery.first;
}

/**
 * Helper to get the game state entity
 */
export function getGameState(): Entity | undefined {
  return gameStateQuery.first;
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/ecs/world.ts src/ecs/queries.ts
git commit -m "feat(ecs): add world and query definitions"
```

---

### Task 1.4: Create Command System

**Files:**
- Create: `src/ecs/commands.ts`

**Step 1: Write the command types and queue**

```typescript
// src/ecs/commands.ts
/**
 * Command system for handling user input.
 * Commands are queued and processed at the start of each tick.
 * This ensures deterministic execution order and prevents race conditions.
 */

import type { Power } from '@/types/game';

// All possible commands
export type Command =
  // Combat actions
  | { type: 'ACTIVATE_POWER'; powerId: string }
  | { type: 'BLOCK' }
  // Game speed
  | { type: 'SET_COMBAT_SPEED'; speed: 1 | 2 | 3 }
  | { type: 'TOGGLE_PAUSE' }
  // Character setup
  | { type: 'SELECT_CLASS'; classId: string }
  | { type: 'START_GAME' }
  // Path system
  | { type: 'SELECT_PATH'; pathId: string }
  | { type: 'SELECT_ABILITY'; abilityId: string }
  | { type: 'SELECT_SUBPATH'; subpathId: string }
  // Rewards
  | { type: 'CLAIM_POWER'; power: Power }
  | { type: 'CLAIM_POWER_UPGRADE'; powerId: string }
  | { type: 'SKIP_POWER_REWARD' }
  // Room/floor progression
  | { type: 'ADVANCE_ROOM' }
  | { type: 'GO_TO_SHOP' }
  | { type: 'LEAVE_SHOP' }
  // Death handling
  | { type: 'RETRY_FLOOR' }
  | { type: 'ABANDON_RUN' }
  // UI events
  | { type: 'DISMISS_POPUP'; popupType: string }
  | { type: 'MARK_ANIMATIONS_CONSUMED'; ids: string[] };

// Command queue - processed at start of each tick
export const commandQueue: Command[] = [];

/**
 * Dispatch a command to be processed on the next tick.
 * Can be called from React at any time.
 */
export function dispatch(command: Command): void {
  commandQueue.push(command);
}

/**
 * Drain and return all queued commands.
 * Called by InputSystem at the start of each tick.
 */
export function drainCommands(): Command[] {
  return commandQueue.splice(0);
}

/**
 * Type-safe command creators for use in React components.
 */
export const Commands = {
  // Combat
  activatePower: (powerId: string): Command => ({
    type: 'ACTIVATE_POWER',
    powerId,
  }),
  block: (): Command => ({
    type: 'BLOCK',
  }),

  // Game speed
  setCombatSpeed: (speed: 1 | 2 | 3): Command => ({
    type: 'SET_COMBAT_SPEED',
    speed,
  }),
  togglePause: (): Command => ({
    type: 'TOGGLE_PAUSE',
  }),

  // Character setup
  selectClass: (classId: string): Command => ({
    type: 'SELECT_CLASS',
    classId,
  }),
  startGame: (): Command => ({
    type: 'START_GAME',
  }),

  // Path system
  selectPath: (pathId: string): Command => ({
    type: 'SELECT_PATH',
    pathId,
  }),
  selectAbility: (abilityId: string): Command => ({
    type: 'SELECT_ABILITY',
    abilityId,
  }),
  selectSubpath: (subpathId: string): Command => ({
    type: 'SELECT_SUBPATH',
    subpathId,
  }),

  // Rewards
  claimPower: (power: Power): Command => ({
    type: 'CLAIM_POWER',
    power,
  }),
  claimPowerUpgrade: (powerId: string): Command => ({
    type: 'CLAIM_POWER_UPGRADE',
    powerId,
  }),
  skipPowerReward: (): Command => ({
    type: 'SKIP_POWER_REWARD',
  }),

  // Room/floor
  advanceRoom: (): Command => ({
    type: 'ADVANCE_ROOM',
  }),
  goToShop: (): Command => ({
    type: 'GO_TO_SHOP',
  }),
  leaveShop: (): Command => ({
    type: 'LEAVE_SHOP',
  }),

  // Death
  retryFloor: (): Command => ({
    type: 'RETRY_FLOOR',
  }),
  abandonRun: (): Command => ({
    type: 'ABANDON_RUN',
  }),

  // UI
  dismissPopup: (popupType: string): Command => ({
    type: 'DISMISS_POPUP',
    popupType,
  }),
  markAnimationsConsumed: (ids: string[]): Command => ({
    type: 'MARK_ANIMATIONS_CONSUMED',
    ids,
  }),
};
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/ecs/commands.ts
git commit -m "feat(ecs): add command system for user input"
```

---

### Task 1.5: Create Game Loop

**Files:**
- Create: `src/ecs/loop.ts`
- Create: `src/ecs/systems/index.ts`

**Step 1: Create the systems index (placeholder)**

```typescript
// src/ecs/systems/index.ts
/**
 * System registration and execution order.
 * Systems are functions that process entities each tick.
 * Order matters - earlier systems' changes are visible to later systems.
 */

// System type - all systems have the same signature
export type System = (deltaMs: number) => void;

// Systems will be added here as we implement them
// For now, start with an empty array
export const systems: System[] = [];

/**
 * Run all systems in order.
 * Called once per tick by the game loop.
 */
export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
```

**Step 2: Create the game loop**

```typescript
// src/ecs/loop.ts
/**
 * Fixed-timestep game loop.
 *
 * Key properties:
 * - Fixed 16ms tick (approximately 60 ticks/second)
 * - Accumulator pattern handles variable frame rates
 * - Catchup limit prevents death spiral when tab loses focus
 * - Pause support integrated at loop level
 */

import { runSystems } from './systems';
import { drainCommands } from './commands';
import { getGameState } from './queries';

// Timing constants
export const TICK_MS = 16; // ~60 ticks per second
const MAX_CATCHUP_TICKS = 10; // Prevent death spiral

// Loop state
let running = false;
let lastTime = 0;
let accumulator = 0;
let tick = 0;
let animationFrameId: number | null = null;

// Callback for React updates
let onTickCallback: (() => void) | null = null;

/**
 * Start the game loop.
 * @param onTick - Called after each frame (not each tick) to update React
 */
export function startLoop(onTick: () => void): void {
  if (running) return;

  running = true;
  lastTime = performance.now();
  accumulator = 0;
  onTickCallback = onTick;

  const loop = (timestamp: number) => {
    if (!running) {
      animationFrameId = null;
      return;
    }

    const frameTime = timestamp - lastTime;
    lastTime = timestamp;

    accumulator += frameTime;

    // Cap catchup to prevent death spiral
    if (accumulator > TICK_MS * MAX_CATCHUP_TICKS) {
      accumulator = TICK_MS * MAX_CATCHUP_TICKS;
    }

    // Run fixed-step updates
    let tickedThisFrame = false;
    while (accumulator >= TICK_MS) {
      // Check if paused
      const gameState = getGameState();
      const isPaused = gameState?.paused ?? false;

      if (!isPaused) {
        // Process commands at start of tick
        const commands = drainCommands();
        // Commands will be handled by InputSystem (to be implemented)
        // For now, just drain them
        void commands;

        // Run all systems
        runSystems(TICK_MS);
        tick++;
      } else {
        // Even when paused, drain commands (some commands work while paused)
        drainCommands();
      }

      accumulator -= TICK_MS;
      tickedThisFrame = true;
    }

    // Notify React (once per frame, not per tick)
    if (tickedThisFrame && onTickCallback) {
      onTickCallback();
    }

    animationFrameId = requestAnimationFrame(loop);
  };

  animationFrameId = requestAnimationFrame(loop);
}

/**
 * Stop the game loop.
 */
export function stopLoop(): void {
  running = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  onTickCallback = null;
}

/**
 * Get the current tick number.
 */
export function getTick(): number {
  return tick;
}

/**
 * Reset the tick counter (used when starting a new game).
 */
export function resetTick(): void {
  tick = 0;
}

/**
 * Check if the loop is running.
 */
export function isLoopRunning(): boolean {
  return running;
}

/**
 * Get effective delta time, scaled by combat speed.
 * Systems should use this for time-based calculations.
 */
export function getEffectiveDelta(deltaMs: number): number {
  const gameState = getGameState();
  const multiplier = gameState?.combatSpeed?.multiplier ?? 1;
  return deltaMs * multiplier;
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/ecs/loop.ts src/ecs/systems/index.ts
git commit -m "feat(ecs): add fixed-timestep game loop"
```

---

### Task 1.6: Write Loop Unit Tests

**Files:**
- Create: `src/ecs/__tests__/loop.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/ecs/__tests__/loop.test.ts
/**
 * Unit tests for the game loop.
 * Tests timing accuracy, pause behavior, and tick counting.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startLoop,
  stopLoop,
  getTick,
  resetTick,
  isLoopRunning,
  getEffectiveDelta,
  TICK_MS,
} from '../loop';
import { world } from '../world';
import { GAME_STATE_ENTITY_ID } from '../components';

describe('Game Loop', () => {
  beforeEach(() => {
    // Clear world and reset state
    for (const entity of world.entities) {
      world.remove(entity);
    }
    resetTick();
    stopLoop();

    // Mock requestAnimationFrame
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopLoop();
    vi.useRealTimers();
  });

  describe('startLoop / stopLoop', () => {
    it('should start the loop', () => {
      const onTick = vi.fn();
      startLoop(onTick);

      expect(isLoopRunning()).toBe(true);
    });

    it('should stop the loop', () => {
      const onTick = vi.fn();
      startLoop(onTick);
      stopLoop();

      expect(isLoopRunning()).toBe(false);
    });

    it('should not start twice', () => {
      const onTick1 = vi.fn();
      const onTick2 = vi.fn();
      startLoop(onTick1);
      startLoop(onTick2);

      expect(isLoopRunning()).toBe(true);
      // Only first callback should be registered
    });
  });

  describe('getTick / resetTick', () => {
    it('should start at tick 0', () => {
      expect(getTick()).toBe(0);
    });

    it('should reset tick counter', () => {
      // Manually set tick (would normally happen via loop)
      resetTick();
      expect(getTick()).toBe(0);
    });
  });

  describe('getEffectiveDelta', () => {
    it('should return base delta when no game state exists', () => {
      const result = getEffectiveDelta(16);
      expect(result).toBe(16);
    });

    it('should scale delta by combat speed', () => {
      // Create game state with 2x speed
      world.add({
        gameState: true,
        phase: 'combat',
        combatSpeed: { multiplier: 2 },
      });

      const result = getEffectiveDelta(16);
      expect(result).toBe(32);
    });

    it('should handle 3x speed', () => {
      world.add({
        gameState: true,
        phase: 'combat',
        combatSpeed: { multiplier: 3 },
      });

      const result = getEffectiveDelta(16);
      expect(result).toBe(48);
    });
  });

  describe('TICK_MS constant', () => {
    it('should be approximately 60fps', () => {
      expect(TICK_MS).toBe(16);
      expect(1000 / TICK_MS).toBeCloseTo(62.5, 0);
    });
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run src/ecs/__tests__/loop.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/ecs/__tests__/loop.test.ts
git commit -m "test(ecs): add game loop unit tests"
```

---

## Phase 2: Combat Core Systems

### Task 2.1: Create InputSystem

**Files:**
- Create: `src/ecs/systems/input.ts`
- Modify: `src/ecs/systems/index.ts`

**Step 1: Write the InputSystem**

```typescript
// src/ecs/systems/input.ts
/**
 * InputSystem - processes commands from the command queue.
 * Runs first each tick to translate user input into component changes.
 */

import { drainCommands, type Command } from '../commands';
import { getPlayer, getGameState } from '../queries';
import { getTick } from '../loop';
import { COMBAT_BALANCE } from '@/constants/balance';

export function InputSystem(_deltaMs: number): void {
  const commands = drainCommands();
  const player = getPlayer();
  const gameState = getGameState();

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'ACTIVATE_POWER': {
        if (!player || !player.powers) break;

        const power = player.powers.find((p) => p.id === cmd.powerId);
        if (!power) break;

        // Check cooldown
        const cooldown = player.cooldowns?.get(cmd.powerId);
        if (cooldown && cooldown.remaining > 0) break;

        // Check mana
        if (!player.mana || player.mana.current < power.manaCost) break;

        // Mark as casting - PowerSystem will handle the effect
        player.casting = {
          powerId: cmd.powerId,
          startedAtTick: getTick(),
        };
        break;
      }

      case 'BLOCK': {
        if (!player || !player.mana) break;
        if (player.mana.current < COMBAT_BALANCE.BLOCK_MANA_COST) break;
        if (player.blocking) break; // Already blocking

        player.blocking = { reduction: COMBAT_BALANCE.BLOCK_DAMAGE_REDUCTION };
        player.mana.current -= COMBAT_BALANCE.BLOCK_MANA_COST;
        break;
      }

      case 'SET_COMBAT_SPEED': {
        if (gameState) {
          gameState.combatSpeed = { multiplier: cmd.speed };
        }
        break;
      }

      case 'TOGGLE_PAUSE': {
        if (gameState) {
          gameState.paused = !gameState.paused;
        }
        break;
      }

      case 'DISMISS_POPUP': {
        if (gameState?.popups) {
          // Clear the specific popup
          const popupKey = cmd.popupType as keyof typeof gameState.popups;
          if (popupKey in gameState.popups) {
            delete gameState.popups[popupKey];
          }
        }
        break;
      }

      case 'MARK_ANIMATIONS_CONSUMED': {
        if (gameState?.animationEvents) {
          for (const event of gameState.animationEvents) {
            if (cmd.ids.includes(event.id)) {
              event.consumed = true;
            }
          }
        }
        break;
      }

      // TODO: Handle remaining commands as systems are implemented
      default:
        // Unknown command - ignore for now
        break;
    }
  }
}
```

**Step 2: Register InputSystem**

Update `src/ecs/systems/index.ts`:

```typescript
// src/ecs/systems/index.ts
import { InputSystem } from './input';

export type System = (deltaMs: number) => void;

export const systems: System[] = [
  InputSystem, // 1. Process player commands first
];

export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/ecs/systems/input.ts src/ecs/systems/index.ts
git commit -m "feat(ecs): add InputSystem for command processing"
```

---

### Task 2.2: Create CooldownSystem

**Files:**
- Create: `src/ecs/systems/cooldown.ts`
- Modify: `src/ecs/systems/index.ts`

**Step 1: Write the CooldownSystem**

```typescript
// src/ecs/systems/cooldown.ts
/**
 * CooldownSystem - ticks down power cooldowns.
 * Runs each tick, reducing cooldown timers by effective delta time.
 */

import { entitiesWithCooldowns } from '../queries';
import { getEffectiveDelta } from '../loop';

export function CooldownSystem(deltaMs: number): void {
  const effectiveDelta = getEffectiveDelta(deltaMs);

  for (const entity of entitiesWithCooldowns) {
    const cooldowns = entity.cooldowns;
    if (!cooldowns) continue;

    for (const [powerId, cooldown] of cooldowns) {
      if (cooldown.remaining > 0) {
        // Convert ms to seconds for cooldown (powers use seconds)
        const deltaSeconds = effectiveDelta / 1000;
        cooldown.remaining = Math.max(0, cooldown.remaining - deltaSeconds);
      }
    }
  }
}
```

**Step 2: Register CooldownSystem**

Update `src/ecs/systems/index.ts`:

```typescript
import { InputSystem } from './input';
import { CooldownSystem } from './cooldown';

export type System = (deltaMs: number) => void;

export const systems: System[] = [
  InputSystem,    // 1. Process player commands first
  CooldownSystem, // 2. Advance cooldowns
];

export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
```

**Step 3: Write unit test**

Create `src/ecs/systems/__tests__/cooldown.test.ts`:

```typescript
// src/ecs/systems/__tests__/cooldown.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { CooldownSystem } from '../cooldown';

describe('CooldownSystem', () => {
  beforeEach(() => {
    for (const entity of world.entities) {
      world.remove(entity);
    }
    // Add game state for combat speed
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
    });
  });

  it('should reduce cooldown by delta time', () => {
    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      cooldowns: new Map([['fireball', { remaining: 5, base: 5 }]]),
    });

    CooldownSystem(16); // 16ms = 0.016 seconds

    const cooldown = entity.cooldowns?.get('fireball');
    expect(cooldown?.remaining).toBeCloseTo(4.984, 3);
  });

  it('should not go below zero', () => {
    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      cooldowns: new Map([['fireball', { remaining: 0.01, base: 5 }]]),
    });

    CooldownSystem(16);

    const cooldown = entity.cooldowns?.get('fireball');
    expect(cooldown?.remaining).toBe(0);
  });

  it('should respect combat speed multiplier', () => {
    // Set 2x speed
    const gameState = world.with('gameState').first;
    if (gameState?.combatSpeed) {
      gameState.combatSpeed.multiplier = 2;
    }

    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      cooldowns: new Map([['fireball', { remaining: 5, base: 5 }]]),
    });

    CooldownSystem(16); // 16ms * 2 = 32ms effective

    const cooldown = entity.cooldowns?.get('fireball');
    expect(cooldown?.remaining).toBeCloseTo(4.968, 3);
  });
});
```

**Step 4: Run test**

Run: `npx vitest run src/ecs/systems/__tests__/cooldown.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/ecs/systems/cooldown.ts src/ecs/systems/__tests__/cooldown.test.ts src/ecs/systems/index.ts
git commit -m "feat(ecs): add CooldownSystem with tests"
```

---

### Task 2.3: Create AttackTimingSystem

**Files:**
- Create: `src/ecs/systems/attack-timing.ts`
- Modify: `src/ecs/systems/index.ts`

**Step 1: Write the AttackTimingSystem**

```typescript
// src/ecs/systems/attack-timing.ts
/**
 * AttackTimingSystem - accumulates attack progress and triggers attacks.
 * Each entity with speed accumulates time toward their attack interval.
 * When accumulated time >= interval, mark entity as ready to attack.
 */

import { attackersQuery, getGameState } from '../queries';
import { getEffectiveDelta } from '../loop';
import type { Entity } from '../components';

// Check if entity is stunned
function isStunned(entity: Entity): boolean {
  return entity.statusEffects?.some((e) => e.type === 'stun') ?? false;
}

// Calculate attack damage with variance and crit
function calculateAttackDamage(entity: Entity): { damage: number; isCrit: boolean } {
  const attack = entity.attack;
  if (!attack) return { damage: 0, isCrit: false };

  // Apply variance
  const { min, max } = attack.variance;
  const variance = min + Math.random() * (max - min);
  let damage = Math.floor(attack.baseDamage * variance);

  // Check for crit
  const isCrit = Math.random() < attack.critChance;
  if (isCrit) {
    damage = Math.floor(damage * attack.critMultiplier);
  }

  return { damage, isCrit };
}

export function AttackTimingSystem(deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  const effectiveDelta = getEffectiveDelta(deltaMs);

  for (const entity of attackersQuery) {
    // Skip if stunned
    if (isStunned(entity)) continue;

    const speed = entity.speed;
    if (!speed) continue;

    // Accumulate time
    speed.accumulated += effectiveDelta;

    // Check if attack should fire
    if (speed.accumulated >= speed.attackInterval) {
      const { damage, isCrit } = calculateAttackDamage(entity);

      // Mark as ready to attack - CombatSystem will process
      entity.attackReady = { damage, isCrit };

      // Carry over excess time (prevents drift)
      speed.accumulated -= speed.attackInterval;
    }
  }
}
```

**Step 2: Register AttackTimingSystem**

Update `src/ecs/systems/index.ts`:

```typescript
import { InputSystem } from './input';
import { CooldownSystem } from './cooldown';
import { AttackTimingSystem } from './attack-timing';

export type System = (deltaMs: number) => void;

export const systems: System[] = [
  InputSystem,        // 1. Process player commands first
  CooldownSystem,     // 2. Advance cooldowns
  AttackTimingSystem, // 3. Accumulate attack progress, trigger attacks
];

export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
```

**Step 3: Write unit test**

Create `src/ecs/systems/__tests__/attack-timing.test.ts`:

```typescript
// src/ecs/systems/__tests__/attack-timing.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { world } from '../../world';
import { AttackTimingSystem } from '../attack-timing';

describe('AttackTimingSystem', () => {
  beforeEach(() => {
    for (const entity of world.entities) {
      world.remove(entity);
    }
    // Add game state
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
    });
  });

  it('should accumulate time toward attack', () => {
    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
    });

    AttackTimingSystem(16);

    expect(entity.speed?.accumulated).toBe(16);
    expect(entity.attackReady).toBeUndefined();
  });

  it('should trigger attack when interval reached', () => {
    // Mock random to avoid crit variance
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 2490 },
    });

    AttackTimingSystem(16); // 2490 + 16 = 2506 >= 2500

    expect(entity.attackReady).toBeDefined();
    expect(entity.attackReady?.damage).toBe(20);
    expect(entity.attackReady?.isCrit).toBe(false);

    vi.restoreAllMocks();
  });

  it('should carry over excess time', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 2490 },
    });

    AttackTimingSystem(16); // Triggers at 2506, carries over 6ms

    expect(entity.speed?.accumulated).toBe(6);

    vi.restoreAllMocks();
  });

  it('should not attack when stunned', () => {
    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 2500 },
      statusEffects: [
        { id: 'stun-1', type: 'stun', remainingTurns: 1, icon: 'stun' },
      ],
    });

    AttackTimingSystem(16);

    expect(entity.attackReady).toBeUndefined();
    expect(entity.speed?.accumulated).toBe(2500); // No accumulation when stunned
  });
});
```

**Step 4: Run test**

Run: `npx vitest run src/ecs/systems/__tests__/attack-timing.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/ecs/systems/attack-timing.ts src/ecs/systems/__tests__/attack-timing.test.ts src/ecs/systems/index.ts
git commit -m "feat(ecs): add AttackTimingSystem with tests"
```

---

### Task 2.4: Create CombatSystem

**Files:**
- Create: `src/ecs/systems/combat.ts`
- Modify: `src/ecs/systems/index.ts`

**Step 1: Write the CombatSystem**

```typescript
// src/ecs/systems/combat.ts
/**
 * CombatSystem - resolves attacks and applies damage.
 * Processes all entities with attackReady component.
 */

import { world } from '../world';
import { entitiesWithAttackReady, getPlayer, getActiveEnemy, getGameState } from '../queries';
import { getTick } from '../loop';
import type { Entity, AnimationEvent, AnimationPayload } from '../components';

let nextAnimationId = 0;

function getNextAnimationId(): string {
  return `anim-${nextAnimationId++}`;
}

function queueAnimationEvent(
  type: AnimationEvent['type'],
  payload: AnimationPayload,
  durationTicks: number = 30
): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.animationEvents) {
    gameState.animationEvents = [];
  }

  const currentTick = getTick();
  gameState.animationEvents.push({
    id: getNextAnimationId(),
    type,
    payload,
    createdAtTick: currentTick,
    displayUntilTick: currentTick + durationTicks,
    consumed: false,
  });
}

function addCombatLog(message: string): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.combatLog) {
    gameState.combatLog = [];
  }

  gameState.combatLog.push(message);

  // Keep last 50 entries
  if (gameState.combatLog.length > 50) {
    gameState.combatLog.shift();
  }
}

function getTarget(attacker: Entity): Entity | undefined {
  if (attacker.player) {
    return getActiveEnemy();
  } else if (attacker.enemy) {
    return getPlayer();
  }
  return undefined;
}

function getEntityName(entity: Entity): string {
  if (entity.player) {
    return entity.identity?.name ?? 'Hero';
  }
  if (entity.enemy) {
    return entity.enemy.name;
  }
  return 'Unknown';
}

export function CombatSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  // Process all entities ready to attack
  for (const entity of entitiesWithAttackReady) {
    const attackData = entity.attackReady;
    if (!attackData) continue;

    const target = getTarget(entity);
    if (!target || target.dying) {
      // No valid target - clear attack
      delete entity.attackReady;
      continue;
    }

    let damage = attackData.damage;
    const attackerName = getEntityName(entity);
    const targetName = getEntityName(target);

    // Apply defense
    const defense = target.defense?.value ?? 0;
    damage -= defense;
    damage = Math.max(1, damage); // Minimum 1 damage

    // Check for block
    let blocked = false;
    if (target.blocking) {
      damage = Math.floor(damage * (1 - target.blocking.reduction));
      blocked = true;
      delete target.blocking;

      // Queue block animation
      queueAnimationEvent('player_block', {
        type: 'block',
        reduction: target.blocking?.reduction ?? 0.4,
      });
    }

    // Apply shield first (if target has shield)
    if (target.shield && target.shield.value > 0) {
      if (target.shield.value >= damage) {
        target.shield.value -= damage;
        damage = 0;
        addCombatLog(`${targetName}'s shield absorbs the attack!`);
      } else {
        damage -= target.shield.value;
        target.shield.value = 0;
        addCombatLog(`${targetName}'s shield breaks!`);
      }
    }

    // Apply damage to health
    if (damage > 0 && target.health) {
      target.health.current = Math.max(0, target.health.current - damage);
    }

    // Queue damage animation
    const isPlayerAttacking = !!entity.player;
    queueAnimationEvent(isPlayerAttacking ? 'enemy_hit' : 'player_hit', {
      type: 'damage',
      value: damage,
      isCrit: attackData.isCrit,
      blocked,
    });

    // Combat log
    const critText = attackData.isCrit ? ' (CRIT!)' : '';
    const blockText = blocked ? ' (blocked)' : '';
    addCombatLog(
      `${attackerName} attacks ${targetName} for ${damage} damage${critText}${blockText}`
    );

    // Clear attack ready
    delete entity.attackReady;
  }
}
```

**Step 2: Register CombatSystem**

Update `src/ecs/systems/index.ts`:

```typescript
import { InputSystem } from './input';
import { CooldownSystem } from './cooldown';
import { AttackTimingSystem } from './attack-timing';
import { CombatSystem } from './combat';

export type System = (deltaMs: number) => void;

export const systems: System[] = [
  InputSystem,        // 1. Process player commands first
  CooldownSystem,     // 2. Advance cooldowns
  AttackTimingSystem, // 3. Accumulate attack progress, trigger attacks
  CombatSystem,       // 4. Resolve attacks, apply damage
];

export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
```

**Step 3: Write unit test**

Create `src/ecs/systems/__tests__/combat.test.ts`:

```typescript
// src/ecs/systems/__tests__/combat.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { CombatSystem } from '../combat';

describe('CombatSystem', () => {
  beforeEach(() => {
    for (const entity of world.entities) {
      world.remove(entity);
    }
    // Add game state
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
      animationEvents: [],
      combatLog: [],
    });
  });

  it('should apply damage from player to enemy', () => {
    // Create player with attack ready
    world.add({
      player: true,
      identity: { name: 'Hero', class: 'warrior' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      attackReady: { damage: 20, isCrit: false },
    });

    // Create enemy
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      attack: {
        baseDamage: 10,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 3, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    CombatSystem(16);

    // Damage = 20 - 3 (defense) = 17
    expect(enemy.health?.current).toBe(33);
  });

  it('should apply minimum 1 damage even with high defense', () => {
    world.add({
      player: true,
      identity: { name: 'Hero', class: 'warrior' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 5,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      attackReady: { damage: 5, isCrit: false },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      defense: { value: 100, blockReduction: 0 }, // Very high defense
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    CombatSystem(16);

    // Minimum 1 damage
    expect(enemy.health?.current).toBe(49);
  });

  it('should reduce damage when target is blocking', () => {
    world.add({
      player: true,
      identity: { name: 'Hero', class: 'warrior' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      blocking: { reduction: 0.4 },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
    });

    // Enemy attacks player who is blocking
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 3, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      attackReady: { damage: 20, isCrit: false },
    });

    const player = world.with('player').first!;

    CombatSystem(16);

    // Damage = (20 - 5) * 0.6 = 9
    expect(player.health?.current).toBe(91);
    // Block consumed
    expect(player.blocking).toBeUndefined();
  });

  it('should clear attackReady after processing', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'warrior' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      attackReady: { damage: 20, isCrit: false },
    });

    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      defense: { value: 3, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    CombatSystem(16);

    expect(player.attackReady).toBeUndefined();
  });

  it('should not attack dying targets', () => {
    world.add({
      player: true,
      identity: { name: 'Hero', class: 'warrior' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      attackReady: { damage: 20, isCrit: false },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      defense: { value: 3, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      dying: { startedAtTick: 0, duration: 500 },
    });

    CombatSystem(16);

    // No damage - enemy is dying
    expect(enemy.health?.current).toBe(50);
  });
});
```

**Step 4: Run test**

Run: `npx vitest run src/ecs/systems/__tests__/combat.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/ecs/systems/combat.ts src/ecs/systems/__tests__/combat.test.ts src/ecs/systems/index.ts
git commit -m "feat(ecs): add CombatSystem with tests"
```

---

### Task 2.5: Create DeathSystem

**Files:**
- Create: `src/ecs/systems/death.ts`
- Modify: `src/ecs/systems/index.ts`

**Step 1: Write the DeathSystem**

```typescript
// src/ecs/systems/death.ts
/**
 * DeathSystem - detects and handles entity deaths.
 * Runs AFTER all damage sources have been applied.
 * This ensures death is detected exactly once, preventing race conditions.
 */

import { world } from '../world';
import { dyingEntities, getGameState, getPlayer, getActiveEnemy } from '../queries';
import { getTick, TICK_MS } from '../loop';
import type { Entity, AnimationEvent, AnimationPayload, ScheduledTransition } from '../components';

const DEATH_ANIMATION_MS = 500;

function queueAnimationEvent(
  type: AnimationEvent['type'],
  payload: AnimationPayload,
  durationTicks: number = 30
): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.animationEvents) {
    gameState.animationEvents = [];
  }

  const currentTick = getTick();
  gameState.animationEvents.push({
    id: `death-${currentTick}`,
    type,
    payload,
    createdAtTick: currentTick,
    displayUntilTick: currentTick + durationTicks,
    consumed: false,
  });
}

function scheduleTransition(toPhase: Entity['phase'], delayMs: number): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.scheduledTransitions) {
    gameState.scheduledTransitions = [];
  }

  gameState.scheduledTransitions.push({ toPhase: toPhase!, delay: delayMs });
}

function addCombatLog(message: string): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.combatLog) {
    gameState.combatLog = [];
  }

  gameState.combatLog.push(message);
}

export function DeathSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (!gameState) return;

  // Check all entities with health for death
  for (const entity of world.with('health').without('dying')) {
    if (entity.health!.current <= 0) {
      // Mark as dying
      entity.dying = {
        startedAtTick: getTick(),
        duration: DEATH_ANIMATION_MS,
      };

      const isPlayer = !!entity.player;

      // Queue death animation
      queueAnimationEvent('death', {
        type: 'death',
        isPlayer,
      }, Math.ceil(DEATH_ANIMATION_MS / TICK_MS));

      if (isPlayer) {
        // Player death
        addCombatLog('You have been defeated!');
        scheduleTransition('defeat', DEATH_ANIMATION_MS);
      } else if (entity.enemy) {
        // Enemy death
        addCombatLog(`${entity.enemy.name} has been defeated!`);

        // Calculate and store rewards
        const xpReward = entity.rewards?.xp ?? 10;
        const goldReward = entity.rewards?.gold ?? 5;

        // Apply rewards to player
        const player = getPlayer();
        if (player) {
          if (player.progression) {
            player.progression.xp += xpReward;
          }
          if (player.inventory) {
            player.inventory.gold += goldReward;
          }
          addCombatLog(`Gained ${xpReward} XP and ${goldReward} gold!`);
        }

        // Check for floor complete or spawn next enemy
        const floor = gameState.floor;
        if (floor && floor.room >= floor.totalRooms) {
          // Floor complete
          scheduleTransition('floor-complete', DEATH_ANIMATION_MS + 500);
        } else {
          // Schedule next enemy spawn (handled by FlowSystem)
          if (!gameState.scheduledSpawns) {
            gameState.scheduledSpawns = [];
          }
          gameState.scheduledSpawns.push({ delay: DEATH_ANIMATION_MS + 300 });
        }
      }
    }
  }

  // Clean up entities that finished dying
  for (const entity of dyingEntities) {
    const dying = entity.dying!;
    const elapsed = (getTick() - dying.startedAtTick) * TICK_MS;

    if (elapsed >= dying.duration) {
      if (!entity.player) {
        // Remove enemy entity
        world.remove(entity);
      }
      // Player entity stays (needed for death screen)
    }
  }
}
```

**Step 2: Register DeathSystem**

Update `src/ecs/systems/index.ts`:

```typescript
import { InputSystem } from './input';
import { CooldownSystem } from './cooldown';
import { AttackTimingSystem } from './attack-timing';
import { CombatSystem } from './combat';
import { DeathSystem } from './death';

export type System = (deltaMs: number) => void;

export const systems: System[] = [
  InputSystem,        // 1. Process player commands first
  CooldownSystem,     // 2. Advance cooldowns
  AttackTimingSystem, // 3. Accumulate attack progress, trigger attacks
  CombatSystem,       // 4. Resolve attacks, apply damage
  DeathSystem,        // 5. Check deaths (after ALL damage)
];

export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
```

**Step 3: Write unit test**

Create `src/ecs/systems/__tests__/death.test.ts`:

```typescript
// src/ecs/systems/__tests__/death.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { DeathSystem } from '../death';
import { resetTick } from '../../loop';

describe('DeathSystem', () => {
  beforeEach(() => {
    for (const entity of world.entities) {
      world.remove(entity);
    }
    resetTick();

    // Add game state
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
      floor: { number: 1, room: 1, totalRooms: 5 },
      animationEvents: [],
      combatLog: [],
    });
  });

  it('should mark entity as dying when health <= 0', () => {
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 0, max: 50 },
      rewards: { xp: 10, gold: 5 },
    });

    DeathSystem(16);

    expect(enemy.dying).toBeDefined();
    expect(enemy.dying?.duration).toBe(500);
  });

  it('should not double-process already dying entities', () => {
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 0, max: 50 },
      dying: { startedAtTick: 0, duration: 500 },
    });

    const gameState = world.with('gameState').first!;
    const eventCountBefore = gameState.animationEvents?.length ?? 0;

    DeathSystem(16);

    const eventCountAfter = gameState.animationEvents?.length ?? 0;
    expect(eventCountAfter).toBe(eventCountBefore); // No new events
  });

  it('should queue death animation event', () => {
    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 0, max: 50 },
      rewards: { xp: 10, gold: 5 },
    });

    DeathSystem(16);

    const gameState = world.with('gameState').first!;
    const deathEvents = gameState.animationEvents?.filter((e) => e.type === 'death');
    expect(deathEvents?.length).toBe(1);
    expect((deathEvents?.[0]?.payload as { isPlayer: boolean }).isPlayer).toBe(false);
  });

  it('should apply rewards to player on enemy death', () => {
    const player = world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      progression: { level: 1, xp: 0, xpToNext: 100 },
      inventory: { gold: 0, items: [] },
    });

    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 0, max: 50 },
      rewards: { xp: 15, gold: 10 },
    });

    DeathSystem(16);

    expect(player.progression?.xp).toBe(15);
    expect(player.inventory?.gold).toBe(10);
  });

  it('should schedule defeat transition on player death', () => {
    world.add({
      player: true,
      health: { current: 0, max: 100 },
      mana: { current: 50, max: 50 },
    });

    DeathSystem(16);

    const gameState = world.with('gameState').first!;
    const defeatTransition = gameState.scheduledTransitions?.find(
      (t) => t.toPhase === 'defeat'
    );
    expect(defeatTransition).toBeDefined();
  });

  it('should schedule floor-complete when last enemy dies', () => {
    const gameState = world.with('gameState').first!;
    if (gameState.floor) {
      gameState.floor.room = 5;
      gameState.floor.totalRooms = 5;
    }

    world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      progression: { level: 1, xp: 0, xpToNext: 100 },
      inventory: { gold: 0, items: [] },
    });

    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 0, max: 50 },
      rewards: { xp: 10, gold: 5 },
    });

    DeathSystem(16);

    const floorCompleteTransition = gameState.scheduledTransitions?.find(
      (t) => t.toPhase === 'floor-complete'
    );
    expect(floorCompleteTransition).toBeDefined();
  });
});
```

**Step 4: Run test**

Run: `npx vitest run src/ecs/systems/__tests__/death.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/ecs/systems/death.ts src/ecs/systems/__tests__/death.test.ts src/ecs/systems/index.ts
git commit -m "feat(ecs): add DeathSystem with tests - eliminates race conditions"
```

---

## Continuation Note

This plan continues with:
- **Phase 2 (continued)**: RegenSystem, StatusEffectSystem
- **Phase 3**: Progression systems (ProgressionSystem, FlowSystem, PowerSystem)
- **Phase 4**: React Bridge (snapshot creation, useGameEngine hook, context)
- **Phase 5**: Component migration (updating React components to use ECS)
- **Phase 6**: Cleanup (removing old hooks)

Each task follows the same TDD pattern: write failing test, implement, verify, commit.

---

**Plan saved. Ready for execution.**
