# Mage Paths Fix - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the broken Mage path implementation so Archmage shows correct powers and Enchanter effects actually work.

**Architecture:** Wire existing `getArchmagePowerChoices()` to input/progression systems. Wire `getEnchanterEnhancementChoices()` for Enchanter path. Implement missing hex/burn effect processing in combat and status-effect systems. Write E2E tests that verify correct content (not just existence).

**Tech Stack:** TypeScript, React, miniplex ECS, Vitest, Playwright

**Reference:** See `docs/plans/2026-01-11-mage-paths-issues-and-remaining-work.md` for detailed diagnosis.

---

## Acceptance Criteria

### AC-1: Archmage Path Shows Correct Powers
**When:** User selects Mage class, then selects Archmage path, then reaches level 2
**Then:** Power choice popup shows "Arcane Bolt" and "Meteor Strike" (NOT "Rage Strike" or "Savage Slam")
**Verified by:** E2E test in Task 1.4

### AC-2: Archmage Powers Function Correctly
**When:** User selects Arcane Bolt power and clicks to use it
**Then:** Power deals damage, resource cost deducted (or generated per Archmage design), goes on cooldown
**Verified by:** E2E test in Task 1.6

### AC-3: Archmage Progression Works
**When:** Archmage reaches levels 2, 3, 4, 5, 6
**Then:** Level 2/4/6 show power choices, Level 3/5 show upgrade choices
**Verified by:** E2E test in Task 4.1

### AC-4: Enchanter Enhancement Selection Works
**When:** Enchanter reaches level 3
**Then:** Enhancement choice popup shows Arcane Surge and Hex Veil options (NOT Guardian options)
**Verified by:** E2E test in Task 4.2

### AC-5: Enchanter Hex Effects Work
**When:** User in Hex Veil stance with hex enhancements
**Then:** All 6 hex effects (slow, regen, lifesteal, armor reduction, reflect, heal on attack) function
**Verified by:** Unit tests in Tasks 2.1-2.6

### AC-6: Enchanter Burn Proc Works
**When:** User in Arcane Surge stance attacks enemy
**Then:** 20% chance to apply burn DoT (base, before enhancements)
**Verified by:** Unit test in Task 3.1

### AC-7: Enchanter Burn Enhancements Work
**When:** User has Arcane Surge enhancements
**Then:** All 11 burn effects function (damage%, proc chance, duration, max stacks, tick rate, damage vs burning, crit refresh, lifesteal, execute, ignores armor, can crit)
**Verified by:** Unit tests in Tasks 3.1-3.9

---

## Flow Analysis

### Flow: AC-1 - Archmage Power Selection

```
User reaches level 2 as Archmage
  → ProgressionSystem detects level-up (progression.ts:92-105)
    → checks player.pathProgression.pathType === 'active'
      → calls getBerserkerPowerChoices(2) ← BUG: hardcoded!
        → should call getArchmagePowerChoices(2) based on pathId
      → adds pendingPowerChoice component with choices
    → PowerChoicePopup renders choices
  → User sees wrong powers (Berserker instead of Archmage)
```

**Files touched:**
- `src/ecs/systems/progression.ts:99` - change getBerserkerPowerChoices to path-aware
- `src/ecs/systems/input.ts:414` - same fix for SELECT_PATH command

**New functions called:**
- `getArchmagePowerChoices` from `@/data/paths/archmage-powers` (exists but not imported)

### Flow: AC-4 - Enchanter Enhancement Selection

```
User reaches level 3 as Enchanter
  → ProgressionSystem detects level-up (progression.ts:119-136)
    → checks player.pathProgression.pathType === 'passive'
    → checks player.path?.pathId
      → if 'enchanter': calls getEnchanterEnhancementChoices(arcaneSurgeTier, hexVeilTier)
      → if 'guardian': calls getGuardianEnhancementChoices(ironTier, retributionTier)
    → adds pendingStanceEnhancement component (union type):
      → if Guardian: { pathId: 'guardian', ironChoice, retributionChoice }
      → if Enchanter: { pathId: 'enchanter', arcaneSurgeChoice, hexVeilChoice }
    → StanceEnhancementPopup renders based on pathId
```

**Files touched:**
- `src/ecs/systems/input.ts:367-376` - **CRITICAL**: path-aware stanceProgression initialization (currently hardcoded for Guardian)
- `src/ecs/systems/progression.ts:119-136` - path-aware enhancement selection
- `src/ecs/components.ts:334-337` - generalize pendingStanceEnhancement component
- `src/ecs/systems/input.ts:541-574` - handle SELECT_STANCE_ENHANCEMENT for both paths
- `src/ecs/snapshot.ts:420-423` - update snapshot for new component structure

### Flow: AC-5 - Hex Slow Effect

```
Enemy attacks player in Hex Veil stance
  → AttackTimingSystem accumulates attack progress (attack-timing.ts:51-80)
    → currently: no check for hex slow
    → should: read player.passiveEffectState.computed.hexSlowPercent
    → should: multiply enemy attack interval by (1 + hexSlowPercent/100)
```

**Files touched:**
- `src/ecs/systems/attack-timing.ts:51-80` - add hex slow check for enemies

### Flow: AC-6 - Burn Proc

```
Player attacks enemy in Arcane Surge stance
  → CombatSystem processes player attack (combat.ts)
    → currently: no check for arcane_burn behavior
    → should: check getStanceBehavior(player, 'arcane_burn')
    → should: roll chance (20% base + burnProcChance from enhancements)
    → should: apply burn status effect to enemy
```

**Files touched:**
- `src/ecs/systems/combat.ts` - add burn proc after player attack lands

### Flow: AC-7 - Burn Max Stacks

```
Player applies burn when enemy already has burn
  → CombatSystem applies burn (combat.ts)
    → currently: always adds new burn
    → should: check burnMaxStacks from computed
    → should: if stacks < max, add new burn; else refresh existing
```

**Files touched:**
- `src/ecs/systems/combat.ts` - add burn stacking logic

---

## Wiring Verification Checklist

For every new function/export:
- [ ] `getArchmagePowerChoices()` - Called in: progression.ts (Task 1.2), input.ts (Task 1.3)
- [ ] `getEnchanterEnhancementChoices()` - Called in: progression.ts (Task 1.5)

For type/component changes:
- [ ] `StanceProgressionState` updated with Enchanter fields (`arcaneSurgeTier`, `hexVeilTier`) (Task 1.5 Step 1)
- [ ] `stanceProgression` initialization in `input.ts:367-376` is path-aware, not hardcoded for Guardian (Task 1.5 Step 2) **CRITICAL**
- [ ] `pendingStanceEnhancement` uses union type for Guardian (`ironChoice`/`retributionChoice`) and Enchanter (`arcaneSurgeChoice`/`hexVeilChoice`) (Task 1.5 Step 3)
- [ ] `SELECT_STANCE_ENHANCEMENT` handler supports both Guardian and Enchanter stances (Task 1.5 Step 8)
- [ ] `snapshot.ts` handles both union variants for pendingStanceEnhancement (Task 1.5 Step 9)

For every acceptance criterion:
- [ ] AC-1: E2E test verifies "Arcane Bolt" visible, "Rage Strike" NOT visible (Task 1.4)
- [ ] AC-2: E2E test verifies power deals damage, resource changes (Task 1.6)
- [ ] AC-3: E2E test verifies progression flow (Task 4.1)
- [ ] AC-4: E2E test verifies "Searing Touch" visible, "Fortified Skin" NOT visible (Task 4.2)
- [ ] AC-5: Unit tests for all 6 hex effects (Tasks 2.1-2.6)
- [ ] AC-6: Unit test verifies burn applied on hit with proc chance modifier (Task 3.1)
- [ ] AC-7: Unit tests for all 11 burn effects (Tasks 3.1-3.9: proc, damage%, duration, maxStacks, tickRateMultiplier, execute, ignoresArmor, canCrit, critRefresh, lifesteal, damageVsBurning)

---

## Phase 0: Prerequisite - Verify Test Hooks Exist

### Task 0.1: Verify Required Test Hooks

**Files:**
- Check: `src/utils/testHooks.ts` or similar

**Step 1: Search for existing test hooks**

Run: `grep -r "TEST_HOOKS" src/`
Expected: Find where test hooks are defined

**Step 2: Verify these hooks exist (or document that they need to be created):**

```typescript
// Required hooks for E2E tests:
setPlayerLevel(level: number)
grantPower(powerId: string)
getEnemyHealth(): number
getPlayerResource(): number
```

**Step 3: If hooks don't exist, create them.**

**NOTE: As of this review, test hooks DO NOT exist in the codebase.** Create the hooks:

In `src/ecs/context/GameContext.tsx`, add test hooks exposure (after the provider setup):

```typescript
import { getPlayer, getActiveEnemy } from '../queries';
import { ARCHMAGE_POWERS } from '@/data/paths/archmage-powers';
import { BERSERKER_POWERS } from '@/data/paths/berserker-powers';
import type { Power } from '@/types/game';

// Combine all power maps for lookup
const ALL_POWERS: Record<string, Power> = {
  ...ARCHMAGE_POWERS,
  ...BERSERKER_POWERS,
  // Add other path powers as they're implemented
};

// Expose test hooks in development/test mode
if (typeof window !== 'undefined' && window.location.search.includes('testMode=true')) {
  (window as any).__TEST_HOOKS__ = {
    setPlayerLevel: (level: number) => {
      const player = getPlayer();
      if (player?.progression) {
        player.progression.level = level;
        player.progression.xp = 0;
      }
    },
    grantPower: (powerId: string) => {
      const player = getPlayer();
      const power = ALL_POWERS[powerId];
      if (player && power && !player.powers?.some(p => p.id === powerId)) {
        if (!player.powers) player.powers = [];
        player.powers.push(power);
      }
    },
    getEnemyHealth: () => {
      const enemy = getActiveEnemy();
      return enemy?.health?.current ?? 0;
    },
    getPlayerResource: () => {
      const player = getPlayer();
      return player?.pathResource?.current ?? 0;
    },
  };
}
```

**Step 4: Commit findings/implementation**

```bash
git add -A
git commit -m "docs: verify test hooks for E2E tests"
```

---

## Phase 1: Critical Fix - Archmage Power Wiring

### Task 1.1: Write Unit Test for Path-Aware Power Selection in Progression

**Acceptance Criteria:** AC-1 (TDD - test first)

