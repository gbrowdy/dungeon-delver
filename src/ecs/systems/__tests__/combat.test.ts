// src/ecs/systems/__tests__/combat.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { CombatSystem } from '../combat';

describe('CombatSystem', () => {
  beforeEach(() => {
    // Copy array before iterating to avoid mutation issues during iteration
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

  it('should apply damage from player to enemy', () => {
    // Create player with attack ready
    world.add({
      player: true,
      identity: { name: 'Hero', class: 'warrior' },
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
      attackReady: { damage: 20, isCrit: false },
    });

    // Create enemy
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      attack: {
        baseDamage: 10,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 3, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    CombatSystem(16);

    // Damage = 20 - 3 (defense) = 17
    expect(enemy.health?.current).toBe(33);
  });

  it('should apply minimum 1 damage even with high defense', () => {
    world.add({
      player: true,
      identity: { name: 'Hero', class: 'warrior' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      attack: {
        baseDamage: 5,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      attackReady: { damage: 5, isCrit: false },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      defense: { value: 100, blockReduction: 0 }, // Very high defense
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    CombatSystem(16);

    // Minimum 1 damage
    expect(enemy.health?.current).toBe(49);
  });

  it('should reduce damage when target is blocking', () => {
    world.add({
      player: true,
      identity: { name: 'Hero', class: 'warrior' },
      health: { current: 100, max: 100 },
      mana: { current: 50, max: 50 },
      blocking: { reduction: 0.4 },
      defense: { value: 5, blockReduction: 0.4 },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
    });

    // Enemy attacks player who is blocking
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 3, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      attackReady: { damage: 20, isCrit: false },
    });

    const player = world.with('player').first!;

    CombatSystem(16);

    // Damage = (20 - 5) * 0.6 = 9
    expect(player.health?.current).toBe(91);
    // Block consumed
    expect(player.blocking).toBeUndefined();
  });

  it('should clear attackReady after processing', () => {
    const player = world.add({
      player: true,
      identity: { name: 'Hero', class: 'warrior' },
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
      attackReady: { damage: 20, isCrit: false },
    });

    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      defense: { value: 3, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    CombatSystem(16);

    expect(player.attackReady).toBeUndefined();
  });

  it('should not attack dying targets', () => {
    world.add({
      player: true,
      identity: { name: 'Hero', class: 'warrior' },
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
      attackReady: { damage: 20, isCrit: false },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      defense: { value: 3, blockReduction: 0 },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      dying: { startedAtTick: 0, duration: 500 },
    });

    CombatSystem(16);

    // No damage - enemy is dying
    expect(enemy.health?.current).toBe(50);
  });
});
