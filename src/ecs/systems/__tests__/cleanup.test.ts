// src/ecs/systems/__tests__/cleanup.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { world } from '../../world';
import { CleanupSystem } from '../cleanup';
import { resetTick } from '../../loop';
import type { AnimationEvent } from '../../components';

// Mock getTick to control tick values
vi.mock('../../loop', async () => {
  const actual = await vi.importActual('../../loop');
  return {
    ...actual,
    getTick: vi.fn().mockReturnValue(100),
  };
});

import { getTick } from '../../loop';

describe('CleanupSystem', () => {
  beforeEach(() => {
    // Copy array before iterating to avoid mutation issues during iteration
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
    resetTick();
    vi.mocked(getTick).mockReturnValue(100);

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

  describe('animation event cleanup', () => {
    it('should remove consumed animation events', () => {
      const gameState = world.with('gameState').first!;
      const consumedEvent: AnimationEvent = {
        id: 'event-1',
        type: 'player_attack',
        payload: { type: 'damage', value: 20, isCrit: false, blocked: false },
        createdAtTick: 50,
        displayUntilTick: 80,
        consumed: true,
      };
      gameState.animationEvents = [consumedEvent];

      CleanupSystem(16);

      expect(gameState.animationEvents?.length).toBe(0);
    });

    it('should keep non-consumed animation events', () => {
      const gameState = world.with('gameState').first!;
      const activeEvent: AnimationEvent = {
        id: 'event-1',
        type: 'player_attack',
        payload: { type: 'damage', value: 20, isCrit: false, blocked: false },
        createdAtTick: 90,
        displayUntilTick: 120,
        consumed: false,
      };
      gameState.animationEvents = [activeEvent];

      CleanupSystem(16);

      expect(gameState.animationEvents?.length).toBe(1);
      expect(gameState.animationEvents?.[0].id).toBe('event-1');
    });

    it('should handle mixed consumed and non-consumed events', () => {
      const gameState = world.with('gameState').first!;
      const consumedEvent1: AnimationEvent = {
        id: 'event-1',
        type: 'player_attack',
        payload: { type: 'damage', value: 20, isCrit: false, blocked: false },
        createdAtTick: 50,
        displayUntilTick: 80,
        consumed: true,
      };
      const activeEvent: AnimationEvent = {
        id: 'event-2',
        type: 'enemy_attack',
        payload: { type: 'damage', value: 15, isCrit: false, blocked: false },
        createdAtTick: 90,
        displayUntilTick: 120,
        consumed: false,
      };
      const consumedEvent2: AnimationEvent = {
        id: 'event-3',
        type: 'spell_cast',
        payload: { type: 'spell', powerId: 'fireball', value: 30 },
        createdAtTick: 60,
        displayUntilTick: 90,
        consumed: true,
      };
      gameState.animationEvents = [consumedEvent1, activeEvent, consumedEvent2];

      CleanupSystem(16);

      expect(gameState.animationEvents?.length).toBe(1);
      expect(gameState.animationEvents?.[0].id).toBe('event-2');
    });
  });

  describe('dying entity cleanup', () => {
    it('should remove entity when dying duration has elapsed', () => {
      // Entity started dying at tick 50, duration 500ms (31.25 ticks at 16ms/tick)
      // Current tick is 100, so ~800ms have passed since startedAtTick
      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 0, max: 50 },
        dying: { startedAtTick: 50, duration: 500 },
      });

      const entityCount = world.entities.length;

      CleanupSystem(16);

      // Entity should be removed
      expect(world.entities.length).toBe(entityCount - 1);
      expect(world.entities.includes(enemy)).toBe(false);
    });

    it('should keep entity when dying duration has not elapsed', () => {
      // Entity started dying at tick 95, duration 500ms
      // Current tick is 100, so only ~80ms have passed
      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 0, max: 50 },
        dying: { startedAtTick: 95, duration: 500 },
      });

      const entityCount = world.entities.length;

      CleanupSystem(16);

      // Entity should still exist
      expect(world.entities.length).toBe(entityCount);
      expect(world.entities.includes(enemy)).toBe(true);
    });

    it('should not remove player entity even when dying duration elapsed', () => {
      // Player started dying at tick 50, duration 500ms elapsed
      const player = world.add({
        player: true,
        health: { current: 0, max: 100 },
        dying: { startedAtTick: 50, duration: 500 },
      });

      CleanupSystem(16);

      // Player should still exist (needed for death screen)
      expect(world.entities.includes(player)).toBe(true);
    });
  });

  describe('attackReady cleanup', () => {
    it('should clear attackReady from player', () => {
      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        attackReady: { damage: 20, isCrit: false },
      });

      CleanupSystem(16);

      expect(player.attackReady).toBeUndefined();
    });

    it('should clear attackReady from enemy', () => {
      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
        attackReady: { damage: 15, isCrit: false },
      });

      CleanupSystem(16);

      expect(enemy.attackReady).toBeUndefined();
    });

    it('should clear attackReady from both player and enemy', () => {
      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        attackReady: { damage: 20, isCrit: true },
      });
      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
        attackReady: { damage: 15, isCrit: false },
      });

      CleanupSystem(16);

      expect(player.attackReady).toBeUndefined();
      expect(enemy.attackReady).toBeUndefined();
    });
  });

  describe('combined cleanup scenarios', () => {
    it('should handle all cleanup tasks in one tick', () => {
      const gameState = world.with('gameState').first!;

      // Add consumed event
      const consumedEvent: AnimationEvent = {
        id: 'event-consumed',
        type: 'player_attack',
        payload: { type: 'damage', value: 20, isCrit: false, blocked: false },
        createdAtTick: 50,
        displayUntilTick: 80,
        consumed: true,
      };
      // Add active event
      const activeEvent: AnimationEvent = {
        id: 'event-active',
        type: 'enemy_attack',
        payload: { type: 'damage', value: 15, isCrit: false, blocked: false },
        createdAtTick: 90,
        displayUntilTick: 120,
        consumed: false,
      };
      gameState.animationEvents = [consumedEvent, activeEvent];

      // Add player with attackReady
      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        attackReady: { damage: 20, isCrit: false },
      });

      // Add dying enemy (duration elapsed)
      const dyingEnemy = world.add({
        enemy: { tier: 'common', name: 'Dead Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 0, max: 50 },
        dying: { startedAtTick: 50, duration: 500 },
      });

      // Add alive enemy with attackReady
      const aliveEnemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
        attackReady: { damage: 15, isCrit: false },
      });

      CleanupSystem(16);

      // Verify event cleanup
      expect(gameState.animationEvents?.length).toBe(1);
      expect(gameState.animationEvents?.[0].id).toBe('event-active');

      // Verify attackReady cleared
      expect(player.attackReady).toBeUndefined();
      expect(aliveEnemy.attackReady).toBeUndefined();

      // Verify dying enemy removed
      expect(world.entities.includes(dyingEnemy)).toBe(false);
      expect(world.entities.includes(aliveEnemy)).toBe(true);
    });
  });
});
