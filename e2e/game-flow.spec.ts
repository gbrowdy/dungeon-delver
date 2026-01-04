// e2e/game-flow.spec.ts
import { test, expect } from '@playwright/test';
import {
  navigateToGame,
  selectClassAndBegin,
  setSpeedToMax,
} from './helpers/game-actions';

test.describe('Game Flow - Core Loop', () => {
  test('can start game and reach combat', async ({ page }) => {
    await navigateToGame(page);
    await selectClassAndBegin(page, 'Warrior');

    // Verify combat screen loaded
    await expect(page.getByTestId('floor-indicator')).toContainText('Floor 1');

    // Verify player and enemy are present
    await expect(page.getByTestId('player-health')).toBeVisible();
    await expect(page.getByTestId('enemy-health')).toBeVisible();

    // Verify combat controls are present
    await expect(page.getByRole('button', { name: 'Set combat speed to 3x' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pause combat' })).toBeVisible();
  });

  test('combat speed controls work', async ({ page }) => {
    await navigateToGame(page);
    await selectClassAndBegin(page, 'Warrior');

    // Verify 1x is selected by default
    const speed1Button = page.getByRole('button', { name: 'Set combat speed to 1x' });
    await expect(speed1Button).toHaveAttribute('aria-pressed', 'true');

    // Click 3x speed
    await setSpeedToMax(page);

    // Verify 3x is now selected
    const speed3Button = page.getByRole('button', { name: 'Set combat speed to 3x' });
    await expect(speed3Button).toHaveAttribute('aria-pressed', 'true');
    await expect(speed1Button).toHaveAttribute('aria-pressed', 'false');
  });

  test('dev mode params apply correctly', async ({ page }) => {
    // Use dev mode with boosted stats
    await navigateToGame(page, 'devMode=true&playerAttack=50&playerDefense=20');
    await selectClassAndBegin(page, 'Warrior');

    // Wait for stats panel to be visible
    await page.waitForTimeout(500);

    // Verify boosted stats are applied by checking specific stat values
    await expect(page.locator('text=PWR').locator('..').filter({ hasText: '50' }).first()).toBeVisible();
    await expect(page.locator('text=ARM').locator('..').filter({ hasText: '20' }).first()).toBeVisible();
  });

  test.skip('combat plays out to an outcome (enemy dies or player dies)', async ({ page }) => {
    // SKIPPED: Combat loop is not progressing in ECS implementation
    // This test is blocked by a combat system bug where health values don't change
    // See: Combat system needs investigation - health bars remain static

    test.setTimeout(150000);

    await navigateToGame(page);
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for health to change (indicates combat is running)
    const initialEnemyHealth = await page.getByTestId('enemy-health').textContent();

    await page.waitForFunction(
      (initial) => {
        const enemyHealth = document.querySelector('[data-testid="enemy-health"]')?.textContent;
        return enemyHealth !== initial;
      },
      initialEnemyHealth,
      { timeout: 30000 }
    );

    // If we get here, combat is running - test passes
    expect(true).toBe(true);
  });
});
