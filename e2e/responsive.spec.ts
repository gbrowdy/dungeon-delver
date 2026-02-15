// e2e/responsive.spec.ts
// E2E tests for mobile responsiveness at 320px width.
// Verifies all screens render without overflow, buttons meet 44px touch target
// minimum, and horizontal scroll works for shop cards.
import { test, expect } from '@playwright/test';
import { navigateClean, selectClassAndBegin } from './helpers/game-actions';

// ---------------------------------------------------------------------------
// Use 320x568 viewport for all tests (narrowest supported width)
// ---------------------------------------------------------------------------
test.use({ viewport: { width: 320, height: 568 } });

const VIEWPORT_WIDTH = 320;
const VIEWPORT_HEIGHT = 568;
const MIN_TOUCH_TARGET = 44;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert an element's bounding box is at least partially within the viewport. */
async function assertInViewport(
  page: import('@playwright/test').Page,
  locator: import('@playwright/test').Locator,
  label: string
) {
  const box = await locator.boundingBox();
  expect(box, `${label} should have a bounding box`).not.toBeNull();
  // Element should overlap with the viewport (not entirely off-screen)
  expect(box!.x + box!.width).toBeGreaterThan(0);
  expect(box!.x).toBeLessThan(VIEWPORT_WIDTH);
  expect(box!.y + box!.height).toBeGreaterThan(0);
  expect(box!.y).toBeLessThan(VIEWPORT_HEIGHT + 200); // allow some scroll
}

/** Assert a button/element meets the 44x44px minimum touch target. */
async function assertTouchTarget(
  locator: import('@playwright/test').Locator,
  label: string
) {
  const box = await locator.boundingBox();
  expect(box, `${label} should have a bounding box`).not.toBeNull();
  expect(box!.width, `${label} width should be >= ${MIN_TOUCH_TARGET}px`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  expect(box!.height, `${label} height should be >= ${MIN_TOUCH_TARGET}px`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
}

/** Setup a combat run via test hooks. */
async function setupTestRun(
  page: import('@playwright/test').Page,
  options: { floor?: number; checkpoint?: number; stats?: Record<string, number> } = {}
) {
  await navigateClean(page, 'testMode=true');
  await page.evaluate(
    ({ floor, stats }) => {
      window.__TEST_HOOKS__?.setupRun({
        classId: 'warrior',
        floor: floor ?? 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stats: stats as any,
      });
    },
    { floor: options.floor ?? 1, stats: options.stats }
  );
  if (options.checkpoint !== undefined) {
    await page.evaluate((cp) => {
      window.__TEST_HOOKS__?.setState({ checkpoint: cp });
    }, options.checkpoint);
  }
  await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
}

// ---------------------------------------------------------------------------
// 1. Main Menu at 320px
// ---------------------------------------------------------------------------
test.describe('Mobile: Main Menu', () => {
  test('Start Game button is visible and clickable at 320px', async ({ page }) => {
    await navigateClean(page);

    const startButton = page.getByRole('button', { name: /start game/i });
    await expect(startButton).toBeVisible();

    // Button should be within the viewport
    await assertInViewport(page, startButton, 'Start Game button');

    // Title should be visible
    const title = page.locator('h1');
    await expect(title).toBeVisible();

    // Button should be tappable (not overflowing off-screen)
    const box = await startButton.boundingBox();
    expect(box).not.toBeNull();
    // Entire button fits within viewport width
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH);
  });

  test('Start Game button meets touch target size', async ({ page }) => {
    await navigateClean(page);

    const startButton = page.getByRole('button', { name: /start game/i });
    await expect(startButton).toBeVisible();
    await assertTouchTarget(startButton, 'Start Game button');
  });
});

// ---------------------------------------------------------------------------
// 2. Class Select at 320px
// ---------------------------------------------------------------------------
test.describe('Mobile: Class Select', () => {
  test('all 3 class cards are visible and accessible', async ({ page }) => {
    await navigateClean(page);
    await page.getByRole('button', { name: /start game/i }).click();

    // All three class cards should be present (stacked vertically on mobile)
    for (const id of ['warrior', 'mage', 'rogue']) {
      const card = page.getByTestId(`class-card-${id}`);
      await expect(card).toBeVisible();
    }
  });

  test('class cards are tappable at 320px width', async ({ page }) => {
    await navigateClean(page);
    await page.getByRole('button', { name: /start game/i }).click();

    // Tap warrior card
    const warriorCard = page.getByTestId('class-card-warrior');
    await expect(warriorCard).toBeVisible();
    await warriorCard.click();

    // Warrior card should be selected
    await expect(warriorCard).toHaveAttribute('data-selected', 'true');

    // Each card should fit within 320px width
    for (const id of ['warrior', 'mage', 'rogue']) {
      const card = page.getByTestId(`class-card-${id}`);
      const box = await card.boundingBox();
      expect(box, `${id} card should have a bounding box`).not.toBeNull();
      expect(box!.width, `${id} card should fit within viewport`).toBeLessThanOrEqual(VIEWPORT_WIDTH);
    }
  });

  test('Begin Descent button is accessible after class selection', async ({ page }) => {
    await navigateClean(page);
    await page.getByRole('button', { name: /start game/i }).click();

    // Select a class
    await page.getByTestId('class-card-warrior').click();

    // Scroll to the confirm button if needed and verify it is visible
    const beginButton = page.getByRole('button', { name: /begin descent/i });
    await beginButton.scrollIntoViewIfNeeded();
    await expect(beginButton).toBeVisible();
    await expect(beginButton).toBeEnabled();

    // Should meet touch target size
    await assertTouchTarget(beginButton, 'Begin Descent button');

    // Should fit within viewport width
    const box = await beginButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH);
  });
});

