import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCritChance,
  getCritDamage,
  getDodgeChance,
  getDropQualityBonus,
  getProcChanceBonus,
} from '../fortuneUtils';

// Mock the feature flags module
vi.mock('@/constants/features', () => ({
  isFeatureEnabled: vi.fn(),
}));

import { isFeatureEnabled } from '@/constants/features';
const mockIsFeatureEnabled = vi.mocked(isFeatureEnabled);

describe('fortuneUtils', () => {
  beforeEach(() => {
    // Default: feature flags disabled (legacy behavior)
    mockIsFeatureEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCritChance', () => {
    it('should return 5% base crit chance with 0 fortune', () => {
      expect(getCritChance(0)).toBe(0.05);
    });

    it('should add 2% crit chance per fortune point', () => {
      expect(getCritChance(1)).toBeCloseTo(0.07); // 5% + 2%
      expect(getCritChance(5)).toBeCloseTo(0.15); // 5% + 10%
      expect(getCritChance(10)).toBeCloseTo(0.25); // 5% + 20%
    });

    it('should cap crit chance at 50%', () => {
      expect(getCritChance(25)).toBe(0.5); // Would be 55%, capped at 50%
      expect(getCritChance(50)).toBe(0.5); // Would be 105%, capped at 50%
      expect(getCritChance(100)).toBe(0.5); // Extreme case
    });

    it('should handle negative fortune gracefully', () => {
      const result = getCritChance(-5);
      expect(result).toBe(0.05); // Negative fortune clamped to 0, so returns base 5%
    });

    it('should handle decimal fortune values', () => {
      expect(getCritChance(2.5)).toBe(0.1); // 5% + 5%
      expect(getCritChance(7.5)).toBe(0.2); // 5% + 15%
    });
  });

  describe('getCritDamage', () => {
    it('should return 150% base crit damage with 0 fortune', () => {
      expect(getCritDamage(0)).toBe(1.5);
    });

    it('should add 5% crit damage per fortune point', () => {
      expect(getCritDamage(1)).toBe(1.55); // 150% + 5%
      expect(getCritDamage(5)).toBe(1.75); // 150% + 25%
      expect(getCritDamage(10)).toBe(2.0); // 150% + 50%
    });

    it('should not cap crit damage (can scale indefinitely)', () => {
      expect(getCritDamage(20)).toBe(2.5); // 150% + 100%
      expect(getCritDamage(50)).toBe(4.0); // 150% + 250%
    });

    it('should handle negative fortune gracefully', () => {
      const result = getCritDamage(-5);
      expect(result).toBe(1.5); // Negative fortune clamped to 0, so returns base 150%
    });

    it('should handle decimal fortune values', () => {
      expect(getCritDamage(2.5)).toBeCloseTo(1.625); // 150% + 12.5%
      expect(getCritDamage(7.5)).toBeCloseTo(1.875); // 150% + 37.5%
    });
  });

  describe('getDodgeChance', () => {
    it('should return 0% dodge with 0 fortune', () => {
      expect(getDodgeChance(0)).toBe(0);
    });

    it('should add 1% dodge per fortune point', () => {
      expect(getDodgeChance(1)).toBe(0.01);
      expect(getDodgeChance(5)).toBe(0.05);
      expect(getDodgeChance(10)).toBe(0.1);
      expect(getDodgeChance(20)).toBe(0.2);
    });

    it('should cap dodge chance at 25%', () => {
      expect(getDodgeChance(25)).toBe(0.25);
      expect(getDodgeChance(30)).toBe(0.25);
      expect(getDodgeChance(100)).toBe(0.25);
    });

    it('should handle negative fortune gracefully', () => {
      const result = getDodgeChance(-5);
      expect(result).toBe(0); // Negative fortune clamped to 0
    });

    it('should handle decimal fortune values', () => {
      expect(getDodgeChance(2.5)).toBe(0.025);
      expect(getDodgeChance(12.5)).toBe(0.125);
    });
  });

  describe('getDropQualityBonus', () => {
    it('should return 1.0x multiplier with 0 fortune', () => {
      expect(getDropQualityBonus(0)).toBe(1.0);
    });

    it('should add 2% quality bonus per fortune point', () => {
      expect(getDropQualityBonus(1)).toBe(1.02); // +2%
      expect(getDropQualityBonus(5)).toBe(1.1); // +10%
      expect(getDropQualityBonus(10)).toBe(1.2); // +20%
      expect(getDropQualityBonus(25)).toBe(1.5); // +50%
    });

    it('should not cap quality bonus (can scale indefinitely)', () => {
      expect(getDropQualityBonus(50)).toBe(2.0); // +100%
      expect(getDropQualityBonus(100)).toBe(3.0); // +200%
    });

    it('should handle negative fortune gracefully', () => {
      const result = getDropQualityBonus(-5);
      expect(result).toBe(1.0); // Negative fortune clamped to 0, so returns base 1.0x
    });

    it('should handle decimal fortune values', () => {
      expect(getDropQualityBonus(2.5)).toBeCloseTo(1.05); // +5%
      expect(getDropQualityBonus(7.5)).toBeCloseTo(1.15); // +15%
    });
  });

  describe('getProcChanceBonus', () => {
    it('should return 1.0x multiplier with 0 fortune', () => {
      expect(getProcChanceBonus(0)).toBe(1.0);
    });

    it('should add 1% proc bonus per fortune point', () => {
      expect(getProcChanceBonus(1)).toBe(1.01); // +1%
      expect(getProcChanceBonus(5)).toBe(1.05); // +5%
      expect(getProcChanceBonus(10)).toBe(1.1); // +10%
      expect(getProcChanceBonus(25)).toBe(1.25); // +25%
    });

    it('should not cap proc bonus (can scale indefinitely)', () => {
      expect(getProcChanceBonus(50)).toBe(1.5); // +50%
      expect(getProcChanceBonus(100)).toBe(2.0); // +100%
    });

    it('should handle negative fortune gracefully', () => {
      const result = getProcChanceBonus(-5);
      expect(result).toBe(1.0); // Negative fortune clamped to 0, so returns base 1.0x
    });

    it('should handle decimal fortune values', () => {
      expect(getProcChanceBonus(2.5)).toBeCloseTo(1.025); // +2.5%
      expect(getProcChanceBonus(7.5)).toBeCloseTo(1.075); // +7.5%
    });
  });

  describe('Integration scenarios', () => {
    it('should calculate all fortune bonuses for a typical mid-game character (15 fortune)', () => {
      const fortune = 15;

      expect(getCritChance(fortune)).toBe(0.35); // 35% crit
      expect(getCritDamage(fortune)).toBe(2.25); // 225% crit damage
      expect(getDodgeChance(fortune)).toBe(0.15); // 15% dodge
      expect(getDropQualityBonus(fortune)).toBe(1.3); // 30% better drops
      expect(getProcChanceBonus(fortune)).toBe(1.15); // 15% more procs
    });

    it('should calculate all fortune bonuses for a high-fortune build (30 fortune)', () => {
      const fortune = 30;

      expect(getCritChance(fortune)).toBe(0.5); // 50% crit (capped)
      expect(getCritDamage(fortune)).toBe(3.0); // 300% crit damage
      expect(getDodgeChance(fortune)).toBe(0.25); // 25% dodge (capped)
      expect(getDropQualityBonus(fortune)).toBe(1.6); // 60% better drops
      expect(getProcChanceBonus(fortune)).toBe(1.3); // 30% more procs
    });

    it('should calculate all fortune bonuses for a starting character (5 fortune)', () => {
      const fortune = 5;

      expect(getCritChance(fortune)).toBeCloseTo(0.15); // 15% crit
      expect(getCritDamage(fortune)).toBeCloseTo(1.75); // 175% crit damage
      expect(getDodgeChance(fortune)).toBeCloseTo(0.05); // 5% dodge
      expect(getDropQualityBonus(fortune)).toBeCloseTo(1.1); // 10% better drops
      expect(getProcChanceBonus(fortune)).toBeCloseTo(1.05); // 5% more procs
    });
  });

  // ============================================
  // Phase 1: Diminishing Returns Tests
  // ============================================
  describe('Phase 1: Fortune Diminishing Returns', () => {
    beforeEach(() => {
      // Enable the FORTUNE_DIMINISHING_RETURNS feature flag
      mockIsFeatureEnabled.mockImplementation(
        (flag) => flag === 'FORTUNE_DIMINISHING_RETURNS'
      );
    });

    describe('getCritChance with diminishing returns', () => {
      it('should return linear scaling up to 15 fortune', () => {
        expect(getCritChance(0)).toBe(0.05); // 5%
        expect(getCritChance(5)).toBeCloseTo(0.15); // 15%
        expect(getCritChance(10)).toBeCloseTo(0.25); // 25%
        expect(getCritChance(15)).toBeCloseTo(0.35); // 35%
      });

      it('should return diminished scaling above 15 fortune', () => {
        // After 15: +1% per fortune point instead of +2%
        expect(getCritChance(20)).toBeCloseTo(0.40); // 35% + 5% = 40% (was 45% with linear)
        expect(getCritChance(25)).toBeCloseTo(0.45); // 35% + 10% = 45% (was 50%+ with linear)
        expect(getCritChance(30)).toBeCloseTo(0.50); // Capped at 50%
      });

      it('should cap at 50% crit chance', () => {
        expect(getCritChance(50)).toBe(0.50);
        expect(getCritChance(100)).toBe(0.50);
      });

      it('should handle negative fortune gracefully', () => {
        expect(getCritChance(-5)).toBe(0.05);
      });
    });

    describe('getCritDamage with cap', () => {
      it('should add 4% crit damage per fortune point', () => {
        expect(getCritDamage(0)).toBe(1.5); // 150%
        expect(getCritDamage(5)).toBeCloseTo(1.7); // 150% + 20%
        expect(getCritDamage(10)).toBeCloseTo(1.9); // 150% + 40%
      });

      it('should cap at 250% crit damage', () => {
        // Cap at 250% (2.5x)
        expect(getCritDamage(25)).toBe(2.5); // 150% + 100% = 250% (capped)
        expect(getCritDamage(30)).toBe(2.5); // Still capped
        expect(getCritDamage(50)).toBe(2.5); // Still capped
      });

      it('should handle negative fortune gracefully', () => {
        expect(getCritDamage(-5)).toBe(1.5);
      });
    });

    describe('DPS impact comparison', () => {
      // Helper to calculate expected DPS multiplier from crit
      const calculateDpsFromCrit = (critChance: number, critDamage: number) => {
        return 1 + critChance * (critDamage - 1);
      };

      it('should show reduced power at high fortune compared to legacy', () => {
        // At 30 fortune with diminishing returns:
        const newCritChance = getCritChance(30); // 50%
        const newCritDamage = getCritDamage(30); // 2.5x

        // Legacy values would be: 50% crit, 3.0x damage
        // New DPS: 1 + 0.5 * 1.5 = 1.75x
        // Legacy DPS: 1 + 0.5 * 2.0 = 2.0x
        const newDps = calculateDpsFromCrit(newCritChance, newCritDamage);
        expect(newDps).toBeCloseTo(1.75);
      });

      it('should maintain similar power at low fortune', () => {
        // At 10 fortune (below diminishing threshold):
        const critChance = getCritChance(10); // 25%
        const critDamage = getCritDamage(10); // 1.9x

        // DPS: 1 + 0.25 * 0.9 = 1.225x
        const dps = calculateDpsFromCrit(critChance, critDamage);
        expect(dps).toBeCloseTo(1.225);
      });
    });
  });
});
