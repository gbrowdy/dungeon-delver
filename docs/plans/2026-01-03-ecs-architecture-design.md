# ECS Game Loop Architecture Design

## Overview

This document describes a redesign of the game's event-driven architecture from the current multi-timer React hooks approach to a clean Entity-Component-System (ECS) architecture using the **miniplex** library.

## Goals

1. **Correctness & Reliability** - Eliminate race conditions, timer desync, and edge cases
2. **Maintainability & Clarity** - Make code easier to understand, test, and extend
3. **Performance** - Reduce timer overhead, batch state updates

## Current Architecture Problems

The existing architecture uses three independent timing layers:

| Layer | Mechanism | Issues |
|-------|-----------|--------|
| Combat Loop | `requestAnimationFrame` (~60fps) | Separate from other timers |
| Event Queue | `setInterval` (30ms ticks) | Can silently drop events at 100+ queue size |
| Combat Timers | 6 independent `setInterval`s | Desynchronize over time, no common clock |

**Key problems:**
- Race conditions between async `setState` calls (mitigated by refs, but fragile)
- 6 timers that start at different times with no synchronization
- Floating-point precision drift in cooldown calculations
- Events can fire up to 50ms late due to queue tick interval
- Hard to test timing-dependent logic

## Solution: ECS with miniplex

### Why ECS?

| Current Problem | ECS Solution |
|----------------|--------------|
| 6 independent timers desync | Single game loop runs all systems in sequence |
| Race conditions in async setState | Synchronous updates—system A finishes before B starts |
| Event queue can drop events | Events are components; processed deterministically |
| Floating-point drift | Fixed timestep with integer milliseconds |
| Hard to test timing | Pure functions operating on plain data |

### Why miniplex?

- **React-first design** - `@miniplex/react` provides hooks for reactive queries
- **Excellent TypeScript DX** - Full type inference for components
- **Battle-tested** - Used in production games
- **Right-sized** - ~5kb bundle, not overkill for our entity count
- **Great documentation** - Clear guides and examples

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Layer                              │
│  (Stateless display components - receives snapshots to render)   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Reactive queries + snapshots
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        Bridge Layer                              │
│  - useGameEngine hook manages loop lifecycle                     │
│  - @miniplex/react for reactive entity queries                   │
│  - Command dispatch for user input                               │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         ECS Engine                               │
│  ┌─────────────────┐  ┌─────────────┐  ┌───────────────────┐   │
│  │ miniplex World  │  │  Systems    │  │  Game Loop        │   │
│  │  - Entities     │  │  (ordered)  │  │  - Fixed timestep │   │
│  │  - Components   │  │  - Input    │  │  - 16ms ticks     │   │
│  │  - Queries      │  │  - Combat   │  │  - Speed scaling  │   │
│  │                 │  │  - Regen    │  │                   │   │
│  │                 │  │  - Death    │  │                   │   │
│  │                 │  │  - Flow     │  │                   │   │
│  └─────────────────┘  └─────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── ecs/                        # ECS engine (pure TypeScript, no React)
│   ├── world.ts                # miniplex World setup, entity factories
│   ├── components.ts           # Component type definitions
│   ├── systems/                # System implementations
│   │   ├── index.ts            # System registration and ordering
│   │   ├── input.ts            # Process player commands
│   │   ├── cooldown.ts         # Tick down cooldowns
│   │   ├── attack-timing.ts    # Accumulate attack progress
│   │   ├── combat.ts           # Resolve attacks, apply damage
│   │   ├── power.ts            # Cast powers, apply effects
│   │   ├── status-effect.ts    # Poison, stun, bleed processing
│   │   ├── regen.ts            # HP/MP regeneration
│   │   ├── death.ts            # Death detection and handling
│   │   ├── progression.ts      # XP, level-ups, path abilities
│   │   ├── flow.ts             # Phase transitions, room advancement
│   │   └── animation.ts        # Queue animation events
│   ├── loop.ts                 # Fixed-timestep game loop
│   ├── commands.ts             # Command types and queue
│   └── queries.ts              # Reusable miniplex queries
├── bridge/                     # ECS ↔ React integration
│   ├── useGameEngine.ts        # Hook that owns the game loop
│   ├── context.tsx             # React context for game access
│   ├── snapshot.ts             # Transform ECS state for React
│   └── commands.ts             # Type-safe command creators
├── components/game/            # (existing - becomes stateless)
└── ...
```

---

## Core Concepts

### Entities and Components

Entities are objects with components attached. miniplex uses a simple, intuitive API:

```typescript
// ecs/components.ts
import { World } from 'miniplex';

