// e2e/level-up-path.spec.ts

import { test, expect } from '@playwright/test';
import {
  gotoTestMode,
  startGameWithClass,
  setPlayerLevel,
  waitForTestHooks,
} from './helpers/test-utils';

test.describe('Level Up and Path Selection Flow', () => {
  test('level up to 2 triggers path selection', async ({ page }) => {
    // Navigate with test mode
    await gotoTestMode(page);

    // Start game as Warrior
    await startGameWithClass(page, 'WARRIOR');

    // Wait for test hooks to be available
    await waitForTestHooks(page);

    // Verify we're in combat
    await expect(page.getByTestId('floor-indicator')).toBeVisible();

    // Use test hook to trigger level up to level 2
    await setPlayerLevel(page, 2);

    // Verify level-up popup appears
    await expect(page.getByTestId('level-up-popup')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('level-up-new-level')).toContainText('2');

    // Dismiss level-up popup
    await page.getByRole('button', { name: /continue/i }).click();

    // Verify path selection screen appears
    await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });

    // Select Berserker path
    await page.locator('text=Berserker').first().click();
    await page.getByTestId('path-confirm-button').click();

    // Verify returned to combat with path applied
    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('player-path-name')).toContainText('Berserker');
  });
});