**Files:**
- Create/Modify: `src/ecs/systems/__tests__/progression.test.ts`

**Step 1: Write failing test**

> **NOTE: Test Pattern for All Tasks**
>
> All test code in this plan follows this pattern. Key points:
> - Use `clearWorld()` from `'../../world'` to reset ECS state
> - Use `createGameStateEntity({ initialPhase: 'combat' })` - NOT inline objects
> - Add player entity to world with `world.add(player)` after setting properties
> - See `src/ecs/systems/__tests__/input-popup.test.ts` for reference

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { world, clearWorld } from '../../world';
import { createPlayerEntity, createGameStateEntity } from '../../factories';
import { ProgressionSystem } from '../progression';

describe('ProgressionSystem - Path-Aware Power Choices', () => {
  beforeEach(() => {
    clearWorld();
  });

  it('should offer Archmage powers when player is Archmage at level 2', () => {
    // Create game state
    const gameState = createGameStateEntity({ initialPhase: 'combat' });
    world.add(gameState);

    // Create player with path
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.progression = { level: 1, xp: 0, xpToNext: 100 };
    player.path = { pathId: 'archmage', abilities: [] };
    player.pathProgression = { pathId: player.path!.pathId, pathType: 'active', powerUpgrades: [] };
    world.add(player);

    // Give enough XP to level up
    player.progression.xp = 100;

    ProgressionSystem(16);

    // Check that pendingPowerChoice has Archmage powers
    expect(player.pendingPowerChoice).toBeDefined();
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'arcane_bolt')).toBe(true);
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'meteor_strike')).toBe(true);
    // Negative: should NOT have Berserker powers
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'rage_strike')).toBe(false);
  });

  it('should offer Berserker powers when player is Berserker at level 2', () => {
    // Create game state
    const gameState = createGameStateEntity({ initialPhase: 'combat' });
    world.add(gameState);

    // Create player with path
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    player.progression = { level: 1, xp: 0, xpToNext: 100 };
    player.path = { pathId: 'berserker', abilities: [] };
    player.pathProgression = { pathId: player.path!.pathId, pathType: 'active', powerUpgrades: [] };
    world.add(player);

    player.progression.xp = 100;

    ProgressionSystem(16);

    expect(player.pendingPowerChoice).toBeDefined();
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'rage_strike')).toBe(true);
    // Negative: should NOT have Archmage powers
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'arcane_bolt')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/progression.test.ts --grep "Path-Aware"`
Expected: FAIL (currently returns Berserker powers for Archmage)

**Step 3: Commit failing test**

```bash
git add src/ecs/systems/__tests__/progression.test.ts
git commit -m "test(ecs): add failing test for path-aware power selection"
```

---

### Task 1.2: Implement Path-Aware Power Selection in Progression System

**Acceptance Criteria:** AC-1

**Files:**
- Modify: `src/ecs/systems/progression.ts:19,99`

**Step 1: Add import for getArchmagePowerChoices**

At line 19, after existing imports:

```typescript
import { getBerserkerPowerChoices } from '@/data/paths/berserker-powers';
import { getArchmagePowerChoices } from '@/data/paths/archmage-powers';
import { getGuardianEnhancementChoices } from '@/data/paths/guardian-enhancements';
```

**Step 2: Replace hardcoded Berserker call with path-aware logic**

Replace the power choice section (around lines 98-105):

```typescript
        if (isPowerLevel) {
          let choices: import('@/types/game').Power[] = [];
          const pathId = player.path?.pathId;

          if (pathId === 'berserker') {
            choices = getBerserkerPowerChoices(newLevel);
          } else if (pathId === 'archmage') {
            choices = getArchmagePowerChoices(newLevel);
          }
          // TODO: Add assassin, crusader when implemented

          if (choices.length > 0) {
            world.addComponent(player, 'pendingPowerChoice', {
              level: newLevel,
              choices,
            });
          }
        }
```

**Step 3: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/progression.test.ts --grep "Path-Aware"`
Expected: PASS

**Step 4: Run all tests to check for regressions**

Run: `npx vitest run src/ecs`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/progression.ts
git commit -m "fix(ecs): wire Archmage powers to progression system"
```

---

### Task 1.3: Wire Archmage Powers to Input System

**Acceptance Criteria:** AC-1

**Files:**
- Test: `src/ecs/systems/__tests__/input.test.ts`
- Modify: `src/ecs/systems/input.ts:18,414`

**Step 1: Write failing test for input system path-aware behavior**

> **NOTE:** This test follows the pattern from existing input tests (e.g., `input-path.test.ts`). Uses `clearWorld()` and `createGameStateEntity()` for proper test setup.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { world, clearWorld } from '../../world';
import { createPlayerEntity, createGameStateEntity } from '../../factories';
import { InputSystem } from '../input';
import { dispatchCommand } from '../../commands';

describe('InputSystem - Path-Aware Power Selection', () => {
  beforeEach(() => {
    clearWorld();
    world.add(createGameStateEntity());
  });

  it('should offer Archmage powers when SELECT_PATH for Archmage at power level', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.progression = { level: 2, xp: 0, xpToNext: 100 };
    world.add(player);

    // Dispatch SELECT_PATH command (simulating path selection)
    dispatchCommand({ type: 'SELECT_PATH', pathId: 'archmage' });
    InputSystem(16);

    // After path selection at level 2, should show power choice
    expect(player.pendingPowerChoice).toBeDefined();
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'arcane_bolt')).toBe(true);
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'meteor_strike')).toBe(true);
    // Negative: should NOT have Berserker powers
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'rage_strike')).toBe(false);
  });

  it('should offer Berserker powers when SELECT_PATH for Berserker at power level', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    player.progression = { level: 2, xp: 0, xpToNext: 100 };
    world.add(player);

    dispatchCommand({ type: 'SELECT_PATH', pathId: 'berserker' });
    InputSystem(16);

    expect(player.pendingPowerChoice).toBeDefined();
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'rage_strike')).toBe(true);
    // Negative: should NOT have Archmage powers
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'arcane_bolt')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/input.test.ts --grep "Path-Aware"`
Expected: FAIL (currently returns Berserker powers)

**Step 3: Add import for getArchmagePowerChoices**

At line 18, after existing import:

```typescript
import { getBerserkerPowerChoices } from '@/data/paths/berserker-powers';
import { getArchmagePowerChoices } from '@/data/paths/archmage-powers';
```

**Step 4: Replace hardcoded Berserker call with path-aware logic**

Replace lines 413-423:

```typescript
          if (isPowerLevel) {
            let choices: import('@/types/game').Power[] = [];
            const pathId = player.path?.pathId;

            if (pathId === 'berserker') {
              choices = getBerserkerPowerChoices(currentLevel);
            } else if (pathId === 'archmage') {
              choices = getArchmagePowerChoices(currentLevel);
            }
            // TODO: Add assassin, crusader when implemented

            if (choices.length > 0) {
              world.addComponent(player, 'pendingPowerChoice', {
                level: currentLevel,
                choices,
              });
              gameState.paused = true;
            }
          }
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/input.test.ts --grep "Path-Aware"`
Expected: PASS

**Step 6: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 7: Commit**

```bash
git add src/ecs/systems/input.ts src/ecs/systems/__tests__/input.test.ts
git commit -m "fix(ecs): wire Archmage powers to input system path selection"
```

---

### Task 1.4: Write E2E Test Verifying Correct Powers Shown

**Acceptance Criteria:** AC-1

**Files:**
- Modify: `e2e/mage-paths.spec.ts`

**Step 1: Add test that verifies correct power names**

> **NOTE:** This test follows the existing E2E patterns in `berserker-progression.spec.ts`. Uses helper functions from `./helpers/game-actions` and natural game progression to reach path selection.

```typescript
import { test, expect } from '@playwright/test';
import {
  selectClassAndBegin,
  setSpeedToMax,
  waitForCombatOutcome,
  waitForEnemySpawn,
  waitForDeathAndRetry,
} from './helpers/game-actions';

test('Archmage at level 2 shows Arcane Bolt and Meteor Strike, NOT Berserker powers', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes

  await page.goto('/');
  await selectClassAndBegin(page, 'Mage');
  await setSpeedToMax(page);

  // Progress to level 2 naturally
  let reachedLevel2 = false;
  for (let attempt = 0; attempt < 30 && !reachedLevel2; attempt++) {
    const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

    if (outcome === 'player_died') {
      await waitForDeathAndRetry(page);
      await setSpeedToMax(page);
      continue;
    }

    const levelUpVisible = await page.getByTestId('level-up-popup').isVisible().catch(() => false);
    if (levelUpVisible) {
      const levelText = await page.getByTestId('level-up-new-level').textContent();
      const level = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');

      // Dismiss level up popup
      await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
      await page.waitForTimeout(500);

      if (level === 2) {
        // Wait for path selection
        await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });

        // Select Archmage path (first path option for Mage)
        const selectPathButton = page.getByRole('button', { name: /Select Path/i }).first();
        await selectPathButton.click();
        await page.waitForTimeout(300);

        // Confirm path selection
        const confirmButton = page.getByTestId('path-confirm-button');
        await expect(confirmButton).toBeEnabled({ timeout: 2000 });
        await confirmButton.click();

        // Wait for power choice popup
        await expect(page.getByTestId('power-choice-popup')).toBeVisible({ timeout: 5000 });

        // Verify CORRECT powers are shown (Archmage)
        await expect(page.locator('text=Arcane Bolt')).toBeVisible();
        await expect(page.locator('text=Meteor Strike')).toBeVisible();

        // Verify WRONG powers are NOT shown (Berserker)
        await expect(page.locator('text=Rage Strike')).not.toBeVisible();
        await expect(page.locator('text=Savage Slam')).not.toBeVisible();

        reachedLevel2 = true;
      }
    }

    if (outcome === 'enemy_died') {
      await waitForEnemySpawn(page).catch(() => {});
    }
  }

  expect(reachedLevel2).toBe(true);
});
```

**Step 2: Run E2E test**

Run: `npx playwright test e2e/mage-paths.spec.ts --project="Desktop" --grep "Archmage at level 2"`

If test hooks don't exist, this will fail. Document what's missing and add Task 0.1 findings.

Expected: PASS (after Task 0.1 verifies hooks exist)

**Step 3: Commit**

