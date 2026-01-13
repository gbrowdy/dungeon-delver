# Surgical Complexity Fixes - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split 4 bloated hotspot files into focused, single-purpose modules to reduce coupling and make changes easier.

**Architecture:** Extract code into subdirectories with index re-exports. Existing import paths remain valid. Each phase is isolated - tests must pass before moving to next phase.

**Tech Stack:** TypeScript, React, miniplex ECS

---

## Phase 1: Split snapshot.ts (673 → 4 files)

### Task 1.1: Create snapshots directory structure

**Files:**
- Create: `src/ecs/snapshots/` directory

**Step 1: Create directory**

Run: `mkdir -p src/ecs/snapshots`

**Step 2: Commit**

```bash
git add -A && git commit -m "chore(ecs): create snapshots directory"
```

---

### Task 1.2: Extract shared utilities and types

**Files:**
- Create: `src/ecs/snapshots/types.ts`
- Read: `src/ecs/snapshot.ts`

**Step 1: Create types.ts with shared utilities**

```typescript
// src/ecs/snapshots/types.ts
/**
 * Shared types and utilities for snapshot creation.
 */

import { TICK_MS } from '../loop';

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert ticks to milliseconds.
 */
export function ticksToMs(tickCount: number): number {
  return tickCount * TICK_MS;
}

/**
 * Apply a stat modifier with smart rounding:
 * - Positive bonuses use Math.ceil (always at least +1)
 * - Negative penalties use Math.floor (always at least -1)
 * - Zero modifier returns base value unchanged
 */
export function applyStatModifier(base: number, modifier: number): number {
  if (modifier === 0) return base;
  const modified = base * (1 + modifier);
  if (modifier > 0) {
    return Math.max(base + 1, Math.ceil(modified));
  } else {
    return Math.min(base - 1, Math.floor(modified));
  }
}
```

**Step 2: Run tests to verify nothing is broken yet**

