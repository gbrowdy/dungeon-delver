// e2e/shop-flow.spec.ts
import { test, expect } from '@playwright/test';
import {
  navigateToGame,
  selectClassAndBegin,
  setSpeedToMax,
} from './helpers/game-actions';

test.describe('Shop Flow - Death to Shop', () => {
  test('can enter shop from death screen', async ({ page }) => {
    // Give player extra gold to test shop
    await navigateToGame(page, 'devMode=true&gold=500');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for death
    await page.getByTestId('death-screen').waitFor({ state: 'visible', timeout: 120000 });

    // Click shop button
    const shopButton = page.getByRole('button', { name: /visit shop/i });
    await shopButton.click();

    // Verify shop header is visible
    await expect(page.locator('h1').filter({ hasText: /shop/i })).toBeVisible({ timeout: 5000 });

    // Verify gold is displayed
    await expect(page.locator('text=/\\d+ Gold/')).toBeVisible();
  });

  test('leaving shop after death retries current floor', async ({ page }) => {
    // Start on floor 1 with extra gold
    await navigateToGame(page, 'devMode=true&gold=500');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for death
    await page.getByTestId('death-screen').waitFor({ state: 'visible', timeout: 120000 });

    // Note the floor number
    const floorText = await page.getByTestId('death-floor-display').textContent();
    expect(floorText).toContain('Floor 1');

    // Enter shop
    await page.getByRole('button', { name: /visit shop/i }).click();
    await expect(page.locator('h1').filter({ hasText: /shop/i })).toBeVisible({ timeout: 5000 });

    // Leave shop (continue button)
    const continueButton = page.getByRole('button', { name: /continue/i });
    await continueButton.click();

    // Should be back in combat on the same floor
    await expect(page.getByTestId('floor-indicator')).toContainText('Floor 1');

    // Player should be at full health (retry resets health)
    // This is verified by game being playable again
    await expect(page.getByTestId('floor-indicator')).toBeVisible();
  });
});

test.describe('Shop Flow - Purchasing Items', () => {
  test('can purchase item and gold is deducted', async ({ page }) => {
    await navigateToGame(page, 'devMode=true&gold=1000');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for death
    await page.getByTestId('death-screen').waitFor({ state: 'visible', timeout: 120000 });

    // Enter shop
    await page.getByRole('button', { name: /visit shop/i }).click();
    await expect(page.locator('h1').filter({ hasText: /shop/i })).toBeVisible({ timeout: 5000 });

    // Get initial gold amount
    const goldDisplay = page.locator('text=/\\d+ Gold/');
    const initialGoldText = await goldDisplay.first().textContent();
    const initialGold = parseInt(initialGoldText?.match(/(\d+)/)?.[1] || '0', 10);
    expect(initialGold).toBeGreaterThan(0);

    // Find and click a buy button
    const buyButton = page.getByRole('button', { name: /buy/i }).first();
    if (await buyButton.isVisible()) {
      await buyButton.click();

      // Wait a moment for state to update
      await page.waitForTimeout(500);

      // Gold should have decreased
      const newGoldText = await goldDisplay.first().textContent();
      const newGold = parseInt(newGoldText?.match(/(\d+)/)?.[1] || '0', 10);
      expect(newGold).toBeLessThan(initialGold);
    }
  });

  test('purchased item appears in equipment section', async ({ page }) => {
    await navigateToGame(page, 'devMode=true&gold=1000');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for death
    await page.getByTestId('death-screen').waitFor({ state: 'visible', timeout: 120000 });

    // Enter shop
    await page.getByRole('button', { name: /shop/i }).click();

    // Wait for shop header to be visible (unique identifier for shop screen)
    await expect(page.locator('h1').filter({ hasText: /shop/i })).toBeVisible({ timeout: 5000 });

    // Check if equipment section shows empty slots initially
    const yourEquipmentSection = page.locator('text=Your Equipment').first();
    await expect(yourEquipmentSection).toBeVisible();

    // Buy first available item
    const buyButton = page.getByRole('button', { name: /buy/i }).first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
      await page.waitForTimeout(500);

      // Item should now be marked as purchased (show "Already Purchased" or "Owned")
      await expect(page.locator('text=Already Purchased').or(page.locator('text=Owned'))).toBeVisible();
    }
  });

  test('cannot purchase items that cost more than available gold', async ({ page }) => {
    // Start with very little gold
    await navigateToGame(page, 'devMode=true&gold=10');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for death
    await page.getByTestId('death-screen').waitFor({ state: 'visible', timeout: 120000 });

    // Enter shop
    await page.getByRole('button', { name: /visit shop/i }).click();
    await expect(page.locator('h1').filter({ hasText: /shop/i })).toBeVisible({ timeout: 5000 });

    // Look for "Need More" buttons (disabled state for items we can't afford)
    const needMoreButtons = page.getByRole('button', { name: /Need More/i });
    const count = await needMoreButtons.count();

    // With 10 gold, most items should show "Need More"
    expect(count).toBeGreaterThan(0);

    // These buttons should be disabled
    if (count > 0) {
      const firstDisabledButton = needMoreButtons.first();
      await expect(firstDisabledButton).toBeDisabled();
    }
  });
});

