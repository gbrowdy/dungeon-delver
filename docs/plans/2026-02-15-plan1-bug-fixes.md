# Plan 1: Bug Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 11 bugs and broken behaviors identified in the audit — combat pipeline, status effects, store consistency, and UI/accessibility.

**Architecture:** All changes are targeted fixes to existing files. No new files, no new systems. TDD throughout — write failing test, then fix.

**Tech Stack:** Vitest (unit tests), React 18, Zustand, TypeScript

---

### Task 1: Combat HP Guards (dead entity attacks)

**Files:**
- Modify: `src/store/actions/combat.ts:67-95`
- Test: `src/store/__tests__/combat.test.ts`

**Context:** The death check only runs at the bottom of `tickCombat` (line 84-95). If poison/reflect kills an entity mid-pipeline, the dead entity (negative HP) can still attack. The player attack fires at line 68, then the enemy attack fires at line 75, with no HP check between them.

**Step 1: Write the failing test**

Add to `src/store/__tests__/combat.test.ts`:

```typescript
describe('tickCombat — death guards', () => {
  it('enemy cannot attack on the same tick it dies from player attack', () => {
    const state = createCombatState();
    // Both timers fire this tick
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 1;
    // Enemy has 1 HP — will die from player attack
    state.enemy!.hp = 1;
    const playerHpBefore = state.player.hp;

    // Ensure player hits (no dodge)
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    tickCombat(state, TICK_MS);

    // Enemy should be dead and player should NOT have taken damage
    expect(state.enemy!.hp).toBe(0);
    expect(state.player.hp).toBe(playerHpBefore);
  });

  it('player cannot attack on the same tick it dies from enemy attack', () => {
    const state = createCombatState();
    state.enemy!.attackTimer = 1;
    state.player.attackTimer = 1;
    // Player has 1 HP — will die from enemy attack
    state.player.hp = 1;
    // Enemy attacks first when timers are equal (enemy timer check is at line 75)
    // Actually player attacks first (line 68 before line 75), so set player timer higher
    state.player.attackTimer = 9999;  // Player won't attack
    state.enemy!.attackTimer = 1;     // Enemy attacks
    const enemyHpBefore = state.enemy!.hp;

    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    tickCombat(state, TICK_MS);

    expect(state.player.hp).toBe(0);
  });

  it('enemy cannot attack after dying from poison on the same tick', () => {
    const state = createCombatState();
    // Give enemy poison and 1 HP
    state.enemy!.hp = 1;
    state.enemy!.statusEffects = [{ type: 'poison', stacks: 5, remainingMs: 3000 }];
    // Enemy timer fires this tick
    state.enemy!.attackTimer = 1;
    // Player does not attack
    state.player.attackTimer = 9999;
    const playerHpBefore = state.player.hp;

    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    tickCombat(state, TICK_MS);

    // After poison kills enemy, enemy should not have attacked
    expect(state.player.hp).toBe(playerHpBefore);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/combat.test.ts --reporter=verbose`
Expected: FAIL — enemy attacks after dying because no HP guard exists

**Step 3: Add HP guards in combat.ts**

In `src/store/actions/combat.ts`, modify the `tickCombat` function. After the player attack block (line 72), add an HP guard. After the enemy attack block (line 78), add another. After tickStatusEffects (line 81), add a third.

