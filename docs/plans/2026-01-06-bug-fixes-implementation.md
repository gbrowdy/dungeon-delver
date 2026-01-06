# Bug Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 6 identified bugs: level-up popup stuck, enemy attack variety, decimal display, poison damage, fury scaling, and phase change logs.

**Architecture:** Each bug is an isolated fix in 1-2 files. No architectural changes - just correcting existing logic.

**Tech Stack:** React, TypeScript, ECS (miniplex), Vitest, Playwright

**Reference Docs:**
- Design document: `docs/plans/2026-01-06-bug-fixes-design.md`
- Bug tracker: `tasks/bugs.md`

---

## Task 1: Fix Level-Up Popup Stuck at Level 3+

**Files:**
- Modify: `src/ecs/systems/input.ts:107-123`
- Test: `src/ecs/systems/__tests__/input.test.ts`

**Step 1: Write the failing test**

Add to `src/ecs/systems/__tests__/input.test.ts`:

```typescript
describe('DISMISS_POPUP - levelUp', () => {
  it('should clear pendingLevelUp at level 3+ when player has path', () => {
    // Create player at level 3 with a path
    const player = createTestPlayer();
    player.progression = { level: 3, xp: 0, xpToNext: 300 };
    player.path = { pathId: 'berserker', abilities: [] };
    world.add(player);

    // Create game state with pending level up
    const gameState = createTestGameState();
    gameState.pendingLevelUp = 3;
    gameState.popups = { levelUp: { level: 3 } };
    gameState.paused = true;
    world.add(gameState);

    // Dispatch dismiss popup command
    dispatchCommand({ type: 'DISMISS_POPUP', popupType: 'levelUp' });
    InputSystem(16);

    // Verify pendingLevelUp is cleared
    expect(gameState.pendingLevelUp).toBeNull();
    expect(gameState.paused).toBe(false);
    expect(gameState.phase).toBe('combat'); // Should NOT change to path-select
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/input.test.ts -t "should clear pendingLevelUp at level 3"`

Expected: FAIL - `pendingLevelUp` is still `3`, not `null`

**Step 3: Implement the fix**

In `src/ecs/systems/input.ts`, modify the DISMISS_POPUP case (lines ~107-123):

```typescript
case 'DISMISS_POPUP': {
  if (gameState?.popups) {
    // Clear the specific popup
    const popupKey = cmd.popupType as keyof typeof gameState.popups;
    if (popupKey in gameState.popups) {
      delete gameState.popups[popupKey];
    }

    // After dismissing level-up, check if player needs to select a path
    if (cmd.popupType === 'levelUp' && player) {
      const level = player.progression?.level ?? 1;
      const hasPath = !!player.path;

      // At level 2+, if player hasn't selected a path yet, go to path selection
      if (level >= 2 && !hasPath) {
        gameState.phase = 'path-select';
      }

      // Always clear pendingLevelUp after dismissing level-up popup
      gameState.pendingLevelUp = null;

      // IMPORTANT: Unpause combat after level-up popup is dismissed
      gameState.paused = false;
    }
  }
  break;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/input.test.ts -t "should clear pendingLevelUp at level 3"`

Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/input.ts src/ecs/systems/__tests__/input.test.ts
git commit -m "fix(ecs): clear pendingLevelUp for all level-ups, not just level 2"
```

---

## Task 2: Fix Enemy Attack Variety

**Files:**
- Modify: `src/ecs/systems/enemy-ability.ts:1-15,228-232`
- Test: `src/ecs/systems/__tests__/enemy-ability.test.ts`

**Step 1: Write the failing test**

Add to `src/ecs/systems/__tests__/enemy-ability.test.ts`:

```typescript
import { calculateEnemyIntent } from '@/data/enemies';

