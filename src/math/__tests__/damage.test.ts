// src/math/__tests__/damage.test.ts
import { describe, it, expect } from 'vitest';
import { calculateEffectiveness, calculateDamage } from '../damage';

describe('calculateEffectiveness', () => {
  it('returns 50% when power equals fortitude', () => {
    expect(calculateEffectiveness(100, 100)).toBeCloseTo(0.5);
  });

  it('returns higher when power exceeds fortitude', () => {
    // 200 / (200 + 100) = 0.6667
    expect(calculateEffectiveness(200, 100)).toBeCloseTo(0.667, 2);
  });

  it('returns lower when fortitude exceeds power', () => {
    // 100 / (100 + 200) = 0.3333
    expect(calculateEffectiveness(100, 200)).toBeCloseTo(0.333, 2);
  });

  it('returns 1.0 when fortitude is 0 (100% effectiveness)', () => {
    expect(calculateEffectiveness(100, 0)).toBe(1);
  });

  it('returns 0 when power is 0', () => {
    expect(calculateEffectiveness(0, 100)).toBe(0);
  });

  it('returns 0 when both are 0 (no division by zero)', () => {
    expect(calculateEffectiveness(0, 0)).toBe(0);
  });

  it('stays bounded at extreme values (floor 25K+)', () => {
    const hugePower = 4_000_000_000;
    const hugeFort = 3_500_000_000;
    const result = calculateEffectiveness(hugePower, hugeFort);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
    // 4B / (4B + 3.5B) = 0.5333
    expect(result).toBeCloseTo(0.533, 2);
  });
});

describe('calculateDamage', () => {
  it('returns correct damage at equal power/fortitude with no crit', () => {
    // effectiveness = 100/(100+100) = 0.5
    // raw = 100 * 0.5 * 1.0 = 50
    const result = calculateDamage(100, 100, 1.0);
    expect(result.final).toBe(50);
    expect(result.effectiveness).toBeCloseTo(0.5);
    expect(result.isCrit).toBe(false);
  });

  it('applies crit multiplier correctly', () => {
    // effectiveness = 0.5, raw = 100 * 0.5 * 2.0 = 100
    const result = calculateDamage(100, 100, 2.0);
    expect(result.final).toBe(100);
    expect(result.isCrit).toBe(true);
  });

  it('never deals less than 1 damage', () => {
    const result = calculateDamage(1, 100_000, 1.0);
    expect(result.final).toBe(1);
  });

  it('rounds correctly', () => {
    // 80 / (80 + 100) = 0.4444
    // 80 * 0.4444 * 1.0 = 35.556 -> rounds to 36
    const result = calculateDamage(80, 100, 1.0);
    expect(result.final).toBe(36);
  });

  it('handles zero power (always minimum 1)', () => {
    const result = calculateDamage(0, 100, 1.0);
    expect(result.final).toBe(1);
  });

  it('handles zero fortitude (full damage)', () => {
    // effectiveness = 100/100 = 1.0
    // damage = 100 * 1.0 = 100
    const result = calculateDamage(100, 0, 1.0);
    expect(result.final).toBe(100);
  });
});

describe('calculateDotDamage', () => {
  it('treats defender as having half fortitude', () => {
    // Normal: 100/(100+100) = 0.5, damage = 50
    const normal = calculateDamage(100, 100, 1.0);
    // DoT: 100/(100+50) = 0.667, damage = 67
    const dot = calculateDamage(100, 100, 1.0, true);
    expect(dot.final).toBeGreaterThan(normal.final);
    expect(dot.final).toBe(67);
  });

  it('half fortitude of zero is still zero', () => {
    const dot = calculateDamage(100, 0, 1.0, true);
    expect(dot.final).toBe(100);
  });
});
