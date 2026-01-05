// src/ecs/systems/__tests__/power.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { PowerSystem } from '../power';
import type { Power } from '@/types/game';

function createDamagePower(): Power {
  return {
    id: 'fireball',
    name: 'Fireball',
    description: 'Deals fire damage',
    manaCost: 20,
    cooldown: 5,
    effect: 'damage',
    value: 1.5, // 150% damage
    icon: 'fireball',
  };
}

function createHealPower(): Power {
  return {
    id: 'divine-heal',
    name: 'Divine Heal',
    description: 'Restores health',
    manaCost: 30,
    cooldown: 8,
    effect: 'heal',
    value: 0.5, // 50% max health
    icon: 'heal',
  };
}

describe('PowerSystem', () => {
  beforeEach(() => {
    // Clear all entities
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
    // Add game state
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
      animationEvents: [],
      combatLog: [],
    });
  });

  it('should apply damage power to enemy', () => {
    const damagePower = createDamagePower();

    // Create player casting a damage power
    world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 }, // No variance for predictable test
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      powers: [damagePower],
      casting: { powerId: 'fireball', startedAtTick: 0 },
    });

    // Create enemy
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      defense: { value: 5, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    PowerSystem(16);

    // Damage = 20 * 1.5 (power value) - 5 (defense) = 25
    expect(enemy.health?.current).toBe(75);
  });

  it('should apply heal power to player', () => {
    const healPower = createHealPower();

    // Create player with low health, casting heal
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'paladin' },
      health: { current: 40, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 15,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      powers: [healPower],
      casting: { powerId: 'divine-heal', startedAtTick: 0 },
    });

    // Add enemy (needed for context)
    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      defense: { value: 3, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    PowerSystem(16);

    // Heal = 100 * 0.5 = 50, so 40 + 50 = 90
    expect(player.health?.current).toBe(90);
  });

  it('should deduct mana cost', () => {
    const damagePower = createDamagePower();

    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      powers: [damagePower],
      casting: { powerId: 'fireball', startedAtTick: 0 },
    });

    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      defense: { value: 5, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    PowerSystem(16);

    // Mana should be reduced by 20 (power mana cost)
    expect(player.mana?.current).toBe(30);
  });

  it('should set cooldown after casting', () => {
    const damagePower = createDamagePower();

    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      powers: [damagePower],
      casting: { powerId: 'fireball', startedAtTick: 0 },
    });

    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      defense: { value: 5, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    PowerSystem(16);

    // Cooldown should be set in cooldowns Map to power's cooldown value (5)
    expect(player.cooldowns?.get('fireball')?.remaining).toBe(5);
  });

  it('should clear casting component after processing', () => {
    const damagePower = createDamagePower();

    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      powers: [damagePower],
      casting: { powerId: 'fireball', startedAtTick: 0 },
    });

    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      defense: { value: 5, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    PowerSystem(16);

    expect(player.casting).toBeUndefined();
  });

  it('should not cast if not enough mana', () => {
    const damagePower = createDamagePower();

    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      mana: { current: 10, max: 50 }, // Not enough mana (need 20)
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      powers: [damagePower],
      casting: { powerId: 'fireball', startedAtTick: 0 },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 100, max: 100 },
      defense: { value: 5, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    PowerSystem(16);

    // Enemy should not take damage
    expect(enemy.health?.current).toBe(100);
    // Mana should not change
    expect(player.mana?.current).toBe(10);
    // Casting should be cleared
    expect(player.casting).toBeUndefined();
  });

  it('should cap heal at max health', () => {
    const healPower = createHealPower();

    // Create player close to max health
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'paladin' },
      health: { current: 90, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 15,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      powers: [healPower],
      casting: { powerId: 'divine-heal', startedAtTick: 0 },
    });

    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      defense: { value: 3, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    PowerSystem(16);

    // Heal would be 50, but should cap at max (100)
    expect(player.health?.current).toBe(100);
  });

  it('should not damage dying enemies', () => {
    const damagePower = createDamagePower();

    world.add({
      player: true,
      identity: { name: 'Hero', class: 'mage' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      powers: [damagePower],
      casting: { powerId: 'fireball', startedAtTick: 0 },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      defense: { value: 5, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      dying: { startedAtTick: 0, duration: 500 },
    });

    PowerSystem(16);

    // Enemy should not take damage (dying)
    expect(enemy.health?.current).toBe(50);
  });

  describe('path resource consumption', () => {
    it('should deduct spend-type resource when casting power', () => {
      // Create game state entity
      const gameState = world.add({
        gameState: true,
        phase: 'combat',
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatSpeed: { multiplier: 1 },
        animationEvents: [],
        combatLog: [],
      });

      // Create player with Fury (spend-type resource)
      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 10,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5, blockReduction: 0.4 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [{
          id: 'test-power',
          name: 'Test Power',
          description: 'Test',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.5,
          icon: 'test',
        }],
        pathResource: {
          type: 'fury',
          current: 50,
          max: 100,
          color: '#dc2626',
          resourceBehavior: 'spend',
          generation: { onHit: 8 },
        },
        casting: { powerId: 'test-power', startedAtTick: 0 },
        cooldowns: new Map(),
      });

      // Create enemy target
      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
        defense: { value: 0, blockReduction: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      // Run PowerSystem
      PowerSystem(16);

      // Fury should be deducted
      expect(player.pathResource?.current).toBe(20); // 50 - 30 = 20
    });

    it('should reject cast if not enough spend-type resource', () => {
      const gameState = world.add({
        gameState: true,
        phase: 'combat',
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatSpeed: { multiplier: 1 },
        animationEvents: [],
        combatLog: [],
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 10,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5, blockReduction: 0.4 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [{
          id: 'test-power',
          name: 'Test Power',
          description: 'Test',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.5,
          icon: 'test',
        }],
        pathResource: {
          type: 'fury',
          current: 20, // Not enough (need 30)
          max: 100,
          color: '#dc2626',
          resourceBehavior: 'spend',
          generation: { onHit: 8 },
        },
        casting: { powerId: 'test-power', startedAtTick: 0 },
        cooldowns: new Map(),
      });

      PowerSystem(16);

      // Fury should NOT be deducted, casting should be cleared
      expect(player.pathResource?.current).toBe(20);
      expect(player.casting).toBeUndefined();
    });

    it('should add gain-type resource when casting power', () => {
      const gameState = world.add({
        gameState: true,
        phase: 'combat',
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatSpeed: { multiplier: 1 },
        animationEvents: [],
        combatLog: [],
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 10,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5, blockReduction: 0.4 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [{
          id: 'test-power',
          name: 'Test Power',
          description: 'Test',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.5,
          icon: 'test',
        }],
        pathResource: {
          type: 'arcane_charges',
          current: 50,
          max: 100,
          color: '#3b82f6',
          resourceBehavior: 'gain',
          generation: { onPowerUse: 10 },
        },
        casting: { powerId: 'test-power', startedAtTick: 0 },
        cooldowns: new Map(),
      });

      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 50, max: 50 },
        defense: { value: 0, blockReduction: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Arcane charges should be added
      expect(player.pathResource?.current).toBe(80); // 50 + 30 = 80
    });

    it('should reject cast if gain-type resource would overflow', () => {
      const gameState = world.add({
        gameState: true,
        phase: 'combat',
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatSpeed: { multiplier: 1 },
        animationEvents: [],
        combatLog: [],
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 10,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5, blockReduction: 0.4 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [{
          id: 'test-power',
          name: 'Test Power',
          description: 'Test',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.5,
          icon: 'test',
        }],
        pathResource: {
          type: 'arcane_charges',
          current: 85, // 85 + 30 = 115 > 100 max
          max: 100,
          color: '#3b82f6',
          resourceBehavior: 'gain',
          generation: { onPowerUse: 10 },
        },
        casting: { powerId: 'test-power', startedAtTick: 0 },
        cooldowns: new Map(),
      });

      PowerSystem(16);

      // Arcane charges should NOT be added, casting should be cleared
      expect(player.pathResource?.current).toBe(85);
      expect(player.casting).toBeUndefined();
    });
  });

  describe('amplify threshold effects', () => {
    it('should apply +30% damage when Fury >= 80', () => {
      const gameState = world.add({
        gameState: true,
        phase: 'combat',
        floor: { number: 1, room: 1, totalRooms: 5 },
        animationEvents: [],
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 100, variance: { min: 1, max: 1 } }, // Fixed variance for test
        powers: [{
          id: 'test-power',
          name: 'Strike',
          description: 'Test',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.0, // 100% damage = 100 base
          icon: 'test',
        }],
        pathResource: {
          type: 'fury',
          current: 80, // At threshold
          max: 100,
          color: '#dc2626',
          resourceBehavior: 'spend',
          generation: { onHit: 8 },
          thresholds: [{
            value: 80,
            effect: { type: 'damage_bonus', value: 0.3, description: '+30% damage' },
          }],
        },
        casting: { powerId: 'test-power', startedAtTick: 0 },
        cooldowns: new Map(),
      });

      const enemy = world.add({
        enemy: { name: 'Goblin', experienceReward: 10, goldReward: 5 },
        health: { current: 200, max: 200 },
        defense: { value: 0 },
      });

      PowerSystem(16);

      // Base 100 damage * 1.3 amplify = 130 damage
      // Enemy should have 200 - 130 = 70 HP
      expect(enemy.health?.current).toBe(70);
    });
  });
});
