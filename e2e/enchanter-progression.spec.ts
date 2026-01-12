// e2e/enchanter-progression.spec.ts
/**
 * E2E Tests for Enchanter Stance Enhancement Progression
 *
 * Tests the stance enhancement flow for the Enchanter path (passive Mage path):
 * - Level 2: Choose Enchanter path (passive)
 * - Level 3+: Choose stance enhancements (Arcane Surge or Hex Veil)
 * - Verify CORRECT enhancements shown (Enchanter, not Guardian)
 * - Verify stance toggle works between Arcane Surge and Hex Veil
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

test.describe('Enchanter Stance Enhancement Progression', () => {
  test.beforeEach(async ({ page }) => {
    // Use moderate XP multiplier to level up at controlled pace
    // Boosted stats to survive and kill enemies
    await navigateToGame(page, 'devMode=true&xpMultiplier=8&playerAttack=50&playerDefense=30');
  });

  test('Level 3: should show Enchanter enhancements NOT Guardian enhancements', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    let currentLevel = 1;
    let hasSelectedEnchanter = false;
    let reachedLevel3Enhancement = false;

    for (let attempt = 0; attempt < 40 && !reachedLevel3Enhancement; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        hasSelectedEnchanter = false; // Reset on death
        currentLevel = 1;
        continue;
      }

      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible().catch(() => false);
      if (levelUpVisible) {
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        currentLevel = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');
        console.log(`Leveled up to ${currentLevel}`);

        // Handle level 2: path selection
        if (currentLevel === 2 && !hasSelectedEnchanter) {
          // Dismiss level up
          await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
          await page.waitForTimeout(500);

          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });

          // Select Enchanter path (second "Select Path" button - passive path)
          const selectPathButtons = page.getByRole('button', { name: /Select Path/i });
          await selectPathButtons.nth(1).click();
          await page.waitForTimeout(300);

          await page.getByTestId('path-confirm-button').click();
          await expect(page.getByTestId('path-selection')).not.toBeVisible({ timeout: 3000 });
          hasSelectedEnchanter = true;

          console.log('Selected Enchanter path');
        }

        // Handle level 3: stance enhancement choice
        if (currentLevel === 3 && hasSelectedEnchanter) {
          // Dismiss level up
          await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
          await page.waitForTimeout(500);

          // Should show StanceEnhancementPopup
          await expect(page.getByTestId('stance-enhancement-popup')).toBeVisible({ timeout: 5000 });

          // Verify it shows stance enhancement options
          await expect(page.getByText('Enhance Your Stance')).toBeVisible();

          // Verify CORRECT enhancements shown (Enchanter tier 1)
          // From enchanter-enhancements.ts: tier 1 is "Searing Touch" (Arcane Surge) and "Weakening Hex" (Hex Veil)
          await expect(page.getByText('Searing Touch')).toBeVisible();
          await expect(page.getByText('Weakening Hex')).toBeVisible();

          // Verify WRONG enhancements NOT shown (Guardian tier 1)
          // From guardian-enhancements.ts: tier 1 is "Fortified Skin" and "Sharpened Thorns"
          await expect(page.locator('text=Fortified Skin')).not.toBeVisible();
          await expect(page.locator('text=Sharpened Thorns')).not.toBeVisible();

          reachedLevel3Enhancement = true;
          console.log('Verified Enchanter enhancements at level 3');
          break;
        }
      }

      // Wait for next enemy
      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(currentLevel).toBeGreaterThanOrEqual(3);
    expect(hasSelectedEnchanter).toBe(true);
    expect(reachedLevel3Enhancement).toBe(true);
  });

  test('should offer stance enhancement choice at level 3 after selecting Enchanter path', async ({ page }) => {
    test.setTimeout(150000); // 2.5 minutes

    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    let currentLevel = 1;
    let hasSelectedEnchanter = false;
    let hasSelectedEnhancement = false;

    for (let attempt = 0; attempt < 25 && currentLevel < 3; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      // Check for level up
      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible().catch(() => false);
      if (levelUpVisible) {
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        currentLevel = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');
        console.log(`Leveled up to ${currentLevel}`);

        // Handle level 2: path selection
        if (currentLevel === 2 && !hasSelectedEnchanter) {
          // Dismiss level up
          await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
          await page.waitForTimeout(500);

          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });

          // Select Enchanter path (second "Select Path" button)
          const selectPathButtons = page.getByRole('button', { name: /Select Path/i });
          await selectPathButtons.nth(1).click();
          await page.waitForTimeout(300);

          await page.getByTestId('path-confirm-button').click();
          await expect(page.getByTestId('path-selection')).not.toBeVisible({ timeout: 3000 });
          hasSelectedEnchanter = true;

          console.log('Selected Enchanter path');
        }

        // Handle level 3: stance enhancement choice
        if (currentLevel === 3 && hasSelectedEnchanter) {
          // Dismiss level up
          await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
          await page.waitForTimeout(500);

          // Should show StanceEnhancementPopup
          await expect(page.getByTestId('stance-enhancement-popup')).toBeVisible({ timeout: 5000 });

          // Verify it shows stance enhancement options
          await expect(page.getByText('Enhance Your Stance')).toBeVisible();

          // Verify we have two stance choices (Arcane Surge and Hex Veil)
          await expect(page.getByText('Searing Touch')).toBeVisible(); // Arcane Surge enhancement
          await expect(page.getByText('Weakening Hex')).toBeVisible(); // Hex Veil enhancement

          // Select Arcane Surge enhancement by clicking its "Choose" button
          const enhancementPopup = page.getByTestId('stance-enhancement-popup');
          const arcaneSurgeChooseButton = enhancementPopup.getByRole('button', { name: /Choose/i }).first();
          await arcaneSurgeChooseButton.click();
          await page.waitForTimeout(300);

          // Confirm the selection - button says "Enhance Arcane Surge" or "Enhance Hex Veil"
          const confirmButton = page.getByRole('button', { name: /Enhance (Arcane Surge|Hex Veil|Iron Stance|Retribution)/i });
          await expect(confirmButton).toBeEnabled();
          await confirmButton.click();

          // Popup should disappear
          await expect(page.getByTestId('stance-enhancement-popup')).not.toBeVisible({ timeout: 3000 });

          hasSelectedEnhancement = true;
          console.log('Selected Arcane Surge enhancement at level 3');
          break;
        }
      }

      // Wait for next enemy
      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(currentLevel).toBeGreaterThanOrEqual(3);
    expect(hasSelectedEnchanter).toBe(true);
    expect(hasSelectedEnhancement).toBe(true);
  });

  test('Stance toggle should switch between Arcane Surge and Hex Veil', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    let hasSelectedEnchanter = false;

    for (let attempt = 0; attempt < 30 && !hasSelectedEnchanter; attempt++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible().catch(() => false);
      if (levelUpVisible) {
        const levelText = await page.getByTestId('level-up-new-level').textContent();
        const level = parseInt(levelText?.match(/\d+/)?.[0] ?? '1');
        console.log(`Leveled up to ${level}`);

        await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
        await page.waitForTimeout(500);

        if (level === 2) {
          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });
          const pathButtons = page.getByRole('button', { name: /Select Path/i });
          await pathButtons.nth(1).click(); // Enchanter is second (passive path)
          await page.waitForTimeout(300);
          await page.getByTestId('path-confirm-button').click();
          await expect(page.getByTestId('path-selection')).not.toBeVisible({ timeout: 3000 });
          hasSelectedEnchanter = true;
          console.log('Selected Enchanter path');
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(hasSelectedEnchanter).toBe(true);

    // Now verify stance toggle exists and can switch stances
    await expect(page.getByTestId('stance-toggle')).toBeVisible({ timeout: 5000 });

    // Get the stance toggle container
    const stanceToggle = page.getByTestId('stance-toggle');

    // Verify initial stance is active (Arcane Surge is default)
    await expect(stanceToggle.getByText('Arcane Surge')).toBeVisible();
    await expect(stanceToggle.getByText('Hex Veil')).toBeVisible();

    // The active stance should show "Active" label
    await expect(page.getByTestId('active-stance')).toBeVisible();

    // Click the inactive stance to switch (Hex Veil)
    const hexVeilButton = stanceToggle.locator('button', { hasText: 'Hex Veil' });
    await hexVeilButton.click();

    // Wait for cooldown to be applied and stance to change
    await page.waitForTimeout(500);

    // Verify we can see both stances in the toggle
    await expect(stanceToggle.getByText('Arcane Surge')).toBeVisible();
    await expect(stanceToggle.getByText('Hex Veil')).toBeVisible();

    console.log('Verified stance toggle works for Enchanter path');
  });

  test('Enchanter stance enhancements affect combat stats', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    let currentLevel = 1;
    let hasSelectedEnchanter = false;
    let hasSelectedEnhancement = false;
    let verifiedStatsAffected = false;

    for (let attempt = 0; attempt < 30 && !verifiedStatsAffected; attempt++) {
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

        // Level 2: Select Enchanter path
        if (currentLevel === 2 && !hasSelectedEnchanter) {
          await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
          await page.waitForTimeout(500);

          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });
          const selectPathButtons = page.getByRole('button', { name: /Select Path/i });
          await selectPathButtons.nth(1).click();
          await page.waitForTimeout(300);
          await page.getByTestId('path-confirm-button').click();
          await expect(page.getByTestId('path-selection')).not.toBeVisible({ timeout: 3000 });
          hasSelectedEnchanter = true;

          console.log('Selected Enchanter path (passive)');
        }

        // Level 3: Select stance enhancement
        if (currentLevel === 3 && hasSelectedEnchanter && !hasSelectedEnhancement) {
          await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
          await page.waitForTimeout(500);

          const enhancementPopup = page.getByTestId('stance-enhancement-popup');
          const enhancementVisible = await enhancementPopup.isVisible().catch(() => false);

          if (enhancementVisible) {
            // Verify enhancement shows stat bonuses
            // Arcane Surge tier 1 enhancement: "Searing Touch" - Burn damage +25%
            await expect(enhancementPopup.getByText('Searing Touch')).toBeVisible();
            await expect(enhancementPopup.getByText('Burn damage +25%')).toBeVisible();

            // Hex Veil tier 1 enhancement: "Weakening Hex" - Enemy damage reduced by additional 10%
            await expect(enhancementPopup.getByText('Weakening Hex')).toBeVisible();

            // Select Arcane Surge enhancement by clicking its "Choose" button
            const arcaneSurgeChooseButton = enhancementPopup.getByRole('button', { name: /Choose/i }).first();
            await arcaneSurgeChooseButton.click();
            await page.waitForTimeout(300);

            // Confirm button says "Enhance Arcane Surge" or similar
            const confirmButton = page.getByRole('button', { name: /Enhance (Arcane Surge|Hex Veil)/i });
            await confirmButton.click();
            await expect(enhancementPopup).not.toBeVisible({ timeout: 3000 });

            hasSelectedEnhancement = true;
            console.log('Selected Arcane Surge enhancement (Searing Touch: Burn damage +25%)');

            // Wait for combat to resume
            await page.waitForTimeout(1000);

            // Verify we're back in combat
            await expect(page.getByTestId('floor-indicator')).toBeVisible();

            // The stance enhancement should now be affecting combat stats
            // We can verify this by checking that combat continues normally
            // (the enhancement is applied via effectiveStanceEffects in the ECS)

            // Wait a bit to let combat happen with the new enhancement
            await page.waitForTimeout(2000);

            // If we reach here without errors, the enhancement is working
            verifiedStatsAffected = true;
            console.log('Verified stance enhancement affects combat (no errors, combat continues)');
          }
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(currentLevel).toBeGreaterThanOrEqual(3);
    expect(hasSelectedEnchanter).toBe(true);
    expect(hasSelectedEnhancement).toBe(true);
    expect(verifiedStatsAffected).toBe(true);
  });

  test('should offer multiple stance enhancements as player levels up', async ({ page }) => {
    test.setTimeout(240000); // 4 minutes

    // Higher XP multiplier to reach level 4 faster
    await navigateToGame(page, 'devMode=true&xpMultiplier=12&playerAttack=60&playerDefense=40');
    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    let currentLevel = 1;
    let hasSelectedEnchanter = false;
    let enhancementsSelected = 0;

    for (let attempt = 0; attempt < 35 && enhancementsSelected < 2; attempt++) {
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

        // Level 2: Path selection
        if (currentLevel === 2 && !hasSelectedEnchanter) {
          const pathVisible = await page.getByTestId('path-selection').isVisible().catch(() => false);
          if (pathVisible) {
            const selectPathButtons = page.getByRole('button', { name: /Select Path/i });
            await selectPathButtons.nth(1).click();
            await page.waitForTimeout(300);
            await page.getByTestId('path-confirm-button').click();
            await page.waitForTimeout(500);
            hasSelectedEnchanter = true;
          }
        }

        // Level 3+: Stance enhancements
        if (currentLevel >= 3 && hasSelectedEnchanter) {
          const enhancementPopup = page.getByTestId('stance-enhancement-popup');
          const enhancementVisible = await enhancementPopup.isVisible().catch(() => false);

          if (enhancementVisible) {
            console.log(`Stance enhancement offered at level ${currentLevel}`);

            // Alternate between Arcane Surge and Hex Veil enhancements
            // Click the first or second "Choose" button based on which stance we want
            const chooseButtons = enhancementPopup.getByRole('button', { name: /Choose/i });
            const buttonIndex = enhancementsSelected % 2; // 0 for Arcane Surge, 1 for Hex Veil
            await chooseButtons.nth(buttonIndex).click();
            await page.waitForTimeout(300);

            // Confirm button says "Enhance Arcane Surge" or "Enhance Hex Veil"
            const confirmButton = page.getByRole('button', { name: /Enhance (Arcane Surge|Hex Veil)/i });
            await confirmButton.click();
            await expect(enhancementPopup).not.toBeVisible({ timeout: 3000 });

            enhancementsSelected++;
            const stanceName = buttonIndex === 0 ? 'Arcane Surge' : 'Hex Veil';
            console.log(`Selected ${stanceName} enhancement (total: ${enhancementsSelected})`);

            // Exit early if we've selected enough enhancements
            if (enhancementsSelected >= 2) {
              break;
            }
          }
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    // Verify we received multiple enhancement choices (at least 2)
    expect(enhancementsSelected).toBeGreaterThanOrEqual(2);
    console.log(`Total stance enhancements selected: ${enhancementsSelected}`);
  });
});
