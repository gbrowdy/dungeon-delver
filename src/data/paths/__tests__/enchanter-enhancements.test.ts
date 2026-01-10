import { describe, it, expect } from 'vitest';
import {
  ARCANE_SURGE_PATH_ENHANCEMENTS,
  HEX_VEIL_PATH_ENHANCEMENTS,
  getEnchanterEnhancement,
  getEnchanterEnhancementChoices,
  getEnchanterEnhancementById,
} from '../enchanter-enhancements';

describe('Enchanter Enhancements', () => {
  describe('enhancement definitions', () => {
    it('should have 13 Arcane Surge enhancements', () => {
      expect(ARCANE_SURGE_PATH_ENHANCEMENTS).toHaveLength(13);
    });

    it('should have 13 Hex Veil enhancements', () => {
      expect(HEX_VEIL_PATH_ENHANCEMENTS).toHaveLength(13);
    });

    it('should have correct tier numbers', () => {
      for (let i = 0; i < 13; i++) {
        expect(ARCANE_SURGE_PATH_ENHANCEMENTS[i].tier).toBe(i + 1);
        expect(HEX_VEIL_PATH_ENHANCEMENTS[i].tier).toBe(i + 1);
      }
    });

    it('should have correct stanceIds', () => {
      for (const e of ARCANE_SURGE_PATH_ENHANCEMENTS) {
        expect(e.stanceId).toBe('arcane_surge');
      }
      for (const e of HEX_VEIL_PATH_ENHANCEMENTS) {
        expect(e.stanceId).toBe('hex_veil');
      }
    });
  });

  describe('getEnchanterEnhancement', () => {
    it('should return correct tier for arcane_surge', () => {
      const e = getEnchanterEnhancement('arcane_surge', 1);
      expect(e?.name).toBe('Searing Touch');
    });

    it('should return correct tier for hex_veil', () => {
      const e = getEnchanterEnhancement('hex_veil', 13);
      expect(e?.name).toBe('Master Hexer');
    });

    it('should return undefined for invalid tier', () => {
      expect(getEnchanterEnhancement('arcane_surge', 14)).toBeUndefined();
    });
  });

  describe('getEnchanterEnhancementChoices', () => {
    it('should return next tier choices', () => {
      const choices = getEnchanterEnhancementChoices(0, 0);
      expect(choices.arcaneSurge?.tier).toBe(1);
      expect(choices.hexVeil?.tier).toBe(1);
    });
  });

  describe('getEnchanterEnhancementById', () => {
    it('should find enhancement by id', () => {
      const e = getEnchanterEnhancementById('hex_veil_13_master_hexer');
      expect(e?.name).toBe('Master Hexer');
    });

    it('should return undefined for invalid id', () => {
      expect(getEnchanterEnhancementById('invalid')).toBeUndefined();
    });
  });
});
