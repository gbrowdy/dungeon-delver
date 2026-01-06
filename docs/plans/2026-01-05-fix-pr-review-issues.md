# Fix PR Review Issues Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical, important, and suggested issues from the code review of PR #41 (ECS architecture migration).

**Architecture:** Create shared utility module `src/ecs/utils/` to eliminate 22+ duplicate helper functions across 10 system files. Fix component removal patterns to use miniplex's `world.removeComponent()`. Remove duplicate logic for dying entity cleanup and enemy creation.

**Tech Stack:** TypeScript, React, miniplex ECS, Vitest

---

## Task 1: Create Shared Animation Utilities

**Files:**
- Create: `src/ecs/utils/animation.ts`
- Reference: `src/ecs/systems/combat.ts:15-42`
- Reference: `src/ecs/systems/power.ts:18-43`

**Step 1: Create the animation utilities file**

```typescript
// src/ecs/utils/animation.ts
/**
 * Shared animation utilities for ECS systems.
 * Consolidates duplicate queueAnimationEvent implementations.
 */

import { getGameState } from '../queries';
import { getTick, TICK_MS } from '../loop';
import type { AnimationEventType, AnimationPayload } from '../components';

/**
 * Generate a unique animation ID using crypto.randomUUID().
 * Replaces module-level counters that never reset between games.
 */
export function getNextAnimationId(): string {
  return crypto.randomUUID();
}

/**
 * Queue an animation event for the AnimationSystem to process.
 *
 * @param eventType - The type of animation event
 * @param payload - Event-specific data
 * @param durationTicks - How long the animation lasts in game ticks (default 45 = ~720ms)
 */
export function queueAnimationEvent(
  eventType: AnimationEventType,
  payload: AnimationPayload,
  durationTicks: number = 45
): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.animationEvents) {
    gameState.animationEvents = [];
  }

  gameState.animationEvents.push({
    id: getNextAnimationId(),
    type: eventType,
    payload,
    timestamp: getTick(),
    duration: durationTicks * TICK_MS,
  });
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/ecs/utils/animation.ts 2>&1 | head -20`
Expected: No errors (or only import resolution errors that will resolve with index.ts)

**Step 3: Commit**

```bash
git add src/ecs/utils/animation.ts
git commit -m "feat(ecs): add shared animation utilities"
```

---

## Task 2: Create Shared Combat Log Utility

**Files:**
- Create: `src/ecs/utils/combat-log.ts`
- Reference: `src/ecs/systems/combat.ts:44-58`

**Step 1: Create the combat log utility file**

```typescript
// src/ecs/utils/combat-log.ts
/**
 * Shared combat log utility for ECS systems.
 * Consolidates duplicate addCombatLog implementations from 10 files.
 */

import { getGameState } from '../queries';

const MAX_COMBAT_LOG_ENTRIES = 50;

/**
 * Add a message to the combat log.
 * Keeps only the last 50 entries.
 */
export function addCombatLog(message: string): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.combatLog) {
    gameState.combatLog = [];
  }

  gameState.combatLog.push(message);

  // Keep last 50 entries
  if (gameState.combatLog.length > MAX_COMBAT_LOG_ENTRIES) {
    gameState.combatLog.shift();
  }
}
```

**Step 2: Commit**

```bash
git add src/ecs/utils/combat-log.ts
git commit -m "feat(ecs): add shared combat log utility"
```

---

## Task 3: Create Shared Entity Utilities

**Files:**
- Create: `src/ecs/utils/entity.ts`
- Reference: `src/ecs/systems/combat.ts:69-77`

**Step 1: Create the entity utility file**

```typescript
// src/ecs/utils/entity.ts
/**
 * Shared entity utilities for ECS systems.
 */

import type { Entity } from '../components';

/**
 * Get the display name for an entity (player or enemy).
 */
export function getEntityName(entity: Entity): string {
  if (entity.player) {
    return entity.identity?.name ?? 'Hero';
  }
  if (entity.enemy) {
    return entity.enemy.name;
  }
  return 'Unknown';
}
```

**Step 2: Commit**

```bash
git add src/ecs/utils/entity.ts
git commit -m "feat(ecs): add shared entity utilities"
```

---

## Task 4: Create Utils Index and Add clearCommands

**Files:**
- Create: `src/ecs/utils/index.ts`
- Modify: `src/ecs/commands.ts`

**Step 1: Create the index file**

```typescript
// src/ecs/utils/index.ts
/**
 * Shared ECS utilities.
 * Re-exports all utilities for convenient imports.
 */

export { queueAnimationEvent, getNextAnimationId } from './animation';
export { addCombatLog } from './combat-log';
export { getEntityName } from './entity';
```

**Step 2: Add clearCommands to commands.ts**

In `src/ecs/commands.ts`, add after the `drainCommands` function:

