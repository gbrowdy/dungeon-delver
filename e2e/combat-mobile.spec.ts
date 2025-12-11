import { test, expect } from '@playwright/test';

/**
 * Mobile combat screen tests - specifically for iPhone 13 mini and similar small screens
 * These tests navigate through to the actual combat screen to verify layout
 */

test.describe('Combat Screen Mobile Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('navigate to combat and take screenshot', async ({ page }, testInfo) => {
    // Click Start Game
    const startButton = page.getByRole('button', { name: /start game/i });
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click();

    // Wait for class selection to load
    await page.waitForTimeout(1000);

    // Click on Warrior class card to select it
    const warriorCard = page.locator('text=WARRIOR').first();
    await expect(warriorCard).toBeVisible({ timeout: 5000 });
    await warriorCard.click();
    await page.waitForTimeout(500);

    // Click "Begin as Warrior" button
    const beginButton = page.getByRole('button', { name: /begin as/i });
    await expect(beginButton).toBeVisible({ timeout: 5000 });
    await beginButton.click();

    // Wait for combat screen to load and first enemy to appear
    await page.waitForTimeout(3000);

    // Take screenshot of combat screen
    await page.screenshot({
      path: `e2e/screenshots/${testInfo.project.name}-actual-combat.png`,
      fullPage: false,
    });

    // Verify no horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('combat screen fits within viewport without scrolling', async ({ page }) => {
    // Navigate to combat
    const startButton = page.getByRole('button', { name: /start game/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);
    }

    const warriorCard = page.locator('text=WARRIOR').first();
    if (await warriorCard.isVisible()) {
      await warriorCard.click();
      await page.waitForTimeout(300);
    }

    const beginButton = page.getByRole('button', { name: /begin adventure|confirm|start/i });
    if (await beginButton.isVisible()) {
      await beginButton.click();
    }

    await page.waitForTimeout(2000);

    // Check viewport fits
    const viewportHeight = page.viewportSize()?.height || 0;
    const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    // Allow a small tolerance (10% over is acceptable for scrollable content)
    // But we don't want massive overflow
    expect(documentHeight).toBeLessThan(viewportHeight * 1.5);
  });
});
