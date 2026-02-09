// src/math/__tests__/stats.test.ts
import { describe, it, expect } from 'vitest';
import {
  getMaxHp,
  getAttackInterval,
  getCritChance,
  getCritDamage,
  getDodgeChance,
} from '../stats';

describe('getMaxHp', () => {
  it('returns base + fortitude * 5', () => {
    expect(getMaxHp(50, 10)).toBe(100); // 50 + 10*5
  });

  it('handles zero fortitude', () => {
    expect(getMaxHp(50, 0)).toBe(50);
  });

  it('handles large fortitude values', () => {
    expect(getMaxHp(100, 1000)).toBe(5100); // 100 + 1000*5
  });
});

describe('getAttackInterval', () => {
  it('returns 2500ms at speed 10', () => {
    expect(getAttackInterval(10)).toBe(2500); // 25000/10
  });

  it('returns 1250ms at speed 20', () => {
    expect(getAttackInterval(20)).toBe(1250); // 25000/20
  });

  it('clamps to minimum speed of 3', () => {
    expect(getAttackInterval(0)).toBe(getAttackInterval(3));
    expect(getAttackInterval(1)).toBe(getAttackInterval(3));
    expect(getAttackInterval(2)).toBe(getAttackInterval(3));
  });

  it('minimum speed gives ~8333ms interval', () => {
    expect(getAttackInterval(3)).toBe(8333);
  });

  it('handles high speed (diminishing returns visible)', () => {
    const diff10to20 = getAttackInterval(10) - getAttackInterval(20);
    const diff100to110 = getAttackInterval(100) - getAttackInterval(110);
    expect(diff10to20).toBeGreaterThan(diff100to110 * 10);
  });
});

describe('getCritChance', () => {
  it('returns 5% base at luck 0', () => {
    expect(getCritChance(0)).toBeCloseTo(0.05);
  });

  it('scales linearly: 25% at luck 10', () => {
    expect(getCritChance(10)).toBeCloseTo(0.25);
  });

  it('hard caps at 60%', () => {
    expect(getCritChance(100)).toBe(0.60);
    expect(getCritChance(1000)).toBe(0.60);
  });

  it('hits cap at luck 28', () => {
    expect(getCritChance(28)).toBe(0.60);
  });
});

describe('getCritDamage', () => {
  it('returns 1.5x at luck 0', () => {
    expect(getCritDamage(0)).toBe(1.5);
  });

  it('scales with luck: 1.9x at luck 10', () => {
    expect(getCritDamage(10)).toBeCloseTo(1.9);
  });

  it('caps at 2.5x', () => {
    expect(getCritDamage(25)).toBe(2.5);
    expect(getCritDamage(1000)).toBe(2.5);
  });
});

describe('getDodgeChance', () => {
  it('returns 0% at luck 0', () => {
    expect(getDodgeChance(0)).toBe(0);
  });

  it('scales with luck: 8% at luck 10', () => {
    expect(getDodgeChance(10)).toBeCloseTo(0.08);
  });

  it('caps at 30%', () => {
    expect(getDodgeChance(100)).toBe(0.30);
    expect(getDodgeChance(1000)).toBe(0.30);
  });
});
