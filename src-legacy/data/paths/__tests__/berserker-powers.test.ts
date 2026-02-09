import { describe, it, expect } from 'vitest';
import {
  BERSERKER_POWERS,
  getBerserkerPowerChoices,
  getBerserkerSubpathPower,
  getBerserkerPowerUpgrade
} from '../berserker-powers';

describe('Berserker Powers', () => {
  describe('Power definitions', () => {
    it('should have all 8 powers defined', () => {
      expect(Object.keys(BERSERKER_POWERS)).toHaveLength(8);
    });

    it('should have level 2 power choices', () => {
      const choices = getBerserkerPowerChoices(2);
      expect(choices).toHaveLength(2);
      expect(choices[0].id).toBe('rage_strike');
      expect(choices[1].id).toBe('savage_slam');
    });

    it('should have level 4 power choices', () => {
      const choices = getBerserkerPowerChoices(4);
      expect(choices).toHaveLength(2);
      expect(choices[0].id).toBe('berserker_roar');
      expect(choices[1].id).toBe('reckless_charge');
    });

    it('should have level 6 power choices', () => {
      const choices = getBerserkerPowerChoices(6);
      expect(choices).toHaveLength(2);
      expect(choices[0].id).toBe('bloodthirst');
      expect(choices[1].id).toBe('unstoppable_force');
    });

    it('should return empty array for non-power levels', () => {
      expect(getBerserkerPowerChoices(3)).toHaveLength(0);
      expect(getBerserkerPowerChoices(5)).toHaveLength(0);
    });
  });

  describe('Subpath powers', () => {
    it('should return warcry for warlord subpath', () => {
      const power = getBerserkerSubpathPower('warlord');
      expect(power?.id).toBe('warcry');
    });

    it('should return death_sentence for executioner subpath', () => {
      const power = getBerserkerSubpathPower('executioner');
      expect(power?.id).toBe('death_sentence');
    });
  });

  describe('Power upgrades', () => {
    it('should return T1 upgrade for rage_strike', () => {
      const upgrade = getBerserkerPowerUpgrade('rage_strike', 1);
      expect(upgrade).toBeDefined();
      expect(upgrade?.tier).toBe(1);
    });

    it('should return T2 upgrade for rage_strike', () => {
      const upgrade = getBerserkerPowerUpgrade('rage_strike', 2);
      expect(upgrade).toBeDefined();
      expect(upgrade?.tier).toBe(2);
    });

    it('should return undefined for invalid tier', () => {
      expect(getBerserkerPowerUpgrade('rage_strike', 0)).toBeUndefined();
      expect(getBerserkerPowerUpgrade('rage_strike', 3)).toBeUndefined();
    });

    it('should return undefined for invalid power', () => {
      expect(getBerserkerPowerUpgrade('invalid_power', 1)).toBeUndefined();
    });
  });
});
