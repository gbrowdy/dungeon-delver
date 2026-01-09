// src/ecs/systems/__tests__/attack-timing.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { world } from '../../world';
import { AttackTimingSystem } from '../attack-timing';

describe('AttackTimingSystem', () => {
  beforeEach(() => {
    for (const entity of world.entities) {
      world.remove(entity);
    }
    // Add game state
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
    });
    // Add enemy (required for combat to proceed)
    world.add({
      enemy: { tier: 'common', name: 'Test Enemy', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      attack: { baseDamage: 10, critChance: 0, critMultiplier: 2, variance: { min: 1, max: 1 } },
      speed: { value: 10, attackInterval: 3000, accumulated: 0 },
    });
  });

  it('should accumulate time toward attack', () => {
    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5,  },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
    });

    AttackTimingSystem(16);

    expect(entity.speed?.accumulated).toBe(16);
    expect(entity.attackReady).toBeUndefined();
  });

  it('should trigger attack when interval reached', () => {
    // Mock random to avoid crit variance
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5,  },
      speed: { value: 10, attackInterval: 2500, accumulated: 2490 },
    });

    AttackTimingSystem(16); // 2490 + 16 = 2506 >= 2500

    expect(entity.attackReady).toBeDefined();
    expect(entity.attackReady?.damage).toBe(20);
    expect(entity.attackReady?.isCrit).toBe(false);

    vi.restoreAllMocks();
  });

  it('should carry over excess time', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5,  },
      speed: { value: 10, attackInterval: 2500, accumulated: 2490 },
    });

    AttackTimingSystem(16); // Triggers at 2506, carries over 6ms

    expect(entity.speed?.accumulated).toBe(6);

    vi.restoreAllMocks();
  });

  it('should not attack when stunned', () => {
    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5,  },
      speed: { value: 10, attackInterval: 2500, accumulated: 2500 },
      statusEffects: [
        { id: 'stun-1', type: 'stun', remainingTurns: 1, icon: 'stun' },
      ],
    });

    AttackTimingSystem(16);

    expect(entity.attackReady).toBeUndefined();
    expect(entity.speed?.accumulated).toBe(2500); // No accumulation when stunned
  });

  it('should not allow enemies to crit even with high critChance', () => {
    // Clear existing entities
    for (const entity of world.entities) {
      world.remove(entity);
    }

    // Add game state
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
    });

    // Add player (required for combat)
    world.add({
      player: true,
      health: { current: 100, max: 100 },
      attack: { baseDamage: 10, critChance: 0, critMultiplier: 2, variance: { min: 1, max: 1 } },
      speed: { value: 10, attackInterval: 5000, accumulated: 0 },
    });

    // Add enemy with 100% crit chance - should still NOT crit
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Test Enemy', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      attack: {
        baseDamage: 10,
        critChance: 1.0, // 100% crit chance
        critMultiplier: 3, // 3x multiplier
        variance: { min: 1, max: 1 },
      },
      speed: { value: 10, attackInterval: 1000, accumulated: 1000 }, // Ready to attack
    });

    // Mock random to return value that would trigger crit for player
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    AttackTimingSystem(16);

    // Enemy should attack but NOT crit
    expect(enemy.attackReady).toBeDefined();
    expect(enemy.attackReady?.isCrit).toBe(false);
    expect(enemy.attackReady?.damage).toBe(10); // Base damage, not 30 (crit)

    vi.restoreAllMocks();
  });
});