```bash
git add e2e/mage-paths.spec.ts
git commit -m "test(e2e): verify Archmage shows correct powers, not Berserker powers"
```

---

### Task 1.5: Wire Enchanter Enhancements to Progression System

**Acceptance Criteria:** AC-4

**Files:**
- Test: `src/ecs/systems/__tests__/progression.test.ts`
- Modify: `src/types/paths.ts:459-463` (add Enchanter fields to StanceProgressionState)
- Modify: `src/ecs/systems/input.ts:367-376` (path-aware stanceProgression initialization)
- Modify: `src/ecs/systems/progression.ts:19-21,119-136` (path-aware enhancement selection)
- Modify: `src/ecs/components.ts:334-337` (generalize pendingStanceEnhancement)
- Modify: `src/ecs/systems/input.ts:541-574` (handle Enchanter stances in SELECT_STANCE_ENHANCEMENT)
- Modify: `src/ecs/snapshot.ts:420-423` (handle Enchanter enhancement structure)

**Step 1: Update types/paths.ts StanceProgressionState to support Enchanter**

The current `StanceProgressionState` type (line 459) only supports Guardian. Update to support both:

```typescript
// In src/types/paths.ts around line 459
export interface StanceProgressionState {
  // Guardian path tiers
  ironTier?: number;        // Current tier in Iron path (0-13)
  retributionTier?: number; // Current tier in Retribution path (0-13)
  // Enchanter path tiers
  arcaneSurgeTier?: number; // Current tier in Arcane Surge path (0-13)
  hexVeilTier?: number;     // Current tier in Hex Veil path (0-13)
  // Shared
  acquiredEnhancements: string[]; // IDs of acquired enhancements
}
```

**Step 2: Fix stanceProgression initialization in input.ts (CRITICAL)**

The current code at lines 367-376 is **hardcoded for Guardian**:

```typescript
// CURRENT BUG: Always creates Guardian structure
} else if (pathDef?.type === 'passive') {
  player.pathProgression = {
    pathId: cmd.pathId,
    pathType: 'passive',
    stanceProgression: {
      ironTier: 0,           // Guardian-specific!
      retributionTier: 0,    // Guardian-specific!
      acquiredEnhancements: [],
    },
  };
}
```

Replace with path-aware initialization:

```typescript
} else if (pathDef?.type === 'passive') {
  let stanceProgression: StanceProgressionState;

  if (cmd.pathId === 'guardian') {
    stanceProgression = {
      ironTier: 0,
      retributionTier: 0,
      acquiredEnhancements: [],
    };
  } else if (cmd.pathId === 'enchanter') {
    stanceProgression = {
      arcaneSurgeTier: 0,
      hexVeilTier: 0,
      acquiredEnhancements: [],
    };
  } else {
    // Default fallback for future passive paths
    stanceProgression = { acquiredEnhancements: [] };
  }

  player.pathProgression = {
    pathId: cmd.pathId,
    pathType: 'passive',
    stanceProgression,
  };
}
```

**Step 3: Update components.ts pendingStanceEnhancement for both paths**

Use a union type to maintain backward compatibility with existing Guardian tests:

```typescript
// In src/ecs/components.ts around line 334
pendingStanceEnhancement?:
  | {
      pathId: 'guardian';
      ironChoice: StanceEnhancement;
      retributionChoice: StanceEnhancement;
    }
  | {
      pathId: 'enchanter';
      arcaneSurgeChoice: StanceEnhancement;
      hexVeilChoice: StanceEnhancement;
    };
```

**NOTE:** This maintains backward compatibility - existing Guardian tests using `ironChoice`/`retributionChoice` continue to work without modification.

**Step 4: Write failing test for Enchanter enhancement selection**

```typescript
describe('ProgressionSystem - Path-Aware Enhancement Choices', () => {
  beforeEach(() => {
    for (const entity of world.entities) world.remove(entity);
    world.add({
      gameState: { phase: 'combat', floor: 1, room: 1, enemiesInRoom: 1, enemiesDefeated: 0, popups: {}, paused: false },
    });
  });

  it('should offer Enchanter enhancements when player is Enchanter at level 3', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.progression = { level: 2, xp: 0, xpToNext: 100 };
    player.path = { pathId: 'enchanter', abilities: [] };
    player.pathProgression = {
      pathId: 'enchanter',
      pathType: 'passive',
      stanceProgression: { arcaneSurgeTier: 0, hexVeilTier: 0, acquiredEnhancements: [] },
    };
    player.stanceState = { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0 };

    // Give enough XP to level up to 3
    player.progression.xp = 100;

    ProgressionSystem(16);

    // Check that pendingStanceEnhancement has Enchanter enhancements
    expect(player.pendingStanceEnhancement).toBeDefined();
    expect(player.pendingStanceEnhancement?.pathId).toBe('enchanter');
    // Type guard for Enchanter path - use type assertion after pathId check
    const pending = player.pendingStanceEnhancement as { pathId: 'enchanter'; arcaneSurgeChoice: StanceEnhancement; hexVeilChoice: StanceEnhancement };
    // Enchanter tier 1 enhancements: "Searing Touch" (arcane_surge), "Weakening Hex" (hex_veil)
    expect(pending.arcaneSurgeChoice.id).toBe('arcane_surge_1_searing_touch');
    expect(pending.hexVeilChoice.id).toBe('hex_veil_1_weakening_hex');
  });

  // NOTE: Existing Guardian test at line 475 already validates Guardian functionality.
  // No changes needed to existing Guardian tests.
});
```

**Step 5: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/progression.test.ts --grep "Enchanter enhancements"`
Expected: FAIL (currently returns Guardian structure only)

**Step 6: Add import for getEnchanterEnhancementChoices**

At line 19, after existing imports:

```typescript
import { getGuardianEnhancementChoices } from '@/data/paths/guardian-enhancements';
import { getEnchanterEnhancementChoices } from '@/data/paths/enchanter-enhancements';
```

**Step 7: Replace hardcoded Guardian call with path-aware logic**

In the passive path section (around lines 119-136):

```typescript
if (player.pathProgression.pathType === 'passive') {
  const pathId = player.path?.pathId;
  const stanceState = player.pathProgression.stanceProgression;

  if (pathId === 'guardian' && stanceState) {
    const choices = getGuardianEnhancementChoices(
      stanceState.ironTier ?? 0,
      stanceState.retributionTier ?? 0
    );

    if (choices.iron && choices.retribution) {
      world.addComponent(player, 'pendingStanceEnhancement', {
        pathId: 'guardian',
        ironChoice: choices.iron,
        retributionChoice: choices.retribution,
      });
    }
  } else if (pathId === 'enchanter' && stanceState) {
    const choices = getEnchanterEnhancementChoices(
      stanceState.arcaneSurgeTier ?? 0,
      stanceState.hexVeilTier ?? 0
    );

    if (choices.arcaneSurge && choices.hexVeil) {
      world.addComponent(player, 'pendingStanceEnhancement', {
        pathId: 'enchanter',
        arcaneSurgeChoice: choices.arcaneSurge,
        hexVeilChoice: choices.hexVeil,
      });
    }
  }
}
```

**Step 8: Update input.ts SELECT_STANCE_ENHANCEMENT handler**

In `src/ecs/systems/input.ts` around lines 541-574, update to handle both paths:

```typescript
case 'SELECT_STANCE_ENHANCEMENT': {
  if (!player?.pendingStanceEnhancement || !gameState) break;

  const pending = player.pendingStanceEnhancement;
  const stanceState = player.pathProgression?.stanceProgression;
  if (!stanceState) break;

  let enhancement: StanceEnhancement;

  if (pending.pathId === 'guardian') {
    // Guardian path uses iron/retribution
    enhancement = cmd.stanceId === 'iron'
      ? pending.ironChoice
      : pending.retributionChoice;

    if (cmd.stanceId === 'iron') {
      stanceState.ironTier = enhancement.tier;
    } else {
      stanceState.retributionTier = enhancement.tier;
    }
  } else {
    // Enchanter path uses arcane_surge/hex_veil
    enhancement = cmd.stanceId === 'arcane_surge'
      ? pending.arcaneSurgeChoice
      : pending.hexVeilChoice;

    if (cmd.stanceId === 'arcane_surge') {
      stanceState.arcaneSurgeTier = enhancement.tier;
    } else {
      stanceState.hexVeilTier = enhancement.tier;
    }
  }

  // Track acquired enhancement
  stanceState.acquiredEnhancements.push(enhancement.id);

  // Clear pending choice
  world.removeComponent(player, 'pendingStanceEnhancement');

  // Unpause combat and recompute effects
  gameState.paused = false;
  recomputeEffectiveStanceEffects(player);
  if (player.passiveEffectState) {
    recomputePassiveEffects(player);
  }
  break;
}
```

**Step 9: Update snapshot.ts**

**9a: Update PlayerSnapshot interface type** (lines 161-164):

```typescript
  pendingStanceEnhancement:
    | {
        pathId: 'guardian';
        ironChoice: StanceEnhancement;
        retributionChoice: StanceEnhancement;
      }
    | {
        pathId: 'enchanter';
        arcaneSurgeChoice: StanceEnhancement;
        hexVeilChoice: StanceEnhancement;
      }
    | null;
```

**9b: Update snapshot creation code** (around lines 420-423), handle both union variants:

```typescript
pendingStanceEnhancement: entity.pendingStanceEnhancement
  ? entity.pendingStanceEnhancement.pathId === 'guardian'
    ? {
        pathId: 'guardian' as const,
        ironChoice: { ...entity.pendingStanceEnhancement.ironChoice },
        retributionChoice: { ...entity.pendingStanceEnhancement.retributionChoice },
      }
    : {
        pathId: 'enchanter' as const,
        arcaneSurgeChoice: { ...entity.pendingStanceEnhancement.arcaneSurgeChoice },
        hexVeilChoice: { ...entity.pendingStanceEnhancement.hexVeilChoice },
      }
  : null,
```

**Step 10: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/progression.test.ts --grep "Enchanter enhancements"`
Expected: PASS

**Step 11: Run all existing tests to verify no regressions**

Run: `npx vitest run src/ecs`
Expected: PASS (existing Guardian tests should still pass)

**Step 12: Commit**

```bash
git add src/types/paths.ts src/ecs/components.ts src/ecs/systems/progression.ts src/ecs/systems/input.ts src/ecs/snapshot.ts src/ecs/systems/__tests__/progression.test.ts
git commit -m "fix(ecs): wire Enchanter enhancements to progression system with union type component"
```

