# Combat Utility Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate 5 patterns of duplicative combat logic into centralized utility functions, each as a separate PR with unit and E2E tests.

**Architecture:** Create two new utility files (`statsUtils.ts` for player state modifications, `combatUtils.ts` for combat-specific utilities) following the existing patterns in `damageUtils.ts` and `statusEffectUtils.ts`. Each utility returns an immutable result object with the updated entity and optional log messages.

**Tech Stack:** TypeScript, Vitest (unit tests), Playwright (E2E tests), existing test hooks infrastructure.

---

## PR 1: Health/Mana Restoration Utilities

**Branch:** `refactor/health-mana-restoration`

**Commit message:** `refactor(utils): centralize health/mana restoration (#XX)`

### Task 1.1: Create statsUtils.ts with health restoration

**Files:**
- Create: `src/utils/statsUtils.ts`
- Test: `src/utils/__tests__/statsUtils.test.ts`

**Step 1: Write the failing test for restorePlayerHealth**

```typescript
// src/utils/__tests__/statsUtils.test.ts
import { describe, it, expect } from 'vitest';
import { restorePlayerHealth } from '../statsUtils';
import { Player } from '@/types/game';

const createMockPlayer = (overrides?: Partial<Player>): Player => ({
  name: 'Test Player',
  class: 'warrior',
  level: 1,
  experience: 0,
  experienceToNext: 100,
  gold: 0,
  baseStats: {
    health: 100,
    maxHealth: 100,
    power: 10,
    armor: 5,
    speed: 10,
    mana: 50,
    maxMana: 50,
    fortune: 5,
  },
  currentStats: {
    health: 50,
    maxHealth: 100,
    power: 10,
    armor: 5,
    speed: 10,
    mana: 25,
    maxMana: 50,
    fortune: 5,
  },
  powers: [],
  inventory: [],
  equippedItems: [],
  activeBuffs: [],
  statusEffects: [],
  isBlocking: false,
  comboCount: 0,
  lastPowerUsed: null,
  isDying: false,
  path: null,
  pendingAbilityChoice: false,
  shield: 0,
  shieldMaxDuration: 0,
  shieldRemainingDuration: 0,
  usedCombatAbilities: [],
  usedFloorAbilities: [],
  enemyAttackCounter: 0,
  abilityCounters: {},
  attackModifiers: [],
  hpRegen: 0,
  ...overrides,
});

describe('restorePlayerHealth', () => {
  it('restores health up to max', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 50, maxHealth: 100 },
    });
    const result = restorePlayerHealth(player, 30);

    expect(result.player.currentStats.health).toBe(80);
    expect(result.actualAmount).toBe(30);
  });

  it('caps health at maxHealth', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 90, maxHealth: 100 },
    });
    const result = restorePlayerHealth(player, 50);

    expect(result.player.currentStats.health).toBe(100);
    expect(result.actualAmount).toBe(10);
  });

  it('generates log with source when provided', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 50, maxHealth: 100 },
    });
    const result = restorePlayerHealth(player, 15, { source: 'Divine Heal' });

    expect(result.log).toBe('Divine Heal restores 15 HP');
  });

  it('generates log without source', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 50, maxHealth: 100 },
    });
    const result = restorePlayerHealth(player, 15);

    expect(result.log).toBe('Restored 15 HP');
  });

  it('notes full health in log when capped', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 95, maxHealth: 100 },
    });
    const result = restorePlayerHealth(player, 20);

    expect(result.log).toContain('(full health)');
    expect(result.actualAmount).toBe(5);
  });

  it('does not mutate the original player', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 50, maxHealth: 100 },
    });
    const originalHealth = player.currentStats.health;

    restorePlayerHealth(player, 30);

    expect(player.currentStats.health).toBe(originalHealth);
  });

  it('handles zero restoration', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100, maxHealth: 100 },
    });
    const result = restorePlayerHealth(player, 20);

    expect(result.actualAmount).toBe(0);
    expect(result.log).toContain('(full health)');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/utils/__tests__/statsUtils.test.ts
```

Expected: FAIL with "Cannot find module '../statsUtils'"

**Step 3: Write minimal implementation**

