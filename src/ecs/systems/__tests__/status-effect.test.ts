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

describe('StatusEffectSystem - Burn Tick Rate', () => {
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

  it('should apply burn damage faster when burnTickRateMultiplier > 1', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: {
        computed: { burnTickRateMultiplier: 2.0 } as any, // 2x faster = ticks every 500ms instead of 1000ms
        lastComputedTick: 0,
      },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      statusEffects: [
        { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 0 },
      ],
    });

    // Run for 500ms - should apply 1 tick with 2x faster rate
    StatusEffectSystem(500);

    expect(enemy.health?.current).toBe(90); // -10 from burn tick
  });

  it('should tick at normal rate when burnTickRateMultiplier is 1', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: {
        computed: { burnTickRateMultiplier: 1.0 } as any,
        lastComputedTick: 0,
      },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      statusEffects: [
        { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 0 },
      ],
    });

    // Run for 500ms - should NOT tick yet (needs 1000ms)
    StatusEffectSystem(500);

    expect(enemy.health?.current).toBe(100); // No damage yet
  });

  it('should apply multiple burn ticks when enough time passes', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: {
        computed: { burnTickRateMultiplier: 2.0 } as any, // 2x faster = ticks every 500ms
        lastComputedTick: 0,
      },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      statusEffects: [
        { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 5, icon: 'flame', tickAccumulated: 0 },
      ],
    });

    // Run for 1000ms - should apply 2 ticks at 2x rate
    StatusEffectSystem(1000);

    expect(enemy.health?.current).toBe(80); // -20 from 2 burn ticks
  });

  it('should combine burnTickRateMultiplier with burnDamagePercent', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: {
        computed: {
          burnTickRateMultiplier: 2.0, // 2x faster
          burnDamagePercent: 50, // +50% damage
        } as any,
        lastComputedTick: 0,
      },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      statusEffects: [
        { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 5, icon: 'flame', tickAccumulated: 0 },
      ],
    });

    // Run for 500ms - should apply 1 tick at 2x rate with +50% damage
    StatusEffectSystem(500);

    // Base 10 damage + 50% = 15 damage
    expect(enemy.health?.current).toBe(85);
  });

  it('should not affect poison tick rate', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: {
        computed: { burnTickRateMultiplier: 2.0 } as any, // 2x faster - but only for burns
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

    // Run for 500ms - poison uses continuous DPS model, should take 5 damage (10 DPS * 0.5s)
    StatusEffectSystem(500);

    expect(enemy.health?.current).toBe(95);
  });

  it('should default to 1.0 tick rate when burnTickRateMultiplier is not set', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: {
        computed: {} as any, // No burnTickRateMultiplier
        lastComputedTick: 0,
      },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      statusEffects: [
        { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 0 },
      ],
    });

    // Run for 500ms - should NOT tick yet (default 1.0 needs 1000ms)
    StatusEffectSystem(500);

    expect(enemy.health?.current).toBe(100); // No damage yet
  });
});

describe('StatusEffectSystem - Burn Execute Bonus', () => {
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

  it('should deal bonus burn damage to low HP enemies', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: {
        computed: {
          burnTickRateMultiplier: 1.0,
          burnExecuteBonus: 50,
          burnExecuteThreshold: 30,
        } as any, // +50% below 30% HP
        lastComputedTick: 0,
      },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 25, max: 100 }, // 25% HP, below threshold
      statusEffects: [
        { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 1000 },
      ],
    });

    StatusEffectSystem(0); // Process tick (tickAccumulated already at 1000)

    // 10 base + 50% execute bonus = 15 damage, 25 - 15 = 10 HP
    expect(enemy.health?.current).toBe(10);
  });

  it('should NOT apply execute bonus above HP threshold', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: {
        computed: {
          burnTickRateMultiplier: 1.0,
          burnExecuteBonus: 50,
          burnExecuteThreshold: 30,
        } as any,
        lastComputedTick: 0,
      },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 100 }, // 50% HP, above threshold
      statusEffects: [
        { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 1000 },
      ],
    });

    StatusEffectSystem(0);

    // Only base damage, 50 - 10 = 40 HP
    expect(enemy.health?.current).toBe(40);
  });

  it('should stack burnExecuteBonus with burnDamagePercent', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: {
        computed: {
          burnTickRateMultiplier: 1.0,
          burnDamagePercent: 50, // +50% base
          burnExecuteBonus: 100, // +100% execute
          burnExecuteThreshold: 30,
        } as any,
        lastComputedTick: 0,
      },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 20, max: 100 }, // 20% HP, below threshold
      statusEffects: [
        { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 1000 },
      ],
    });

    StatusEffectSystem(0);

    // 10 base * 1.5 (burnDamagePercent) = 15, then 15 * 2.0 (execute bonus) = 30 damage
    // 20 - 30 = -10, clamped to 0
    expect(enemy.health?.current).toBe(0);
  });

  it('should not apply execute bonus when threshold is 0 (disabled)', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      passiveEffectState: {
        computed: {
          burnTickRateMultiplier: 1.0,
          burnExecuteBonus: 50,
          burnExecuteThreshold: 0, // disabled
        } as any,
        lastComputedTick: 0,
      },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 10, max: 100 }, // 10% HP, but threshold is 0
      statusEffects: [
        { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame', tickAccumulated: 1000 },
      ],
    });

    StatusEffectSystem(0);

    // No execute bonus when threshold is 0, just base 10 damage
    expect(enemy.health?.current).toBe(0); // 10 - 10 = 0
  });
});