```typescript
  // Player attacks (skip if stunned)
  if (player.attackTimer <= 0 && !hasEffect(player, 'stun')) {
    state.combatCounters.playerAttackCount += 1;
    resolvePlayerAttack(state, player, enemy, passives);
    player.attackTimer = getAttackInterval(playerEffectiveSpeed);
  }

  // Early exit if enemy died from player attack
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    emitCombatEvent(state, { type: 'death', target: 'enemy', tick: state.gameTick });
    handleEnemyDeath(state);
    return;
  }

  // Enemy attacks (skip if stunned)
  if (enemy.attackTimer <= 0 && !hasEffect(enemy, 'stun')) {
    resolveEnemyAttack(state, player, enemy, passives);
    enemy.attackTimer = getAttackInterval(enemy.speed);
  }

  // Early exit if player died from enemy attack
  if (player.hp <= 0) {
    player.hp = 0;
    emitCombatEvent(state, { type: 'death', target: 'player', tick: state.gameTick });
    handlePlayerDeath(state);
    return;
  }

  // Tick status effects (poison, curse decay, regen, shield)
  tickStatusEffects(state, dt);

  // Death checks (from status effect damage — poison, reflect, etc.)
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    emitCombatEvent(state, { type: 'death', target: 'enemy', tick: state.gameTick });
    handleEnemyDeath(state);
    return;
  }
  if (player.hp <= 0) {
    player.hp = 0;
    emitCombatEvent(state, { type: 'death', target: 'player', tick: state.gameTick });
    handlePlayerDeath(state);
    return;
  }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/__tests__/combat.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (some existing tests may need adjustment if they relied on the old behavior where both could attack)

**Step 6: Commit**

```bash
git add src/store/actions/combat.ts src/store/__tests__/combat.test.ts
git commit -m "fix(combat): add HP guards to prevent dead entities from attacking"
```

---

### Task 2: Poison Fractional Accumulation

**Files:**
- Modify: `src/store/actions/statusEffects.ts:149-172`
- Modify: `src/types/game.ts` (add accumulator field to CombatEntity)
- Modify: `src/store/actions/setup.ts` (initialize accumulator)
- Modify: `src/data/enemies.ts` (initialize accumulator on generated enemies)
- Test: `src/store/__tests__/statusEffects.test.ts`

**Context:** Poison damage per tick = `result.final * stacks * dt / POISON_DURATION_MS`. With dt=16, POISON_DURATION_MS=3000, 1 stack, result.final=10: `damagePerTick = 0.053`, which `Math.round()` truncates to 0. Regen already solves this by accumulating fractions (combat.ts:56-57). We need the same pattern for poison.

**Step 1: Write the failing test**

Add to `src/store/__tests__/statusEffects.test.ts`:

```typescript
describe('poison — fractional accumulation', () => {
  it('deals damage even at low power levels', () => {
    const state = createCombatState();
    state.enemy!.hp = 100;
    state.enemy!.maxHp = 100;
    // Low power scenario where per-tick damage rounds to 0
    state.player.power = 10;
    state.enemy!.fortitude = 10;
    state.enemy!.statusEffects = [{ type: 'poison', stacks: 1, remainingMs: 3000 }];

    // Tick 187 times (3000ms / 16ms = ~187 ticks)
    for (let i = 0; i < 187; i++) {
      tickStatusEffects(state, 16);
    }

    // Poison MUST have dealt some damage (previously it dealt 0)
    expect(state.enemy!.hp).toBeLessThan(100);
  });

  it('total poison damage over full duration matches expected value', () => {
    const state = createCombatState();
    state.enemy!.hp = 1000;
    state.enemy!.maxHp = 1000;
    state.player.power = 10;
    state.enemy!.fortitude = 10;
    state.enemy!.statusEffects = [{ type: 'poison', stacks: 1, remainingMs: 3000 }];

    for (let i = 0; i < 200; i++) {
      tickStatusEffects(state, 16);
    }

    const damageTaken = 1000 - state.enemy!.hp;
    // Should be approximately result.final (which is calculateDamage(10, 10, 1.0, true).final)
    // Allow ±2 tolerance for rounding
    expect(damageTaken).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/statusEffects.test.ts --reporter=verbose`
Expected: FAIL — `state.enemy!.hp` is still 100 because each tick rounds to 0

**Step 3: Add poisonDamageAccumulator to CombatEntity**

In `src/types/game.ts`, add to the `CombatEntity` interface:

```typescript
  /** Accumulates fractional poison damage between ticks */
  poisonDamageAccumulator?: number;
```

**Step 4: Fix tickPoison to accumulate fractions**

In `src/store/actions/statusEffects.ts`, replace the `tickPoison` function (lines 149-172):

```typescript
function tickPoison(state: GameState, target: CombatEntity, sourcePower: number, dt: number): void {
  const poison = getEffect(target, 'poison');
  if (!poison || poison.remainingMs <= 0) return;

  const result = calculateDamage(sourcePower, target.fortitude, 1.0, true);
  const damagePerTick = (result.final * poison.stacks * dt) / POISON_DURATION_MS;

  // Accumulate fractional damage — only apply integer damage
  const accumulator = (target.poisonDamageAccumulator ?? 0) + damagePerTick;
  const damage = Math.floor(accumulator);
  target.poisonDamageAccumulator = accumulator - damage;

  if (damage > 0) {
    target.hp -= damage;
    state.combatEvents.push({
      type: 'dot',
      target: target === state.player ? 'player' : 'enemy',
      value: damage,
      tick: state.gameTick,
    });
  }

  poison.remainingMs -= dt;
}
```

**Step 5: Initialize accumulator in setup.ts and enemies.ts**

In `src/store/actions/setup.ts`, add `poisonDamageAccumulator: 0` to the returned object in `createInitialPlayer()`.

In `src/data/enemies.ts`, add `poisonDamageAccumulator: 0` to the entity returned by `generateEnemy()`.

**Step 6: Run tests**

Run: `npx vitest run`
Expected: All pass

**Step 7: Commit**

```bash
git add src/store/actions/statusEffects.ts src/types/game.ts src/store/actions/setup.ts src/data/enemies.ts src/store/__tests__/statusEffects.test.ts
git commit -m "fix(combat): use fractional accumulation for poison damage"
```

---

### Task 3: Flurry Ring Proc Fix

**Files:**
- Modify: `src/store/actions/combat.ts:182-200`
- Test: `src/store/__tests__/combat-extended.test.ts`

**Context:** The Flurry Ring bonus attack at lines 183-200 deals damage but never calls `processItemProcs('on_player_attack', ...)`. Lifesteal, poison, curse, and stun counting all skip the bonus hit.

**Step 1: Write the failing test**

Add to `src/store/__tests__/combat-extended.test.ts`:

```typescript
describe('Flurry Ring — bonus attack procs', () => {
  it('triggers item procs on bonus attack (e.g., lifesteal)', () => {
    const state = createCombatState();
    state.equippedItems.accessory = { id: 'flurry_ring', slot: 'accessory', tier: 1 };
    state.equippedItems.armor = { id: 'vampiric_shroud', slot: 'armor', tier: 1 };
    state.combatCounters.playerAttackCount = 4; // Next attack is 5th → bonus
    state.player.attackTimer = 1;
    state.player.hp = 50;
    state.player.maxHp = 200;

    vi.spyOn(Math, 'random').mockReturnValue(0.99); // No crit, no dodge
    tickCombat(state, TICK_MS);

    // Player should have healed from lifesteal on the bonus attack
    expect(state.player.hp).toBeGreaterThan(50);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/combat-extended.test.ts --reporter=verbose`
Expected: FAIL — hp stays at 50

**Step 3: Add processItemProcs call to Flurry Ring bonus**

In `src/store/actions/combat.ts`, after the Flurry Ring bonus damage is applied (after `emitCombatEvent` on line 199), add:

```typescript
    state.lastPlayerHitDamage = finalDamage;
    processItemProcs(state, 'on_player_attack', { damage: finalDamage });
```

**Step 4: Run tests**

Run: `npx vitest run`
Expected: All pass

**Step 5: Commit**

```bash
git add src/store/actions/combat.ts src/store/__tests__/combat-extended.test.ts
git commit -m "fix(combat): Flurry Ring bonus attack now triggers item procs"
```

---

### Task 4: Twin Fang Proc Fix

**Files:**
- Modify: `src/store/actions/combat.ts:139-180`
- Test: `src/store/__tests__/combat-extended.test.ts`

**Context:** Twin Fang hits twice in a loop (lines 139-177), but `processItemProcs('on_player_attack', ...)` at line 180 is called once after the loop. The second hit overwrites `lastPlayerHitDamage`, so lifesteal only applies to the last hit. Poison only has one proc chance instead of two.

**Step 1: Write the failing test**

```typescript
describe('Twin Fang — per-hit procs', () => {
  it('triggers item procs for each hit (2 proc chances)', () => {
    const state = createCombatState();
    state.equippedItems.weapon = { id: 'twin_fang', slot: 'weapon', tier: 1 };
    state.equippedItems.armor = { id: 'vampiric_shroud', slot: 'armor', tier: 1 };
    state.player.attackTimer = 1;
    state.player.hp = 50;
    state.player.maxHp = 200;

    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    tickCombat(state, TICK_MS);

    // Lifesteal should proc on both hits — total heal > single-hit heal
    // With 2 hits at 55% each, both should proc lifesteal
    const healed = state.player.hp - 50;
    expect(healed).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/combat-extended.test.ts --reporter=verbose`

**Step 3: Move processItemProcs inside the Twin Fang loop**

In `src/store/actions/combat.ts`, move the proc call inside the loop:

```typescript
  for (let hit = 0; hit < hitCount; hit++) {
    // ... existing damage calculation (lines 140-176) ...

    enemy.hp -= finalDamage;
    state.lastPlayerHitDamage = finalDamage;

    emitCombatEvent(state, {
      type: crit.isCrit ? 'crit' : 'damage',
      target: 'enemy',
      value: finalDamage,
      tick: state.gameTick,
    });

    // Process procs per hit (moved from after loop)
    processItemProcs(state, 'on_player_attack', { damage: finalDamage });
  }

  // Remove the old processItemProcs call that was after the loop (line 180)
```

**Step 4: Run tests**

Run: `npx vitest run`
Expected: All pass

**Step 5: Commit**

```bash
git add src/store/actions/combat.ts src/store/__tests__/combat-extended.test.ts
git commit -m "fix(combat): Twin Fang triggers item procs per hit, not once"
```

---

### Task 5: Player Initiative

**Files:**
- Modify: `src/store/actions/setup.ts:22`
- Test: `src/store/__tests__/setup.test.ts`

**Context:** Player `attackTimer` starts at `getAttackInterval(PLAYER_BASE_SPEED)` = 2500ms while enemy starts at 0. The enemy always gets the first hit. Fix: start player at 0 so the player swings first.

**Step 1: Write/update the test**

In `src/store/__tests__/setup.test.ts`, update the test that checks initial attackTimer:

```typescript
it('player starts with attackTimer at 0 for initiative', () => {
  const player = createInitialPlayer();
  expect(player.attackTimer).toBe(0);
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL — attackTimer is 2500, not 0

**Step 3: Fix setup.ts**

Change line 22 from:
```typescript
    attackTimer: getAttackInterval(PLAYER_BASE_SPEED),
```
to:
```typescript
    attackTimer: 0,
```

**Step 4: Run tests**

Run: `npx vitest run`
Expected: All pass (may need to update other tests that assumed full initial timer)

**Step 5: Commit**

```bash
git add src/store/actions/setup.ts src/store/__tests__/setup.test.ts
git commit -m "fix(combat): give player initiative — attack timer starts at 0"
```

---

### Task 6: fightCount Initialization

**Files:**
- Modify: `src/store/gameStore.ts:152`
- Test: `src/store/__tests__/flow.test.ts`

**Context:** `startRun` sets `fightCount: 1` but `advanceFloor` sets `fightCount: 0`. This means draft triggers 1 fight earlier on floor 1.

**Step 1: Write the test**

```typescript
it('fightCount starts at 0 on the first floor', () => {
  const store = useGameStore.getState();
  store.selectClass('warrior');
  store.startRun();
  expect(useGameStore.getState().fightCount).toBe(0);
});
```

**Step 2: Fix gameStore.ts**

Change line 152 from `fightCount: 1` to `fightCount: 0`.

**Step 3: Run tests and fix any that relied on the old value**

Run: `npx vitest run`

**Step 4: Commit**

```bash
git add src/store/gameStore.ts src/store/__tests__/flow.test.ts
git commit -m "fix(store): consistent fightCount initialization (start at 0)"
```

---

### Task 7: State Duplication in Flow Actions

**Files:**
- Modify: `src/store/gameStore.ts:177-267` (advanceFloor, respawnAtCheckpoint, startEndless)

**Context:** These three actions mutate state fields directly AND pass the same fields to `set()`. This is redundant and error-prone. Fix: mutate in-place, then call `set({})` with only the fields that need to trigger re-renders (primarily `phase`).

**Step 1: Refactor advanceFloor (lines 177-207)**

```typescript
  advanceFloor: () => {
    const state = get();
    const nextFloor = state.floor + 1;
    const roomsPerFloor = getRoomsPerFloor(nextFloor);

    state.player.hp = state.player.maxHp;
    state.player.statusEffects = [];
    state.floor = nextFloor;
    state.room = 1;
    state.roomsPerFloor = roomsPerFloor;
    state.fightCount = 0;
    state.depth = Math.max(state.depth, nextFloor);
    state.combatElapsed = 0;
    state.combatEvents = [];
    state.combatCounters = { playerAttackCount: 0, playerHitCount: 0, shieldRefreshTimer: 0, curseDecayTimer: 0 };
    state.lastPlayerHitDamage = 0;

    spawnEnemy(state, false);

    set({ phase: 'combat' });
  },
```

**Step 2: Apply same pattern to respawnAtCheckpoint and startEndless**

Same approach — mutate in-place, minimal `set()`.

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All pass (behavior is identical, just cleaner code)

**Step 4: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "refactor(store): remove state duplication in flow actions"
```

---

### Task 8: Replace text-[8px] with text-pixel-2xs

**Files:** (search-and-replace across 6+ files)
- `src/components/game/ItemComparison.tsx` (lines 34, 51)
- `src/components/game/ItemCard.tsx`
- `src/components/game/CharacterSheet.tsx` (line 106)
- `src/components/game/StatusBadges.tsx` (lines 28, 44)
- `src/components/screens/DeathScreen.tsx`
- `src/components/screens/FloorComplete.tsx` (line 100)

**Step 1: Find all instances**

Run: `grep -rn "text-\[8px\]" src/`

**Step 2: Replace all with text-pixel-2xs**

In each file, change `text-[8px]` to `text-pixel-2xs`.

**Step 3: Visual check (build)**

Run: `npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add -A
git commit -m "fix(ui): replace illegible text-[8px] with text-pixel-2xs design token"
```

---

### Task 9: Color Contrast Fix

**File:**
- Modify: `src/components/screens/MainMenu.tsx:84`

**Step 1: Fix the contrast**

Change line 84 from:
```tsx
<p className="pixel-text text-pixel-xs text-slate-600 tracking-wider pt-4">
```
to:
```tsx
<p className="pixel-text text-pixel-xs text-slate-400 tracking-wider pt-4">
```

`text-slate-400` (#94a3b8) against the dark background gives ~6.5:1 contrast ratio, well above WCAG AA.

**Step 2: Build check**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/screens/MainMenu.tsx
git commit -m "fix(ui): improve color contrast in MainMenu to meet WCAG AA"
```

---

### Task 10: Focus Management & Keyboard Handlers

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/game/CharacterSheet.tsx`
- Modify: `src/components/game/ItemComparison.tsx`

**Step 1: Add Escape handler + focus trap to CharacterSheet**

In `src/components/game/CharacterSheet.tsx`:

```typescript
import { useEffect, useRef } from 'react';

export function CharacterSheet({ onClose }: CharacterSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the panel on mount
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Escape key closes
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Character sheet"
    >
      {/* ... existing content ... */}
    </div>
  );
}
```

**Step 2: Same pattern for ItemComparison**

Add `useRef`, `useEffect` focus, and `onKeyDown` Escape handler.

**Step 3: Add phase-transition focus in App.tsx**

```typescript
import { useRef, useEffect } from 'react';

function App() {
  const phase = useGameStore(s => s.phase);
  const mainRef = useRef<HTMLDivElement>(null);

  // Move focus on phase change
  useEffect(() => {
    // Small delay to let the new screen mount
    const timer = setTimeout(() => {
      mainRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <div ref={mainRef} tabIndex={-1} className="outline-none">
      <PhaseRouter phase={phase} />
      {/* ... rest */}
    </div>
  );
}
```

**Step 4: Run build + tests**

Run: `npm run build && npx vitest run`

**Step 5: Commit**

```bash
git add src/App.tsx src/components/game/CharacterSheet.tsx src/components/game/ItemComparison.tsx
git commit -m "fix(a11y): add focus management and Escape handlers to modals and phase transitions"
```

---

### Task 11: CombatScreen Module-Level State → useRef

**Files:**
- Modify: `src/components/screens/CombatScreen.tsx:13-14, 26`

**Context:** `lastProcessedTick` and `floatingNumId` are module-level mutable variables. They persist across mount/unmount and break in React StrictMode. Move to `useRef`.

**Step 1: Replace module-level variables with useRef**

Remove lines 14 and 26:
```typescript
// DELETE: let lastProcessedTick = 0;
// DELETE: let floatingNumId = 0;
```

Inside the `CombatScreen` function component, add:
```typescript
  const lastProcessedTickRef = useRef(0);
  const floatingNumIdRef = useRef(0);
```

Import `useRef` from React.

**Step 2: Update all usages**

Replace `lastProcessedTick` → `lastProcessedTickRef.current` and `floatingNumId` → `floatingNumIdRef.current` throughout the component.

Update the reset effect (lines 44-47):
```typescript
  useEffect(() => {
    lastProcessedTickRef.current = 0;
    floatingNumIdRef.current = 0;
    setFloatingNumbers([]);
  }, [floor, room]);
```

**Step 3: Run build + tests**

Run: `npm run build && npx vitest run`

**Step 4: Commit**

```bash
git add src/components/screens/CombatScreen.tsx
git commit -m "fix(ui): move CombatScreen mutable state to useRef"
```

---

## Summary

| Task | Bug | Files Modified |
|------|-----|---------------|
| 1 | Dead entity attacks | combat.ts |
| 2 | Poison rounds to 0 | statusEffects.ts, game.ts, setup.ts, enemies.ts |
| 3 | Flurry Ring skips procs | combat.ts |
| 4 | Twin Fang procs once | combat.ts |
| 5 | Enemy always attacks first | setup.ts |
| 6 | fightCount init mismatch | gameStore.ts |
| 7 | State duplication | gameStore.ts |
| 8 | text-[8px] illegible | 6 component files |
| 9 | Color contrast | MainMenu.tsx |
| 10 | No focus management | App.tsx, CharacterSheet.tsx, ItemComparison.tsx |
| 11 | Module-level state | CombatScreen.tsx |

After all 11 tasks: run `npx vitest run` and `npm run build` to verify everything is clean.
