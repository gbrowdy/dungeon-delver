// e2e/helpers/test-utils.ts

import { Page, expect } from '@playwright/test';

/**
 * Navigate to game with test mode enabled
 * @deprecated Use navigateToGame from game-actions.ts with devMode params instead
 */
export async function gotoTestMode(page: Page): Promise<void> {
  await page.goto('/?devMode=true');
  await page.waitForLoadState('networkidle');
}

/**
 * Start a new game and select a class
 * @deprecated Use selectClassAndBegin from game-actions.ts instead
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