Run: `npx vitest run src/ecs --reporter=dot`
Expected: All tests pass (we haven't changed imports yet)

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract snapshot shared types and utilities"
```

---

### Task 1.3: Extract PlayerSnapshot

**Files:**
- Create: `src/ecs/snapshots/playerSnapshot.ts`
- Read: `src/ecs/snapshot.ts` (lines 91-519)

**Step 1: Create playerSnapshot.ts**

Extract the following from `snapshot.ts`:
- `PlayerSnapshot` interface (lines 91-238)
- `computeEffectiveStats` function (lines 62-85)
- `createPlayerSnapshot` function (lines 352-519)

The file should:
- Import `ticksToMs`, `applyStatModifier` from `./types`
- Import `Entity` from `../components`
- Import `getTick` from `../loop`
- Import `getStanceStatModifier` from `@/utils/stanceUtils`
- Import type dependencies from `@/types/game` and `@/types/paths`
- Export `PlayerSnapshot` interface and `createPlayerSnapshot` function

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract PlayerSnapshot to dedicated file"
```

---

### Task 1.4: Extract EnemySnapshot

**Files:**
- Create: `src/ecs/snapshots/enemySnapshot.ts`
- Read: `src/ecs/snapshot.ts` (lines 243-577)

**Step 1: Create enemySnapshot.ts**

Extract:
- `EnemySnapshot` interface (lines 243-286)
- `createEnemySnapshot` function (lines 525-577)

The file should:
- Import `ticksToMs` from `./types`
- Import `Entity` from `../components`
- Import `getTick` from `../loop`
- Import type dependencies
- Export `EnemySnapshot` interface and `createEnemySnapshot` function

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract EnemySnapshot to dedicated file"
```

---

### Task 1.5: Extract GameStateSnapshot

**Files:**
- Create: `src/ecs/snapshots/gameStateSnapshot.ts`
- Read: `src/ecs/snapshot.ts` (lines 291-637)

**Step 1: Create gameStateSnapshot.ts**

Extract:
- `GameStateSnapshot` interface (lines 291-326)
- `createGameStateSnapshot` function (lines 583-613)
- `createDefaultGameStateSnapshot` function (lines 618-637)

The file should:
- Import `Entity` from `../components`
- Import type dependencies
- Export all three items

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract GameStateSnapshot to dedicated file"
```

---

### Task 1.6: Create index.ts and update snapshot.ts

**Files:**
- Create: `src/ecs/snapshots/index.ts`
- Modify: `src/ecs/snapshot.ts`

**Step 1: Create index.ts that re-exports everything**

```typescript
// src/ecs/snapshots/index.ts
/**
 * Snapshot types and creation functions.
 * Re-exports for backward compatibility.
 */

export * from './types';
export * from './playerSnapshot';
export * from './enemySnapshot';
export * from './gameStateSnapshot';
```

**Step 2: Replace snapshot.ts with thin re-export + CombatSnapshot**

The new `snapshot.ts` should:
- Re-export everything from `./snapshots`
- Keep `CombatSnapshot` interface (lines 336-342)
- Keep `createCombatSnapshot` function (lines 644-673)
- Import snapshot creators from `./snapshots`

This keeps `snapshot.ts` at ~50 lines and maintains backward compatibility.

**Step 3: Run all tests**

Run: `npx vitest run src/ecs --reporter=dot`
Expected: All 314+ ECS tests pass

**Step 4: Run full test suite**

Run: `npx vitest run --reporter=dot`
Expected: All tests pass

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor(ecs): complete snapshot.ts split into focused modules"
```

---

## Phase 2: Split input.ts (904 → 6 files)

### Task 2.1: Create input-handlers directory

**Files:**
- Create: `src/ecs/systems/input-handlers/` directory

**Step 1: Create directory**

Run: `mkdir -p src/ecs/systems/input-handlers`

**Step 2: Commit**

```bash
git add -A && git commit -m "chore(ecs): create input-handlers directory"
```

---

### Task 2.2: Extract shared types and helpers

**Files:**
- Create: `src/ecs/systems/input-handlers/types.ts`

**Step 1: Create types.ts with shared handler types**

```typescript
// src/ecs/systems/input-handlers/types.ts
/**
 * Shared types for input command handlers.
 */

import type { Entity } from '../../components';
import type { Command } from '../../commands';

/**
 * Context passed to all command handlers.
 */
export interface HandlerContext {
  player: Entity | undefined;
  gameState: Entity | undefined;
}

/**
 * Command handler function signature.
 */
export type CommandHandler<T extends Command = Command> = (
  cmd: T,
  ctx: HandlerContext
) => void;
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): add input handler types"
```

---

### Task 2.3: Extract flow handlers

**Files:**
- Create: `src/ecs/systems/input-handlers/flowHandlers.ts`
- Read: `src/ecs/systems/input.ts`

**Step 1: Create flowHandlers.ts**

Extract these command handlers from input.ts:
- `START_GAME` (lines 267-272)
- `RESTART_GAME` (lines 274-280)
- `ADVANCE_ROOM` (lines 620-716)
- `GO_TO_SHOP` (lines 718-725)
- `LEAVE_SHOP` (lines 727-818)
- `RETRY_FLOOR` (lines 820-876)
- `ABANDON_RUN` (lines 879-896)

Each handler should be a named export function that takes `(cmd, ctx)`.

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract flow command handlers"
```

---

### Task 2.4: Extract class handlers

**Files:**
- Create: `src/ecs/systems/input-handlers/classHandlers.ts`
- Read: `src/ecs/systems/input.ts`

**Step 1: Create classHandlers.ts**

Extract:
- `SELECT_CLASS` (lines 283-344)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract class command handlers"
```

---

### Task 2.5: Extract path handlers

**Files:**
- Create: `src/ecs/systems/input-handlers/pathHandlers.ts`
- Read: `src/ecs/systems/input.ts`

**Step 1: Create pathHandlers.ts**

Extract:
- `SELECT_PATH` (lines 346-453)
- `SELECT_ABILITY` (lines 456-465)
- `SELECT_SUBPATH` (lines 467-473)
- `SWITCH_STANCE` (lines 475-500)
- `SELECT_POWER` (lines 503-535)
- `UPGRADE_POWER` (lines 538-562)
- `SELECT_STANCE_ENHANCEMENT` (lines 565-617)

Include helper functions:
- `recomputeEffectivePowers` (lines 29-31)
- `recomputeEffectiveStanceEffects` (lines 36-38)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract path command handlers"
```

---

### Task 2.6: Extract power handlers

**Files:**
- Create: `src/ecs/systems/input-handlers/powerHandlers.ts`
- Read: `src/ecs/systems/input.ts`

**Step 1: Create powerHandlers.ts**

