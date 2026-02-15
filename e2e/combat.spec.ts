// e2e/combat.spec.ts
// E2E tests for combat mechanics and visual feedback:
// health bars, damage numbers, attack bars, speed controls, pause, enemy respawn
import { test, expect } from '@playwright/test';
import {
  navigateClean,
  setSpeedToMax,
  parseHealthText,
} from './helpers/game-actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Start a combat run with moderate stats via test hooks. */
async function setupModerateCombat(page: import('@playwright/test').Page) {
  await navigateClean(page, 'testMode=true');
  await page.evaluate(() => {
    window.__TEST_HOOKS__?.setupRun({
      classId: 'warrior',
      floor: 1,
      // Moderate stats: combat takes a few seconds, neither side dies instantly
      stats: { power: 15, fortitude: 20, speed: 30 },
    });
  });
  await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
}

// ---------------------------------------------------------------------------
// 1. Health bars decrease during combat
// ---------------------------------------------------------------------------
test.describe('Combat: Health Bars', () => {
  test('enemy health decreases as player attacks', async ({ page }) => {
    await setupModerateCombat(page);

    // Record initial enemy health
    const enemyHealthEl = page.getByTestId('enemy-health');
    await expect(enemyHealthEl).toBeVisible();

    const initialText = await enemyHealthEl.textContent();
    const initialHealth = parseHealthText(initialText);
    expect(initialHealth).not.toBeNull();
    expect(initialHealth!.current).toBe(initialHealth!.max);

    // Let combat run for a few seconds at max speed
    await setSpeedToMax(page);

    // Wait until enemy health drops below max
    await page.waitForFunction(
      (maxHp: number) => {
        const el = document.querySelector('[data-testid="enemy-health"]');
        if (!el) return false;
        const match = el.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
        if (!match) return false;
        return parseInt(match[1], 10) < maxHp;
      },
      initialHealth!.max,
      { timeout: 15000, polling: 200 }
    );

    // Verify the health actually decreased
    const updatedText = await enemyHealthEl.textContent();
    const updatedHealth = parseHealthText(updatedText);
    expect(updatedHealth).not.toBeNull();
    expect(updatedHealth!.current).toBeLessThan(initialHealth!.max);
  });

  test('player health decreases when enemy attacks', async ({ page }) => {
    await setupModerateCombat(page);

    const playerHealthEl = page.getByTestId('player-health');
    await expect(playerHealthEl).toBeVisible();

    const initialText = await playerHealthEl.textContent();
    const initialHealth = parseHealthText(initialText);
    expect(initialHealth).not.toBeNull();
    expect(initialHealth!.current).toBe(initialHealth!.max);

    // Let combat run at max speed
    await setSpeedToMax(page);

    // Wait until player health drops
    await page.waitForFunction(
      (maxHp: number) => {
        const el = document.querySelector('[data-testid="player-health"]');
        if (!el) return false;
        const match = el.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
        if (!match) return false;
        return parseInt(match[1], 10) < maxHp;
      },
      initialHealth!.max,
      { timeout: 15000, polling: 200 }
    );

    const updatedText = await playerHealthEl.textContent();
    const updatedHealth = parseHealthText(updatedText);
    expect(updatedHealth).not.toBeNull();
    expect(updatedHealth!.current).toBeLessThan(initialHealth!.max);
  });
});

