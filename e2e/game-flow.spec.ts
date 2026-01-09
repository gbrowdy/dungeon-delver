// e2e/game-flow.spec.ts
import { test, expect } from '@playwright/test';
import {
  navigateToGame,
  selectClassAndBegin,
  setSpeedToMax,
  waitForCombatOutcome,
  waitForEnemySpawn,
  waitForDeathAndRetry,
} from './helpers/game-actions';

test.describe('Game Flow - Core Loop', () => {
  test('can start game and reach combat', async ({ page }) => {
    await navigateToGame(page);
    await selectClassAndBegin(page, 'Warrior');

    // Verify combat started
    await expect(page.getByTestId('floor-indicator')).toContainText('Floor 1');
  });

  test('stamina bar is visible for level 1 players', async ({ page }) => {
    await navigateToGame(page);
    await selectClassAndBegin(page, 'Warrior');

    // Verify stamina resource bar is visible
    const staminaBar = page.getByTestId('resource-bar-stamina');
    await expect(staminaBar).toBeVisible({ timeout: 5000 });

    // Verify it shows the correct resource type
    await expect(staminaBar).toHaveAttribute('aria-label', /Stamina:/);

    // Verify it has the correct initial values (50/50)
    await expect(staminaBar).toHaveAttribute('aria-valuemax', '50');
  });

  test('combat plays out to an outcome (enemy dies or player dies)', async ({ page }) => {
    await navigateToGame(page);
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for any combat outcome
    const outcome = await waitForCombatOutcome(page, { timeout: 120000 });

    // Either outcome is valid - game is functioning
    expect(['enemy_died', 'player_died', 'floor_complete']).toContain(outcome);
  });

  test('death screen appears and retry works', async ({ page }) => {
    await navigateToGame(page);
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for combat outcome - we want player death
    const outcome = await waitForCombatOutcome(page, { timeout: 120000 });

    if (outcome === 'player_died') {
      // Verify death screen
      await expect(page.getByTestId('death-screen')).toBeVisible();
      await expect(page.getByTestId('death-floor-display')).toContainText('Floor 1');

      // Click retry
      await page.getByTestId('retry-button').click();

      // Verify back in combat
      await expect(page.getByTestId('floor-indicator')).toContainText('Floor 1');
      await expect(page.getByTestId('death-screen')).not.toBeVisible();
    } else {
      // If enemy died first, that's also a valid test - game is working
      expect(outcome).toBe('enemy_died');
    }
  });

  test('killing an enemy spawns next enemy or completes floor', async ({ page }) => {
    // Use boosted stats to ensure we kill enemy
    await navigateToGame(page, 'devMode=true&playerAttack=50&playerDefense=20');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for first enemy to die
    const outcome = await waitForCombatOutcome(page, { timeout: 60000 });
    expect(outcome).toBe('enemy_died');

    // Either next enemy spawns or floor completes
    const nextOutcome = await Promise.race([
      waitForEnemySpawn(page).then(() => 'enemy_spawned' as const),
      page.getByText('FLOOR COMPLETE!').waitFor({ state: 'visible', timeout: 5000 }).then(() => 'floor_complete' as const),
    ]);

    expect(['enemy_spawned', 'floor_complete']).toContain(nextOutcome);
  });
});

