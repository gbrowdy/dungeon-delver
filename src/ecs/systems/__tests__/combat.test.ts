// src/ecs/systems/__tests__/combat.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5,  },
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
      defense: { value: 3,  },
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
      attack: {
        baseDamage: 5,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5,  },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      attackReady: { damage: 5, isCrit: false },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      defense: { value: 100,  }, // Very high defense
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
    });

    CombatSystem(16);

    // Minimum 1 damage
    expect(enemy.health?.current).toBe(49);
  });

  it('should clear attackReady after processing', () => {
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
      defense: { value: 5,  },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      attackReady: { damage: 20, isCrit: false },
    });

    world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      defense: { value: 3,  },
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
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5,  },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
      attackReady: { damage: 20, isCrit: false },
    });

    const enemy = world.add({
      enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      defense: { value: 3,  },
      speed: { value: 8, attackInterval: 3000, accumulated: 0 },
      dying: { startedAtTick: 0, duration: 500 },
    });

    CombatSystem(16);

    // No damage - enemy is dying
    expect(enemy.health?.current).toBe(50);
  });

  describe('Arcane Burn stance behavior', () => {
    it('should apply burn status effect when arcane_burn procs', () => {
      // Mock Math.random to always proc (return < 0.20)
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const gameState = world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        attack: { baseDamage: 10, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
        statusEffects: [],
        path: { pathId: 'enchanter', abilities: [] },
        stanceState: { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0, triggerCooldowns: {} },
      });
      world.addComponent(player, 'attackReady', { damage: 10, isCrit: false });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 100, max: 100 },
        defense: { value: 0,  },
        statusEffects: [],
      });

      CombatSystem(16);

      // Should have burn status effect on enemy
      expect(enemy.statusEffects?.some(e => e.type === 'burn')).toBe(true);

      // Damage calculation:
      // Base damage: 10
      // After arcane_surge power modifier (+15%): 10 * 1.15 = 12 (rounded)
      // Arcane burn bonus (30%): 12 * 0.30 = 4 (rounded)
      // Total: 12 + 4 = 16 damage
      expect(enemy.health?.current).toBe(84);

      mockRandom.mockRestore();
    });

    it('should not apply burn when arcane_burn fails to proc', () => {
      // Mock Math.random to fail proc (return > 0.20)
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const gameState = world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        attack: { baseDamage: 10, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
        statusEffects: [],
        path: { pathId: 'enchanter', abilities: [] },
        stanceState: { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0, triggerCooldowns: {} },
      });
      world.addComponent(player, 'attackReady', { damage: 10, isCrit: false });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 100, max: 100 },
        defense: { value: 0,  },
        statusEffects: [],
      });

      CombatSystem(16);

      // Should NOT have burn status effect on enemy
      expect(enemy.statusEffects?.some(e => e.type === 'burn')).toBe(false);

      // Damage calculation:
      // Base damage: 10
      // After arcane_surge power modifier (+15%): 10 * 1.15 = 12 (rounded)
      // No arcane burn bonus
      // Total: 12 damage
      expect(enemy.health?.current).toBe(88);

      mockRandom.mockRestore();
    });
  });

  describe('Hex Lifesteal', () => {
    it('should heal player when dealing damage with hexLifesteal', () => {
      world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 50, max: 100 },
        attack: { baseDamage: 100, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        defense: { value: 0 },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
        stanceState: { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0, triggerCooldowns: {} },
        passiveEffectState: { computed: { hexLifesteal: 10 } as any, lastComputedTick: 0 },
      });
      world.addComponent(player, 'attackReady', { damage: 100, isCrit: false });

      world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 200, max: 200 },
        defense: { value: 0 },
      });

      CombatSystem(16);

      // 100 damage * 10% = 10 HP healed (50 -> 60)
      expect(player.health?.current).toBe(60);
    });
  });

  describe('Hex Armor Reduction', () => {
    it('should reduce enemy armor when player in hex_veil', () => {
      world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 100, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        defense: { value: 0 },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
        stanceState: { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0, triggerCooldowns: {} },
        passiveEffectState: { computed: { hexArmorReduction: 50 } as any, lastComputedTick: 0 },
      });
      world.addComponent(player, 'attackReady', { damage: 100, isCrit: false });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 200, max: 200 },
        defense: { value: 20 },
      });

      // Without reduction: 100 - 20 = 80 damage -> 120 HP
      // With 50% reduction: 100 - 10 = 90 damage -> 110 HP
      CombatSystem(16);

      expect(enemy.health?.current).toBe(110);
    });
  });

  describe('Hex Reflect', () => {
    it('should reflect damage to enemy when player is hit in hex_veil', () => {
      world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        stanceState: { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0, triggerCooldowns: {} },
        passiveEffectState: {
          computed: {
            hexReflect: 20,
            // Required fields for processOnDamaged
            baseReflectPercent: 0,
            counterAttackChance: 0,
            damageStackConfig: null,
            healOnDamagedChance: 0,
            healOnDamagedPercent: 0,
            nextAttackBonusOnDamaged: 0,
            reflectScalingPerHit: 0,
            conditionalReflectMultiplier: 1,
          } as any,
          combat: {
            hitsTaken: 0,
            hitsDealt: 0,
            nextAttackBonus: 0,
            damageStacks: 0,
            reflectBonusPercent: 0,
          },
          lastComputedTick: 0,
        } as any,
      });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 50, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
      });
      world.addComponent(enemy, 'attackReady', { damage: 50, isCrit: false });

      CombatSystem(16);

      // Enemy dealt 50, reflects 20% = 10 damage back
      expect(enemy.health?.current).toBe(90);
      // Player takes full damage (50)
      expect(player.health?.current).toBe(50);
    });
  });

  describe('Hex Heal On Enemy Attack', () => {
    it('should heal player % max HP when enemy attacks', () => {
      world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 50, max: 100 },
        defense: { value: 0 },
        stanceState: { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0, triggerCooldowns: {} },
        passiveEffectState: {
          computed: { hexHealOnEnemyAttack: 5 } as any,
          combat: {
            hitsTaken: 0,
            hitsDealt: 0,
            nextAttackBonus: 0,
            damageStacks: 0,
            reflectBonusPercent: 0,
          },
          lastComputedTick: 0,
        } as any,
      });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 20, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
      });
      world.addComponent(enemy, 'attackReady', { damage: 20, isCrit: false });

      CombatSystem(16);

      // Took 20 damage (50->30), healed 5% of 100 = 5 (30->35)
      expect(player.health?.current).toBe(35);
    });
  });

  describe('Burn Proc Enhancement', () => {
    it('should increase burn chance with burnProcChance enhancement', () => {
      // 20% base + 15% enhancement = 35% chance. Roll 0.30 should succeed.
      vi.spyOn(Math, 'random').mockReturnValue(0.30);

      world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 50, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        defense: { value: 0 },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
        stanceState: { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0, triggerCooldowns: {} },
        // Setup stance effects so getStanceBehavior returns the base value
        effectiveStanceEffects: [
          { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 }
        ],
        passiveEffectState: {
          computed: { burnProcChance: 15 } as any, // +15% = 35% total
          lastComputedTick: 0,
        },
      });
      world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        statusEffects: [],
      });

      CombatSystem(16);

      expect(enemy.statusEffects?.some(e => e.type === 'burn')).toBe(true);
      vi.restoreAllMocks();
    });

    it('should NOT proc burn without enhancement when roll is between base and enhanced chance', () => {
      // Roll 0.25 is above 20% base, should fail without enhancement
      vi.spyOn(Math, 'random').mockReturnValue(0.25);

      world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 50, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        defense: { value: 0 },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
        stanceState: { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0, triggerCooldowns: {} },
        effectiveStanceEffects: [
          { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 }
        ],
        passiveEffectState: { computed: {} as any, lastComputedTick: 0 }, // No enhancement
      });
      world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        statusEffects: [],
      });

      CombatSystem(16);

      expect(enemy.statusEffects?.some(e => e.type === 'burn')).toBe(false);
      vi.restoreAllMocks();
    });
  });

  describe('Burn Duration Bonus', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05); // Always proc burn
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should extend burn duration with burnDurationBonus', () => {
      world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 50, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        defense: { value: 0 },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
        stanceState: { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0, triggerCooldowns: {} },
        effectiveStanceEffects: [
          { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 }
        ],
        passiveEffectState: {
          computed: { burnDurationBonus: 2 } as any, // +2 seconds
          lastComputedTick: 0,
        },
      });
      world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        statusEffects: [],
      });

      CombatSystem(16);

      const burn = enemy.statusEffects?.find(e => e.type === 'burn');
      expect(burn).toBeDefined();
      expect(burn?.remainingTurns).toBe(5); // 3 base + 2 bonus
    });
  });

  describe('Burn Max Stacks', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05); // Always proc
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should allow multiple burn stacks when burnMaxStacks > 1', () => {
      world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 50, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        defense: { value: 0 },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
        stanceState: { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0, triggerCooldowns: {} },
        effectiveStanceEffects: [
          { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 }
        ],
        passiveEffectState: {
          computed: { burnMaxStacks: 3 } as any,
          lastComputedTick: 0,
        },
      });
      world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        statusEffects: [
          { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
        ],
      });

      CombatSystem(16);

      // Should add second stack since maxStacks is 3 and we only had 1
      expect(enemy.statusEffects?.filter(e => e.type === 'burn').length).toBe(2);
    });

    it('should NOT add burn when at max stacks', () => {
      world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 50, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        defense: { value: 0 },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
        stanceState: { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0, triggerCooldowns: {} },
        effectiveStanceEffects: [
          { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 }
        ],
        passiveEffectState: {
          computed: { burnMaxStacks: 2 } as any,
          lastComputedTick: 0,
        },
      });
      world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        statusEffects: [
          { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
          { id: 'burn-2', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
        ],
      });

      CombatSystem(16);

      // Should still only have 2 burns (refreshes existing instead)
      expect(enemy.statusEffects?.filter(e => e.type === 'burn').length).toBe(2);
    });

    it('should refresh oldest burn when at max stacks', () => {
      world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 50, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        defense: { value: 0 },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
        stanceState: { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0, triggerCooldowns: {} },
        effectiveStanceEffects: [
          { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 }
        ],
        passiveEffectState: {
          computed: { burnMaxStacks: 1, burnDurationBonus: 0 } as any,
          lastComputedTick: 0,
        },
      });
      world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        statusEffects: [
          { id: 'burn-1', type: 'burn', damage: 5, remainingTurns: 1, icon: 'flame' },
        ],
      });

      CombatSystem(16);

      // Should still have 1 burn but refreshed to 3 turns
      const burns = enemy.statusEffects?.filter(e => e.type === 'burn') ?? [];
      expect(burns.length).toBe(1);
      expect(burns[0].remainingTurns).toBe(3); // Refreshed
    });

    it('should default to 1 stack when no burnMaxStacks', () => {
      world.add({
        gameState: true,
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
        animationEvents: [],
        combatSpeed: { multiplier: 1 },
      });

      const player = world.add({
        player: true,
        identity: { name: 'Hero', class: 'mage' },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 50, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        defense: { value: 0 },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
        stanceState: { activeStanceId: 'arcane_surge', stanceCooldownRemaining: 0, triggerCooldowns: {} },
        effectiveStanceEffects: [
          { type: 'behavior_modifier', behavior: 'arcane_burn', value: 0.20 }
        ],
        passiveEffectState: { computed: {} as any, lastComputedTick: 0 },
      });
      world.addComponent(player, 'attackReady', { damage: 50, isCrit: false });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 100, max: 100 },
        defense: { value: 0 },
        statusEffects: [
          { id: 'burn-1', type: 'burn', damage: 10, remainingTurns: 3, icon: 'flame' },
        ],
      });

      CombatSystem(16);

      // Should refresh existing burn, not add new (defaults to 1 max stack)
      expect(enemy.statusEffects?.filter(e => e.type === 'burn').length).toBe(1);
    });
  });

  describe('Hex Aura stance behavior', () => {
    it('should reduce enemy damage by 15% when hex_aura is active', () => {
      const gameState = world.add({
        phase: 'combat' as const,
        floor: { number: 1, room: 1, totalRooms: 5 },
        combatLog: [],
      });

      const player = world.add({
        player: true,
        health: { current: 100, max: 100 },
        defense: { value: 0,  },
        statusEffects: [],
        path: { pathId: 'enchanter', abilities: [] },
        stanceState: { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0, triggerCooldowns: {} },
      });

      const enemy = world.add({
        enemy: { id: 'test', name: 'Test', tier: 'common' as const, isBoss: false },
        health: { current: 100, max: 100 },
        attack: { baseDamage: 100, critChance: 0, critMultiplier: 1.5, variance: { min: 1, max: 1 } },
        speed: { value: 10, attackInterval: 2000, accumulated: 0 },
      });
      world.addComponent(enemy, 'attackReady', { damage: 100, isCrit: false });

      CombatSystem(16);

      // 100 damage - 15% hex reduction = 85 damage
      // Player should have 100 - 85 = 15 HP
      expect(player.health?.current).toBe(15);
    });
  });
});