// ---------------------------------------------------------------------------
// 2. Floating damage numbers appear
// ---------------------------------------------------------------------------
test.describe('Combat: Damage Numbers', () => {
  test('floating damage numbers appear during combat', async ({ page }) => {
    await setupModerateCombat(page);
    await setSpeedToMax(page);

    // Floating damage numbers use the animate-damage-float class.
    // They contain text like "-123" or "CRIT! -45" or "MISS".
    // Wait for at least one to appear in the DOM.
    await page.waitForFunction(
      () => {
        const floats = document.querySelectorAll('.animate-damage-float');
        return floats.length > 0;
      },
      { timeout: 15000, polling: 200 }
    );

    // Verify the floating number elements contain numeric damage text or "MISS"
    const floatingEls = page.locator('.animate-damage-float');
    const count = await floatingEls.count();
    expect(count).toBeGreaterThan(0);

    // Check that at least one element has damage text content (number or MISS)
    let foundValidText = false;
    for (let i = 0; i < count; i++) {
      const text = await floatingEls.nth(i).textContent();
      // Damage numbers contain digits (e.g. "-42", "CRIT! -99") or "MISS"
      if (text && (/\d/.test(text) || /MISS/i.test(text))) {
        foundValidText = true;
        break;
      }
    }
    expect(foundValidText).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Attack bars fill over time
// ---------------------------------------------------------------------------
test.describe('Combat: Attack Bars', () => {
  test('attack bar fill width changes during combat', async ({ page }) => {
    await setupModerateCombat(page);

    // There should be two attack-bar-fill elements (player + enemy)
    const attackBars = page.getByTestId('attack-bar-fill');
    await expect(attackBars.first()).toBeVisible();

    // Sample widths over time to confirm they change
    const widthSamples: number[] = [];

    for (let i = 0; i < 10; i++) {
      const width = await attackBars.first().evaluate((el) => {
        const style = el.getAttribute('style') || '';
        const match = style.match(/width:\s*([\d.]+)%/);
        return match ? parseFloat(match[1]) : -1;
      });
      widthSamples.push(width);
      await page.waitForTimeout(150);
    }

    // The attack bar should not stay at the same width the entire time.
    // Collect unique widths — we should see at least 2 different values.
    const uniqueWidths = new Set(widthSamples.filter(w => w >= 0));
    expect(uniqueWidths.size).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 4. Speed controls affect combat pace
// ---------------------------------------------------------------------------
test.describe('Combat: Speed Controls', () => {
  test('combat deals more damage at 4x speed than at 1x in the same time', async ({ page }) => {
    // ---- Run 1: 1x speed ----
    await setupModerateCombat(page);
    // Ensure we're at 1x (default)
    const speedButton = page.getByTestId('speed-toggle');
    await expect(speedButton).toContainText('1x');

    // Record initial enemy health
    const initialText1x = await page.getByTestId('enemy-health').textContent();
    const initialHealth1x = parseHealthText(initialText1x);
    expect(initialHealth1x).not.toBeNull();

    // Wait 3 seconds at 1x
    await page.waitForTimeout(3000);

    const afterText1x = await page.getByTestId('enemy-health').textContent();
    const afterHealth1x = parseHealthText(afterText1x);
    expect(afterHealth1x).not.toBeNull();

    const damage1x = initialHealth1x!.current - afterHealth1x!.current;

    // ---- Run 2: 4x speed ----
    await setupModerateCombat(page);
    await setSpeedToMax(page);

    const initialText4x = await page.getByTestId('enemy-health').textContent();
    const initialHealth4x = parseHealthText(initialText4x);
    expect(initialHealth4x).not.toBeNull();

    // Wait 3 seconds at 4x
    await page.waitForTimeout(3000);

    const afterText4x = await page.getByTestId('enemy-health').textContent();
    const afterHealth4x = parseHealthText(afterText4x);
    expect(afterHealth4x).not.toBeNull();

    const damage4x = initialHealth4x!.current - afterHealth4x!.current;

    // At 4x, strictly more damage should be dealt than at 1x
    // (Allow for some variance, but 4x should deal at least more damage)
    expect(damage4x).toBeGreaterThan(damage1x);
  });
});

// ---------------------------------------------------------------------------
// 5. Pause stops combat
// ---------------------------------------------------------------------------
test.describe('Combat: Pause', () => {
  test('pausing freezes health values', async ({ page }) => {
    await setupModerateCombat(page);
    await setSpeedToMax(page);

    // Let combat run briefly so some damage has been dealt
    await page.waitForTimeout(1500);

    // Pause the game
    const pauseButton = page.getByTestId('pause-toggle');
    await pauseButton.click();
    await expect(pauseButton).toContainText('Play');

    // Record health values while paused
    const playerHealthPaused = await page.getByTestId('player-health').textContent();
    const enemyHealthPaused = await page.getByTestId('enemy-health').textContent();

    // Wait 2 seconds while paused
    await page.waitForTimeout(2000);

    // Health should not have changed
    const playerHealthAfter = await page.getByTestId('player-health').textContent();
    const enemyHealthAfter = await page.getByTestId('enemy-health').textContent();

    expect(playerHealthAfter).toBe(playerHealthPaused);
    expect(enemyHealthAfter).toBe(enemyHealthPaused);

    // Unpause and verify combat resumes (health changes again)
    await pauseButton.click();
    await expect(pauseButton).toContainText('Pause');

    // Wait for health to change after unpausing
    await page.waitForFunction(
      (frozenEnemyHealth: string) => {
        const el = document.querySelector('[data-testid="enemy-health"]');
        return el && el.textContent !== frozenEnemyHealth;
      },
      enemyHealthPaused!,
      { timeout: 10000, polling: 200 }
    );

    const enemyHealthResumed = await page.getByTestId('enemy-health').textContent();
    expect(enemyHealthResumed).not.toBe(enemyHealthPaused);
  });
});

// ---------------------------------------------------------------------------
// 6. Enemy respawns after death
// ---------------------------------------------------------------------------
test.describe('Combat: Enemy Respawn', () => {
  test('killing enemy via testHooks spawns a new enemy with full health', async ({ page }) => {
    await setupModerateCombat(page);

    // Record initial enemy max health
    const initialText = await page.getByTestId('enemy-health').textContent();
    const initialHealth = parseHealthText(initialText);
    expect(initialHealth).not.toBeNull();

    // Kill the enemy instantly via test hooks
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.killEnemy();
    });

    // Wait for a new enemy to spawn with full health.
    // The enemy health bar should reset to "current/max" where current === max.
    // It may briefly flash or transition, so we poll for a full-health enemy.
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="enemy-health"]');
        if (!el) return false;
        const match = el.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
        if (!match) return false;
        const current = parseInt(match[1], 10);
        const max = parseInt(match[2], 10);
        // New enemy has full health (current === max) and max > 0
        return current === max && max > 0;
      },
      { timeout: 15000, polling: 200 }
    );

    // Verify enemy health bar shows full health
    const newText = await page.getByTestId('enemy-health').textContent();
    const newHealth = parseHealthText(newText);
    expect(newHealth).not.toBeNull();
    expect(newHealth!.current).toBe(newHealth!.max);
    expect(newHealth!.max).toBeGreaterThan(0);
  });

  test('new enemy appears after the current one is defeated naturally', async ({ page }) => {
    await navigateClean(page, 'testMode=true');

    // Setup with very high power so we kill enemies quickly
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({
        classId: 'warrior',
        floor: 1,
        stats: { power: 500, fortitude: 200, speed: 80 },
      });
    });

    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
    await setSpeedToMax(page);

    // Wait for first enemy to die and a new one to spawn
    // The floor indicator should advance to Room 2
    await page.waitForFunction(
      () => {
        const indicator = document.querySelector('[data-testid="floor-indicator"]');
        if (!indicator) return false;
        return indicator.textContent?.includes('Room 2');
      },
      { timeout: 20000, polling: 200 }
    );

    // New enemy should have full health
    const healthText = await page.getByTestId('enemy-health').textContent();
    const health = parseHealthText(healthText);
    expect(health).not.toBeNull();
    expect(health!.current).toBe(health!.max);
    expect(health!.max).toBeGreaterThan(0);
  });
});
