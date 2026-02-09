// src/ecs/systems/__tests__/archmage-integration.test.ts
/**
 * Integration tests for Archmage power mechanics.
 * Tests special power features like resetAllCooldowns and chargeModify.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import { PowerSystem } from '../power';
import { ARCHMAGE_POWERS } from '@/data/paths/archmage-powers';

describe('Archmage Power Integration', () => {
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

  describe('resetAllCooldowns mechanic', () => {
    it('should reset other cooldowns when power has resetAllCooldowns', () => {
      // Create player with Arcane Surge (has resetAllCooldowns) and Arcane Bolt
      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [ARCHMAGE_POWERS.arcane_surge_power, ARCHMAGE_POWERS.arcane_bolt],
        effectivePowers: [ARCHMAGE_POWERS.arcane_surge_power, ARCHMAGE_POWERS.arcane_bolt],
        cooldowns: new Map([
          ['arcane_bolt', { remaining: 3, base: 4 }],
        ]),
        pathResource: {
          type: 'arcane_charges',
          current: 0,
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'arcane_surge_power', startedAtTick: 0 },
      });

      // Create enemy target
      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Other cooldowns should be cleared
      expect(player.cooldowns?.has('arcane_bolt')).toBe(false);
      // But arcane_surge should have its own cooldown set
      expect(player.cooldowns?.has('arcane_surge_power')).toBe(true);
    });

    it('should not reset cooldowns for powers without resetAllCooldowns', () => {
      // Create player with Arcane Bolt (no resetAllCooldowns)
      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [ARCHMAGE_POWERS.arcane_bolt, ARCHMAGE_POWERS.meteor_strike],
        effectivePowers: [ARCHMAGE_POWERS.arcane_bolt, ARCHMAGE_POWERS.meteor_strike],
        cooldowns: new Map([
          ['meteor_strike', { remaining: 10, base: 12 }],
        ]),
        pathResource: {
          type: 'arcane_charges',
          current: 0,
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'arcane_bolt', startedAtTick: 0 },
      });

      // Create enemy target
      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Meteor Strike cooldown should NOT be cleared
      expect(player.cooldowns?.has('meteor_strike')).toBe(true);
      expect(player.cooldowns?.get('meteor_strike')?.remaining).toBe(10);
      // Arcane Bolt should now have its cooldown
      expect(player.cooldowns?.has('arcane_bolt')).toBe(true);
    });
  });

  describe('chargeModify mechanic', () => {
    it('should reduce charges when power has negative chargeModify (T1 upgraded Arcane Surge)', () => {
      // Create a power with chargeModify (simulating T1 upgrade of Arcane Surge)
      const upgradedArcaneSurge = {
        ...ARCHMAGE_POWERS.arcane_surge_power,
        chargeModify: -30, // T1 upgrade restores 30 charges
      };

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [upgradedArcaneSurge],
        effectivePowers: [upgradedArcaneSurge],
        cooldowns: new Map(),
        pathResource: {
          type: 'arcane_charges',
          current: 0, // Start at 0
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'arcane_surge_power', startedAtTick: 0 },
      });

      // Create enemy target
      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 200, max: 200 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Arcane Surge costs 50, so charges go to 50, then -30 (chargeModify) = 20
      expect(player.pathResource?.current).toBe(20);
    });

    it('should not go below 0 when chargeModify reduces charges', () => {
      const powerWithLargeChargeModify = {
        ...ARCHMAGE_POWERS.arcane_bolt,
        chargeModify: -50, // Would reduce by 50
      };

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [powerWithLargeChargeModify],
        effectivePowers: [powerWithLargeChargeModify],
        cooldowns: new Map(),
        pathResource: {
          type: 'arcane_charges',
          current: 0,
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'arcane_bolt', startedAtTick: 0 },
      });

      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 200, max: 200 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Arcane Bolt costs 15, so charges go to 15, then -50 (chargeModify) = 0 (clamped)
      expect(player.pathResource?.current).toBe(0);
    });

    it('should not exceed max when chargeModify adds charges', () => {
      const powerWithPositiveChargeModify = {
        ...ARCHMAGE_POWERS.arcane_bolt,
        chargeModify: 50, // Would add 50
      };

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [powerWithPositiveChargeModify],
        effectivePowers: [powerWithPositiveChargeModify],
        cooldowns: new Map(),
        pathResource: {
          type: 'arcane_charges',
          current: 50, // Start at 50
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'arcane_bolt', startedAtTick: 0 },
      });

      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 200, max: 200 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Start at 50, +15 (cost) = 65, +50 (chargeModify) = 100 (clamped at max)
      expect(player.pathResource?.current).toBe(100);
    });

    it('should not apply chargeModify for spend-type resources', () => {
      const powerWithChargeModify = {
        ...ARCHMAGE_POWERS.arcane_bolt,
        chargeModify: -30,
      };

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [powerWithChargeModify],
        effectivePowers: [powerWithChargeModify],
        cooldowns: new Map(),
        pathResource: {
          type: 'fury',
          current: 50,
          max: 100,
          color: '#dc2626',
          resourceBehavior: 'spend', // Spend-type, not gain-type
          generation: {},
        },
        casting: { powerId: 'arcane_bolt', startedAtTick: 0 },
      });

      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 200, max: 200 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Fury is spend-type, so only cost is deducted (15)
      // chargeModify should NOT be applied
      expect(player.pathResource?.current).toBe(35); // 50 - 15 = 35
    });
  });

  describe('Arcane Charges gain-type resource behavior', () => {
    it('should add to charges when casting (gain-type behavior)', () => {
      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [ARCHMAGE_POWERS.arcane_bolt],
        effectivePowers: [ARCHMAGE_POWERS.arcane_bolt],
        cooldowns: new Map(),
        pathResource: {
          type: 'arcane_charges',
          current: 50,
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'arcane_bolt', startedAtTick: 0 },
      });

      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 200, max: 200 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Arcane Bolt costs 15, so charges should increase by 15
      expect(player.pathResource?.current).toBe(65); // 50 + 15 = 65
    });

    it('should reject cast if charges would overflow', () => {
      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [ARCHMAGE_POWERS.arcane_bolt],
        effectivePowers: [ARCHMAGE_POWERS.arcane_bolt],
        cooldowns: new Map(),
        pathResource: {
          type: 'arcane_charges',
          current: 90, // 90 + 15 = 105 > 100
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'arcane_bolt', startedAtTick: 0 },
      });

      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 200, max: 200 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Cast should be rejected, charges unchanged
      expect(player.pathResource?.current).toBe(90);
      expect(player.casting).toBeUndefined();
    });
  });

  describe('Archmage power damage effects', () => {
    it('should deal damage with Arcane Bolt', () => {
      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 }, // No variance for predictable test
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [ARCHMAGE_POWERS.arcane_bolt],
        effectivePowers: [ARCHMAGE_POWERS.arcane_bolt],
        cooldowns: new Map(),
        pathResource: {
          type: 'arcane_charges',
          current: 0,
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'arcane_bolt', startedAtTick: 0 },
      });

      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Arcane Bolt: 150% damage = 20 * 1.5 = 30 damage
      expect(enemy.health?.current).toBe(70); // 100 - 30 = 70
    });

    it('should deal high damage with Meteor Strike', () => {
      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [ARCHMAGE_POWERS.meteor_strike],
        effectivePowers: [ARCHMAGE_POWERS.meteor_strike],
        cooldowns: new Map(),
        pathResource: {
          type: 'arcane_charges',
          current: 0,
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'meteor_strike', startedAtTick: 0 },
      });

      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 200, max: 200 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Meteor Strike: 450% damage = 20 * 4.5 = 90 damage
      expect(enemy.health?.current).toBe(110); // 200 - 90 = 110
    });
  });

  describe('Archmage buff and debuff powers', () => {
    it('should apply buff with Arcane Empowerment', () => {
      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [ARCHMAGE_POWERS.arcane_empowerment],
        effectivePowers: [ARCHMAGE_POWERS.arcane_empowerment],
        cooldowns: new Map(),
        buffs: [],
        pathResource: {
          type: 'arcane_charges',
          current: 0,
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'arcane_empowerment', startedAtTick: 0 },
      });

      world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Should have buffs applied
      expect(player.buffs?.length).toBeGreaterThan(0);
      // Should have power and speed buffs
      const powerBuff = player.buffs?.find(b => b.stat === 'power');
      const speedBuff = player.buffs?.find(b => b.stat === 'speed');
      expect(powerBuff).toBeDefined();
      expect(speedBuff).toBeDefined();
    });

    it('should apply vulnerable debuff with Arcane Weakness', () => {
      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [ARCHMAGE_POWERS.arcane_weakness],
        effectivePowers: [ARCHMAGE_POWERS.arcane_weakness],
        cooldowns: new Map(),
        pathResource: {
          type: 'arcane_charges',
          current: 0,
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'arcane_weakness', startedAtTick: 0 },
      });

      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
        statusEffects: [],
      });

      PowerSystem(16);

      // Enemy should have vulnerable status
      const vulnerableEffect = enemy.statusEffects?.find(e => e.type === 'vulnerable');
      expect(vulnerableEffect).toBeDefined();
      expect(vulnerableEffect?.value).toBe(25); // 25% more damage
    });
  });

  describe('Archmage sustain power', () => {
    it('should heal with Siphon Soul lifesteal', () => {
      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 50, max: 100 }, // Start with 50 HP
        attack: {
          baseDamage: 20,
          critChance: 0,
          critMultiplier: 2,
          variance: { min: 1, max: 1 },
        },
        defense: { value: 5 },
        speed: { value: 10, attackInterval: 2500, accumulated: 0 },
        powers: [ARCHMAGE_POWERS.siphon_soul],
        effectivePowers: [ARCHMAGE_POWERS.siphon_soul],
        cooldowns: new Map(),
        pathResource: {
          type: 'arcane_charges',
          current: 0,
          max: 100,
          color: '#9333ea',
          resourceBehavior: 'gain',
          generation: {},
        },
        casting: { powerId: 'siphon_soul', startedAtTick: 0 },
      });

      const enemy = world.add({
        enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
        health: { current: 200, max: 200 },
        defense: { value: 0 },
        speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      });

      PowerSystem(16);

      // Siphon Soul: 200% damage = 40, lifesteal 50% = 20 HP healed
      // Enemy takes 40 damage: 200 - 40 = 160
      expect(enemy.health?.current).toBe(160);
      // Player heals 20: 50 + 20 = 70
      expect(player.health?.current).toBe(70);
    });
  });
});
