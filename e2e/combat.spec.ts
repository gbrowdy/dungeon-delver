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

/** Start a combat run with moderate stats via test hooks.
 *  setupRun starts paused; if startPaused is false (default), unpauses immediately. */
async function setupModerateCombat(
  page: import('@playwright/test').Page,
  { startPaused = false }: { startPaused?: boolean } = {}
) {
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
  if (!startPaused) {
    await page.evaluate(() => window.__TEST_HOOKS__?.setState({ paused: false }));
  }
}

/** Unpause combat via test hooks. */
async function unpauseCombat(page: import('@playwright/test').Page) {
  await page.evaluate(() => window.__TEST_HOOKS__?.setState({ paused: false }));
}

// ---------------------------------------------------------------------------
// 1. Health bars decrease during combat
// ---------------------------------------------------------------------------
test.describe('Combat: Health Bars', () => {
  test('enemy health decreases as player attacks', async ({ page }) => {
    await setupModerateCombat(page, { startPaused: true });

    // Record initial enemy health while paused (guaranteed accurate)
    const enemyHealthEl = page.getByTestId('enemy-health');
    await expect(enemyHealthEl).toBeVisible();

    const initialText = await enemyHealthEl.textContent();
    const initialHealth = parseHealthText(initialText);
    expect(initialHealth).not.toBeNull();
    expect(initialHealth!.current).toBe(initialHealth!.max);

    // Unpause and let combat run at max speed
    await unpauseCombat(page);
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
    await setupModerateCombat(page, { startPaused: true });

    const playerHealthEl = page.getByTestId('player-health');
    await expect(playerHealthEl).toBeVisible();

    const initialText = await playerHealthEl.textContent();
    const initialHealth = parseHealthText(initialText);
    expect(initialHealth).not.toBeNull();
    expect(initialHealth!.current).toBe(initialHealth!.max);

    // Unpause and let combat run at max speed
    await unpauseCombat(page);
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
    // Use low stats so enemies survive the observation window at 4x speed
    const setupSlowCombat = async () => {
      await navigateClean(page, 'testMode=true');
      await page.evaluate(() => {
        window.__TEST_HOOKS__?.setupRun({
          classId: 'warrior',
          floor: 1,
          stats: { power: 8, fortitude: 30, speed: 15 },
        });
      });
      await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
    };

    // ---- Run 1: 1x speed ----
    await setupSlowCombat();
    const speedButton = page.getByTestId('speed-toggle');
    await expect(speedButton).toContainText('1x');

    // Record initial enemy health while paused (accurate baseline)
    const initialText1x = await page.getByTestId('enemy-health').textContent();
    const initialHealth1x = parseHealthText(initialText1x);
    expect(initialHealth1x).not.toBeNull();

    // Unpause at 1x, wait 2 seconds
    await unpauseCombat(page);
    await page.waitForTimeout(2000);

    const afterText1x = await page.getByTestId('enemy-health').textContent();
    const afterHealth1x = parseHealthText(afterText1x);
    expect(afterHealth1x).not.toBeNull();

    const damage1x = initialHealth1x!.current - afterHealth1x!.current;

    // ---- Run 2: 4x speed ----
    await setupSlowCombat();
    await setSpeedToMax(page);

    // Record initial enemy health while paused (accurate baseline)
    const initialText4x = await page.getByTestId('enemy-health').textContent();
    const initialHealth4x = parseHealthText(initialText4x);
    expect(initialHealth4x).not.toBeNull();

    // Unpause at 4x, wait 2 seconds
    await unpauseCombat(page);
    await page.waitForTimeout(2000);

    const afterText4x = await page.getByTestId('enemy-health').textContent();
    const afterHealth4x = parseHealthText(afterText4x);
    expect(afterHealth4x).not.toBeNull();

    const damage4x = initialHealth4x!.current - afterHealth4x!.current;

    // At 4x, strictly more damage should be dealt than at 1x
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
    // Start paused so the initial enemy is still alive when we killEnemy
    await setupModerateCombat(page, { startPaused: true });

    // Record initial enemy max health
    const initialText = await page.getByTestId('enemy-health').textContent();
    const initialHealth = parseHealthText(initialText);
    expect(initialHealth).not.toBeNull();

    // Kill the enemy instantly via test hooks (works while paused)
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.killEnemy();
    });

    // Wait for a new enemy to spawn with full health.
    // killEnemy triggers handleEnemyDeath which advances the room.
    // The game stays paused, so the new enemy won't take damage.
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

    // Setup with moderate power — kills Room 1 enemy in a few hits but doesn't one-shot Room 2
    await page.evaluate(() => {
      window.__TEST_HOOKS__?.setupRun({
        classId: 'warrior',
        floor: 1,
        stats: { power: 25, fortitude: 200, speed: 50 },
      });
    });

    await expect(page.getByTestId('floor-indicator')).toBeVisible({ timeout: 5000 });
    // setupRun starts paused — unpause and speed up
    await unpauseCombat(page);
    await setSpeedToMax(page);

    // Wait for first enemy to die and Room 2 to start, then immediately pause
    // to freeze combat so we can read the new enemy's health accurately.
    await page.waitForFunction(
      () => {
        const indicator = document.querySelector('[data-testid="floor-indicator"]');
        if (!indicator) return false;
        if (indicator.textContent?.includes('Room 2')) {
          window.__TEST_HOOKS__?.setState({ paused: true });
          return true;
        }
        return false;
      },
      { timeout: 20000, polling: 100 }
    );

    // New enemy should have near-full health (paused shortly after spawn)
    const healthText = await page.getByTestId('enemy-health').textContent();
    const health = parseHealthText(healthText);
    expect(health).not.toBeNull();
    expect(health!.current).toBeGreaterThan(0);
    expect(health!.max).toBeGreaterThan(0);
    // Allow for 1-2 combat ticks of damage before pause took effect
    expect(health!.current).toBeGreaterThan(health!.max * 0.5);
  });
});
