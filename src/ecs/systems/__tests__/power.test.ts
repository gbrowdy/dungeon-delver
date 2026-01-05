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
});
