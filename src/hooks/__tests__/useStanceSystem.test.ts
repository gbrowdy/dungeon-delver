/**
 * Unit tests for useStanceSystem hook
 *
 * Tests cover:
 * - Initial stance selection
 * - Stance switching with cooldown
 * - Cooldown tick progression
 * - getStanceModifiers returning correct effects
 * - Feature flag gating
 * - Pause behavior
 *
 * Run with: npx vitest run
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStanceSystem, calculateStanceStatModifiers, getStanceBehaviorModifiers } from '../useStanceSystem';
import type { PassiveStance, StanceEffect } from '@/types/paths';

// Mock the feature flag - use a mutable ref so we can change it in tests
let featureFlagEnabled = true;
vi.mock('@/constants/features', () => ({
  isFeatureEnabled: vi.fn((flag: string) => {
    if (flag === 'PASSIVE_STANCE_SYSTEM') return featureFlagEnabled;
    return false;
  }),
}));

// Test stance fixtures
const mockStances: PassiveStance[] = [
  {
    id: 'iron_stance',
    name: 'Iron Stance',
    description: '+25% Armor, -15% Attack Speed',
    icon: 'shield',
    effects: [
      { type: 'stat_modifier', stat: 'armor', percentBonus: 0.25 },
      { type: 'stat_modifier', stat: 'speed', percentBonus: -0.15 },
      { type: 'behavior_modifier', behavior: 'auto_block', value: 0.50 },
    ],
    switchCooldown: 5000,
  },
  {
    id: 'retribution_stance',
    name: 'Retribution Stance',
    description: '+15% Power, +10% Armor',
    icon: 'swords',
    effects: [
      { type: 'stat_modifier', stat: 'power', percentBonus: 0.15 },
      { type: 'stat_modifier', stat: 'armor', percentBonus: 0.10 },
      { type: 'behavior_modifier', behavior: 'reflect_damage', value: 0.20 },
    ],
    switchCooldown: 5000,
  },
];

describe('useStanceSystem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with the specified initial stance', () => {
      const { result } = renderHook(() =>
        useStanceSystem(mockStances, 'retribution_stance')
      );

      expect(result.current.currentStance?.id).toBe('retribution_stance');
    });

    it('should default to first stance if initial stance not specified', () => {
      const { result } = renderHook(() => useStanceSystem(mockStances));

      expect(result.current.currentStance?.id).toBe('iron_stance');
    });

    it('should default to first stance if invalid initial stance specified', () => {
      const { result } = renderHook(() =>
        useStanceSystem(mockStances, 'invalid_stance')
      );

      expect(result.current.currentStance?.id).toBe('iron_stance');
    });

    it('should have no cooldown initially', () => {
      const { result } = renderHook(() => useStanceSystem(mockStances));

      expect(result.current.cooldownRemaining).toBe(0);
      expect(result.current.canSwitchStance).toBe(true);
    });

    it('should handle empty stances array', () => {
      const { result } = renderHook(() => useStanceSystem([]));

      expect(result.current.currentStance).toBeNull();
      expect(result.current.isStanceSystemActive).toBe(false);
    });
  });

  describe('switching stances', () => {
    it('should switch to a different stance', () => {
      const { result } = renderHook(() =>
        useStanceSystem(mockStances, 'iron_stance')
      );

      act(() => {
        result.current.switchStance('retribution_stance');
      });

      expect(result.current.currentStance?.id).toBe('retribution_stance');
    });

    it('should apply cooldown after switching', () => {
      const { result } = renderHook(() =>
        useStanceSystem(mockStances, 'iron_stance')
      );

      act(() => {
        result.current.switchStance('retribution_stance');
      });

      expect(result.current.cooldownRemaining).toBe(5000);
      expect(result.current.canSwitchStance).toBe(false);
    });

    it('should not switch to the same stance', () => {
      const { result } = renderHook(() =>
        useStanceSystem(mockStances, 'iron_stance')
      );

      act(() => {
        result.current.switchStance('iron_stance');
      });

      // Should remain at 0 cooldown since no switch occurred
      expect(result.current.cooldownRemaining).toBe(0);
    });

    it('should not switch to an invalid stance', () => {
      const { result } = renderHook(() =>
        useStanceSystem(mockStances, 'iron_stance')
      );

      act(() => {
        result.current.switchStance('invalid_stance');
      });

      expect(result.current.currentStance?.id).toBe('iron_stance');
      expect(result.current.cooldownRemaining).toBe(0);
    });

    it('should not switch while on cooldown', () => {
      const { result } = renderHook(() =>
        useStanceSystem(mockStances, 'iron_stance')
      );

      // Switch to retribution
      act(() => {
        result.current.switchStance('retribution_stance');
      });

      // Try to switch back immediately
      act(() => {
        result.current.switchStance('iron_stance');
      });

      // Should still be on retribution
      expect(result.current.currentStance?.id).toBe('retribution_stance');
    });
  });

  describe('cooldown progression', () => {
    it('should decrease cooldown over time', () => {
      const { result } = renderHook(() =>
        useStanceSystem(mockStances, 'iron_stance')
      );

      act(() => {
        result.current.switchStance('retribution_stance');
      });

      expect(result.current.cooldownRemaining).toBe(5000);

      // Advance time by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should have approximately 3000ms remaining (with some tolerance for tick timing)
      expect(result.current.cooldownRemaining).toBeLessThanOrEqual(3100);
      expect(result.current.cooldownRemaining).toBeGreaterThanOrEqual(2900);
    });

    it('should allow switching after cooldown expires', () => {
      const { result } = renderHook(() =>
        useStanceSystem(mockStances, 'iron_stance')
      );

      act(() => {
        result.current.switchStance('retribution_stance');
      });

      // Advance past cooldown
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(result.current.cooldownRemaining).toBe(0);
      expect(result.current.canSwitchStance).toBe(true);

      // Should now be able to switch back
      act(() => {
        result.current.switchStance('iron_stance');
      });

      expect(result.current.currentStance?.id).toBe('iron_stance');
    });

    it('should not tick cooldown when paused', () => {
      const { result, rerender } = renderHook(
        ({ isPaused }) => useStanceSystem(mockStances, 'iron_stance', isPaused),
        { initialProps: { isPaused: false } }
      );

      act(() => {
        result.current.switchStance('retribution_stance');
      });

      const initialCooldown = result.current.cooldownRemaining;

      // Pause the game
      rerender({ isPaused: true });

      // Advance time while paused
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Cooldown should not have decreased
      expect(result.current.cooldownRemaining).toBe(initialCooldown);
    });
  });

  describe('getStanceModifiers', () => {
    it('should return empty array when no stance is active', () => {
      const { result } = renderHook(() => useStanceSystem([]));

      const modifiers = result.current.getStanceModifiers();
      expect(modifiers).toEqual([]);
    });

    it('should return effects for the current stance', () => {
      const { result } = renderHook(() =>
        useStanceSystem(mockStances, 'iron_stance')
      );

      const modifiers = result.current.getStanceModifiers();

      expect(modifiers.length).toBe(3);
      expect(modifiers[0]).toEqual({
        type: 'stat_modifier',
        stat: 'armor',
        percentBonus: 0.25,
      });
    });

    it('should update when stance changes', () => {
      const { result } = renderHook(() =>
        useStanceSystem(mockStances, 'iron_stance')
      );

      let modifiers = result.current.getStanceModifiers();
      expect(modifiers[0].stat).toBe('armor');

      act(() => {
        result.current.switchStance('retribution_stance');
      });

      modifiers = result.current.getStanceModifiers();
      expect(modifiers[0].stat).toBe('power');
    });
  });
});

describe('calculateStanceStatModifiers', () => {
  it('should aggregate flat bonuses by stat', () => {
    const effects: StanceEffect[] = [
      { type: 'stat_modifier', stat: 'armor', flatBonus: 5 },
      { type: 'stat_modifier', stat: 'armor', flatBonus: 3 },
      { type: 'stat_modifier', stat: 'power', flatBonus: 2 },
    ];

    const { flatBonuses } = calculateStanceStatModifiers(effects);

    expect(flatBonuses['armor']).toBe(8);
    expect(flatBonuses['power']).toBe(2);
  });

  it('should aggregate percent bonuses by stat', () => {
    const effects: StanceEffect[] = [
      { type: 'stat_modifier', stat: 'armor', percentBonus: 0.25 },
      { type: 'stat_modifier', stat: 'armor', percentBonus: 0.10 },
      { type: 'stat_modifier', stat: 'speed', percentBonus: -0.15 },
    ];

    const { percentBonuses } = calculateStanceStatModifiers(effects);

    expect(percentBonuses['armor']).toBe(0.35);
    expect(percentBonuses['speed']).toBe(-0.15);
  });

  it('should ignore non-stat modifiers', () => {
    const effects: StanceEffect[] = [
      { type: 'behavior_modifier', behavior: 'reflect_damage', value: 0.2 },
      { type: 'damage_modifier', damageType: 'incoming', multiplier: 0.9 },
    ];

    const { flatBonuses, percentBonuses } = calculateStanceStatModifiers(effects);

    expect(Object.keys(flatBonuses).length).toBe(0);
    expect(Object.keys(percentBonuses).length).toBe(0);
  });
});

describe('getStanceBehaviorModifiers', () => {
  it('should extract behavior modifiers correctly', () => {
    const effects: StanceEffect[] = [
      { type: 'behavior_modifier', behavior: 'reflect_damage', value: 0.20 },
      { type: 'behavior_modifier', behavior: 'lifesteal', value: 0.05 },
      { type: 'stat_modifier', stat: 'armor', percentBonus: 0.25 },
    ];

    const behaviors = getStanceBehaviorModifiers(effects);

    expect(behaviors.reflectDamage).toBe(0.20);
    expect(behaviors.lifestealPercent).toBe(0.05);
    expect(behaviors.counterAttackChance).toBe(0);
    expect(behaviors.autoBlockChance).toBe(0);
  });

  it('should aggregate multiple behaviors of the same type', () => {
    const effects: StanceEffect[] = [
      { type: 'behavior_modifier', behavior: 'reflect_damage', value: 0.10 },
      { type: 'behavior_modifier', behavior: 'reflect_damage', value: 0.15 },
    ];

    const behaviors = getStanceBehaviorModifiers(effects);

    expect(behaviors.reflectDamage).toBe(0.25);
  });

  it('should handle all behavior types', () => {
    const effects: StanceEffect[] = [
      { type: 'behavior_modifier', behavior: 'reflect_damage', value: 0.10 },
      { type: 'behavior_modifier', behavior: 'counter_attack', value: 0.25 },
      { type: 'behavior_modifier', behavior: 'auto_block', value: 0.15 },
      { type: 'behavior_modifier', behavior: 'lifesteal', value: 0.05 },
    ];

    const behaviors = getStanceBehaviorModifiers(effects);

    expect(behaviors.reflectDamage).toBe(0.10);
    expect(behaviors.counterAttackChance).toBe(0.25);
    expect(behaviors.autoBlockChance).toBe(0.15);
    expect(behaviors.lifestealPercent).toBe(0.05);
  });
});

describe('calculateStanceStatModifiers - regen bonuses', () => {
  it('should separate regen bonuses from regular percent bonuses', () => {
    const effects: StanceEffect[] = [
      { type: 'stat_modifier', stat: 'health', percentBonus: 0.50, applyTo: 'regen' },
      { type: 'stat_modifier', stat: 'armor', percentBonus: 0.25 },
    ];

    const { percentBonuses, regenBonuses } = calculateStanceStatModifiers(effects);

    expect(regenBonuses['health']).toBe(0.50);
    expect(percentBonuses['armor']).toBe(0.25);
    expect(percentBonuses['health']).toBeUndefined();
  });

  it('should aggregate multiple regen bonuses', () => {
    const effects: StanceEffect[] = [
      { type: 'stat_modifier', stat: 'health', percentBonus: 0.25, applyTo: 'regen' },
      { type: 'stat_modifier', stat: 'health', percentBonus: 0.25, applyTo: 'regen' },
    ];

    const { regenBonuses } = calculateStanceStatModifiers(effects);

    expect(regenBonuses['health']).toBe(0.50);
  });

  it('should handle effects without applyTo as regular percent bonuses', () => {
    const effects: StanceEffect[] = [
      { type: 'stat_modifier', stat: 'health', percentBonus: 0.10 },
    ];

    const { percentBonuses, regenBonuses } = calculateStanceStatModifiers(effects);

    expect(percentBonuses['health']).toBe(0.10);
    expect(regenBonuses['health']).toBeUndefined();
  });
});

describe('useStanceSystem - edge cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should not allow switching with only one stance', () => {
    const singleStance: PassiveStance[] = [mockStances[0]];
    const { result } = renderHook(() => useStanceSystem(singleStance));

    expect(result.current.canSwitchStance).toBe(false);
    expect(result.current.availableStances.length).toBe(1);
  });

  it('should resume cooldown correctly after unpausing', () => {
    const { result, rerender } = renderHook(
      ({ isPaused }) => useStanceSystem(mockStances, 'iron_stance', isPaused),
      { initialProps: { isPaused: false } }
    );

    // Switch stance to start cooldown
    act(() => {
      result.current.switchStance('retribution_stance');
    });

    expect(result.current.cooldownRemaining).toBe(5000);

    // Pause the game
    rerender({ isPaused: true });

    // Advance time while paused - cooldown should not change
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.cooldownRemaining).toBe(5000);

    // Unpause and advance time
    rerender({ isPaused: false });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should have approximately 2000ms remaining (5000 - 3000 after unpause)
    expect(result.current.cooldownRemaining).toBeLessThanOrEqual(2100);
    expect(result.current.cooldownRemaining).toBeGreaterThanOrEqual(1900);
  });
});

describe('useStanceSystem - feature flag disabled', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Disable the feature flag via the mutable ref
    featureFlagEnabled = false;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    // Re-enable the feature flag
    featureFlagEnabled = true;
  });

  it('should return inactive system when feature flag is disabled', () => {
    const { result } = renderHook(() => useStanceSystem(mockStances));

    expect(result.current.isStanceSystemActive).toBe(false);
  });

  it('should return empty modifiers when feature flag is disabled', () => {
    const { result } = renderHook(() => useStanceSystem(mockStances));

    const modifiers = result.current.getStanceModifiers();
    expect(modifiers).toEqual([]);
  });

  it('should not switch stances when feature flag is disabled', () => {
    const { result } = renderHook(() => useStanceSystem(mockStances, 'iron_stance'));

    act(() => {
      result.current.switchStance('retribution_stance');
    });

    // Should still be on iron stance (switch didn't happen)
    expect(result.current.currentStance?.id).toBe('iron_stance');
    expect(result.current.cooldownRemaining).toBe(0);
  });
});
