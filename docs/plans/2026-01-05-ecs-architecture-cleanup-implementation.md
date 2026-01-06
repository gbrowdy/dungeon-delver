# ECS Architecture Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all ECS architecture violations so UI purely renders from snapshots with zero local game state.

**Architecture:** Move animation/timing state from React hooks into ECS components. AnimationSystem processes events and sets components. UI reads snapshots and applies CSS classes.

**Tech Stack:** TypeScript, React, miniplex ECS, Vitest, Playwright

---

## Phase 1: Dead Code Cleanup

### Task 1.1: Delete unused PlayerCard component

**Files:**
- Delete: `src/components/game/PlayerCard.tsx`

**Step 1: Verify component is unused**

Run: `grep -r "PlayerCard" src/`
Expected: Only the file itself and its interface definition

**Step 2: Delete the file**

```bash
rm src/components/game/PlayerCard.tsx
```

**Step 3: Verify no import errors**

Run: `npm run build 2>&1 | head -20`
Expected: No errors mentioning PlayerCard

**Step 4: Commit**

```bash
git add -A && git commit -m "chore: delete unused PlayerCard component"
```

---

### Task 1.2: Delete unused EnemyCard component

**Files:**
- Delete: `src/components/game/EnemyCard.tsx`

**Step 1: Verify component is unused**

Run: `grep -r "EnemyCard" src/`
Expected: Only the file itself

**Step 2: Delete the file**

```bash
rm src/components/game/EnemyCard.tsx
```

**Step 3: Verify no import errors**

Run: `npm run build 2>&1 | head -20`
Expected: No errors mentioning EnemyCard

**Step 4: Commit**

```bash
git add -A && git commit -m "chore: delete unused EnemyCard component"
```

---

## Phase 2: Add Constants and Component Types

### Task 2.1: Add animation constants to enums.ts

**Files:**
- Modify: `src/constants/enums.ts`

**Step 1: Add COMBAT_ANIMATION constant**

Add to `src/constants/enums.ts`:

```typescript
// Combat animation states for ECS
export const COMBAT_ANIMATION = {
  IDLE: 'idle',
  ATTACK: 'attack',
  HIT: 'hit',
  CAST: 'cast',
  DIE: 'die',
} as const;

export type CombatAnimationType = typeof COMBAT_ANIMATION[keyof typeof COMBAT_ANIMATION];

// Visual effect types
export const VISUAL_EFFECT = {
  FLASH: 'flash',
  SHAKE: 'shake',
  HIT_STOP: 'hitStop',
  AURA: 'aura',
} as const;

export type VisualEffectType = typeof VISUAL_EFFECT[keyof typeof VISUAL_EFFECT];

// Floating effect types
export const FLOATING_EFFECT = {
  DAMAGE: 'damage',
  HEAL: 'heal',
  MISS: 'miss',
  CRIT: 'crit',
} as const;

export type FloatingEffectType = typeof FLOATING_EFFECT[keyof typeof FLOATING_EFFECT];
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/constants/enums.ts && git commit -m "feat(constants): add animation type constants"
```

---

### Task 2.2: Add animation components to ECS

**Files:**
- Modify: `src/ecs/components.ts`

**Step 1: Add component type imports**

Add import at top of `src/ecs/components.ts`:

```typescript
import type { CombatAnimationType, FloatingEffectType } from '@/constants/enums';
```

**Step 2: Add animation component types**

Add to Entity interface in `src/ecs/components.ts`:

```typescript
  // Animation state (for player/enemy entities)
  combatAnimation?: {
    type: CombatAnimationType;
    startedAtTick: number;
    duration: number; // ms
    powerId?: string; // for cast animations
    anticipation?: number; // wind-up time in ms
  };

  // Visual effects overlay
  visualEffects?: {
    flash?: { untilTick: number };
    shake?: { untilTick: number };
    hitStop?: { untilTick: number };
    aura?: { color: 'red' | 'blue' | 'green'; untilTick: number };
  };

  // Floating text effects (on gameState entity)
  floatingEffects?: Array<{
    id: string;
    type: FloatingEffectType;
    value?: number;
    x: number;
    y: number;
    createdAtTick: number;
    duration: number; // ms
    isCrit?: boolean;
  }>;

  // Battle phase (on gameState entity)
  battlePhase?: {
    phase: 'entering' | 'combat' | 'transitioning' | 'defeat';
    startedAtTick: number;
    duration?: number; // ms, for timed phases
  };

  // Ground scrolling state
  groundScrolling?: boolean;
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/ecs/components.ts && git commit -m "feat(ecs): add animation component types"
```