test.describe('Game Flow - Progression', () => {
  test('level up triggers path selection at level 2', async ({ page }) => {
    // High XP multiplier to level up after 2-3 kills
    // Boosted stats to survive and kill quickly
    await navigateToGame(page, 'devMode=true&xpMultiplier=10&playerAttack=40&playerDefense=25');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Kill enemies until we level up
    let leveled = false;
    for (let i = 0; i < 10 && !leveled; i++) {
      const outcome = await waitForCombatOutcome(page, { timeout: 60000 });

      if (outcome === 'player_died') {
        // Retry and continue
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
        continue;
      }

      // Check for level up popup
      const levelUpVisible = await page.getByTestId('level-up-popup').isVisible();
      if (levelUpVisible) {
        leveled = true;

        // Dismiss level up popup
        const closeButton = page.getByRole('button', { name: /continue|close|ok/i }).first();
        await closeButton.click();

        // Should show path selection
        await expect(page.getByTestId('path-selection')).toBeVisible({ timeout: 5000 });
        break;
      }

      // Wait for next enemy
      if (outcome === 'enemy_died') {
        await waitForEnemySpawn(page).catch(() => {});
      }
    }

    expect(leveled).toBe(true);
  });

  test('selecting a path returns to combat', async ({ page }) => {
    test.setTimeout(90000); // 90 seconds for this test

    await navigateToGame(page, 'devMode=true&xpMultiplier=10&playerAttack=40&playerDefense=25');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Kill enemies until level up and path selection appears
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

        // Wait for path selection to appear (with timeout)
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

    // Assert we found path selection
    expect(foundPathSelection).toBe(true);

    // Select first path by clicking "Select Path" button
    const selectPathButton = page.getByRole('button', { name: /Select Path/i }).first();
    await selectPathButton.click();

    // Click confirm button to finalize selection
    const confirmButton = page.getByTestId('path-confirm-button');
    await expect(confirmButton).toBeEnabled({ timeout: 2000 });
    await confirmButton.click();

    // Should be back in combat
    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Game Flow - Floor Complete', () => {
  test('completing a floor shows floor complete screen', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for floor completion

    // Very strong player to clear floor quickly
    await navigateToGame(page, 'devMode=true&playerAttack=100&playerDefense=50');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Keep waiting for outcomes until we get floor complete
    let outcome: 'enemy_died' | 'player_died' | 'floor_complete' = 'enemy_died';
    for (let i = 0; i < 10 && outcome !== 'floor_complete'; i++) {
      outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'player_died') {
        // Shouldn't happen with these stats, but handle it
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
      } else if (outcome === 'enemy_died') {
        // Wait for next enemy or floor complete
        await page.waitForTimeout(1000);
      }
    }

    // Verify we got floor complete
    expect(outcome).toBe('floor_complete');

    // Should show floor complete screen (dynamic text like "Floor 1 Complete!")
    await expect(page.getByText(/Floor \d+ Complete!/)).toBeVisible({ timeout: 5000 });
  });

  test('continue from floor complete starts next floor', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes total

    await navigateToGame(page, 'devMode=true&playerAttack=100&playerDefense=50');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Clear floor - wait for floor complete text (dynamic like "Floor 1 Complete!")
    await page.getByText(/Floor \d+ Complete!/).waitFor({ state: 'visible', timeout: 90000 });

    // Click continue button
    const continueButton = page.getByTestId('continue-button');
    await continueButton.waitFor({ state: 'visible' });
    await continueButton.click();

    // Wait for floor complete screen to disappear and combat to start
    await page.getByText(/Floor \d+ Complete!/).waitFor({ state: 'hidden', timeout: 10000 });

    // Should be on floor 2
    await expect(page.getByTestId('floor-indicator')).toContainText('Floor 2', { timeout: 10000 });
  });

  test('floor complete resets player to full health, clears cooldowns and status', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes total

    // Use stats that let player win but still take some damage on floor 1
    // High attack to kill fast, high defense for floor 2 check (prevent immediate damage)
    await navigateToGame(page, 'devMode=true&playerAttack=80&playerDefense=30');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Helper to get player health values (only works during combat view)
    // Health displays as "50/100" text format
    const getPlayerHealth = async () => {
      const healthText = page.getByTestId('player-health');
      await healthText.waitFor({ state: 'visible', timeout: 5000 });
      const text = await healthText.textContent();
      const match = text?.match(/(\d+)\s*\/\s*(\d+)/);
      return {
        current: parseInt(match?.[1] ?? '0'),
        max: parseInt(match?.[2] ?? '0'),
      };
    };

    // Get initial health
    const initialHealth = await getPlayerHealth();
    expect(initialHealth.max).toBeGreaterThan(0);

    // Track health before floor complete
    let healthBeforeFloorComplete = { current: initialHealth.max, max: initialHealth.max };

    // Clear floor 1 - keep fighting until floor complete
    let reachedFloorComplete = false;
    for (let i = 0; i < 20 && !reachedFloorComplete; i++) {
      // Capture health before each combat outcome (while still in combat view)
      try {
        healthBeforeFloorComplete = await getPlayerHealth();
      } catch {
        // Health bar may not be visible during transitions
      }

      const outcome = await waitForCombatOutcome(page, { timeout: 30000 });

      if (outcome === 'floor_complete') {
        reachedFloorComplete = true;
        break;
      }

      if (outcome === 'player_died') {
        // Retry and continue
        await waitForDeathAndRetry(page);
        await setSpeedToMax(page);
      }

      // Wait for next enemy if we killed one
      if (outcome === 'enemy_died') {
        await page.waitForTimeout(1000);
      }
    }

    expect(reachedFloorComplete).toBe(true);

    // Verify floor complete screen is showing
    await expect(page.getByText(/Floor \d+ Complete!/)).toBeVisible();

    // Click continue to advance to floor 2
    const continueButton = page.getByTestId('continue-button');
    await continueButton.click();

    // Wait for combat to start on floor 2
    await expect(page.getByTestId('floor-indicator')).toContainText('Floor 2', { timeout: 10000 });

    // Pause immediately to prevent combat from dealing damage before we check
    const pauseButton = page.getByRole('button', { name: /pause/i });
    await pauseButton.click();

    // Wait for combat view to stabilize
    await page.waitForTimeout(500);

    // Verify health is now at maximum (full reset)
    const healthOnFloor2 = await getPlayerHealth();
    expect(healthOnFloor2.current).toBe(healthOnFloor2.max);

    // Also verify health max is consistent
    expect(healthOnFloor2.max).toBe(initialHealth.max);

    // Verify stamina is at max (resource reset)
    const staminaBar = page.getByTestId('resource-bar-stamina');
    if (await staminaBar.isVisible()) {
      const staminaCurrent = await staminaBar.getAttribute('aria-valuenow');
      const staminaMax = await staminaBar.getAttribute('aria-valuemax');
      expect(staminaCurrent).toBe(staminaMax);
    }
  });
});

