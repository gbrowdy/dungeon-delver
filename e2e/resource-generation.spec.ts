// e2e/resource-generation.spec.ts
/**
 * Tests for path resource generation (Fury, Arcane Charges, Momentum, Zeal).
 * Verifies that active path resources generate from combat events.
 */
import { test, expect } from '@playwright/test';
import {
  navigateToGame,
  selectClassAndBegin,
  setSpeedToMax,
  waitForCombatOutcome,
  waitForEnemySpawn,
  waitForDeathAndRetry,
} from './helpers/game-actions';

test.describe('Path Resource Generation', () => {
  test('Berserker Fury generates on hit', async ({ page }) => {
    test.setTimeout(90000); // 1.5 minutes

    // High XP to level up fast, boosted stats to survive and hit enemies
    await navigateToGame(page, 'devMode=true&xpMultiplier=10&playerAttack=40&playerDefense=25');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Kill enemies until level 2 and path selection
    let foundPathSelection = false;
    for (let i = 0; i < 15 && !foundPathSelection; i++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      // Check for level up popup
      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible();
      if (levelUpVisible) {
        const closeButton = page.getByRole('button', { name: /continue|close|ok/i }).first();
        await closeButton.click();

        try {
          await page.getByTestId('path-selection').waitFor({ state: 'visible', timeout: 3000 });
          foundPathSelection = true;
        } catch {
          // Path selection didn't appear, continue combat
        }
      }

      if (!foundPathSelection && outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(foundPathSelection).toBe(true);

    // Select Berserker (active path for Warrior)
    // Click the Berserker card to select it
    const berserkerCard = page.getByRole('button', { name: /Berserker path/i });
    await berserkerCard.click();

    // Click confirm button at the bottom
    const confirmButton = page.getByRole('button', { name: /Confirm.*Path/i });
    await expect(confirmButton).toBeVisible({ timeout: 2000 });
    await confirmButton.click();

    // Should be back in combat with Fury resource (not mana)
    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });

    // Verify resource bar shows Fury (not mana)
    const furyBar = page.getByTestId('resource-bar-fury');
    await expect(furyBar).toBeVisible({ timeout: 5000 });

    // Wait for combat and verify Fury increases
    // Record initial value
    const initialFury = await furyBar.getAttribute('data-resource-current');
    expect(initialFury).toBe('0'); // Should start at 0

    // Wait for player to hit enemy (Fury should increase)
    // Poll until Fury increases or timeout
    await page.waitForFunction(
      () => {
        const bar = document.querySelector('[data-testid="resource-bar-fury"]');
        if (!bar) return false;
        const current = parseInt(bar.getAttribute('data-resource-current') || '0');
        return current > 0;
      },
      { timeout: 30000, polling: 200 }
    );

    // Verify Fury increased
    const newFury = await furyBar.getAttribute('data-resource-current');
    expect(parseInt(newFury || '0')).toBeGreaterThan(0);
  });

  test('Mage Archmage shows Arcane Charges resource', async ({ page }) => {
    test.setTimeout(90000); // 1.5 minutes

    await navigateToGame(page, 'devMode=true&xpMultiplier=10&playerAttack=40&playerDefense=25');
    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    // Kill enemies until level 2 and path selection
    let foundPathSelection = false;
    for (let i = 0; i < 15 && !foundPathSelection; i++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible();
      if (levelUpVisible) {
        const closeButton = page.getByRole('button', { name: /continue|close|ok/i }).first();
        await closeButton.click();

        try {
          await page.getByTestId('path-selection').waitFor({ state: 'visible', timeout: 3000 });
          foundPathSelection = true;
        } catch {
          // Continue
        }
      }

      if (!foundPathSelection && outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(foundPathSelection).toBe(true);

    // Select Archmage (active path for Mage)
    const archmageCard = page.getByRole('button', { name: /Archmage path/i });
    await archmageCard.click();

    // Click confirm button at the bottom
    const confirmButton = page.getByRole('button', { name: /Confirm.*Path/i });
    await expect(confirmButton).toBeVisible({ timeout: 2000 });
    await confirmButton.click();

    // Dismiss any level up popups that appear
    while (await page.getByTestId('level-up-popup').isVisible()) {
      const closeButton = page.getByRole('button', { name: /continue|close|ok/i }).first();
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    // Should have Arcane Charges resource (verifies path resource was initialized)
    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });

    // Wait for arcane charges bar to be visible (checks resource initialization works)
    const chargesBar = page.getByTestId('resource-bar-arcane_charges');
    await expect(chargesBar).toBeVisible({ timeout: 5000 });

    // Verify it shows 0/5 (starting value)
    const chargesValue = await chargesBar.getAttribute('data-resource-current');
    expect(chargesValue).toBe('0');
  });
});
