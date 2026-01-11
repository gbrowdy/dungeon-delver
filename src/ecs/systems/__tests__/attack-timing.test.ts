// src/ecs/systems/__tests__/attack-timing.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { world, clearWorld } from '../../world';
import { createPlayerEntity, createEnemyEntity, createGameStateEntity } from '../../factories';
import { AttackTimingSystem } from '../attack-timing';
import type { ComputedPassiveEffects } from '../../components';

// Helper to create default computed passive effects
function createDefaultComputed(): ComputedPassiveEffects {
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
    currentTotalReflectPercent: 0,
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
    highHpRegenThreshold: 100,
    highHpRegenMultiplier: 1,
    conditionalArmorPercent: 0,
    conditionalDamageReduction: 0,
    conditionalReflectMultiplier: 1,
    conditionalRegenMultiplier: 1,
    burnDamagePercent: 100,
    burnProcChance: 0,
    burnDurationBonus: 0,
    burnMaxStacks: 1,
    burnTickRateMultiplier: 1,
    damageVsBurning: 0,
    critRefreshesBurn: false,
    lifestealFromBurns: 0,
    burnExecuteThreshold: 0,
    burnExecuteBonus: 0,
    burnIgnoresArmor: false,
    burnCanCrit: false,
    hexDamageReduction: 0,
    hexSlowPercent: 0,
    hexDamageAmp: 0,
    hexRegen: 0,
    hexIntensityMultiplier: 1,
    hexLifesteal: 0,
    hexArmorReduction: 0,
    hexReflect: 0,
    hexDamageAura: 0,
    hexHealOnEnemyAttack: 0,
    hexDisableAbilities: false,
  };
}

describe('AttackTimingSystem', () => {
  beforeEach(() => {
    for (const entity of world.entities) {
      world.remove(entity);
    }
    // Add game state
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
    });
    // Add enemy (required for combat to proceed)
    world.add({
      enemy: { tier: 'common', name: 'Test Enemy', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      attack: { baseDamage: 10, critChance: 0, critMultiplier: 2, variance: { min: 1, max: 1 } },
      speed: { value: 10, attackInterval: 3000, accumulated: 0 },
    });
  });

  it('should accumulate time toward attack', () => {
    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5,  },
      speed: { value: 10, attackInterval: 2500, accumulated: 0 },
    });

    AttackTimingSystem(16);

    expect(entity.speed?.accumulated).toBe(16);
    expect(entity.attackReady).toBeUndefined();
  });

  it('should trigger attack when interval reached', () => {
    // Mock random to avoid crit variance
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5,  },
      speed: { value: 10, attackInterval: 2500, accumulated: 2490 },
    });

    AttackTimingSystem(16); // 2490 + 16 = 2506 >= 2500

    expect(entity.attackReady).toBeDefined();
    expect(entity.attackReady?.damage).toBe(20);
    expect(entity.attackReady?.isCrit).toBe(false);

    vi.restoreAllMocks();
  });

  it('should carry over excess time', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5,  },
      speed: { value: 10, attackInterval: 2500, accumulated: 2490 },
    });

    AttackTimingSystem(16); // Triggers at 2506, carries over 6ms

    expect(entity.speed?.accumulated).toBe(6);

    vi.restoreAllMocks();
  });

  it('should not attack when stunned', () => {
    const entity = world.add({
      player: true,
      health: { current: 100, max: 100 },
      attack: {
        baseDamage: 20,
        critChance: 0,
        critMultiplier: 2,
        variance: { min: 1, max: 1 },
      },
      defense: { value: 5,  },
      speed: { value: 10, attackInterval: 2500, accumulated: 2500 },
      statusEffects: [
        { id: 'stun-1', type: 'stun', remainingTurns: 1, icon: 'stun' },
      ],
    });

    AttackTimingSystem(16);

    expect(entity.attackReady).toBeUndefined();
    expect(entity.speed?.accumulated).toBe(2500); // No accumulation when stunned
  });

  it('should not allow enemies to crit even with high critChance', () => {
    // Clear existing entities
    for (const entity of world.entities) {
      world.remove(entity);
    }

    // Add game state
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
    });

    // Add player (required for combat)
    world.add({
      player: true,
      health: { current: 100, max: 100 },
      attack: { baseDamage: 10, critChance: 0, critMultiplier: 2, variance: { min: 1, max: 1 } },
      speed: { value: 10, attackInterval: 5000, accumulated: 0 },
    });

    // Add enemy with 100% crit chance - should still NOT crit
    const enemy = world.add({
      enemy: { tier: 'common', name: 'Test Enemy', isBoss: false, abilities: [], intent: null },
      health: { current: 50, max: 50 },
      attack: {
        baseDamage: 10,
        critChance: 1.0, // 100% crit chance
        critMultiplier: 3, // 3x multiplier
        variance: { min: 1, max: 1 },
      },
      speed: { value: 10, attackInterval: 1000, accumulated: 1000 }, // Ready to attack
    });

    // Mock random to return value that would trigger crit for player
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    AttackTimingSystem(16);

    // Enemy should attack but NOT crit
    expect(enemy.attackReady).toBeDefined();
    expect(enemy.attackReady?.isCrit).toBe(false);
    expect(enemy.attackReady?.damage).toBe(10); // Base damage, not 30 (crit)

    vi.restoreAllMocks();
  });
});

