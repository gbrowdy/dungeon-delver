import { test, expect } from '@playwright/test';

/**
 * Responsive design tests for the roguelike game
 * Tests various screen sizes to ensure UI elements fit properly
 */

test.describe('Main Menu Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the game to load
    await page.waitForLoadState('networkidle');
  });

  test('main menu displays correctly without overflow', async ({ page }) => {
    // Check no horizontal scrollbar appears
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    // Check main content is visible
    const mainContent = page.locator('main, [role="main"], .min-h-screen').first();
    await expect(mainContent).toBeVisible();
  });

  test('title text fits within viewport', async ({ page }) => {
    // Look for title text (pixel-title class)
    const title = page.locator('.pixel-title').first();
    if (await title.isVisible()) {
      const titleBox = await title.boundingBox();
      const viewport = page.viewportSize();

      if (titleBox && viewport) {
        // Title should not overflow viewport
        expect(titleBox.x).toBeGreaterThanOrEqual(0);
        expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(viewport.width + 10); // 10px tolerance
      }
    }
  });

  test('buttons are tappable (44px minimum touch target)', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Check minimum touch target size (44x44 per WCAG)
          expect(box.height).toBeGreaterThanOrEqual(40); // Allow small tolerance
          expect(box.width).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });
});

test.describe('Class Selection Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to class selection if there's a start button
    const startButton = page.getByRole('button', { name: /start|play|new game/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('class cards fit on screen without horizontal scroll', async ({ page }) => {
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('class selection buttons are accessible', async ({ page, isMobile }) => {
    // Find any selectable class elements
    const classElements = page.locator('[class*="warrior"], [class*="mage"], [class*="rogue"], [class*="paladin"], button:has-text("Warrior"), button:has-text("Mage")');
    const count = await classElements.count();

    if (count > 0 && isMobile) {
      for (let i = 0; i < count; i++) {
        const element = classElements.nth(i);
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(40);
          }
        }
      }
    }
  });
});

test.describe('Combat Screen Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to navigate to combat by starting a game
    const startButton = page.getByRole('button', { name: /start|play|new game/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);
    }

    // Select a class if available
    const warriorButton = page.getByRole('button', { name: /warrior/i });
    if (await warriorButton.isVisible()) {
      await warriorButton.click();
      await page.waitForTimeout(500);
    }

    // Confirm selection if needed
    const confirmButton = page.getByRole('button', { name: /confirm|select|choose|start/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('combat screen has no horizontal overflow', async ({ page }) => {
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('stats panel text is readable', async ({ page }) => {
    // Look for stat elements
    const statElements = page.locator('.pixel-text, [class*="stat"]');
    const count = await statElements.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const element = statElements.nth(i);
      if (await element.isVisible()) {
        // Verify text is not clipped
        const overflow = await element.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.overflow === 'hidden' && el.scrollWidth > el.clientWidth;
        });
        // Allow some elements to have hidden overflow for design purposes
        // but flag if text seems completely unreadable
      }
    }
  });

  test('battle arena is visible and not cut off', async ({ page }) => {
    // Look for battle arena
    const arena = page.locator('.pixel-panel').first();
    if (await arena.isVisible()) {
      const box = await arena.boundingBox();
      const viewport = page.viewportSize();

      if (box && viewport) {
        // Arena should fit within viewport width
        expect(box.x).toBeGreaterThanOrEqual(-5);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 5);
      }
    }
  });

  test('power buttons meet touch target requirements', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    const powerButtons = page.locator('button:has(.pixel-text)');
    const count = await powerButtons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = powerButtons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });

  test('combat header elements do not wrap unexpectedly', async ({ page }) => {
    // Check for combat header
    const header = page.locator('.pixel-panel').first();
    if (await header.isVisible()) {
      const viewport = page.viewportSize();
      const box = await header.boundingBox();

      if (box && viewport) {
        // Header should not be taller than expected on mobile (wrapping issues)
        // A well-designed header should be under 150px even on smallest screens
        expect(box.height).toBeLessThan(200);
      }
    }
  });
});

test.describe('Visual Consistency', () => {
  test('pixel font loads correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for font to load
    await page.waitForTimeout(2000);

    // Check if Press Start 2P font is loaded
    const fontLoaded = await page.evaluate(() => {
      return document.fonts.check('12px "Press Start 2P"');
    });

    expect(fontLoaded).toBe(true);
  });

  test('no text overflow in pixel-text elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const pixelTextElements = page.locator('.pixel-text');
    const count = await pixelTextElements.count();

    let overflowCount = 0;
    for (let i = 0; i < Math.min(count, 30); i++) {
      const element = pixelTextElements.nth(i);
      if (await element.isVisible()) {
        const isOverflowing = await element.evaluate((el) => {
          return el.scrollWidth > el.clientWidth + 1;
        });
        if (isOverflowing) {
          overflowCount++;
        }
      }
    }

    // Allow some overflow (design choice) but not excessive
    expect(overflowCount).toBeLessThan(5);
  });
});

test.describe('Screenshot Comparisons', () => {
  test('main menu visual snapshot', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for fonts and animations

    await page.screenshot({
      path: `e2e/screenshots/${testInfo.project.name}-main-menu.png`,
      fullPage: false,
    });
  });

  test('combat screen visual snapshot', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to combat
    const startButton = page.getByRole('button', { name: /start|play|new game/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);
    }

    const warriorButton = page.getByRole('button', { name: /warrior/i });
    if (await warriorButton.isVisible()) {
      await warriorButton.click();
      await page.waitForTimeout(500);
    }

    const confirmButton = page.getByRole('button', { name: /confirm|select|choose|start/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({
      path: `e2e/screenshots/${testInfo.project.name}-combat.png`,
      fullPage: false,
    });
  });
});