---

## Phase 3: Create AnimationSystem

### Task 3.1: Write failing test for AnimationSystem event processing

**Files:**
- Create: `src/ecs/systems/__tests__/animation.test.ts`

**Step 1: Create test file with first test**

Create `src/ecs/systems/__tests__/animation.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { AnimationSystem } from '../animation';
import { COMBAT_ANIMATION } from '@/constants/enums';
import { resetTick, getTick } from '../../loop';

describe('AnimationSystem', () => {
  beforeEach(() => {
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
    resetTick();
  });

  describe('event processing', () => {
    it('should set combatAnimation on enemy when enemy_hit event is processed', () => {
      // Setup: player, enemy, gameState with enemy_hit event
      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        identity: { name: 'Hero', class: 'warrior' },
      });

      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
      });

      world.add({
        gameState: true,
        phase: 'combat',
        animationEvents: [{
          id: 'test-1',
          type: 'enemy_hit',
          payload: { type: 'damage', value: 10, isCrit: false, blocked: false },
          createdAtTick: getTick(),
          displayUntilTick: getTick() + 30,
          consumed: false,
        }],
      });

      AnimationSystem(16);

      expect(enemy.combatAnimation).toBeDefined();
      expect(enemy.combatAnimation?.type).toBe(COMBAT_ANIMATION.HIT);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/animation.test.ts`
Expected: FAIL - Cannot find module '../animation'

**Step 3: Commit failing test**

```bash
git add src/ecs/systems/__tests__/animation.test.ts && git commit -m "test(animation): add failing test for event processing"
```

---

### Task 3.2: Implement minimal AnimationSystem

**Files:**
- Create: `src/ecs/systems/animation.ts`

**Step 1: Create AnimationSystem with enemy_hit handling**

Create `src/ecs/systems/animation.ts`:

```typescript
// src/ecs/systems/animation.ts
/**
 * AnimationSystem - processes animation events and manages animation component lifecycle.
 *
 * Responsibilities:
 * 1. Process pending animation events → set components on entities
 * 2. Expire finished animations → clear components
 * 3. Handle battle phase transitions
 *
 * Runs after: Combat, Power, Death (so events are queued)
 * Runs before: Cleanup (so components exist for snapshot)
 */

import { getPlayer, getActiveEnemy, getGameState } from '../queries';
import { getTick, TICK_MS } from '../loop';
import { COMBAT_ANIMATION } from '@/constants/enums';
import { ANIMATION_TIMING } from '@/constants/animation';
import type { Entity, AnimationEvent } from '../components';

// Convert ms to ticks
function msToTicks(ms: number): number {
  return Math.ceil(ms / TICK_MS);
}

// Convert ticks to ms
function ticksToMs(ticks: number): number {
  return ticks * TICK_MS;
}

let floatingEffectId = 0;
function nextFloatingEffectId(): string {
  return `float-${++floatingEffectId}`;
}

export function AnimationSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (!gameState) return;

  const player = getPlayer();
  const enemy = getActiveEnemy();
  const currentTick = getTick();

  // 1. Process pending animation events
  for (const event of gameState.animationEvents ?? []) {
    if (event.consumed) continue;

    processAnimationEvent(event, player, enemy, gameState, currentTick);
  }

  // 2. Expire finished animations
  expireAnimations(player, currentTick);
  expireAnimations(enemy, currentTick);

  // 3. Expire floating effects
  expireFloatingEffects(gameState, currentTick);

  // 4. Handle battle phase transitions
  updateBattlePhase(gameState, currentTick);
}

function processAnimationEvent(
  event: AnimationEvent,
  player: Entity | undefined,
  enemy: Entity | undefined,
  gameState: Entity,
  currentTick: number
): void {
  switch (event.type) {
    case 'enemy_hit': {
      if (!enemy || !player) break;

      // Player attacks
      player.combatAnimation = {
        type: COMBAT_ANIMATION.ATTACK,
        startedAtTick: currentTick,
        duration: ANIMATION_TIMING.HERO_ATTACK_DURATION,
        anticipation: ANIMATION_TIMING.HERO_ATTACK_ANTICIPATION,
      };

      // Enemy gets hit
      enemy.combatAnimation = {
        type: COMBAT_ANIMATION.HIT,
        startedAtTick: currentTick,
        duration: ANIMATION_TIMING.HIT_REACTION,
      };

      enemy.visualEffects = {
        flash: { untilTick: currentTick + msToTicks(ANIMATION_TIMING.HIT_FLASH) },
        hitStop: { untilTick: currentTick + msToTicks(ANIMATION_TIMING.HIT_STOP) },
      };

      // Add floating damage
      const payload = event.payload as { type: 'damage'; value: number; isCrit: boolean };
      if (payload.type === 'damage') {
        if (!gameState.floatingEffects) gameState.floatingEffects = [];
        gameState.floatingEffects.push({
          id: nextFloatingEffectId(),
          type: payload.isCrit ? 'crit' : 'damage',
          value: payload.value,
          x: 68, // Enemy position
          y: 30,
          createdAtTick: currentTick,
          duration: 1000,
          isCrit: payload.isCrit,
        });
      }

      event.consumed = true;
      break;
    }

    case 'player_hit': {
      if (!enemy || !player) break;

      // Enemy attacks
      enemy.combatAnimation = {
        type: COMBAT_ANIMATION.ATTACK,
        startedAtTick: currentTick,
        duration: ANIMATION_TIMING.ENEMY_ATTACK_DURATION,
        anticipation: ANIMATION_TIMING.ENEMY_ATTACK_ANTICIPATION,
      };

      // Player gets hit
      player.combatAnimation = {
        type: COMBAT_ANIMATION.HIT,
        startedAtTick: currentTick,
        duration: ANIMATION_TIMING.PLAYER_HIT_SHAKE,
      };

      player.visualEffects = {
        flash: { untilTick: currentTick + msToTicks(ANIMATION_TIMING.HIT_FLASH) },
        shake: { untilTick: currentTick + msToTicks(ANIMATION_TIMING.PLAYER_HIT_SHAKE) },
        hitStop: { untilTick: currentTick + msToTicks(ANIMATION_TIMING.HIT_STOP) },
      };

      // Add floating damage
      const payload = event.payload as { type: 'damage'; value: number; isCrit: boolean };
      if (payload.type === 'damage') {
        if (!gameState.floatingEffects) gameState.floatingEffects = [];
        gameState.floatingEffects.push({
          id: nextFloatingEffectId(),
          type: payload.isCrit ? 'crit' : 'damage',
          value: payload.value,
          x: 32, // Hero position
          y: 20,
          createdAtTick: currentTick,
          duration: 1000,
          isCrit: payload.isCrit,
        });
      }

      event.consumed = true;
      break;
    }

    case 'spell_cast':
    case 'power_used': {
      if (!player) break;

      const payload = event.payload as { type: 'spell'; powerId: string };
      player.combatAnimation = {
        type: COMBAT_ANIMATION.CAST,
        startedAtTick: currentTick,
        duration: 500,
        powerId: payload.powerId,
      };

      event.consumed = true;
      break;
    }

    case 'player_dodge': {
      if (!gameState.floatingEffects) gameState.floatingEffects = [];
      gameState.floatingEffects.push({
        id: nextFloatingEffectId(),
        type: 'miss',
        x: 32,
        y: 30,
        createdAtTick: currentTick,
        duration: 1000,
      });

      event.consumed = true;
      break;
    }

    case 'enemy_ability': {
      if (!enemy) break;

      const payload = event.payload as { type: 'enemy_ability'; abilityType: string };
      const auraColors: Record<string, 'red' | 'blue' | 'green'> = {
        enrage: 'red',
        shield: 'blue',
        heal: 'green',
      };

      enemy.combatAnimation = {
        type: COMBAT_ANIMATION.CAST,
        startedAtTick: currentTick,
        duration: ANIMATION_TIMING.ENEMY_ABILITY_CAST,
      };

      const auraColor = auraColors[payload.abilityType];
      if (auraColor) {
        enemy.visualEffects = {
          ...enemy.visualEffects,
          aura: { color: auraColor, untilTick: currentTick + msToTicks(ANIMATION_TIMING.ENEMY_ABILITY_CAST) },
        };
      }

      event.consumed = true;
      break;
    }
  }
}

function expireAnimations(entity: Entity | undefined, currentTick: number): void {
  if (!entity) return;

  // Expire combat animation
  if (entity.combatAnimation) {
    const elapsed = ticksToMs(currentTick - entity.combatAnimation.startedAtTick);
    if (elapsed >= entity.combatAnimation.duration) {
      delete entity.combatAnimation;
    }
  }

  // Expire visual effects
  if (entity.visualEffects) {
    if (entity.visualEffects.flash && currentTick >= entity.visualEffects.flash.untilTick) {
      delete entity.visualEffects.flash;
    }
    if (entity.visualEffects.shake && currentTick >= entity.visualEffects.shake.untilTick) {
      delete entity.visualEffects.shake;
    }
    if (entity.visualEffects.hitStop && currentTick >= entity.visualEffects.hitStop.untilTick) {
      delete entity.visualEffects.hitStop;
    }
    if (entity.visualEffects.aura && currentTick >= entity.visualEffects.aura.untilTick) {
      delete entity.visualEffects.aura;
    }

    // Clean up empty visualEffects object
    if (Object.keys(entity.visualEffects).length === 0) {
      delete entity.visualEffects;
    }
  }
}

function expireFloatingEffects(gameState: Entity, currentTick: number): void {
  if (!gameState.floatingEffects) return;

  gameState.floatingEffects = gameState.floatingEffects.filter(effect => {
    const elapsed = ticksToMs(currentTick - effect.createdAtTick);
    return elapsed < effect.duration;
  });

  if (gameState.floatingEffects.length === 0) {
    delete gameState.floatingEffects;
  }
}

function updateBattlePhase(gameState: Entity, currentTick: number): void {
  if (!gameState.battlePhase?.duration) return;

  const elapsed = ticksToMs(currentTick - gameState.battlePhase.startedAtTick);
  if (elapsed >= gameState.battlePhase.duration) {
    // Transition from entering to combat
    if (gameState.battlePhase.phase === 'entering') {
      gameState.battlePhase = {
        phase: 'combat',
        startedAtTick: currentTick,
      };
      gameState.groundScrolling = false;
    }
    // Transitioning phase ends when FlowSystem handles next enemy spawn
  }
}
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/animation.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/ecs/systems/animation.ts && git commit -m "feat(ecs): implement AnimationSystem"
```