// Define all possible components
interface Entity {
  // Identity
  player?: true;
  enemy?: { tier: EnemyTier; name: string };
  gameState?: true;

  // Combat stats
  health?: { current: number; max: number };
  mana?: { current: number; max: number };
  attack?: {
    baseDamage: number;
    critChance: number;
    critMultiplier: number;
    variance: { min: number; max: number };
  };
  defense?: { value: number; blockReduction: number };
  speed?: {
    value: number;
    attackInterval: number;
    accumulated: number;
  };

  // Status
  statusEffects?: StatusEffect[];
  shield?: { value: number; remaining: number };
  buffs?: Buff[];
  blocking?: { reduction: number };
  dying?: { startedAtTick: number; duration: number };

  // Timing
  cooldowns?: Map<string, { remaining: number; base: number }>;
  regen?: {
    healthPerSecond: number;
    manaPerSecond: number;
    accumulated: number;
  };

  // Combat actions
  attackReady?: { damage: number; isCrit: boolean };
  casting?: { powerId: string; startedAtTick: number };

  // Progression
  progression?: {
    level: number;
    xp: number;
    xpToNext: number;
  };
  path?: {
    id: string;
    abilities: string[];
    subpath?: string;
  };
  powers?: Power[];
  equipment?: Equipment;
  inventory?: { gold: number; items: Item[] };

  // Game flow
  phase?: GamePhase;
  floor?: { number: number; room: number; totalRooms: number };
  combatSpeed?: { multiplier: 1 | 2 | 3 };
  paused?: boolean;

  // Animation
  animationEvents?: AnimationEvent[];
  spriteState?: 'idle' | 'attacking' | 'blocking' | 'dying';

  // UI
  popups?: PopupState;
  pendingRewards?: Reward[];
  scheduledTransitions?: ScheduledTransition[];
  scheduledSpawns?: ScheduledSpawn[];
}

// Create the world
export const world = new World<Entity>();
```

### Queries

miniplex queries find entities with specific components:

```typescript
// ecs/queries.ts
import { world } from './world';

// Find player entity
export const playerQuery = world.with('player', 'health', 'mana');

// Find current enemy (not dying)
export const activeEnemyQuery = world.with('enemy', 'health').without('dying');

// Find all entities that can attack
export const attackersQuery = world.with('health', 'attack', 'speed').without('dying');

// Find entities with status effects
export const statusEffectQuery = world.with('statusEffects');

// Find game state singleton
export const gameStateQuery = world.with('gameState', 'phase', 'floor');
```

### Systems

Systems are functions that process entities. They run in a fixed order each tick:

```typescript
// ecs/systems/cooldown.ts
import { world } from '../world';
import { getEffectiveDelta } from '../loop';

