/**
 * Unit tests for stance data definitions
 *
 * Tests cover:
 * - All passive paths have stance definitions
 * - Stance structure validation
 * - Helper function behavior
 *
 * Run with: npx vitest run
 */

import { describe, it, expect } from 'vitest';
import {
  GUARDIAN_STANCES,
  ENCHANTER_STANCES,
  DUELIST_STANCES,
  PROTECTOR_STANCES,
  PATH_STANCES,
  getStancesForPath,
  getDefaultStanceId,
  pathHasStances,
  DEFAULT_STANCE_COOLDOWN,
} from '../stances';
import type { PassiveStance } from '@/types/paths';

describe('Stance Definitions', () => {
  describe('GUARDIAN_STANCES', () => {
    it('should have exactly 2 stances', () => {
      expect(GUARDIAN_STANCES.length).toBe(2);
    });

    it('should have iron_stance and retribution_stance', () => {
      const ids = GUARDIAN_STANCES.map(s => s.id);
      expect(ids).toContain('iron_stance');
      expect(ids).toContain('retribution_stance');
    });

    it('should have valid stance structure', () => {
      GUARDIAN_STANCES.forEach(validateStanceStructure);
    });
  });

  describe('ENCHANTER_STANCES', () => {
    it('should have exactly 2 stances', () => {
      expect(ENCHANTER_STANCES.length).toBe(2);
    });

    it('should have arcane_stance and disruption_stance', () => {
      const ids = ENCHANTER_STANCES.map(s => s.id);
      expect(ids).toContain('arcane_stance');
      expect(ids).toContain('disruption_stance');
    });

    it('should have valid stance structure', () => {
      ENCHANTER_STANCES.forEach(validateStanceStructure);
    });
  });

  describe('DUELIST_STANCES', () => {
    it('should have exactly 2 stances', () => {
      expect(DUELIST_STANCES.length).toBe(2);
    });

    it('should have evasion_stance and counter_stance', () => {
      const ids = DUELIST_STANCES.map(s => s.id);
      expect(ids).toContain('evasion_stance');
      expect(ids).toContain('counter_stance');
    });

    it('should have valid stance structure', () => {
      DUELIST_STANCES.forEach(validateStanceStructure);
    });
  });

  describe('PROTECTOR_STANCES', () => {
    it('should have exactly 2 stances', () => {
      expect(PROTECTOR_STANCES.length).toBe(2);
    });

    it('should have healing_stance and bulwark_stance', () => {
      const ids = PROTECTOR_STANCES.map(s => s.id);
      expect(ids).toContain('healing_stance');
      expect(ids).toContain('bulwark_stance');
    });

    it('should have valid stance structure', () => {
      PROTECTOR_STANCES.forEach(validateStanceStructure);
    });
  });
});

describe('PATH_STANCES mapping', () => {
  it('should map guardian path to GUARDIAN_STANCES', () => {
    expect(PATH_STANCES['guardian']).toBe(GUARDIAN_STANCES);
  });

  it('should map enchanter path to ENCHANTER_STANCES', () => {
    expect(PATH_STANCES['enchanter']).toBe(ENCHANTER_STANCES);
  });

  it('should map duelist path to DUELIST_STANCES', () => {
    expect(PATH_STANCES['duelist']).toBe(DUELIST_STANCES);
  });

  it('should map paladin_protector path to PROTECTOR_STANCES', () => {
    expect(PATH_STANCES['paladin_protector']).toBe(PROTECTOR_STANCES);
  });
});

describe('getStancesForPath', () => {
  it('should return stances for known passive paths', () => {
    expect(getStancesForPath('guardian')).toBe(GUARDIAN_STANCES);
    expect(getStancesForPath('enchanter')).toBe(ENCHANTER_STANCES);
    expect(getStancesForPath('duelist')).toBe(DUELIST_STANCES);
    expect(getStancesForPath('paladin_protector')).toBe(PROTECTOR_STANCES);
  });

  it('should return empty array for unknown paths', () => {
    expect(getStancesForPath('unknown_path')).toEqual([]);
    expect(getStancesForPath('berserker')).toEqual([]);
    expect(getStancesForPath('archmage')).toEqual([]);
  });

  it('should return empty array for active paths', () => {
    expect(getStancesForPath('berserker')).toEqual([]);
    expect(getStancesForPath('archmage')).toEqual([]);
    expect(getStancesForPath('assassin')).toEqual([]);
    expect(getStancesForPath('paladin_crusader')).toEqual([]);
  });
});

