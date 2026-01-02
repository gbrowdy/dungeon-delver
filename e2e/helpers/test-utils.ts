// e2e/helpers/test-utils.ts

import { Page, expect } from '@playwright/test';

/**
 * Navigate to game with test mode enabled
 */
export async function gotoTestMode(page: Page): Promise<void> {
  await page.goto('/?testMode=true');
  await page.waitForLoadState('networkidle');
}

/**
 * Start a new game and select a class
 */
export async function startGameWithClass(
  page: Page,
  className: 'WARRIOR' | 'MAGE' | 'ROGUE' | 'PALADIN'
): Promise<void> {
  // Click start game
  await page.getByRole('button', { name: /start game/i }).click();

  // Wait for class selection
  await page.waitForTimeout(500);

  // Select the class
  await page.locator(`text=${className}`).first().click();
  await page.waitForTimeout(300);

  // Click begin button
  await page.getByRole('button', { name: /begin as/i }).click();

  // Wait for combat to load
  await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
}

/**
 * Use test hooks to set player health
 */
export async function setPlayerHealth(page: Page, hp: number): Promise<void> {
  await page.evaluate((health) => {
    window.__TEST_HOOKS__?.setPlayerHealth(health);
  }, hp);
}

/**
 * Use test hooks to set enemy to 1 HP (one-hit kill)
 */
export async function setEnemyOneHitKill(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__TEST_HOOKS__?.setEnemyOneHitKill();
  });
}

/**
 * Use test hooks to set player level (triggers level-up popup)
 */
export async function setPlayerLevel(page: Page, level: number): Promise<void> {
  await page.evaluate((lvl) => {
    window.__TEST_HOOKS__?.setPlayerLevel(lvl);
  }, level);
}

/**
 * Wait for test hooks to be available
 */
export async function waitForTestHooks(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__TEST_HOOKS__ !== undefined, {
    timeout: 5000,
  });
}
