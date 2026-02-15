// e2e/helpers/game-actions.ts
// V2 rebuild — Zustand store, no ECS/paths/levels
import { Page, expect } from '@playwright/test';

/**
 * Navigate to game (optionally with URL params like testMode=true)
 */
export async function navigateToGame(page: Page, params?: string): Promise<void> {
  const url = params ? `/?${params}` : '/';
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate with clean state — clears localStorage then reloads.
 * Use this at the start of each test to ensure no persisted state leaks.
 */
export async function navigateClean(page: Page, params?: string): Promise<void> {
  await navigateToGame(page, params);
  await page.evaluate(() => localStorage.removeItem('rogue-game-state'));
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Parse health bar text like "HP 120 / 150" into { current, max }
 */
export function parseHealthText(text: string | null): { current: number; max: number } | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  return { current: parseInt(match[1]), max: parseInt(match[2]) };
}

/**
 * Select a class and begin the game.
 * V2: MainMenu → ClassSelect → Combat (no paths/levels)
 */
export async function selectClassAndBegin(
  page: Page,
  className: 'Warrior' | 'Mage' | 'Rogue'
): Promise<void> {
  // Click start game from main menu
  await page.getByRole('button', { name: /start game/i }).click();

  // Wait for class selection to be visible, click the class card
  const classCard = page.getByTestId(`class-card-${className.toLowerCase()}`);
  await classCard.waitFor({ state: 'visible' });
  await classCard.click();

  // Click begin button (v2: "Begin Descent")
  const beginButton = page.getByRole('button', { name: /begin descent/i });
  await expect(beginButton).toBeEnabled();
  await beginButton.click();

  // Wait for combat to load
  await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
}

/**
 * Set combat speed to maximum (4x) by cycling until we reach it.
 * V2: speed cycles 1x → 2x → 4x → 1x via data-testid="speed-toggle"
 */
export async function setSpeedToMax(page: Page): Promise<void> {
  const speedButton = page.getByTestId('speed-toggle');

  // Cycle until we see "4x"
  for (let i = 0; i < 3; i++) {
    const text = await speedButton.textContent();
    if (text?.includes('4x')) break;
    await speedButton.click();
  }

  await page.waitForTimeout(200);
}

/**
 * Wait for combat to reach an outcome.
 * Returns which outcome was detected first.
 */
export async function waitForCombatOutcome(
  page: Page,
  options: { timeout?: number } = {}
): Promise<'player_died' | 'floor_complete' | 'draft' | 'shop' | 'endless_intro'> {
  const timeout = options.timeout ?? 120000;

  const result = await Promise.race([
    page.getByTestId('death-screen').waitFor({ state: 'visible', timeout }).then(() => 'player_died' as const),
    page.getByTestId('floor-complete').waitFor({ state: 'visible', timeout }).then(() => 'floor_complete' as const),
    page.getByTestId('draft-screen').waitFor({ state: 'visible', timeout }).then(() => 'draft' as const),
    page.getByTestId('shop-screen').waitFor({ state: 'visible', timeout }).then(() => 'shop' as const),
    page.getByTestId('endless-intro').waitFor({ state: 'visible', timeout }).then(() => 'endless_intro' as const),
  ]);

  return result;
}

/**
 * Wait for enemy to die (health reaches 0 or element disappears)
 */
export async function waitForEnemyDeath(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? 60000;

  await page.waitForFunction(
    () => {
      const enemyHealth = document.querySelector('[data-testid="enemy-health"]');
      if (!enemyHealth) return true;

      const healthText = enemyHealth.textContent;
      if (healthText?.startsWith('0/') || healthText?.startsWith('0 /')) return true;

      return false;
    },
    { timeout, polling: 100 }
  );
}

/**
 * Wait for new enemy to spawn (health bar > 0)
 */
export async function waitForEnemySpawn(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const enemyHealth = document.querySelector('[data-testid="enemy-health"]');
      if (!enemyHealth) return false;

      const healthText = enemyHealth.textContent;
      if (!healthText) return false;

      const match = healthText.match(/^(\d+)/);
      return match && parseInt(match[1]) > 0;
    },
    { timeout: 10000, polling: 100 }
  );
}

/**
 * Wait for death screen and click respawn
 */
export async function waitForDeathAndRetry(page: Page): Promise<void> {
  await expect(page.getByTestId('death-screen')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('retry-button').click();
  await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
}

/**
 * Wait for draft screen and select first card, then confirm
 */
export async function handleDraft(page: Page): Promise<void> {
  await expect(page.getByTestId('draft-screen')).toBeVisible({ timeout: 5000 });

  // Select first draft card
  const cards = page.locator('[data-testid="draft-screen"] button').filter({ hasNotText: /confirm/i });
  await cards.first().click();

  // Confirm
  await page.getByRole('button', { name: /confirm/i }).click();
}

/**
 * Wait for shop screen, select first card, then confirm
 */
export async function handleShop(page: Page): Promise<void> {
  await expect(page.getByTestId('shop-screen')).toBeVisible({ timeout: 5000 });

  // Select first shop card
  const cards = page.getByTestId('shop-screen').locator('[data-testid^="shop-card"]');
  // Fallback: just click the first interactive card element
  const firstCard = cards.first().or(
    page.getByTestId('shop-screen').locator('button').first()
  );
  await firstCard.click();

  // Confirm
  await page.getByRole('button', { name: /confirm/i }).click();
}

/**
 * Wait for floor complete screen
 */
export async function waitForFloorComplete(page: Page): Promise<void> {
  await expect(page.getByTestId('floor-complete')).toBeVisible({ timeout: 120000 });
}

/**
 * Continue from floor complete screen
 */
export async function continueFromFloorComplete(page: Page): Promise<void> {
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
}

/**
 * Handle any non-combat screen (draft, shop, floor-complete) to get back to combat.
 * Returns false if death screen is encountered.
 */
export async function handleNonCombatScreen(page: Page): Promise<boolean> {
  // Check for death screen first
  const deathVisible = await page.getByTestId('death-screen').isVisible().catch(() => false);
  if (deathVisible) return false;

  // Draft screen
  const draftVisible = await page.getByTestId('draft-screen').isVisible().catch(() => false);
  if (draftVisible) {
    await handleDraft(page);
    return true;
  }

  // Shop screen
  const shopVisible = await page.getByTestId('shop-screen').isVisible().catch(() => false);
  if (shopVisible) {
    await handleShop(page);
    // Shop transitions to floor-complete
    await page.waitForTimeout(500);
    return handleNonCombatScreen(page);
  }

  // Floor complete screen
  const floorCompleteVisible = await page.getByTestId('floor-complete').isVisible().catch(() => false);
  if (floorCompleteVisible) {
    await continueFromFloorComplete(page);
    return true;
  }

  // Endless intro
  const endlessIntroVisible = await page.getByTestId('endless-intro').isVisible().catch(() => false);
  if (endlessIntroVisible) {
    await page.getByRole('button', { name: /enter/i }).click();
    return true;
  }

  return true;
}