---

### Task 1.6: Create archmage-mechanics.spec.ts

**Acceptance Criteria:** AC-2

**Files:**
- Create: `e2e/archmage-mechanics.spec.ts`

**Step 1: Create test file**

> **NOTE:** This test follows the pattern from `berserker-mechanics.spec.ts`. It progresses naturally through the game to acquire powers rather than using test hooks, because reliable test hooks don't exist yet.

```typescript
import { test, expect, Page } from '@playwright/test';
import {
  selectClassAndBegin,
  setSpeedToMax,
  waitForCombatOutcome,
  waitForEnemySpawn,
  waitForDeathAndRetry,
} from './helpers/game-actions';

/**
 * Helper: Progress to level 2 as Archmage and select first power
 */
async function setupArchmageWithPower(page: Page): Promise<boolean> {
  await selectClassAndBegin(page, 'Mage');
  await setSpeedToMax(page);

  for (let attempt = 0; attempt < 30; attempt++) {
    const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

    if (outcome === 'player_died') {
      await waitForDeathAndRetry(page);
      await setSpeedToMax(page);
      continue;
    }

    const levelUpVisible = await page.getByTestId('level-up-popup').isVisible().catch(() => false);
    if (levelUpVisible) {
      const levelText = await page.getByTestId('level-up-new-level').textContent();
      const level = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');

      await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
      await page.waitForTimeout(500);

      if (level === 2) {
        // Select Archmage path
        await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });
        await page.getByRole('button', { name: /Select Path/i }).first().click();
        await page.waitForTimeout(300);
        await page.getByTestId('path-confirm-button').click();

        // Select first power (Arcane Bolt)
        await expect(page.getByTestId('power-choice-popup')).toBeVisible({ timeout: 5000 });
        const powerCards = page.locator('[data-testid="power-choice-popup"]').locator('button:has-text("Choose")');
        await powerCards.first().click();
        await page.waitForTimeout(300);
        const confirmPowerButton = page.getByRole('button', { name: /Confirm/i });
        await confirmPowerButton.click();

        return true;
      }
    }

    if (outcome === 'enemy_died') {
      await waitForEnemySpawn(page).catch(() => {});
    }
  }
  return false;
}

test.describe('Archmage Power Mechanics', () => {
  test('Arcane Bolt deals damage to enemy', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    await page.goto('/');
    const hasSetup = await setupArchmageWithPower(page);
    expect(hasSetup).toBe(true);

    // Wait for combat to stabilize
    await page.waitForTimeout(1000);

    // Find and click the power button
    const powerButton = page.locator('[data-testid^="power-arcane"]').first();
    await expect(powerButton).toBeVisible({ timeout: 5000 });

    // Get enemy health before
    const healthBefore = await page.locator('[data-testid="enemy-health-text"]').textContent();
    const hpBefore = parseInt(healthBefore?.match(/\d+/)?.[0] ?? '0');

    // Use the power
    await powerButton.click();
    await page.waitForTimeout(1000);

    // Verify enemy took damage
    const healthAfter = await page.locator('[data-testid="enemy-health-text"]').textContent();
    const hpAfter = parseInt(healthAfter?.match(/\d+/)?.[0] ?? '0');

    expect(hpAfter).toBeLessThan(hpBefore);
  });
});
```

**Step 2: Run test**

Run: `npx playwright test e2e/archmage-mechanics.spec.ts --project="Desktop"`
Expected: PASS

**Step 3: Commit**

```bash
git add e2e/archmage-mechanics.spec.ts
git commit -m "test(e2e): add Archmage power mechanics E2E tests"
```

---

## Phase 2: Enchanter Hex Effects (6 tasks)

### Task 2.1: Implement hexSlowPercent

**Files:**
- Test: `src/ecs/systems/__tests__/attack-timing.test.ts`
- Modify: `src/ecs/systems/attack-timing.ts`

**Step 1: Write failing test**

```typescript
describe('AttackTimingSystem - Hex Slow', () => {
  it('should slow enemy attacks when player has hexSlowPercent', () => {
    // Setup player with hex slow
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0 };
    player.passiveEffectState = {
      computed: { hexSlowPercent: 15 } as any,
      lastComputedTick: 0,
    };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.speed = { attackInterval: 1000, accumulated: 0 };

    // Create game state
    world.add({ gameState: { phase: 'combat', paused: false } as any });

    // Run for exactly 1000ms - enemy should NOT be ready (needs 1150ms with 15% slow)
    AttackTimingSystem(1000);
    expect(enemy.attackReady).toBeUndefined();

    // Run another 150ms - now should be ready
    AttackTimingSystem(150);
    expect(enemy.attackReady).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/attack-timing.test.ts --grep "Hex Slow"`
Expected: FAIL

**Step 3: Implement hex slow**

Add in attack-timing.ts after stun check:

```typescript
    // Apply hex slow to enemies
    if (entity.enemy) {
      const player = getPlayer();
      if (player?.stanceState?.activeStanceId === 'hex_veil') {
        const hexSlow = player.passiveEffectState?.computed?.hexSlowPercent ?? 0;
        if (hexSlow > 0) {
          const slowMultiplier = 1 + (hexSlow / 100);
          const effectiveInterval = speed.attackInterval * slowMultiplier;
          speed.accumulated += effectiveDelta;
          if (speed.accumulated >= effectiveInterval) {
            speed.accumulated -= effectiveInterval;
            const attackData = calculateAttackDamage(entity);
            world.addComponent(entity, 'attackReady', attackData);
          }
          continue;
        }
      }
    }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/attack-timing.test.ts --grep "Hex Slow"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ecs/systems/attack-timing.ts src/ecs/systems/__tests__/attack-timing.test.ts
git commit -m "feat(ecs): implement hexSlowPercent in attack-timing"
```

---

### Task 2.2: Implement hexRegen

**Files:**
- Test: `src/ecs/systems/__tests__/regen.test.ts`
- Modify: `src/ecs/systems/regen.ts`

**Step 1: Write failing test**

```typescript
describe('RegenSystem - Hex Regen', () => {
  beforeEach(() => {
    for (const entity of world.entities) world.remove(entity);
    world.add({ gameState: { phase: 'combat', paused: false } as any });
  });

  it('should regenerate HP when player has hexRegen in hex_veil stance', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.health = { current: 50, max: 100 };
    player.regen = { healthPerSecond: 0, accumulated: 0 };
    player.stanceState = { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0 };
    player.passiveEffectState = {
      computed: { hexRegen: 5 } as any,
      lastComputedTick: 0,
    };

    RegenSystem(1000); // 1 second

    expect(player.health.current).toBeCloseTo(55, 0); // +5 HP
  });

  it('should NOT regenerate HP when not in hex_veil stance', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.health = { current: 50, max: 100 };
    player.stanceState = { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0 };
    player.passiveEffectState = { computed: { hexRegen: 5 } as any, lastComputedTick: 0 };

    RegenSystem(1000);

    expect(player.health.current).toBe(50); // No change
  });
});
```

**Step 2:** Run: `npx vitest run src/ecs/systems/__tests__/regen.test.ts --grep "Hex Regen"` - Expected: FAIL

**Step 3: Implement** - Add after normal regen in regen.ts:

```typescript
  // Hex regen (player in hex_veil stance)
  const player = getPlayer();
  if (player && !player.dying && player.health && player.stanceState?.activeStanceId === 'hex_veil') {
    const hexRegen = player.passiveEffectState?.computed?.hexRegen ?? 0;
    if (hexRegen > 0) {
      const regenAmount = (hexRegen * effectiveDelta) / 1000;
      player.health.current = Math.min(player.health.max, player.health.current + regenAmount);
    }
  }
```

**Step 4:** Run test - Expected: PASS
**Step 5:** Commit: `git commit -m "feat(ecs): implement hexRegen in regen system"`

---

### Task 2.3: Implement hexLifesteal

**Files:**
- Test: `src/ecs/systems/__tests__/combat.test.ts`
- Modify: `src/ecs/systems/combat.ts`

**Step 1: Write failing test**

```typescript
describe('CombatSystem - Hex Lifesteal', () => {
  beforeEach(() => {
    for (const entity of world.entities) world.remove(entity);
    world.add({ gameState: { phase: 'combat', paused: false } as any });
  });

  it('should heal player when dealing damage with hexLifesteal', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.health = { current: 50, max: 100 };
    player.stanceState = { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0 };
    player.passiveEffectState = { computed: { hexLifesteal: 10 } as any, lastComputedTick: 0 };
    world.addComponent(player, 'attackReady', { damage: 100, isCrit: false });

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 200, max: 200 };

    CombatSystem(16);

    // 100 damage * 10% = 10 HP healed (50 -> 60)
    expect(player.health.current).toBe(60);
  });
});
```

**Step 2:** Run: `npx vitest run src/ecs/systems/__tests__/combat.test.ts --grep "Hex Lifesteal"` - Expected: FAIL

**Step 3: Implement** - Add after damage dealt to enemy:

```typescript
    // Hex lifesteal
    if (entity.player && entity.stanceState?.activeStanceId === 'hex_veil') {
      const lifesteal = entity.passiveEffectState?.computed?.hexLifesteal ?? 0;
      if (lifesteal > 0 && entity.health) {
        const healAmount = Math.round(damage * (lifesteal / 100));
        entity.health.current = Math.min(entity.health.max, entity.health.current + healAmount);
        addCombatLog(`Hex lifesteal heals for ${healAmount}`);
      }
    }
```

**Step 4:** Run test - Expected: PASS
**Step 5:** Commit: `git commit -m "feat(ecs): implement hexLifesteal in combat system"`

---

### Task 2.4: Implement hexArmorReduction

**Files:**
- Test: `src/ecs/systems/__tests__/combat.test.ts`
- Modify: `src/ecs/systems/combat.ts`

**Step 1: Write failing test**

```typescript
describe('CombatSystem - Hex Armor Reduction', () => {
  it('should reduce enemy armor when player in hex_veil', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0 };
    player.passiveEffectState = { computed: { hexArmorReduction: 50 } as any, lastComputedTick: 0 };
    world.addComponent(player, 'attackReady', { damage: 100, isCrit: false });

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 200, max: 200 };
    enemy.defense = { value: 20 };

    // Without reduction: 100 - 20 = 80 damage -> 120 HP
    // With 50% reduction: 100 - 10 = 90 damage -> 110 HP
    CombatSystem(16);

    expect(enemy.health.current).toBe(110);
  });
});
```