describe('getDefaultStanceId', () => {
  it('should return first stance ID for passive paths', () => {
    expect(getDefaultStanceId('guardian')).toBe('iron_stance');
    expect(getDefaultStanceId('enchanter')).toBe('arcane_stance');
    expect(getDefaultStanceId('duelist')).toBe('evasion_stance');
    expect(getDefaultStanceId('paladin_protector')).toBe('healing_stance');
  });

  it('should return undefined for unknown paths', () => {
    expect(getDefaultStanceId('unknown')).toBeUndefined();
  });
});

describe('pathHasStances', () => {
  it('should return true for passive paths', () => {
    expect(pathHasStances('guardian')).toBe(true);
    expect(pathHasStances('enchanter')).toBe(true);
    expect(pathHasStances('duelist')).toBe(true);
    expect(pathHasStances('paladin_protector')).toBe(true);
  });

  it('should return false for active paths', () => {
    expect(pathHasStances('berserker')).toBe(false);
    expect(pathHasStances('archmage')).toBe(false);
    expect(pathHasStances('assassin')).toBe(false);
    expect(pathHasStances('paladin_crusader')).toBe(false);
  });

  it('should return false for unknown paths', () => {
    expect(pathHasStances('unknown')).toBe(false);
  });
});

describe('DEFAULT_STANCE_COOLDOWN', () => {
  it('should be 5000ms (5 seconds)', () => {
    expect(DEFAULT_STANCE_COOLDOWN).toBe(5000);
  });

  it('should be used by all stances', () => {
    const allStances = [
      ...GUARDIAN_STANCES,
      ...ENCHANTER_STANCES,
      ...DUELIST_STANCES,
      ...PROTECTOR_STANCES,
    ];

    allStances.forEach(stance => {
      expect(stance.switchCooldown).toBe(DEFAULT_STANCE_COOLDOWN);
    });
  });
});

describe('Passive paths have no resources', () => {
  // Per BALANCE_DESIGN.md: "Passive paths have NO powers, NO resources, and NO block."
  // Stances should not reference mana or other resource types.
  const RESOURCE_STATS = ['mana', 'maxMana'];

  it('should not reference mana in any stance effects', () => {
    const allStances = [
      ...GUARDIAN_STANCES,
      ...ENCHANTER_STANCES,
      ...DUELIST_STANCES,
      ...PROTECTOR_STANCES,
    ];

    allStances.forEach(stance => {
      stance.effects.forEach(effect => {
        if (effect.type === 'stat_modifier' && effect.stat) {
          expect(RESOURCE_STATS).not.toContain(effect.stat);
        }
      });
    });
  });

  it('should not mention mana in stance descriptions', () => {
    const allStances = [
      ...GUARDIAN_STANCES,
      ...ENCHANTER_STANCES,
      ...DUELIST_STANCES,
      ...PROTECTOR_STANCES,
    ];

    allStances.forEach(stance => {
      expect(stance.description.toLowerCase()).not.toContain('mana');
    });
  });
});

// Validation helper
function validateStanceStructure(stance: PassiveStance): void {
  // Required properties
  expect(typeof stance.id).toBe('string');
  expect(stance.id.length).toBeGreaterThan(0);

  expect(typeof stance.name).toBe('string');
  expect(stance.name.length).toBeGreaterThan(0);

  expect(typeof stance.description).toBe('string');
  expect(stance.description.length).toBeGreaterThan(0);

  expect(typeof stance.icon).toBe('string');
  expect(stance.icon.length).toBeGreaterThan(0);

  expect(Array.isArray(stance.effects)).toBe(true);
  expect(stance.effects.length).toBeGreaterThan(0);

  expect(typeof stance.switchCooldown).toBe('number');
  expect(stance.switchCooldown).toBeGreaterThan(0);

  // Validate effects
  stance.effects.forEach(effect => {
    expect(['stat_modifier', 'behavior_modifier', 'damage_modifier']).toContain(effect.type);

    if (effect.type === 'stat_modifier') {
      expect(effect.stat).toBeDefined();
      expect(
        effect.flatBonus !== undefined || effect.percentBonus !== undefined
      ).toBe(true);
    }

    if (effect.type === 'behavior_modifier') {
      expect(effect.behavior).toBeDefined();
      expect(typeof effect.value).toBe('number');
    }

    if (effect.type === 'damage_modifier') {
      expect(effect.damageType).toBeDefined();
      expect(typeof effect.multiplier).toBe('number');
    }
  });
}
