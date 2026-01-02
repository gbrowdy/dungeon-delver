// e2e/power-usage.spec.ts

import { test, expect } from '@playwright/test';
import {
  gotoTestMode,
  startGameWithClass,
  waitForTestHooks,
} from './helpers/test-utils';

test.describe('Power Usage Flow', () => {
  test('using a power consumes mana and triggers cooldown', async ({ page }) => {
    // Navigate with test mode
    await gotoTestMode(page);

    // Start game as Mage (starts with Fireball)
    await startGameWithClass(page, 'MAGE');

    // Wait for test hooks to be available
    await waitForTestHooks(page);

    // Verify we're in combat
    await expect(page.getByTestId('floor-indicator')).toBeVisible();

    // Get initial mana display
    const manaDisplay = page.getByTestId('mana-display');
    const initialMana = await manaDisplay.textContent();

    // Click Fireball power
    const fireballButton = page.getByTestId('power-fireball');
    await expect(fireballButton).toBeVisible();
    await fireballButton.click();

    // Verify mana decreased (text changed)
    await expect(manaDisplay).not.toHaveText(initialMana!, { timeout: 2000 });

    // Verify cooldown indicator appears
    const cooldownIndicator = page.getByTestId('power-cooldown-fireball');
    await expect(cooldownIndicator).toBeVisible({ timeout: 2000 });
    await expect(cooldownIndicator).toContainText('s');

    // Verify power button is disabled during cooldown
    await expect(fireballButton).toBeDisabled();

    // Wait for cooldown to expire (Fireball cooldown is typically 3-4 seconds)
    await expect(fireballButton).toBeEnabled({ timeout: 8000 });

    // Verify cooldown indicator is gone
    await expect(cooldownIndicator).not.toBeVisible();
  });
});