export function CooldownSystem(deltaMs: number): void {
  const effectiveDelta = getEffectiveDelta(deltaMs);

  for (const entity of world.with('cooldowns')) {
    for (const [powerId, cooldown] of entity.cooldowns!) {
      if (cooldown.remaining > 0) {
        cooldown.remaining = Math.max(0, cooldown.remaining - effectiveDelta);
      }
    }
  }
}
```

### System Execution Order

Order matters—earlier systems' changes are visible to later systems:

```typescript
// ecs/systems/index.ts
import { InputSystem } from './input';
import { CooldownSystem } from './cooldown';
import { AttackTimingSystem } from './attack-timing';
import { CombatSystem } from './combat';
import { PowerSystem } from './power';
import { StatusEffectSystem } from './status-effect';
import { RegenSystem } from './regen';
import { DeathSystem } from './death';
import { ProgressionSystem } from './progression';
import { FlowSystem } from './flow';
import { AnimationSystem } from './animation';
import { CleanupSystem } from './cleanup';

export const systems = [
  InputSystem,        // 1. Process player commands first
  CooldownSystem,     // 2. Advance cooldowns
  AttackTimingSystem, // 3. Accumulate attack progress, trigger attacks
  CombatSystem,       // 4. Resolve attacks, apply damage
  PowerSystem,        // 5. Resolve power casts
  StatusEffectSystem, // 6. Poison/bleed damage, effect expiry
  RegenSystem,        // 7. HP/MP recovery (after damage)
  DeathSystem,        // 8. Check deaths (after ALL damage)
  ProgressionSystem,  // 9. XP, level-ups
  FlowSystem,         // 10. Phase transitions, room advancement
  AnimationSystem,    // 11. Queue visual events
  CleanupSystem,      // 12. Remove consumed events, despawn entities
];

export function runSystems(deltaMs: number): void {
  for (const system of systems) {
    system(deltaMs);
  }
}
```

---

## The Game Loop

### Fixed Timestep

The game advances in consistent 16ms increments, regardless of frame rate:

```typescript
// ecs/loop.ts
import { runSystems } from './systems';
import { processCommands, commandQueue } from './commands';
import { gameStateQuery } from './queries';

const TICK_MS = 16;  // ~60 ticks per second
const MAX_CATCHUP_TICKS = 10;  // Prevent death spiral

let running = false;
let lastTime = 0;
let accumulator = 0;
let tick = 0;

