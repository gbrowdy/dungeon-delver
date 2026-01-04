// e2e/power-immediate.spec.ts
/**
 * Test that powers fire immediately when activated, not on next attack tick.
 */

import { test, expect } from '@playwright/test';
import { navigateToGame, selectClassAndBegin } from './helpers/game-actions';

test.describe('Power Immediate Execution', () => {
  test('power deals damage immediately when clicked', async ({ page }) => {
    // Start game with dev mode - high attack to one-shot, pause combat
    await navigateToGame(page, 'devMode=true&playerAttack=100');
    await selectClassAndBegin(page, 'Warrior');

    // Pause combat so auto-attacks don't interfere
    await page.getByRole('button', { name: 'Pause combat' }).click();
    await page.waitForTimeout(300);

    // Get initial enemy health
    const enemyHealthBefore = await page.getByTestId('enemy-health').textContent();
    console.log(`Enemy health before power: ${enemyHealthBefore}`);

    // Click the power button (Berserker Rage for Warrior)
    const powerButton = page.locator('[data-testid^="power-"]').first();
    await expect(powerButton).toBeVisible();
    await powerButton.click();

    // Wait a brief moment for the power to execute
    await page.waitForTimeout(100);

    // Get enemy health after - should be reduced IMMEDIATELY
    const enemyHealthAfter = await page.getByTestId('enemy-health').textContent();
    console.log(`Enemy health after power: ${enemyHealthAfter}`);

    // Parse health values (format: "X/Y")
    const healthBefore = parseInt(enemyHealthBefore?.split('/')[0] ?? '0');
    const healthAfter = parseInt(enemyHealthAfter?.split('/')[0] ?? '0');

    // Enemy health should have decreased immediately
    expect(healthAfter).toBeLessThan(healthBefore);
  });

  test('power deducts mana immediately when clicked', async ({ page }) => {
    await navigateToGame(page, 'devMode=true');
    await selectClassAndBegin(page, 'Warrior');

    // Pause combat
    await page.getByRole('button', { name: 'Pause combat' }).click();
    await page.waitForTimeout(300);

    // Get initial mana (format: "X/Y")
    const manaDisplay = page.locator('text=/\\d+\\/\\d+/').filter({ hasText: 'MP' }).locator('..');
    const manaBefore = await page.locator('[data-testid="mana-display"]').textContent();
    console.log(`Mana before power: ${manaBefore}`);

    // Click the power button
    const powerButton = page.locator('[data-testid^="power-"]').first();
    await powerButton.click();
    await page.waitForTimeout(100);

    // Get mana after
    const manaAfter = await page.locator('[data-testid="mana-display"]').textContent();
    console.log(`Mana after power: ${manaAfter}`);

    // Parse mana values
    const manaParsedBefore = parseInt(manaBefore?.split('/')[0] ?? '0');
    const manaParsedAfter = parseInt(manaAfter?.split('/')[0] ?? '0');

    // Mana should have decreased immediately
    expect(manaParsedAfter).toBeLessThan(manaParsedBefore);
  });

  test('power shows cooldown immediately when clicked', async ({ page }) => {
    await navigateToGame(page, 'devMode=true');
    await selectClassAndBegin(page, 'Warrior');

    // Pause combat
    await page.getByRole('button', { name: 'Pause combat' }).click();
    await page.waitForTimeout(300);

    // Click the power button
    const powerButton = page.locator('[data-testid^="power-"]').first();
    await powerButton.click();
    await page.waitForTimeout(100);

    // Cooldown indicator should appear immediately
    const cooldownIndicator = page.locator('[data-testid^="power-cooldown-"]');
    await expect(cooldownIndicator).toBeVisible({ timeout: 500 });
  });
});
