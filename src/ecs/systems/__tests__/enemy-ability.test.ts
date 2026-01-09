// src/ecs/systems/__tests__/enemy-ability.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { EnemyAbilitySystem } from '../enemy-ability';
import type { Entity } from '../../components';

// Helper to create test player
function createTestPlayer(): Entity {
  return world.add({
    player: true,
    identity: { name: 'Hero', class: 'warrior' },
    health: { current: 100, max: 100 },
    attack: {
      baseDamage: 20,
      critChance: 0,
      critMultiplier: 2,
      variance: { min: 1, max: 1 },
    },
    defense: { value: 5,  },
    speed: { value: 10, attackInterval: 2500, accumulated: 0 },
    statusEffects: [],
  });
}

// Helper to create test game state
function createTestGameState(overrides?: Partial<Entity>): Entity {
  return world.add({
    gameState: true,
    phase: 'combat',
    combatSpeed: { multiplier: 1 },
    animationEvents: [],
    combatLog: [],
    floor: { number: 1 },
    ...overrides,
  });
}

describe('EnemyAbilitySystem', () => {
  beforeEach(() => {
    // Clear all entities
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
  });

  describe('intent recalculation', () => {
    it('should recalculate intent after using an ability', () => {
      // Create enemy with multiple abilities - add to world first
      const enemy = world.add({
        enemy: {
          tier: 'common',
          name: 'Test Enemy',
          isBoss: false,
          abilities: [
            { id: 'poison', name: 'Poison', type: 'poison', value: 5, cooldown: 3, currentCooldown: 0, chance: 1, icon: 'Skull', description: 'Poisons' },
            { id: 'heal', name: 'Heal', type: 'heal', value: 0.2, cooldown: 5, currentCooldown: 0, chance: 1, icon: 'Heart', description: 'Heals' },
          ],
          intent: { type: 'ability', ability: { id: 'poison', name: 'Poison', type: 'poison', value: 5, cooldown: 3, currentCooldown: 0, chance: 1, icon: 'Skull', description: 'Poisons' }, icon: 'Skull' },
        },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 10,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 3,  },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
        cooldowns: new Map(),
      });
      // Now add attackReady component after entity is in world
      world.addComponent(enemy, 'attackReady', { damage: 10 });

      const player = createTestPlayer();

      createTestGameState({ phase: 'combat' });

      // Store original intent
      const originalIntentAbilityId = enemy.enemy!.intent?.ability?.id;

      // Run system - should use ability and recalculate intent
      EnemyAbilitySystem(16);

      // The poison ability should now be on cooldown
      expect(enemy.cooldowns?.get('poison')?.remaining).toBe(3);

      // Intent should exist (recalculated)
      expect(enemy.enemy!.intent).toBeDefined();

      // Intent should have changed because poison is now on cooldown
      // (calculateEnemyIntent should now pick heal or basic attack)
      const newIntentAbilityId = enemy.enemy!.intent?.ability?.id;

      // Either intent changed to a different ability, or switched to basic attack
      const intentWasRecalculated =
        originalIntentAbilityId === 'poison' &&
        (newIntentAbilityId !== 'poison' || enemy.enemy!.intent?.type === 'attack');

      expect(intentWasRecalculated).toBe(true);
    });
  });

  describe('status effect fields', () => {
    it('should create poison with id and icon fields', () => {
      const enemy = world.add({
        enemy: {
          tier: 'common',
          name: 'Venomous Snake',
          isBoss: false,
          abilities: [
            { id: 'poison', name: 'Poison Bite', type: 'poison', value: 5, cooldown: 3, currentCooldown: 0, chance: 1, icon: 'Skull', description: 'Poisons' },
          ],
          intent: null as any,
        },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 10, critChance: 0, critMultiplier: 2, variance: { min: 1, max: 1 } },
        defense: { value: 3,  },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
        cooldowns: new Map(),
      });
      enemy.enemy!.intent = { type: 'ability', ability: enemy.enemy!.abilities[0], icon: 'Skull' };
      world.addComponent(enemy, 'attackReady', { damage: 10 });

      const player = createTestPlayer();
      player.statusEffects = [];
      world.add(player);

      createTestGameState({ phase: 'combat', floor: { number: 1, room: 1, totalRooms: 5 } });

      EnemyAbilitySystem(16);

      // Verify poison was applied with required fields
      expect(player.statusEffects.length).toBe(1);
      const poison = player.statusEffects[0];
      expect(poison.type).toBe('poison');
      expect(poison.id).toBeDefined();
      expect(typeof poison.id).toBe('string');
      expect(poison.icon).toBe('Skull');
    });

    it('should create stun with id and icon fields', () => {
      const enemy = world.add({
        enemy: {
          tier: 'common',
          name: 'Stunning Foe',
          isBoss: false,
          abilities: [
            { id: 'stun', name: 'Stun Attack', type: 'stun', value: 2, cooldown: 5, currentCooldown: 0, chance: 1, icon: 'Zap', description: 'Stuns' },
          ],
          intent: null as any,
        },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 10, critChance: 0, critMultiplier: 2, variance: { min: 1, max: 1 } },
        defense: { value: 3,  },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
        cooldowns: new Map(),
      });
      enemy.enemy!.intent = { type: 'ability', ability: enemy.enemy!.abilities[0], icon: 'Zap' };
      world.addComponent(enemy, 'attackReady', { damage: 10 });

      const player = createTestPlayer();
      player.statusEffects = [];
      world.add(player);

      createTestGameState({ phase: 'combat' });

      EnemyAbilitySystem(16);

      // Verify stun was applied with required fields
      expect(player.statusEffects.length).toBe(1);
      const stun = player.statusEffects[0];
      expect(stun.type).toBe('stun');
      expect(stun.id).toBeDefined();
      expect(typeof stun.id).toBe('string');
      expect(stun.icon).toBe('Zap');
    });
  });
});
