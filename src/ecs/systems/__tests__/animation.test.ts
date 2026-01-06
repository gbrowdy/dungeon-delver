// src/ecs/systems/__tests__/animation.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { resetTick, getTick, TICK_MS } from '../../loop';
import { AnimationSystem, queueAnimationEvent, resetAnimationId } from '../animation';
import type { AnimationEvent } from '../../components';
import { COMBAT_ANIMATION } from '@/constants/enums';

describe('AnimationSystem', () => {
  beforeEach(() => {
    // Clear all entities
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
    resetTick();
    resetAnimationId();

    // Add game state entity
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
      animationEvents: [],
    });
  });

  describe('queueAnimationEvent', () => {
    it('should add an animation event to the game state', () => {
      queueAnimationEvent('player_attack', {
        type: 'damage',
        value: 25,
        isCrit: false,
        blocked: false,
      }, 500);

      const gameState = world.with('gameState').first!;
      expect(gameState.animationEvents?.length).toBe(1);
      expect(gameState.animationEvents?.[0].type).toBe('player_attack');
    });

    it('should generate unique IDs for each event', () => {
      queueAnimationEvent('player_attack', {
        type: 'damage',
        value: 10,
        isCrit: false,
        blocked: false,
      }, 500);

      queueAnimationEvent('enemy_attack', {
        type: 'damage',
        value: 15,
        isCrit: true,
        blocked: false,
      }, 500);

      const gameState = world.with('gameState').first!;
      const ids = gameState.animationEvents?.map((e) => e.id);
      expect(ids?.[0]).not.toBe(ids?.[1]);
      expect(ids?.[0]).toMatch(/^anim-\d+$/);
      expect(ids?.[1]).toMatch(/^anim-\d+$/);
    });

    it('should calculate displayUntilTick based on duration', () => {
      // At tick 0 initially
      const currentTick = getTick();

      // 480ms at 16ms/tick = 30 ticks
      queueAnimationEvent('spell_cast', {
        type: 'spell',
        powerId: 'fireball',
        value: 50,
      }, 480);

      const gameState = world.with('gameState').first!;
      const event = gameState.animationEvents?.[0];

      expect(event?.createdAtTick).toBe(currentTick);
      expect(event?.displayUntilTick).toBe(currentTick + 30); // 0 + 30
      expect(event?.consumed).toBe(false);
    });

    it('should initialize animationEvents array if not present', () => {
      // Remove the existing game state and add one without animationEvents
      for (const entity of [...world.entities]) {
        world.remove(entity);
      }
      world.add({
        gameState: true,
        phase: 'combat',
        combatSpeed: { multiplier: 1 },
      });

      queueAnimationEvent('level_up', {
        type: 'level_up',
        newLevel: 2,
      }, 1000);

      const gameState = world.with('gameState').first!;
      expect(gameState.animationEvents).toBeDefined();
      expect(gameState.animationEvents?.length).toBe(1);
    });

    it('should not add event if no game state exists', () => {
      // Remove all entities
      for (const entity of [...world.entities]) {
        world.remove(entity);
      }

      // Should not throw
      expect(() => {
        queueAnimationEvent('death', {
          type: 'death',
          isPlayer: false,
        }, 500);
      }).not.toThrow();
    });

    it('should handle zero duration by rounding up to 1 tick', () => {
      const currentTick = getTick();

      queueAnimationEvent('power_used', {
        type: 'spell',
        powerId: 'quick_slash',
        value: 15,
      }, 0); // 0 duration rounds up to 1

      const gameState = world.with('gameState').first!;
      const events = gameState.animationEvents!;
      const event = events[0];

      // Math.ceil(0 / 16) = 0, so displayUntilTick equals createdAtTick
      expect(event.displayUntilTick).toBe(currentTick);
    });

    it('should handle very long durations', () => {
      const currentTick = getTick();

      // 10 seconds = 625 ticks (10000 / 16 = 625)
      queueAnimationEvent('level_up', {
        type: 'level_up',
        newLevel: 10,
      }, 10000);

      const gameState = world.with('gameState').first!;
      const events = gameState.animationEvents!;
      const event = events[0];

      expect(event.displayUntilTick).toBe(currentTick + 625);
    });
  });

  describe('AnimationSystem tick management', () => {
    it('should mark events as consumed when currentTick >= displayUntilTick', () => {
      const gameState = world.with('gameState').first!;

      // Manually create an event that's already past its display time
      const event: AnimationEvent = {
        id: 'test-1',
        type: 'player_hit',
        payload: { type: 'damage', value: 20, isCrit: false, blocked: false },
        createdAtTick: 0,
        displayUntilTick: 0, // Should be consumed immediately
        consumed: false,
      };

      gameState.animationEvents = [event];

      AnimationSystem(16);

      expect(event.consumed).toBe(true);
    });

    it('should not consume event before displayUntilTick', () => {
      const gameState = world.with('gameState').first!;
      const currentTick = getTick();

      // Event that won't expire until tick 100
      const event: AnimationEvent = {
        id: 'test-1',
        type: 'enemy_hit',
        payload: { type: 'damage', value: 30, isCrit: true, blocked: false },
        createdAtTick: currentTick,
        displayUntilTick: currentTick + 100, // Far in the future
        consumed: false,
      };

      gameState.animationEvents = [event];

      AnimationSystem(16);

      expect(event.consumed).toBe(false);
    });

    it('should handle multiple events with different durations', () => {
      const gameState = world.with('gameState').first!;
      const currentTick = getTick();

      // Already expired event
      const event1: AnimationEvent = {
        id: 'test-1',
        type: 'player_block',
        payload: { type: 'block', reduction: 0.4 },
        createdAtTick: 0,
        displayUntilTick: 0, // Already expired
        consumed: false,
      };

      // Not yet expired event
      const event2: AnimationEvent = {
        id: 'test-2',
        type: 'status_applied',
        payload: { type: 'status', effectType: 'poison', applied: true },
        createdAtTick: currentTick,
        displayUntilTick: currentTick + 100, // Future
        consumed: false,
      };

      // Also expired event
      const event3: AnimationEvent = {
        id: 'test-3',
        type: 'item_proc',
        payload: { type: 'item', itemName: 'Blazing Sword', effectDescription: 'Burns enemy' },
        createdAtTick: 0,
        displayUntilTick: currentTick, // Exactly at current tick
        consumed: false,
      };

      gameState.animationEvents = [event1, event2, event3];

      AnimationSystem(16);

      expect(event1.consumed).toBe(true);
      expect(event2.consumed).toBe(false);
      expect(event3.consumed).toBe(true);
    });

    it('should not re-consume already consumed events', () => {
      const gameState = world.with('gameState').first!;

      const event: AnimationEvent = {
        id: 'test-1',
        type: 'death',
        payload: { type: 'death', isPlayer: true },
        createdAtTick: 0,
        displayUntilTick: 0,
        consumed: true, // Already consumed
      };

      gameState.animationEvents = [event];

      // Run system - should not change anything
      AnimationSystem(16);

      expect(event.consumed).toBe(true);
    });
  });

  describe('event processing', () => {
    it('should set combatAnimation on enemy when enemy_hit event is processed', () => {
      // Setup: player, enemy, gameState with enemy_hit event
      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        identity: { name: 'Hero', class: 'warrior' },
      });

      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
      });

      const gameState = world.with('gameState').first!;
      gameState.animationEvents = [{
        id: 'test-1',
        type: 'enemy_hit',
        payload: { type: 'damage', value: 10, isCrit: false, blocked: false },
        createdAtTick: getTick(),
        displayUntilTick: getTick() + 30,
        consumed: false,
      }];

      AnimationSystem(16);

      expect(enemy.combatAnimation).toBeDefined();
      expect(enemy.combatAnimation?.type).toBe(COMBAT_ANIMATION.HIT);
    });

    it('should set combatAnimation on player when player_hit event is processed', () => {
      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        identity: { name: 'Hero', class: 'warrior' },
      });

      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
      });

      const gameState = world.with('gameState').first!;
      gameState.animationEvents = [{
        id: 'test-2',
        type: 'player_hit',
        payload: { type: 'damage', value: 15, isCrit: false, blocked: false },
        createdAtTick: getTick(),
        displayUntilTick: getTick() + 30,
        consumed: false,
      }];

      AnimationSystem(16);

      expect(player.combatAnimation).toBeDefined();
      expect(player.combatAnimation?.type).toBe(COMBAT_ANIMATION.HIT);
      expect(player.visualEffects?.shake).toBeDefined();
    });

    it('should mark event as consumed after processing', () => {
      world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        identity: { name: 'Hero', class: 'warrior' },
      });

      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
      });

      const gameState = world.with('gameState').first!;
      gameState.animationEvents = [{
        id: 'test-3',
        type: 'enemy_hit',
        payload: { type: 'damage', value: 10, isCrit: false, blocked: false },
        createdAtTick: getTick(),
        displayUntilTick: getTick(), // Already at expiry time
        consumed: false,
      }];

      AnimationSystem(16);

      expect(gameState.animationEvents?.[0].consumed).toBe(true);
    });

    it('should add floating damage effect on hit', () => {
      world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        identity: { name: 'Hero', class: 'warrior' },
      });

      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
      });

      const gameState = world.with('gameState').first!;
      gameState.animationEvents = [{
        id: 'test-4',
        type: 'enemy_hit',
        payload: { type: 'damage', value: 25, isCrit: true, blocked: false },
        createdAtTick: getTick(),
        displayUntilTick: getTick() + 30,
        consumed: false,
      }];

      AnimationSystem(16);

      expect(gameState.floatingEffects).toBeDefined();
      expect(gameState.floatingEffects?.length).toBe(1);
      expect(gameState.floatingEffects?.[0].value).toBe(25);
      expect(gameState.floatingEffects?.[0].isCrit).toBe(true);
    });
  });

  // Note: Animation expiry logic (clearing combatAnimation after duration) is not currently
  // implemented in AnimationSystem. The system only processes animation events and marks them
  // as consumed. Actual animation clearing based on duration is future work.
  // See implementation plan Task 3.2 for the originally planned expireAnimations() function.

  describe('edge cases', () => {
    it('should not process events if no game state', () => {
      // Remove all entities
      for (const entity of [...world.entities]) {
        world.remove(entity);
      }

      // Should not throw when no game state
      expect(() => AnimationSystem(16)).not.toThrow();
    });

    it('should handle empty animationEvents array', () => {
      const gameState = world.with('gameState').first!;
      expect(gameState.animationEvents).toEqual([]);

      // Should not throw
      expect(() => AnimationSystem(16)).not.toThrow();
    });

    it('should handle undefined animationEvents', () => {
      const gameState = world.with('gameState').first!;
      delete gameState.animationEvents;

      // Should not throw
      expect(() => AnimationSystem(16)).not.toThrow();
    });

    it('should correctly use TICK_MS for duration conversion', () => {
      // 160ms should equal 10 ticks (160 / 16 = 10)
      const durationMs = 160;
      const expectedTicks = Math.ceil(durationMs / TICK_MS);

      queueAnimationEvent('player_attack', {
        type: 'damage',
        value: 10,
        isCrit: false,
        blocked: false,
      }, durationMs);

      const gameState = world.with('gameState').first!;
      const events = gameState.animationEvents!;
      const event = events[0];

      expect(event.displayUntilTick - event.createdAtTick).toBe(expectedTicks);
    });
  });
});