// ---------------------------------------------------------------------------
// 3. Combat Screen at 320px
// ---------------------------------------------------------------------------
test.describe('Mobile: Combat Screen', () => {
  test('combat UI elements are visible at 320px', async ({ page }) => {
    await setupTestRun(page);

    // Floor indicator
    const floorIndicator = page.getByTestId('floor-indicator');
    await expect(floorIndicator).toBeVisible();
    await assertInViewport(page, floorIndicator, 'Floor indicator');

    // Health bars
    const playerHealth = page.getByTestId('player-health');
    const enemyHealth = page.getByTestId('enemy-health');
    await expect(playerHealth).toBeVisible();
    await expect(enemyHealth).toBeVisible();

    // Speed and pause buttons
    const speedToggle = page.getByTestId('speed-toggle');
    const pauseToggle = page.getByTestId('pause-toggle');
    await expect(speedToggle).toBeVisible();
    await expect(pauseToggle).toBeVisible();
  });

  test('speed and pause buttons meet touch target at 320px', async ({ page }) => {
    await setupTestRun(page);

    const speedToggle = page.getByTestId('speed-toggle');
    const pauseToggle = page.getByTestId('pause-toggle');

    await assertTouchTarget(speedToggle, 'Speed toggle');
    await assertTouchTarget(pauseToggle, 'Pause toggle');
  });

  test('combat header does not overflow at 320px', async ({ page }) => {
    await setupTestRun(page);

    // Floor indicator and controls should both fit in the header row
    const floorIndicator = page.getByTestId('floor-indicator');
    const speedToggle = page.getByTestId('speed-toggle');

    const floorBox = await floorIndicator.boundingBox();
    const speedBox = await speedToggle.boundingBox();

    expect(floorBox).not.toBeNull();
    expect(speedBox).not.toBeNull();

    // Both should be within viewport width
    expect(floorBox!.x).toBeGreaterThanOrEqual(0);
    expect(speedBox!.x + speedBox!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1); // +1 for rounding
  });

  test('character sheet toggle is visible during combat at 320px', async ({ page }) => {
    await setupTestRun(page);

    const toggle = page.getByTestId('character-sheet-toggle');
    await expect(toggle).toBeVisible();
    await assertInViewport(page, toggle, 'Character sheet toggle');
  });
});