Extract:
- `ACTIVATE_POWER` (lines 47-81)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract power command handlers"
```

---

### Task 2.7: Extract combat/UI handlers

**Files:**
- Create: `src/ecs/systems/input-handlers/combatHandlers.ts`
- Read: `src/ecs/systems/input.ts`

**Step 1: Create combatHandlers.ts**

Extract:
- `SET_COMBAT_SPEED` (lines 83-88)
- `TOGGLE_PAUSE` (lines 90-95)
- `DISMISS_POPUP` (lines 97-130)
- `MARK_ANIMATIONS_CONSUMED` (lines 132-142)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract combat/UI command handlers"
```

---

### Task 2.8: Extract shop handlers

**Files:**
- Create: `src/ecs/systems/input-handlers/shopHandlers.ts`
- Read: `src/ecs/systems/input.ts`

**Step 1: Create shopHandlers.ts**

Extract:
- `PURCHASE_ITEM` (lines 144-189)
- `ENHANCE_ITEM` (lines 192-264)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract shop command handlers"
```

---

### Task 2.9: Create handler registry and update input.ts

**Files:**
- Create: `src/ecs/systems/input-handlers/index.ts`
- Modify: `src/ecs/systems/input.ts`

**Step 1: Create index.ts with handler registry**

```typescript
// src/ecs/systems/input-handlers/index.ts
/**
 * Command handler registry.
 * Maps command types to their handler functions.
 */

import type { Command } from '../../commands';
import type { CommandHandler, HandlerContext } from './types';

// Import all handlers
import * as flow from './flowHandlers';
import * as classH from './classHandlers';
import * as path from './pathHandlers';
import * as power from './powerHandlers';
import * as combat from './combatHandlers';
import * as shop from './shopHandlers';

export type { HandlerContext, CommandHandler } from './types';

/**
 * Registry mapping command types to handlers.
 */
export const handlers: Partial<Record<Command['type'], CommandHandler>> = {
  // Flow
  START_GAME: flow.handleStartGame,
  RESTART_GAME: flow.handleRestartGame,
  ADVANCE_ROOM: flow.handleAdvanceRoom,
  GO_TO_SHOP: flow.handleGoToShop,
  LEAVE_SHOP: flow.handleLeaveShop,
  RETRY_FLOOR: flow.handleRetryFloor,
  ABANDON_RUN: flow.handleAbandonRun,

  // Class
  SELECT_CLASS: classH.handleSelectClass,

  // Path
  SELECT_PATH: path.handleSelectPath,
  SELECT_ABILITY: path.handleSelectAbility,
  SELECT_SUBPATH: path.handleSelectSubpath,
  SWITCH_STANCE: path.handleSwitchStance,
  SELECT_POWER: path.handleSelectPower,
  UPGRADE_POWER: path.handleUpgradePower,
  SELECT_STANCE_ENHANCEMENT: path.handleSelectStanceEnhancement,

  // Power
  ACTIVATE_POWER: power.handleActivatePower,

  // Combat/UI
  SET_COMBAT_SPEED: combat.handleSetCombatSpeed,
  TOGGLE_PAUSE: combat.handleTogglePause,
  DISMISS_POPUP: combat.handleDismissPopup,
  MARK_ANIMATIONS_CONSUMED: combat.handleMarkAnimationsConsumed,

  // Shop
  PURCHASE_ITEM: shop.handlePurchaseItem,
  ENHANCE_ITEM: shop.handleEnhanceItem,
};
```

**Step 2: Replace input.ts with slim dispatcher**

```typescript
// src/ecs/systems/input.ts
/**
 * InputSystem - processes commands from the command queue.
 * Delegates to specialized handlers in input-handlers/.
 */

import { drainCommands } from '../commands';
import { getPlayer, getGameState } from '../queries';
import { handlers, type HandlerContext } from './input-handlers';

export function InputSystem(_deltaMs: number): void {
  const commands = drainCommands();
  const ctx: HandlerContext = {
    player: getPlayer(),
    gameState: getGameState(),
  };

  for (const cmd of commands) {
    const handler = handlers[cmd.type];
    if (handler) {
      handler(cmd, ctx);
    }
    // Unknown commands are silently ignored
  }
}
```

**Step 3: Run all tests**

Run: `npx vitest run src/ecs --reporter=dot`
Expected: All ECS tests pass

**Step 4: Run full test suite**

Run: `npx vitest run --reporter=dot`
Expected: All tests pass

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor(ecs): complete input.ts split into handler modules"
```

