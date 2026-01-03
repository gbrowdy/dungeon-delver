import { describe, it, expect } from 'vitest';
import { restorePlayerHealth, restorePlayerMana, generatePathResource } from '../statsUtils';
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

describe('restorePlayerMana', () => {
  it('restores mana up to max', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, mana: 25, maxMana: 50 },
    });
    const result = restorePlayerMana(player, 15);

    expect(result.player.currentStats.mana).toBe(40);
    expect(result.actualAmount).toBe(15);
  });

  it('caps mana at maxMana', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, mana: 45, maxMana: 50 },
    });
    const result = restorePlayerMana(player, 20);

    expect(result.player.currentStats.mana).toBe(50);
    expect(result.actualAmount).toBe(5);
  });

  it('generates log with source when provided', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, mana: 25, maxMana: 50 },
    });
    const result = restorePlayerMana(player, 10, { source: 'Mana Potion' });

    expect(result.log).toBe('Mana Potion restores 10 MP');
  });

  it('generates log without source', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, mana: 25, maxMana: 50 },
    });
    const result = restorePlayerMana(player, 10);

    expect(result.log).toBe('Restored 10 MP');
  });

  it('notes full mana in log when capped', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, mana: 48, maxMana: 50 },
    });
    const result = restorePlayerMana(player, 10);

    expect(result.log).toContain('(full mana)');
    expect(result.actualAmount).toBe(2);
  });

  it('does not mutate the original player', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, mana: 25, maxMana: 50 },
    });
    const originalMana = player.currentStats.mana;

    restorePlayerMana(player, 15);

    expect(player.currentStats.mana).toBe(originalMana);
  });
});

// Default path resource for testing - extracted to avoid recreating mock in overrides
const defaultPathResource = {
  type: 'fury' as const,
  current: 50,
  max: 100,
  color: '#ef4444',
  generation: {
    onHit: 5,
    onCrit: 10,
    onKill: 15,
    onBlock: 3,
    onDamaged: 5,
    onPowerUse: 0,
  },
};

// Mock player with path resource for testing
const createMockPlayerWithPath = (overrides?: Partial<Player>): Player => ({
  ...createMockPlayer(),
  path: {
    id: 'berserker',
    name: 'Berserker',
    description: 'Fury-based combat',
    classId: 'warrior',
    abilities: [],
    resourceType: 'fury',
  },
  pathResource: defaultPathResource,
  ...overrides,
});

describe('generatePathResource', () => {
  it('generates resource on hit', () => {
    const player = createMockPlayerWithPath();
    const result = generatePathResource(player, 'onHit');

    expect(result.player.pathResource?.current).toBe(55);
    expect(result.amountGenerated).toBe(5);
  });

  it('generates resource on crit', () => {
    const player = createMockPlayerWithPath();
    const result = generatePathResource(player, 'onCrit');

    expect(result.player.pathResource?.current).toBe(60);
    expect(result.amountGenerated).toBe(10);
  });

  it('caps resource at max', () => {
    const player = createMockPlayerWithPath({
      pathResource: { ...defaultPathResource, current: 95 },
    });
    const result = generatePathResource(player, 'onKill');

    expect(result.player.pathResource?.current).toBe(100);
    expect(result.amountGenerated).toBe(5);
  });

  it('generates log with resource name', () => {
    const player = createMockPlayerWithPath();
    const result = generatePathResource(player, 'onHit');

    expect(result.log).toBe('+5 Fury');
  });

  it('returns zero if no path resource', () => {
    const player = createMockPlayer();
    const result = generatePathResource(player, 'onHit');

    expect(result.amountGenerated).toBe(0);
    expect(result.log).toBeUndefined();
  });

  it('returns zero if generation is zero for trigger', () => {
    const player = createMockPlayerWithPath();
    const result = generatePathResource(player, 'onPowerUse');

    expect(result.amountGenerated).toBe(0);
  });

  it('does not mutate the original player', () => {
    const player = createMockPlayerWithPath();
    const originalResource = player.pathResource?.current;

    generatePathResource(player, 'onHit');

    expect(player.pathResource?.current).toBe(originalResource);
  });
});