```typescript
// src/utils/statsUtils.ts
import type { Player } from '@/types/game';
import { deepClonePlayer } from '@/utils/stateUtils';

/**
 * Result of restoring health or mana to a player.
 */
export interface RestoreResult {
  /** Updated player with restoration applied (cloned, not mutated) */
  player: Player;
  /** Actual amount restored (may be less if capped at max) */
  actualAmount: number;
  /** Optional log message describing the restoration */
  log?: string;
}

/**
 * Options for restoration functions.
 */
export interface RestoreOptions {
  /** Source of the restoration (e.g., "Divine Heal", "Life Steal") for log messages */
  source?: string;
}

/**
 * Restore health to a player, capping at maxHealth.
 *
 * @param player - The player to restore health to
 * @param amount - Amount of health to restore
 * @param options - Optional configuration (source for logging)
 * @returns RestoreResult with updated player and metadata
 *
 * @example
 * ```typescript
 * const result = restorePlayerHealth(player, 25, { source: 'Divine Heal' });
 * player = result.player;
 * if (result.log) logs.push(result.log);
 * ```
 */
export function restorePlayerHealth(
  player: Player,
  amount: number,
  options?: RestoreOptions
): RestoreResult {
  const updatedPlayer = deepClonePlayer(player);
  const currentHealth = updatedPlayer.currentStats.health;
  const maxHealth = updatedPlayer.currentStats.maxHealth;

  const newHealth = Math.min(maxHealth, currentHealth + amount);
  const actualAmount = newHealth - currentHealth;
  updatedPlayer.currentStats.health = newHealth;

  // Generate log message
  let log: string | undefined;
  if (actualAmount > 0) {
    if (options?.source) {
      log = `${options.source} restores ${actualAmount} HP`;
    } else {
      log = `Restored ${actualAmount} HP`;
    }
    if (newHealth >= maxHealth) {
      log += ' (full health)';
    }
  } else if (newHealth >= maxHealth) {
    log = options?.source
      ? `${options.source} restores 0 HP (full health)`
      : 'Restored 0 HP (full health)';
  }

  return {
    player: updatedPlayer,
    actualAmount,
    log,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/utils/__tests__/statsUtils.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/statsUtils.ts src/utils/__tests__/statsUtils.test.ts
git commit -m "feat(utils): add restorePlayerHealth utility with tests"
```

---

### Task 1.2: Add mana restoration to statsUtils

**Files:**
- Modify: `src/utils/statsUtils.ts`
- Modify: `src/utils/__tests__/statsUtils.test.ts`

**Step 1: Write the failing tests for restorePlayerMana**

Add to `src/utils/__tests__/statsUtils.test.ts`:

```typescript
describe('restorePlayerMana', () => {
  it('restores mana up to max', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, mana: 25, maxMana: 50 },
    });
    const result = restorePlayerMana(player, 15);

    expect(result.player.currentStats.mana).toBe(40);
    expect(result.actualAmount).toBe(15);
  });

  it('caps mana at maxMana', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, mana: 45, maxMana: 50 },
    });
    const result = restorePlayerMana(player, 20);

    expect(result.player.currentStats.mana).toBe(50);
    expect(result.actualAmount).toBe(5);
  });

  it('generates log with source when provided', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, mana: 25, maxMana: 50 },
    });
    const result = restorePlayerMana(player, 10, { source: 'Mana Potion' });

    expect(result.log).toBe('Mana Potion restores 10 MP');
  });

  it('generates log without source', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, mana: 25, maxMana: 50 },
    });
    const result = restorePlayerMana(player, 10);

    expect(result.log).toBe('Restored 10 MP');
  });

  it('notes full mana in log when capped', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, mana: 48, maxMana: 50 },
    });
    const result = restorePlayerMana(player, 10);

    expect(result.log).toContain('(full mana)');
    expect(result.actualAmount).toBe(2);
  });

  it('does not mutate the original player', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, mana: 25, maxMana: 50 },
    });
    const originalMana = player.currentStats.mana;

    restorePlayerMana(player, 15);

    expect(player.currentStats.mana).toBe(originalMana);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/utils/__tests__/statsUtils.test.ts
```

Expected: FAIL with "restorePlayerMana is not defined"

**Step 3: Add implementation**

Add to `src/utils/statsUtils.ts`:

```typescript
/**
 * Restore mana to a player, capping at maxMana.
 *
 * @param player - The player to restore mana to
 * @param amount - Amount of mana to restore
 * @param options - Optional configuration (source for logging)
 * @returns RestoreResult with updated player and metadata
 *
 * @example
 * ```typescript
 * const result = restorePlayerMana(player, 15, { source: 'Mana Potion' });
 * player = result.player;
 * if (result.log) logs.push(result.log);
 * ```
 */
export function restorePlayerMana(
  player: Player,
  amount: number,
  options?: RestoreOptions
): RestoreResult {
  const updatedPlayer = deepClonePlayer(player);
  const currentMana = updatedPlayer.currentStats.mana;
  const maxMana = updatedPlayer.currentStats.maxMana;

  const newMana = Math.min(maxMana, currentMana + amount);
  const actualAmount = newMana - currentMana;
  updatedPlayer.currentStats.mana = newMana;

  // Generate log message
  let log: string | undefined;
  if (actualAmount > 0) {
    if (options?.source) {
      log = `${options.source} restores ${actualAmount} MP`;
    } else {
      log = `Restored ${actualAmount} MP`;
    }
    if (newMana >= maxMana) {
      log += ' (full mana)';
    }
  } else if (newMana >= maxMana) {
    log = options?.source
      ? `${options.source} restores 0 MP (full mana)`
      : 'Restored 0 MP (full mana)';
  }

  return {
    player: updatedPlayer,
    actualAmount,
    log,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/utils/__tests__/statsUtils.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/statsUtils.ts src/utils/__tests__/statsUtils.test.ts
git commit -m "feat(utils): add restorePlayerMana utility with tests"
```

---

### Task 1.3: Update call sites to use new utilities

**Files to update:**
- `src/hooks/combatActionHelpers.ts`
- `src/hooks/useCombat.ts`
- `src/hooks/useItemEffects.ts`
- `src/hooks/usePathAbilities.ts`
- `src/hooks/usePowerActions.ts`
- `src/hooks/usePowers.ts`

**Step 1: Search for all health restoration patterns**

```bash
rg "Math\.min.*maxHealth.*health \+" src/hooks/
rg "currentStats\.health = Math\.min" src/hooks/
```

**Step 2: Replace each occurrence**

For each file, replace patterns like:
```typescript
// Before
player.currentStats.health = Math.min(
  player.currentStats.maxHealth,
  player.currentStats.health + healAmount
);
logs.push(`Healed for ${healAmount} HP!`);

// After
import { restorePlayerHealth } from '@/utils/statsUtils';

const healResult = restorePlayerHealth(player, healAmount, { source: 'Power Name' });
player = healResult.player;
if (healResult.log) logs.push(healResult.log);
```

**Step 3: Replace mana restoration patterns**

For each file, replace patterns like:
```typescript
// Before
player.currentStats.mana = Math.min(
  player.currentStats.maxMana,
  player.currentStats.mana + manaAmount
);

// After
import { restorePlayerMana } from '@/utils/statsUtils';

const manaResult = restorePlayerMana(player, manaAmount);
player = manaResult.player;
```

**Step 4: Run all unit tests**

```bash
npx vitest run
```

Expected: All tests PASS

**Step 5: Run build and lint**

```bash
npm run build && npm run lint
```

Expected: No errors

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(hooks): use centralized health/mana restoration utilities"
```

---

### Task 1.4: Add E2E test for health restoration

**Files:**
- Create: `e2e/health-restoration.spec.ts`

**Step 1: Write E2E test**

```typescript
// e2e/health-restoration.spec.ts
import { test, expect } from '@playwright/test';
import {
  gotoTestMode,
  startGameWithClass,
  waitForTestHooks,
  setPlayerHealth,
  getCombatLogs,
} from './helpers/test-utils';

test.describe('Health Restoration', () => {
  test('healing power restores health and generates log', async ({ page }) => {
    await gotoTestMode(page);
    await startGameWithClass(page, 'PALADIN'); // Paladin has Divine Heal
    await waitForTestHooks(page);

    // Set player health to 50% to ensure healing works
    await setPlayerHealth(page, 50);

    // Wait a moment for state to update
    await page.waitForTimeout(500);

    // Get health display before healing
    const healthDisplay = page.getByTestId('health-display');
    const healthBefore = await healthDisplay.textContent();

    // Click Divine Heal power
    const healButton = page.getByTestId('power-divine-heal');
    await expect(healButton).toBeVisible({ timeout: 5000 });
    await healButton.click();

    // Verify health increased
    await expect(healthDisplay).not.toHaveText(healthBefore!, { timeout: 3000 });

    // Verify combat log contains heal message
    const logs = await getCombatLogs(page);
    const healLog = logs.find(log => log.includes('restores') && log.includes('HP'));
    expect(healLog).toBeDefined();
  });
});
```

**Step 2: Run E2E test**

```bash
npx playwright test e2e/health-restoration.spec.ts
```

Expected: PASS

**Step 3: Commit**

```bash
git add e2e/health-restoration.spec.ts
git commit -m "test(e2e): add health restoration test"
```

---

### Task 1.5: Create PR

**Step 1: Push branch**

```bash
git push -u origin refactor/health-mana-restoration
```

**Step 2: Create PR**

```bash
gh pr create --title "refactor(utils): centralize health/mana restoration" --body "$(cat <<'EOF'
## Summary
- Add `restorePlayerHealth()` and `restorePlayerMana()` utilities in `statsUtils.ts`
- Replace 20+ inline restoration patterns across hooks
- Add comprehensive unit tests (13 test cases)
- Add E2E test for healing power

