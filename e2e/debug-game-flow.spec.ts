// e2e/debug-game-flow.spec.ts
// Temporary test to debug game flow issues

import { test, expect } from '@playwright/test';

test('debug: walk through basic game flow', async ({ page }) => {
  test.setTimeout(300000); // 5 minutes

  // Step 1: Navigate to game with low player health to trigger death faster
  console.log('Step 1: Navigate to game');
  await page.goto('/?testMode=true&playerHealth=30');
  await page.screenshot({ path: 'test-results/debug/01-main-menu.png' });

  // Step 2: Click Start Game
  console.log('Step 2: Click Start Game');
  await page.getByRole('button', { name: /start game/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/debug/02-class-select.png' });

  // Step 3: Select Warrior class
  console.log('Step 3: Select Warrior class');
  await page.locator('text=WARRIOR').first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/debug/03-warrior-selected.png' });

  // Step 4: Click Begin
  console.log('Step 4: Click Begin');
  const beginButton = page.getByRole('button', { name: /begin as/i });
  await beginButton.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/debug/04-combat-start.png' });

  // Step 5: Watch combat for a few seconds
  console.log('Step 5: Watching combat...');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/debug/05-combat-3s.png' });

  // Step 6: Check if health bars are changing
  const playerHealth = await page.getByTestId('player-health').textContent();
  const enemyHealth = await page.getByTestId('enemy-health').textContent();
  console.log(`Player health: ${playerHealth}, Enemy health: ${enemyHealth}`);

  // Step 7: Try using a power (Berserker Rage for Warrior)
  console.log('Step 7: Attempting to use power...');
  const powerButton = page.locator('[data-testid^="power-"]').first();
  if (await powerButton.isVisible()) {
    const powerText = await powerButton.textContent();
    console.log(`Found power button: ${powerText}`);
    await powerButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/debug/06-after-power.png' });
  } else {
    console.log('No power button found');
  }

  // Step 8: Check combat is progressing (block was removed from UI)
  console.log('Step 8: Verifying combat progression...');
  const playerHealthCheck = await page.getByTestId('player-health').textContent();
  const enemyHealthCheck = await page.getByTestId('enemy-health').textContent();
  console.log(`Combat check - Player: ${playerHealthCheck}, Enemy: ${enemyHealthCheck}`);
  await page.screenshot({ path: 'test-results/debug/07-combat-check.png' });

  // Step 9: Watch more combat
  console.log('Step 9: Watching more combat...');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'test-results/debug/08-combat-8s.png' });

  // Step 10: Check health again
  const playerHealth2 = await page.getByTestId('player-health').textContent();
  const enemyHealth2 = await page.getByTestId('enemy-health').textContent();
  console.log(`After 8s - Player health: ${playerHealth2}, Enemy health: ${enemyHealth2}`);

  // Step 11: Check combat log
  console.log('Step 11: Checking combat log...');
  const combatLog = page.locator('[data-testid="combat-log"]');
  if (await combatLog.isVisible()) {
    const logText = await combatLog.textContent();
    console.log(`Combat log content: ${logText?.substring(0, 200)}...`);
  }

  // Step 12: Set speed to 3x and wait for outcome
  console.log('Step 12: Setting speed to 3x...');
  const speed3Button = page.getByRole('button', { name: /3x/i });
  if (await speed3Button.isVisible()) {
    await speed3Button.click();
  }

  // Step 13: Wait for either death or floor complete (max 60s)
  console.log('Step 13: Waiting for outcome...');
  let outcome = 'unknown';
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);

    // Check for death screen (heading, not combat log text)
    const deathHeading = page.locator('h1:has-text("DEFEATED")');
    if (await deathHeading.isVisible()) {
      outcome = 'defeat';
      console.log('Player was defeated - death screen shown');
      await page.screenshot({ path: 'test-results/debug/09-defeated.png' });
      break;
    }

    // Check for floor complete
    const floorCompleteText = page.locator('text=/floor.*complete/i');
    if (await floorCompleteText.isVisible()) {
      outcome = 'floor-complete';
      console.log('Floor completed');
      await page.screenshot({ path: 'test-results/debug/09-floor-complete.png' });
      break;
    }

    // Check for victory
    const victoryText = page.locator('text=VICTORY');
    if (await victoryText.isVisible()) {
      outcome = 'victory';
      console.log('Victory!');
      await page.screenshot({ path: 'test-results/debug/09-victory.png' });
      break;
    }

    if (i % 10 === 0) {
      console.log(`Still waiting... ${i}s`);
      await page.screenshot({ path: `test-results/debug/waiting-${i}s.png` });
    }
  }

  console.log(`Outcome: ${outcome}`);

  // If defeated, test shop flow
  if (outcome === 'defeat') {
    console.log('Step 14: Testing shop flow...');

    // Click Visit Shop
    const shopButton = page.getByRole('button', { name: /visit shop/i });
    if (await shopButton.isVisible()) {
      await shopButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/debug/10-shop.png' });

      // Get current gold
      const goldText = await page.locator('text=/gold/i').first().textContent();
      console.log(`Gold in shop: ${goldText}`);

      // Try to purchase an item
      const buyButton = page.getByRole('button', { name: /buy/i }).first();
      if (await buyButton.isVisible()) {
        await buyButton.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/debug/11-after-purchase.png' });
      }

      // Check for exit/leave button
      const exitButton = page.getByRole('button', { name: /exit|leave|close/i });
      if (await exitButton.isVisible()) {
        await exitButton.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/debug/12-after-shop-exit.png' });
      }
    }

    // Try retry
    const retryButton = page.getByRole('button', { name: /retry/i });
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/debug/13-after-retry.png' });
    }
  }

  // Final state
  await page.screenshot({ path: 'test-results/debug/99-final.png' });
  console.log('Debug test complete');
});
