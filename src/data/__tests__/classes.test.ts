// src/data/__tests__/classes.test.ts
import { describe, it, expect } from 'vitest';
import { CLASSES, CLASS_LIST, getStatProbabilities } from '../classes';

describe('class definitions', () => {
  it('defines exactly 3 classes', () => {
    expect(Object.keys(CLASSES)).toHaveLength(3);
    expect(CLASS_LIST).toHaveLength(3);
  });

  it('each class has valid stat weights (all positive)', () => {
    for (const cls of CLASS_LIST) {
      const w = cls.statWeights;
      expect(w.power).toBeGreaterThan(0);
      expect(w.fortitude).toBeGreaterThan(0);
      expect(w.speed).toBeGreaterThan(0);
      expect(w.luck).toBeGreaterThan(0);
    }
  });

  it('each class has an innate with id, name, and description', () => {
    for (const cls of CLASS_LIST) {
      expect(cls.innate.id).toBeTruthy();
      expect(cls.innate.name).toBeTruthy();
      expect(cls.innate.description).toBeTruthy();
    }
  });

  it('warrior favors power and fortitude equally', () => {
    const w = CLASSES.warrior.statWeights;
    expect(w.power).toBe(w.fortitude);
    expect(w.power).toBeGreaterThan(w.speed);
  });

  it('rogue favors speed and luck equally', () => {
    const w = CLASSES.rogue.statWeights;
    expect(w.speed).toBe(w.luck);
    expect(w.speed).toBeGreaterThan(w.power);
  });

  it('mage favors power and luck equally', () => {
    const w = CLASSES.mage.statWeights;
    expect(w.power).toBe(w.luck);
    expect(w.power).toBeGreaterThan(w.speed);
  });

  it('each class has a unique innate id', () => {
    const ids = CLASS_LIST.map(c => c.innate.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getStatProbabilities', () => {
  it('probabilities sum to 1', () => {
    for (const cls of CLASS_LIST) {
      const probs = getStatProbabilities(cls.id);
      const sum = probs.power + probs.fortitude + probs.speed + probs.luck;
      expect(sum).toBeCloseTo(1.0);
    }
  });

  it('warrior probabilities: power and fort each 3/8 = 0.375', () => {
    const probs = getStatProbabilities('warrior');
    expect(probs.power).toBeCloseTo(0.375);
    expect(probs.fortitude).toBeCloseTo(0.375);
    expect(probs.speed).toBeCloseTo(0.125);
    expect(probs.luck).toBeCloseTo(0.125);
  });

  it('rogue probabilities: speed and luck each 3/8 = 0.375', () => {
    const probs = getStatProbabilities('rogue');
    expect(probs.speed).toBeCloseTo(0.375);
    expect(probs.luck).toBeCloseTo(0.375);
  });

  it('throws for unknown class', () => {
    expect(() => getStatProbabilities('necromancer')).toThrow('Unknown class');
  });
});
