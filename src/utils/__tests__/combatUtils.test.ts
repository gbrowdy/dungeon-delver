import { describe, it, expect } from 'vitest';
import { applyPathTriggerToEnemy } from '../combatUtils';
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
