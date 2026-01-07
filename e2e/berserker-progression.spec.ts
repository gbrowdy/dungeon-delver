// e2e/berserker-progression.spec.ts
/**
 * E2E Tests for Berserker Power Progression
 *
 * Tests the full power progression flow for the Berserker path:
 * - Level 2: Choose first power (Rage Strike vs Savage Slam)
 * - Level 3: Upgrade chosen power (tier 0 -> tier 1)
 * - Level 4: Choose second power (Berserker Roar vs Reckless Charge)
 * - Verify powers appear in power bar with correct tiers
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

test.describe('Berserker Power Progression', () => {
  test.beforeEach(async ({ page }) => {
    // Use moderate XP multiplier to level up at controlled pace
    // Boosted stats to survive and kill enemies
    await navigateToGame(page, 'devMode=true&xpMultiplier=8&playerAttack=50&playerDefense=30');
  });

  test('should offer power choice at level 2 after selecting Berserker path', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Kill enemies until we level up to 2
    let reachedLevel2 = false;
    for (let attempt = 0; attempt < 15 && !reachedLevel2; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      // Check for level up popup
      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible();
      if (levelUpVisible) {
        // Get the level from the popup
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        const level = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');

        console.log(`Leveled up to ${level}`);

        // At level 2, should show path selection after dismissing level-up
        if (level === 2) {
          // Dismiss level up popup
          const closeButton = page.getByRole('button', { name: /continue|close|ok/i }).first();
          await closeButton.click();
          await page.waitForTimeout(500);

          // Wait for path selection
          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });

          // Select Berserker path (first "Select Path" button)
          const selectPathButton = page.getByRole('button', { name: /Select Path/i }).first();
          await selectPathButton.click();
          await page.waitForTimeout(300);

          // Confirm path selection
          const confirmButton = page.getByTestId('path-confirm-button');
          await expect(confirmButton).toBeEnabled({ timeout: 2000 });
          await confirmButton.click();

          // Path selection should disappear
          await expect(page.getByTestId('path-selection')).not.toBeVisible({ timeout: 3000 });

          // Now PowerChoicePopup should appear
          await expect(page.getByTestId('power-choice-popup')).toBeVisible({ timeout: 5000 });

          // Verify it shows level 2
          await expect(page.getByText(/Level 2.*Choose Your Power/i)).toBeVisible();

          // Verify we have two power choices (Rage Strike and Savage Slam)
          const powerCards = page.locator('[data-testid="power-choice-popup"]').locator('button:has-text("Choose")');
          await expect(powerCards).toHaveCount(2);

          // Select the first power (Rage Strike)
          await powerCards.first().click();
          await page.waitForTimeout(300);

          // Confirm the selection
          const confirmPowerButton = page.getByRole('button', { name: /Confirm.*Rage Strike/i });
          await expect(confirmPowerButton).toBeEnabled();
          await confirmPowerButton.click();

          // Power choice popup should disappear
          await expect(page.getByTestId('power-choice-popup')).not.toBeVisible({ timeout: 3000 });

          // Verify power appears in power bar
          const powerButton = page.locator('[data-testid="power-rage_strike"]');
          await expect(powerButton).toBeVisible({ timeout: 3000 });

          reachedLevel2 = true;
        }
      }

      // Wait for next enemy if current one died
      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(reachedLevel2).toBe(true);
  });

  test('should offer upgrade choice at level 3 for existing power', async ({ page }) => {
    test.setTimeout(150000); // 2.5 minutes

    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Progress to level 2, select path and first power
    let currentLevel = 1;
    let hasSelectedPath = false;
    let hasSelectedFirstPower = false;

    for (let attempt = 0; attempt < 25 && currentLevel < 3; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      // Check for level up
      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible();
      if (levelUpVisible) {
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        currentLevel = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');
        console.log(`Leveled up to ${currentLevel}`);

        // Handle level 2: path selection + power choice
        if (currentLevel === 2 && !hasSelectedPath) {
          // Dismiss level up
          await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
          await page.waitForTimeout(500);

          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });
          await page.getByRole('button', { name: /Select Path/i }).first().click();
          await page.waitForTimeout(300);
          await page.getByTestId('path-confirm-button').click();
          await expect(page.getByTestId('path-selection')).not.toBeVisible({ timeout: 3000 });
          hasSelectedPath = true;

          // Handle power choice popup (immediately after path selection)
          const powerChoiceVisible = await page.getByTestId('power-choice-popup').isVisible();
          if (powerChoiceVisible) {
            // Select first power
            const powerCards = page.locator('[data-testid="power-choice-popup"]').locator('button:has-text("Choose")');
            await powerCards.first().click();
            await page.waitForTimeout(300);

            // Confirm
            const confirmButton = page.getByRole('button', { name: /Confirm.*Rage Strike/i });
            await confirmButton.click();
            await expect(page.getByTestId('power-choice-popup')).not.toBeVisible({ timeout: 3000 });
            hasSelectedFirstPower = true;
          }
        }

        // Handle level 3: upgrade choice
        if (currentLevel === 3) {
          // Dismiss level up
          await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
          await page.waitForTimeout(500);

          // Should show UpgradeChoicePopup
          await expect(page.getByTestId('upgrade-choice-popup')).toBeVisible({ timeout: 5000 });

          // Verify it shows "Upgrade a Power"
          await expect(page.getByText(/Upgrade a Power/i)).toBeVisible();

          // Verify we can see the power we selected (Rage Strike)
          await expect(page.getByText('Rage Strike')).toBeVisible();

          // Verify tier upgrade indicator (Tier 0 -> 1)
          await expect(page.getByText(/Tier.*0/i)).toBeVisible();
          await expect(page.getByText(/Tier.*1/i)).toBeVisible();

          // Select the upgrade
          const chooseUpgradeButton = page.locator('[data-testid="upgrade-choice-popup"]').getByRole('button', { name: /Choose/i }).first();
          await chooseUpgradeButton.click();
          await page.waitForTimeout(300);

          // Confirm the upgrade
          const confirmUpgradeButton = page.getByRole('button', { name: /Upgrade.*Rage Strike/i });
          await expect(confirmUpgradeButton).toBeEnabled();
          await confirmUpgradeButton.click();

          // Popup should disappear
          await expect(page.getByTestId('upgrade-choice-popup')).not.toBeVisible({ timeout: 3000 });

          // Back in combat
          await expect(page.getByTestId('floor-indicator')).toBeVisible();
          break;
        }
      }

      // Wait for next enemy
      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(currentLevel).toBeGreaterThanOrEqual(3);
  });

  test('should offer second power choice at level 4', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    let currentLevel = 1;
    let hasSelectedPath = false;
    let hasSelectedFirstPower = false;
    let hasUpgradedFirstPower = false;

    for (let attempt = 0; attempt < 30 && currentLevel < 4; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible();
      if (levelUpVisible) {
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        currentLevel = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');
        console.log(`Leveled up to ${currentLevel}`);

        // Level 2: Select path and first power
        if (currentLevel === 2 && !hasSelectedPath) {
          await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
          await page.waitForTimeout(500);

          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });
          await page.getByRole('button', { name: /Select Path/i }).first().click();
          await page.waitForTimeout(300);
          await page.getByTestId('path-confirm-button').click();
          await expect(page.getByTestId('path-selection')).not.toBeVisible({ timeout: 3000 });
          hasSelectedPath = true;

          const powerChoiceVisible = await page.getByTestId('power-choice-popup').isVisible();
          if (powerChoiceVisible) {
            const powerCards = page.locator('[data-testid="power-choice-popup"]').locator('button:has-text("Choose")');
            await powerCards.first().click();
            await page.waitForTimeout(300);
            const confirmButton = page.getByRole('button', { name: /Confirm/i });
            await confirmButton.click();
            await expect(page.getByTestId('power-choice-popup')).not.toBeVisible({ timeout: 3000 });
            hasSelectedFirstPower = true;
          }
        }

        // Level 3: Upgrade first power
        if (currentLevel === 3 && !hasUpgradedFirstPower) {
          await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
          await page.waitForTimeout(500);

          const upgradeChoiceVisible = await page.getByTestId('upgrade-choice-popup').isVisible();
          if (upgradeChoiceVisible) {
            const chooseButton = page.locator('[data-testid="upgrade-choice-popup"]').getByRole('button', { name: /Choose/i }).first();
            await chooseButton.click();
            await page.waitForTimeout(300);
            const confirmButton = page.getByRole('button', { name: /Upgrade/i });
            await confirmButton.click();
            await expect(page.getByTestId('upgrade-choice-popup')).not.toBeVisible({ timeout: 3000 });
            hasUpgradedFirstPower = true;
          }
        }

        // Level 4: Choose second power
        if (currentLevel === 4) {
          await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
          await page.waitForTimeout(500);

          // Should show PowerChoicePopup again
          await expect(page.getByTestId('power-choice-popup')).toBeVisible({ timeout: 5000 });

          // Verify it shows level 4
          await expect(page.getByText(/Level 4.*Choose Your Power/i)).toBeVisible();

          // Verify we have two new power choices (Berserker Roar and Reckless Charge)
          await expect(page.getByText('Berserker Roar')).toBeVisible();
          await expect(page.getByText('Reckless Charge')).toBeVisible();

          // Select second power (Berserker Roar)
          const powerCards = page.locator('[data-testid="power-choice-popup"]').locator('button:has-text("Choose")');
          await powerCards.first().click();
          await page.waitForTimeout(300);

          // Confirm selection
          const confirmButton = page.getByRole('button', { name: /Confirm/i });
          await expect(confirmButton).toBeEnabled();
          await confirmButton.click();

          // Popup should disappear
          await expect(page.getByTestId('power-choice-popup')).not.toBeVisible({ timeout: 3000 });

          // Verify both powers appear in power bar
          await expect(page.locator('[data-testid^="power-rage_strike"]')).toBeVisible({ timeout: 3000 });
          await expect(page.locator('[data-testid^="power-berserker_roar"]')).toBeVisible({ timeout: 3000 });

          break;
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(currentLevel).toBeGreaterThanOrEqual(4);
  });

  test('should show both powers in power bar after level 4 progression', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    let currentLevel = 1;
    let completedProgression = false;

    for (let attempt = 0; attempt < 30 && !completedProgression; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible();
      if (levelUpVisible) {
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        currentLevel = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');
        console.log(`Leveled up to ${currentLevel}`);

        await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
        await page.waitForTimeout(500);

        // Level 2: Path + Power 1
        if (currentLevel === 2) {
          const pathVisible = await page.getByTestId('path-selection').isVisible().catch(() => false);
          if (pathVisible) {
            await page.getByRole('button', { name: /Select Path/i }).first().click();
            await page.waitForTimeout(300);
            await page.getByTestId('path-confirm-button').click();
            await page.waitForTimeout(500);
          }

          const powerChoiceVisible = await page.getByTestId('power-choice-popup').isVisible().catch(() => false);
          if (powerChoiceVisible) {
            const powerCards = page.locator('[data-testid="power-choice-popup"]').locator('button:has-text("Choose")');
            await powerCards.first().click();
            await page.waitForTimeout(300);
            await page.getByRole('button', { name: /Confirm/i }).click();
            await page.waitForTimeout(500);
          }
        }

        // Level 3: Upgrade Power 1
        if (currentLevel === 3) {
          const upgradeVisible = await page.getByTestId('upgrade-choice-popup').isVisible().catch(() => false);
          if (upgradeVisible) {
            const chooseButton = page.locator('[data-testid="upgrade-choice-popup"]').getByRole('button', { name: /Choose/i }).first();
            await chooseButton.click();
            await page.waitForTimeout(300);
            await page.getByRole('button', { name: /Upgrade/i }).click();
            await page.waitForTimeout(500);
          }
        }

        // Level 4: Power 2
        if (currentLevel === 4) {
          const powerChoiceVisible = await page.getByTestId('power-choice-popup').isVisible().catch(() => false);
          if (powerChoiceVisible) {
            const powerCards = page.locator('[data-testid="power-choice-popup"]').locator('button:has-text("Choose")');
            await powerCards.first().click();
            await page.waitForTimeout(300);
            await page.getByRole('button', { name: /Confirm/i }).click();
            await page.waitForTimeout(500);

            // Now verify both powers are visible
            const power1 = page.locator('[data-testid^="power-"]').first();
            const power2 = page.locator('[data-testid^="power-"]').nth(1);

            await expect(power1).toBeVisible();
            await expect(power2).toBeVisible();

            // Verify they are different powers (check their data-testid)
            const power1Id = await power1.getAttribute('data-testid');
            const power2Id = await power2.getAttribute('data-testid');
            expect(power1Id).not.toBe(power2Id);

            completedProgression = true;
          }
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(completedProgression).toBe(true);
  });

  test('should show path resource (Rage) after selecting Berserker', async ({ page }) => {
    test.setTimeout(120000);

    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    let selectedBerserker = false;

    for (let attempt = 0; attempt < 15 && !selectedBerserker; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible();
      if (levelUpVisible) {
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        const level = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');

        await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
        await page.waitForTimeout(500);

        if (level === 2) {
          const pathVisible = await page.getByTestId('path-selection').isVisible().catch(() => false);
          if (pathVisible) {
            await page.getByRole('button', { name: /Select Path/i }).first().click();
            await page.waitForTimeout(300);
            await page.getByTestId('path-confirm-button').click();
            await page.waitForTimeout(500);
          }

          const powerChoiceVisible = await page.getByTestId('power-choice-popup').isVisible().catch(() => false);
          if (powerChoiceVisible) {
            // Check that resource label changed to "Rage"
            await expect(page.getByText(/Rage/i)).toBeVisible();

            // Confirm a power has "Rage" cost instead of "Mana"
            const powerChoicePopup = page.getByTestId('power-choice-popup');
            const hasRageCost = await powerChoicePopup.getByText(/\d+\s+Rage/i).isVisible();
            expect(hasRageCost).toBe(true);

            selectedBerserker = true;
          }
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(selectedBerserker).toBe(true);
  });
});
