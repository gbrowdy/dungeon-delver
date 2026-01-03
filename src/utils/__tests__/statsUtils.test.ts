import { describe, it, expect } from 'vitest';
import { restorePlayerHealth } from '../statsUtils';
import { Player } from '@/types/game';

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
    health: 50,
    maxHealth: 100,
    power: 10,
    armor: 5,
    speed: 10,
    mana: 25,
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

describe('restorePlayerHealth', () => {
  it('restores health up to max', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 50, maxHealth: 100 },
    });
    const result = restorePlayerHealth(player, 30);

    expect(result.player.currentStats.health).toBe(80);
    expect(result.actualAmount).toBe(30);
  });

  it('caps health at maxHealth', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 90, maxHealth: 100 },
    });
    const result = restorePlayerHealth(player, 50);

    expect(result.player.currentStats.health).toBe(100);
    expect(result.actualAmount).toBe(10);
  });

  it('generates log with source when provided', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 50, maxHealth: 100 },
    });
    const result = restorePlayerHealth(player, 15, { source: 'Divine Heal' });

    expect(result.log).toBe('Divine Heal restores 15 HP');
  });

  it('generates log without source', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 50, maxHealth: 100 },
    });
    const result = restorePlayerHealth(player, 15);

    expect(result.log).toBe('Restored 15 HP');
  });

  it('notes full health in log when capped', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 95, maxHealth: 100 },
    });
    const result = restorePlayerHealth(player, 20);

    expect(result.log).toContain('(full health)');
    expect(result.actualAmount).toBe(5);
  });

  it('does not mutate the original player', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 50, maxHealth: 100 },
    });
    const originalHealth = player.currentStats.health;

    restorePlayerHealth(player, 30);

    expect(player.currentStats.health).toBe(originalHealth);
  });

  it('handles zero restoration', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100, maxHealth: 100 },
    });
    const result = restorePlayerHealth(player, 20);

    expect(result.actualAmount).toBe(0);
    expect(result.log).toContain('(full health)');
  });
});
