// src/ecs/systems/__tests__/status-effect.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { StatusEffectSystem } from '../status-effect';
import { resetTick } from '../../loop';

describe('StatusEffectSystem', () => {
  beforeEach(() => {
    // Copy array before iterating to avoid mutation issues during iteration
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
    resetTick();

    // Add game state
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
      floor: { number: 1, room: 1, totalRooms: 5 },
      animationEvents: [],
      combatLog: [],
    });
  });

  it('should apply poison damage over time', () => {
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      statusEffects: [
        {
          id: 'poison-1',
          type: 'poison',
          damage: 10, // 10 damage per second
          remainingTurns: 3, // 3 seconds
          icon: 'skull',
        },
      ],
    });

    // Run for 1 second (1000ms worth of ticks)
    // At 16ms per tick, we need ~62 ticks for 1 second
    // But the system scales by delta, so we can simulate 1 second directly
    StatusEffectSystem(1000); // 1 second

    // Should have taken 10 damage (10 DPS * 1 second)
    expect(enemy.health?.current).toBe(40);
  });

  it('should apply bleed damage over time', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'warrior' },
      health: { current: 100, max: 100 },
      statusEffects: [
        {
          id: 'bleed-1',
          type: 'bleed',
          damage: 5, // 5 damage per second
          remainingTurns: 2, // 2 seconds
          icon: 'droplet',
        },
      ],
    });

    StatusEffectSystem(1000); // 1 second

    // Should have taken 5 damage (5 DPS * 1 second)
    expect(player.health?.current).toBe(95);
  });

  it('should tick down effect duration', () => {
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      statusEffects: [
        {
          id: 'slow-1',
          type: 'slow',
          value: 30, // 30% slow
          remainingTurns: 5, // 5 seconds
          icon: 'turtle',
        },
      ],
    });

    StatusEffectSystem(2000); // 2 seconds

    // Duration should have decreased by 2 seconds
    expect(enemy.statusEffects?.[0]?.remainingTurns).toBe(3);
  });

  it('should remove expired effects', () => {
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      statusEffects: [
        {
          id: 'stun-1',
          type: 'stun',
          value: 100, // full stun
          remainingTurns: 1, // 1 second
          icon: 'zap',
        },
      ],
    });

    StatusEffectSystem(1500); // 1.5 seconds - should expire

    // Effect should be removed
    expect(enemy.statusEffects?.length).toBe(0);

    // Check combat log for removal message
    const gameState = world.with('gameState').first!;
    const logHasRemoval = gameState.combatLog?.some(
      (log) => log.includes('Stun') && log.includes('wears off')
    );
    expect(logHasRemoval).toBe(true);
  });

  it('should not process effects on dying entities', () => {
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 10, max: 50 },
      dying: { startedAtTick: 0, duration: 500 }, // Entity is dying
      statusEffects: [
        {
          id: 'poison-1',
          type: 'poison',
          damage: 100, // Would kill if processed
          remainingTurns: 3,
          icon: 'skull',
        },
      ],
    });

    StatusEffectSystem(1000);

    // Health should be unchanged - dying entities are skipped
    expect(enemy.health?.current).toBe(10);
    // Duration should also be unchanged
    expect(enemy.statusEffects?.[0]?.remainingTurns).toBe(3);
  });

  it('should handle multiple effects on same entity', () => {
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      statusEffects: [
        {
          id: 'poison-1',
          type: 'poison',
          damage: 5,
          remainingTurns: 3,
          icon: 'skull',
        },
        {
          id: 'bleed-1',
          type: 'bleed',
          damage: 3,
          remainingTurns: 2,
          icon: 'droplet',
        },
      ],
    });

    StatusEffectSystem(1000); // 1 second

    // Should take 5 + 3 = 8 total damage
    expect(enemy.health?.current).toBe(92);
  });

  it('should not reduce health below 0', () => {
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 5, max: 50 },
      statusEffects: [
        {
          id: 'poison-1',
          type: 'poison',
          damage: 100, // Would overkill
          remainingTurns: 3,
          icon: 'skull',
        },
      ],
    });

    StatusEffectSystem(1000);

    // Health should be clamped to 0
    expect(enemy.health?.current).toBe(0);
  });

  it('should scale damage with combat speed', () => {
    const gameState = world.with('gameState').first!;
    if (gameState.combatSpeed) {
      gameState.combatSpeed.multiplier = 2; // 2x speed
    }

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      statusEffects: [
        {
          id: 'poison-1',
          type: 'poison',
          damage: 10,
          remainingTurns: 5,
          icon: 'skull',
        },
      ],
    });

    StatusEffectSystem(500); // 500ms at 2x speed = 1 second effective

    // Should take 10 damage (10 DPS * 1 effective second)
    expect(enemy.health?.current).toBe(90);
  });

  it('should add combat log entries for damage dealt', () => {
    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      statusEffects: [
        {
          id: 'poison-1',
          type: 'poison',
          damage: 10,
          remainingTurns: 3,
          icon: 'skull',
        },
      ],
    });

    StatusEffectSystem(1000);

    const gameState = world.with('gameState').first!;
    const logHasDamage = gameState.combatLog?.some(
      (log) => log.includes('Goblin') && log.includes('poison damage')
    );
    expect(logHasDamage).toBe(true);
  });

  it('should not process when not in combat phase', () => {
    const gameState = world.with('gameState').first!;
    (gameState as { phase: string }).phase = 'shop';

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      statusEffects: [
        {
          id: 'poison-1',
          type: 'poison',
          damage: 10,
          remainingTurns: 3,
          icon: 'skull',
        },
      ],
    });

    StatusEffectSystem(1000);

    // Health should be unchanged when not in combat
    expect(enemy.health?.current).toBe(50);
  });

  it('should apply burn damage over time', () => {
    const entity = world.add({
      player: true,
      identity: { name: 'Hero', class: 'warrior' },
      health: { current: 100, max: 100 },
      statusEffects: [
        {
          id: 'burn-1',
          type: 'burn',
          damage: 5,
          remainingTurns: 3,
          icon: 'flame',
        },
      ],
    });

    // Simulate 1 second
    StatusEffectSystem(1000);

    // Should take 5 damage (5 dps * 1s)
    expect(entity.health?.current).toBe(95);
  });
});

