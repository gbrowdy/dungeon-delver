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
    const warrior = GENERIC_STARTING_POWERS.warrior;
    const mage = GENERIC_STARTING_POWERS.mage;

    expect(warrior.name).toBe('Strike');
    expect(mage.name).toBe('Zap');
    expect(warrior.value).toBe(mage.value);
    expect(warrior.cooldown).toBe(mage.cooldown);
    expect(warrior.manaCost).toBe(mage.manaCost);
  });

  it('should return correct power for class', () => {
    const power = getStartingPower('warrior');
    expect(power.name).toBe('Strike');
    expect(power.manaCost).toBe(15);
    expect(power.cooldown).toBe(3);
    expect(power.value).toBe(1.2);
  });
});