---

## Phase 3: Split BattleEffects.tsx (1052 → 5 files)

### Task 3.1: Create battle-effects directory

**Files:**
- Create: `src/components/game/battle-effects/` directory

**Step 1: Create directory**

Run: `mkdir -p src/components/game/battle-effects`

**Step 2: Commit**

```bash
git add -A && git commit -m "chore(ui): create battle-effects directory"
```

---

### Task 3.2: Extract FloatingNumbers

**Files:**
- Create: `src/components/game/battle-effects/FloatingNumbers.tsx`
- Read: `src/components/game/BattleEffects.tsx`

**Step 1: Create FloatingNumbers.tsx**

Extract:
- `DamageNumber` component (lines 5-71)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ui): extract FloatingNumbers component"
```

---

### Task 3.3: Extract AttackEffects

**Files:**
- Create: `src/components/game/battle-effects/AttackEffects.tsx`
- Read: `src/components/game/BattleEffects.tsx`

**Step 1: Create AttackEffects.tsx**

Extract:
- `SlashEffect` component (lines 73-145)
- `WEAPONS` pixel art data (lines 158-241)
- `PixelWeapon` component (lines 243-274)
- `PixelSlash` component (lines 276-316)
- `HitImpact` component (lines 705-820)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ui): extract AttackEffects components"
```

---

### Task 3.4: Extract SpellEffects

**Files:**
- Create: `src/components/game/battle-effects/SpellEffects.tsx`
- Read: `src/components/game/BattleEffects.tsx`

**Step 1: Create SpellEffects.tsx**

Extract:
- `PixelSpell` component (lines 318-502)
- `SpellEffect` legacy component (lines 584-659)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ui): extract SpellEffects components"
```

---

### Task 3.5: Extract DefenseEffects

**Files:**
- Create: `src/components/game/battle-effects/DefenseEffects.tsx`
- Read: `src/components/game/BattleEffects.tsx`

**Step 1: Create DefenseEffects.tsx**

Extract:
- `PixelShield` component (lines 504-582)
- `ScreenShake` component (lines 661-684)
- `HitFlash` component (lines 686-703)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ui): extract DefenseEffects components"
```

---

### Task 3.6: Extract BossEffects

**Files:**
- Create: `src/components/game/battle-effects/BossEffects.tsx`
- Read: `src/components/game/BattleEffects.tsx`

**Step 1: Create BossEffects.tsx**

Extract:
- `BossDeathEffect` component (lines 822-961)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ui): extract BossEffects components"
```

---

### Task 3.7: Create index.ts and update BattleEffects.tsx

**Files:**
- Create: `src/components/game/battle-effects/index.ts`
- Modify: `src/components/game/BattleEffects.tsx`

**Step 1: Create index.ts that re-exports everything**

```typescript
// src/components/game/battle-effects/index.ts
/**
 * Battle visual effects components.
 * Re-exports for backward compatibility.
 */

export * from './FloatingNumbers';
export * from './AttackEffects';
export * from './SpellEffects';
export * from './DefenseEffects';
export * from './BossEffects';
```

**Step 2: Update BattleEffects.tsx to re-export + keep EffectsLayer**

The new `BattleEffects.tsx` should:
- Re-export everything from `./battle-effects`
- Keep `BattleEffect` interface (lines 963-972)
- Keep `EffectsLayer` component (lines 974-1052)
- Import individual components from `./battle-effects`

This keeps `BattleEffects.tsx` at ~100 lines.

**Step 3: Run tests**

Run: `npx vitest run --reporter=dot`
Expected: All tests pass

**Step 4: Run E2E tests**

Run: `npx playwright test --project="Desktop" --reporter=dot`
Expected: All E2E tests pass

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor(ui): complete BattleEffects.tsx split into focused modules"
```

---

## Phase 4: Split passive-effect.ts (688 → 4 files)

### Task 4.1: Create passive-effect directory

**Files:**
- Create: `src/ecs/systems/passive-effect/` directory

**Step 1: Create directory**

Run: `mkdir -p src/ecs/systems/passive-effect`

**Step 2: Commit**

```bash
git add -A && git commit -m "chore(ecs): create passive-effect directory"
```

---

### Task 4.2: Extract state management