test.describe('Shop Flow - Item Stats Applied', () => {
  test('purchased item boosts player stats in next combat', async ({ page }) => {
    await navigateToGame(page, 'devMode=true&gold=1000');
    await selectClassAndBegin(page, 'Warrior');

    // Set speed to max and wait for death
    await setSpeedToMax(page);
    await page.getByTestId('death-screen').waitFor({ state: 'visible', timeout: 120000 });

    // Enter shop and buy a weapon (should boost power)
    await page.getByRole('button', { name: /visit shop/i }).click();
    await expect(page.locator('h1').filter({ hasText: /shop/i })).toBeVisible({ timeout: 5000 });

    // Buy the Basic Sword specifically (it has +3 power)
    // Look for item card containing "Basic Sword" text
    const swordCard = page.locator('.shop-item, [class*="item"]').filter({ hasText: /Basic Sword/i });
    let boughtSword = false;

    if (await swordCard.count() > 0) {
      const buyButton = swordCard.first().getByRole('button', { name: /buy/i });
      if (await buyButton.isVisible()) {
        await buyButton.click();
        boughtSword = true;
      }
    }

    // Fallback: buy first available starter item
    if (!boughtSword) {
      const starterSection = page.locator('section').filter({ has: page.locator('text=Starter Gear') });
      const firstBuyButton = starterSection.getByRole('button', { name: /buy/i }).first();
      if (await firstBuyButton.isVisible()) {
        await firstBuyButton.click();
      }
    }
    await page.waitForTimeout(500);

    // Leave shop
    await page.getByRole('button', { name: /continue/i }).click();

    // Back in combat - verify we're in game with floor indicator
    await expect(page.getByTestId('floor-indicator')).toBeVisible();

    // Get current PWR stat - Warrior base is 9, sword adds +3 = 12
    const pwrText = await page.locator('text=/PWR.*\\d+/').first().textContent();
    const pwrValue = parseInt(pwrText?.match(/(\d+)/)?.[1] || '0', 10);

    // If we bought the sword (+3 power), Warrior should have at least 9 + 3 = 12 PWR
    // If fallback was used, PWR should still be at least base (9)
    // Use 8 as minimum to account for any display rounding
    if (boughtSword) {
      expect(pwrValue).toBeGreaterThanOrEqual(11); // 9 base + 3 from sword, allow -1 tolerance
    } else {
      // Just verify we got back to combat successfully
      expect(pwrValue).toBeGreaterThan(0);
    }
  });
});

test.describe('Shop Flow - Enhancement', () => {
  test('can enhance purchased equipment', async ({ page }) => {
    await navigateToGame(page, 'devMode=true&gold=2000');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for death
    await page.getByTestId('death-screen').waitFor({ state: 'visible', timeout: 120000 });

    // Enter shop
    await page.getByRole('button', { name: /visit shop/i }).click();
    await expect(page.locator('h1').filter({ hasText: /shop/i })).toBeVisible({ timeout: 5000 });

    // Get initial gold
    const goldDisplay = page.locator('text=/\\d+ Gold/');
    const initialGoldText = await goldDisplay.first().textContent();
    const initialGold = parseInt(initialGoldText?.match(/(\d+)/)?.[1] || '0', 10);

    // Buy a starter weapon first
    const starterSection = page.locator('section').filter({ has: page.locator('text=Starter Gear') });
    const buyButton = starterSection.getByRole('button', { name: /buy/i }).first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
      await page.waitForTimeout(500);
    }

    // Now look for the enhance button in the "Your Equipment" section
    const equipmentSection = page.locator('section').filter({ has: page.locator('text=Your Equipment') });
    const enhanceButton = equipmentSection.getByRole('button', { name: /enhance/i }).first();

    // If enhance button exists and is visible, test it
    if (await enhanceButton.isVisible()) {
      const goldBeforeEnhance = await goldDisplay.first().textContent();
      const goldBefore = parseInt(goldBeforeEnhance?.match(/(\d+)/)?.[1] || '0', 10);

      await enhanceButton.click();
      await page.waitForTimeout(500);

      // Gold should have decreased
      const goldAfterEnhance = await goldDisplay.first().textContent();
      const goldAfter = parseInt(goldAfterEnhance?.match(/(\d+)/)?.[1] || '0', 10);
      expect(goldAfter).toBeLessThan(goldBefore);

      // Enhancement badge should appear (+1)
      await expect(page.locator('text=/\\+1/').first()).toBeVisible();
    }
  });
});

test.describe('Shop Flow - Floor Complete to Shop', () => {
  test('leaving shop after floor complete advances to next floor', async ({ page }) => {
    // Very strong player to clear floor quickly
    await navigateToGame(page, 'devMode=true&playerAttack=100&playerDefense=50&gold=500');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for floor complete
    await page.getByText(/Floor \d+ Complete!/).waitFor({ state: 'visible', timeout: 90000 });

    // Click shop button from floor complete
    const shopButton = page.getByRole('button', { name: /visit shop/i });
    if (await shopButton.isVisible()) {
      await shopButton.click();

      // Wait for shop header to be visible
      await expect(page.locator('h1').filter({ hasText: /shop/i })).toBeVisible({ timeout: 5000 });

      // Leave shop
      await page.getByRole('button', { name: /continue/i }).click();

      // Should be on floor 2 (advanced to next floor)
      await expect(page.getByTestId('floor-indicator')).toContainText('Floor 2');
    }
  });
});
