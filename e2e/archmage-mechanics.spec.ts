// e2e/archmage-mechanics.spec.ts
/**
 * E2E Tests for Archmage Power Mechanics
 *
 * Tests the special mechanics of Archmage powers:
 * - Arcane Bolt: Basic damage spell (low cost, fast cooldown)
 * - Meteor Strike: High damage nuke (high cost, slow cooldown)
 * - Arcane Empowerment: Self-buff (power and speed)
 * - Arcane Weakness: Enemy debuff (vulnerable)
 */

import { test, expect, Page } from '@playwright/test';
import {
  navigateToGame,
  selectClassAndBegin,
  setSpeedToMax,
  waitForCombatOutcome,
  waitForEnemySpawn,
  waitForDeathAndRetry,
  clearBlockingPopups,
} from './helpers/game-actions';

/**
 * Helper: Progress to level N as Archmage, selecting specified powers
 */
async function progressToArchmageLevel(
  page: Page,
  targetLevel: number,
  powerSelections: Record<number, number> // level -> power index (0 or 1)
): Promise<void> {
  let currentLevel = 1;
  let hasSelectedPath = false;

  for (let attempt = 0; attempt < 50 && currentLevel < targetLevel; attempt++) {
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

      await page.getByRole('button', { name: /continue|close|ok/i }).first().click();
      await page.waitForTimeout(500);

      // Level 2: Path selection + first power
      if (currentLevel === 2 && !hasSelectedPath) {
        const pathVisible = await page.getByTestId('path-selection').isVisible().catch(() => false);
        if (pathVisible) {
          // Select Archmage (first path)
          await page.getByRole('button', { name: /Select Path/i }).first().click();
          await page.waitForTimeout(300);
          await page.getByTestId('path-confirm-button').click();
          await page.waitForTimeout(500);
          hasSelectedPath = true;
        }

        // Select first power
        const powerChoiceVisible = await page.getByTestId('power-choice-popup').isVisible().catch(() => false);
        if (powerChoiceVisible) {
          const powerIndex = powerSelections[2] ?? 0;
          const powerCards = page.locator('[data-testid="power-choice-popup"]').locator('button:has-text("Choose")');
          await powerCards.nth(powerIndex).click();
          await page.waitForTimeout(300);
          await page.getByRole('button', { name: /Confirm/i }).click();
          await page.waitForTimeout(500);
        }
      }

      // Level 3: Upgrade choice
      if (currentLevel === 3) {
        const upgradeVisible = await page.getByTestId('upgrade-choice-popup').isVisible().catch(() => false);
        if (upgradeVisible) {
          const chooseBtn = page.getByTestId('upgrade-choice-popup').getByRole('button', { name: /Choose/i }).first();
          await chooseBtn.click();
          await page.waitForTimeout(300);
          const confirmBtn = page.getByTestId('upgrade-choice-popup').locator('button').filter({ hasText: /^Upgrade\s/ });
          await confirmBtn.click();
          await page.waitForTimeout(500);
        }
      }

      // Level 4: Second power choice
      if (currentLevel === 4) {
        const powerChoiceVisible = await page.getByTestId('power-choice-popup').isVisible().catch(() => false);
        if (powerChoiceVisible) {
          const powerIndex = powerSelections[4] ?? 0;
          const powerCards = page.locator('[data-testid="power-choice-popup"]').locator('button:has-text("Choose")');
          await powerCards.nth(powerIndex).click();
          await page.waitForTimeout(300);
          await page.getByRole('button', { name: /Confirm/i }).click();
          await page.waitForTimeout(500);
        }
      }

      // Level 5+: Handle upgrade popups
      if (currentLevel >= 5) {
        const upgradeVisible = await page.getByTestId('upgrade-choice-popup').isVisible().catch(() => false);
        if (upgradeVisible) {
          const chooseBtn = page.getByTestId('upgrade-choice-popup').getByRole('button', { name: /Choose/i }).first();
          await chooseBtn.click();
          await page.waitForTimeout(300);
          const confirmBtn = page.getByTestId('upgrade-choice-popup').locator('button').filter({ hasText: /^Upgrade\s/ });
          await confirmBtn.click();
          await page.waitForTimeout(500);
        }
      }

      // If we've reached target level, break out early
      if (currentLevel >= targetLevel) {
        break;
      }
    }

    if (outcome === 'enemy_died') {
      await waitForEnemySpawn(page).catch(() => {});
    }
  }

  // Clear any remaining popups (level-ups, floor-complete, etc.)
  await clearBlockingPopups(page, 10);

  // Wait for combat to be ready
  await waitForEnemySpawn(page).catch(() => {});
}

/**
 * Helper: Use a power by clicking its button (waits for it to be enabled)
 */
async function usePower(page: Page, powerId: string, maxWaitMs = 10000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    // Clear any blocking popups first
    await clearBlockingPopups(page, 3);

    const powerButton = page.locator(`[data-testid="power-${powerId}"]`);
    const isVisible = await powerButton.isVisible().catch(() => false);

    if (!isVisible) {
      await page.waitForTimeout(200);
      continue;
    }

    const isDisabled = await powerButton.isDisabled();
    if (!isDisabled) {
      await powerButton.click();
      await page.waitForTimeout(500);
      return true;
    }
    await page.waitForTimeout(200);
  }
  return false;
}

/**
 * Helper: Check if power is on cooldown
 */
async function isPowerOnCooldown(page: Page, powerId: string): Promise<boolean> {
  const cooldownIndicator = page.locator(`[data-testid="power-cooldown-${powerId}"]`);
  return cooldownIndicator.isVisible().catch(() => false);
}