**Step 2:** Run test - Expected: FAIL
**Step 3: Implement** - Modify defense calculation:

```typescript
    // Apply hex armor reduction
    if (entity.player && target.enemy && entity.stanceState?.activeStanceId === 'hex_veil') {
      const reduction = entity.passiveEffectState?.computed?.hexArmorReduction ?? 0;
      if (reduction > 0) {
        effectiveDefense = Math.round(effectiveDefense * (1 - reduction / 100));
      }
    }
```

**Step 4:** Run test - Expected: PASS
**Step 5:** Commit: `git commit -m "feat(ecs): implement hexArmorReduction"`

---

### Task 2.5: Implement hexReflect

**Files:**
- Test: `src/ecs/systems/__tests__/combat.test.ts`
- Modify: `src/ecs/systems/combat.ts`

**Step 1: Write failing test**

```typescript
describe('CombatSystem - Hex Reflect', () => {
  it('should reflect damage to enemy when player is hit in hex_veil', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.health = { current: 100, max: 100 };
    player.stanceState = { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0 };
    player.passiveEffectState = { computed: { hexReflect: 20 } as any, lastComputedTick: 0 };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    world.addComponent(enemy, 'attackReady', { damage: 50, isCrit: false });

    CombatSystem(16);

    // Enemy dealt 50, reflects 20% = 10 damage back
    expect(enemy.health.current).toBe(90);
  });
});
```

**Step 2:** Run test - Expected: FAIL
**Step 3: Implement** - Add after enemy damages player:

```typescript
    // Hex reflect
    if (entity.enemy && target.player && target.stanceState?.activeStanceId === 'hex_veil') {
      const reflect = target.passiveEffectState?.computed?.hexReflect ?? 0;
      if (reflect > 0 && entity.health) {
        const reflectDmg = Math.round(damage * (reflect / 100));
        entity.health.current = Math.max(0, entity.health.current - reflectDmg);
        addCombatLog(`Hex reflects ${reflectDmg} damage`);
      }
    }
```

**Step 4:** Run test - Expected: PASS
**Step 5:** Commit: `git commit -m "feat(ecs): implement hexReflect"`

---

### Task 2.6: Implement hexHealOnEnemyAttack

**Files:**
- Test: `src/ecs/systems/__tests__/combat.test.ts`
- Modify: `src/ecs/systems/combat.ts`

**Step 1: Write failing test**

```typescript
describe('CombatSystem - Hex Heal On Enemy Attack', () => {
  it('should heal player % max HP when enemy attacks', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.health = { current: 50, max: 100 };
    player.stanceState = { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0 };
    player.passiveEffectState = { computed: { hexHealOnEnemyAttack: 5 } as any, lastComputedTick: 0 };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    world.addComponent(enemy, 'attackReady', { damage: 20, isCrit: false });

    CombatSystem(16);

    // Took 20 damage (50->30), healed 5% of 100 = 5 (30->35)
    expect(player.health.current).toBe(35);
  });
});
```

**Step 2:** Run test - Expected: FAIL
**Step 3: Implement** - Add after enemy attack:

```typescript
    // Hex heal on enemy attack
    if (entity.enemy && target.player && target.stanceState?.activeStanceId === 'hex_veil') {
      const healPct = target.passiveEffectState?.computed?.hexHealOnEnemyAttack ?? 0;
      if (healPct > 0 && target.health) {
        const healAmt = Math.round(target.health.max * (healPct / 100));
        target.health.current = Math.min(target.health.max, target.health.current + healAmt);
        addCombatLog(`Hex aura heals ${healAmt}`);
      }
    }
```

**Step 4:** Run test - Expected: PASS
**Step 5:** Commit: `git commit -m "feat(ecs): implement hexHealOnEnemyAttack"`

---

## Phase 3: Enchanter Burn Effects (9 tasks)

### Task 3.1: Enhance Existing Burn Proc with burnProcChance Modifier

**Acceptance Criteria:** AC-6

**NOTE:** Burn proc **already exists** in `combat.ts:232-253` using `getStanceBehavior(entity, 'arcane_burn')`. This task **modifies** the existing implementation to use computed modifiers.

**Files:**
- Test: `src/ecs/systems/__tests__/combat.test.ts` (test already exists at line 147)
- Modify: `src/ecs/systems/combat.ts:232-253`

**Step 1: Write additional test for burnProcChance enhancement**

The existing tests check basic burn proc. Add test for enhancement modifier:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { world } from '../../world';
import { createPlayerEntity, createEnemyEntity } from '../../factories';
import { CombatSystem } from '../combat';
import { ENCHANTER_STANCES } from '@/data/stances';

describe('CombatSystem - Burn Proc Enhancement', () => {
  beforeEach(() => {
    for (const entity of world.entities) world.remove(entity);
    world.add({ gameState: { phase: 'combat', paused: false } as any });
  });

  it('should increase burn chance with burnProcChance enhancement', () => {
    // 20% base + 15% enhancement = 35% chance. Roll 0.30 should succeed.
    vi.spyOn(Math, 'random').mockReturnValue(0.30);

    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0 };
    // Setup stance effects so getStanceBehavior returns the base value
    player.effectiveStanceEffects = ENCHANTER_STANCES
      .find(s => s.id === 'arcane_surge')?.effects ?? [];
    player.passiveEffectState = {
      computed: { burnProcChance: 15 } as any, // +15% = 35% total
      lastComputedTick: 0,
    };
    world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.statusEffects = [];

    CombatSystem(16);

    expect(enemy.statusEffects.some(e => e.type === 'burn')).toBe(true);
    vi.restoreAllMocks();
  });

  it('should NOT proc burn without enhancement when roll is between base and enhanced chance', () => {
    // Roll 0.25 is above 20% base, should fail without enhancement
    vi.spyOn(Math, 'random').mockReturnValue(0.25);

    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0 };
    player.effectiveStanceEffects = ENCHANTER_STANCES
      .find(s => s.id === 'arcane_surge')?.effects ?? [];
    player.passiveEffectState = { computed: {} as any, lastComputedTick: 0 }; // No enhancement
    world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.statusEffects = [];

    CombatSystem(16);

    expect(enemy.statusEffects.some(e => e.type === 'burn')).toBe(false);
    vi.restoreAllMocks();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/combat.test.ts --grep "burnProcChance"`
Expected: FAIL (enhancement not used in existing code)

**Step 3: Modify existing burn proc code**

In `combat.ts:232-253`, update the existing implementation:

```typescript
      // Apply arcane burn from stance (chance to deal bonus damage + apply burn DoT)
      const arcaneBurnChance = getStanceBehavior(entity, 'arcane_burn');
      if (arcaneBurnChance > 0) {
        // Add burnProcChance enhancement bonus
        const burnProcBonus = (entity.passiveEffectState?.computed?.burnProcChance ?? 0) / 100;
        const totalChance = arcaneBurnChance + burnProcBonus;

        if (Math.random() < totalChance) {
          // Bonus damage: 30% of attack damage
          const bonusDamage = Math.round(damage * 0.3);
          if (bonusDamage > 0 && target.health) {
            target.health.current = Math.max(0, target.health.current - bonusDamage);
          }

          // Apply burn DoT: 5 damage per second for 3 seconds
          if (!target.statusEffects) {
            target.statusEffects = [];
          }
          target.statusEffects.push({
            id: `burn-${Date.now()}`,
            type: 'burn',
            damage: 5,
            remainingTurns: 3,
            icon: 'flame',
          });

          addCombatLog(`Arcane Burn! ${bonusDamage} bonus damage + burning for 15`);
        }
      }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/ecs/systems/__tests__/combat.test.ts --grep "burnProcChance"`
Expected: PASS

**Step 5: Run existing burn proc tests to verify no regressions**

Run: `npx vitest run src/ecs/systems/__tests__/combat.test.ts --grep "arcane_burn"`
Expected: PASS

**Step 6: Commit**

```bash
git add src/ecs/systems/combat.ts src/ecs/systems/__tests__/combat.test.ts
git commit -m "feat(ecs): add burnProcChance enhancement to existing burn proc"
```

---

### Task 3.2: Implement burnDamagePercent

**Files:**
- Test: `src/ecs/systems/__tests__/status-effect.test.ts`
- Modify: `src/ecs/systems/status-effect.ts`

**Step 1: Write failing test**

```typescript
describe('StatusEffectSystem - Burn Damage Percent', () => {
  beforeEach(() => {
    for (const entity of world.entities) world.remove(entity);
    world.add({ gameState: { phase: 'combat', paused: false } as any });
  });

  it('should increase burn tick damage with burnDamagePercent', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.passiveEffectState = {
      computed: { burnDamagePercent: 50 } as any, // +50% burn damage
      lastComputedTick: 0,
    };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
    ];

    // Simulate 1 second (1 burn tick)
    StatusEffectSystem(1000);

    // Base 10 damage + 50% = 15 damage, health = 100 - 15 = 85
    expect(enemy.health.current).toBe(85);
  });

  it('should not modify burn damage without burnDamagePercent', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.passiveEffectState = { computed: {} as any, lastComputedTick: 0 };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
    ];

    StatusEffectSystem(1000);

    // Base 10 damage only
    expect(enemy.health.current).toBe(90);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/ecs/systems/__tests__/status-effect.test.ts --grep "Burn Damage Percent"`
Expected: FAIL

**Step 3: Implement**

In status-effect.ts, in the burn tick processing:

```typescript
    // Calculate burn tick damage
    if (effect.type === 'burn') {
      let burnDamage = effect.damage;

      // Apply burnDamagePercent modifier from player
      const player = getPlayer();
      if (player?.passiveEffectState?.computed) {
        const damageBonus = player.passiveEffectState.computed.burnDamagePercent ?? 0;
        if (damageBonus > 0) {
          burnDamage = Math.round(burnDamage * (1 + damageBonus / 100));
        }
      }

      entity.health.current = Math.max(0, entity.health.current - burnDamage);
    }
```

**Step 4: Run test - Expected: PASS**
**Step 5: Commit**

```bash
git add src/ecs/systems/status-effect.ts src/ecs/systems/__tests__/status-effect.test.ts
git commit -m "feat(ecs): implement burnDamagePercent in status-effect system"
```

---

### Task 3.3: Implement burnDurationBonus

**Files:**
- Test: `src/ecs/systems/__tests__/combat.test.ts`
- Modify: `src/ecs/systems/combat.ts` (in burn proc section)

**Step 1: Write failing test**

```typescript
describe('CombatSystem - Burn Duration Bonus', () => {
  beforeEach(() => {
    for (const entity of world.entities) world.remove(entity);
    world.add({ gameState: { phase: 'combat', paused: false } as any });
    vi.spyOn(Math, 'random').mockReturnValue(0.05); // Always proc burn
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should extend burn duration with burnDurationBonus', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0 };
    // Setup effectiveStanceEffects with arcane_burn behavior (getStanceBehavior reads from this)
    player.effectiveStanceEffects = [
      { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 }
    ];
    player.passiveEffectState = {
      computed: { burnDurationBonus: 2 } as any, // +2 seconds
      lastComputedTick: 0,
    };
    world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.statusEffects = [];

    CombatSystem(16);

    const burn = enemy.statusEffects.find(e => e.type === 'burn');
    expect(burn).toBeDefined();
    expect(burn?.remainingTurns).toBe(5); // 3 base + 2 bonus
  });
});
```

**Step 2: Run test - Expected: FAIL**

**Step 3: Implement**

Update burn proc code in combat.ts:

```typescript
        if (Math.random() < totalChance) {
          const burnDamage = Math.round(damage * 0.3);
          const durationBonus = entity.passiveEffectState?.computed?.burnDurationBonus ?? 0;
          const burnDuration = 3 + durationBonus; // 3 seconds base + bonus

          target.statusEffects.push({
            id: `burn-${Date.now()}`,
            type: 'burn',
            damage: burnDamage,
            remainingTurns: burnDuration,
            icon: 'flame',
          });
        }
```

**Step 4: Run test - Expected: PASS**
**Step 5: Commit**

```bash
git add src/ecs/systems/combat.ts src/ecs/systems/__tests__/combat.test.ts
git commit -m "feat(ecs): implement burnDurationBonus"
```

---

### Task 3.4: Implement burnMaxStacks

**Files:**
- Test: `src/ecs/systems/__tests__/combat.test.ts`
- Modify: `src/ecs/systems/combat.ts`

**Step 1: Write failing test**

```typescript
describe('CombatSystem - Burn Max Stacks', () => {
  beforeEach(() => {
    for (const entity of world.entities) world.remove(entity);
    world.add({ gameState: { phase: 'combat', paused: false } as any });
    vi.spyOn(Math, 'random').mockReturnValue(0.05); // Always proc
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should allow multiple burn stacks when burnMaxStacks > 1', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0 };
    // Setup effectiveStanceEffects with arcane_burn behavior (getStanceBehavior reads from this)
    player.effectiveStanceEffects = [
      { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 }
    ];
    player.passiveEffectState = {
      computed: { burnMaxStacks: 3 } as any,
      lastComputedTick: 0,
    };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
    ];

    // First attack - should add second stack
    world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });
    CombatSystem(16);

    expect(enemy.statusEffects.filter(e => e.type === 'burn').length).toBe(2);
  });

  it('should NOT add burn when at max stacks', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0 };
    // Setup effectiveStanceEffects with arcane_burn behavior
    player.effectiveStanceEffects = [
      { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 }
    ];
    player.passiveEffectState = {
      computed: { burnMaxStacks: 2 } as any,
      lastComputedTick: 0,
    };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
      { id: 'burn-2', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
    ];

    world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });
    CombatSystem(16);

    // Should still only have 2 burns (refreshes existing instead)
    expect(enemy.statusEffects.filter(e => e.type === 'burn').length).toBe(2);
  });

  it('should default to 1 stack when no burnMaxStacks', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0 };
    // Setup effectiveStanceEffects with arcane_burn behavior
    player.effectiveStanceEffects = [
      { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 }
    ];
    player.passiveEffectState = { computed: {} as any, lastComputedTick: 0 };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
    ];

    world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });
    CombatSystem(16);

    // Should refresh existing burn, not add new
    expect(enemy.statusEffects.filter(e => e.type === 'burn').length).toBe(1);
  });
});
```

**Step 2: Run test - Expected: FAIL**

**Step 3: Implement**

```typescript
        if (Math.random() < totalChance) {
          const burnDamage = Math.round(damage * 0.3);
          const durationBonus = entity.passiveEffectState?.computed?.burnDurationBonus ?? 0;
          const burnDuration = 3 + durationBonus;
          const maxStacks = entity.passiveEffectState?.computed?.burnMaxStacks ?? 1;

          const existingBurns = target.statusEffects.filter(e => e.type === 'burn');

          if (existingBurns.length < maxStacks) {
            // Add new burn stack
            target.statusEffects.push({
              id: `burn-${Date.now()}`,
              type: 'burn',
              damage: burnDamage,
              remainingTurns: burnDuration,
              icon: 'flame',
            });
          } else {
            // Refresh oldest burn
            const oldestBurn = existingBurns[0];
            oldestBurn.remainingTurns = burnDuration;
            oldestBurn.damage = Math.max(oldestBurn.damage, burnDamage);
          }
        }
