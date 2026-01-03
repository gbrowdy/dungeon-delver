// src/ecs/systems/__tests__/progression.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { ProgressionSystem } from '../progression';
import { resetTick } from '../../loop';
import { LEVEL_UP_BONUSES } from '@/constants/game';

describe('ProgressionSystem', () => {
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
      popups: {},
    });
  });

  function createPlayer(overrides: {
    xp?: number;
    xpToNext?: number;
    level?: number;
    health?: { current: number; max: number };
    mana?: { current: number; max: number };
    attack?: { baseDamage: number; critChance: number; critMultiplier: number; variance: { min: number; max: number } };
    gold?: number;
  } = {}) {
    return world.add({
      player: true,
      health: overrides.health ?? { current: 100, max: 100 },
      mana: overrides.mana ?? { current: 50, max: 50 },
      attack: overrides.attack ?? {
        baseDamage: 10,
        critChance: 0.1,
        critMultiplier: 2.0,
        variance: { min: 0.85, max: 1.15 },
      },
      progression: {
        level: overrides.level ?? 1,
        xp: overrides.xp ?? 0,
        xpToNext: overrides.xpToNext ?? 100,
      },
      inventory: { gold: overrides.gold ?? 0, items: [] },
    });
  }

  describe('level-up detection', () => {
    it('should trigger level-up when XP reaches threshold', () => {
      const player = createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      expect(player.progression?.level).toBe(2);
      expect(player.progression?.xp).toBe(0);
    });

    it('should trigger level-up when XP exceeds threshold', () => {
      const player = createPlayer({ xp: 150, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      expect(player.progression?.level).toBe(2);
      expect(player.progression?.xp).toBe(50); // Leftover XP
    });

    it('should not trigger level-up when XP below threshold', () => {
      const player = createPlayer({ xp: 50, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      expect(player.progression?.level).toBe(1);
      expect(player.progression?.xp).toBe(50);
    });

    it('should handle multiple level-ups if XP is high enough', () => {
      // XP to level 2: 100, XP to level 3: 150 (100 * 1.5)
      // Total needed: 100 + 150 = 250
      const player = createPlayer({ xp: 260, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      expect(player.progression?.level).toBe(3);
      expect(player.progression?.xp).toBe(10); // 260 - 100 - 150 = 10
    });
  });

  describe('stat bonuses', () => {
    it('should apply max health bonus on level-up', () => {
      const player = createPlayer({
        xp: 100,
        xpToNext: 100,
        health: { current: 80, max: 100 },
      });

      ProgressionSystem(16);

      expect(player.health?.max).toBe(100 + LEVEL_UP_BONUSES.MAX_HEALTH);
      // Current health should NOT change (no restore on level up)
      expect(player.health?.current).toBe(80);
    });

    it('should apply max mana bonus on level-up', () => {
      const player = createPlayer({
        xp: 100,
        xpToNext: 100,
        mana: { current: 30, max: 50 },
      });

      ProgressionSystem(16);

      expect(player.mana?.max).toBe(50 + LEVEL_UP_BONUSES.MAX_MANA);
      // Current mana should NOT change (no restore on level up)
      expect(player.mana?.current).toBe(30);
    });

    it('should apply power bonus on level-up', () => {
      const player = createPlayer({
        xp: 100,
        xpToNext: 100,
        attack: {
          baseDamage: 10,
          critChance: 0.1,
          critMultiplier: 2.0,
          variance: { min: 0.85, max: 1.15 },
        },
      });

      ProgressionSystem(16);

      expect(player.attack?.baseDamage).toBe(10 + LEVEL_UP_BONUSES.POWER);
    });

    it('should apply cumulative bonuses for multiple level-ups', () => {
      const player = createPlayer({
        xp: 250,
        xpToNext: 100,
        level: 1,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
        attack: {
          baseDamage: 10,
          critChance: 0.1,
          critMultiplier: 2.0,
          variance: { min: 0.85, max: 1.15 },
        },
      });

      ProgressionSystem(16);

      // Should level up twice (level 1 -> 2 -> 3)
      expect(player.progression?.level).toBe(3);
      expect(player.health?.max).toBe(100 + LEVEL_UP_BONUSES.MAX_HEALTH * 2);
      expect(player.mana?.max).toBe(50 + LEVEL_UP_BONUSES.MAX_MANA * 2);
      expect(player.attack?.baseDamage).toBe(10 + LEVEL_UP_BONUSES.POWER * 2);
    });
  });

  describe('XP requirement scaling', () => {
    it('should increase xpToNext by EXP_MULTIPLIER on level-up', () => {
      const player = createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      expect(player.progression?.xpToNext).toBe(
        Math.floor(100 * LEVEL_UP_BONUSES.EXP_MULTIPLIER)
      );
    });

    it('should compound XP requirement for multiple level-ups', () => {
      const player = createPlayer({ xp: 250, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      // After 2 level-ups: 100 * 1.5 * 1.5 = 225
      const expectedXpToNext = Math.floor(
        Math.floor(100 * LEVEL_UP_BONUSES.EXP_MULTIPLIER) *
          LEVEL_UP_BONUSES.EXP_MULTIPLIER
      );
      expect(player.progression?.xpToNext).toBe(expectedXpToNext);
    });
  });

  describe('pendingLevelUp and popups', () => {
    it('should set pendingLevelUp on game state', () => {
      createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      const gameState = world.with('gameState').first!;
      expect(gameState.pendingLevelUp).toBe(2);
    });

    it('should set levelUp popup state', () => {
      createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      const gameState = world.with('gameState').first!;
      expect(gameState.popups?.levelUp).toEqual({ level: 2 });
    });

    it('should set final level for multiple level-ups', () => {
      createPlayer({ xp: 250, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      const gameState = world.with('gameState').first!;
      expect(gameState.pendingLevelUp).toBe(3);
      expect(gameState.popups?.levelUp).toEqual({ level: 3 });
    });

    it('should not set pendingLevelUp when no level-up occurs', () => {
      createPlayer({ xp: 50, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      const gameState = world.with('gameState').first!;
      expect(gameState.pendingLevelUp).toBeUndefined();
    });
  });

  describe('combat log', () => {
    it('should add level-up message to combat log', () => {
      createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      const gameState = world.with('gameState').first!;
      expect(gameState.combatLog).toContain('Level up! Now level 2');
    });

    it('should add stat bonus message to combat log', () => {
      createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      const gameState = world.with('gameState').first!;
      const statLog = gameState.combatLog?.find((log) =>
        log.includes('Max HP')
      );
      expect(statLog).toBeDefined();
      expect(statLog).toContain(`+${LEVEL_UP_BONUSES.MAX_HEALTH} Max HP`);
      expect(statLog).toContain(`+${LEVEL_UP_BONUSES.MAX_MANA} Max Mana`);
      expect(statLog).toContain(`+${LEVEL_UP_BONUSES.POWER} Power`);
    });

    it('should add multiple log entries for multiple level-ups', () => {
      createPlayer({ xp: 250, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      const gameState = world.with('gameState').first!;
      const levelUpLogs = gameState.combatLog?.filter((log) =>
        log.includes('Level up!')
      );
      expect(levelUpLogs?.length).toBe(2);
    });
  });

  describe('animation events', () => {
    it('should queue level_up animation event', () => {
      createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      const gameState = world.with('gameState').first!;
      const levelUpEvents = gameState.animationEvents?.filter(
        (e) => e.type === 'level_up'
      );
      expect(levelUpEvents?.length).toBe(1);
    });

    it('should include new level in animation payload', () => {
      createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      const gameState = world.with('gameState').first!;
      const levelUpEvent = gameState.animationEvents?.find(
        (e) => e.type === 'level_up'
      );
      expect(
        (levelUpEvent?.payload as { type: string; newLevel: number }).newLevel
      ).toBe(2);
    });

    it('should queue multiple animation events for multiple level-ups', () => {
      createPlayer({ xp: 250, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      const gameState = world.with('gameState').first!;
      const levelUpEvents = gameState.animationEvents?.filter(
        (e) => e.type === 'level_up'
      );
      expect(levelUpEvents?.length).toBe(2);
    });
  });

  describe('phase checking', () => {
    it('should only process during combat phase', () => {
      createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      // Change phase to non-combat
      const gameState = world.with('gameState').first!;
      gameState.phase = 'shop';

      ProgressionSystem(16);

      // Player should not have leveled up
      const player = world.with('player').first!;
      expect(player.progression?.level).toBe(1);
    });

    it('should process during combat phase', () => {
      const player = createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      // Ensure phase is combat
      const gameState = world.with('gameState').first!;
      gameState.phase = 'combat';

      ProgressionSystem(16);

      expect(player.progression?.level).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle player without progression component', () => {
      world.add({
        player: true,
        health: { current: 100, max: 100 },
        mana: { current: 50, max: 50 },
      });

      // Should not throw
      expect(() => ProgressionSystem(16)).not.toThrow();
    });

    it('should handle missing game state gracefully', () => {
      // Remove game state
      const gameState = world.with('gameState').first;
      if (gameState) {
        world.remove(gameState);
      }

      createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      // Should not throw
      expect(() => ProgressionSystem(16)).not.toThrow();
    });

    it('should handle xpToNext of 0 to prevent infinite loop', () => {
      const player = createPlayer({ xp: 100, xpToNext: 0, level: 1 });

      // Should not cause infinite loop
      ProgressionSystem(16);

      // Level should remain unchanged since xpToNext <= 0 guard
      expect(player.progression?.level).toBe(1);
    });

    it('should initialize popups object if missing', () => {
      const gameState = world.with('gameState').first!;
      delete gameState.popups;

      createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      expect(gameState.popups).toBeDefined();
      expect(gameState.popups?.levelUp).toEqual({ level: 2 });
    });

    it('should initialize combatLog array if missing', () => {
      const gameState = world.with('gameState').first!;
      delete gameState.combatLog;

      createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      expect(gameState.combatLog).toBeDefined();
      expect(gameState.combatLog?.length).toBeGreaterThan(0);
    });

    it('should initialize animationEvents array if missing', () => {
      const gameState = world.with('gameState').first!;
      delete gameState.animationEvents;

      createPlayer({ xp: 100, xpToNext: 100, level: 1 });

      ProgressionSystem(16);

      expect(gameState.animationEvents).toBeDefined();
      expect(gameState.animationEvents?.length).toBeGreaterThan(0);
    });
  });
});
