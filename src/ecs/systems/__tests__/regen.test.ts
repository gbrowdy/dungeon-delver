// src/ecs/systems/__tests__/regen.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world, clearWorld } from '../../world';
import { RegenSystem } from '../regen';

describe('RegenSystem', () => {
  beforeEach(() => {
    for (const entity of world.entities) {
      world.remove(entity);
    }
    // Add game state for combat phase and speed
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
    });
  });

  it('should accumulate time toward regen tick', () => {
    const entity = world.add({
      player: true,
      health: { current: 50, max: 100 },
      regen: { healthPerSecond: 5, accumulated: 0 },
    });

    // 16ms tick - not enough for regen
    RegenSystem(16);

    expect(entity.regen?.accumulated).toBe(16);
    expect(entity.health?.current).toBe(50); // No regen yet
  });

  it('should apply health regen when 1 second accumulated', () => {
    const entity = world.add({
      player: true,
      health: { current: 50, max: 100 },
      regen: { healthPerSecond: 5, accumulated: 990 },
    });

    // 16ms tick - pushes over 1000ms threshold
    RegenSystem(16);

    expect(entity.health?.current).toBe(55); // 50 + 5
    // Accumulated should be 6 (1006 - 1000)
    expect(entity.regen?.accumulated).toBe(6);
  });

  it('should not exceed max health', () => {
    const entity = world.add({
      player: true,
      health: { current: 98, max: 100 },
      regen: { healthPerSecond: 5, accumulated: 990 },
    });

    RegenSystem(16);

    expect(entity.health?.current).toBe(100); // Capped at max
  });

  it('should respect combat speed multiplier', () => {
    // Set 2x speed
    const gameState = world.with('gameState').first;
    if (gameState?.combatSpeed) {
      gameState.combatSpeed.multiplier = 2;
    }

    const entity = world.add({
      player: true,
      health: { current: 50, max: 100 },
      regen: { healthPerSecond: 5, accumulated: 0 },
    });

    // 16ms tick at 2x speed = 32ms effective
    RegenSystem(16);

    expect(entity.regen?.accumulated).toBe(32);
  });

  it('should skip dying entities', () => {
    const entity = world.add({
      player: true,
      health: { current: 50, max: 100 },
      regen: { healthPerSecond: 5, accumulated: 990 },
      dying: { startedAtTick: 0, duration: 500 },
    });

    RegenSystem(16);

    // Should not have applied regen
    expect(entity.health?.current).toBe(50);
    // Accumulated should not have changed either
    expect(entity.regen?.accumulated).toBe(990);
  });

  it('should not regen outside combat phase', () => {
    // Change phase to shop
    const gameState = world.with('gameState').first;
    if (gameState) {
      gameState.phase = 'shop';
    }

    const entity = world.add({
      player: true,
      health: { current: 50, max: 100 },
      regen: { healthPerSecond: 5, accumulated: 990 },
    });

    RegenSystem(16);

    // Should not have applied regen
    expect(entity.health?.current).toBe(50);
    expect(entity.regen?.accumulated).toBe(990);
  });

  it('should handle entities without player component (enemies)', () => {
    const entity = world.add({
      enemy: {
        tier: 'common',
        name: 'Goblin',
        isBoss: false,
        abilities: [],
        intent: null,
      },
      health: { current: 50, max: 100 },
      regen: { healthPerSecond: 3, accumulated: 990 },
    });

    RegenSystem(16);

    // Should apply health regen without error
    expect(entity.health?.current).toBe(53);
  });
});

describe('RegenSystem - Hex Regen', () => {
  beforeEach(() => {
    clearWorld();
    // Add game state for combat phase and speed
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
    });
  });

  it('should regenerate HP when player has hexRegen in hex_veil stance', () => {
    const player = world.add({
      player: true,
      health: { current: 50, max: 100 },
      regen: { healthPerSecond: 0, accumulated: 0 },
      stanceState: { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0 },
      passiveEffectState: {
        computed: { hexRegen: 5 } as any,
        lastComputedTick: 0,
      },
    });

    RegenSystem(1000); // 1 second

    expect(player.health?.current).toBeCloseTo(55, 0); // +5 HP
  });

  it('should NOT regenerate HP when not in hex_veil stance', () => {
    const player = world.add({
      player: true,
      health: { current: 50, max: 100 },
      regen: { healthPerSecond: 0, accumulated: 0 },
      stanceState: { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0 },
      passiveEffectState: {
        computed: { hexRegen: 5 } as any,
        lastComputedTick: 0,
      },
    });

    RegenSystem(1000);

    expect(player.health?.current).toBe(50); // No change
  });

  it('should not exceed max health with hexRegen', () => {
    const player = world.add({
      player: true,
      health: { current: 98, max: 100 },
      regen: { healthPerSecond: 0, accumulated: 0 },
      stanceState: { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0 },
      passiveEffectState: {
        computed: { hexRegen: 10 } as any,
        lastComputedTick: 0,
      },
    });

    RegenSystem(1000);

    expect(player.health?.current).toBe(100); // Capped at max
  });

  it('should skip hexRegen for dying entities', () => {
    const player = world.add({
      player: true,
      health: { current: 50, max: 100 },
      regen: { healthPerSecond: 0, accumulated: 0 },
      stanceState: { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0 },
      passiveEffectState: {
        computed: { hexRegen: 5 } as any,
        lastComputedTick: 0,
      },
      dying: { startedAtTick: 0, duration: 500 },
    });

    RegenSystem(1000);

    expect(player.health?.current).toBe(50); // No change
  });
});
