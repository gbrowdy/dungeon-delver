// e2e/power-immediate.spec.ts
/**
 * Test that powers can be used during combat.
 * Note: Mana was removed in favor of path-specific resources (Fury, Momentum, etc.)
 * Note: Block button was removed - blocking is now handled by path abilities/stances
 */

import { test, expect } from '@playwright/test';
import { navigateToGame, selectClassAndBegin, setSpeedToMax } from './helpers/game-actions';

test.describe('Power Usage', () => {
  test('power can be clicked and executes', async ({ page }) => {
    // Start game - warrior starts with Strike power
    await navigateToGame(page, 'devMode=true&playerAttack=20&playerDefense=15');
    await selectClassAndBegin(page, 'Warrior');

    // Set speed to 1x so we have more time to click
    await page.getByRole('button', { name: 'Set combat speed to 1x' }).click();

    // Wait for combat to start
    await page.waitForTimeout(500);

    // Find the power button
    const powerButton = page.locator('[data-testid^="power-"]').first();
    await expect(powerButton).toBeVisible();

    // Click the power button when it's enabled
    await expect(powerButton).toBeEnabled({ timeout: 5000 });
    await powerButton.click();

    // Wait for power to execute
    await page.waitForTimeout(200);

    // Check combat log for power usage
    const powerMessage = page.locator('text=/uses|Strike|damage/i');
    const hasMessage = await powerMessage.count();
    expect(hasMessage).toBeGreaterThan(0);
  });

  test('power goes on cooldown after use', async ({ page }) => {
    await navigateToGame(page, 'devMode=true&playerAttack=20&playerDefense=15');
    await selectClassAndBegin(page, 'Warrior');

    // Wait for combat to start
    await page.waitForTimeout(500);

    // Find the power button
    const powerButton = page.locator('[data-testid^="power-"]').first();
    await expect(powerButton).toBeVisible();

    // Wait for it to be enabled and click
    await expect(powerButton).toBeEnabled({ timeout: 5000 });
    await powerButton.click();

    // Wait a moment
    await page.waitForTimeout(200);

    // The power button should now be disabled (on cooldown)
    // Or there should be a cooldown indicator
    const isDisabled = await powerButton.isDisabled();
    const cooldownVisible = await page.locator('[data-testid^="power-cooldown-"]').isVisible().catch(() => false);

    // Either disabled or showing cooldown is valid
    expect(isDisabled || cooldownVisible).toBe(true);
  });
});