export function startLoop(onTick: () => void): void {
  running = true;
  lastTime = performance.now();
  accumulator = 0;

  const loop = () => {
    if (!running) return;

    const now = performance.now();
    const frameTime = now - lastTime;
    lastTime = now;

    accumulator += frameTime;

    // Cap catchup to prevent death spiral
    if (accumulator > TICK_MS * MAX_CATCHUP_TICKS) {
      accumulator = TICK_MS * MAX_CATCHUP_TICKS;
    }

    // Run fixed-step updates
    let tickedThisFrame = false;
    while (accumulator >= TICK_MS) {
      // Check if paused
      const gameState = gameStateQuery.first;
      if (!gameState?.paused) {
        processCommands();
        runSystems(TICK_MS);
        tick++;
      }
      accumulator -= TICK_MS;
      tickedThisFrame = true;
    }

    // Notify React (once per frame, not per tick)
    if (tickedThisFrame) {
      onTick();
    }

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

export function stopLoop(): void {
  running = false;
}

export function getTick(): number {
  return tick;
}

export function getEffectiveDelta(deltaMs: number): number {
  const gameState = gameStateQuery.first;
  const multiplier = gameState?.combatSpeed?.multiplier ?? 1;
  return deltaMs * multiplier;
}
```

### Why This Eliminates Race Conditions

```
Tick N:
  1. InputSystem processes all queued commands
  2. AttackTimingSystem: player reaches attack threshold
  3. CombatSystem: applies 50 damage to enemy (health: 30 → -20)
  4. StatusEffectSystem: poison would deal 5 damage, but skipped (health already ≤ 0)
  5. DeathSystem: sees health ≤ 0, marks enemy as dying
  6. AnimationSystem: queues death animation

Result: Death detected exactly once, after all damage resolved
```

---

## Commands and User Input

### Command Pattern

React dispatches commands; ECS processes them at tick start:

```typescript
// ecs/commands.ts
export type Command =
  | { type: 'ACTIVATE_POWER'; powerId: string }
  | { type: 'BLOCK' }
  | { type: 'SET_COMBAT_SPEED'; speed: 1 | 2 | 3 }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'SELECT_CLASS'; classId: string }
  | { type: 'SELECT_PATH'; pathId: string }
  | { type: 'SELECT_ABILITY'; abilityId: string }
  | { type: 'CLAIM_REWARD'; rewardType: 'power' | 'item'; rewardId: string }
  | { type: 'START_GAME' }
  | { type: 'RETRY_FLOOR' }
  | { type: 'ABANDON_RUN' }
  | { type: 'ADVANCE_ROOM' }
  | { type: 'DISMISS_POPUP'; popupType: string }
  | { type: 'MARK_ANIMATIONS_CONSUMED'; ids: string[] };

export const commandQueue: Command[] = [];

export function dispatch(command: Command): void {
  commandQueue.push(command);
}

export function processCommands(): void {
  const commands = commandQueue.splice(0);
  for (const cmd of commands) {
    // InputSystem handles these
  }
}

// Type-safe command creators
export const Commands = {
  activatePower: (powerId: string): Command =>
    ({ type: 'ACTIVATE_POWER', powerId }),
  block: (): Command =>
    ({ type: 'BLOCK' }),
  setCombatSpeed: (speed: 1 | 2 | 3): Command =>
    ({ type: 'SET_COMBAT_SPEED', speed }),
  togglePause: (): Command =>
    ({ type: 'TOGGLE_PAUSE' }),
  // ... etc
};
```

### InputSystem

Translates commands into component changes:

```typescript
// ecs/systems/input.ts
import { commandQueue } from '../commands';
import { playerQuery, gameStateQuery } from '../queries';
import { getPowerData } from '@/data/powers';
import { BLOCK_MANA_COST } from '@/constants/balance';
import { getTick } from '../loop';

export function InputSystem(_deltaMs: number): void {
  const commands = commandQueue.splice(0);
  const player = playerQuery.first;
  const gameState = gameStateQuery.first;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'ACTIVATE_POWER': {
        if (!player) break;

        const power = getPowerData(cmd.powerId);
        const cooldown = player.cooldowns?.get(cmd.powerId);

        // Validate
        if (cooldown && cooldown.remaining > 0) break;
        if (player.mana!.current < power.manaCost) break;

        // Mark as casting
        player.casting = {
          powerId: cmd.powerId,
          startedAtTick: getTick(),
        };
        break;
      }

      case 'BLOCK': {
        if (!player) break;
        if (player.mana!.current < BLOCK_MANA_COST) break;

        player.blocking = { reduction: 0.4 };
        player.mana!.current -= BLOCK_MANA_COST;
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

      // ... handle other commands
    }
  }
}
```

---

## React Integration

### Bridge Hook

```typescript
// bridge/useGameEngine.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { world } from '@/ecs/world';
import { startLoop, stopLoop } from '@/ecs/loop';
import { dispatch, Command } from '@/ecs/commands';
import { createSnapshot, GameSnapshot } from './snapshot';
import { initializeGame } from '@/ecs/world';

interface GameEngine {
  snapshot: GameSnapshot | null;
  dispatch: (command: Command) => void;
  start: (classId: string) => void;
  stop: () => void;
}

export function useGameEngine(): GameEngine {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const startedRef = useRef(false);

  const handleTick = useCallback(() => {
    setSnapshot(createSnapshot(world));
  }, []);

  const start = useCallback((classId: string) => {
    if (startedRef.current) return;
    startedRef.current = true;

    initializeGame(world, classId);
    startLoop(handleTick);
  }, [handleTick]);

  const stop = useCallback(() => {
    stopLoop();
    startedRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      stopLoop();
    };
  }, []);

  return {
    snapshot,
    dispatch,
    start,
    stop,
  };
}
```

### Context Provider

```typescript
// bridge/context.tsx
import { createContext, useContext, ReactNode } from 'react';
import { useGameEngine } from './useGameEngine';
import { GameSnapshot } from './snapshot';
import { Command } from '@/ecs/commands';

