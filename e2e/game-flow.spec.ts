// e2e/game-flow.spec.ts
// E2E tests for the full game flow: menu → class-select → combat → draft → floor-complete → boss shop
import { test, expect } from '@playwright/test';
import {
  navigateClean,
  selectClassAndBegin,
  setSpeedToMax,
  waitForCombatOutcome,
  handleDraft,
  handleShop,
  continueFromFloorComplete,
  handleNonCombatScreen,
} from './helpers/game-actions';

// ---------------------------------------------------------------------------
// 1. Main Menu → Start Game
// ---------------------------------------------------------------------------
test.describe('Main Menu', () => {
  test('shows Start Game button and navigates to class select', async ({ page }) => {
    await navigateClean(page);

    const startButton = page.getByRole('button', { name: /start game/i });
    await expect(startButton).toBeVisible();

    await startButton.click();

    // Class select screen should appear with all three class cards
    await expect(page.getByTestId('class-card-warrior')).toBeVisible();
    await expect(page.getByTestId('class-card-mage')).toBeVisible();
    await expect(page.getByTestId('class-card-rogue')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Class Selection → Combat Start
// ---------------------------------------------------------------------------
test.describe('Class Selection', () => {
  test.beforeEach(async ({ page }) => {
    await navigateClean(page);
  });

  for (const className of ['Warrior', 'Mage', 'Rogue'] as const) {
    test(`selecting ${className} starts combat`, async ({ page }) => {
      await selectClassAndBegin(page, className);

      // Combat UI elements should be present
      await expect(page.getByTestId('floor-indicator')).toBeVisible();
      await expect(page.getByTestId('player-health')).toBeVisible();
      await expect(page.getByTestId('enemy-health')).toBeVisible();
      await expect(page.getByTestId('speed-toggle')).toBeVisible();
      await expect(page.getByTestId('pause-toggle')).toBeVisible();
    });
  }

  test('Begin Descent button is disabled until a class is selected', async ({ page }) => {
    await page.getByRole('button', { name: /start game/i }).click();

    const beginButton = page.getByRole('button', { name: /begin descent/i });
    await expect(beginButton).toBeDisabled();

    // Select a class
    await page.getByTestId('class-card-warrior').click();
    await expect(beginButton).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// 3. Combat Basics
// ---------------------------------------------------------------------------
test.describe('Combat Screen', () => {
  test('floor indicator shows Floor 1, Room 1', async ({ page }) => {
    await navigateClean(page, 'testMode=true');
    await selectClassAndBegin(page, 'Warrior');

    const floorText = await page.getByTestId('floor-indicator').textContent();
    expect(floorText).toContain('Floor 1');
    expect(floorText).toContain('Room 1');
  });

  test('speed toggle cycles through 1x, 2x, 4x', async ({ page }) => {
    await navigateClean(page, 'testMode=true');
    await selectClassAndBegin(page, 'Warrior');

    const speedButton = page.getByTestId('speed-toggle');

    // Default is 1x
    await expect(speedButton).toContainText('1x');

    // Click → 2x
    await speedButton.click();
    await expect(speedButton).toContainText('2x');

    // Click → 4x
    await speedButton.click();
    await expect(speedButton).toContainText('4x');

    // Click → back to 1x
    await speedButton.click();
    await expect(speedButton).toContainText('1x');
  });

  test('pause button toggles between Pause and Play', async ({ page }) => {
    await navigateClean(page, 'testMode=true');
    await selectClassAndBegin(page, 'Warrior');

    const pauseButton = page.getByTestId('pause-toggle');

    // Default is Pause (game running)
    await expect(pauseButton).toContainText('Pause');

    await pauseButton.click();
    await expect(pauseButton).toContainText('Play');

    await pauseButton.click();
    await expect(pauseButton).toContainText('Pause');
  });

  test('character sheet toggle is visible during combat', async ({ page }) => {
    await navigateClean(page, 'testMode=true');
    await selectClassAndBegin(page, 'Warrior');

    await expect(page.getByTestId('character-sheet-toggle')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. Draft Flow
// ---------------------------------------------------------------------------
test.describe('Draft Flow', () => {
  test('draft screen appears after enemy kills and returns to combat', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    // Setup a strong player so enemies die fast
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({
        classId: 'warrior',
        floor: 1,
        stats: { power: 200, fortitude: 100, speed: 50 },
      });
    });

    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
    await setSpeedToMax(page);

    // With high stats, we should reach a draft (after 3 enemy kills) fairly quickly
    const outcome = await waitForCombatOutcome(page, { timeout: 30000 });
    // Could be draft or floor-complete depending on room count
    expect(['draft', 'floor_complete']).toContain(outcome);

    // If we hit a draft, handle it
    if (outcome === 'draft') {
      await expect(page.getByTestId('draft-screen')).toBeVisible();

      // Verify draft has selectable cards
      const cards = page.locator('[data-testid="draft-screen"] button').filter({ hasNotText: /confirm/i });
      await expect(cards.first()).toBeVisible();

      // Handle the draft (select first card + confirm)
      await handleDraft(page);

      // Should return to combat or hit another phase
      await expect(
        page.getByTestId('floor-indicator')
          .or(page.getByTestId('floor-complete'))
          .or(page.getByTestId('shop-screen'))
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('draft screen via testHooks: card selection and confirm', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    // Setup run, then force a draft phase with generated cards
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({ classId: 'warrior', floor: 1 });
    });

    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });

    // Trigger draft via the store's openDraft action
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setState({ fightCount: 3 });
      const state = window.__TEST_HOOKS__?.getState() as any;
      if (state?.openDraft) state.openDraft();
    });

    await expect(page.getByTestId('draft-screen')).toBeVisible({ timeout: 5000 });

    // Verify there are draft cards rendered
    const draftCards = page.locator('[data-testid="draft-screen"] button').filter({ hasNotText: /confirm/i });
    const cardCount = await draftCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);

    // Confirm button should be disabled with no selection
    const confirmButton = page.getByRole('button', { name: /confirm/i });
    await expect(confirmButton).toBeDisabled();

    // Select first card
    await draftCards.first().click();

    // Confirm should now be enabled
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // Should transition out of draft
    await expect(page.getByTestId('draft-screen')).not.toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 5. Floor Completion
// ---------------------------------------------------------------------------
test.describe('Floor Completion', () => {
  test('floor-complete screen shows after clearing last room of a non-boss floor', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    // Setup on floor 1 (non-boss, 2 rooms) with very high stats to clear quickly
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({
        classId: 'warrior',
        floor: 1,
        stats: { power: 500, fortitude: 200, speed: 80 },
      });
    });

    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
    await setSpeedToMax(page);

    // Wait for combat to resolve — could be draft or floor-complete
    let reached = false;
    for (let i = 0; i < 5; i++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });
      if (outcome === 'floor_complete') {
        reached = true;
        break;
      }
      if (outcome === 'draft') {
        await handleDraft(page);
        continue;
      }
      break;
    }

    expect(reached).toBe(true);

    await expect(page.getByTestId('floor-complete')).toBeVisible();
    const text = await page.getByTestId('floor-complete').textContent();
    expect(text).toContain('Floor');
    expect(text).toContain('Complete');
    await expect(page.getByTestId('continue-button')).toBeVisible();
  });

  test('continue button advances to next floor', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    // Setup a run and force floor-complete via the store
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({
        classId: 'warrior',
        floor: 2,
        stats: { power: 500, fortitude: 200, speed: 80 },
      });
    });

    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });

    // Force floor-complete phase
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setPhase('floor-complete');
    });

    await expect(page.getByTestId('floor-complete')).toBeVisible({ timeout: 5000 });

    // Click continue
    await continueFromFloorComplete(page);

    // Should be in combat on next floor
    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
    const floorText = await page.getByTestId('floor-indicator').textContent();
    expect(floorText).toContain('Floor 3');
  });
});

