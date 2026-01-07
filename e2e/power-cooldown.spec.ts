// e2e/power-cooldown.spec.ts
/**
 * Test that power cooldowns tick down correctly after use.
 *
 * BUG being tested: After using a power, the cooldown should tick down
 * and the power should become usable again. Currently, cooldowns are
 * stuck at max because CooldownSystem updates the cooldowns Map but
 * the UI reads from power.currentCooldown which is never decremented.
 */

import { test, expect } from '@playwright/test';
import { navigateToGame, selectClassAndBegin } from './helpers/game-actions';

test.describe('Power Cooldown System', () => {
  test('cooldown ticks down and power becomes usable again', async ({ page }) => {
    // Start game as Warrior with devMode to make combat easy
    // Using high defense so enemy doesn't kill us during the test
    await navigateToGame(page, 'devMode=true&playerAttack=50&playerDefense=50');
    await selectClassAndBegin(page, 'Warrior');

    // Set speed to 1x for predictable timing
    await page.getByRole('button', { name: 'Set combat speed to 1x' }).click();

    // Wait for combat to start
    await page.waitForTimeout(500);

    // Find the power button (Strike - Warrior's starting power)
    const powerButton = page.getByTestId('power-basic-strike');
    await expect(powerButton).toBeVisible();

    // Power should be enabled initially (not on cooldown)
    await expect(powerButton).toBeEnabled({ timeout: 3000 });

    // Verify no cooldown indicator is shown initially
    const cooldownIndicator = page.getByTestId('power-cooldown-basic-strike');
    await expect(cooldownIndicator).not.toBeVisible();

    // Use the power
    await powerButton.click();

    // Wait for the power to actually execute
    await page.waitForTimeout(300);

    // Power should now be on cooldown and disabled
    await expect(powerButton).toBeDisabled({ timeout: 1000 });

    // Cooldown indicator should be visible showing countdown
    await expect(cooldownIndicator).toBeVisible({ timeout: 1000 });

    // Get the initial cooldown value (should be ~3s for Strike)
    const initialCooldownText = await cooldownIndicator.textContent();
    console.log(`Initial cooldown: ${initialCooldownText}`);

    // Cooldown should be around 3 seconds (the power's cooldown value)
    const initialCooldown = parseInt(initialCooldownText?.replace('s', '') ?? '3');
    expect(initialCooldown).toBeGreaterThanOrEqual(2);
    expect(initialCooldown).toBeLessThanOrEqual(4);

    // === THE ACTUAL BUG TEST ===
    // Wait 2 seconds and verify cooldown has decreased
    await page.waitForTimeout(2000);

    const midCooldownText = await cooldownIndicator.textContent();
    console.log(`Cooldown after 2s: ${midCooldownText}`);

    const midCooldown = parseInt(midCooldownText?.replace('s', '') ?? '3');

    // BUG: If cooldown is NOT ticking down, this will fail
    // The cooldown should be approximately initialCooldown - 2
    expect(midCooldown).toBeLessThan(initialCooldown);

    // Wait for full cooldown to complete (wait another 3 seconds to be safe)
    await page.waitForTimeout(3000);

    // Power should become enabled again
    await expect(powerButton).toBeEnabled({ timeout: 2000 });

    // Cooldown indicator should no longer be visible
    await expect(cooldownIndicator).not.toBeVisible({ timeout: 1000 });

    console.log('SUCCESS: Cooldown ticked down and power is usable again!');
  });

  test('cooldown visually decreases over time', async ({ page }) => {
    // This test specifically checks the visual cooldown overlay
    await navigateToGame(page, 'devMode=true&playerAttack=50&playerDefense=50');
    await selectClassAndBegin(page, 'Warrior');

    // Set 2x speed to make test faster
    await page.getByRole('button', { name: 'Set combat speed to 2x' }).click();

    await page.waitForTimeout(300);

    const powerButton = page.getByTestId('power-basic-strike');
    await expect(powerButton).toBeEnabled({ timeout: 3000 });

    // Use the power
    await powerButton.click();
    await page.waitForTimeout(200);

    // Track cooldown values over time
    const cooldownIndicator = page.getByTestId('power-cooldown-basic-strike');
    await expect(cooldownIndicator).toBeVisible();

    const cooldowns: number[] = [];

    // Sample cooldown values every 500ms until cooldown ends
    for (let i = 0; i < 10; i++) {
      const isVisible = await cooldownIndicator.isVisible().catch(() => false);
      if (!isVisible) {
        // Cooldown ended, indicator is gone
        cooldowns.push(0);
        console.log(`Sample ${i}: 0s (indicator gone)`);
        break;
      }

      const cooldownText = await cooldownIndicator.textContent().catch(() => '0s');
      const cooldown = parseInt(cooldownText?.replace('s', '') ?? '0');
      cooldowns.push(cooldown);
      console.log(`Sample ${i}: ${cooldown}s`);

      if (cooldown === 0) break;
      await page.waitForTimeout(500);
    }

    // We should see multiple different cooldown values as it ticks down
    const uniqueCooldowns = [...new Set(cooldowns)];
    console.log(`Unique cooldown values: ${uniqueCooldowns.join(', ')}`);

    // We should see at least 2 different cooldown values as it ticks down
    expect(uniqueCooldowns.length).toBeGreaterThan(1);
  });
});