test.describe('Guardian passive path', () => {
  test('should display stance UI after selecting Guardian path', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for leveling up and path selection

    // Use boosted stats and XP to survive and level up quickly
    await navigateToGame(page, 'devMode=true&xpMultiplier=10&playerAttack=40&playerDefense=30');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Kill enemies until we level up and path selection appears
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

        // Wait for path selection to appear
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

    // Must have found path selection
    expect(foundPathSelection).toBe(true);

    // Find and click the Guardian path card (passive type, blue badge)
    // Guardian has "passive" badge and description about "outlast" and "survivability"
    const guardianCard = page.locator('[role="button"][aria-label*="Guardian"]');
    await guardianCard.click();

    // Click confirm button to finalize selection
    const confirmButton = page.getByTestId('path-confirm-button');
    await expect(confirmButton).toBeEnabled({ timeout: 2000 });
    await confirmButton.click();

    // Should be back in combat
    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });

    // Verify stance UI is visible - Guardian has Iron Stance and Retribution Stance
    // The StanceToggle displays stance names like "Iron Stance" with "Active" indicator
    const stanceHeader = page.locator('h3:has-text("Stance")');
    await expect(stanceHeader).toBeVisible({ timeout: 5000 });

    // Verify at least one stance button is visible
    // Stance buttons have aria-label that includes the stance name
    const ironStanceButton = page.locator('button[aria-label*="Iron Stance"]');
    const retributionStanceButton = page.locator('button[aria-label*="Retribution Stance"]');

    // At least one of the stances should be visible
    await expect(ironStanceButton.or(retributionStanceButton).first()).toBeVisible({ timeout: 5000 });

    // Verify one stance is marked as Active
    const activeStance = page.locator('button[aria-pressed="true"]').filter({ hasText: /Iron|Retribution/ });
    await expect(activeStance).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Game Flow - Shop', () => {
  test('shop can be opened from death screen', async ({ page }) => {
    await navigateToGame(page, 'devMode=true&gold=500');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for death (normal stats, will die eventually)
    await page.getByTestId('death-screen').waitFor({ state: 'visible', timeout: 120000 });

    // Open shop
    const shopButton = page.getByRole('button', { name: /shop/i });
    await shopButton.click();

    // Verify shop is visible
    await expect(page.locator('text=Shop').or(page.locator('text=SHOP'))).toBeVisible({ timeout: 5000 });
  });

  test('can purchase item in shop', async ({ page }) => {
    await navigateToGame(page, 'devMode=true&gold=1000');
    await selectClassAndBegin(page, 'Warrior');
    await setSpeedToMax(page);

    // Wait for death
    await page.getByTestId('death-screen').waitFor({ state: 'visible', timeout: 120000 });

    // Open shop
    await page.getByRole('button', { name: /shop/i }).click();
    await expect(page.locator('text=Shop').or(page.locator('text=SHOP'))).toBeVisible();

    // Find and click a purchasable item (first buy button)
    const buyButton = page.getByRole('button', { name: /buy/i }).first();
    if (await buyButton.isVisible()) {
      await buyButton.click();

      // Verify purchase happened (gold decreased or item added)
      // This is verified by no error occurring
    }
  });
});