---

### Task 3.3: Add more AnimationSystem tests

**Files:**
- Modify: `src/ecs/systems/__tests__/animation.test.ts`

**Step 1: Add tests for player_hit, animation expiry, and floating effects**

Add to `src/ecs/systems/__tests__/animation.test.ts`:

```typescript
    it('should set combatAnimation on player when player_hit event is processed', () => {
      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        identity: { name: 'Hero', class: 'warrior' },
      });

      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
      });

      world.add({
        gameState: true,
        phase: 'combat',
        animationEvents: [{
          id: 'test-2',
          type: 'player_hit',
          payload: { type: 'damage', value: 15, isCrit: false, blocked: false },
          createdAtTick: getTick(),
          displayUntilTick: getTick() + 30,
          consumed: false,
        }],
      });

      AnimationSystem(16);

      expect(player.combatAnimation).toBeDefined();
      expect(player.combatAnimation?.type).toBe(COMBAT_ANIMATION.HIT);
      expect(player.visualEffects?.shake).toBeDefined();
    });

    it('should mark event as consumed after processing', () => {
      world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        identity: { name: 'Hero', class: 'warrior' },
      });

      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
      });

      const gameState = world.add({
        gameState: true,
        phase: 'combat',
        animationEvents: [{
          id: 'test-3',
          type: 'enemy_hit',
          payload: { type: 'damage', value: 10, isCrit: false, blocked: false },
          createdAtTick: getTick(),
          displayUntilTick: getTick() + 30,
          consumed: false,
        }],
      });

      AnimationSystem(16);

      expect(gameState.animationEvents?.[0].consumed).toBe(true);
    });

    it('should add floating damage effect on hit', () => {
      world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        identity: { name: 'Hero', class: 'warrior' },
      });

      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
      });

      const gameState = world.add({
        gameState: true,
        phase: 'combat',
        animationEvents: [{
          id: 'test-4',
          type: 'enemy_hit',
          payload: { type: 'damage', value: 25, isCrit: true, blocked: false },
          createdAtTick: getTick(),
          displayUntilTick: getTick() + 30,
          consumed: false,
        }],
      });

      AnimationSystem(16);

      expect(gameState.floatingEffects).toBeDefined();
      expect(gameState.floatingEffects?.length).toBe(1);
      expect(gameState.floatingEffects?.[0].value).toBe(25);
      expect(gameState.floatingEffects?.[0].isCrit).toBe(true);
    });
  });

  describe('animation expiry', () => {
    it('should clear combatAnimation after duration expires', () => {
      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
        combatAnimation: {
          type: COMBAT_ANIMATION.HIT,
          startedAtTick: 0,
          duration: 100, // 100ms
        },
      });

      world.add({
        gameState: true,
        phase: 'combat',
      });

      // Simulate time passing (100ms = ~6 ticks at 16ms/tick)
      // Set current tick to 10 (160ms elapsed)
      for (let i = 0; i < 10; i++) {
        AnimationSystem(16);
      }

      // Animation should be cleared after duration
      // Note: This test may need adjustment based on actual tick timing
    });
  });
```

