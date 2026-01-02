// e2e/floor-clear.spec.ts

import { test, expect } from '@playwright/test';
import {
  gotoTestMode,
  startGameWithClass,
  waitForTestHooks,
  setPlayerInvincible,
  setEnemyOneHitKill,
} from './helpers/test-utils';

test.describe('Floor Clear Flow', () => {
  test('completing floor 1 shows floor complete screen', async ({ page }) => {
    await gotoTestMode(page);
    await startGameWithClass(page, 'WARRIOR');
    await waitForTestHooks(page);

    // Enable invincibility - now works reliably with centralized damage
    await setPlayerInvincible(page, true);

    // Floor 1 has 4 rooms - clear each one
    const roomsOnFloor1 = 4;
    for (let room = 1; room <= roomsOnFloor1; room++) {
      // Wait for enemy to spawn (currentEnemy is not null)
      await page.waitForFunction(
        () => window.__TEST_HOOKS__?.getGameState()?.currentEnemy !== null,
        { timeout: 10000 }
      );

      // Set enemy to 1 HP repeatedly until it dies
      // This handles cases where the enemy heals or the timing is off
      await page.waitForFunction(
        () => {
          const state = window.__TEST_HOOKS__?.getGameState();
          if (!state?.currentEnemy) return true; // Enemy died
          // Keep setting to 1 HP
          window.__TEST_HOOKS__?.setEnemyOneHitKill();
          return false;
        },
        { timeout: 15000, polling: 100 }
      );
    }

    // Verify floor complete screen appears
    await expect(page.getByText('FLOOR COMPLETE!')).toBeVisible({ timeout: 5000 });
  });

  test('floor indicator shows current floor', async ({ page }) => {
    await gotoTestMode(page);
    await startGameWithClass(page, 'WARRIOR');
    await waitForTestHooks(page);

    // Verify floor indicator is visible and shows Floor 1
    await expect(page.getByTestId('floor-indicator')).toBeVisible();
    await expect(page.getByTestId('floor-indicator')).toContainText('Floor 1');
  });
});