// ---------------------------------------------------------------------------
// 6. Boss Shop Flow
// ---------------------------------------------------------------------------
test.describe('Boss Shop', () => {
  test('shop screen appears after clearing boss floor (floor 3)', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    // Set up on boss floor 3 with high stats
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({
        classId: 'warrior',
        floor: 3,
        stats: { power: 500, fortitude: 200, speed: 80 },
      });
    });

    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
    await setSpeedToMax(page);

    // Fight through rooms until shop appears
    let reachedShop = false;
    for (let i = 0; i < 10; i++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });
      if (outcome === 'shop') {
        reachedShop = true;
        break;
      }
      if (outcome === 'draft') {
        await handleDraft(page);
        continue;
      }
      if (outcome === 'floor_complete') {
        await continueFromFloorComplete(page);
        continue;
      }
      break;
    }

    expect(reachedShop).toBe(true);

    await expect(page.getByTestId('shop-screen')).toBeVisible();
    const shopContent = await page.getByTestId('shop-screen').textContent();
    expect(shopContent).toContain('Boss Defeated');
  });

  test('shop card selection and confirm flow', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    // Setup run and force shop phase via store
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({
        classId: 'warrior',
        floor: 3,
        stats: { power: 100, fortitude: 50, speed: 30 },
      });
      const state = window.__TEST_HOOKS__?.getState() as any;
      if (state?.openShop) state.openShop();
    });

    await expect(page.getByTestId('shop-screen')).toBeVisible({ timeout: 5000 });

    // Shop should have cards
    const shopCards = page.getByTestId('shop-screen').locator('button').filter({ hasNotText: /confirm/i });
    const cardCount = await shopCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);

    // Confirm button should be disabled initially
    const confirmButton = page.getByTestId('shop-screen').getByRole('button', { name: /confirm/i });
    await expect(confirmButton).toBeDisabled();

    // Select a card
    await shopCards.first().click();

    // If an item comparison modal appeared, close it by clicking "Keep"
    const keepButton = page.getByRole('button', { name: /keep/i });
    if (await keepButton.isVisible().catch(() => false)) {
      await keepButton.click();
      // Try the next card instead (it was an item card that opened comparison)
      if (cardCount > 1) {
        await shopCards.nth(1).click();
      }
    }

    // Confirm should be enabled after selecting at least one card
    await expect(confirmButton).toBeEnabled({ timeout: 3000 });
    await confirmButton.click();

    // After shop confirm, transitions to floor-complete
    await expect(page.getByTestId('floor-complete')).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// 7. Full Flow: Start → Reach Floor 2+