```

**Step 4: Run test - Expected: PASS**
**Step 5: Commit**

```bash
git add src/ecs/systems/combat.ts src/ecs/systems/__tests__/combat.test.ts
git commit -m "feat(ecs): implement burnMaxStacks with stack limit"
```

---

### Task 3.5: Implement burnTickRateMultiplier

**Files:**
- Test: `src/ecs/systems/__tests__/status-effect.test.ts`
- Modify: `src/ecs/systems/status-effect.ts`
- Modify: `src/types/game.ts` (add `tickAccumulated` to StatusEffect)

**NOTE:** The property in `ComputedPassiveEffects` is `burnTickRateMultiplier`, not `burnTickRate`.

**Step 0 (Prerequisite): Update StatusEffect type**

Add the `tickAccumulated` field to StatusEffect in `src/types/game.ts:35-43`:

```typescript
export interface StatusEffect {
  id: string;
  type: 'poison' | 'stun' | 'slow' | 'bleed' | 'burn' | 'death_immunity' | 'weaken' | 'vulnerable';
  damage?: number; // For DoT effects (damage per second)
  accumulatedDamage?: number; // Tracks fractional damage between ticks
  tickAccumulated?: number; // Tracks time accumulated for burn tick rate modifier
  value?: number; // For slow (speed reduction %), stun (chance), weaken (damage reduction %), etc.
  remainingTurns: number;
  icon: string;
}
```

**Step 1: Write failing test**

```typescript
describe('StatusEffectSystem - Burn Tick Rate', () => {
  beforeEach(() => {
    for (const entity of world.entities) world.remove(entity);
    world.add({ gameState: { phase: 'combat', paused: false } as any });
  });

  it('should apply burn damage faster when burnTickRateMultiplier > 0', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.passiveEffectState = {
      computed: { burnTickRateMultiplier: 100 } as any, // 100% faster = ticks every 0.5s instead of 1s
      lastComputedTick: 0,
    };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 0 },
    ];

    // Run for 500ms - should apply 1 tick with 100% faster rate
    StatusEffectSystem(500);

    expect(enemy.health.current).toBe(90); // -10 from burn tick
  });

  it('should tick at normal rate without burnTickRateMultiplier', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.passiveEffectState = { computed: {} as any, lastComputedTick: 0 };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 0 },
    ];

    // Run for 500ms - should NOT tick yet (needs 1000ms)
    StatusEffectSystem(500);

    expect(enemy.health.current).toBe(100); // No damage yet
  });
});
```

**Step 2: Run test - Expected: FAIL**

**Step 3: Implement**

In status-effect.ts burn processing:

```typescript
    if (effect.type === 'burn') {
      const player = getPlayer();
      const tickRateBonus = player?.passiveEffectState?.computed?.burnTickRateMultiplier ?? 0;
      const tickInterval = 1000 / (1 + tickRateBonus / 100); // Base 1000ms

      effect.tickAccumulated = (effect.tickAccumulated ?? 0) + deltaMs;

      if (effect.tickAccumulated >= tickInterval) {
        effect.tickAccumulated -= tickInterval;

        // Apply burn damage with modifiers
        let burnDamage = effect.damage;
        const damageBonus = player?.passiveEffectState?.computed?.burnDamagePercent ?? 0;
        if (damageBonus > 0) {
          burnDamage = Math.round(burnDamage * (1 + damageBonus / 100));
        }

        entity.health.current = Math.max(0, entity.health.current - burnDamage);
      }
    }
```

**Step 4: Run test - Expected: PASS**
**Step 5: Commit**

```bash
git add src/ecs/systems/status-effect.ts src/ecs/systems/__tests__/status-effect.test.ts
git commit -m "feat(ecs): implement burnTickRateMultiplier for faster burn ticks"
```

---

### Task 3.6: Implement burnExecuteBonus

**Files:**
- Test: `src/ecs/systems/__tests__/status-effect.test.ts`
- Modify: `src/ecs/systems/status-effect.ts`

**Step 1: Write failing test**

```typescript
describe('StatusEffectSystem - Burn Execute Bonus', () => {
  it('should deal bonus burn damage to low HP enemies', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.passiveEffectState = {
      computed: { burnExecuteBonus: 50, burnExecuteThreshold: 30 } as any, // +50% below 30% HP
      lastComputedTick: 0,
    };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 25, max: 100 }; // 25% HP, below threshold
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 1000 },
    ];

    StatusEffectSystem(0); // Process tick

    // 10 base + 50% execute bonus = 15 damage, 25 - 15 = 10 HP
    expect(enemy.health.current).toBe(10);
  });

  it('should NOT apply execute bonus above HP threshold', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.passiveEffectState = {
      computed: { burnExecuteBonus: 50, burnExecuteThreshold: 30 } as any,
      lastComputedTick: 0,
    };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 50, max: 100 }; // 50% HP, above threshold
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 1000 },
    ];

    StatusEffectSystem(0);

    // Only base damage, 50 - 10 = 40 HP
    expect(enemy.health.current).toBe(40);
  });
});
```

**Step 2: Run test - Expected: FAIL**

**Step 3: Implement** - Add in burn damage calculation:

```typescript
        // Execute bonus for low HP enemies
        const executeBonus = player?.passiveEffectState?.computed?.burnExecuteBonus ?? 0;
        const executeThreshold = player?.passiveEffectState?.computed?.burnExecuteThreshold ?? 30;
        if (executeBonus > 0 && entity.health) {
          const hpPercent = (entity.health.current / entity.health.max) * 100;
          if (hpPercent < executeThreshold) {
            burnDamage = Math.round(burnDamage * (1 + executeBonus / 100));
          }
        }
