// e2e/health-restoration.spec.ts

import { test, expect } from '@playwright/test';
import {
  gotoTestMode,
  startGameWithClass,
  waitForTestHooks,
  setPlayerHealth,
  getCombatLogs,
} from './helpers/test-utils';

test.describe('Health Restoration', () => {
  test('healing power restores health and generates log', async ({ page }) => {
    // Navigate with test mode
    await gotoTestMode(page);

    // Start game as Paladin (has Divine Heal)
    await startGameWithClass(page, 'PALADIN');

    // Wait for test hooks to be available
    await waitForTestHooks(page);

    // Set player health to 50 to ensure healing works
    await setPlayerHealth(page, 50);

    // Wait a moment for state to update
    await page.waitForTimeout(500);

    // Verify health was set correctly
    const healthBefore = await page.evaluate(() => {
      return window.__TEST_HOOKS__?.getGameState()?.player?.currentStats?.health ?? 0;
    });
    expect(healthBefore).toBe(50);

    // Click Divine Heal power
    const healButton = page.getByTestId('power-divine-heal');
    await expect(healButton).toBeVisible({ timeout: 5000 });
    await healButton.click();

    // Wait for health to update
    await page.waitForTimeout(1000);

    // Verify health increased
    const healthAfter = await page.evaluate(() => {
      return window.__TEST_HOOKS__?.getGameState()?.player?.currentStats?.health ?? 0;
    });
    expect(healthAfter).toBeGreaterThan(50);

    // Verify combat log contains heal message with "restores" (from our new utility)
    const logs = await getCombatLogs(page);
    const healLog = logs.find(log => log.includes('restores') && log.includes('HP'));
    expect(healLog).toBeDefined();
  });

  test('healing is capped at max health', async ({ page }) => {
    // Navigate with test mode
    await gotoTestMode(page);

    // Start game as Paladin
    await startGameWithClass(page, 'PALADIN');

    // Wait for test hooks
    await waitForTestHooks(page);

    // Get max health first
    const maxHealth = await page.evaluate(() => {
      const state = window.__TEST_HOOKS__?.getGameState();
      return state?.player?.currentStats?.maxHealth ?? 100;
    });

    // Set player health to near max (95% of max health)
    await setPlayerHealth(page, Math.floor(maxHealth * 0.95));

    // Wait for state update
    await page.waitForTimeout(500);

    // Click Divine Heal
    const healButton = page.getByTestId('power-divine-heal');
    await expect(healButton).toBeVisible({ timeout: 5000 });
    await healButton.click();

    // Wait for heal to process
    await page.waitForTimeout(1000);

    // Verify health is at max, not over
    const healthAfter = await page.evaluate(() => {
      const state = window.__TEST_HOOKS__?.getGameState();
      return state?.player?.currentStats?.health ?? 0;
    });
    expect(healthAfter).toBe(maxHealth);

    // Verify log shows full health indicator
    const logs = await getCombatLogs(page);
    const healLog = logs.find(log =>
      log.includes('restores') && log.includes('HP') && log.includes('full health')
    );
    expect(healLog).toBeDefined();
  });
});
