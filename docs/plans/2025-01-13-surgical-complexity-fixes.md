# Surgical Complexity Fixes

**Date:** 2025-01-13
**Status:** Approved
**Goal:** Reduce coupling and file bloat by splitting 4 hotspot files

## Problem

Changes ripple across too many files. Four files are oversized and handle too many concerns:

| File | Lines | Issue |
|------|-------|-------|
| `input.ts` | 904 | Giant switch handling 20+ command types |
| `snapshot.ts` | 673 | 3 snapshot types jammed together |
| `passive-effect.ts` | 688 | Complex state machine with mixed concerns |
| `BattleEffects.tsx` | 1,052 | UI component doing too much |

## Solution: Surgical Splits

### Phase 1: Split `input.ts`

**Current:** One giant switch statement handling all commands.

**After:**
```
src/ecs/systems/
  input.ts                    # ~150 LOC - registry + dispatch only
  input-handlers/
    index.ts                  # Re-exports all handlers
    classHandlers.ts          # SELECT_CLASS, SELECT_SUBCLASS (~100 LOC)
    pathHandlers.ts           # SELECT_PATH, SELECT_POWER, CHANGE_STANCE (~150 LOC)
    powerHandlers.ts          # USE_POWER, power activation logic (~120 LOC)
    combatHandlers.ts         # ATTACK, combat commands (~80 LOC)
    flowHandlers.ts           # START_GAME, NEXT_ROOM, RESTART (~100 LOC)
```

**Pattern:** Command handler registry
```typescript
const handlers: Record<CommandType, CommandHandler> = {
  SELECT_CLASS: classHandlers.selectClass,
  // ...
};

export function inputSystem() {
  const command = dequeueCommand();
  if (command && handlers[command.type]) {
    handlers[command.type](command);
  }
}
```

---

### Phase 2: Split `snapshot.ts`

**Current:** Three snapshot types + creation functions in one file.

**After:**
```
src/ecs/snapshots/
  index.ts              # Re-exports everything (~20 LOC)
  types.ts              # Shared types if any (~30 LOC)
  playerSnapshot.ts     # PlayerSnapshot type + createPlayerSnapshot (~250 LOC)
  enemySnapshot.ts      # EnemySnapshot type + createEnemySnapshot (~80 LOC)
  gameStateSnapshot.ts  # GameStateSnapshot type + create function (~60 LOC)
```

**Migration:** Re-export from index.ts to preserve existing import paths.

---

### Phase 3: Split `passive-effect.ts`

**Current:** Recomputation, hooks, and conditionals all mixed together.

**After:**
```
src/ecs/systems/
  passive-effect.ts           # Main system, orchestration (~150 LOC)
  passive-effect/
    index.ts                  # Re-exports
    computation.ts            # recomputePassiveEffects (~200 LOC)
    hooks.ts                  # preDamage, onDamaged, surviveLeathal (~200 LOC)
    conditionals.ts           # Low HP checks, scaling evaluation (~100 LOC)
```

**Key:** Main file re-exports hooks for combat.ts to use.

---

### Phase 4: Split `BattleEffects.tsx`

**Current:** All battle visual effects in one component.

**After:**
```
src/components/game/
  BattleEffects.tsx           # Container, coordinates children (~150 LOC)
  battle-effects/
    index.ts                  # Re-exports
    FloatingNumbers.tsx       # Damage/heal numbers (~250 LOC)
    StatusIndicators.tsx      # Poison, stun, buff icons (~200 LOC)
    AnimationEffects.tsx      # Visual FX, particles (~250 LOC)
    AuraEffects.tsx           # Stance auras, shields (~150 LOC)
```

---

## Execution Order

1. **Phase 2 first** (snapshots) - no dependencies, pure extraction
2. **Phase 1 second** (input) - isolated system, handler pattern is straightforward
3. **Phase 4 third** (BattleEffects) - UI only, won't break game logic
4. **Phase 3 last** (passive-effect) - most complex, hooks are used by combat.ts

## Per-Phase Process

1. Extract to new files
2. Update imports throughout codebase
3. Run `npx vitest run` to verify nothing broke
4. Run `npx playwright test --project="Desktop"` for E2E validation
5. Commit before moving to next phase

## Success Criteria

- All tests pass after each phase
- No change to game behavior
- Each hotspot file reduced to <200 LOC
- New files are single-purpose and <300 LOC each

## Out of Scope

- Reorganizing data files
- Fixing naming confusion (statUtils vs statsUtils)
- Domain-based restructuring
- Removing game mechanics

These can be addressed in future iterations if needed.
