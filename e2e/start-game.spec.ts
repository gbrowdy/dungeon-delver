// e2e/start-game.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Start Game Flow', () => {
  test('clicking Start Game shows class selection', async ({ page }) => {
    // Navigate to game
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify we're on the main menu
    const startButton = page.getByRole('button', { name: /start game/i });
    await expect(startButton).toBeVisible({ timeout: 5000 });

    // Click Start Game
    await startButton.click();

    // Wait a moment for any transitions
    await page.waitForTimeout(1000);

    // Check for class selection screen
    // Look for any class name text
    const classText = page.locator('text=WARRIOR').or(page.locator('text=Warrior'));
    await expect(classText.first()).toBeVisible({ timeout: 5000 });
  });

  test('selecting a class starts combat', async ({ page }) => {
    // Navigate to game
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Start Game
    const startButton = page.getByRole('button', { name: /start game/i });
    await startButton.click();
    await page.waitForTimeout(500);

    // Click on Warrior class
    const warriorButton = page.locator('text=Warrior').first();
    await expect(warriorButton).toBeVisible({ timeout: 5000 });
    await warriorButton.click();

    // Click the "Begin as Warrior" button
    const selectButton = page.getByRole('button', { name: /begin as/i });
    await expect(selectButton).toBeVisible({ timeout: 3000 });
    await selectButton.click();

    // Wait for combat screen
    await page.waitForTimeout(1000);

    // Verify we're in combat - should see floor/room info or enemy
    const combatIndicator = page.locator('text=Floor').or(page.locator('text=Room')).or(page.locator('[data-testid="battle-arena"]'));
    await expect(combatIndicator.first()).toBeVisible({ timeout: 5000 });
  });

  test('debug: check console for errors on start', async ({ page }) => {
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(`Page error: ${err.message}`);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const startButton = page.getByRole('button', { name: /start game/i });
    await expect(startButton).toBeVisible();

    // Click and wait
    await startButton.click();
    await page.waitForTimeout(2000);

    // Log all console messages
    console.log('=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));

    console.log('=== Console Errors ===');
    consoleErrors.forEach(err => console.log(err));

    // Check current page state
    const bodyText = await page.locator('body').textContent();
    console.log('=== Page Text (first 500 chars) ===');
    console.log(bodyText?.substring(0, 500));

    // Expect no JS errors
    expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });
});