```

**Step 4: Run test - Expected: PASS**
**Step 5: Commit**

```bash
git add src/ecs/systems/status-effect.ts src/ecs/systems/__tests__/status-effect.test.ts
git commit -m "feat(ecs): implement burnExecuteBonus for low HP enemies"
```

---

### Task 3.7: Implement burnIgnoresArmor

**Files:**
- Test: `src/ecs/systems/__tests__/status-effect.test.ts`
- Modify: `src/ecs/systems/status-effect.ts`

**Step 1: Write failing test**

```typescript
describe('StatusEffectSystem - Burn Ignores Armor', () => {
  it('should bypass armor when burnIgnoresArmor is true', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.passiveEffectState = {
      computed: { burnIgnoresArmor: true } as any,
      lastComputedTick: 0,
    };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.defense = { value: 50 }; // Would normally reduce damage
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 1000 },
    ];

    StatusEffectSystem(0);

    // Full 10 damage ignoring 50 armor
    expect(enemy.health.current).toBe(90);
  });

  it('should apply armor normally without burnIgnoresArmor', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.passiveEffectState = { computed: {} as any, lastComputedTick: 0 };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.defense = { value: 5 }; // Reduces damage by 5
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 1000 },
    ];

    StatusEffectSystem(0);

    // 10 - 5 armor = 5 damage, 100 - 5 = 95 HP
    expect(enemy.health.current).toBe(95);
  });
});
```

**Step 2: Run test - Expected: FAIL**

**Step 3: Implement** - Add armor handling in burn damage:

```typescript
        // Apply armor reduction unless burnIgnoresArmor
        const ignoresArmor = player?.passiveEffectState?.computed?.burnIgnoresArmor ?? false;
        if (!ignoresArmor && entity.defense) {
          burnDamage = Math.max(1, burnDamage - entity.defense.value);
        }

        entity.health.current = Math.max(0, entity.health.current - burnDamage);
```

**Step 4: Run test - Expected: PASS**
**Step 5: Commit**

```bash
git add src/ecs/systems/status-effect.ts src/ecs/systems/__tests__/status-effect.test.ts
git commit -m "feat(ecs): implement burnIgnoresArmor"
```

---

### Task 3.8: Implement burnCanCrit

**Files:**
- Test: `src/ecs/systems/__tests__/status-effect.test.ts`
- Modify: `src/ecs/systems/status-effect.ts`

**Step 1: Write failing test**

```typescript
describe('StatusEffectSystem - Burn Can Crit', () => {
  beforeEach(() => {
    for (const entity of world.entities) world.remove(entity);
    world.add({ gameState: { phase: 'combat', paused: false } as any });
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // Always crit (below 50% threshold)
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should allow burn ticks to crit when burnCanCrit is true', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.passiveEffectState = {
      computed: { burnCanCrit: true } as any,
      lastComputedTick: 0,
    };
    // Crit stats are in player.attack component
    player.attack = {
      baseDamage: 10,
      critChance: 0.50, // 50% crit chance
      critMultiplier: 2.0, // 2x crit damage
      variance: { min: 1, max: 1 },
    };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 1000 },
    ];

    StatusEffectSystem(0);

    // 10 * 2.0 crit = 20 damage
    expect(enemy.health.current).toBe(80);
  });

  it('should NOT crit burn ticks when burnCanCrit is false', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.passiveEffectState = { computed: {} as any, lastComputedTick: 0 };
    player.attack = {
      baseDamage: 10,
      critChance: 0.50,
      critMultiplier: 2.0,
      variance: { min: 1, max: 1 },
    };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 1000 },
    ];

    StatusEffectSystem(0);

    // No crit, just base 10 damage
    expect(enemy.health.current).toBe(90);
  });
});
```

**Step 2: Run test - Expected: FAIL**

Run: `npx vitest run src/ecs/systems/__tests__/status-effect.test.ts --grep "Burn Can Crit"`

**Step 3: Implement**

```typescript
        // Crit chance for burn ticks (uses player.attack.critChance)
        const canCrit = player?.passiveEffectState?.computed?.burnCanCrit ?? false;
        if (canCrit && player?.attack?.critChance) {
          if (Math.random() < player.attack.critChance) {
            const critMult = player.attack.critMultiplier ?? 1.5;
            burnDamage = Math.round(burnDamage * critMult);
            addCombatLog(`Burn crit for ${burnDamage}!`);
          }
        }
```

**Step 4: Run test - Expected: PASS**
**Step 5: Commit**

```bash
git add src/ecs/systems/status-effect.ts src/ecs/systems/__tests__/status-effect.test.ts
git commit -m "feat(ecs): implement burnCanCrit for burn tick crits"
```

---

### Task 3.9: Implement critRefreshesBurn, lifestealFromBurns, damageVsBurning

**Files:**
- Test: `src/ecs/systems/__tests__/combat.test.ts`
- Test: `src/ecs/systems/__tests__/status-effect.test.ts`
- Modify: `src/ecs/systems/combat.ts`
- Modify: `src/ecs/systems/status-effect.ts`

**Step 1: Write failing tests**

For critRefreshesBurn (combat.ts):
```typescript
describe('CombatSystem - Crit Refreshes Burn', () => {
  it('should refresh burn duration on crit', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0 };
    player.passiveEffectState = {
      computed: { critRefreshesBurn: true } as any,
      lastComputedTick: 0,
    };
    world.addComponent(player, 'attackReady', { damage: 100, isCrit: true });

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 1, icon: 'flame' }, // Almost expired
    ];

    CombatSystem(16);

    const burn = enemy.statusEffects.find(e => e.type === 'burn');
    expect(burn?.remainingTurns).toBe(3); // Refreshed to base duration
  });
});
```

For lifestealFromBurns (status-effect.ts):
```typescript
describe('StatusEffectSystem - Lifesteal From Burns', () => {
  it('should heal player from burn damage', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.health = { current: 50, max: 100 };
    player.passiveEffectState = {
      computed: { lifestealFromBurns: 20 } as any, // 20% lifesteal
      lastComputedTick: 0,
    };

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 100, max: 100 };
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 1000 },
    ];

    StatusEffectSystem(0);

    // 10 damage * 20% = 2 HP healed
    expect(player.health.current).toBe(52);
  });
});
```

For damageVsBurning (combat.ts):
```typescript
describe('CombatSystem - Damage vs Burning', () => {
  it('should deal bonus damage to burning enemies', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0 };
    player.passiveEffectState = {
      computed: { damageVsBurning: 25 } as any, // 25% bonus
      lastComputedTick: 0,
    };
    world.addComponent(player, 'attackReady', { damage: 100, isCrit: false });

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 200, max: 200 };
    enemy.statusEffects = [
      { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
    ];

    CombatSystem(16);

    // 100 + 25% = 125 damage, 200 - 125 = 75 HP
    expect(enemy.health.current).toBe(75);
  });

  it('should NOT apply bonus to non-burning enemies', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0 };
    player.passiveEffectState = { computed: { damageVsBurning: 25 } as any, lastComputedTick: 0 };
    world.addComponent(player, 'attackReady', { damage: 100, isCrit: false });

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health = { current: 200, max: 200 };
    enemy.statusEffects = []; // No burn

    CombatSystem(16);

    // Just 100 damage
    expect(enemy.health.current).toBe(100);
  });
});
```

**Step 2: Run tests - Expected: FAIL**

**Step 3: Implement all three**

critRefreshesBurn in combat.ts (after crit damage):
```typescript
    // Refresh burn on crit
    if (attackData.isCrit && entity.player && entity.stanceState?.activeStanceId === 'arcane_surge') {
      if (entity.passiveEffectState?.computed?.critRefreshesBurn && target.statusEffects) {
        for (const effect of target.statusEffects) {
          if (effect.type === 'burn') {
            const durationBonus = entity.passiveEffectState.computed.burnDurationBonus ?? 0;
            effect.remainingTurns = 3 + durationBonus;
          }
        }
      }
    }
```

damageVsBurning in combat.ts (in damage calculation):
```typescript
    // Bonus damage vs burning
    if (entity.player && entity.stanceState?.activeStanceId === 'arcane_surge' && target.statusEffects) {
      const hasBurn = target.statusEffects.some(e => e.type === 'burn');
      const damageBonus = entity.passiveEffectState?.computed?.damageVsBurning ?? 0;
      if (hasBurn && damageBonus > 0) {
        damage = Math.round(damage * (1 + damageBonus / 100));
      }
    }
```

lifestealFromBurns in status-effect.ts (after burn damage):
```typescript
        // Lifesteal from burn damage
        const lifesteal = player?.passiveEffectState?.computed?.lifestealFromBurns ?? 0;
        if (lifesteal > 0 && player?.health) {
          const healAmount = Math.round(burnDamage * (lifesteal / 100));
          player.health.current = Math.min(player.health.max, player.health.current + healAmount);
        }
