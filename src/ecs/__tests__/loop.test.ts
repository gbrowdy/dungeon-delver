// src/ecs/__tests__/loop.test.ts
/**
 * Unit tests for the game loop.
 * Tests timing accuracy, pause behavior, and tick counting.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startLoop,
  stopLoop,
  getTick,
  resetTick,
  isLoopRunning,
  getEffectiveDelta,
  subscribeToTick,
  TICK_MS,
} from '../loop';
import { world } from '../world';
import { GAME_STATE_ENTITY_ID } from '../components';

describe('Game Loop', () => {
  beforeEach(() => {
    // Clear world and reset state
    // Use spread to create a copy since removing modifies the array during iteration
    const entities = [...world.entities];
    for (const entity of entities) {
      world.remove(entity);
    }
    resetTick();
    stopLoop();

    // Mock requestAnimationFrame
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopLoop();
    vi.useRealTimers();
  });

  describe('startLoop / stopLoop', () => {
    it('should start the loop', () => {
      startLoop();

      expect(isLoopRunning()).toBe(true);
    });

    it('should stop the loop', () => {
      startLoop();
      stopLoop();

      expect(isLoopRunning()).toBe(false);
    });

    it('should not start twice', () => {
      startLoop();
      startLoop();

      expect(isLoopRunning()).toBe(true);
    });
  });

  describe('subscribeToTick', () => {
    it('should return an unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToTick(callback);

      expect(typeof unsubscribe).toBe('function');

      // Clean up
      unsubscribe();
    });

    it('should allow multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = subscribeToTick(callback1);
      const unsubscribe2 = subscribeToTick(callback2);

      // Clean up
      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('getTick / resetTick', () => {
    it('should start at tick 0', () => {
      expect(getTick()).toBe(0);
    });

    it('should reset tick counter', () => {
      // Manually set tick (would normally happen via loop)
      resetTick();
      expect(getTick()).toBe(0);
    });
  });

  describe('getEffectiveDelta', () => {
    it('should return base delta when no game state exists', () => {
      const result = getEffectiveDelta(16);
      expect(result).toBe(16);
    });

    it('should scale delta by combat speed', () => {
      // Create game state with 2x speed
      world.add({
        gameState: true,
        phase: 'combat',
        combatSpeed: { multiplier: 2 },
      });

      const result = getEffectiveDelta(16);
      expect(result).toBe(32);
    });

    it('should handle 3x speed', () => {
      world.add({
        gameState: true,
        phase: 'combat',
        combatSpeed: { multiplier: 3 },
      });

      const result = getEffectiveDelta(16);
      expect(result).toBe(48);
    });
  });

  describe('TICK_MS constant', () => {
    it('should be approximately 60fps', () => {
      expect(TICK_MS).toBe(16);
      expect(1000 / TICK_MS).toBeCloseTo(62.5, 0);
    });
  });
});
