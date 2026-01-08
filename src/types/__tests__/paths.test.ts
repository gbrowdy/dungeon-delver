import type { PassiveEffect, PassiveStatType, PassiveCondition } from '../paths';

describe('PassiveEffect types', () => {
  it('should allow stat_percent effect', () => {
    const effect: PassiveEffect = {
      type: 'stat_percent',
      stat: 'armor',
      value: 20,
    };
    expect(effect.type).toBe('stat_percent');
  });

  it('should allow conditional effects', () => {
    const condition: PassiveCondition = { type: 'hp_below_percent', value: 30 };
    const effect: PassiveEffect = {
      type: 'stat_percent_when',
      stat: 'armor',
      value: 50,
      condition,
    };
    expect(effect.condition.type).toBe('hp_below_percent');
  });
});
