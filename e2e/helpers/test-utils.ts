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

  // Wait for class selection to be visible
  const classLocator = page.locator(`text=${className}`).first();
  await classLocator.waitFor({ state: 'visible' });

  // Select the class
  await classLocator.click();

  // Wait for begin button to be enabled after class selection
  const beginButton = page.getByRole('button', { name: /begin as/i });
  await expect(beginButton).toBeEnabled();

  // Click begin button
  await beginButton.click();

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

/**
 * Set player invincibility mode (prevents all damage)
 */
export async function setPlayerInvincible(page: Page, invincible: boolean): Promise<void> {
  await page.evaluate((inv) => {
    window.__TEST_HOOKS__?.setPlayerInvincible(inv);
  }, invincible);
}

/**
 * Set enemy abilities by ID
 */
export async function setEnemyAbilities(page: Page, abilityIds: string[]): Promise<void> {
  await page.evaluate((ids) => {
    window.__TEST_HOOKS__?.setEnemyAbilities(ids);
  }, abilityIds);
}

/**
 * Get combat logs
 */
export async function getCombatLogs(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    return window.__TEST_HOOKS__?.getCombatLogs() ?? [];
  });
}
