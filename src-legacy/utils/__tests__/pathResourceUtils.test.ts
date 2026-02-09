import { describe, it, expect } from 'vitest';
import { getDamageMultiplier } from '../pathResourceUtils';
import type { PathResource } from '@/types/game';

describe('getDamageMultiplier', () => {
  describe('fury scaling', () => {
    const furyResource: PathResource = {
      type: 'fury',
      current: 0,
      max: 100,
      color: '#dc2626',
      resourceBehavior: 'spend',
      generation: {},
      thresholds: [
        {
          value: 1,
          effect: {
            type: 'damage_bonus',
            value: 0.005,
            description: '+0.5% power damage per Fury',
          },
        },
      ],
    };

    it('should return 1.0 at 0 fury', () => {
      const resource = { ...furyResource, current: 0 };
      expect(getDamageMultiplier(resource)).toBe(1);
    });

    it('should return 1.25 at 50 fury (+25%)', () => {
      const resource = { ...furyResource, current: 50 };
      expect(getDamageMultiplier(resource)).toBeCloseTo(1.25, 2);
    });

    it('should return 1.5 at 100 fury (+50%)', () => {
      const resource = { ...furyResource, current: 100 };
      expect(getDamageMultiplier(resource)).toBeCloseTo(1.5, 2);
    });
  });
});