describe('StatusEffectSystem - Burn Damage Percent', () => {
  beforeEach(() => {
    // Copy array before iterating to avoid mutation issues during iteration
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
    resetTick();

    // Add game state
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
      floor: { number: 1, room: 1, totalRooms: 5 },
      animationEvents: [],
      combatLog: [],
    });
  });

  it('should increase burn tick damage with burnDamagePercent', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: {
        computed: { burnDamagePercent: 50 } as any, // +50% burn damage
        lastComputedTick: 0,
      },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      statusEffects: [
        { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
      ],
    });

    // Simulate 1 second (1 burn tick)
    StatusEffectSystem(1000);

    // Base 10 damage + 50% = 15 damage, health = 100 - 15 = 85
    expect(enemy.health?.current).toBe(85);
  });

  it('should not modify burn damage without burnDamagePercent', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: { computed: {} as any, lastComputedTick: 0 },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      statusEffects: [
        { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
      ],
    });

    StatusEffectSystem(1000);

    // Base 10 damage only
    expect(enemy.health?.current).toBe(90);
  });

  it('should only apply burnDamagePercent to burn effects, not poison or bleed', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: {
        computed: { burnDamagePercent: 100 } as any, // +100% burn damage
        lastComputedTick: 0,
      },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      statusEffects: [
        { id: 'poison-1', type: 'poison', damage: 10, remainingTurns: 3, icon: 'skull' },
      ],
    });

    StatusEffectSystem(1000);

    // Poison should not be affected by burnDamagePercent - still base 10 damage
    expect(enemy.health?.current).toBe(90);
  });
});
