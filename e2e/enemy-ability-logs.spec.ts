// e2e/enemy-ability-logs.spec.ts

import { test, expect } from '@playwright/test';
import {
  gotoTestMode,
  startGameWithClass,
  waitForTestHooks,
  setPlayerInvincible,
  setEnemyAbilities,
  getCombatLogs,
} from './helpers/test-utils';

test.describe('Enemy Ability Log Messages', () => {
  test('triple_strike ability shows proper log message format', async ({ page }) => {
    // Navigate with test mode
    await gotoTestMode(page);

    // Start game as Warrior
    await startGameWithClass(page, 'WARRIOR');

    // Wait for test hooks
    await waitForTestHooks(page);

    // Make player invincible so we don't die
    await setPlayerInvincible(page, true);

    // Give enemy triple_strike ability with 0 cooldown so it triggers immediately
    await setEnemyAbilities(page, ['triple_strike']);

    // Wait for combat to progress and enemy to use ability
    // The ability has 40% chance, so we wait a bit
    await page.waitForTimeout(10000);

    // Get combat logs
    const logs = await getCombatLogs(page);

    // Log all messages for debugging
    console.log('=== COMBAT LOGS ===');
    logs.forEach((log, i) => console.log(`${i}: ${log}`));
    console.log('===================');

    // Check for any logs containing underscore patterns that shouldn't be there
    const badLogs = logs.filter(log =>
      log.includes('triple_strike') ||
      log.includes('ability_') ||
      log.includes('_strike') ||
      log.includes('poison_') ||
      log.includes('stun_')
    );

    if (badLogs.length > 0) {
      console.log('=== BAD LOGS FOUND ===');
      badLogs.forEach(log => console.log(log));
      console.log('======================');
    }

    // The log should use the ability name "Triple Strike", not the ID "triple_strike"
    // Fail if we find raw IDs in logs
    expect(badLogs.length).toBe(0);
  });
});
