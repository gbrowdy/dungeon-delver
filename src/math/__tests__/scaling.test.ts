// src/math/__tests__/scaling.test.ts
import { describe, it, expect } from 'vitest';
import { getGrowthMultiplier, getDraftPickValue, getRoomsPerFloor, getBossHpMultiplier } from '../scaling';

describe('getGrowthMultiplier', () => {
  it('returns 1 at floor 1', () => {
    expect(getGrowthMultiplier(1, 0.065)).toBe(1);
  });

  it('returns 1 at floor 0 (edge case)', () => {
    expect(getGrowthMultiplier(0, 0.065)).toBe(1);
  });

  it('grows exponentially before floor 100', () => {
    const floor50 = getGrowthMultiplier(50, 0.065);
    const floor51 = getGrowthMultiplier(51, 0.065);
    expect(floor51 / floor50).toBeCloseTo(1.065, 2);
  });

  it('at floor 100, matches pure exponential', () => {
    const expected = Math.pow(1.065, 99);
    expect(getGrowthMultiplier(100, 0.065)).toBeCloseTo(expected, 0);
  });

  it('grows slower after floor 100 (damping kicks in)', () => {
    const rate100to101 = getGrowthMultiplier(101, 0.065) / getGrowthMultiplier(100, 0.065);
    const rate50to51 = getGrowthMultiplier(51, 0.065) / getGrowthMultiplier(50, 0.065);
    expect(rate100to101).toBeLessThan(rate50to51);
  });

  it('stays within safe integer range at floor 50000', () => {
    const val = getGrowthMultiplier(50000, 0.065);
    expect(val).toBeLessThan(Number.MAX_SAFE_INTEGER);
    expect(val).toBeGreaterThan(0);
    expect(Number.isFinite(val)).toBe(true);
  });

  it('works with different growth rates', () => {
    const hp = getGrowthMultiplier(50, 0.065);
    const power = getGrowthMultiplier(50, 0.058);
    const fort = getGrowthMultiplier(50, 0.050);
    const speed = getGrowthMultiplier(50, 0.020);
    expect(hp).toBeGreaterThan(power);
    expect(power).toBeGreaterThan(fort);
    expect(fort).toBeGreaterThan(speed);
  });
});

describe('getDraftPickValue', () => {
  it('returns flat 1 or 2 for speed at any floor', () => {
    for (let i = 0; i < 20; i++) {
      const val = getDraftPickValue(1, 'speed');
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(2);
    }
    for (let i = 0; i < 20; i++) {
      const val = getDraftPickValue(100, 'speed');
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(2);
    }
  });

  it('returns flat 1 or 2 for luck at any floor', () => {
    for (let i = 0; i < 20; i++) {
      const val = getDraftPickValue(100, 'luck');
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(2);
    }
  });

  it('returns positive values for power at floor 1', () => {
    for (let i = 0; i < 10; i++) {
      const val = getDraftPickValue(1, 'power');
      expect(val).toBeGreaterThanOrEqual(1);
    }
  });

  it('power picks scale with floor depth', () => {
    let sum1 = 0;
    let sum100 = 0;
    const samples = 50;
    for (let i = 0; i < samples; i++) {
      sum1 += getDraftPickValue(1, 'power');
      sum100 += getDraftPickValue(100, 'power');
    }
    expect(sum100 / samples).toBeGreaterThan((sum1 / samples) * 2);
  });

  it('fortitude picks also scale with floor depth', () => {
    let sum1 = 0;
    let sum100 = 0;
    const samples = 50;
    for (let i = 0; i < samples; i++) {
      sum1 += getDraftPickValue(1, 'fortitude');
      sum100 += getDraftPickValue(100, 'fortitude');
    }
    expect(sum100 / samples).toBeGreaterThan((sum1 / samples) * 2);
  });

  it('floor 100 power picks are approximately ~27 (design doc reference)', () => {
    let sum = 0;
    const samples = 100;
    for (let i = 0; i < samples; i++) {
      sum += getDraftPickValue(100, 'power');
    }
    const avg = sum / samples;
    expect(avg).toBeGreaterThan(20);
    expect(avg).toBeLessThan(35);
  });
});

describe('getRoomsPerFloor', () => {
  it('returns 2 for floors 1 and 2', () => {
    expect(getRoomsPerFloor(1)).toBe(2);
    expect(getRoomsPerFloor(2)).toBe(2);
  });

  it('returns 4 for floor 3', () => {
    expect(getRoomsPerFloor(3)).toBe(4);
  });

  it('returns 4 for floor 49', () => {
    expect(getRoomsPerFloor(49)).toBe(4);
  });

  it('returns 5 for floor 50 (gains 1 room per 50 floors)', () => {
    expect(getRoomsPerFloor(50)).toBe(5);
  });

  it('returns 6 for floor 100', () => {
    expect(getRoomsPerFloor(100)).toBe(6);
  });

  it('keeps growing past 100', () => {
    expect(getRoomsPerFloor(150)).toBe(7);
  });
});

describe('getBossHpMultiplier', () => {
  it('returns 2.5 at floor 1', () => {
    expect(getBossHpMultiplier(1)).toBeCloseTo(2.505);
  });

  it('scales with floor', () => {
    expect(getBossHpMultiplier(100)).toBeCloseTo(3.0);
  });

  it('reaches 7.5 at floor 1000', () => {
    expect(getBossHpMultiplier(1000)).toBeCloseTo(7.5);
  });
});