interface GameContextValue {
  snapshot: GameSnapshot | null;
  dispatch: (command: Command) => void;
  start: (classId: string) => void;
  stop: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const engine = useGameEngine();

  return (
    <GameContext.Provider value={engine}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
```

### Snapshot Creation

Transform ECS state into React-friendly structure:

```typescript
// bridge/snapshot.ts
import { World } from 'miniplex';
import { Entity } from '@/ecs/components';
import { playerQuery, activeEnemyQuery, gameStateQuery } from '@/ecs/queries';

export interface GameSnapshot {
  tick: number;
  phase: GamePhase;
  isPaused: boolean;
  combatSpeed: 1 | 2 | 3;

  floor: {
    number: number;
    room: number;
    totalRooms: number;
    isBossFloor: boolean;
  };

  player: PlayerSnapshot;
  enemy: EnemySnapshot | null;

  pendingAnimations: AnimationEventSnapshot[];
  combatLog: string[];
  popups: PopupState;
  pendingRewards: Reward[] | null;
}

export function createSnapshot(world: World<Entity>): GameSnapshot {
  const player = playerQuery.first!;
  const enemy = activeEnemyQuery.first;
  const gameState = gameStateQuery.first!;

  return {
    tick: getTick(),
    phase: gameState.phase!,
    isPaused: gameState.paused ?? false,
    combatSpeed: gameState.combatSpeed?.multiplier ?? 1,

    floor: {
      number: gameState.floor!.number,
      room: gameState.floor!.room,
      totalRooms: gameState.floor!.totalRooms,
      isBossFloor: gameState.floor!.number % 10 === 0,
    },

    player: createPlayerSnapshot(player),
    enemy: enemy ? createEnemySnapshot(enemy) : null,

    pendingAnimations: gameState.animationEvents ?? [],
    combatLog: [], // TODO: implement combat log
    popups: gameState.popups ?? {},
    pendingRewards: gameState.pendingRewards ?? null,
  };
}
```

### Stateless React Components

Components become pure renderers:

```typescript
// components/game/PlayerStatsPanel.tsx
import { useGame } from '@/bridge/context';

export function PlayerStatsPanel() {
  const { snapshot } = useGame();
  if (!snapshot) return null;

  const { player } = snapshot;

  return (
    <div className="stats-panel">
      <HealthBar
        current={player.health.current}
        max={player.health.max}
      />
      <ManaBar
        current={player.mana.current}
        max={player.mana.max}
      />
      <StatGrid stats={player.stats} />
    </div>
  );
}

// components/game/PowerButton.tsx
import { memo } from 'react';
import { useGame } from '@/bridge/context';
import { Commands } from '@/ecs/commands';

export const PowerButton = memo(function PowerButton({
  power
}: {
  power: PowerSnapshot
}) {
  const { dispatch } = useGame();

  return (
    <button
      onClick={() => dispatch(Commands.activatePower(power.id))}
      disabled={power.onCooldown || power.insufficientMana}
    >
      {power.name}
    </button>
  );
});
```

---

## Key System Implementations

### DeathSystem (Eliminates Race Conditions)

```typescript
// ecs/systems/death.ts
import { world } from '../world';
import { attackersQuery, gameStateQuery } from '../queries';
import { getTick } from '../loop';
import { DEATH_ANIMATION_MS } from '@/constants/animation';

export function DeathSystem(_deltaMs: number): void {
  // Check all entities with health
  for (const entity of world.with('health').without('dying')) {
    if (entity.health!.current <= 0) {
      // Mark as dying
      entity.dying = {
        startedAtTick: getTick(),
        duration: DEATH_ANIMATION_MS,
      };

      // Queue death animation
      const gameState = gameStateQuery.first!;
      gameState.animationEvents = gameState.animationEvents ?? [];
      gameState.animationEvents.push({
        id: `death-${getTick()}`,
        type: 'death',
        payload: { isPlayer: !!entity.player },
        createdAtTick: getTick(),
        displayUntilTick: getTick() + Math.ceil(DEATH_ANIMATION_MS / 16),
      });

      if (entity.player) {
        // Player death - schedule defeat transition
        scheduleTransition('defeat', DEATH_ANIMATION_MS);
      } else if (entity.enemy) {
        // Enemy death - process rewards
        processEnemyDeath(entity);
      }
    }
  }

  // Clean up entities that finished dying
  for (const entity of world.with('dying')) {
    const elapsed = (getTick() - entity.dying!.startedAtTick) * 16;
    if (elapsed >= entity.dying!.duration) {
      if (!entity.player) {
        world.remove(entity);
      }
    }
  }
}
```

### CombatSystem

```typescript
// ecs/systems/combat.ts
import { world } from '../world';
import { playerQuery, activeEnemyQuery, gameStateQuery } from '../queries';
import { getTick } from '../loop';

export function CombatSystem(_deltaMs: number): void {
  // Process all entities ready to attack
  for (const entity of world.with('attackReady')) {
    const target = getTarget(entity);
    if (!target || target.dying) {
      delete entity.attackReady;
      continue;
    }

    const attackData = entity.attackReady!;
    let damage = attackData.damage;

    // Apply defense
    damage -= target.defense?.value ?? 0;
    damage = Math.max(1, damage);

    // Check for block
    if (target.blocking) {
      damage = Math.floor(damage * (1 - target.blocking.reduction));
      delete target.blocking;
    }

    // Apply damage
    target.health!.current = Math.max(0, target.health!.current - damage);

    // Queue animation
    queueDamageAnimation(entity, target, damage, attackData.isCrit);

    // Process item effects for player attacks
    if (entity.player) {
      processItemEffects('on_hit', { target, damage });
      if (attackData.isCrit) {
        processItemEffects('on_crit', { target, damage });
      }
    }

    // Clear attack ready
    delete entity.attackReady;
  }
}

function getTarget(attacker: Entity): Entity | undefined {
  if (attacker.player) {
    return activeEnemyQuery.first;
  } else {
    return playerQuery.first;
  }
}
```

---

## Testing Strategy

### Unit Testing Systems

Systems are pure functions—easy to test:

```typescript
// ecs/systems/__tests__/death.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { DeathSystem } from '../death';

describe('DeathSystem', () => {
  beforeEach(() => {
    world.clear();
  });

  it('marks entity as dying when health reaches zero', () => {
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin' },
      health: { current: 0, max: 50 },
    });

    DeathSystem(16);

    expect(enemy.dying).toBeDefined();
  });

  it('does not double-process already dying entities', () => {
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin' },
      health: { current: 0, max: 50 },
      dying: { startedAtTick: 0, duration: 500 },
    });

    const animEventsBefore = gameStateQuery.first?.animationEvents?.length ?? 0;

    DeathSystem(16);

    const animEventsAfter = gameStateQuery.first?.animationEvents?.length ?? 0;
    expect(animEventsAfter).toBe(animEventsBefore); // No new death event
  });
});
```

### Integration Testing

Test multiple systems together:

```typescript
// ecs/__tests__/combat-integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world, initializeGame } from '../world';
import { runSystems } from '../systems';

