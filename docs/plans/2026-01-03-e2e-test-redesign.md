# E2E Test Redesign

## Problem

The ECS migration broke the existing E2E test infrastructure. The old test hooks (`useTestHooks.ts`) used `GameState/setState` patterns that no longer exist. Tests timeout waiting for `window.__TEST_HOOKS__` that never initializes.

More fundamentally, the old tests relied on state manipulation rather than testing real user interactions, which masked bugs in the actual game flow.

## Solution

Replace hook-based tests with pure user-interaction tests that simulate real gameplay. Add dev mode URL parameters to speed up progression for testing later-game content.

## Dev Mode Parameters

| Param | Type | Purpose |
|-------|------|---------|
| `devMode=true` | boolean | Required to enable other params |
| `xpMultiplier=N` | number | Multiply XP gains (e.g., 5 = level up in 2-3 kills) |
| `playerAttack=N` | number | Override base attack stat |
| `playerDefense=N` | number | Override base defense stat |
| `startFloor=N` | number | Skip to floor N |
| `gold=N` | number | Starting gold amount |

## Test Suite

### Phase 1: Core Loop (No dev params)

```typescript
test('start game and reach combat outcome')
// Start → Class select → Combat → Either enemy dies or player dies

test('death screen appears and retry works')
// Die → Death screen visible → Retry → Back in combat
```

### Phase 2: First Progression (No dev params)

```typescript
test('killing enemy shows XP gain')
// Kill enemy → Verify XP display increases
```

### Phase 3: Level Up and Path Selection

```typescript
test('level up triggers path selection', async ({ page }) => {
  await page.goto('/?devMode=true&xpMultiplier=5&playerAttack=30&playerDefense=15');
  // Kill 2-3 enemies → Level 2 → Path selection UI appears
  // Select path → Combat resumes
});
```

### Phase 4: Floor Complete

```typescript
test('floor complete shows rewards', async ({ page }) => {
  await page.goto('/?devMode=true&playerAttack=40&playerDefense=20');
  // Clear all 4 rooms → Floor complete screen appears
  // Verify continue button works → Floor 2 starts
});
```

### Phase 5: Shop (At Death)

```typescript
test('shop purchase works', async ({ page }) => {
  await page.goto('/?devMode=true&gold=500');
  // Fight → Die → Death screen → Open shop → Purchase item
  // Verify inventory updates → Retry
});
```

## File Structure

```
e2e/
├── game-flow.spec.ts          # New test suite
├── helpers/
│   ├── test-utils.ts          # Existing (phase out hook-based helpers)
│   └── game-actions.ts        # NEW: Pure UI interaction helpers
src/
├── hooks/
│   └── useDevMode.ts          # NEW: Dev param handling
```

## Helper Functions (game-actions.ts)

```typescript
// Navigation
async function navigateToGame(page: Page): Promise<void>
async function selectClassAndBegin(page: Page, className: string): Promise<void>

// Combat controls
async function setSpeedToMax(page: Page): Promise<void>
async function waitForCombatOutcome(page: Page): Promise<'enemy_died' | 'player_died' | 'floor_complete'>
async function waitForEnemySpawn(page: Page): Promise<void>

// Progression
async function waitForDeathScreen(page: Page): Promise<void>
async function clickRetry(page: Page): Promise<void>
async function waitForFloorComplete(page: Page): Promise<void>

// Shop
async function openShop(page: Page): Promise<void>
async function purchaseItem(page: Page, itemIndex: number): Promise<void>
```

## Principles

1. **No arbitrary waits** - All waits are condition-based (element visible, text changes)
2. **Test real interactions** - Click buttons, not inject state
3. **Dev params set preconditions** - Tests verify behavior from there
4. **Accept natural outcomes** - Test that game functions, not that player wins

## Cleanup: Tests to Remove

These existing tests rely on broken hook infrastructure and should be deleted:

| File | Reason |
|------|--------|
| `e2e/death-recovery.spec.ts` | Uses `setPlayerHealth` hook - replaced by Phase 1 death test |
| `e2e/floor-clear.spec.ts` | Uses `setPlayerInvincible`, `setEnemyOneHitKill` - replaced by Phase 4 |
| `e2e/power-usage.spec.ts` | Uses `waitForTestHooks` - power usage will be tested via real combat |
| `e2e/enemy-ability-logs.spec.ts` | Uses `setEnemyAbilities` hook - test via natural enemy encounters |
| `e2e/health-restoration.spec.ts` | Uses hooks for state manipulation |
| `e2e/level-up-path.spec.ts` | Uses `setPlayerLevel` - replaced by Phase 3 |

**Keep (no hooks, still valid):**

| File | Reason |
|------|--------|
| `e2e/start-game.spec.ts` | Pure UI tests, no hook dependencies |
| `e2e/responsive.spec.ts` | Layout tests, no game state manipulation |
| `e2e/combat-mobile.spec.ts` | Screenshot/layout tests |
| `e2e/classselect-tablet.spec.ts` | Screenshot/layout tests |

**Source files to remove:**

| File | Reason |
|------|--------|
| `src/hooks/useTestHooks.ts` | Old hook infrastructure, no longer works with ECS |
| `src/types/test-hooks.ts` | Types for removed hooks |

**Helper cleanup:**

| File | Action |
|------|--------|
| `e2e/helpers/test-utils.ts` | Remove hook-based functions (`setPlayerHealth`, `setEnemyOneHitKill`, etc.), keep `gotoTestMode`, `startGameWithClass` |

## Implementation Order

1. Create `useDevMode.ts` hook and integrate with game initialization
2. Create `game-actions.ts` helpers
3. Implement Phase 1 tests (core loop)
4. Implement Phase 2-5 tests incrementally
5. Delete old hook-based tests and source files
6. Clean up `test-utils.ts` to remove hook functions
