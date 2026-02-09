import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSpeedMultiplier, speedToInterval } from '../speedUtils';

// Mock the feature flags module
vi.mock('@/constants/features', () => ({
  isFeatureEnabled: vi.fn(),
}));

import { isFeatureEnabled } from '@/constants/features';
const mockIsFeatureEnabled = vi.mocked(isFeatureEnabled);

describe('speedUtils', () => {
  beforeEach(() => {
    // Default: feature flags disabled (legacy behavior)
    mockIsFeatureEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Legacy Behavior Tests (Feature Flag Disabled)
  // ============================================
  describe('Legacy: getSpeedMultiplier with sqrt scaling', () => {
    it('should return 1.0x at base speed 10', () => {
      expect(getSpeedMultiplier(10)).toBeCloseTo(1.0);
    });

    it('should use sqrt scaling for speed values', () => {
      // Speed 15: sqrt(15/10) = sqrt(1.5) ≈ 1.22
      expect(getSpeedMultiplier(15)).toBeCloseTo(Math.sqrt(1.5));

      // Speed 7: sqrt(7/10) = sqrt(0.7) ≈ 0.84
      expect(getSpeedMultiplier(7)).toBeCloseTo(Math.sqrt(0.7));

      // Speed 25: sqrt(25/10) = sqrt(2.5) ≈ 1.58
      expect(getSpeedMultiplier(25)).toBeCloseTo(Math.sqrt(2.5));
    });

    it('should clamp speed to valid range (1-50)', () => {
      // Speed 0 should be treated as 1
      expect(getSpeedMultiplier(0)).toBeCloseTo(Math.sqrt(1 / 10));

      // Speed -5 should be treated as 1
      expect(getSpeedMultiplier(-5)).toBeCloseTo(Math.sqrt(1 / 10));

      // Speed 100 should be treated as 50
      expect(getSpeedMultiplier(100)).toBeCloseTo(Math.sqrt(50 / 10));
    });
  });

  describe('Legacy: speedToInterval', () => {
    it('should return base interval at speed 10', () => {
      const baseInterval = 2500;
      // Speed 10 = 1.0x multiplier, so interval = 2500 / 1.0 = 2500
      expect(speedToInterval(10, baseInterval)).toBe(2500);
    });

    it('should return lower interval for higher speed', () => {
      const baseInterval = 2500;
      // Speed 15 = sqrt(1.5) ≈ 1.22x, interval ≈ 2041
      const interval = speedToInterval(15, baseInterval);
      expect(interval).toBeLessThan(baseInterval);
      expect(interval).toBeCloseTo(2500 / Math.sqrt(1.5), 0);
    });

    it('should return higher interval for lower speed', () => {
      const baseInterval = 2500;
      // Speed 7 = sqrt(0.7) ≈ 0.84x, interval ≈ 2988
      const interval = speedToInterval(7, baseInterval);
      expect(interval).toBeGreaterThan(baseInterval);
    });
  });

  // ============================================
  // Phase 1: Speed Soft Cap Tests
  // ============================================
  describe('Phase 1: Speed Soft Cap', () => {
    beforeEach(() => {
      // Enable the SPEED_SOFT_CAP feature flag
      mockIsFeatureEnabled.mockImplementation((flag) => flag === 'SPEED_SOFT_CAP');
    });

    describe('getSpeedMultiplier with soft cap', () => {
      it('should return linear scaling up to speed 12', () => {
        // Speed 1-12: Linear (speed / 10)
        expect(getSpeedMultiplier(1)).toBeCloseTo(0.1);
        expect(getSpeedMultiplier(5)).toBeCloseTo(0.5);
        expect(getSpeedMultiplier(10)).toBeCloseTo(1.0);
        expect(getSpeedMultiplier(12)).toBeCloseTo(1.2);
      });

      it('should return diminished scaling above speed 12', () => {
        // After 12: 1.2 + (speed - 12) * 0.04
        // Speed 15 = 1.2 + 3 * 0.04 = 1.32
        expect(getSpeedMultiplier(15)).toBeCloseTo(1.32);

        // Speed 20 = 1.2 + 8 * 0.04 = 1.52
        expect(getSpeedMultiplier(20)).toBeCloseTo(1.52);

        // Speed 25 = 1.2 + 13 * 0.04 = 1.72
        expect(getSpeedMultiplier(25)).toBeCloseTo(1.72);
      });

      it('should have continuous scaling at the SPEED_LINEAR_CAP boundary', () => {
        // Values should be continuous around the transition point (no discontinuity)
        const atCap = getSpeedMultiplier(12);
        const slightlyAbove = getSpeedMultiplier(12.001);

        // The difference should be tiny (continuous, not jumping)
        expect(Math.abs(slightlyAbove - atCap)).toBeLessThan(0.01);

        // Verify exact boundary values
        expect(getSpeedMultiplier(11)).toBeCloseTo(1.1); // 11/10 = 1.1
        expect(getSpeedMultiplier(12)).toBeCloseTo(1.2); // 12/10 = 1.2 (at cap)
        expect(getSpeedMultiplier(13)).toBeCloseTo(1.24); // 1.2 + 1*0.04 = 1.24 (diminished)
      });

      it('should calculate correct multiplier at speed 50 (hard cap)', () => {
        // Speed 50 = 1.2 + (50-12)*0.04 = 1.2 + 1.52 = 2.72
        expect(getSpeedMultiplier(50)).toBeCloseTo(2.72);
      });

      it('should provide different scaling than legacy at high speeds', () => {
        // Compare soft cap vs legacy sqrt scaling at speed 25
        // Note: Soft cap is MORE generous than sqrt at moderate-high speeds
        mockIsFeatureEnabled.mockReturnValue(true);
        const softCapMultiplier = getSpeedMultiplier(25);

        mockIsFeatureEnabled.mockReturnValue(false);
        const legacyMultiplier = getSpeedMultiplier(25);

        // With soft cap: 1.72x (linear to 12, then +0.04/point)
        // With legacy sqrt: sqrt(2.5) ≈ 1.58x
        // Soft cap gives MORE speed at these values, but with predictable scaling
        expect(softCapMultiplier).toBeCloseTo(1.72);
        expect(legacyMultiplier).toBeCloseTo(1.58);
        expect(softCapMultiplier).toBeGreaterThan(legacyMultiplier);
      });

      it('should provide similar scaling at moderate speeds', () => {
        // At speed 15, compare both methods
        mockIsFeatureEnabled.mockReturnValue(true);
        const softCapMultiplier = getSpeedMultiplier(15);

        mockIsFeatureEnabled.mockReturnValue(false);
        const legacyMultiplier = getSpeedMultiplier(15);

        // Soft cap: 1.32x, Legacy sqrt: 1.22x
        expect(softCapMultiplier).toBeCloseTo(1.32);
        expect(legacyMultiplier).toBeCloseTo(1.22);
      });

      it('should clamp speed to valid range (1-50)', () => {
        expect(getSpeedMultiplier(0)).toBeCloseTo(0.1); // Treated as 1
        expect(getSpeedMultiplier(-5)).toBeCloseTo(0.1); // Treated as 1
        expect(getSpeedMultiplier(100)).toBeCloseTo(1.2 + 38 * 0.04); // Treated as 50
      });
    });

    describe('speedToInterval with soft cap', () => {
      it('should return base interval at speed 10', () => {
        const baseInterval = 2500;
        expect(speedToInterval(10, baseInterval)).toBe(2500);
      });

      it('should calculate correct intervals with soft cap', () => {
        const baseInterval = 2500;

        // Speed 12 = 1.2x, interval = 2500 / 1.2 ≈ 2083
        expect(speedToInterval(12, baseInterval)).toBe(Math.floor(2500 / 1.2));

        // Speed 15 = 1.32x, interval = 2500 / 1.32 ≈ 1893
        expect(speedToInterval(15, baseInterval)).toBe(Math.floor(2500 / 1.32));

        // Speed 25 = 1.72x, interval = 2500 / 1.72 ≈ 1453
        expect(speedToInterval(25, baseInterval)).toBe(Math.floor(2500 / 1.72));
      });
    });

    describe('Attack speed comparison', () => {
      it('should demonstrate diminished returns at high speed stacking', () => {
        const baseInterval = 2500;

        // Compare attack rate increase from 10 → 15 vs 20 → 25
        const rate10 = 1000 / speedToInterval(10, baseInterval); // attacks/second
        const rate15 = 1000 / speedToInterval(15, baseInterval);
        const rate20 = 1000 / speedToInterval(20, baseInterval);
        const rate25 = 1000 / speedToInterval(25, baseInterval);

        // First 5 speed points (10→15) should give bigger boost than later 5 (20→25)
        const earlyGain = rate15 - rate10;
        const lateGain = rate25 - rate20;

        expect(lateGain).toBeLessThan(earlyGain);
      });
    });
  });

  // ============================================
  // Integration: Character Speed Scenarios
  // ============================================
  describe('Integration scenarios', () => {
    beforeEach(() => {
      mockIsFeatureEnabled.mockReturnValue(true); // Enable soft cap
    });

    it('should calculate intervals for typical class speeds', () => {
      const baseInterval = 2500;

      // Warrior: 8 speed (below cap, linear)
      const warriorInterval = speedToInterval(8, baseInterval);
      expect(warriorInterval).toBe(Math.floor(2500 / 0.8)); // 3125ms

      // Rogue: 14 speed (above cap, diminished)
      const rogueInterval = speedToInterval(14, baseInterval);
      expect(rogueInterval).toBe(Math.floor(2500 / 1.28)); // ~1953ms

      // Paladin: 7 speed (below cap, linear)
      const paladinInterval = speedToInterval(7, baseInterval);
      expect(paladinInterval).toBe(Math.floor(2500 / 0.7)); // 3571ms
    });

    it('should calculate intervals for stacked speed builds', () => {
      const baseInterval = 2500;

      // Rogue with speed gear: 25 speed
      const stackedInterval = speedToInterval(25, baseInterval);
      expect(stackedInterval).toBe(Math.floor(2500 / 1.72)); // ~1453ms

      // This is slower than linear would give: 2500 / 2.5 = 1000ms
      // Demonstrating the soft cap working
      const linearWouldBe = 2500 / 2.5;
      expect(stackedInterval).toBeGreaterThan(linearWouldBe);
    });
  });

  // ============================================
  // Edge Cases: NaN and Infinity Handling
  // ============================================
  describe('NaN and Infinity handling', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should return safe defaults for NaN speed input', () => {
      // NaN speed should default to BASE_SPEED (10), giving multiplier of 1.0
      expect(getSpeedMultiplier(NaN)).toBeCloseTo(1.0);
    });

    it('should return safe defaults for Infinity speed input', () => {
      expect(getSpeedMultiplier(Infinity)).toBeCloseTo(1.0);
      expect(getSpeedMultiplier(-Infinity)).toBeCloseTo(1.0);
    });

    it('should return safe interval for NaN baseInterval', () => {
      // NaN baseInterval defaults to 2500, speed 10 = 1.0x, so interval = 2500
      expect(speedToInterval(10, NaN)).toBe(2500);
    });

    it('should enforce minimum interval of 100ms', () => {
      // Even with extremely high speed, interval should not go below 100ms
      const interval = speedToInterval(50, 100);
      expect(interval).toBeGreaterThanOrEqual(100);
    });

    it('should log errors for invalid inputs', () => {
      getSpeedMultiplier(NaN);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CRITICAL] getSpeedMultiplier received invalid value')
      );

      speedToInterval(10, NaN);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CRITICAL] speedToInterval received invalid value')
      );
    });
  });
});