describe('Combat Integration', () => {
  beforeEach(() => {
    world.clear();
    initializeGame(world, 'warrior');
  });

  it('player attack kills enemy and processes death exactly once', () => {
    const enemy = world.with('enemy').first!;
    enemy.health!.current = 5; // Low health

    const player = world.with('player').first!;
    player.speed!.accumulated = player.speed!.attackInterval; // Ready to attack

    runSystems(16);

    expect(enemy.dying).toBeDefined();
    expect(enemy.health!.current).toBe(0);

    // Only one death animation
    const gameState = world.with('gameState').first!;
    const deathEvents = gameState.animationEvents?.filter(e => e.type === 'death');
    expect(deathEvents?.length).toBe(1);
  });
});
```

---

## Migration Plan

### Phase 1: Core Infrastructure
- [ ] Install miniplex: `npm install miniplex @miniplex/react`
- [ ] Create `ecs/components.ts` with Entity type
- [ ] Create `ecs/world.ts` with world instance and queries
- [ ] Create `ecs/loop.ts` with fixed-timestep loop
- [ ] Create `ecs/commands.ts` with command types
- [ ] Write unit tests for loop timing

### Phase 2: Combat Systems
- [ ] Create `ecs/systems/input.ts`
- [ ] Create `ecs/systems/cooldown.ts`
- [ ] Create `ecs/systems/attack-timing.ts`
- [ ] Create `ecs/systems/combat.ts`
- [ ] Create `ecs/systems/status-effect.ts`
- [ ] Create `ecs/systems/regen.ts`
- [ ] Create `ecs/systems/death.ts`
- [ ] Write integration tests for combat flow

### Phase 3: Progression Systems
- [ ] Create `ecs/systems/progression.ts`
- [ ] Create `ecs/systems/flow.ts`
- [ ] Create `ecs/systems/power.ts`
- [ ] Create `ecs/systems/item-effect.ts`
- [ ] Create `ecs/systems/path-ability.ts`

### Phase 4: React Bridge
- [ ] Create `bridge/snapshot.ts`
- [ ] Create `bridge/useGameEngine.ts`
- [ ] Create `bridge/context.tsx`
- [ ] Create `bridge/commands.ts`

### Phase 5: Component Migration
- [ ] Update `Game.tsx` to use GameProvider
- [ ] Migrate `BattleArena.tsx` to use snapshot
- [ ] Migrate `PlayerStatsPanel.tsx`
- [ ] Migrate `PowersPanel.tsx`
- [ ] Migrate `CombatHeader.tsx`
- [ ] Migrate all popup components
- [ ] Migrate remaining game components

### Phase 6: Cleanup
- [ ] Remove old hooks (useCombatLoop, useCombatTimers, etc.)
- [ ] Remove CombatContext
- [ ] Remove useGameState
- [ ] Update tests
- [ ] Performance profiling

---

## Files to Delete After Migration

```
src/hooks/
├── useCombatLoop.ts
├── useCombatTimers.ts
├── useEventQueue.ts
├── useCombatActions.ts
├── usePowerActions.ts
├── useRewardCalculation.ts
├── useItemEffects.ts
├── useRoomTransitions.ts
├── useGameFlow.ts
├── usePathActions.ts
├── usePathAbilities.ts
├── usePauseControl.ts
├── useCharacterSetup.ts
├── useItemActions.ts
└── useGameState.ts

src/contexts/
└── CombatContext.tsx
```

---

## Success Criteria

1. **All existing game behavior preserved** - Play through floors 1-10, all classes
2. **No race conditions** - Death tests pass, no double-death bugs
3. **Timing feels identical** - Attack speeds, cooldowns, regen unchanged
4. **Performance acceptable** - 60fps maintained
5. **Tests pass** - Full test suite green
6. **Old code removed** - No dead hooks or contexts

---

## Dependencies

```json
{
  "dependencies": {
    "miniplex": "^2.0.0",
    "@miniplex/react": "^2.0.0"
  }
}
```

---

## References

- [miniplex documentation](https://github.com/hmans/miniplex)
- [ECS pattern overview](https://en.wikipedia.org/wiki/Entity_component_system)
- [Fixed timestep game loops](https://gafferongames.com/post/fix_your_timestep/)
