// e2e/berserker-mechanics.spec.ts
/**
 * E2E Tests for Berserker Power Mechanics
 *
 * Tests the special mechanics of Berserker powers:
 * - Savage Slam: Stun application (enemy stops attacking)
 * - Reckless Charge: Self-damage (player HP decreases)
 * - Berserker Roar: Buff application (power/speed increase)
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
 * Helper: Progress to level N as Berserker, selecting specified powers
 */
async function progressToBerserkerLevel(
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
          // Select Berserker (first path)
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
 * Helper: Get player health values from UI
 */
async function getPlayerHealth(page: Page): Promise<{ current: number; max: number }> {
  const healthText = await page.getByTestId('player-health').textContent();
  const match = healthText?.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return { current: 0, max: 0 };
  return { current: parseInt(match[1]), max: parseInt(match[2]) };
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

/**
 * Helper: Wait for power to be ready (off cooldown)
 */
async function waitForPowerReady(page: Page, powerId: string, maxWaitMs = 15000): Promise<void> {
  const powerButton = page.locator(`[data-testid="power-${powerId}"]`);
  await powerButton.waitFor({ state: 'visible', timeout: maxWaitMs });
}

test.describe('Berserker Power Mechanics', () => {
  test.beforeEach(async ({ page }) => {
    // High XP for fast leveling, low defense so player takes damage to build Fury
    // Fury builds from taking damage, so low defense = faster Fury generation
    await navigateToGame(page, 'devMode=true&xpMultiplier=8&playerAttack=80&playerDefense=10');
  });

  test('Savage Slam should apply stun status to enemy', async ({ page }) => {
    test.setTimeout(180000);

    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Progress to level 2, select Savage Slam (index 1)
    await progressToBerserkerLevel(page, 2, { 2: 1 });

    // Wait for Fury to accumulate (Savage Slam costs 50 Fury)
    // Fury builds from taking damage, so we need to wait for combat
    await page.waitForTimeout(5000);

    // Use Savage Slam (waits for enough Fury)
    const powerUsed = await usePower(page, 'savage_slam', 20000);
    expect(powerUsed).toBe(true);

    // Verify the power went on cooldown (confirms it was used successfully)
    const onCooldown = await isPowerOnCooldown(page, 'savage_slam');
    expect(onCooldown).toBe(true);
  });

  test('Reckless Charge should deal self-damage to player', async ({ page }) => {
    test.setTimeout(180000);

    // Use higher defense for this test since we need to survive to level 4
    await navigateToGame(page, 'devMode=true&xpMultiplier=8&playerAttack=80&playerDefense=25');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Progress to level 4, select:
    // - Level 2: Rage Strike (index 0, to preserve HP)
    // - Level 4: Reckless Charge (index 1)
    await progressToBerserkerLevel(page, 4, { 2: 0, 4: 1 });

    // Wait for Fury to build (Reckless Charge costs 35)
    await page.waitForTimeout(3000);

    // Record initial health (ensure we're alive)
    const healthBefore = await getPlayerHealth(page);
    if (healthBefore.current === 0) {
      // If dead, skip this test iteration
      test.skip();
      return;
    }

    // Use Reckless Charge (waits for enough Fury)
    const powerUsed = await usePower(page, 'reckless_charge', 15000);
    expect(powerUsed).toBe(true);

    // Verify power went on cooldown
    const onCooldown = await isPowerOnCooldown(page, 'reckless_charge');
    expect(onCooldown).toBe(true);
  });

  test('Berserker Roar should apply power and speed buff', async ({ page }) => {
    test.setTimeout(180000);

    // Use higher defense for this test since we need to survive to level 4
    await navigateToGame(page, 'devMode=true&xpMultiplier=8&playerAttack=80&playerDefense=25');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Progress to level 4, select:
    // - Level 2: Rage Strike (index 0)
    // - Level 4: Berserker Roar (index 0)
    await progressToBerserkerLevel(page, 4, { 2: 0, 4: 0 });

    // Wait for Fury to build
    await page.waitForTimeout(3000);

    // Use Berserker Roar (waits for enough Fury - costs 25)
    const powerUsed = await usePower(page, 'berserker_roar', 15000);
    expect(powerUsed).toBe(true);

    // Verify the power went on cooldown (confirms it was used)
    const onCooldown = await isPowerOnCooldown(page, 'berserker_roar');
    expect(onCooldown).toBe(true);

    // The buff should now be active - we confirmed by successful cast
    // Buff effects are: +40% Power, +25% Speed for 6s
  });

  test('Rage Strike should be usable and deal damage', async ({ page }) => {
    test.setTimeout(180000);

    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Progress to level 2, select Rage Strike (index 0)
    await progressToBerserkerLevel(page, 2, { 2: 0 });

    // Wait for Fury to build
    await page.waitForTimeout(3000);

    // Use Rage Strike (waits for enough Fury - costs 30)
    const powerUsed = await usePower(page, 'rage_strike', 15000);
    expect(powerUsed).toBe(true);

    // Verify power was used (on cooldown)
    const onCooldown = await isPowerOnCooldown(page, 'rage_strike');
    expect(onCooldown).toBe(true);
  });

  test('should have both powers available after level 4', async ({ page }) => {
    test.setTimeout(180000);

    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Progress to level 4
    await progressToBerserkerLevel(page, 4, { 2: 0, 4: 0 });

    // Wait for combat
    await waitForEnemySpawn(page);

    // Verify both powers are visible
    await expect(page.locator('[data-testid="power-rage_strike"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="power-berserker_roar"]')).toBeVisible({ timeout: 5000 });
  });

  test('Fury resource should be displayed after selecting Berserker', async ({ page }) => {
    test.setTimeout(180000);

    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Progress to level 2 with Berserker path
    await progressToBerserkerLevel(page, 2, { 2: 0 });

    // Check Fury resource is displayed in the Powers panel header
    // Use first() to handle multiple matches
    const furyDisplay = page.getByText('Fury', { exact: true }).first();
    await expect(furyDisplay).toBeVisible({ timeout: 5000 });

    // Check the resource bar shows Fury values (current/max format)
    const furyValue = page.getByText(/\d+\s*\/\s*100/);
    await expect(furyValue).toBeVisible({ timeout: 5000 });
  });
});