// ---------------------------------------------------------------------------
test.describe('Full Game Flow', () => {
  test('complete flow from start to floor 2 using testHooks for speed', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    // Step 1: Start game, select Warrior, begin descent
    await selectClassAndBegin(page, 'Warrior');
    await expect(page.getByTestId('floor-indicator')).toBeVisible();

    // Boost player stats so combat is nearly instant
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setPlayerStats({
        power: 500,
        fortitude: 200,
        speed: 80,
      });
    });

    await setSpeedToMax(page);

    // Step 2: Fight through floor 1, handling intermediate screens
    let floorCompleted = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'floor_complete') {
        floorCompleted = true;
        break;
      }

      if (outcome === 'draft') {
        await handleDraft(page);
        continue;
      }

      if (outcome === 'player_died') {
        break;
      }

      break;
    }

    expect(floorCompleted).toBe(true);

    // Step 3: Continue to floor 2
    await expect(page.getByTestId('floor-complete')).toBeVisible();
    await continueFromFloorComplete(page);

    // Step 4: Verify we're on floor 2
    await expect(page.getByTestId('floor-indicator')).toBeVisible();
    const floorText = await page.getByTestId('floor-indicator').textContent();
    expect(floorText).toContain('Floor 2');
    expect(floorText).toContain('Room 1');

    // Verify combat elements are present on new floor
    await expect(page.getByTestId('player-health')).toBeVisible();
    await expect(page.getByTestId('enemy-health')).toBeVisible();
  });

  test('full flow through boss floor 3 with shop', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    // Start as Rogue (test a different class)
    await selectClassAndBegin(page, 'Rogue');

    // Boost stats massively
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setPlayerStats({
        power: 1000,
        fortitude: 500,
        speed: 100,
      });
    });

    await setSpeedToMax(page);

    // Clear floors 1-3, handling all screens
    let currentFloor = 1;
    const MAX_ITERATIONS = 20;

    for (let i = 0; i < MAX_ITERATIONS && currentFloor < 4; i++) {
      const phase = await page.evaluate(() => window.__TEST_HOOKS__?.getState()?.phase);

      if (phase === 'combat') {
        const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

        if (outcome === 'draft') {
          await handleDraft(page);
        } else if (outcome === 'floor_complete') {
          currentFloor++;
          await continueFromFloorComplete(page);
        } else if (outcome === 'shop') {
          await expect(page.getByTestId('shop-screen')).toBeVisible();
          await handleShop(page);

          // After shop → floor-complete
          await expect(page.getByTestId('floor-complete')).toBeVisible({ timeout: 10000 });
          currentFloor++;
          await continueFromFloorComplete(page);
        } else if (outcome === 'player_died') {
          // Re-boost and retry
          await page.getByTestId('retry-button').click();
          await page.evaluate(() => {
            window.__TEST_HOOKS__?.setPlayerStats({
              power: 1000,
              fortitude: 500,
              speed: 100,
            });
          });
        }
      } else {
        const handled = await handleNonCombatScreen(page);
        if (!handled) break;
      }
    }

    // We should have progressed beyond floor 3
    expect(currentFloor).toBeGreaterThanOrEqual(4);
  });
});