## Test plan
- [x] Unit tests pass: `npx vitest run`
- [x] E2E tests pass: `npx playwright test`
- [x] Build succeeds: `npm run build`
- [x] Lint passes: `npm run lint`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## PR 2: Path Resource Generation Utility

**Branch:** `refactor/path-resource-generation`

**Commit message:** `refactor(utils): centralize path resource generation (#XX)`

### Task 2.1: Add path resource generation to statsUtils

**Files:**
- Modify: `src/utils/statsUtils.ts`
- Modify: `src/utils/__tests__/statsUtils.test.ts`

**Step 1: Write the failing tests**

Add to `src/utils/__tests__/statsUtils.test.ts`:

```typescript
import { generatePathResource } from '../statsUtils';

// Add to mock player creation - player with path resource
const createMockPlayerWithPath = (overrides?: Partial<Player>): Player => ({
  ...createMockPlayer(),
  path: {
    id: 'berserker',
    name: 'Berserker',
    description: 'Fury-based combat',
    classId: 'warrior',
    abilities: [],
    resourceType: 'fury',
  },
  pathResource: {
    type: 'fury',
    current: 50,
    max: 100,
    color: '#ef4444',
    generation: {
      onHit: 5,
      onCrit: 10,
      onKill: 15,
      onBlock: 3,
      onDamaged: 5,
      onPowerUse: 0,
    },
  },
  ...overrides,
});

describe('generatePathResource', () => {
  it('generates resource on hit', () => {
    const player = createMockPlayerWithPath();
    const result = generatePathResource(player, 'onHit');

    expect(result.player.pathResource?.current).toBe(55);
    expect(result.amountGenerated).toBe(5);
  });

  it('generates resource on crit', () => {
    const player = createMockPlayerWithPath();
    const result = generatePathResource(player, 'onCrit');

    expect(result.player.pathResource?.current).toBe(60);
    expect(result.amountGenerated).toBe(10);
  });

  it('caps resource at max', () => {
    const player = createMockPlayerWithPath({
      pathResource: {
        ...createMockPlayerWithPath().pathResource!,
        current: 95,
      },
    });
    const result = generatePathResource(player, 'onKill');

    expect(result.player.pathResource?.current).toBe(100);
    expect(result.amountGenerated).toBe(5);
  });

  it('generates log with resource name', () => {
    const player = createMockPlayerWithPath();
    const result = generatePathResource(player, 'onHit');

    expect(result.log).toBe('+5 Fury');
  });

  it('returns zero if no path resource', () => {
    const player = createMockPlayer(); // No path
    const result = generatePathResource(player, 'onHit');

    expect(result.amountGenerated).toBe(0);
    expect(result.log).toBeUndefined();
  });

  it('returns zero if generation is zero for trigger', () => {
    const player = createMockPlayerWithPath();
    const result = generatePathResource(player, 'onPowerUse');

    expect(result.amountGenerated).toBe(0);
  });

  it('does not mutate the original player', () => {
    const player = createMockPlayerWithPath();
    const originalResource = player.pathResource?.current;

    generatePathResource(player, 'onHit');

    expect(player.pathResource?.current).toBe(originalResource);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/utils/__tests__/statsUtils.test.ts
```

**Step 3: Add implementation**

Add to `src/utils/statsUtils.ts`:

```typescript
/**
 * Trigger types for path resource generation.
 */
export type ResourceTrigger = 'onHit' | 'onCrit' | 'onKill' | 'onBlock' | 'onDamaged' | 'onPowerUse';

/**
 * Result of generating path resources.
 */
export interface ResourceGenResult {
  /** Updated player with resource generated (cloned, not mutated) */
  player: Player;
  /** Actual amount generated (may be less if capped at max) */
  amountGenerated: number;
  /** Optional log message (e.g., "+5 Fury") */
  log?: string;
}

/**
 * Get the display name for a resource type.
 */
function getResourceDisplayName(type: string): string {
  const names: Record<string, string> = {
    fury: 'Fury',
    zeal: 'Zeal',
    momentum: 'Momentum',
    arcane_charges: 'Arcane Charges',
  };
  return names[type] || type;
}

/**
 * Generate path resource based on a trigger event.
 *
 * @param player - The player to generate resource for
 * @param trigger - The event that triggered generation
 * @returns ResourceGenResult with updated player and metadata
 *
 * @example
 * ```typescript
 * const result = generatePathResource(player, 'onHit');
 * player = result.player;
 * if (result.log) logs.push(result.log);
 * ```
 */
export function generatePathResource(
  player: Player,
  trigger: ResourceTrigger
): ResourceGenResult {
  const updatedPlayer = deepClonePlayer(player);

  // No path resource system
  if (!updatedPlayer.pathResource) {
    return {
      player: updatedPlayer,
      amountGenerated: 0,
    };
  }

  const generation = updatedPlayer.pathResource.generation[trigger] || 0;
  if (generation <= 0) {
    return {
      player: updatedPlayer,
      amountGenerated: 0,
    };
  }

  const currentResource = updatedPlayer.pathResource.current;
  const maxResource = updatedPlayer.pathResource.max;
  const newResource = Math.min(maxResource, currentResource + generation);
  const amountGenerated = newResource - currentResource;

  updatedPlayer.pathResource = {
    ...updatedPlayer.pathResource,
    current: newResource,
  };

  let log: string | undefined;
  if (amountGenerated > 0) {
    const resourceName = getResourceDisplayName(updatedPlayer.pathResource.type);
    log = `+${amountGenerated} ${resourceName}`;
  }

  return {
    player: updatedPlayer,
    amountGenerated,
    log,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/utils/__tests__/statsUtils.test.ts
```

**Step 5: Commit**

```bash
git add src/utils/statsUtils.ts src/utils/__tests__/statsUtils.test.ts
git commit -m "feat(utils): add generatePathResource utility with tests"
```

---

### Task 2.2: Update call sites

**Files to update:**
- `src/hooks/useCombatActions.ts` (4 locations)
- `src/hooks/usePowerActions.ts` (1 location)

**Step 1: Search for resource generation patterns**

```bash
rg "getResourceGeneration" src/hooks/
rg "pathResource.current = Math.min" src/hooks/
```

**Step 2: Replace each occurrence with generatePathResource**

**Step 3: Run tests and build**

```bash
npx vitest run && npm run build && npm run lint
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(hooks): use centralized path resource generation"
```

---

### Task 2.3: Add E2E test

**Files:**
- Create: `e2e/path-resource.spec.ts`

**Step 1: Write E2E test**

```typescript
// e2e/path-resource.spec.ts
import { test, expect } from '@playwright/test';
import {
  gotoTestMode,
  startGameWithClass,
  waitForTestHooks,
  setPlayerInvincible,
} from './helpers/test-utils';

test.describe('Path Resource Generation', () => {
  test('warrior berserker generates fury on hit', async ({ page }) => {
    await gotoTestMode(page);
    await startGameWithClass(page, 'WARRIOR');
    await waitForTestHooks(page);

    // Set player level to 2 to trigger path selection
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setPlayerLevel(2);
    });

    // Wait for path selection
    await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });

    // Select Berserker path
    await page.getByText('Berserker').click();
    await page.getByTestId('path-confirm-button').click();

    // Wait for combat to resume
    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });

    // Set invincible so we can watch combat
    await setPlayerInvincible(page, true);

    // Wait for some combat to happen (resource should generate)
    await page.waitForTimeout(5000);

    // Check that fury resource is visible and has value > 0
    const resourceDisplay = page.getByTestId('path-resource-display');
    await expect(resourceDisplay).toBeVisible({ timeout: 5000 });

    // Resource should have generated from hits
    const resourceValue = await page.evaluate(() => {
      return window.__TEST_HOOKS__?.getGameState()?.player?.pathResource?.current ?? 0;
    });
    expect(resourceValue).toBeGreaterThan(0);
  });
});
```

**Step 2: Run and commit**

```bash
npx playwright test e2e/path-resource.spec.ts
git add e2e/path-resource.spec.ts
git commit -m "test(e2e): add path resource generation test"
```

---

### Task 2.4: Create PR

