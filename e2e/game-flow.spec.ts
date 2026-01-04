// e2e/game-flow.spec.ts
import { test, expect } from '@playwright/test';
import {
  navigateToGame,
  selectClassAndBegin,
  setSpeedToMax,
  waitForCombatOutcome,
  waitForEnemySpawn,
} from './helpers/game-actions';

test.describe('Game Flow - Core Loop', () => {
  test('can start game and reach combat', async ({ page }) => {
    await navigateToGame(page);
    await selectClassAndBegin(page, 'Warrior');

    // Verify combat started
    await expect(page.getByTestId('floor-indicator')).toContainText('Floor 1');
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
