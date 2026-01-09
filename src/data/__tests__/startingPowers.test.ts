import { describe, it, expect } from 'vitest';
import { GENERIC_STARTING_POWERS, getStartingPower } from '../startingPowers';

describe('Generic Starting Powers', () => {
  it('should have a starting power for each class', () => {
    expect(GENERIC_STARTING_POWERS.warrior).toBeDefined();
    expect(GENERIC_STARTING_POWERS.mage).toBeDefined();
    expect(GENERIC_STARTING_POWERS.rogue).toBeDefined();
    expect(GENERIC_STARTING_POWERS.paladin).toBeDefined();
  });

  it('should have identical stats but different names', () => {
    const classes = ['warrior', 'mage', 'rogue', 'paladin'] as const;
    const powers = classes.map((c) => GENERIC_STARTING_POWERS[c]);

    // Verify unique names
    expect(powers[0].name).toBe('Strike');
    expect(powers[1].name).toBe('Zap');
    expect(powers[2].name).toBe('Slash');
    expect(powers[3].name).toBe('Smite');

    // Verify all stats are identical across all classes
    const baseStats = {
      resourceCost: powers[0].resourceCost,
      cooldown: powers[0].cooldown,
      value: powers[0].value,
      effect: powers[0].effect,
      category: powers[0].category,
      upgradeLevel: powers[0].upgradeLevel,
    };

    powers.forEach((power, i) => {
      expect(power.resourceCost).toBe(baseStats.resourceCost);
      expect(power.cooldown).toBe(baseStats.cooldown);
      expect(power.value).toBe(baseStats.value);
      expect(power.effect).toBe(baseStats.effect);
      expect(power.category).toBe(baseStats.category);
      expect(power.upgradeLevel).toBe(baseStats.upgradeLevel);
    });
  });

  it('should return correct power for class', () => {
    const power = getStartingPower('warrior');
    expect(power.name).toBe('Strike');
    expect(power.resourceCost).toBe(15);
    expect(power.cooldown).toBe(3);
    expect(power.value).toBe(1.2);
  });

  it('should return a copy (modifying returned power should not affect original)', () => {
    const power1 = getStartingPower('warrior');
    const power2 = getStartingPower('warrior');

    // Modify the first copy
    power1.resourceCost = 999;
    power1.cooldown = 999;

    // Second copy should be unaffected
    expect(power2.resourceCost).toBe(15);
    expect(power2.cooldown).toBe(3);

    // Original should also be unaffected
    expect(GENERIC_STARTING_POWERS.warrior.resourceCost).toBe(15);
    expect(GENERIC_STARTING_POWERS.warrior.cooldown).toBe(3);
  });
});
