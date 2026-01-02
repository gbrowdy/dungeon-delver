import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyDamageToPlayer, DamageSource } from '../damageUtils';
import { Player } from '@/types/game';

// Mock isTestInvincible
vi.mock('@/hooks/useTestHooks', () => ({
  isTestInvincible: vi.fn(() => false),
}));

import { isTestInvincible } from '@/hooks/useTestHooks';

const createMockPlayer = (overrides?: Partial<Player>): Player => ({
  name: 'Test Player',
  class: 'warrior',
  level: 1,
  experience: 0,
  experienceToNext: 100,
  gold: 0,
  baseStats: {
    health: 100,
    maxHealth: 100,
    power: 10,
    armor: 5,
    speed: 10,
    mana: 50,
    maxMana: 50,
    fortune: 5,
  },
  currentStats: {
    health: 100,
    maxHealth: 100,
    power: 10,
    armor: 5,
    speed: 10,
    mana: 50,
    maxMana: 50,
    fortune: 5,
  },
  powers: [],
  inventory: [],
  equippedItems: [],
  activeBuffs: [],
  statusEffects: [],
  isBlocking: false,
  comboCount: 0,
  lastPowerUsed: null,
  isDying: false,
  path: null,
  pendingAbilityChoice: false,
  shield: 0,
  shieldMaxDuration: 0,
  shieldRemainingDuration: 0,
  usedCombatAbilities: [],
  usedFloorAbilities: [],
  enemyAttackCounter: 0,
  abilityCounters: {},
  attackModifiers: [],
  hpRegen: 0,
  ...overrides,
});