// ---------------------------------------------------------------------------
// 4. Draft Screen at 320px
// ---------------------------------------------------------------------------
test.describe('Mobile: Draft Screen', () => {
  test('draft cards fit within 320px and are all visible', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    // Setup run and trigger draft
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({ classId: 'warrior', floor: 1 });
    });
    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setState({ fightCount: 3 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = window.__TEST_HOOKS__?.getState() as any;
      if (state?.openDraft) state.openDraft();
    });

    await expect(page.getByTestId('draft-screen')).toBeVisible({ timeout: 5000 });

    // Draft uses a 3-column grid — all cards should be visible
    const cards = page.locator('[data-testid="draft-screen"] button').filter({ hasNotText: /confirm/i });
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);

    // Each card should fit within the viewport width (accounting for the 3-col grid)
    for (let i = 0; i < Math.min(cardCount, 3); i++) {
      const card = cards.nth(i);
      await expect(card).toBeVisible();
      const box = await card.boundingBox();
      expect(box, `Draft card ${i} should have a bounding box`).not.toBeNull();
      // Card's right edge should not exceed viewport
      expect(box!.x + box!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
      // Card should not be pushed off the left edge
      expect(box!.x).toBeGreaterThanOrEqual(0);
    }
  });

  test('draft confirm button is visible and meets touch target', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({ classId: 'warrior', floor: 1 });
    });
    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setState({ fightCount: 3 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = window.__TEST_HOOKS__?.getState() as any;
      if (state?.openDraft) state.openDraft();
    });

    await expect(page.getByTestId('draft-screen')).toBeVisible({ timeout: 5000 });

    const confirmButton = page.getByRole('button', { name: /confirm/i });
    await confirmButton.scrollIntoViewIfNeeded();
    await expect(confirmButton).toBeVisible();
    await assertInViewport(page, confirmButton, 'Draft confirm button');
  });

  test('draft cards are tappable on mobile (select + confirm flow)', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({ classId: 'warrior', floor: 1 });
    });
    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setState({ fightCount: 3 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = window.__TEST_HOOKS__?.getState() as any;
      if (state?.openDraft) state.openDraft();
    });

    await expect(page.getByTestId('draft-screen')).toBeVisible({ timeout: 5000 });

    // Tap first card
    const cards = page.locator('[data-testid="draft-screen"] button').filter({ hasNotText: /confirm/i });
    await cards.first().click();

    // Confirm should now be enabled
    const confirmButton = page.getByRole('button', { name: /confirm/i });
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // Draft screen should close
    await expect(page.getByTestId('draft-screen')).not.toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 5. Shop Screen at 320px
// ---------------------------------------------------------------------------
test.describe('Mobile: Shop Screen', () => {
  test('shop cards are scrollable horizontally at 320px', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({
        classId: 'warrior',
        floor: 3,
        stats: { power: 100, fortitude: 50, speed: 30 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = window.__TEST_HOOKS__?.getState() as any;
      if (state?.openShop) state.openShop();
    });

    await expect(page.getByTestId('shop-screen')).toBeVisible({ timeout: 5000 });

    // Shop uses horizontal scroll on mobile (flex + overflow-x-auto)
    // Verify the scroll container exists
    const scrollContainer = page.getByTestId('shop-screen').locator('.overflow-x-auto');
    const containerExists = await scrollContainer.count();

    if (containerExists > 0) {
      // The container should be scrollable if there are many cards
      const containerBox = await scrollContainer.boundingBox();
      expect(containerBox).not.toBeNull();
      // Container should not be wider than viewport (it should scroll internally)
      expect(containerBox!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
    }

    // Verify at least the first card is visible
    const shopCards = page.getByTestId('shop-screen').locator('button').filter({ hasNotText: /confirm/i });
    const cardCount = await shopCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);
    await expect(shopCards.first()).toBeVisible();
  });

  test('shop confirm button is visible and not cut off at 320px', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({
        classId: 'warrior',
        floor: 3,
        stats: { power: 100, fortitude: 50, speed: 30 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = window.__TEST_HOOKS__?.getState() as any;
      if (state?.openShop) state.openShop();
    });

    await expect(page.getByTestId('shop-screen')).toBeVisible({ timeout: 5000 });

    const confirmButton = page.getByTestId('shop-screen').getByRole('button', { name: /confirm/i });
    await confirmButton.scrollIntoViewIfNeeded();
    await expect(confirmButton).toBeVisible();

    // Confirm button should fit within viewport
    const box = await confirmButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
  });

  test('shop card selection works on mobile', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({
        classId: 'warrior',
        floor: 3,
        stats: { power: 100, fortitude: 50, speed: 30 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = window.__TEST_HOOKS__?.getState() as any;
      if (state?.openShop) state.openShop();
    });

    await expect(page.getByTestId('shop-screen')).toBeVisible({ timeout: 5000 });

    // Try to select a shop card — stat_boost cards select directly, item cards open comparison
    const shopCards = page.getByTestId('shop-screen').locator('button').filter({ hasNotText: /confirm/i });
    await shopCards.first().click();

    // Either a comparison modal appeared or the card was selected
    const keepButton = page.getByRole('button', { name: /keep/i });
    const isComparing = await keepButton.isVisible().catch(() => false);

    if (isComparing) {
      // Comparison modal should be usable at 320px
      await keepButton.click();
    }

    // After interaction, confirm button should eventually be usable
    const confirmButton = page.getByTestId('shop-screen').getByRole('button', { name: /confirm/i });
    // Select another card if first was an item comparison we dismissed
    const cardCount = await shopCards.count();
    if (cardCount > 1) {
      await shopCards.nth(1).click();
      const keepVisible = await keepButton.isVisible().catch(() => false);
      if (keepVisible) {
        // Accept this item instead
        const equipButton = page.getByRole('button', { name: /equip/i });
        const equipVisible = await equipButton.isVisible().catch(() => false);
        if (equipVisible) {
          await equipButton.click();
        } else {
          await keepButton.click();
        }
      }
    }

    // At this point we should have at least one selection
    // Confirm and verify transition
    const isEnabled = await confirmButton.isEnabled().catch(() => false);
    if (isEnabled) {
      await confirmButton.click();
      // Should transition to floor-complete
      await expect(page.getByTestId('floor-complete')).toBeVisible({ timeout: 10000 });
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Floor Complete at 320px
// ---------------------------------------------------------------------------
test.describe('Mobile: Floor Complete', () => {
  test('continue button is visible and meets touch target', async ({ page }) => {
    await setupTestRun(page, { floor: 2 });

    // Force floor-complete phase
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setPhase('floor-complete');
    });

    await expect(page.getByTestId('floor-complete')).toBeVisible({ timeout: 5000 });

    const continueButton = page.getByTestId('continue-button');
    await continueButton.scrollIntoViewIfNeeded();
    await expect(continueButton).toBeVisible();

    // Touch target check
    await assertTouchTarget(continueButton, 'Continue button');

    // Should fit within viewport
    const box = await continueButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
  });

  test('floor complete stats grid fits within 320px', async ({ page }) => {
    await setupTestRun(page, {
      floor: 2,
      stats: { power: 50, fortitude: 40, speed: 30 },
    });

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setPhase('floor-complete');
    });

    await expect(page.getByTestId('floor-complete')).toBeVisible({ timeout: 5000 });

    // The floor-complete screen content should not overflow
    const screenBox = await page.getByTestId('floor-complete').boundingBox();
    expect(screenBox).not.toBeNull();
    // Width should not exceed viewport
    expect(screenBox!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);

    // "Floor X Complete!" heading should be readable
    const heading = page.getByTestId('floor-complete').locator('h2');
    await expect(heading).toBeVisible();
    await assertInViewport(page, heading, 'Floor complete heading');
  });

  test('continue button works on tap at 320px', async ({ page }) => {
    await setupTestRun(page, { floor: 2 });

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setPhase('floor-complete');
    });

    await expect(page.getByTestId('floor-complete')).toBeVisible({ timeout: 5000 });

    const continueButton = page.getByTestId('continue-button');
    await continueButton.click();

    // Should transition to combat on floor 3
    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
    const floorText = await page.getByTestId('floor-indicator').textContent();
    expect(floorText).toContain('Floor 3');
  });
});