```bash
git push -u origin refactor/path-resource-generation
gh pr create --title "refactor(utils): centralize path resource generation" --body "$(cat <<'EOF'
## Summary
- Add `generatePathResource()` utility in `statsUtils.ts`
- Replace 5 inline resource generation patterns
- Add unit tests (7 test cases)
- Add E2E test for warrior fury generation

## Test plan
- [x] Unit tests pass
- [x] E2E tests pass
- [x] Build succeeds
- [x] Lint passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## PR 3: Trigger Result Application Utility

**Branch:** `refactor/trigger-result-application`

**Commit message:** `refactor(combat): centralize trigger result application (#XX)`

### Task 3.1: Create combatUtils.ts with trigger application

**Files:**
- Create: `src/utils/combatUtils.ts`
- Create: `src/utils/__tests__/combatUtils.test.ts`

**Step 1: Write failing tests**

```typescript
// src/utils/__tests__/combatUtils.test.ts
import { describe, it, expect } from 'vitest';
import { applyPathTriggerToEnemy } from '../combatUtils';
import { Enemy } from '@/types/game';

const createMockEnemy = (overrides?: Partial<Enemy>): Enemy => ({
  id: 'test-enemy-1',
  name: 'Goblin',
  health: 100,
  maxHealth: 100,
  power: 10,
  armor: 5,
  speed: 8,
  experienceReward: 50,
  goldReward: 25,
  isBoss: false,
  abilities: [],
  intent: null,
  statusEffects: [],
  statDebuffs: [],
  isShielded: false,
  shieldTurnsRemaining: 0,
  isEnraged: false,
  enrageTurnsRemaining: 0,
  isDying: false,
  isFinalBoss: false,
  modifiers: [],
  ...overrides,
});

describe('applyPathTriggerToEnemy', () => {
  it('applies damage from trigger result', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyPathTriggerToEnemy(enemy, {
      damageAmount: 25,
    });

    expect(result.enemy.health).toBe(75);
    expect(result.logs.length).toBeGreaterThan(0);
  });

  it('applies reflected damage from trigger result', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyPathTriggerToEnemy(enemy, {
      reflectedDamage: 15,
    });

    expect(result.enemy.health).toBe(85);
    expect(result.logs.some(log => log.includes('reflected'))).toBe(true);
  });

  it('applies both damage and reflected damage', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyPathTriggerToEnemy(enemy, {
      damageAmount: 20,
      reflectedDamage: 10,
    });

    expect(result.enemy.health).toBe(70);
  });

  it('handles empty trigger result', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyPathTriggerToEnemy(enemy, {});

    expect(result.enemy.health).toBe(100);
    expect(result.logs).toHaveLength(0);
  });

  it('does not mutate original enemy', () => {
    const enemy = createMockEnemy({ health: 100 });
    const originalHealth = enemy.health;

    applyPathTriggerToEnemy(enemy, { damageAmount: 25 });

    expect(enemy.health).toBe(originalHealth);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/utils/__tests__/combatUtils.test.ts
```

**Step 3: Write implementation**

```typescript
// src/utils/combatUtils.ts
import type { Enemy } from '@/types/game';
import { applyDamageToEnemy } from '@/utils/damageUtils';

/**
 * Path trigger result that may contain damage, reflection, or status effects.
 */
export interface PathTriggerResult {
  damageAmount?: number;
  reflectedDamage?: number;
  statusEffects?: Array<{
    type: string;
    value?: number;
    damage?: number;
    duration: number;
  }>;
  // Add other trigger result fields as needed
}

/**
 * Result of applying path trigger effects to an enemy.
 */
export interface ApplyTriggerResult {
  /** Updated enemy with trigger effects applied */
  enemy: Enemy;
  /** Combat log messages generated */
  logs: string[];
}

/**
 * Apply path trigger effects to an enemy.
 *
 * Consolidates damage application, reflection, and status effects
 * from path ability triggers into a single function.
 *
 * @param enemy - The enemy to apply effects to
 * @param triggerResult - The trigger result containing effects
 * @returns ApplyTriggerResult with updated enemy and logs
 *
 * @example
 * ```typescript
 * const result = applyPathTriggerToEnemy(enemy, pathTriggerResult);
 * enemy = result.enemy;
 * logs.push(...result.logs);
 * ```
 */
export function applyPathTriggerToEnemy(
  enemy: Enemy,
  triggerResult: PathTriggerResult
): ApplyTriggerResult {
  let updatedEnemy = enemy;
  const logs: string[] = [];

  // Apply direct damage
  if (triggerResult.damageAmount && triggerResult.damageAmount > 0) {
    const damageResult = applyDamageToEnemy(updatedEnemy, triggerResult.damageAmount, 'path_ability');
    updatedEnemy = damageResult.enemy;
    logs.push(...damageResult.logs);
  }

  // Apply reflected damage
  if (triggerResult.reflectedDamage && triggerResult.reflectedDamage > 0) {
    const reflectResult = applyDamageToEnemy(updatedEnemy, triggerResult.reflectedDamage, 'reflect');
    updatedEnemy = reflectResult.enemy;
    logs.push(...reflectResult.logs);
  }

  // Status effects are handled by applyTriggerResultToEnemy in statusEffectUtils
  // This function focuses on damage consolidation

  return {
    enemy: updatedEnemy,
    logs,
  };
}
```

**Step 4: Run tests**

```bash
npx vitest run src/utils/__tests__/combatUtils.test.ts
```

**Step 5: Commit**

```bash
git add src/utils/combatUtils.ts src/utils/__tests__/combatUtils.test.ts
git commit -m "feat(utils): add applyPathTriggerToEnemy utility with tests"
```

---

### Task 3.2: Update call sites

**Files to update:**
- `src/hooks/useCombatActions.ts` (8 locations)
- `src/hooks/usePowerActions.ts` (2 locations)

**Step 1: Search for trigger application patterns**

```bash
rg "pathTriggerResult\.damageAmount" src/hooks/
rg "applyDamageToEnemy.*path_ability" src/hooks/
```

**Step 2: Replace patterns with applyPathTriggerToEnemy**

**Step 3: Run tests and commit**

```bash
npx vitest run && npm run build && npm run lint
git add -A
git commit -m "refactor(hooks): use centralized trigger result application"
```

---

### Task 3.3: Add E2E test and create PR

Similar pattern to previous PRs - test a path ability that deals damage on trigger.

---

## PR 4: Buff Creation Utility

**Branch:** `refactor/buff-creation`

**Commit message:** `refactor(utils): centralize buff creation (#XX)`

### Task 4.1: Add buff creation to statsUtils

**Files:**
- Modify: `src/utils/statsUtils.ts`
- Modify: `src/utils/__tests__/statsUtils.test.ts`

**Step 1: Write failing tests**

```typescript
import { addBuffToPlayer } from '../statsUtils';
import { BUFF_STAT } from '@/constants/enums';

describe('addBuffToPlayer', () => {
  it('adds buff to player', () => {
    const player = createMockPlayer();
    const result = addBuffToPlayer(player, {
      name: 'Power Surge',
      stat: BUFF_STAT.POWER,
      multiplier: 1.25,
      duration: 3,
    });

    expect(result.player.activeBuffs).toHaveLength(1);
    expect(result.player.activeBuffs[0].name).toBe('Power Surge');
    expect(result.player.activeBuffs[0].multiplier).toBe(1.25);
    expect(result.player.activeBuffs[0].remainingTurns).toBe(3);
  });

  it('generates unique ID for buff', () => {
    const player = createMockPlayer();
    const result1 = addBuffToPlayer(player, {
      name: 'Buff1',
      stat: BUFF_STAT.POWER,
      multiplier: 1.1,
      duration: 2,
    });
    const result2 = addBuffToPlayer(result1.player, {
      name: 'Buff2',
      stat: BUFF_STAT.ARMOR,
      multiplier: 1.2,
      duration: 2,
    });

    expect(result2.player.activeBuffs[0].id).not.toBe(result2.player.activeBuffs[1].id);
  });

  it('generates log message', () => {
    const player = createMockPlayer();
    const result = addBuffToPlayer(player, {
      name: 'Power Surge',
      stat: BUFF_STAT.POWER,
      multiplier: 1.25,
      duration: 3,
    });

    expect(result.log).toBe('Power increased by 25% for 3 turns!');
  });

  it('includes icon when provided', () => {
    const player = createMockPlayer();
    const result = addBuffToPlayer(player, {
      name: 'Test',
      stat: BUFF_STAT.POWER,
      multiplier: 1.1,
      duration: 2,
      icon: 'sword',
    });

    expect(result.player.activeBuffs[0].icon).toBe('sword');
  });

  it('does not mutate original player', () => {
    const player = createMockPlayer();
    const originalBuffCount = player.activeBuffs.length;

    addBuffToPlayer(player, {
      name: 'Test',
      stat: BUFF_STAT.POWER,
      multiplier: 1.1,
      duration: 2,
    });

    expect(player.activeBuffs.length).toBe(originalBuffCount);
  });
});
```

**Step 2: Implement addBuffToPlayer**

```typescript
import { BUFF_STAT } from '@/constants/enums';

/**
 * Configuration for creating a buff.
 */
export interface BuffConfig {
  name: string;
  stat: typeof BUFF_STAT[keyof typeof BUFF_STAT];
  multiplier: number;
  duration: number;
  icon?: string;
  source?: string;
}

/**
 * Result of adding a buff to a player.
 */
export interface AddBuffResult {
  player: Player;
  log?: string;
}

/**
 * Get human-readable stat name for log messages.
 */
function getStatDisplayName(stat: typeof BUFF_STAT[keyof typeof BUFF_STAT]): string {
  const names: Record<string, string> = {
    [BUFF_STAT.POWER]: 'Power',
    [BUFF_STAT.ARMOR]: 'Armor',
    [BUFF_STAT.SPEED]: 'Speed',
  };
  return names[stat] || stat;
}

/**
 * Add a temporary buff to a player.
 *
 * @param player - The player to add the buff to
 * @param config - Buff configuration
 * @returns AddBuffResult with updated player and log message
 *
 * @example
 * ```typescript
 * const result = addBuffToPlayer(player, {
 *   name: 'Power Surge',
 *   stat: BUFF_STAT.POWER,
 *   multiplier: 1.25,
 *   duration: 3,
 * });
 * player = result.player;
 * if (result.log) logs.push(result.log);
 * ```
 */
export function addBuffToPlayer(
  player: Player,
  config: BuffConfig
): AddBuffResult {
  const updatedPlayer = deepClonePlayer(player);

  const buff = {
    id: `buff-${config.source || config.name}-${Date.now()}`,
    name: config.name,
    stat: config.stat,
    multiplier: config.multiplier,
    remainingTurns: config.duration,
    icon: config.icon,
  };

  updatedPlayer.activeBuffs.push(buff);

  const percentChange = Math.round((config.multiplier - 1) * 100);
  const statName = getStatDisplayName(config.stat);
  const log = `${statName} increased by ${percentChange}% for ${config.duration} turns!`;

  return {
    player: updatedPlayer,
    log,
  };
}
```

**Step 3: Run tests and commit**

---

### Task 4.2: Update call sites

**Files to update:**
- `src/hooks/useCombat.ts`
- `src/hooks/useCombatActions.ts`
- `src/hooks/usePathAbilities.ts`
- `src/hooks/usePowerActions.ts`
- `src/hooks/usePowers.ts`
- `src/hooks/useRoomTransitions.ts`

---

### Task 4.3: Add E2E test and create PR

Test a power that grants a buff and verify the buff appears and expires.

---

## PR 5: Scaled Delay Calculation

**Branch:** `refactor/scaled-delay`

**Commit message:** `refactor(combat): centralize delay scaling (#XX)`

### Task 5.1: Add getScaledDelay to combatUtils

**Files:**
- Modify: `src/utils/combatUtils.ts`
- Modify: `src/utils/__tests__/combatUtils.test.ts`

**Step 1: Write failing tests**

```typescript
import { getScaledDelay } from '../combatUtils';

describe('getScaledDelay', () => {
  it('scales delay by combat speed 1x', () => {
    expect(getScaledDelay(1000, 1)).toBe(1000);
  });

  it('scales delay by combat speed 2x', () => {
    expect(getScaledDelay(1000, 2)).toBe(500);
  });

  it('scales delay by combat speed 3x', () => {
    expect(getScaledDelay(1000, 3)).toBe(333);
  });

  it('rounds down to integer', () => {
    expect(getScaledDelay(100, 3)).toBe(33);
  });
});
```

**Step 2: Implement**

```typescript
/**
 * Calculate a combat delay scaled by combat speed.
 *
 * @param baseDelay - Base delay in milliseconds
 * @param combatSpeed - Combat speed multiplier (1, 2, or 3)
 * @returns Scaled delay in milliseconds (integer)
 */
export function getScaledDelay(baseDelay: number, combatSpeed: number): number {
  return Math.floor(baseDelay / combatSpeed);
}
```

**Step 3: Run tests and commit**

---

### Task 5.2: Update call sites

**Files:**
- `src/hooks/useCombatActions.ts` (4 locations)

Replace:
```typescript
const scaledDelay = Math.floor(COMBAT_EVENT_DELAYS.PLAYER_HIT_DELAY / combatSpeed);
```

With:
```typescript
import { getScaledDelay } from '@/utils/combatUtils';
const scaledDelay = getScaledDelay(COMBAT_EVENT_DELAYS.PLAYER_HIT_DELAY, combatSpeed);
```

---

### Task 5.3: Create PR

No E2E test needed for this simple utility - unit tests are sufficient.

---

## Validation Checklist

For each PR before merging:

- [ ] `npx vitest run` - All unit tests pass
- [ ] `npx playwright test` - All E2E tests pass
- [ ] `npm run build` - Build succeeds
- [ ] `npm run lint` - No lint errors
- [ ] Manual smoke test - Play game briefly to verify no regressions