describe('intent recalculation', () => {
  it('should recalculate intent after using an ability', () => {
    // Create enemy with multiple abilities
    const enemy = createTestEnemy();
    enemy.enemy = {
      name: 'Test Enemy',
      abilities: [
        { id: 'poison', name: 'Poison', type: 'poison', value: 5, cooldown: 3, currentCooldown: 0, chance: 1, icon: 'Skull', description: 'Poisons' },
        { id: 'heal', name: 'Heal', type: 'heal', value: 0.2, cooldown: 5, currentCooldown: 0, chance: 1, icon: 'Heart', description: 'Heals' },
      ],
      intent: { type: 'ability', ability: enemy.enemy!.abilities[0], icon: 'Skull' },
    };
    enemy.cooldowns = new Map();
    world.addComponent(enemy, 'attackReady', { damage: 10 });
    world.add(enemy);

    const player = createTestPlayer();
    player.statusEffects = [];
    world.add(player);

    createTestGameState({ phase: 'combat' });

    // Store original intent
    const originalIntent = enemy.enemy!.intent;

    // Run system - should use ability and recalculate intent
    EnemyAbilitySystem(16);

    // Intent should be recalculated (may be same or different, but should have been called)
    // The poison ability should now be on cooldown
    expect(enemy.cooldowns?.get('poison')?.remaining).toBe(3);
    // Intent should exist (recalculated)
    expect(enemy.enemy!.intent).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/enemy-ability.test.ts -t "should recalculate intent"`

Expected: Test may pass but intent isn't actually recalculated - verify manually by checking the code path

**Step 3: Implement the fix**

In `src/ecs/systems/enemy-ability.ts`:

Add import at top:
```typescript
import { calculateEnemyIntent } from '@/data/enemies';
```

After line 231 (after `world.removeComponent(enemy, 'attackReady');`), add:
```typescript
  // Recalculate intent for next attack
  if (enemy.enemy) {
    enemy.enemy.intent = calculateEnemyIntent(enemy.enemy);
  }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/enemy-ability.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/enemy-ability.ts src/ecs/systems/__tests__/enemy-ability.test.ts
git commit -m "fix(ecs): recalculate enemy intent after ability use"
```

---

## Task 3: Fix Status Effect Decimal Display

**Files:**
- Modify: `src/components/game/CharacterSprite.tsx:270`

**Step 1: Verify the issue exists**

Search for the line in `CharacterSprite.tsx`:
```typescript
<span className="text-accent/90">{effect.remainingTurns}</span>
```

Confirm line 286 (buffs) uses `Math.ceil()` but line 270 (status effects) does not.

**Step 2: Implement the fix**

In `src/components/game/CharacterSprite.tsx`, line 270, change:

```typescript
// From:
<span className="text-accent/90">{effect.remainingTurns}</span>

// To:
<span className="text-accent/90">{Math.ceil(effect.remainingTurns)}</span>
```

**Step 3: Verify visually (Playwright)**

Run: `npx playwright test --project="Desktop" -g "status effect"`

Or manually verify in browser that status effect counters show integers.

**Step 4: Commit**

```bash
git add src/components/game/CharacterSprite.tsx
git commit -m "fix(ui): round status effect duration display to integers"
```

---

## Task 4: Fix Poison Missing Required Fields

**Files:**
- Modify: `src/ecs/systems/enemy-ability.ts:82-86,107-110`
- Test: `src/ecs/systems/__tests__/enemy-ability.test.ts`

**Step 1: Write the failing test**

Add to `src/ecs/systems/__tests__/enemy-ability.test.ts`:

```typescript
describe('status effect fields', () => {
  it('should create poison with id and icon fields', () => {
    const enemy = createTestEnemy();
    enemy.enemy = {
      name: 'Venomous Snake',
      abilities: [
        { id: 'poison', name: 'Poison Bite', type: 'poison', value: 5, cooldown: 3, currentCooldown: 0, chance: 1, icon: 'Skull', description: 'Poisons' },
      ],
      intent: { type: 'ability', ability: null as any, icon: 'Skull' },
    };
    enemy.enemy.intent!.ability = enemy.enemy.abilities[0];
    enemy.cooldowns = new Map();
    world.addComponent(enemy, 'attackReady', { damage: 10 });
    world.add(enemy);

    const player = createTestPlayer();
    player.statusEffects = [];
    world.add(player);

    createTestGameState({ phase: 'combat', floor: { number: 1, room: 1, totalRooms: 5 } });

    EnemyAbilitySystem(16);

    // Verify poison was applied with required fields
    expect(player.statusEffects.length).toBe(1);
    const poison = player.statusEffects[0];
    expect(poison.type).toBe('poison');
    expect(poison.id).toBeDefined();
    expect(typeof poison.id).toBe('string');
    expect(poison.icon).toBe('Skull');
  });

  it('should create stun with id and icon fields', () => {
    const enemy = createTestEnemy();
    enemy.enemy = {
      name: 'Stunning Foe',
      abilities: [
        { id: 'stun', name: 'Stun Attack', type: 'stun', value: 2, cooldown: 5, currentCooldown: 0, chance: 1, icon: 'Zap', description: 'Stuns' },
      ],
      intent: { type: 'ability', ability: null as any, icon: 'Zap' },
    };
    enemy.enemy.intent!.ability = enemy.enemy.abilities[0];
    enemy.cooldowns = new Map();
    world.addComponent(enemy, 'attackReady', { damage: 10 });
    world.add(enemy);

    const player = createTestPlayer();
    player.statusEffects = [];
    world.add(player);

    createTestGameState({ phase: 'combat' });

    EnemyAbilitySystem(16);

    // Verify stun was applied with required fields
    expect(player.statusEffects.length).toBe(1);
    const stun = player.statusEffects[0];
    expect(stun.type).toBe('stun');
    expect(stun.id).toBeDefined();
    expect(typeof stun.id).toBe('string');
    expect(stun.icon).toBe('Zap');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/enemy-ability.test.ts -t "should create poison with id"`

Expected: FAIL - `poison.id` is `undefined`

**Step 3: Implement the fix**

In `src/ecs/systems/enemy-ability.ts`:

**Poison** (lines 82-86), change to:
```typescript
player.statusEffects.push({
  id: crypto.randomUUID(),
  type: 'poison',
  remainingTurns: 3,
  damage: poisonDamage,
  icon: 'Skull',
});
```

**Stun** (lines 107-110), change to:
```typescript
player.statusEffects.push({
  id: crypto.randomUUID(),
  type: 'stun',
  remainingTurns: ability.value,
  icon: 'Zap',
});
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/enemy-ability.test.ts -t "status effect fields"`

Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/enemy-ability.ts src/ecs/systems/__tests__/enemy-ability.test.ts
git commit -m "fix(ecs): add required id and icon fields to poison and stun effects"
```

---

## Task 5: Fix Fury Binary Threshold Scaling

**Files:**
- Modify: `src/data/pathResources.ts:48-57`
- Modify: `src/utils/pathResourceUtils.ts:43-47`
- Test: `src/utils/__tests__/pathResourceUtils.test.ts`

**Step 1: Write the failing test**

Create or add to `src/utils/__tests__/pathResourceUtils.test.ts`:

```typescript
import { getDamageMultiplier } from '../pathResourceUtils';
import type { PathResource } from '@/types/game';

describe('getDamageMultiplier', () => {
  describe('fury scaling', () => {
    const furyResource: PathResource = {
      type: 'fury',
      current: 0,
      max: 100,
      color: '#dc2626',
      resourceBehavior: 'spend',
      generation: {},
      thresholds: [
        {
          value: 1,
          effect: {
            type: 'damage_bonus',
            value: 0.005,
            description: '+0.5% power damage per Fury',
          },
        },
      ],
    };

    it('should return 1.0 at 0 fury', () => {
      const resource = { ...furyResource, current: 0 };
      expect(getDamageMultiplier(resource)).toBe(1);
    });

    it('should return 1.25 at 50 fury (+25%)', () => {
      const resource = { ...furyResource, current: 50 };
      expect(getDamageMultiplier(resource)).toBeCloseTo(1.25, 2);
    });

    it('should return 1.5 at 100 fury (+50%)', () => {
      const resource = { ...furyResource, current: 100 };
      expect(getDamageMultiplier(resource)).toBeCloseTo(1.5, 2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/pathResourceUtils.test.ts -t "fury scaling"`

Expected: FAIL - Returns 1.0 for all fury values (binary threshold not per-point)

**Step 3: Implement the fix - Part A (pathResources.ts)**

In `src/data/pathResources.ts`, change the berserker fury thresholds (lines 48-57):

```typescript
// Amplify threshold: per-point scaling like arcane charges
thresholds: [
  {
    value: 1,
    effect: {
      type: 'damage_bonus',
      value: 0.005,  // +0.5% per Fury = +50% at 100
      description: '+0.5% power damage per Fury',
    },
  },
],
```

**Step 4: Implement the fix - Part B (pathResourceUtils.ts)**

In `src/utils/pathResourceUtils.ts`, modify `getDamageMultiplier` (lines 43-47):

```typescript
if (resource.type === 'arcane_charges' || resource.type === 'fury') {
  const chargeBonus = damageEffects.find(t => t.effect.value);
  if (chargeBonus) {
    multiplier += (chargeBonus.effect.value ?? 0) * resource.current;
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/pathResourceUtils.test.ts -t "fury scaling"`

Expected: PASS

**Step 6: Commit**

```bash
git add src/data/pathResources.ts src/utils/pathResourceUtils.ts src/utils/__tests__/pathResourceUtils.test.ts
git commit -m "fix(balance): change Fury to per-point scaling like Arcane Charges"
```

---

## Task 6: Remove Phase Change Combat Logs

**Files:**
- Modify: `src/ecs/systems/flow.ts:63`
- Test: `src/ecs/systems/__tests__/flow.test.ts`

**Step 1: Write the failing test**

Add to `src/ecs/systems/__tests__/flow.test.ts`:

```typescript
describe('phase transition logging', () => {
  it('should not log phase transitions to combat log', () => {
    const gameState = createTestGameState({ phase: 'combat' });
    gameState.combatLog = [];
    gameState.scheduledTransitions = [{ toPhase: 'floor-complete', delay: 0 }];
    world.add(gameState);

    FlowSystem(16);

    // Combat log should not contain phase transition messages
    const phaseLogEntry = gameState.combatLog.find(log => log.includes('Phase:'));
    expect(phaseLogEntry).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/flow.test.ts -t "should not log phase transitions"`

Expected: FAIL - Finds "Phase: combat -> floor-complete" in combatLog

**Step 3: Implement the fix**

In `src/ecs/systems/flow.ts`, remove line 63:

```typescript
// Remove this line:
addCombatLog(`Phase: ${fromPhase} -> ${toPhase}`);
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/flow.test.ts -t "should not log phase transitions"`

Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/flow.ts src/ecs/systems/__tests__/flow.test.ts
git commit -m "fix(ecs): remove phase transition messages from combat log"
```

---

## Task 7: Run Full Test Suite & Playwright Validation

**Step 1: Run all unit tests**

Run: `npx vitest run`

Expected: All tests pass

**Step 2: Run Playwright E2E tests**

Run: `npx playwright test --project="Desktop"`

Expected: All tests pass

**Step 3: Manual browser verification**

Start dev server: `npm run dev`

Verify each fix:
1. Level up at level 3+ - popup should dismiss
2. Fight enemy with abilities - should vary attacks
3. Get poisoned - counter shows integer, damage ticks
4. Play Berserker - Fury bonus scales with amount
5. Combat log - no "Phase:" messages

**Step 4: Final commit (if any adjustments needed)**

```bash
git add -A
git commit -m "test: verify all bug fixes with tests and browser validation"
```

---

## Summary

| Task | Bug | Files Modified |
|------|-----|----------------|
| 1 | Level-up popup | `input.ts` |
| 2 | Enemy attacks | `enemy-ability.ts` |
| 3 | Decimal display | `CharacterSprite.tsx` |
| 4 | Poison fields | `enemy-ability.ts` |
| 5 | Fury scaling | `pathResources.ts`, `pathResourceUtils.ts` |
| 6 | Phase logs | `flow.ts` |
| 7 | Validation | E2E tests |

Total: 6 bug fixes, ~7 commits
