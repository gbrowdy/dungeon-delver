import { test, expect } from '@playwright/test';

test.describe('Class Select Tablet Layout', () => {
  test('take class select screenshot on tablet portrait', async ({ page }, testInfo) => {
    // Set iPad portrait dimensions
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click Start Game
    const startButton = page.getByRole('button', { name: /start game/i });
    await startButton.click();
    await page.waitForTimeout(1000);
    
    // Screenshot before selection
    await page.screenshot({
      path: `e2e/screenshots/tablet-classselect-noselection.png`,
      fullPage: false,
    });
    
    // Click on Warrior to select
    const warriorCard = page.locator('text=WARRIOR').first();
    await warriorCard.click();
    await page.waitForTimeout(500);
    
    // Screenshot after selection
    await page.screenshot({
      path: `e2e/screenshots/tablet-classselect-selected.png`,
      fullPage: false,
    });
    
    // Verify description is visible
    const description = page.locator('text=Heavy armor');
    await expect(description).toBeVisible();
  });
});