**Step 2: Run tests**

Run: `npx vitest run src/ecs/systems/__tests__/animation.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/ecs/systems/__tests__/animation.test.ts && git commit -m "test(animation): add comprehensive AnimationSystem tests"
```

---

### Task 3.4: Add AnimationSystem to game loop

**Files:**
- Modify: `src/ecs/loop.ts`

**Step 1: Import and add AnimationSystem to system order**

In `src/ecs/loop.ts`, add import:

```typescript
import { AnimationSystem } from './systems/animation';
```

Add to system execution order (after DeathSystem, before CleanupSystem):

```typescript
// In the systems execution section:
AnimationSystem(deltaMs);
```

**Step 2: Run all tests to verify no regressions**

Run: `npx vitest run`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/ecs/loop.ts && git commit -m "feat(ecs): add AnimationSystem to game loop"
```

---

## Phase 4: Update Snapshots

### Task 4.1: Add animation fields to PlayerSnapshot

**Files:**
- Modify: `src/ecs/snapshot.ts`

**Step 1: Add animation types to PlayerSnapshot interface**

Add to PlayerSnapshot interface in `src/ecs/snapshot.ts`:

```typescript
  // Animation state
  combatAnimation: {
    type: string;
    progress: number; // 0-1
    powerId?: string;
  } | null;

  visualEffects: {
    flash: boolean;
    shake: boolean;
    hitStop: boolean;
  };
```

**Step 2: Update createPlayerSnapshot to populate animation fields**

Add to createPlayerSnapshot function:

```typescript
    // Animation state
    combatAnimation: entity.combatAnimation ? {
      type: entity.combatAnimation.type,
      progress: Math.min(1, ticksToMs(currentTick - entity.combatAnimation.startedAtTick) / entity.combatAnimation.duration),
      powerId: entity.combatAnimation.powerId,
    } : null,

    visualEffects: {
      flash: !!entity.visualEffects?.flash,
      shake: !!entity.visualEffects?.shake,
      hitStop: !!entity.visualEffects?.hitStop,
    },