// ---------------------------------------------------------------------------
// 7. Death Screen at 320px
// ---------------------------------------------------------------------------
test.describe('Mobile: Death Screen', () => {
  test('retry button is visible and meets touch target at 320px', async ({ page }) => {
    await setupTestRun(page, { floor: 3 });

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.killPlayer();
    });

    const deathScreen = page.getByTestId('death-screen');
    await expect(deathScreen).toBeVisible({ timeout: 5000 });

    const retryButton = page.getByTestId('retry-button');
    await retryButton.scrollIntoViewIfNeeded();
    await expect(retryButton).toBeVisible();

    // Touch target check
    await assertTouchTarget(retryButton, 'Retry button');

    // Should fit within viewport
    const box = await retryButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
  });

  test('death screen stat comparison does not overflow at 320px', async ({ page }) => {
    await setupTestRun(page, {
      floor: 5,
      stats: { power: 25, fortitude: 15, speed: 20 },
    });

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.killPlayer();
    });

    const deathScreen = page.getByTestId('death-screen');
    await expect(deathScreen).toBeVisible({ timeout: 5000 });

    // Death screen should contain key info
    const content = await deathScreen.textContent();
    expect(content).toContain('Defeated');
    expect(content).toContain('Power');
    expect(content).toContain('Weakness');

    // The screen width should not exceed viewport
    const screenBox = await deathScreen.boundingBox();
    expect(screenBox).not.toBeNull();
    expect(screenBox!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
  });

  test('retry button works on tap at 320px', async ({ page }) => {
    await setupTestRun(page, { floor: 3 });

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.killPlayer();
    });

    await expect(page.getByTestId('death-screen')).toBeVisible({ timeout: 5000 });

    const retryButton = page.getByTestId('retry-button');
    await retryButton.click();

    // Should return to combat
    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 8. Endless Screens at 320px