describe('AttackTimingSystem - Hex Slow', () => {
  beforeEach(() => {
    clearWorld();
    world.add(createGameStateEntity({ initialPhase: 'combat' }));
  });

  it('should slow enemy attacks when player has hexSlowPercent', () => {
    // Setup player with hex slow
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0 };
    const computed = createDefaultComputed();
    computed.hexSlowPercent = 15;
    player.passiveEffectState = {
      computed,
      lastComputedTick: 0,
      combat: { hitsTaken: 0, damageStacks: 0 },
      floor: { survivedLethal: false },
      permanent: { powerBonusPercent: 0, damageStacks: 0 },
    };
    world.add(player);

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.speed = { value: 10, attackInterval: 1000, accumulated: 0 };
    world.add(enemy);

    // Run for exactly 1000ms - enemy should NOT be ready (needs 1150ms with 15% slow)
    AttackTimingSystem(1000);
    expect(enemy.attackReady).toBeUndefined();

    // Run another 150ms - now should be ready
    AttackTimingSystem(150);
    expect(enemy.attackReady).toBeDefined();
  });

  it('should not apply hex slow when player is in different stance', () => {
    // Setup player with hex slow but in aura_mantle stance
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'aura_mantle', stanceCooldownRemaining: 0 };
    const computed = createDefaultComputed();
    computed.hexSlowPercent = 15;
    player.passiveEffectState = {
      computed,
      lastComputedTick: 0,
      combat: { hitsTaken: 0, damageStacks: 0 },
      floor: { survivedLethal: false },
      permanent: { powerBonusPercent: 0, damageStacks: 0 },
    };
    world.add(player);

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.speed = { value: 10, attackInterval: 1000, accumulated: 0 };
    world.add(enemy);

    // Run for exactly 1000ms - enemy SHOULD be ready (no slow applied)
    AttackTimingSystem(1000);
    expect(enemy.attackReady).toBeDefined();
  });

  it('should not affect player attack timing with hex slow', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    // Setup player with hex slow
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.stanceState = { activeStanceId: 'hex_veil', stanceCooldownRemaining: 0 };
    const computed = createDefaultComputed();
    computed.hexSlowPercent = 15;
    player.passiveEffectState = {
      computed,
      lastComputedTick: 0,
      combat: { hitsTaken: 0, damageStacks: 0 },
      floor: { survivedLethal: false },
      permanent: { powerBonusPercent: 0, damageStacks: 0 },
    };
    player.speed = { value: 10, attackInterval: 1000, accumulated: 0 };
    world.add(player);

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.speed = { value: 10, attackInterval: 5000, accumulated: 0 };
    world.add(enemy);

    // Run for exactly 1000ms - player SHOULD be ready (hex slow doesn't affect player)
    AttackTimingSystem(1000);
    expect(player.attackReady).toBeDefined();

    vi.restoreAllMocks();
  });
});
