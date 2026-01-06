import { describe, it, expect } from 'vitest';
import { applyDamageToPlayer, applyDamageToEnemy, DamageSource, EnemyDamageSource } from '../damageUtils';
import { Player, Enemy } from '@/types/game';

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
  it('reduces player health by damage amount', () => {
    const player = createMockPlayer({
      currentStats: { ...createMockPlayer().currentStats, health: 100 },
    });
    const result = applyDamageToPlayer(player, 25, 'enemy_attack');

    expect(result.player.currentStats.health).toBe(75);
    expect(result.actualDamage).toBe(25);
    expect(result.blocked).toBe(false);
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

// ============================================================================
// applyDamageToEnemy Tests
// ============================================================================

const createMockEnemy = (overrides?: Partial<Enemy>): Enemy => ({
  id: 'test-enemy-1',
  name: 'Goblin',
  health: 100,
  maxHealth: 100,
  power: 10,
  armor: 5,
  speed: 8,
  experienceReward: 50,
  goldReward: 25,
  isBoss: false,
  abilities: [],
  intent: null,
  statusEffects: [],
  statDebuffs: [],
  isShielded: false,
  shieldTurnsRemaining: 0,
  isEnraged: false,
  enrageTurnsRemaining: 0,
  isDying: false,
  isFinalBoss: false,
  modifiers: [],
  ...overrides,
});

describe('applyDamageToEnemy', () => {
  it('reduces enemy health by damage amount', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyDamageToEnemy(enemy, 25, 'hero_attack');

    expect(result.enemy.health).toBe(75);
    expect(result.actualDamage).toBe(25);
    expect(result.blocked).toBe(false);
    expect(result.killed).toBe(false);
  });

  it('blocks all damage when enemy is shielded', () => {
    const enemy = createMockEnemy({
      health: 100,
      isShielded: true,
      shieldTurnsRemaining: 2,
    });
    const result = applyDamageToEnemy(enemy, 50, 'hero_attack');

    expect(result.enemy.health).toBe(100);
    expect(result.actualDamage).toBe(0);
    expect(result.blocked).toBe(true);
    expect(result.killed).toBe(false);
    expect(result.logs.some(log => log.includes('shield blocks'))).toBe(true);
  });

  it('execute bypasses enemy shield', () => {
    const enemy = createMockEnemy({
      health: 100,
      isShielded: true,
      shieldTurnsRemaining: 2,
    });
    const result = applyDamageToEnemy(enemy, 0, 'execute');

    expect(result.enemy.health).toBe(0);
    expect(result.actualDamage).toBe(100);
    expect(result.blocked).toBe(false);
    expect(result.killed).toBe(true);
    expect(result.logs.some(log => log.includes('executed'))).toBe(true);
  });

  it('execute sets health to 0 regardless of damage parameter', () => {
    const enemy = createMockEnemy({ health: 500 });
    const result = applyDamageToEnemy(enemy, 0, 'execute');

    expect(result.enemy.health).toBe(0);
    expect(result.actualDamage).toBe(500);
    expect(result.killed).toBe(true);
  });

  it('does not reduce health below 0', () => {
    const enemy = createMockEnemy({ health: 10 });
    const result = applyDamageToEnemy(enemy, 50, 'hero_attack');

    expect(result.enemy.health).toBe(0);
    expect(result.actualDamage).toBe(10);
    expect(result.killed).toBe(true);
  });

  it('does not mutate the original enemy object', () => {
    const originalEnemy = createMockEnemy({ health: 100 });
    const originalHealth = originalEnemy.health;

    applyDamageToEnemy(originalEnemy, 30, 'hero_attack');

    expect(originalEnemy.health).toBe(originalHealth);
  });

  it('handles zero damage', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyDamageToEnemy(enemy, 0, 'hero_attack');

    expect(result.enemy.health).toBe(100);
    expect(result.actualDamage).toBe(0);
    expect(result.killed).toBe(false);
    expect(result.logs).toHaveLength(0);
  });

  it('returns killed=true when health reaches 0', () => {
    const enemy = createMockEnemy({ health: 25 });
    const result = applyDamageToEnemy(enemy, 25, 'power');

    expect(result.enemy.health).toBe(0);
    expect(result.killed).toBe(true);
  });

  it('generates status_effect log with specific message', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyDamageToEnemy(enemy, 10, 'status_effect');

    expect(result.logs[0]).toBe('Goblin takes 10 damage from status effect!');
  });

  it('generates reflect log with specific message', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyDamageToEnemy(enemy, 15, 'reflect');

    expect(result.logs[0]).toBe('Goblin takes 15 reflected damage!');
  });

  it('generates standard log for hero_attack', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyDamageToEnemy(enemy, 20, 'hero_attack');

    expect(result.logs[0]).toBe('Goblin takes 20 damage!');
  });

  it('generates standard log for power damage', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyDamageToEnemy(enemy, 30, 'power');

    expect(result.logs[0]).toBe('Goblin takes 30 damage!');
  });

  it('generates standard log for path_ability damage', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyDamageToEnemy(enemy, 25, 'path_ability');

    expect(result.logs[0]).toBe('Goblin takes 25 damage!');
  });

  it('handles all damage source types', () => {
    const sources: EnemyDamageSource[] = ['hero_attack', 'power', 'status_effect', 'reflect', 'path_ability', 'execute'];

    sources.forEach(source => {
      const enemy = createMockEnemy({ health: 100 });
      const result = applyDamageToEnemy(enemy, 10, source);

      if (source === 'execute') {
        expect(result.killed).toBe(true);
      } else {
        expect(result.enemy.health).toBe(90);
      }
    });
  });

  it('preserves enemy properties when applying damage', () => {
    const enemy = createMockEnemy({
      health: 100,
      name: 'Orc Warrior',
      isBoss: true,
      isEnraged: true,
      enrageTurnsRemaining: 3,
    });
    const result = applyDamageToEnemy(enemy, 20, 'hero_attack');

    expect(result.enemy.name).toBe('Orc Warrior');
    expect(result.enemy.isBoss).toBe(true);
    expect(result.enemy.isEnraged).toBe(true);
    expect(result.enemy.enrageTurnsRemaining).toBe(3);
  });
});
