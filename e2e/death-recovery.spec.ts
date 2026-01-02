// e2e/death-recovery.spec.ts

import { test, expect } from '@playwright/test';
import {
  gotoTestMode,
  startGameWithClass,
  setPlayerHealth,
  waitForTestHooks,
} from './helpers/test-utils';

test.describe('Death and Recovery Flow', () => {
  test('player death triggers death screen and retry returns to floor start', async ({ page }) => {
    // Navigate with test mode
    await gotoTestMode(page);

    // Start game as Warrior
    await startGameWithClass(page, 'WARRIOR');

    // Wait for test hooks to be available
    await waitForTestHooks(page);

    // Verify we're on Floor 1
    await expect(page.getByTestId('floor-indicator')).toContainText('Floor 1');

    // Use test hook to set player health to 1
    await setPlayerHealth(page, 1);

    // Wait for death (enemy will attack and kill player)
    await expect(page.getByTestId('death-screen')).toBeVisible({ timeout: 15000 });

    // Verify death screen shows correct floor
    await expect(page.getByTestId('death-floor-display')).toContainText('Floor 1');

    // Click retry
    await page.getByTestId('retry-button').click();

    // Verify returned to combat on same floor
    await expect(page.getByTestId('floor-indicator')).toContainText('Floor 1');

    // Verify combat screen is visible (not death screen)
    await expect(page.getByTestId('death-screen')).not.toBeVisible();
  });
});
