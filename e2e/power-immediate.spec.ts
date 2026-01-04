// e2e/power-immediate.spec.ts
/**
 * Test that powers can be used during combat with proper resource management.
 */

import { test, expect } from '@playwright/test';
import { navigateToGame, selectClassAndBegin, setSpeedToMax } from './helpers/game-actions';

test.describe('Power Usage', () => {
  test('power can be clicked and deducts mana', async ({ page }) => {
    // Start game - warrior starts with Berserker Rage power
    await navigateToGame(page, 'devMode=true&playerAttack=20&playerDefense=15');
    await selectClassAndBegin(page, 'Warrior');

    // Set speed to 1x so we have more time to click
    await page.getByRole('button', { name: 'Set combat speed to 1x' }).click();

    // Wait for combat to start
    await page.waitForTimeout(500);

    // Find the power button (Berserker Rage for Warrior)
    const powerButton = page.locator('[data-testid^="power-"]').first();
    await expect(powerButton).toBeVisible();

    // Get initial mana from the mana bar - look for MP indicator
    const manaText = await page.locator('text=/MP/').locator('..').locator('text=/\\d+\\/\\d+/').textContent();
    const manaBefore = parseInt(manaText?.split('/')[0] ?? '40');

    // Click the power button when it's enabled
    await expect(powerButton).toBeEnabled({ timeout: 5000 });
    await powerButton.click();

    // Wait for power to execute
    await page.waitForTimeout(200);

    // Check mana decreased
    const manaAfter = await page.locator('text=/MP/').locator('..').locator('text=/\\d+\\/\\d+/').textContent();
    const manaAfterValue = parseInt(manaAfter?.split('/')[0] ?? '40');

    // Mana should have decreased (Berserker Rage costs 20 mana)
    expect(manaAfterValue).toBeLessThan(manaBefore);
  });

  test('block can be used and costs mana', async ({ page }) => {
    await navigateToGame(page, 'devMode=true&playerAttack=20&playerDefense=15');
    await selectClassAndBegin(page, 'Warrior');

    // Wait for combat to start
    await page.waitForTimeout(500);

    // Find the block button
    const blockButton = page.getByRole('button', { name: /Block/i });
    await expect(blockButton).toBeVisible();

    // Get initial mana
    const manaText = await page.locator('text=/MP/').locator('..').locator('text=/\\d+\\/\\d+/').textContent();
    const manaBefore = parseInt(manaText?.split('/')[0] ?? '40');

    // Click block when enabled
    await expect(blockButton).toBeEnabled({ timeout: 5000 });
    await blockButton.click();

    // Wait for block to execute
    await page.waitForTimeout(200);

    // Check mana decreased (Block costs 15 mana)
    const manaAfter = await page.locator('text=/MP/').locator('..').locator('text=/\\d+\\/\\d+/').textContent();
    const manaAfterValue = parseInt(manaAfter?.split('/')[0] ?? '40');

    expect(manaAfterValue).toBeLessThan(manaBefore);
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
