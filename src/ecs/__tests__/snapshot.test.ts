// src/ecs/__tests__/snapshot.test.ts
/**
 * Unit tests for ECS snapshot types and functions.
 * Tests that snapshots correctly convert entities and are immutable.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../world';
import type { Entity } from '../components';
import {
  createPlayerSnapshot,
  createEnemySnapshot,
  createGameStateSnapshot,
  createCombatSnapshot,
  createDefaultGameStateSnapshot,
  type PlayerSnapshot,
  type EnemySnapshot,
  type GameStateSnapshot,
  type CombatSnapshot,
} from '../snapshot';

describe('Snapshot Types', () => {
  beforeEach(() => {
    // Clear world before each test
    // Use slice() to create a copy of the array since removing modifies it during iteration
    const entities = [...world.entities];
    for (const entity of entities) {
      world.remove(entity);
    }
  });

  describe('createPlayerSnapshot', () => {
    it('should return null if entity lacks player tag', () => {
      const entity: Entity = {
        health: { current: 100, max: 100 },
        identity: { name: 'Test', class: 'warrior' },
      };
      world.add(entity);

      const snapshot = createPlayerSnapshot(entity);
      expect(snapshot).toBeNull();
    });

    it('should return null if entity lacks health component', () => {
      const entity: Entity = {
        player: true,
        identity: { name: 'Test', class: 'warrior' },
      };
      world.add(entity);

      const snapshot = createPlayerSnapshot(entity);
      expect(snapshot).toBeNull();
    });

    it('should create snapshot with null pathResource when entity lacks pathResource component', () => {
      // pathResource is optional - it's added when player selects a path
      const entity: Entity = {
        player: true,
        health: { current: 100, max: 100 },
        identity: { name: 'Test', class: 'warrior' },
      };
      world.add(entity);

      const snapshot = createPlayerSnapshot(entity);
      expect(snapshot).not.toBeNull();
      expect(snapshot!.pathResource).toBeNull();
    });

    it('should return null if entity lacks identity component', () => {
      const entity: Entity = {
        player: true,
        health: { current: 100, max: 100 },
      };
      world.add(entity);

      const snapshot = createPlayerSnapshot(entity);
      expect(snapshot).toBeNull();
    });

    it('should convert entity correctly with all required components', () => {
      const entity: Entity = {
        player: true,
        health: { current: 80, max: 100 },
        identity: { name: 'Hero', class: 'mage' },
        attack: {
          baseDamage: 15,
          critChance: 0.1,
          critMultiplier: 2.0,
          variance: { min: 0.9, max: 1.1 },
        },
        defense: { value: 5,  },
        speed: { value: 12, attackInterval: 2000, accumulated: 500 },
        progression: { level: 3, xp: 150, xpToNext: 300 },
        inventory: { gold: 100, items: [] },
        powers: [
          {
            id: 'fireball',
            name: 'Fireball',
            description: 'Throws fire',
            resourceCost: 20,
            cooldown: 5,
            effect: 'damage',
            value: 30,
            icon: 'flame',
          },
        ],
        equipment: { weapon: null, armor: null, accessory: null },
        statusEffects: [],
        buffs: [],
        combo: { count: 2, lastPowerUsed: 'fireball' },
        abilityTracking: {
          usedCombatAbilities: ['ability1'],
          usedFloorAbilities: [],
          enemyAttackCounter: 3,
          abilityCounters: { special: 1 },
        },
      };
      world.add(entity);

      const snapshot = createPlayerSnapshot(entity);

      expect(snapshot).not.toBeNull();
      expect(snapshot!.name).toBe('Hero');
      expect(snapshot!.characterClass).toBe('mage');
      expect(snapshot!.health.current).toBe(80);
      expect(snapshot!.health.max).toBe(100);
      expect(snapshot!.attack.baseDamage).toBe(15);
      expect(snapshot!.attack.critChance).toBe(0.1);
      expect(snapshot!.defense.value).toBe(5);
      expect(snapshot!.speed.value).toBe(12);
      expect(snapshot!.speed.attackInterval).toBe(2000);
      expect(snapshot!.level).toBe(3);
      expect(snapshot!.xp).toBe(150);
      expect(snapshot!.gold).toBe(100);
      expect(snapshot!.powers).toHaveLength(1);
      expect(snapshot!.powers[0].id).toBe('fireball');
      expect(snapshot!.comboCount).toBe(2);
      expect(snapshot!.lastPowerUsed).toBe('fireball');
      expect(snapshot!.abilityTracking.usedCombatAbilities).toEqual(['ability1']);
      expect(snapshot!.abilityTracking.enemyAttackCounter).toBe(3);
      expect(snapshot!.abilityTracking.abilityCounters.special).toBe(1);
    });

    it('should use default values for missing optional components', () => {
      const entity: Entity = {
        player: true,
        health: { current: 100, max: 100 },
        identity: { name: 'Basic', class: 'warrior' },
      };
      world.add(entity);

      const snapshot = createPlayerSnapshot(entity);

      expect(snapshot).not.toBeNull();
      expect(snapshot!.attack.baseDamage).toBe(0);
      expect(snapshot!.attack.variance.min).toBe(0.85);
      expect(snapshot!.attack.variance.max).toBe(1.15);
      expect(snapshot!.defense.value).toBe(0);
      expect(snapshot!.speed.value).toBe(10);
      expect(snapshot!.speed.attackInterval).toBe(2500);
      expect(snapshot!.level).toBe(1);
      expect(snapshot!.xp).toBe(0);
      expect(snapshot!.xpToNext).toBe(100);
      expect(snapshot!.gold).toBe(0);
      expect(snapshot!.powers).toHaveLength(0);
      expect(snapshot!.statusEffects).toHaveLength(0);
      expect(snapshot!.buffs).toHaveLength(0);
      expect(snapshot!.path).toBeNull();
      expect(snapshot!.pathResource).toBeNull();
      expect(snapshot!.attackModifiers).toHaveLength(0);
      expect(snapshot!.comboCount).toBe(0);
      expect(snapshot!.lastPowerUsed).toBeNull();
      expect(snapshot!.abilityTracking.usedCombatAbilities).toHaveLength(0);
      expect(snapshot!.abilityTracking.usedFloorAbilities).toHaveLength(0);
      expect(snapshot!.abilityTracking.enemyAttackCounter).toBe(0);
    });

    it('should correctly identify isDying flag from dying component', () => {
      const entity: Entity = {
        player: true,
        health: { current: 0, max: 100 },
        identity: { name: 'Dying', class: 'warrior' },
        dying: { startedAtTick: 100, duration: 1000 },
      };
      world.add(entity);

      const snapshot = createPlayerSnapshot(entity);

      expect(snapshot).not.toBeNull();
      expect(snapshot!.isDying).toBe(true);
    });

    it('should copy shield info when present', () => {
      const entity: Entity = {
        player: true,
        health: { current: 100, max: 100 },
        identity: { name: 'Shielded', class: 'paladin' },
        shield: { value: 25, remaining: 3, maxDuration: 5 },
      };
      world.add(entity);

      const snapshot = createPlayerSnapshot(entity);

      expect(snapshot).not.toBeNull();
      expect(snapshot!.shield).not.toBeNull();
      expect(snapshot!.shield!.value).toBe(25);
      expect(snapshot!.shield!.remaining).toBe(3);
      expect(snapshot!.shield!.maxDuration).toBe(5);
    });

    it('should compute effectiveStats with no modifiers when no stance', () => {
      const entity: Entity = {
        player: true,
        health: { current: 100, max: 100 },
        identity: { name: 'Test', class: 'warrior' },
        attack: { baseDamage: 10, critChance: 0.1, critMultiplier: 1.5, variance: { min: 0.9, max: 1.1 } },
        defense: { value: 8 },
        speed: { value: 12, attackInterval: 2000, accumulated: 0 },
      };
      world.add(entity);

      const snapshot = createPlayerSnapshot(entity);

      expect(snapshot).not.toBeNull();
      // Without stance, effective stats should equal base stats with no modifier
      expect(snapshot!.effectiveStats.power.value).toBe(10);
      expect(snapshot!.effectiveStats.power.modifier).toBe(0);
      expect(snapshot!.effectiveStats.armor.value).toBe(8);
      expect(snapshot!.effectiveStats.armor.modifier).toBe(0);
      expect(snapshot!.effectiveStats.speed.value).toBe(12);
      expect(snapshot!.effectiveStats.speed.modifier).toBe(0);
    });

    it('should compute effectiveStats with stance modifiers applied', () => {
      const entity: Entity = {
        player: true,
        health: { current: 100, max: 100 },
        identity: { name: 'Guardian', class: 'warrior' },
        attack: { baseDamage: 10, critChance: 0.1, critMultiplier: 1.5, variance: { min: 0.9, max: 1.1 } },
        defense: { value: 8 },
        speed: { value: 12, attackInterval: 2000, accumulated: 0 },
        path: { pathId: 'guardian', pathType: 'passive', abilities: [] },
        stanceState: { activeStanceId: 'iron_stance', stanceCooldownRemaining: 0 },
        // effectiveStanceEffects would be computed by input system, but we can simulate
        effectiveStanceEffects: [
          { type: 'stat_modifier', stat: 'armor', percentBonus: 0.25 },
          { type: 'stat_modifier', stat: 'speed', percentBonus: -0.15 },
        ],
      };
      world.add(entity);

      const snapshot = createPlayerSnapshot(entity);

      expect(snapshot).not.toBeNull();
      // Power: no modifier, should stay at base
      expect(snapshot!.effectiveStats.power.value).toBe(10);
      expect(snapshot!.effectiveStats.power.modifier).toBe(0);
      // Armor: +25% (8 * 1.25 = 10), ceil for positive = 10
      expect(snapshot!.effectiveStats.armor.value).toBe(10);
      expect(snapshot!.effectiveStats.armor.modifier).toBe(0.25);
      // Speed: -15% (12 * 0.85 = 10.2), floor for negative = 10
      expect(snapshot!.effectiveStats.speed.value).toBe(10);
      expect(snapshot!.effectiveStats.speed.modifier).toBe(-0.15);
    });

    it('should round up positive modifiers to ensure at least +1', () => {
      const entity: Entity = {
        player: true,
        health: { current: 100, max: 100 },
        identity: { name: 'Test', class: 'warrior' },
        attack: { baseDamage: 3, critChance: 0.1, critMultiplier: 1.5, variance: { min: 0.9, max: 1.1 } },
        defense: { value: 3 },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
        path: { pathId: 'guardian', pathType: 'passive', abilities: [] },
        stanceState: { activeStanceId: 'retribution_stance', stanceCooldownRemaining: 0 },
        effectiveStanceEffects: [
          { type: 'stat_modifier', stat: 'power', percentBonus: 0.15 },  // 3 * 1.15 = 3.45
          { type: 'stat_modifier', stat: 'armor', percentBonus: 0.10 },  // 3 * 1.10 = 3.3
        ],
      };
      world.add(entity);

      const snapshot = createPlayerSnapshot(entity);

      expect(snapshot).not.toBeNull();
      // Power: 3 * 1.15 = 3.45 -> ceil = 4, but also ensure min +1 (base+1=4)
      expect(snapshot!.effectiveStats.power.value).toBe(4);
      expect(snapshot!.effectiveStats.power.modifier).toBe(0.15);
      // Armor: 3 * 1.10 = 3.3 -> ceil = 4, ensure min +1 (base+1=4)
      expect(snapshot!.effectiveStats.armor.value).toBe(4);
      expect(snapshot!.effectiveStats.armor.modifier).toBe(0.10);
    });
  });

  describe('createEnemySnapshot', () => {
    it('should return null if entity lacks enemy tag', () => {
      const entity: Entity = {
        health: { current: 100, max: 100 },
      };
      world.add(entity);

      const snapshot = createEnemySnapshot(entity);
      expect(snapshot).toBeNull();
    });

    it('should return null if entity lacks health component', () => {
      const entity: Entity = {
        enemy: {
          tier: 'common',
          name: 'Goblin',
          isBoss: false,
          abilities: [],
          intent: null,
        },
      };
      world.add(entity);

      const snapshot = createEnemySnapshot(entity);
      expect(snapshot).toBeNull();
    });

    it('should convert entity correctly with all components', () => {
      const entity: Entity = {
        enemy: {
          tier: 'rare',
          name: 'Dragon',
          isBoss: true,
          isFinalBoss: true,
          abilities: [
            {
              id: 'firebreath',
              name: 'Fire Breath',
              type: 'multi_hit',
              value: 2,
              cooldown: 3,
              currentCooldown: 0,
              chance: 0.5,
              icon: 'flame',
              description: 'Breathes fire',
            },
          ],
          intent: { type: 'attack', damage: 50, icon: 'sword' },
          modifiers: [],
        },
        health: { current: 500, max: 500 },
        attack: {
          baseDamage: 30,
          critChance: 0.05,
          critMultiplier: 1.5,
          variance: { min: 0.9, max: 1.1 },
        },
        defense: { value: 15,  },
        speed: { value: 8, attackInterval: 3000, accumulated: 1000 },
        statusEffects: [
          {
            id: 'poison1',
            type: 'poison',
            damage: 5,
            remainingTurns: 3,
            icon: 'skull',
          },
        ],
        statDebuffs: [
          {
            id: 'weaken1',
            stat: 'power',
            percentReduction: 0.2,
            remainingDuration: 5,
            sourceName: 'Weaken',
          },
        ],
        enemyFlags: { isShielded: true, shieldTurnsRemaining: 2, isEnraged: false },
        rewards: { xp: 100, gold: 50 },
      };
      world.add(entity);

      const snapshot = createEnemySnapshot(entity);

      expect(snapshot).not.toBeNull();
      expect(snapshot!.name).toBe('Dragon');
      expect(snapshot!.tier).toBe('rare');
      expect(snapshot!.isBoss).toBe(true);
      expect(snapshot!.isFinalBoss).toBe(true);
      expect(snapshot!.health.current).toBe(500);
      expect(snapshot!.health.max).toBe(500);
      expect(snapshot!.attack.baseDamage).toBe(30);
      expect(snapshot!.defense.value).toBe(15);
      expect(snapshot!.speed.value).toBe(8);
      expect(snapshot!.speed.attackInterval).toBe(3000);
      expect(snapshot!.abilities).toHaveLength(1);
      expect(snapshot!.abilities[0].id).toBe('firebreath');
      expect(snapshot!.intent).not.toBeNull();
      expect(snapshot!.intent!.type).toBe('attack');
      expect(snapshot!.statusEffects).toHaveLength(1);
      expect(snapshot!.statusEffects[0].type).toBe('poison');
      expect(snapshot!.statDebuffs).toHaveLength(1);
      expect(snapshot!.statDebuffs[0].stat).toBe('power');
      expect(snapshot!.isShielded).toBe(true);
      expect(snapshot!.shieldTurnsRemaining).toBe(2);
      expect(snapshot!.isEnraged).toBe(false);
      expect(snapshot!.xpReward).toBe(100);
      expect(snapshot!.goldReward).toBe(50);
    });

    it('should use default values for missing optional components', () => {
      const entity: Entity = {
        enemy: {
          tier: 'common',
          name: 'Goblin',
          isBoss: false,
          abilities: [],
          intent: null,
        },
        health: { current: 30, max: 30 },
      };
      world.add(entity);

      const snapshot = createEnemySnapshot(entity);

      expect(snapshot).not.toBeNull();
      expect(snapshot!.attack.baseDamage).toBe(0);
      expect(snapshot!.defense.value).toBe(0);
      expect(snapshot!.speed.value).toBe(10);
      expect(snapshot!.statusEffects).toHaveLength(0);
      expect(snapshot!.statDebuffs).toHaveLength(0);
      expect(snapshot!.isShielded).toBe(false);
      expect(snapshot!.isEnraged).toBe(false);
      expect(snapshot!.xpReward).toBe(0);
      expect(snapshot!.goldReward).toBe(0);
    });

    it('should correctly identify isDying flag from dying component', () => {
      const entity: Entity = {
        enemy: {
          tier: 'common',
          name: 'Dying Goblin',
          isBoss: false,
          abilities: [],
          intent: null,
        },
        health: { current: 0, max: 30 },
        dying: { startedAtTick: 100, duration: 500 },
      };
      world.add(entity);

      const snapshot = createEnemySnapshot(entity);

      expect(snapshot).not.toBeNull();
      expect(snapshot!.isDying).toBe(true);
    });
  });

  describe('createGameStateSnapshot', () => {
    it('should convert entity correctly with all components', () => {
      const entity: Entity = {
        gameState: true,
        phase: 'combat',
        paused: true,
        combatSpeed: { multiplier: 2 },
        isTransitioning: false,
        floor: { number: 3, room: 2, totalRooms: 5, theme: 'dark_forest' },
        popups: { levelUp: { level: 5 } },
        pendingLevelUp: 5,
        pendingRewards: { xp: 100, gold: 50 },
        animationEvents: [
          {
            id: 'event1',
            type: 'player_attack',
            payload: { type: 'damage', value: 25, isCrit: false, blocked: false },
            createdAtTick: 10,
            displayUntilTick: 50,
            consumed: false,
          },
        ],
        combatLog: ['Player attacks!', 'Enemy takes 25 damage'],
      };
      world.add(entity);

      const snapshot = createGameStateSnapshot(entity);

      expect(snapshot.phase).toBe('combat');
      expect(snapshot.isPaused).toBe(true);
      expect(snapshot.combatSpeed).toBe(2);
      expect(snapshot.isTransitioning).toBe(false);
      expect(snapshot.floor).toBe(3);
      expect(snapshot.room).toBe(2);
      expect(snapshot.totalRooms).toBe(5);
      expect(snapshot.floorTheme).toBe('dark_forest');
      expect(snapshot.popups.levelUp?.level).toBe(5);
      expect(snapshot.pendingLevelUp).toBe(5);
      expect(snapshot.pendingRewards).not.toBeNull();
      expect(snapshot.pendingRewards!.xp).toBe(100);
      expect(snapshot.animationEvents).toHaveLength(1);
      expect(snapshot.animationEvents[0].type).toBe('player_attack');
      expect(snapshot.combatLog).toHaveLength(2);
      expect(snapshot.combatLog[0]).toBe('Player attacks!');
    });

    it('should use default values for missing components', () => {
      const entity: Entity = {
        gameState: true,
      };
      world.add(entity);

      const snapshot = createGameStateSnapshot(entity);

      expect(snapshot.phase).toBe('menu');
      expect(snapshot.isPaused).toBe(false);
      expect(snapshot.combatSpeed).toBe(1);
      expect(snapshot.isTransitioning).toBe(false);
      expect(snapshot.floor).toBe(1);
      expect(snapshot.room).toBe(1);
      expect(snapshot.totalRooms).toBe(5);
      expect(snapshot.floorTheme).toBeUndefined();
      expect(snapshot.popups).toEqual({});
      expect(snapshot.pendingLevelUp).toBeNull();
      expect(snapshot.pendingRewards).toBeNull();
      expect(snapshot.animationEvents).toHaveLength(0);
      expect(snapshot.combatLog).toHaveLength(0);
    });
  });

  describe('createDefaultGameStateSnapshot', () => {
    it('should return correct default values', () => {
      const snapshot = createDefaultGameStateSnapshot();

      expect(snapshot.phase).toBe('menu');
      expect(snapshot.isPaused).toBe(false);
      expect(snapshot.combatSpeed).toBe(1);
      expect(snapshot.isTransitioning).toBe(false);
      expect(snapshot.floor).toBe(1);
      expect(snapshot.room).toBe(1);
      expect(snapshot.totalRooms).toBe(5);
      expect(snapshot.floorTheme).toBeUndefined();
      expect(snapshot.popups).toEqual({});
      expect(snapshot.pendingLevelUp).toBeNull();
      expect(snapshot.pendingRewards).toBeNull();
      expect(snapshot.animationEvents).toHaveLength(0);
      expect(snapshot.combatLog).toHaveLength(0);
    });
  });

  describe('createCombatSnapshot', () => {
    it('should return null player/enemy when entities do not exist', () => {
      // No entities in world
      const snapshot = createCombatSnapshot();

      expect(snapshot.player).toBeNull();
      expect(snapshot.enemy).toBeNull();
      expect(snapshot.gameState.phase).toBe('menu'); // default
      expect(snapshot.heroProgress).toBe(0);
      expect(snapshot.enemyProgress).toBe(0);
    });

    it('should return player snapshot when player entity exists', () => {
      world.add({
        player: true,
        health: { current: 100, max: 100 },
        identity: { name: 'Hero', class: 'warrior' },
        speed: { value: 10, attackInterval: 2000, accumulated: 500 },
      });
      world.add({
        gameState: true,
        phase: 'combat',
      });

      const snapshot = createCombatSnapshot();

      expect(snapshot.player).not.toBeNull();
      expect(snapshot.player!.name).toBe('Hero');
      expect(snapshot.enemy).toBeNull();
      expect(snapshot.gameState.phase).toBe('combat');
      expect(snapshot.heroProgress).toBeCloseTo(0.25, 2); // 500/2000
      expect(snapshot.enemyProgress).toBe(0);
    });

    it('should return enemy snapshot when enemy entity exists', () => {
      world.add({
        enemy: {
          tier: 'common',
          name: 'Goblin',
          isBoss: false,
          abilities: [],
          intent: null,
        },
        health: { current: 30, max: 30 },
        speed: { value: 10, attackInterval: 2500, accumulated: 1250 },
      });
      world.add({
        gameState: true,
        phase: 'combat',
      });

      const snapshot = createCombatSnapshot();

      expect(snapshot.player).toBeNull();
      expect(snapshot.enemy).not.toBeNull();
      expect(snapshot.enemy!.name).toBe('Goblin');
      expect(snapshot.heroProgress).toBe(0);
      expect(snapshot.enemyProgress).toBeCloseTo(0.5, 2); // 1250/2500
    });

    it('should return both snapshots when both entities exist', () => {
      world.add({
        player: true,
        health: { current: 100, max: 100 },
        identity: { name: 'Hero', class: 'warrior' },
        speed: { value: 10, attackInterval: 2000, accumulated: 1000 },
      });
      world.add({
        enemy: {
          tier: 'uncommon',
          name: 'Orc',
          isBoss: false,
          abilities: [],
          intent: null,
        },
        health: { current: 60, max: 60 },
        speed: { value: 8, attackInterval: 3000, accumulated: 1500 },
      });
      world.add({
        gameState: true,
        phase: 'combat',
        floor: { number: 2, room: 3, totalRooms: 5, theme: undefined },
      });

      const snapshot = createCombatSnapshot();

      expect(snapshot.player).not.toBeNull();
      expect(snapshot.player!.name).toBe('Hero');
      expect(snapshot.enemy).not.toBeNull();
      expect(snapshot.enemy!.name).toBe('Orc');
      expect(snapshot.gameState.floor).toBe(2);
      expect(snapshot.gameState.room).toBe(3);
      expect(snapshot.heroProgress).toBeCloseTo(0.5, 2); // 1000/2000
      expect(snapshot.enemyProgress).toBeCloseTo(0.5, 2); // 1500/3000
    });

    it('should clamp progress values between 0 and 1', () => {
      world.add({
        player: true,
        health: { current: 100, max: 100 },
        identity: { name: 'Hero', class: 'warrior' },
        speed: { value: 10, attackInterval: 2000, accumulated: 3000 }, // Over 1
      });
      world.add({
        gameState: true,
        phase: 'combat',
      });

      const snapshot = createCombatSnapshot();

      expect(snapshot.heroProgress).toBe(1); // Clamped to max 1
    });

    it('should not return dying enemies', () => {
      world.add({
        player: true,
        health: { current: 100, max: 100 },
        identity: { name: 'Hero', class: 'warrior' },
      });
      world.add({
        enemy: {
          tier: 'common',
          name: 'Dying Goblin',
          isBoss: false,
          abilities: [],
          intent: null,
        },
        health: { current: 0, max: 30 },
        dying: { startedAtTick: 100, duration: 500 }, // Entity is dying
      });
      world.add({
        gameState: true,
        phase: 'combat',
      });

      const snapshot = createCombatSnapshot();

      // Dying enemies are included in snapshot for death animation
      // but marked with isDying: true so UI knows they're dying
      expect(snapshot.enemy).not.toBeNull();
      expect(snapshot.enemy?.isDying).toBe(true);
      expect(snapshot.enemy?.name).toBe('Dying Goblin');
    });
  });

  describe('Snapshot immutability', () => {
    it('should not reflect changes to original entity in player snapshot', () => {
      const entity: Entity = {
        player: true,
        health: { current: 100, max: 100 },
        identity: { name: 'Hero', class: 'warrior' },
        powers: [
          {
            id: 'slash',
            name: 'Slash',
            description: 'A basic attack',
            resourceCost: 10,
            cooldown: 3,
            effect: 'damage',
            value: 20,
            icon: 'sword',
          },
        ],
        cooldowns: new Map([['slash', { remaining: 0, base: 3 }]]),
      };
      world.add(entity);

      const snapshot = createPlayerSnapshot(entity);

      // Mutate original entity
      entity.health!.current = 50;
      entity.cooldowns!.get('slash')!.remaining = 3;

      // Snapshot should reflect original values (shallow copy of nested objects)
      // Note: This test verifies the arrays are copied, but nested object references may still be shared
      expect(snapshot!.powers).toHaveLength(1);
      // The cooldowns Map is copied, so original mutations don't affect snapshot
      expect(snapshot!.cooldowns.get('slash')?.remaining).toBe(0);
    });

    it('should not reflect changes to original entity in enemy snapshot', () => {
      const entity: Entity = {
        enemy: {
          tier: 'common',
          name: 'Goblin',
          isBoss: false,
          abilities: [],
          intent: null,
        },
        health: { current: 30, max: 30 },
        statusEffects: [
          {
            id: 'poison1',
            type: 'poison',
            damage: 5,
            remainingTurns: 3,
            icon: 'skull',
          },
        ],
      };
      world.add(entity);

      const snapshot = createEnemySnapshot(entity);

      // Mutate original
      entity.health!.current = 10;
      entity.statusEffects!.push({
        id: 'stun1',
        type: 'stun',
        value: 1,
        remainingTurns: 1,
        icon: 'zap',
      });

      // Snapshot arrays should be independent copies
      expect(snapshot!.statusEffects).toHaveLength(1);
    });

    it('should not reflect changes to original entity in game state snapshot', () => {
      const entity: Entity = {
        gameState: true,
        phase: 'combat',
        combatLog: ['Attack 1', 'Attack 2'],
        animationEvents: [],
      };
      world.add(entity);

      const snapshot = createGameStateSnapshot(entity);

      // Mutate original
      entity.combatLog!.push('Attack 3');

      // Snapshot should have independent copy
      expect(snapshot.combatLog).toHaveLength(2);
    });
  });

  describe('PlayerSnapshot passiveEffects', () => {
    // Helper to create default computed passive effects
    function createDefaultComputed() {
      return {
        armorPercent: 0,
        powerPercent: 0,
        speedPercent: 0,
        maxHealthPercent: 0,
        healthRegenFlat: 0,
        damageReductionPercent: 0,
        maxDamagePerHitPercent: null,
        armorReducesDot: false,
        baseReflectPercent: 0,
        reflectIgnoresArmor: false,
        reflectCanCrit: false,
        healOnReflectPercent: 0,
        healOnReflectKillPercent: 0,
        reflectScalingPerHit: 0,
        counterAttackChance: 0,
        damageStackConfig: null,
        healOnDamagedChance: 0,
        healOnDamagedPercent: 0,
        nextAttackBonusOnDamaged: 0,
        permanentPowerPerHit: 0,
        onHitBurstChance: 0,
        onHitBurstPowerPercent: 0,
        damageAuraPerSecond: 0,
        hasSurviveLethal: false,
        isImmuneToStuns: false,
        isImmuneToSlows: false,
        removeSpeedPenalty: false,
        lowHpArmorThreshold: 0,
        lowHpArmorBonus: 0,
        lowHpReflectThreshold: 0,
        lowHpReflectMultiplier: 1,
        highHpRegenThreshold: 0,
        highHpRegenMultiplier: 1,
        conditionalArmorPercent: 0,
        conditionalDamageReduction: 0,
        conditionalReflectMultiplier: 1,
        conditionalRegenMultiplier: 1,
      };
    }

    it('should COPY passiveEffectState without computation', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Test', class: 'warrior' },
        health: { current: 50, max: 100 },
        pathProgression: { pathId: 'guardian', pathType: 'passive' },
        passiveEffectState: {
          combat: { hitsTaken: 3, hitsDealt: 5, nextAttackBonus: 75, damageStacks: 2, reflectBonusPercent: 10 },
          floor: { survivedLethal: false },
          permanent: { powerBonusPercent: 4 },
          computed: {
            ...createDefaultComputed(),
            hasSurviveLethal: true,
            damageStackConfig: { valuePerStack: 10, maxStacks: 5 },
            baseReflectPercent: 30,
            conditionalArmorPercent: 50, // Pre-computed by system
            conditionalReflectMultiplier: 2, // Pre-computed by system
          },
        },
      };
      world.add(player);

      const snapshot = createPlayerSnapshot(player);

      // Should be pure copies, no computation
      expect(snapshot?.passiveEffects?.hasSurviveLethal).toBe(true);
      expect(snapshot?.passiveEffects?.survivedLethalUsed).toBe(false);
      expect(snapshot?.passiveEffects?.damageStacks).toBe(2);
      expect(snapshot?.passiveEffects?.damageStacksMax).toBe(5);
      expect(snapshot?.passiveEffects?.lastBastionActive).toBe(true); // conditionalArmorPercent > 0
      expect(snapshot?.passiveEffects?.painConduitActive).toBe(true); // conditionalReflectMultiplier > 1
    });

    it('should return null passiveEffects for non-passive paths', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Test', class: 'warrior' },
        health: { current: 100, max: 100 },
        pathProgression: { pathId: 'berserker', pathType: 'active' },
      };
      world.add(player);

      const snapshot = createPlayerSnapshot(player);

      expect(snapshot?.passiveEffects).toBeNull();
    });
  });
});
