import { describe, it, expect } from 'vitest';
import { applyPathTriggerToEnemy, getScaledDelay } from '../combatUtils';
import { Enemy } from '@/types/game';

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

describe('applyPathTriggerToEnemy', () => {
  it('applies damage from trigger result', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyPathTriggerToEnemy(enemy, { damageAmount: 25 });
    expect(result.enemy.health).toBe(75);
    expect(result.logs.length).toBeGreaterThan(0);
  });

  it('applies reflected damage from trigger result', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyPathTriggerToEnemy(enemy, { reflectedDamage: 15 });
    expect(result.enemy.health).toBe(85);
  });

  it('applies both damage and reflected damage', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyPathTriggerToEnemy(enemy, { damageAmount: 20, reflectedDamage: 10 });
    expect(result.enemy.health).toBe(70);
  });

  it('handles empty trigger result', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyPathTriggerToEnemy(enemy, {});
    expect(result.enemy.health).toBe(100);
    expect(result.logs).toHaveLength(0);
  });

  it('does not mutate original enemy', () => {
    const enemy = createMockEnemy({ health: 100 });
    const originalHealth = enemy.health;
    applyPathTriggerToEnemy(enemy, { damageAmount: 25 });
    expect(enemy.health).toBe(originalHealth);
  });

  it('generates appropriate combat logs', () => {
    const enemy = createMockEnemy({ health: 100, name: 'Test Goblin' });
    const result = applyPathTriggerToEnemy(enemy, { damageAmount: 25 });
    expect(result.logs.some(log => log.includes('Test Goblin'))).toBe(true);
    expect(result.logs.some(log => log.includes('25'))).toBe(true);
  });

  it('handles zero damage amounts', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyPathTriggerToEnemy(enemy, { damageAmount: 0, reflectedDamage: 0 });
    expect(result.enemy.health).toBe(100);
    expect(result.logs).toHaveLength(0);
  });

  it('respects enemy shield for regular damage', () => {
    const enemy = createMockEnemy({ health: 100, isShielded: true });
    const result = applyPathTriggerToEnemy(enemy, { damageAmount: 25 });
    expect(result.enemy.health).toBe(100); // Shield blocks damage
    expect(result.logs.some(log => log.includes('shield'))).toBe(true);
  });

  it('applies reflected damage separately', () => {
    const enemy = createMockEnemy({ health: 100 });
    const result = applyPathTriggerToEnemy(enemy, { reflectedDamage: 30 });
    expect(result.enemy.health).toBe(70);
    expect(result.logs.some(log => log.includes('reflected'))).toBe(true);
  });
});

describe('getScaledDelay', () => {
  it('scales delay by combat speed 1x', () => {
    expect(getScaledDelay(1000, 1)).toBe(1000);
  });

  it('scales delay by combat speed 2x', () => {
    expect(getScaledDelay(1000, 2)).toBe(500);
  });

  it('scales delay by combat speed 3x', () => {
    expect(getScaledDelay(1000, 3)).toBe(333);
  });

  it('rounds down to integer', () => {
    expect(getScaledDelay(100, 3)).toBe(33);
  });

  it('handles typical combat delay values', () => {
    // PLAYER_HIT_DELAY is typically 200ms
    expect(getScaledDelay(200, 1)).toBe(200);
    expect(getScaledDelay(200, 2)).toBe(100);
    expect(getScaledDelay(200, 3)).toBe(66);
  });

  // Edge cases for input validation
  it('returns 0 for zero combatSpeed', () => {
    expect(getScaledDelay(1000, 0)).toBe(0);
  });

  it('returns 0 for negative combatSpeed', () => {
    expect(getScaledDelay(1000, -1)).toBe(0);
  });

  it('returns 0 for negative baseDelay', () => {
    expect(getScaledDelay(-100, 2)).toBe(0);
  });

  it('returns 0 for zero baseDelay', () => {
    expect(getScaledDelay(0, 2)).toBe(0);
  });

  it('returns 0 for Infinity combatSpeed', () => {
    expect(getScaledDelay(1000, Infinity)).toBe(0);
  });

  it('returns 0 for NaN combatSpeed', () => {
    expect(getScaledDelay(1000, NaN)).toBe(0);
  });
});
