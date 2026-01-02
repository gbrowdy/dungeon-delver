// e2e/floor-clear.spec.ts

import { test, expect } from '@playwright/test';
import {
  gotoTestMode,
  startGameWithClass,
  setEnemyOneHitKill,
  waitForTestHooks,
} from './helpers/test-utils';

test.describe('Floor Clear Flow', () => {
  test('completing floor 1 shows floor complete screen without power choices', async ({ page }) => {
    // Increase timeout for this test as it goes through multiple enemies
    test.setTimeout(60000);

    // Navigate with test mode
    await gotoTestMode(page);

    // Start game as Warrior
    await startGameWithClass(page, 'WARRIOR');

    // Wait for test hooks to be available
    await waitForTestHooks(page);

    // Verify we're on Floor 1
    await expect(page.getByTestId('floor-indicator')).toContainText('Floor 1');

    // Speed through floor by setting each enemy to 1 HP until floor complete
    let attempts = 0;
    const maxAttempts = 20; // Safety limit

    while (attempts < maxAttempts) {
      // Check if floor complete screen is visible
      const floorComplete = await page.getByTestId('floor-complete').isVisible().catch(() => false);
      if (floorComplete) break;

      // Set current enemy to 1 HP
      await setEnemyOneHitKill(page);

      // Wait a bit for combat to resolve
      await page.waitForTimeout(800);
      attempts++;
    }

    // Verify floor complete screen
    await expect(page.getByTestId('floor-complete')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('floor-complete')).toContainText('Floor 1 Complete');

    // Verify NO power choices offered on floor 1
    await expect(page.getByTestId('power-choices')).not.toBeVisible();

    // Continue to floor 2
    await page.getByTestId('continue-button').click();

    // Verify now on floor 2
    await expect(page.getByTestId('floor-indicator')).toContainText('Floor 2');
  });
});