```typescript
/**
 * Clear all pending commands.
 * Called when resetting game state (abandon, new game).
 */
export function clearCommands(): void {
  commandQueue.length = 0;
}
```

**Step 3: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/ecs/utils/index.ts src/ecs/commands.ts
git commit -m "feat(ecs): add utils index and clearCommands function"
```

---

## Task 5: Fix Critical Blocking Reduction Bug

**Files:**
- Modify: `src/ecs/systems/combat.ts:173-188`

**Step 1: Read current blocking code**

Run: `sed -n '170,195p' src/ecs/systems/combat.ts`

**Step 2: Fix the bug - save reduction before deletion**

Replace the blocking handling code (around lines 173-188):

```typescript
    // Check blocking
    if (target.blocking) {
      damage = Math.floor(damage * (1 - target.blocking.reduction));
      blocked = true;

      // Save reduction before removing component
      const blockReduction = target.blocking.reduction;
      world.removeComponent(target, 'blocking');

      // Queue block animation
      queueAnimationEvent('player_block', {
        type: 'block',
        reduction: blockReduction,
      });
    }
```

**Step 3: Run tests**

Run: `npx vitest run src/ecs/systems/__tests__/combat.test.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/ecs/systems/combat.ts
git commit -m "fix(ecs): save blocking reduction before component removal"
```

---

## Task 6: Update Combat System to Use Shared Utils

**Files:**
- Modify: `src/ecs/systems/combat.ts`

**Step 1: Add import for shared utils**

At the top of the file, add:

```typescript
import { queueAnimationEvent, addCombatLog, getEntityName } from '../utils';
```

**Step 2: Remove local helper functions**

Delete these local functions (approximately lines 15-77):
- `let nextAnimationId = 0`
- `function getNextAnimationId()`
- `function queueAnimationEvent()`
- `function addCombatLog()`
- `function getEntityName()`

**Step 3: Run tests**

Run: `npx vitest run src/ecs/systems/__tests__/combat.test.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/ecs/systems/combat.ts
git commit -m "refactor(ecs): combat system uses shared utils"
```

---

## Task 7: Update Power System to Use Shared Utils

**Files:**
- Modify: `src/ecs/systems/power.ts`

**Step 1: Add import for shared utils**

```typescript
import { queueAnimationEvent, addCombatLog, getEntityName } from '../utils';
```

**Step 2: Remove local helper functions**

Delete local functions:
- `let nextAnimationId = 0`
- `function getNextAnimationId()`
- `function queueAnimationEvent()`
- `function addCombatLog()`
- `function getEntityName()`

**Step 3: Run tests**

Run: `npx vitest run src/ecs`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/ecs/systems/power.ts
git commit -m "refactor(ecs): power system uses shared utils"
```

---

## Task 8: Update Death System - Remove Duplicates

**Files:**
- Modify: `src/ecs/systems/death.ts`

**Step 1: Add import for shared utils**

```typescript
import { queueAnimationEvent, addCombatLog } from '../utils';
```

**Step 2: Remove local helper functions**

Delete:
- `function queueAnimationEvent()`
- `function addCombatLog()`

**Step 3: Remove duplicate dying entity cleanup (lines ~129-141)**

Delete the entire "Clean up entities that finished dying" loop. This logic is already in cleanup.ts which runs after death.ts.

**Step 4: Run tests**

Run: `npx vitest run src/ecs`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/ecs/systems/death.ts
git commit -m "refactor(ecs): death system uses shared utils, remove duplicate cleanup"
```

---

## Task 9: Update Flow System - Remove Duplicate Enemy Creation

**Files:**
- Modify: `src/ecs/systems/flow.ts`

**Step 1: Add imports**

```typescript
import { createEnemyEntity } from '../factories';
import { addCombatLog } from '../utils';
```

**Step 2: Remove local addCombatLog function**

Delete the local `addCombatLog` function.

**Step 3: Remove addEnemyEntity function (lines ~40-96)**

Delete the entire `addEnemyEntity` function.

**Step 4: Update spawnNextEnemy to use createEnemyEntity**

Find `spawnNextEnemy` function and replace the call to `addEnemyEntity` with:

```typescript
const enemyEntity = createEnemyEntity({
  floor: gameState.floor!.number,
  room: gameState.floor!.room,
  isBoss,
  isFinalBoss,
  roomsPerFloor: gameState.floor!.totalRooms,
});
world.add(enemyEntity);
```

**Step 5: Run tests**

Run: `npx vitest run src/ecs`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/ecs/systems/flow.ts
git commit -m "refactor(ecs): flow system uses createEnemyEntity from factories"
```

---

## Task 10: Update Remaining Systems (Batch)

**Files:**
- Modify: `src/ecs/systems/enemy-ability.ts`
- Modify: `src/ecs/systems/item-effect.ts`
- Modify: `src/ecs/systems/path-ability.ts`
- Modify: `src/ecs/systems/progression.ts`
- Modify: `src/ecs/systems/status-effect.ts`
- Modify: `src/ecs/systems/resource-generation.ts`