**Files:**
- Create: `src/ecs/systems/passive-effect/state.ts`
- Read: `src/ecs/systems/passive-effect.ts`

**Step 1: Create state.ts**

Extract:
- `createDefaultComputed` function (lines 35-103)
- `createInitialState` function (lines 108-125)
- `initializePassiveEffectState` function (lines 131-135)
- `resetCombatState` function (lines 145-159)
- `resetFloorState` function (lines 165-172)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract passive effect state management"
```

---

### Task 4.3: Extract computation logic

**Files:**
- Create: `src/ecs/systems/passive-effect/computation.ts`
- Read: `src/ecs/systems/passive-effect.ts`

**Step 1: Create computation.ts**

Extract:
- `getActiveStanceEnhancements` function (lines 181-203)
- `recomputePassiveEffects` function (lines 213-414)
- `updateConditionalEffects` function (lines 424-451)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract passive effect computation logic"
```

---

### Task 4.4: Extract combat hooks

**Files:**
- Create: `src/ecs/systems/passive-effect/hooks.ts`
- Read: `src/ecs/systems/passive-effect.ts`

**Step 1: Create hooks.ts**

Extract:
- `PreDamageResult` interface (lines 457-461)
- `OnDamagedResult` interface (lines 463-471)
- `SurviveLethalResult` interface (lines 598-601)
- `processPreDamage` function (lines 479-517)
- `processOnDamaged` function (lines 527-592)
- `checkSurviveLethal` function (lines 613-638)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(ecs): extract passive effect combat hooks"
```

---

### Task 4.5: Create index.ts and update passive-effect.ts

**Files:**
- Create: `src/ecs/systems/passive-effect/index.ts`
- Modify: `src/ecs/systems/passive-effect.ts`

**Step 1: Create index.ts that re-exports everything**

```typescript
// src/ecs/systems/passive-effect/index.ts
/**
 * Passive effect system modules.
 * Re-exports for external use.
 */

export * from './state';
export * from './computation';
export * from './hooks';
```

**Step 2: Update passive-effect.ts to be slim orchestrator**

The new `passive-effect.ts` should:
- Import from `./passive-effect/` subdirectory
- Re-export public API (initializePassiveEffectState, recomputePassiveEffects, resetFloorState, etc.)
- Keep only `PassiveEffectSystem` function (lines 652-688)

This keeps `passive-effect.ts` at ~60 lines.

**Step 3: Update imports in other files**

Files that import from `passive-effect.ts`:
- `src/ecs/systems/input.ts` (uses `initializePassiveEffectState`, `recomputePassiveEffects`, `resetFloorState`)
- `src/ecs/systems/combat.ts` (uses `processPreDamage`, `processOnDamaged`)
- `src/ecs/systems/death.ts` (uses `checkSurviveLethal`)

These imports should still work via re-exports, but verify.

**Step 4: Run all tests**

Run: `npx vitest run src/ecs --reporter=dot`
Expected: All ECS tests pass

**Step 5: Run full test suite**

Run: `npx vitest run --reporter=dot`
Expected: All tests pass

**Step 6: Run E2E tests**

Run: `npx playwright test --project="Desktop" --reporter=dot`
Expected: All E2E tests pass

**Step 7: Commit**

```bash
git add -A && git commit -m "refactor(ecs): complete passive-effect.ts split into focused modules"
```

---

## Final Verification

### Task 5.1: Full test suite

**Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Run all E2E tests**

Run: `npx playwright test --project="Desktop"`
Expected: All E2E tests pass

**Step 3: Verify file sizes**

Run: `wc -l src/ecs/snapshot.ts src/ecs/systems/input.ts src/ecs/systems/passive-effect.ts src/components/game/BattleEffects.tsx`

Expected:
- `snapshot.ts` < 100 lines
- `input.ts` < 50 lines
- `passive-effect.ts` < 100 lines
- `BattleEffects.tsx` < 150 lines

**Step 4: Final commit**

```bash
git add -A && git commit -m "chore: verify surgical complexity fixes complete"
```

---

## Success Criteria

- [ ] All unit tests pass after each phase
- [ ] All E2E tests pass after phases 3 and 4
- [ ] Each original hotspot file reduced to <150 LOC
- [ ] New files are single-purpose and <300 LOC each
- [ ] Existing import paths still work (backward compatible)
- [ ] No game behavior changes