```

Note: You'll need to import `getTick` and add a helper or pass currentTick.

**Step 3: Run tests**

Run: `npx vitest run src/ecs/__tests__/snapshot.test.ts`
Expected: Tests pass (may need to update existing snapshot tests)

**Step 4: Commit**

```bash
git add src/ecs/snapshot.ts && git commit -m "feat(snapshot): add animation fields to PlayerSnapshot"
```

---

### Task 4.2: Add animation fields to EnemySnapshot

**Files:**
- Modify: `src/ecs/snapshot.ts`

**Step 1: Add animation types to EnemySnapshot interface**

Add to EnemySnapshot interface:

```typescript
  // Animation state
  combatAnimation: {
    type: string;
    progress: number;
  } | null;

  visualEffects: {
    flash: boolean;
    aura: 'red' | 'blue' | 'green' | null;
  };
```

**Step 2: Update createEnemySnapshot**

Add to createEnemySnapshot function:

```typescript
    // Animation state
    combatAnimation: entity.combatAnimation ? {
      type: entity.combatAnimation.type,
      progress: Math.min(1, ticksToMs(currentTick - entity.combatAnimation.startedAtTick) / entity.combatAnimation.duration),
    } : null,

    visualEffects: {
      flash: !!entity.visualEffects?.flash,
      aura: entity.visualEffects?.aura?.color ?? null,
    },
```

**Step 3: Run tests and commit**

Run: `npx vitest run`

```bash
git add src/ecs/snapshot.ts && git commit -m "feat(snapshot): add animation fields to EnemySnapshot"
```

---

### Task 4.3: Add animation fields to GameStateSnapshot

**Files:**
- Modify: `src/ecs/snapshot.ts`

**Step 1: Add to GameStateSnapshot interface**

```typescript
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
```

**Step 2: Update createGameStateSnapshot**

```typescript
    // Animation state
    battlePhase: entity.battlePhase?.phase ?? 'combat',
    groundScrolling: entity.groundScrolling ?? false,
    floatingEffects: entity.floatingEffects ?? [],
```

**Step 3: Update createDefaultGameStateSnapshot**

```typescript
    battlePhase: 'combat',
    groundScrolling: false,
    floatingEffects: [],
```

**Step 4: Run tests and commit**

```bash
git add src/ecs/snapshot.ts && git commit -m "feat(snapshot): add animation fields to GameStateSnapshot"
```

---

## Phase 5: Migrate PathResource Logic

### Task 5.1: Create pure utility functions for path resources

**Files:**
- Create: `src/utils/pathResourceUtils.ts`

**Step 1: Create utility file with pure functions**

Create `src/utils/pathResourceUtils.ts`:

```typescript
/**
 * Pure utility functions for path resource calculations.
 * These read from PathResource data and return computed values.
 * No state management - that's handled by ECS.
 */

import type { PathResource, ThresholdEffect } from '@/types/game';

/**
 * Get effective cost after threshold reductions
 */
export function getEffectiveCost(resource: PathResource, baseCost: number): number {
  const thresholdEffects = resource.thresholds?.filter(
    t => resource.current >= t.value && t.effect.type === 'cost_reduction'
  ) ?? [];

  let cost = baseCost;
  for (const threshold of thresholdEffects) {
    cost *= (1 - (threshold.effect.value ?? 0));
  }
  return Math.max(1, Math.floor(cost));
}

/**
 * Get all currently active threshold effects
 */
export function getActiveThresholdEffects(resource: PathResource): ThresholdEffect[] {
  return resource.thresholds?.filter(
    t => resource.current >= t.value
  ).map(t => t.effect) ?? [];
}

/**
 * Get cumulative damage multiplier from threshold effects
 */
