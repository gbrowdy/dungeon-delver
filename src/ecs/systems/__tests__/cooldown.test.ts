// src/ecs/systems/__tests__/cooldown.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world, clearWorld } from '../../world';
import { CooldownSystem } from '../cooldown';

describe('CooldownSystem', () => {
  beforeEach(() => {
    clearWorld();
    // Add game state for combat speed
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
    });
  });

  it('should reduce cooldown by delta time', () => {
    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      cooldowns: new Map([['fireball', { remaining: 5, base: 5 }]]),
    });

    CooldownSystem(16); // 16ms = 0.016 seconds

    const cooldown = entity.cooldowns?.get('fireball');
    expect(cooldown?.remaining).toBeCloseTo(4.984, 3);
  });

  it('should not go below zero', () => {
    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      cooldowns: new Map([['fireball', { remaining: 0.01, base: 5 }]]),
    });

    CooldownSystem(16);

    const cooldown = entity.cooldowns?.get('fireball');
    expect(cooldown?.remaining).toBe(0);
  });

  it('should respect combat speed multiplier', () => {
    // Set 2x speed
    const gameState = world.with('gameState').first;
    if (gameState?.combatSpeed) {
      gameState.combatSpeed.multiplier = 2;
    }

    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      cooldowns: new Map([['fireball', { remaining: 5, base: 5 }]]),
    });

    CooldownSystem(16); // 16ms * 2 = 32ms effective

    const cooldown = entity.cooldowns?.get('fireball');
    expect(cooldown?.remaining).toBeCloseTo(4.968, 3);
  });

  describe('stance cooldown', () => {
    it('should reduce stance cooldown by effective delta time', () => {
      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        stanceState: {
          activeStanceId: 'defensive',
          stanceCooldownRemaining: 5000, // 5000ms
          triggerCooldowns: {},
        },
      });

      CooldownSystem(16); // 16ms

      expect(player.stanceState?.stanceCooldownRemaining).toBe(4984);
    });

    it('should not go below zero for stance cooldown', () => {
      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        stanceState: {
          activeStanceId: 'defensive',
          stanceCooldownRemaining: 10, // 10ms
          triggerCooldowns: {},
        },
      });

      CooldownSystem(16); // 16ms

      expect(player.stanceState?.stanceCooldownRemaining).toBe(0);
    });

    it('should respect combat speed multiplier for stance cooldown', () => {
      // Set 2x speed
      const gameState = world.with('gameState').first;
      if (gameState?.combatSpeed) {
        gameState.combatSpeed.multiplier = 2;
      }

      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        stanceState: {
          activeStanceId: 'defensive',
          stanceCooldownRemaining: 5000, // 5000ms
          triggerCooldowns: {},
        },
      });

      CooldownSystem(16); // 16ms * 2 = 32ms effective

      expect(player.stanceState?.stanceCooldownRemaining).toBe(4968);
    });

    it('should not tick stance cooldown when already at zero', () => {
      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        stanceState: {
          activeStanceId: 'defensive',
          stanceCooldownRemaining: 0,
          triggerCooldowns: {},
        },
      });

      CooldownSystem(16); // 16ms

      expect(player.stanceState?.stanceCooldownRemaining).toBe(0);
    });

    it('should handle player without stanceState', () => {
      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
      });

      // Should not throw
      expect(() => CooldownSystem(16)).not.toThrow();
      expect(player.stanceState).toBeUndefined();
    });
  });
});