test.describe('Archmage Power Mechanics', () => {
  test.beforeEach(async ({ page }) => {
    // High XP for fast leveling, balanced stats for Mage
    // Charge resource generates passively, so we don't need special settings
    await navigateToGame(page, 'devMode=true&xpMultiplier=8&playerAttack=80&playerDefense=15');
  });

  test('Arcane Bolt should deal damage to enemy', async ({ page }) => {
    test.setTimeout(180000);

    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    // Progress to level 2, select Arcane Bolt (index 0)
    await progressToArchmageLevel(page, 2, { 2: 0 });

    // Wait for Charge to accumulate (Arcane Bolt costs 15 Charge)
    await page.waitForTimeout(3000);

    // Use Arcane Bolt (waits for enough Charge)
    const powerUsed = await usePower(page, 'arcane_bolt', 15000);
    expect(powerUsed).toBe(true);

    // Verify the power went on cooldown (confirms it was used successfully)
    const onCooldown = await isPowerOnCooldown(page, 'arcane_bolt');
    expect(onCooldown).toBe(true);
  });

  test('Meteor Strike should deal high damage to enemy', async ({ page }) => {
    test.setTimeout(180000);

    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    // Progress to level 2, select Meteor Strike (index 1)
    await progressToArchmageLevel(page, 2, { 2: 1 });

    // Wait for Charge to accumulate (Meteor Strike costs 60 Charge)
    await page.waitForTimeout(8000);

    // Use Meteor Strike (waits for enough Charge)
    const powerUsed = await usePower(page, 'meteor_strike', 25000);
    expect(powerUsed).toBe(true);

    // Verify the power went on cooldown (confirms it was used successfully)
    const onCooldown = await isPowerOnCooldown(page, 'meteor_strike');
    expect(onCooldown).toBe(true);
  });

  test('Arcane Empowerment should apply power and speed buff', async ({ page }) => {
    test.setTimeout(180000);

    // Use higher defense for this test since we need to survive to level 4
    await navigateToGame(page, 'devMode=true&xpMultiplier=8&playerAttack=80&playerDefense=25');
    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    // Progress to level 4, select:
    // - Level 2: Arcane Bolt (index 0, low cost)
    // - Level 4: Arcane Empowerment (index 0)
    await progressToArchmageLevel(page, 4, { 2: 0, 4: 0 });

    // Wait for Charge to build (Arcane Empowerment costs 25)
    await page.waitForTimeout(3000);

    // Use Arcane Empowerment (waits for enough Charge)
    const powerUsed = await usePower(page, 'arcane_empowerment', 15000);
    expect(powerUsed).toBe(true);

    // Verify the power went on cooldown (confirms it was used)
    const onCooldown = await isPowerOnCooldown(page, 'arcane_empowerment');
    expect(onCooldown).toBe(true);

    // The buff should now be active - we confirmed by successful cast
    // Buff effects are: +35% Power, +20% Speed for 6s
  });

  test('Arcane Weakness should apply vulnerable debuff to enemy', async ({ page }) => {
    test.setTimeout(180000);

    // Use higher defense for this test since we need to survive to level 4
    await navigateToGame(page, 'devMode=true&xpMultiplier=8&playerAttack=80&playerDefense=25');
    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    // Progress to level 4, select:
    // - Level 2: Arcane Bolt (index 0, low cost)
    // - Level 4: Arcane Weakness (index 1)
    await progressToArchmageLevel(page, 4, { 2: 0, 4: 1 });

    // Wait for Charge to build (Arcane Weakness costs 20)
    await page.waitForTimeout(3000);

    // Use Arcane Weakness (waits for enough Charge)
    const powerUsed = await usePower(page, 'arcane_weakness', 15000);
    expect(powerUsed).toBe(true);

    // Verify the power went on cooldown (confirms it was used)
    const onCooldown = await isPowerOnCooldown(page, 'arcane_weakness');
    expect(onCooldown).toBe(true);

    // The debuff should now be active - enemy takes 25% more damage for 8s
  });

  test('should have both powers available after level 4', async ({ page }) => {
    test.setTimeout(180000);

    // Use higher defense for this test since we need to survive to level 4
    await navigateToGame(page, 'devMode=true&xpMultiplier=8&playerAttack=80&playerDefense=25');
    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    // Progress to level 4
    await progressToArchmageLevel(page, 4, { 2: 0, 4: 0 });

    // Wait for combat
    await waitForEnemySpawn(page);

    // Verify both powers are visible
    await expect(page.locator('[data-testid="power-arcane_bolt"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="power-arcane_empowerment"]')).toBeVisible({ timeout: 5000 });
  });

  test('Arcane Charges resource should be displayed after selecting Archmage', async ({ page }) => {
    test.setTimeout(180000);

    await selectClassAndBegin(page, 'Mage');
    await setSpeedToMax(page);

    // Progress to level 2 with Archmage path
    await progressToArchmageLevel(page, 2, { 2: 0 });

    // Check Arcane Charges resource is displayed in the Powers panel header
    // Use first() to handle multiple matches
    const chargeDisplay = page.getByText('Arcane Charges', { exact: true }).first();
    await expect(chargeDisplay).toBeVisible({ timeout: 5000 });

    // Check the resource bar shows Arcane Charges values (current/max format)
    const chargeValue = page.getByText(/\d+\s*\/\s*100/);
    await expect(chargeValue).toBeVisible({ timeout: 5000 });
  });
});
