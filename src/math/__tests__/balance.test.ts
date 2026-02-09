// src/math/__tests__/balance.test.ts
import { describe, it, expect } from 'vitest';
import * as balance from '../balance';

describe('balance constants', () => {
  it('MIN_SPEED prevents division by zero in attack interval', () => {
    expect(balance.MIN_SPEED).toBeGreaterThan(0);
    expect(balance.ATTACK_INTERVAL_NUMERATOR / balance.MIN_SPEED).toBeLessThan(10000);
  });

  it('crit caps are above their base values', () => {
    expect(balance.CRIT_CHANCE_CAP).toBeGreaterThan(balance.CRIT_CHANCE_BASE);
    expect(balance.CRIT_DAMAGE_CAP).toBeGreaterThan(balance.CRIT_DAMAGE_BASE);
  });

  it('growth rates are positive and ordered', () => {
    expect(balance.GROWTH_RATES.hp).toBeGreaterThan(balance.GROWTH_RATES.power);
    expect(balance.GROWTH_RATES.power).toBeGreaterThan(balance.GROWTH_RATES.fortitude);
    expect(balance.GROWTH_RATES.fortitude).toBeGreaterThan(balance.GROWTH_RATES.speed);
  });

  it('enrage threshold is reasonable (30-120 seconds)', () => {
    expect(balance.ENRAGE_THRESHOLD_MS).toBeGreaterThanOrEqual(30_000);
    expect(balance.ENRAGE_THRESHOLD_MS).toBeLessThanOrEqual(120_000);
  });

  it('tick timing is compatible with 60fps', () => {
    expect(balance.TICK_MS).toBe(16);
  });

  it('boss floor schedule makes sense', () => {
    expect(balance.FIRST_BOSS_FLOOR).toBeLessThanOrEqual(5);
    expect(balance.BOSS_INTERVAL).toBeGreaterThanOrEqual(3);
  });

  it('player starts with positive stats', () => {
    expect(balance.PLAYER_BASE_HP).toBeGreaterThan(0);
    expect(balance.PLAYER_BASE_POWER).toBeGreaterThan(0);
    expect(balance.PLAYER_BASE_FORTITUDE).toBeGreaterThan(0);
    expect(balance.PLAYER_BASE_SPEED).toBeGreaterThanOrEqual(balance.MIN_SPEED);
    expect(balance.PLAYER_BASE_LUCK).toBeGreaterThanOrEqual(0);
  });

  it('endless mode starts after final boss', () => {
    expect(balance.ENDLESS_START_FLOOR).toBe(balance.FINAL_BOSS_FLOOR + 1);
  });
});
