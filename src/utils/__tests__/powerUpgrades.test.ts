// src/utils/__tests__/powerUpgrades.test.ts
import { describe, it, expect } from 'vitest';
import {
  getPowerUpgradeTier,
  computeEffectivePower,
  computeAllEffectivePowers,
} from '../powerUpgrades';
import type { Entity } from '@/ecs/components';
import type { Power } from '@/types/game';

// Mock base power matching berserker-powers.ts RAGE_STRIKE
const mockBasePower: Power = {
  id: 'rage_strike',
  name: 'Rage Strike',
  description: 'Deal 200% damage. +50% damage if below 50% HP.',
  icon: 'power-rage_strike',
  resourceCost: 30,
  cooldown: 5,
  effect: 'damage',
  value: 2.0,
  category: 'strike',
  synergies: [],
  hpThreshold: 0.5,
  bonusMultiplier: 0.5,
};

// Mock entity with no upgrades
const mockEntityTier0: Entity = {
  powers: [mockBasePower],
  pathProgression: {
    pathId: 'berserker',
    pathType: 'active',
    powerUpgrades: [{ powerId: 'rage_strike', currentTier: 0 }],
  },
};

// Mock entity at tier 1
const mockEntityTier1: Entity = {
  powers: [mockBasePower],
  pathProgression: {
    pathId: 'berserker',
    pathType: 'active',
    powerUpgrades: [{ powerId: 'rage_strike', currentTier: 1 }],
  },
};

// Mock entity at tier 2
const mockEntityTier2: Entity = {
  powers: [mockBasePower],
  pathProgression: {
    pathId: 'berserker',
    pathType: 'active',
    powerUpgrades: [{ powerId: 'rage_strike', currentTier: 2 }],
  },
};

describe('getPowerUpgradeTier', () => {
  it('returns 0 when no pathProgression', () => {
    const entity: Entity = { powers: [mockBasePower] };
    expect(getPowerUpgradeTier(entity, 'rage_strike')).toBe(0);
  });

  it('returns 0 when power not in upgrades list', () => {
    expect(getPowerUpgradeTier(mockEntityTier1, 'unknown_power')).toBe(0);
  });

  it('returns correct tier from pathProgression', () => {
    expect(getPowerUpgradeTier(mockEntityTier0, 'rage_strike')).toBe(0);
    expect(getPowerUpgradeTier(mockEntityTier1, 'rage_strike')).toBe(1);
    expect(getPowerUpgradeTier(mockEntityTier2, 'rage_strike')).toBe(2);
  });
});

describe('computeEffectivePower', () => {
  it('returns base power unchanged at tier 0', () => {
    const effective = computeEffectivePower(mockEntityTier0, mockBasePower);
    expect(effective.value).toBe(2.0);
    expect(effective.cooldown).toBe(5);
  });

  it('merges tier 1 upgrades', () => {
    const effective = computeEffectivePower(mockEntityTier1, mockBasePower);
    // Tier 1 for rage_strike: value: 2.4, damageThreshold: 60
    expect(effective.value).toBe(2.4);
  });

  it('merges tier 2 upgrades cumulatively on top of tier 1', () => {
    const effective = computeEffectivePower(mockEntityTier2, mockBasePower);
    // Tier 1: value: 2.4
    // Tier 2: guaranteedCrit: true (doesn't override value, so stays 2.4)
    expect(effective.value).toBe(2.4);
    expect(effective.guaranteedCrit).toBe(true);
  });

  it('preserves base power properties not in upgrade', () => {
    const effective = computeEffectivePower(mockEntityTier1, mockBasePower);
    expect(effective.id).toBe('rage_strike');
    expect(effective.name).toBe('Rage Strike');
    expect(effective.effect).toBe('damage');
    expect(effective.category).toBe('strike');
  });
});

describe('computeAllEffectivePowers', () => {
  it('returns empty array when no powers', () => {
    const entity: Entity = {};
    expect(computeAllEffectivePowers(entity)).toEqual([]);
  });

  it('computes effective stats for all powers', () => {
    const effective = computeAllEffectivePowers(mockEntityTier1);
    expect(effective).toHaveLength(1);
    expect(effective[0].value).toBe(2.4);
  });
});
