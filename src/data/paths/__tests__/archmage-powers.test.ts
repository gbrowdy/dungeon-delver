import { describe, it, expect } from 'vitest';
import {
  ARCHMAGE_POWERS,
  getArchmagePowerChoices,
  getArchmageSubpathPower,
  getArchmagePowerUpgrade,
} from '../archmage-powers';

describe('Archmage Powers', () => {
  describe('power definitions', () => {
    it('should have 8 powers defined', () => {
      expect(Object.keys(ARCHMAGE_POWERS)).toHaveLength(8);
    });

    it('should have valid resource costs for gain-type resource', () => {
      for (const power of Object.values(ARCHMAGE_POWERS)) {
        expect(power.resourceCost).toBeGreaterThanOrEqual(0);
        expect(power.resourceCost).toBeLessThanOrEqual(100);
      }
    });

    it('should have upgrades for all powers', () => {
      for (const power of Object.values(ARCHMAGE_POWERS)) {
        expect(power.upgrades).toHaveLength(2);
        expect(power.upgrades[0].tier).toBe(1);
        expect(power.upgrades[1].tier).toBe(2);
      }
    });
  });

  describe('getArchmagePowerChoices', () => {
    it('should return 2 choices for level 2', () => {
      const choices = getArchmagePowerChoices(2);
      expect(choices).toHaveLength(2);
      expect(choices[0].id).toBe('arcane_bolt');
      expect(choices[1].id).toBe('meteor_strike');
    });

    it('should return 2 choices for level 4', () => {
      const choices = getArchmagePowerChoices(4);
      expect(choices).toHaveLength(2);
      expect(choices[0].id).toBe('arcane_empowerment');
      expect(choices[1].id).toBe('arcane_weakness');
    });

    it('should return 2 choices for level 6', () => {
      const choices = getArchmagePowerChoices(6);
      expect(choices).toHaveLength(2);
      expect(choices[0].id).toBe('siphon_soul');
      expect(choices[1].id).toBe('arcane_surge_power');
    });

    it('should return empty array for invalid levels', () => {
      expect(getArchmagePowerChoices(3)).toHaveLength(0);
      expect(getArchmagePowerChoices(8)).toHaveLength(0);
    });
  });

  describe('getArchmageSubpathPower', () => {
    it('should return Spellstorm for battlemage', () => {
      const power = getArchmageSubpathPower('battlemage');
      expect(power?.id).toBe('spellstorm');
    });

    it('should return Annihilate for destroyer', () => {
      const power = getArchmageSubpathPower('destroyer');
      expect(power?.id).toBe('annihilate');
    });

    it('should return undefined for invalid subpath', () => {
      expect(getArchmageSubpathPower('invalid')).toBeUndefined();
    });
  });

  describe('getArchmagePowerUpgrade', () => {
    it('should return T1 upgrade', () => {
      const upgrade = getArchmagePowerUpgrade('arcane_bolt', 1);
      expect(upgrade?.tier).toBe(1);
      expect(upgrade?.value).toBe(1.8);
    });

    it('should return T2 upgrade', () => {
      const upgrade = getArchmagePowerUpgrade('arcane_bolt', 2);
      expect(upgrade?.tier).toBe(2);
      expect(upgrade?.cooldown).toBe(3);
    });

    it('should return undefined for invalid tier', () => {
      expect(getArchmagePowerUpgrade('arcane_bolt', 0)).toBeUndefined();
      expect(getArchmagePowerUpgrade('arcane_bolt', 3)).toBeUndefined();
    });

    it('should return undefined for invalid power', () => {
      expect(getArchmagePowerUpgrade('invalid_power', 1)).toBeUndefined();
    });
  });
});
