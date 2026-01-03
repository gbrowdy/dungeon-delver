// src/ecs/systems/__tests__/death.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { DeathSystem } from '../death';
import { resetTick } from '../../loop';

describe('DeathSystem', () => {
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

  it('should mark entity as dying when health <= 0', () => {
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 0, max: 50 },
      rewards: { xp: 10, gold: 5 },
    });

    DeathSystem(16);

    expect(enemy.dying).toBeDefined();
    expect(enemy.dying?.duration).toBe(500);
  });

  it('should not double-process already dying entities', () => {
    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 0, max: 50 },
      dying: { startedAtTick: 0, duration: 500 },
    });

    const gameState = world.with('gameState').first!;
    const eventCountBefore = gameState.animationEvents?.length ?? 0;

    DeathSystem(16);

    const eventCountAfter = gameState.animationEvents?.length ?? 0;
    expect(eventCountAfter).toBe(eventCountBefore); // No new events
  });

  it('should queue death animation event', () => {
    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 0, max: 50 },
      rewards: { xp: 10, gold: 5 },
    });

    DeathSystem(16);

    const gameState = world.with('gameState').first!;
    const deathEvents = gameState.animationEvents?.filter((e) => e.type === 'death');
    expect(deathEvents?.length).toBe(1);
    expect((deathEvents?.[0]?.payload as { isPlayer: boolean }).isPlayer).toBe(false);
  });

  it('should apply rewards to player on enemy death', () => {
    const player = world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      progression: { level: 1, xp: 0, xpToNext: 100 },
      inventory: { gold: 0, items: [] },
    });

    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 0, max: 50 },
      rewards: { xp: 15, gold: 10 },
    });

    DeathSystem(16);

    expect(player.progression?.xp).toBe(15);
    expect(player.inventory?.gold).toBe(10);
  });

  it('should schedule defeat transition on player death', () => {
    world.add({
      player: true,
      health: { current: 0, max: 100 },
      mana: { current: 50, max: 50 },
    });

    DeathSystem(16);

    const gameState = world.with('gameState').first!;
    const defeatTransition = gameState.scheduledTransitions?.find(
      (t) => t.toPhase === 'defeat'
    );
    expect(defeatTransition).toBeDefined();
  });

  it('should schedule floor-complete when last enemy dies', () => {
    const gameState = world.with('gameState').first!;
    if (gameState.floor) {
      gameState.floor.room = 5;
      gameState.floor.totalRooms = 5;
    }

    world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      progression: { level: 1, xp: 0, xpToNext: 100 },
      inventory: { gold: 0, items: [] },
    });

    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 0, max: 50 },
      rewards: { xp: 10, gold: 5 },
    });

    DeathSystem(16);

    const floorCompleteTransition = gameState.scheduledTransitions?.find(
      (t) => t.toPhase === 'floor-complete'
    );
    expect(floorCompleteTransition).toBeDefined();
  });
});