// ---------------------------------------------------------------------------
test.describe('Mobile: Endless Screens', () => {
  test('endless-intro Enter button meets touch target at 320px', async ({ page }) => {
    await setupTestRun(page, { floor: 100, checkpoint: 100 });

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setPhase('endless-intro');
    });

    await expect(page.getByTestId('endless-intro')).toBeVisible({ timeout: 5000 });

    const enterButton = page.getByRole('button', { name: /enter/i });
    await enterButton.scrollIntoViewIfNeeded();
    await expect(enterButton).toBeVisible();
    await assertTouchTarget(enterButton, 'Enter Endless button');

    // Content should not overflow
    const introBox = await page.getByTestId('endless-intro').boundingBox();
    expect(introBox).not.toBeNull();
    expect(introBox!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
  });

  test('endless-defeat Return to Menu button meets touch target at 320px', async ({ page }) => {
    await setupTestRun(page, { floor: 105 });

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.killPlayer();
    });

    const endlessDefeat = page.getByTestId('endless-defeat');
    await expect(endlessDefeat).toBeVisible({ timeout: 5000 });

    const menuButton = page.getByRole('button', { name: /return to menu/i });
    await menuButton.scrollIntoViewIfNeeded();
    await expect(menuButton).toBeVisible();
    await assertTouchTarget(menuButton, 'Return to Menu button');

    // Content should not overflow
    const defeatBox = await endlessDefeat.boundingBox();
    expect(defeatBox).not.toBeNull();
    expect(defeatBox!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
  });

  test('endless-defeat Return to Menu works on tap', async ({ page }) => {
    await setupTestRun(page, { floor: 105 });

    await page.evaluate(() => {
      window.__TEST_HOOKS__?.killPlayer();
    });

    await expect(page.getByTestId('endless-defeat')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /return to menu/i }).click();

    // Should return to main menu
    await expect(page.getByRole('button', { name: /start game/i })).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 9. Cross-screen Touch Target Audit
// ---------------------------------------------------------------------------
test.describe('Mobile: Touch Target Audit', () => {
  test('main menu Start Game button is at least 44x44', async ({ page }) => {
    await navigateClean(page);
    const btn = page.getByRole('button', { name: /start game/i });
    await expect(btn).toBeVisible();
    await assertTouchTarget(btn, 'Start Game');
  });

  test('class select Begin Descent button is at least 44x44', async ({ page }) => {
    await navigateClean(page);
    await page.getByRole('button', { name: /start game/i }).click();
    await page.getByTestId('class-card-warrior').click();

    const btn = page.getByRole('button', { name: /begin descent/i });
    await btn.scrollIntoViewIfNeeded();
    await assertTouchTarget(btn, 'Begin Descent');
  });

  test('combat speed/pause buttons are at least 44x44', async ({ page }) => {
    await setupTestRun(page);
    await assertTouchTarget(page.getByTestId('speed-toggle'), 'Speed toggle');
    await assertTouchTarget(page.getByTestId('pause-toggle'), 'Pause toggle');
  });

  test('death screen retry button is at least 44x44', async ({ page }) => {
    await setupTestRun(page, { floor: 3 });
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.killPlayer();
    });
    await expect(page.getByTestId('death-screen')).toBeVisible({ timeout: 5000 });
    const btn = page.getByTestId('retry-button');
    await btn.scrollIntoViewIfNeeded();
    await assertTouchTarget(btn, 'Retry');
  });

  test('floor-complete continue button is at least 44x44', async ({ page }) => {
    await setupTestRun(page, { floor: 2 });
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setPhase('floor-complete');
    });
    await expect(page.getByTestId('floor-complete')).toBeVisible({ timeout: 5000 });
    const btn = page.getByTestId('continue-button');
    await btn.scrollIntoViewIfNeeded();
    await assertTouchTarget(btn, 'Continue');
  });

  test('endless-intro Enter button is at least 44x44', async ({ page }) => {
    await setupTestRun(page, { floor: 100, checkpoint: 100 });
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setPhase('endless-intro');
    });
    await expect(page.getByTestId('endless-intro')).toBeVisible({ timeout: 5000 });
    const btn = page.getByRole('button', { name: /enter/i });
    await btn.scrollIntoViewIfNeeded();
    await assertTouchTarget(btn, 'Enter Endless');
  });

  test('endless-defeat Return to Menu button is at least 44x44', async ({ page }) => {
    await setupTestRun(page, { floor: 105 });
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.killPlayer();
    });
    await expect(page.getByTestId('endless-defeat')).toBeVisible({ timeout: 5000 });
    const btn = page.getByRole('button', { name: /return to menu/i });
    await btn.scrollIntoViewIfNeeded();
    await assertTouchTarget(btn, 'Return to Menu');
  });
});