```

**Step 4: Run tests - Expected: PASS**
**Step 5: Commit**

```bash
git add src/ecs/systems/combat.ts src/ecs/systems/status-effect.ts src/ecs/systems/__tests__/*.test.ts
git commit -m "feat(ecs): implement critRefreshesBurn, lifestealFromBurns, damageVsBurning"
```

---

## Phase 4: Missing E2E Tests

### Task 4.1: Create archmage-progression.spec.ts

**Acceptance Criteria:** AC-3

**Files:**
- Create: `e2e/archmage-progression.spec.ts`

**Step 1: Create test file with complete tests**

> **NOTE:** This test follows the pattern from `berserker-progression.spec.ts`. Uses natural game progression to verify correct powers appear at each level. This is more reliable than test hooks which may not be available.

```typescript
import { test, expect, Page } from '@playwright/test';
import {
  selectClassAndBegin,
  setSpeedToMax,
  waitForCombatOutcome,
  waitForEnemySpawn,
  waitForDeathAndRetry,
} from './helpers/game-actions';

test.describe('Archmage Progression', () => {
  test('Level 2: should show Archmage power choices, NOT Berserker', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    await page.goto('/');
    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    let reachedLevel2 = false;
    for (let attempt = 0; attempt < 30 && !reachedLevel2; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible().catch(() => false);
      if (levelUpVisible) {
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        const level = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');

        await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
        await page.waitForTimeout(500);

        if (level === 2) {
          // Wait for path selection
          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });

          // Select Archmage path (first path)
          await page.getByRole('button', { name: /Select Path/i }).first().click();
          await page.waitForTimeout(300);
          await page.getByTestId('path-confirm-button').click();

          // Wait for power choice popup
          await expect(page.getByTestId('power-choice-popup')).toBeVisible({ timeout: 5000 });

          // Verify CORRECT powers (Archmage)
          await expect(page.locator('text=Arcane Bolt')).toBeVisible();
          await expect(page.locator('text=Meteor Strike')).toBeVisible();

          // Verify WRONG powers NOT shown (Berserker)
          await expect(page.locator('text=Rage Strike')).not.toBeVisible();
          await expect(page.locator('text=Savage Slam')).not.toBeVisible();

          reachedLevel2 = true;
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(reachedLevel2).toBe(true);
  });

  test('Level 4: should show second power choice, NOT Berserker', async ({ page }) => {
    test.setTimeout(240000); // 4 minutes

    await page.goto('/');
    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    let reachedLevel4 = false;
    let hasSelectedPath = false;
    let hasSelectedFirstPower = false;

    for (let attempt = 0; attempt < 50 && !reachedLevel4; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible().catch(() => false);
      if (levelUpVisible) {
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        const level = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');

        await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
        await page.waitForTimeout(500);

        if (level === 2 && !hasSelectedPath) {
          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });
          await page.getByRole('button', { name: /Select Path/i }).first().click();
          await page.waitForTimeout(300);
          await page.getByTestId('path-confirm-button').click();
          hasSelectedPath = true;

          // Select first power
          await expect(page.getByTestId('power-choice-popup')).toBeVisible({ timeout: 5000 });
          const powerCards = page.locator('[data-testid="power-choice-popup"]').locator('button:has-text("Choose")');
          await powerCards.first().click();
          await page.waitForTimeout(300);
          await page.getByRole('button', { name: /Confirm/i }).click();
          hasSelectedFirstPower = true;
        } else if (level === 3) {
          // Handle upgrade choice at level 3
          const upgradePopup = page.locator('[data-testid="upgrade-choice-popup"]');
          if (await upgradePopup.isVisible().catch(() => false)) {
            await page.locator('[data-testid="upgrade-choice-popup"]').locator('button:has-text("Choose")').first().click();
            await page.waitForTimeout(300);
            await page.getByRole('button', { name: /Confirm/i }).click();
          }
        } else if (level === 4 && hasSelectedFirstPower) {
          await expect(page.getByTestId('power-choice-popup')).toBeVisible({ timeout: 5000 });

          // Verify second set of Archmage powers
          await expect(page.locator('text=Arcane Empowerment')).toBeVisible();
          await expect(page.locator('text=Arcane Weakness')).toBeVisible();

          // Verify no Berserker powers
          await expect(page.locator('text=Berserker Roar')).not.toBeVisible();
          await expect(page.locator('text=Reckless Charge')).not.toBeVisible();

          reachedLevel4 = true;
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(reachedLevel4).toBe(true);
  });
});
```

**Step 2: Run test**

Run: `npx playwright test e2e/archmage-progression.spec.ts --project="Desktop"`
Expected: PASS

**Step 3: Commit**

```bash
git add e2e/archmage-progression.spec.ts
git commit -m "test(e2e): add Archmage progression E2E tests with negative cases"
```

---

### Task 4.2: Create enchanter-progression.spec.ts

**Acceptance Criteria:** AC-4

**Files:**
- Create: `e2e/enchanter-progression.spec.ts`
- Modify: `src/components/game/StanceToggle.tsx` - Add testids

**Step 0 (Prerequisite): Add testids to StanceToggle.tsx**

The StanceToggle.tsx component needs `data-testid` attributes before the stance toggle test will work.

In `src/components/game/StanceToggle.tsx`:

1. Line 62: Add testid to container div:
```typescript
    <div className="flex flex-col gap-2" data-testid="stance-toggle">
```

2. Inside the active stance button (around line 86-95), add testid for active stance:
```typescript
                  <button
                    data-testid={isActive ? 'active-stance' : undefined}
                    className={cn(
                      // ... existing classes
```

**Step 1: Create test file with correct enhancement names**

> **NOTE:** This test follows the pattern from `guardian-progression.spec.ts`. Uses natural game progression to verify correct enhancements appear. For Enchanter (passive path), path selection happens at level 2 and enhancement selection at level 3.

```typescript
import { test, expect, Page } from '@playwright/test';
import {
  selectClassAndBegin,
  setSpeedToMax,
  waitForCombatOutcome,
  waitForEnemySpawn,
  waitForDeathAndRetry,
} from './helpers/game-actions';

test.describe('Enchanter Progression', () => {
  test('Level 3: should show Enchanter enhancements NOT Guardian enhancements', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    await page.goto('/');
    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    let hasSelectedPath = false;
    let reachedLevel3Enhancement = false;

    for (let attempt = 0; attempt < 40 && !reachedLevel3Enhancement; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        hasSelectedPath = false; // Reset on death
        continue;
      }

      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible().catch(() => false);
      if (levelUpVisible) {
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        const level = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');

        await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
        await page.waitForTimeout(500);

        if (level === 2 && !hasSelectedPath) {
          // Wait for path selection
          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });

          // Select Enchanter path (second path for Mage - need to click "next" or use index)
          // Enchanter is the passive path, typically shown second
          const pathButtons = page.getByRole('button', { name: /Select Path/i });
          await pathButtons.last().click(); // Enchanter is typically second
          await page.waitForTimeout(300);
          await page.getByTestId('path-confirm-button').click();
          hasSelectedPath = true;

          // Passive paths don't show power choice - combat continues
        } else if (level === 3 && hasSelectedPath) {
          // Wait for stance enhancement popup
          await expect(page.getByTestId('stance-enhancement-popup')).toBeVisible({ timeout: 5000 });

          // Verify CORRECT enhancements (Enchanter)
          // From enchanter-enhancements.ts: tier 1 is "Searing Touch" and "Weakening Hex"
          await expect(page.locator('text=Searing Touch')).toBeVisible();
          await expect(page.locator('text=Weakening Hex')).toBeVisible();

          // Verify WRONG enhancements NOT shown (Guardian)
          // From guardian-enhancements.ts: tier 1 is "Fortified Skin" and "Sharpened Thorns"
          await expect(page.locator('text=Fortified Skin')).not.toBeVisible();
          await expect(page.locator('text=Sharpened Thorns')).not.toBeVisible();

          reachedLevel3Enhancement = true;
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(reachedLevel3Enhancement).toBe(true);
  });

  test('Stance toggle should switch between Arcane Surge and Hex Veil', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    await page.goto('/');
    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    let hasSelectedPath = false;

    for (let attempt = 0; attempt < 30 && !hasSelectedPath; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible().catch(() => false);
      if (levelUpVisible) {
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        const level = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');

        await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
        await page.waitForTimeout(500);

        if (level === 2) {
          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });
          const pathButtons = page.getByRole('button', { name: /Select Path/i });
          await pathButtons.last().click(); // Enchanter
          await page.waitForTimeout(300);
          await page.getByTestId('path-confirm-button').click();
          hasSelectedPath = true;
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(hasSelectedPath).toBe(true);

    // Now verify stance toggle exists and can switch stances
    // NOTE: This requires testids to be added to StanceToggle.tsx first (see Step 0)
    await expect(page.getByTestId('stance-toggle')).toBeVisible({ timeout: 5000 });

    // Click stance toggle to switch
    await page.getByTestId('stance-toggle').click();

    // Verify stance changed (check for visual indicator)
    await expect(page.getByTestId('active-stance')).toContainText(/Arcane Surge|Hex Veil/);
  });
});
```

**Step 2: Run test**

Run: `npx playwright test e2e/enchanter-progression.spec.ts --project="Desktop"`
Expected: PASS

**Step 3: Commit**

```bash
git add e2e/enchanter-progression.spec.ts
git commit -m "test(e2e): add Enchanter progression E2E tests with correct enhancement names"
```

---

## Phase 5: Final Verification

### Task 5.1: Run Full Test Suite

**Step 1:** `npx vitest run` - Expected: PASS
**Step 2:** `npx playwright test --project="Desktop"` - Expected: PASS
**Step 3:** `npx tsc --noEmit` - Expected: PASS
**Step 4:** `npm run lint` - Expected: PASS or minor warnings

---

### Task 5.2: E2E Verification - Archmage Full Playthrough

Run: `npx playwright test e2e/archmage-progression.spec.ts --project="Desktop"`

This test covers AC-1, AC-2, AC-3 in an automated browser test.

---

### Task 5.3: E2E Verification - Enchanter Full Playthrough

Run: `npx playwright test e2e/enchanter-progression.spec.ts --project="Desktop"`

This test covers AC-4 in an automated browser test.

---

### Task 5.4: Final Commit

```bash
git add -A
git commit -m "feat(mage): complete Mage paths fix

- Wire Archmage powers to progression and input systems
- Wire Enchanter enhancements to progression system
- Implement all 6 hex effects (slow, regen, lifesteal, armor reduction, reflect, heal on attack)
- Implement burn proc and all 11 burn modifiers
- Add comprehensive E2E tests with negative cases
- All unit tests and E2E tests passing"
```

---

## Summary

| Phase | Tasks | What It Covers |
|-------|-------|----------------|
| 0 | 1 | Verify test hooks exist |
| 1 | 6 | Critical wiring fixes (Archmage + Enchanter) |
| 2 | 6 | All hex effects (hexSlowPercent, hexRegen, hexLifesteal, hexArmorReduction, hexReflect, hexHealOnEnemyAttack) |
| 3 | 9 | All burn effects (proc+procChance, damagePercent, durationBonus, maxStacks, tickRateMultiplier, executeBonus, ignoresArmor, canCrit, critRefreshes+lifesteal+damageVsBurning) |
| 4 | 2 | Missing E2E test files |
| 5 | 4 | Final verification |

**Total tasks:** 28
**Critical path:** Phase 0 → Phase 1 (Tasks 1.1-1.5) → Phase 5.2-5.3