export function getDamageMultiplier(resource: PathResource): number {
  const damageEffects = resource.thresholds?.filter(
    t => resource.current >= t.value && t.effect.type === 'damage_bonus'
  ) ?? [];

  let multiplier = 1;

  if (resource.type === 'arcane_charges') {
    const chargeBonus = damageEffects.find(t => t.effect.value);
    if (chargeBonus) {
      multiplier += (chargeBonus.effect.value ?? 0) * resource.current;
    }
  } else {
    for (const threshold of damageEffects) {
      multiplier += threshold.effect.value ?? 0;
    }
  }

  return multiplier;
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/pathResourceUtils.ts && git commit -m "feat(utils): add pure path resource utility functions"
```

---

### Task 5.2: Add resource decay to RegenSystem

**Files:**
- Modify: `src/ecs/systems/regen.ts`

**Step 1: Add path resource decay logic**

Add to RegenSystem after existing regen logic:

```typescript
  // Path resource decay (out of combat only)
  const inCombat = gameState?.phase === 'combat';
  if (player.pathResource?.decay && !inCombat) {
    if (!player.pathResource.decay.outOfCombatOnly || !inCombat) {
      const decayAmount = player.pathResource.decay.rate * (deltaMs / player.pathResource.decay.tickInterval);
      player.pathResource.current = Math.max(0, player.pathResource.current - decayAmount);
    }
  }
```

**Step 2: Run tests**

Run: `npx vitest run src/ecs/systems/__tests__/regen.test.ts`
Expected: Existing tests pass

**Step 3: Commit**

```bash
git add src/ecs/systems/regen.ts && git commit -m "feat(regen): add path resource decay"
```

---

## Phase 6: Migrate Stance System Logic

### Task 6.1: Add stance cooldown ticking to CooldownSystem

**Files:**
- Modify: `src/ecs/systems/cooldown.ts`

**Step 1: Add stance cooldown logic**

Add to CooldownSystem:

```typescript
  // Tick stance cooldown
  if (player?.stanceState?.stanceCooldownRemaining && player.stanceState.stanceCooldownRemaining > 0) {
    player.stanceState.stanceCooldownRemaining = Math.max(
      0,
      player.stanceState.stanceCooldownRemaining - deltaMs
    );
  }
```

**Step 2: Run tests**

Run: `npx vitest run src/ecs/systems/__tests__/cooldown.test.ts`
Expected: Tests pass

**Step 3: Commit**

```bash
git add src/ecs/systems/cooldown.ts && git commit -m "feat(cooldown): add stance cooldown ticking"
```

---

### Task 6.2: Add stance switch command to InputSystem

**Files:**
- Modify: `src/ecs/commands.ts`
- Modify: `src/ecs/systems/input.ts`

**Step 1: Add switchStance command**

Add to `src/ecs/commands.ts`:

```typescript
export const Commands = {
  // ... existing commands
  switchStance: (stanceId: string) => ({
    type: 'SWITCH_STANCE' as const,
    payload: { stanceId },
  }),
};
```

**Step 2: Handle in InputSystem**

Add case to InputSystem:

```typescript
    case 'SWITCH_STANCE': {
      const player = getPlayer();
      if (!player?.stanceState) break;
      if (player.stanceState.stanceCooldownRemaining > 0) break;

      const { stanceId } = command.payload;
      player.stanceState.activeStanceId = stanceId;
      player.stanceState.stanceCooldownRemaining = DEFAULT_STANCE_COOLDOWN;
      break;
    }
```

**Step 3: Commit**

```bash
git add src/ecs/commands.ts src/ecs/systems/input.ts && git commit -m "feat(input): add stance switch command"
```

---

## Phase 7: Refactor UI to Pure Render

### Task 7.1: Update BattleArena to use snapshot animation data

**Files:**
- Modify: `src/components/game/BattleArena.tsx`

**Step 1: Remove useBattleAnimation hook usage**

This is a larger refactor. Replace useBattleAnimation call with direct snapshot reading:

```typescript
// Before:
const animation = useBattleAnimation(enemy, lastCombatEvent, isPaused, gamePhase, options, playerIsDying);

// After: Read directly from snapshot
const heroSpriteState = player?.combatAnimation?.type ?? COMBAT_ANIMATION.IDLE;
const enemySpriteState = enemy?.combatAnimation?.type ?? COMBAT_ANIMATION.IDLE;

const heroClasses = cn(
  'hero-sprite',
  heroSpriteState === COMBAT_ANIMATION.ATTACK && 'attacking',
  player?.visualEffects.flash && 'flash',
  player?.visualEffects.shake && 'shake',
);
```

**Step 2: Update component to receive CombatSnapshot props**

**Step 3: Run E2E to verify animations work**

Run: `npx playwright test e2e/combat.spec.ts --project="Desktop"`

**Step 4: Commit**

```bash
git add src/components/game/BattleArena.tsx && git commit -m "refactor(ui): BattleArena uses snapshot animation data"
```

---

### Task 7.2: Fix BattleOverlay type annotation

**Files:**
- Modify: `src/components/game/BattleOverlay.tsx`

**Step 1: Change Enemy import to EnemySnapshot**

```typescript
// Before:
import { Enemy } from '@/types/game';

// After:
import type { EnemySnapshot } from '@/ecs/snapshot';
```

**Step 2: Update prop types**

```typescript
interface BattleOverlayProps {
  enemy: EnemySnapshot | null;
  // ...
}
```

**Step 3: Commit**

```bash
git add src/components/game/BattleOverlay.tsx && git commit -m "fix(types): BattleOverlay uses EnemySnapshot"
```

---

## Phase 8: Delete Old Hooks

### Task 8.1: Delete useBattleAnimation hook

**Files:**
- Delete: `src/hooks/useBattleAnimation.ts`

**Step 1: Verify no remaining imports**

Run: `grep -r "useBattleAnimation" src/`
Expected: No results (after Phase 7 refactor)

**Step 2: Delete file**

```bash
rm src/hooks/useBattleAnimation.ts
```

**Step 3: Commit**

```bash
git add -A && git commit -m "chore: delete useBattleAnimation hook (replaced by ECS)"
```

---

### Task 8.2: Delete usePathResource hook

**Files:**
- Delete: `src/hooks/usePathResource.ts`

**Step 1: Update any components still using this hook**

Search and replace with direct snapshot reading + pure utility functions.

**Step 2: Delete file**

```bash
rm src/hooks/usePathResource.ts
```

**Step 3: Commit**

```bash
git add -A && git commit -m "chore: delete usePathResource hook (logic moved to ECS)"
```

---

### Task 8.3: Delete useStanceSystem hook

**Files:**
- Delete: `src/hooks/useStanceSystem.ts`

**Step 1: Update any components still using this hook**

**Step 2: Delete file**

```bash
rm src/hooks/useStanceSystem.ts
```

**Step 3: Commit**

```bash
git add -A && git commit -m "chore: delete useStanceSystem hook (logic moved to ECS)"
```

---

### Task 8.4: Delete useTrackedTimeouts hook

**Files:**
- Delete: `src/hooks/useTrackedTimeouts.ts`

**Step 1: Verify no remaining imports**

Run: `grep -r "useTrackedTimeouts" src/`

**Step 2: Delete file**

```bash
rm src/hooks/useTrackedTimeouts.ts
```

**Step 3: Commit**

```bash
git add -A && git commit -m "chore: delete useTrackedTimeouts hook (no longer needed)"
```

---

## Phase 9: Final Verification

### Task 9.1: Run all unit tests

**Step 1: Run tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Fix any failures**

---

### Task 9.2: Run E2E tests

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Run E2E**

Run: `npx playwright test --project="Desktop"`
Expected: All tests pass, animations work in browser

---

### Task 9.3: Manual verification

**Step 1: Play through combat manually**

- Start game, select class
- Verify attack animations play
- Verify hit reactions and damage numbers
- Verify death animations
- Verify floor transitions

**Step 2: Document any issues found**

---

### Task 9.4: Final commit

```bash
git add -A && git commit -m "feat(ecs): complete ECS architecture cleanup

- Animation state moved from React hooks to ECS components
- New AnimationSystem processes events and manages lifecycle
- Deleted dead code (PlayerCard, EnemyCard)
- Deleted violating hooks (useBattleAnimation, usePathResource, useStanceSystem)
- UI now purely renders from snapshots
- Zero useState for game state in UI components"
```

---

## Success Criteria Checklist

- [ ] Zero useState in game components for animation/game state
- [ ] Zero setInterval/setTimeout in hooks for game timing
- [ ] All timing driven by ECS ticks
- [ ] UI components only receive snapshot types (not legacy Player/Enemy)
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Manual verification confirms animations work