describe('applyDamageToPlayer', () => {
  beforeEach(() => {
    vi.mocked(isTestInvincible).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reduces player health by damage amount', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
    });
    const result = applyDamageToPlayer(player, 25, 'enemy_attack');

    expect(result.player.currentStats.health).toBe(75);
    expect(result.actualDamage).toBe(25);
    expect(result.blocked).toBe(false);
  });

  it('blocks all damage when test invincible', () => {
    vi.mocked(isTestInvincible).mockReturnValue(true);
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
    });
    const result = applyDamageToPlayer(player, 25, 'enemy_attack');

    expect(result.player.currentStats.health).toBe(100);
    expect(result.actualDamage).toBe(0);
    expect(result.blocked).toBe(true);
  });

  it('absorbs damage with shield first', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
      shield: 20,
      shieldRemainingDuration: 2,
    });
    const result = applyDamageToPlayer(player, 25, 'enemy_attack');

    expect(result.shieldAbsorbed).toBe(20);
    expect(result.actualDamage).toBe(5);
    expect(result.player.currentStats.health).toBe(95);
    expect(result.player.shield).toBe(0);
  });

  it('bypasses shield for hp_cost source', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
      shield: 20,
      shieldRemainingDuration: 2,
    });
    const result = applyDamageToPlayer(player, 10, 'hp_cost');

    expect(result.shieldAbsorbed).toBe(0);
    expect(result.actualDamage).toBe(10);
    expect(result.player.currentStats.health).toBe(90);
    expect(result.player.shield).toBe(20); // Shield unchanged
  });

  it('does not reduce health below 0', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 10 },
    });
    const result = applyDamageToPlayer(player, 50, 'enemy_attack');

    expect(result.player.currentStats.health).toBe(0);
    expect(result.actualDamage).toBe(10); // Only actual damage dealt
  });

  it('clears shield duration when shield is depleted', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
      shield: 10,
      shieldRemainingDuration: 5,
      shieldMaxDuration: 10,
    });
    const result = applyDamageToPlayer(player, 15, 'enemy_attack');

    expect(result.player.shield).toBe(0);
    expect(result.player.shieldRemainingDuration).toBe(0);
    expect(result.shieldAbsorbed).toBe(10);
    expect(result.shieldBroken).toBe(true);
    expect(result.actualDamage).toBe(5);
    expect(result.player.currentStats.health).toBe(95);
  });

  it('partially absorbs damage when shield is less than damage', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
      shield: 15,
      shieldRemainingDuration: 3,
    });
    const result = applyDamageToPlayer(player, 50, 'enemy_attack');

    expect(result.shieldAbsorbed).toBe(15);
    expect(result.actualDamage).toBe(35);
    expect(result.player.currentStats.health).toBe(65);
    expect(result.player.shield).toBe(0);
  });

  it('fully absorbs damage when shield exceeds damage', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
      shield: 50,
      shieldRemainingDuration: 5,
    });
    const result = applyDamageToPlayer(player, 20, 'enemy_attack');

    expect(result.shieldAbsorbed).toBe(20);
    expect(result.shieldBroken).toBe(false);
    expect(result.actualDamage).toBe(0);
    expect(result.player.currentStats.health).toBe(100);
    expect(result.player.shield).toBe(30);
    expect(result.player.shieldRemainingDuration).toBe(5); // Duration unchanged
  });

  it('does not mutate the original player object', () => {
    const originalPlayer = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
      shield: 20,
      shieldRemainingDuration: 5,
    });
    const originalHealth = originalPlayer.currentStats.health;
    const originalShield = originalPlayer.shield;

    applyDamageToPlayer(originalPlayer, 30, 'enemy_attack');

    expect(originalPlayer.currentStats.health).toBe(originalHealth);
    expect(originalPlayer.shield).toBe(originalShield);
  });

  it('handles zero damage', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
    });
    const result = applyDamageToPlayer(player, 0, 'enemy_attack');

    expect(result.player.currentStats.health).toBe(100);
    expect(result.actualDamage).toBe(0);
    expect(result.shieldAbsorbed).toBe(0);
  });

  it('generates shield absorb log when shield absorbs damage', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
      shield: 20,
      shieldRemainingDuration: 3,
    });
    const result = applyDamageToPlayer(player, 15, 'enemy_attack');

    expect(result.logs.some(log => log.includes('Shield absorbs'))).toBe(true);
  });

  it('generates shield broken log when shield is depleted', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
      shield: 10,
      shieldRemainingDuration: 3,
    });
    const result = applyDamageToPlayer(player, 20, 'enemy_attack');

    expect(result.logs.some(log => log.includes('Shield broken'))).toBe(true);
  });

  it('handles status_effect damage source', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
      shield: 10,
      shieldRemainingDuration: 3,
    });
    const result = applyDamageToPlayer(player, 15, 'status_effect');

    // Status effects should use shield
    expect(result.shieldAbsorbed).toBe(10);
    expect(result.actualDamage).toBe(5);
  });

  it('handles reflect damage source', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
      shield: 10,
      shieldRemainingDuration: 3,
    });
    const result = applyDamageToPlayer(player, 15, 'reflect');

    // Reflect should use shield
    expect(result.shieldAbsorbed).toBe(10);
    expect(result.actualDamage).toBe(5);
  });

  it('handles enemy_ability damage source', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
      shield: 10,
      shieldRemainingDuration: 3,
    });
    const result = applyDamageToPlayer(player, 15, 'enemy_ability');

    // Enemy abilities should use shield
    expect(result.shieldAbsorbed).toBe(10);
    expect(result.actualDamage).toBe(5);
  });

  it('respects minHealth option to prevent death', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 10 },
    });
    const result = applyDamageToPlayer(player, 50, 'hp_cost', { minHealth: 1 });

    // Should floor at 1 instead of 0
    expect(result.player.currentStats.health).toBe(1);
    expect(result.actualDamage).toBe(9);
  });

  it('allows death when minHealth is 0 (default)', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 10 },
    });
    const result = applyDamageToPlayer(player, 50, 'enemy_attack');

    expect(result.player.currentStats.health).toBe(0);
  });
});
