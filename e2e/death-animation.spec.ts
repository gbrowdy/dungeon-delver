import { test, expect } from '@playwright/test';
import { navigateToGame, selectClassAndBegin, setSpeedToMax } from './helpers/game-actions';

test.describe('Death Animation', () => {
  test('enemy sprite shows data-dying attribute during death animation', async ({ page }) => {
    // Use moderate damage so we can catch the animation
    await navigateToGame(page, 'devMode=true&playerAttack=100');

    // Start as warrior
    await selectClassAndBegin(page, 'Warrior');

    // Speed up combat for faster test
    await setSpeedToMax(page);

    // Wait for enemy to appear
    await page.waitForSelector('[data-testid="enemy-sprite"]', { timeout: 10000 });

    // Poll for the enemy sprite to have data-dying="true"
    const foundDeathAnimation = await page.evaluate(() => {
      return new Promise<{ found: boolean; log: string[] }>((resolve) => {
        const log: string[] = [];
        let found = false;
        let checks = 0;
        const maxChecks = 600; // 30 seconds at 50ms intervals

        const checkInterval = setInterval(() => {
          checks++;

          // Look for enemy sprite with dying state
          const enemySprite = document.querySelector('[data-testid="enemy-sprite"]');

          if (enemySprite) {
            const dyingAttr = enemySprite.getAttribute('data-dying');
            if (dyingAttr === 'true') {
              log.push(`Found dying enemy at check ${checks}`);
              found = true;
              clearInterval(checkInterval);
              resolve({ found: true, log });
              return;
            }
          }

          // Stop after floor complete (we missed it)
          const floorComplete = document.body.textContent?.includes('Complete');
          if (floorComplete && checks > 50) {
            log.push(`Floor complete at check ${checks}, dying found: ${found}`);
            clearInterval(checkInterval);
            resolve({ found, log });
            return;
          }

          if (checks >= maxChecks) {
            clearInterval(checkInterval);
            resolve({ found, log });
          }
        }, 50);
      });
    });

    console.log('Death animation result:', foundDeathAnimation);
    expect(foundDeathAnimation.found).toBe(true);
  });
});
