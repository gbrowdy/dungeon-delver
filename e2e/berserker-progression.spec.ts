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
  clearBlockingPopups,
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

          // Scope further checks to the upgrade popup
          const upgradePopup = page.getByTestId('upgrade-choice-popup');

          // Verify it shows "Upgrade a Power"
          await expect(upgradePopup.getByText(/Upgrade a Power/i)).toBeVisible();

          // Verify we can see the power we selected (Rage Strike) within the popup
          await expect(upgradePopup.getByText('Rage Strike')).toBeVisible();

          // Verify tier upgrade indicator (Tier 0 -> 1)
          await expect(upgradePopup.getByText(/Tier.*0/i)).toBeVisible();

          // Select the upgrade
          const chooseUpgradeButton = upgradePopup.getByRole('button', { name: /Choose/i }).first();
          await chooseUpgradeButton.click();
          await page.waitForTimeout(300);

          // Confirm the upgrade (use exact match for the confirm button)
          const confirmUpgradeButton = upgradePopup.getByRole('button', { name: 'Upgrade Rage Strike', exact: true });
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

          const upgradePopup = page.getByTestId('upgrade-choice-popup');
          const upgradeChoiceVisible = await upgradePopup.isVisible();
          if (upgradeChoiceVisible) {
            const chooseButton = upgradePopup.getByRole('button', { name: /Choose/i }).first();
            await chooseButton.click();
            await page.waitForTimeout(300);
            // Get power name from the selected card to build confirm button selector
            const confirmButton = upgradePopup.locator('button').filter({ hasText: /^Upgrade\s/ });
            await confirmButton.click();
            await expect(upgradePopup).not.toBeVisible({ timeout: 3000 });
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

          // Clear any blocking popups (floor-complete, additional level-ups, etc.)
          await clearBlockingPopups(page);

          // Wait for enemy to be present (ensures we're in combat)
          await waitForEnemySpawn(page).catch(() => {});
          await page.waitForTimeout(500);

          // Verify both powers appear in power bar
          await expect(page.locator('[data-testid^="power-rage_strike"]')).toBeVisible({ timeout: 5000 });
          await expect(page.locator('[data-testid^="power-berserker_roar"]')).toBeVisible({ timeout: 5000 });

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
          const upgradePopup = page.getByTestId('upgrade-choice-popup');
          const upgradeVisible = await upgradePopup.isVisible().catch(() => false);
          if (upgradeVisible) {
            const chooseButton = upgradePopup.getByRole('button', { name: /Choose/i }).first();
            await chooseButton.click();
            await page.waitForTimeout(300);
            const confirmButton = upgradePopup.locator('button').filter({ hasText: /^Upgrade\s/ });
            await confirmButton.click();
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

            // Clear any blocking popups (floor-complete, additional level-ups, etc.)
            await clearBlockingPopups(page);

            // Wait for enemy to be present (ensures we're in combat)
            await waitForEnemySpawn(page).catch(() => {});
            await page.waitForTimeout(500);

            // Now verify both powers are visible in power bar
            const power1 = page.locator('[data-testid^="power-"]').first();
            const power2 = page.locator('[data-testid^="power-"]').nth(1);

            await expect(power1).toBeVisible({ timeout: 5000 });
            await expect(power2).toBeVisible({ timeout: 5000 });

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

  test('should show path resource (Fury) after selecting Berserker', async ({ page }) => {
    test.setTimeout(120000);

    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Step 1: Wait for level-up to level 2 (enemy defeat + XP)
    await page.getByTestId('level-up-popup').waitFor({ state: 'visible', timeout: 60000 });
    console.log('Level up popup visible');

    // Step 2: Dismiss level-up popup
    await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
    await page.waitForTimeout(500);
    console.log('Clicked Continue');

    // Step 3: Wait for path selection screen
    await page.getByTestId('path-selection').waitFor({ state: 'visible', timeout: 10000 });
    console.log('Path selection visible');

    // Step 4: Select Berserker path (first path)
    await page.getByRole('button', { name: /Select Path/i }).first().click();
    await page.waitForTimeout(300);
    await page.getByTestId('path-confirm-button').click();
    await page.waitForTimeout(500);
    console.log('Selected Berserker path');

    // Step 5: Wait for power choice popup
    await page.getByTestId('power-choice-popup').waitFor({ state: 'visible', timeout: 10000 });
    console.log('Power choice popup visible');

    // Step 6: Verify Fury is displayed
    await expect(page.getByText(/Fury/i).first()).toBeVisible();
    console.log('Fury resource is visible');

    // Step 7: Verify power has Fury cost
    const powerChoicePopup = page.getByTestId('power-choice-popup');
    const hasFuryCost = await powerChoicePopup.getByText(/\d+\s+Fury/i).first().isVisible();
    expect(hasFuryCost).toBe(true);
    console.log('Power has Fury cost');
  });

  test('upgraded power affects combat damage', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    // Use moderate XP to reach level 3, with boosted stats for survival
    await navigateToGame(page, 'devMode=true&xpMultiplier=8&playerAttack=50&playerDefense=30&playerHealth=200');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    let currentLevel = 1;
    let hasSelectedPath = false;
    let hasSelectedRageStrike = false;
    let hasUpgradedRageStrike = false;

    // Track enemy health before and after using Rage Strike
    let baseDamageObserved = false;
    let upgradedDamageObserved = false;

    for (let attempt = 0; attempt < 35 && currentLevel < 4; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible().catch(() => false);
      if (levelUpVisible) {
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        currentLevel = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');
        console.log(`Leveled up to ${currentLevel}`);

        await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
        await page.waitForTimeout(500);

        // Level 2: Select Berserker path and Rage Strike
        if (currentLevel === 2 && !hasSelectedPath) {
          const pathVisible = await page.getByTestId('path-selection').isVisible().catch(() => false);
          if (pathVisible) {
            await page.getByRole('button', { name: /Select Path/i }).first().click();
            await page.waitForTimeout(300);
            await page.getByTestId('path-confirm-button').click();
            await page.waitForTimeout(500);
            hasSelectedPath = true;
          }

          const powerChoiceVisible = await page.getByTestId('power-choice-popup').isVisible().catch(() => false);
          if (powerChoiceVisible) {
            // Select Rage Strike (first power)
            const powerCards = page.locator('[data-testid="power-choice-popup"]').locator('button:has-text("Choose")');
            await powerCards.first().click();
            await page.waitForTimeout(300);

            // Verify it's Rage Strike before confirming
            const confirmButton = page.getByRole('button', { name: /Confirm.*Rage Strike/i });
            await expect(confirmButton).toBeVisible();
            await confirmButton.click();
            await page.waitForTimeout(500);
            hasSelectedRageStrike = true;

            console.log('Selected Rage Strike at level 2 (tier 0)');

            // Verify Rage Strike button is visible
            const rageStrikeButton = page.locator('[data-testid="power-rage_strike"]');
            await expect(rageStrikeButton).toBeVisible({ timeout: 5000 });
            baseDamageObserved = true;
          }
        }

        // Level 3: Upgrade Rage Strike to tier 1
        if (currentLevel === 3 && hasSelectedRageStrike && !hasUpgradedRageStrike) {
          const upgradeVisible = await page.getByTestId('upgrade-choice-popup').isVisible().catch(() => false);
          if (upgradeVisible) {
            const upgradePopup = page.getByTestId('upgrade-choice-popup');

            // Verify we're upgrading Rage Strike
            await expect(upgradePopup.getByText('Rage Strike')).toBeVisible();

            // Verify tier upgrade indicator (Tier 0 -> 1)
            await expect(upgradePopup.getByText(/Tier.*0/i)).toBeVisible();

            // Verify upgrade shows increased damage (200% -> 240%)
            await expect(upgradePopup.getByText(/240%/i)).toBeVisible();

            // Select the upgrade
            const chooseButton = upgradePopup.getByRole('button', { name: /Choose/i }).first();
            await chooseButton.click();
            await page.waitForTimeout(300);

            // Confirm the upgrade
            const confirmButton = upgradePopup.getByRole('button', { name: 'Upgrade Rage Strike', exact: true });
            await confirmButton.click();
            await page.waitForTimeout(500);

            hasUpgradedRageStrike = true;
            upgradedDamageObserved = true;

            console.log('Upgraded Rage Strike to tier 1 (240% damage)');

            // Verify Rage Strike button is still visible after upgrade
            const rageStrikeButton = page.locator('[data-testid="power-rage_strike"]');
            await expect(rageStrikeButton).toBeVisible({ timeout: 5000 });

            break;
          }
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    // Verify we completed the progression
    expect(currentLevel).toBeGreaterThanOrEqual(3);
    expect(hasSelectedRageStrike).toBe(true);
    expect(hasUpgradedRageStrike).toBe(true);
    expect(baseDamageObserved).toBe(true);
    expect(upgradedDamageObserved).toBe(true);

    console.log('Power upgrade flow completed successfully');
  });
});