**Step 1: For each file, add import and remove local functions**

Add to each file:
```typescript
import { queueAnimationEvent, addCombatLog, getEntityName } from '../utils';
```

Remove local duplicates of:
- `queueAnimationEvent`
- `addCombatLog`
- `getEntityName` (where present)
- `nextAnimationId` counter (where present)

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All 609+ tests pass

**Step 3: Commit**

```bash
git add src/ecs/systems/
git commit -m "refactor(ecs): all systems use shared utils"
```

---

## Task 11: Fix Cleanup System Component Removal

**Files:**
- Modify: `src/ecs/systems/cleanup.ts`

**Step 1: Add world import**

Ensure `world` is imported from `../world`.

**Step 2: Fix combatAnimation removal (lines ~68, ~76)**

Replace:
```typescript
delete player.combatAnimation;
```

With:
```typescript
world.removeComponent(player, 'combatAnimation');
```

Same for enemy:
```typescript
world.removeComponent(enemy, 'combatAnimation');
```

**Step 3: Fix visualEffects sub-property clearing**

For nested properties, set to undefined instead of delete:
```typescript
player.visualEffects.flash = undefined;
player.visualEffects.shake = undefined;
player.visualEffects.hitStop = undefined;
player.visualEffects.aura = undefined;
// Same for enemy
enemy.visualEffects.flash = undefined;
enemy.visualEffects.aura = undefined;
```

**Step 4: Run tests**

Run: `npx vitest run src/ecs/systems/__tests__/cleanup.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/ecs/systems/cleanup.ts
git commit -m "fix(ecs): cleanup system uses proper component removal"
```

---

## Task 12: Fix Input System - Clear Commands on Reset

**Files:**
- Modify: `src/ecs/systems/input.ts`

**Step 1: Add import**

```typescript
import { clearCommands } from '../commands';
```

**Step 2: Clear commands on game reset**

In the `ABANDON_RUN` command handler, add:
```typescript
clearCommands();
```

In any `START_NEW_GAME` or similar reset handler, add the same.

**Step 3: Run tests**

Run: `npx vitest run src/ecs`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/ecs/systems/input.ts
git commit -m "fix(ecs): clear command queue on game reset"
```

---

## Task 13: Fix Game.tsx Type Safety

**Files:**
- Modify: `src/components/game/Game.tsx`
- Modify: `src/utils/pathUtils.ts` (if needed)

**Step 1: Read current code**

Run: `sed -n '25,40p' src/components/game/Game.tsx`

**Step 2: Create proper type for ability choices**

Either update the function signature in `pathUtils.ts` or create a minimal interface:

```typescript
// In Game.tsx or a types file
interface AbilityChoicePlayer {
  level: number;
  path: PlayerPath | null;
}
```

Then update the call:
```typescript
const playerForChoices: AbilityChoicePlayer = {
  level: player.level,
  path: player.path,
};
return getAbilityChoices(playerForChoices, pathDef);
```

**Step 3: Update getAbilityChoices to accept the interface**

In `src/utils/pathUtils.ts`, update the function signature to accept the minimal interface.

**Step 4: Run build**

Run: `npm run build`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/components/game/Game.tsx src/utils/pathUtils.ts
git commit -m "fix(types): proper typing for getAbilityChoices"
```

---

## Task 14: Final Verification

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 3: Run all unit tests**

Run: `npx vitest run`
Expected: All 609+ tests pass

**Step 4: Run E2E tests**

Run: `npx playwright test --project="Desktop"`
Expected: All E2E tests pass

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: fix all PR review issues

- Create shared utils: animation, combat-log, entity helpers
- Fix blocking reduction bug (saved before deletion)
- Fix component removal patterns (use world.removeComponent)
- Remove duplicate dying entity cleanup from death.ts
- Remove duplicate enemy creation from flow.ts
- Add clearCommands for game reset
- Fix type safety in Game.tsx
- Remove ~400 lines of duplicate code across 10 systems

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

**Step 6: Push**

Run: `git push`

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | Create animation utilities | 3 min |
| 2 | Create combat log utility | 2 min |
| 3 | Create entity utilities | 2 min |
| 4 | Create index + clearCommands | 3 min |
| 5 | Fix blocking reduction bug | 5 min |
| 6 | Update combat system | 5 min |
| 7 | Update power system | 3 min |
| 8 | Update death system | 5 min |
| 9 | Update flow system | 5 min |
| 10 | Update remaining systems | 10 min |
| 11 | Fix cleanup component removal | 5 min |
| 12 | Fix input clear commands | 3 min |
| 13 | Fix Game.tsx types | 5 min |
| 14 | Final verification | 5 min |
| **Total** | | **~60 min** |
