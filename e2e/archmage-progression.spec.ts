// e2e/archmage-progression.spec.ts
/**
 * E2E Tests for Archmage Power Progression
 *
 * Tests the full power progression flow for the Archmage path:
 * - Level 2: Choose first power (Arcane Bolt vs Meteor Strike)
 * - Level 4: Choose second power (Arcane Empowerment vs Arcane Weakness)
 * - Verifies Archmage powers appear, NOT Berserker powers (regression test)
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

test.describe('Archmage Progression', () => {
  test.beforeEach(async ({ page }) => {
    // Use moderate XP multiplier to level up at controlled pace
    // Boosted stats to survive and kill enemies
    await navigateToGame(page, 'devMode=true&xpMultiplier=8&playerAttack=50&playerDefense=30');
  });

  test('Level 2: should show Archmage power choices, NOT Berserker', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    let reachedLevel2 = false;
    for (let attempt = 0; attempt < 30 && !reachedLevel2; attempt++) {
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
          // Wait for path selection
          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });

          // Select Archmage path (first path)
          await page.getByRole('button', { name: /Select Path/i }).first().click();
          await page.waitForTimeout(300);
          await page.getByTestId('path-confirm-button').click();

          // Wait for power choice popup
          await expect(page.getByTestId('power-choice-popup')).toBeVisible({ timeout: 5000 });

          // Verify CORRECT powers (Archmage)
          await expect(page.getByText('Arcane Bolt')).toBeVisible();
          await expect(page.getByText('Meteor Strike')).toBeVisible();

          // Verify WRONG powers NOT shown (Berserker)
          await expect(page.getByText('Rage Strike')).not.toBeVisible();
          await expect(page.getByText('Savage Slam')).not.toBeVisible();

          reachedLevel2 = true;
          break; // Exit loop after successful verification
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(reachedLevel2).toBe(true);
  });

  test('Level 4: should show second power choice, NOT Berserker', async ({ page }) => {
    test.setTimeout(240000); // 4 minutes

    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    let reachedLevel4 = false;
    let hasSelectedPath = false;
    let hasSelectedFirstPower = false;
    let hasUpgradedFirstPower = false;

    for (let attempt = 0; attempt < 50 && !reachedLevel4; attempt++) {
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

        if (level === 2 && !hasSelectedPath) {
          await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });
          await page.getByRole('button', { name: /Select Path/i }).first().click();
          await page.waitForTimeout(300);
          await page.getByTestId('path-confirm-button').click();
          hasSelectedPath = true;

          // Select first power
          await expect(page.getByTestId('power-choice-popup')).toBeVisible({ timeout: 5000 });
          const powerCards = page.locator('[data-testid="power-choice-popup"]').locator('button:has-text("Choose")');
          await powerCards.first().click();
          await page.waitForTimeout(300);
          await page.getByRole('button', { name: /Confirm/i }).click();
          await expect(page.getByTestId('power-choice-popup')).not.toBeVisible({ timeout: 3000 });
          hasSelectedFirstPower = true;
        } else if (level === 3 && !hasUpgradedFirstPower) {
          // Handle upgrade choice at level 3
          const upgradePopup = page.getByTestId('upgrade-choice-popup');
          const upgradeVisible = await upgradePopup.isVisible().catch(() => false);
          if (upgradeVisible) {
            const chooseButton = upgradePopup.getByRole('button', { name: /Choose/i }).first();
            await chooseButton.click();
            await page.waitForTimeout(300);
            // Confirm button is "Upgrade <power name>" not just "Confirm"
            const confirmButton = upgradePopup.locator('button').filter({ hasText: /^Upgrade\s/ });
            await confirmButton.click();
            await expect(upgradePopup).not.toBeVisible({ timeout: 3000 });
            hasUpgradedFirstPower = true;
          }
        } else if (level === 4 && hasSelectedFirstPower) {
          await expect(page.getByTestId('power-choice-popup')).toBeVisible({ timeout: 5000 });

          // Verify second set of Archmage powers
          await expect(page.getByText('Arcane Empowerment')).toBeVisible();
          await expect(page.getByText('Arcane Weakness')).toBeVisible();

          // Verify no Berserker powers
          await expect(page.getByText('Berserker Roar')).not.toBeVisible();
          await expect(page.getByText('Reckless Charge')).not.toBeVisible();

          reachedLevel4 = true;
          break; // Exit loop after successful verification
        }
      }

      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(reachedLevel4).toBe(true);
  });
});
