// e2e/helpers/game-actions.ts
import { Page, expect } from '@playwright/test';

/**
 * Navigate to game (optionally with dev mode params)
 */
export async function navigateToGame(page: Page, devParams?: string): Promise<void> {
  const url = devParams ? `/?${devParams}` : '/';
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

/**
 * Select a class and begin the game
 */
export async function selectClassAndBegin(
  page: Page,
  className: 'Warrior' | 'Mage' | 'Rogue' | 'Paladin'
): Promise<void> {
  // Click start game
  await page.getByRole('button', { name: /start game/i }).click();

  // Wait for class selection to be visible
  const classButton = page.locator(`text=${className}`).first();
  await classButton.waitFor({ state: 'visible' });
  await classButton.click();

  // Click begin button
  const beginButton = page.getByRole('button', { name: /begin as/i });
  await expect(beginButton).toBeEnabled();
  await beginButton.click();

  // Wait for combat to load
  await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
}

/**
 * Set combat speed to maximum (3x)
 */
export async function setSpeedToMax(page: Page): Promise<void> {
  // Click the 3x speed button directly
  const speed3Button = page.getByRole('button', { name: 'Set combat speed to 3x' });
  await speed3Button.click();
  await expect(speed3Button).toHaveAttribute('aria-pressed', 'true');

  // Small wait to ensure combat has started processing at new speed
  await page.waitForTimeout(500);
}

/**
 * Wait for combat to reach an outcome
 */
export async function waitForCombatOutcome(
  page: Page,
  options: { timeout?: number } = {}
): Promise<'enemy_died' | 'player_died' | 'floor_complete'> {
  const timeout = options.timeout ?? 120000;

  // Race between: death screen, floor complete, or enemy health disappearing
  const result = await Promise.race([
    page.getByTestId('death-screen').waitFor({ state: 'visible', timeout }).then(() => 'player_died' as const),
    page.getByText(/Floor \d+ Complete!/).waitFor({ state: 'visible', timeout }).then(() => 'floor_complete' as const),
    waitForEnemyDeath(page, { timeout }).then(() => 'enemy_died' as const),
  ]);

  return result;
}

/**
 * Wait for enemy to die (health bar disappears or death animation)
 */
export async function waitForEnemyDeath(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? 60000;

  // Wait for enemy health bar to disappear or enemy to not be visible
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
 * Wait for new enemy to spawn
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
 * Wait for death screen and click retry
 */
export async function waitForDeathAndRetry(page: Page): Promise<void> {
  await expect(page.getByTestId('death-screen')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('retry-button').click();
  await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
}

/**
 * Wait for level up popup
 */
export async function waitForLevelUp(page: Page): Promise<number> {
  await expect(page.getByTestId('level-up-popup')).toBeVisible({ timeout: 30000 });
  const levelText = await page.getByTestId('level-up-new-level').textContent();
  const level = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');
  return level;
}

/**
 * Dismiss level up popup
 */
export async function dismissLevelUp(page: Page): Promise<void> {
  const closeButton = page.getByRole('button', { name: /continue|close|ok/i });
  await closeButton.click();
  await expect(page.getByTestId('level-up-popup')).not.toBeVisible();
}

/**
 * Wait for path selection screen
 */
export async function waitForPathSelection(page: Page): Promise<void> {
  await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 10000 });
}

/**
 * Select a path
 */
export async function selectPath(page: Page, pathIndex: number = 0): Promise<void> {
  const pathCards = page.locator('[data-testid^="path-card"]');
  await pathCards.nth(pathIndex).click();

  await page.getByTestId('path-confirm-button').click();

  await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
}

/**
 * Open shop from death screen
 */
export async function openShopFromDeath(page: Page): Promise<void> {
  await expect(page.getByTestId('death-screen')).toBeVisible();
  const shopButton = page.getByRole('button', { name: /shop/i });
  await shopButton.click();
  await expect(page.locator('text=Shop').or(page.locator('[data-testid="shop-screen"]'))).toBeVisible();
}

/**
 * Wait for floor complete screen
 */
export async function waitForFloorComplete(page: Page): Promise<void> {
  await expect(page.getByText('FLOOR COMPLETE!')).toBeVisible({ timeout: 120000 });
}

/**
 * Continue from floor complete
 */
export async function continueFromFloorComplete(page: Page): Promise<void> {
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
}
