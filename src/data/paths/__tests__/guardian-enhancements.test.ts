import { describe, it, expect } from 'vitest';
import {
  IRON_PATH_ENHANCEMENTS,
  RETRIBUTION_PATH_ENHANCEMENTS,
  getGuardianEnhancement,
  getGuardianEnhancementChoices,
} from '../guardian-enhancements';

describe('Guardian Stance Enhancements', () => {
  describe('Iron Path', () => {
    it('should have 13 tiers', () => {
      expect(IRON_PATH_ENHANCEMENTS).toHaveLength(13);
    });

    it('should have tier 1 as Fortified Skin', () => {
      expect(IRON_PATH_ENHANCEMENTS[0].name).toBe('Fortified Skin');
      expect(IRON_PATH_ENHANCEMENTS[0].tier).toBe(1);
    });

    it('should have tier 13 as Immortal Bulwark', () => {
      expect(IRON_PATH_ENHANCEMENTS[12].name).toBe('Immortal Bulwark');
      expect(IRON_PATH_ENHANCEMENTS[12].tier).toBe(13);
    });
  });

  describe('Retribution Path', () => {
    it('should have 13 tiers', () => {
      expect(RETRIBUTION_PATH_ENHANCEMENTS).toHaveLength(13);
    });

    it('should have tier 1 as Sharpened Thorns', () => {
      expect(RETRIBUTION_PATH_ENHANCEMENTS[0].name).toBe('Sharpened Thorns');
    });

    it('should have tier 13 as Avatar of Punishment', () => {
      expect(RETRIBUTION_PATH_ENHANCEMENTS[12].name).toBe('Avatar of Punishment');
      expect(RETRIBUTION_PATH_ENHANCEMENTS[12].tier).toBe(13);
    });
  });

  describe('getGuardianEnhancement', () => {
    it('should return correct iron enhancement for tier', () => {
      const enhancement = getGuardianEnhancement('iron', 3);
      expect(enhancement?.name).toBe('Regenerating Bulwark');
    });

    it('should return correct retribution enhancement for tier', () => {
      const enhancement = getGuardianEnhancement('retribution', 1);
      expect(enhancement?.name).toBe('Sharpened Thorns');
    });

    it('should return undefined for invalid tier', () => {
      const enhancement = getGuardianEnhancement('iron', 14);
      expect(enhancement).toBeUndefined();
    });
  });

  describe('getGuardianEnhancementChoices', () => {
    it('should return next tier choices for both paths', () => {
      const choices = getGuardianEnhancementChoices(0, 0);
      expect(choices.iron?.tier).toBe(1);
      expect(choices.retribution?.tier).toBe(1);
    });

    it('should return undefined when path is maxed', () => {
      const choices = getGuardianEnhancementChoices(13, 5);
      expect(choices.iron).toBeUndefined();
      expect(choices.retribution?.tier).toBe(6);
    });
  });
});
