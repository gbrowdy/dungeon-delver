// src/ecs/systems/__tests__/passive-effect.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../../world';
import {
  PassiveEffectSystem,
  initializePassiveEffectState,
  recomputePassiveEffects,
  resetCombatState,
  resetFloorState
} from '../passive-effect';
import type { Entity } from '../../components';

describe('PassiveEffectSystem', () => {
  beforeEach(() => {
    for (const entity of world) {
      world.remove(entity);
    }
  });

  describe('initializePassiveEffectState', () => {
    it('should create initial state with zeroed computed values', () => {
      const player: Entity = { player: true };
      world.add(player);

      initializePassiveEffectState(player);

      expect(player.passiveEffectState).toBeDefined();
      expect(player.passiveEffectState?.combat.hitsTaken).toBe(0);
      expect(player.passiveEffectState?.computed.damageReductionPercent).toBe(0);
      expect(player.passiveEffectState?.computed.baseReflectPercent).toBe(0);
    });
  });

  describe('recomputePassiveEffects', () => {
    it('should compute effects from Iron Stance base', () => {
      const player: Entity = {
        player: true,
        path: { pathId: 'guardian', abilities: [] },
        stanceState: {
          activeStanceId: 'iron_stance',
          stanceCooldownRemaining: 0,
          triggerCooldowns: {},
        },
        pathProgression: {
          pathId: 'guardian',
          pathType: 'passive',
          stanceProgression: {
            ironTier: 0,
            retributionTier: 0,
            acquiredEnhancements: [],
          },
        },
      };
      world.add(player);
      initializePassiveEffectState(player);

      recomputePassiveEffects(player);

      // Iron Stance base: +25% armor, -15% speed, 15% damage reduction
      expect(player.passiveEffectState?.computed.armorPercent).toBe(25);
      expect(player.passiveEffectState?.computed.speedPercent).toBe(-15);
      expect(player.passiveEffectState?.computed.damageReductionPercent).toBe(15);
    });

    it('should aggregate enhancement effects', () => {
      const player: Entity = {
        player: true,
        path: { pathId: 'guardian', abilities: [] },
        stanceState: {
          activeStanceId: 'iron_stance',
          stanceCooldownRemaining: 0,
          triggerCooldowns: {},
        },
        pathProgression: {
          pathId: 'guardian',
          pathType: 'passive',
          stanceProgression: {
            ironTier: 2,
            retributionTier: 0,
            acquiredEnhancements: ['iron_1_fortified_skin', 'iron_2_damage_absorption'],
          },
        },
      };
      world.add(player);
      initializePassiveEffectState(player);

      recomputePassiveEffects(player);

      // Iron Stance +25% armor + Fortified Skin +20% armor = 45%
      expect(player.passiveEffectState?.computed.armorPercent).toBe(45);
      // Iron Stance 15% DR + Damage Absorption 20% DR = 35%
      expect(player.passiveEffectState?.computed.damageReductionPercent).toBe(35);
    });

    it('should only include enhancements for active stance', () => {
      const player: Entity = {
        player: true,
        path: { pathId: 'guardian', abilities: [] },
        stanceState: {
          activeStanceId: 'retribution_stance', // In Retribution, not Iron
          stanceCooldownRemaining: 0,
          triggerCooldowns: {},
        },
        pathProgression: {
          pathId: 'guardian',
          pathType: 'passive',
          stanceProgression: {
            ironTier: 2,
            retributionTier: 0,
            acquiredEnhancements: ['iron_1_fortified_skin', 'iron_2_damage_absorption'],
          },
        },
      };
      world.add(player);
      initializePassiveEffectState(player);

      recomputePassiveEffects(player);

      // Iron enhancements should NOT apply in Retribution stance
      // Retribution base: +15% power, +10% armor, 20% reflect
      expect(player.passiveEffectState?.computed.armorPercent).toBe(10);
      expect(player.passiveEffectState?.computed.powerPercent).toBe(15);
      expect(player.passiveEffectState?.computed.baseReflectPercent).toBe(20);
    });
  });

  describe('resetCombatState', () => {
    it('should reset combat tracking but preserve floor/permanent/computed', () => {
      const player: Entity = {
        player: true,
        passiveEffectState: {
          combat: { hitsTaken: 5, hitsDealt: 3, nextAttackBonus: 50, damageStacks: 3, reflectBonusPercent: 15 },
          floor: { survivedLethal: true },
          permanent: { powerBonusPercent: 10 },
          computed: createDefaultComputed(),
        },
      };
      player.passiveEffectState!.computed.damageReductionPercent = 35;
      world.add(player);

      resetCombatState(player);

      expect(player.passiveEffectState?.combat.hitsTaken).toBe(0);
      expect(player.passiveEffectState?.combat.damageStacks).toBe(0);
      expect(player.passiveEffectState?.floor.survivedLethal).toBe(true); // preserved
      expect(player.passiveEffectState?.permanent.powerBonusPercent).toBe(10); // preserved
      expect(player.passiveEffectState?.computed.damageReductionPercent).toBe(35); // preserved
    });
  });

  describe('resetFloorState', () => {
    it('should reset floor tracking and combat but preserve permanent/computed', () => {
      const player: Entity = {
        player: true,
        passiveEffectState: {
          combat: { hitsTaken: 5, hitsDealt: 3, nextAttackBonus: 50, damageStacks: 3, reflectBonusPercent: 15 },
          floor: { survivedLethal: true },
          permanent: { powerBonusPercent: 10 },
          computed: createDefaultComputed(),
        },
      };
      world.add(player);

      resetFloorState(player);

      expect(player.passiveEffectState?.floor.survivedLethal).toBe(false); // reset
      expect(player.passiveEffectState?.combat.hitsTaken).toBe(0); // also reset
      expect(player.passiveEffectState?.permanent.powerBonusPercent).toBe(10); // preserved
    });
  });
});

// Helper for tests
function createDefaultComputed() {
  return {
    armorPercent: 0, powerPercent: 0, speedPercent: 0, maxHealthPercent: 0, healthRegenFlat: 0,
    damageReductionPercent: 0, maxDamagePerHitPercent: null, armorReducesDot: false,
    baseReflectPercent: 0, reflectIgnoresArmor: false, reflectCanCrit: false,
    healOnReflectPercent: 0, healOnReflectKillPercent: 0, reflectScalingPerHit: 0,
    counterAttackChance: 0, damageStackConfig: null, healOnDamagedChance: 0, healOnDamagedPercent: 0,
    nextAttackBonusOnDamaged: 0, permanentPowerPerHit: 0, onHitBurstChance: 0, onHitBurstPowerPercent: 0,
    damageAuraPerSecond: 0, hasSurviveLethal: false, isImmuneToStuns: false, isImmuneToSlows: false,
    removeSpeedPenalty: false, lowHpArmorThreshold: 0, lowHpArmorBonus: 0, lowHpReflectThreshold: 0,
    lowHpReflectMultiplier: 1, highHpRegenThreshold: 100, highHpRegenMultiplier: 1,
    conditionalArmorPercent: 0, conditionalDamageReduction: 0, conditionalReflectMultiplier: 1,
    conditionalRegenMultiplier: 1,
  };
}

describe('processPreDamage', () => {
  // Import processPreDamage for these tests
  let processPreDamage: typeof import('../passive-effect').processPreDamage;

  beforeEach(async () => {
    for (const entity of world) {
      world.remove(entity);
    }
    const module = await import('../passive-effect');
    processPreDamage = module.processPreDamage;
  });

  it('should read damage reduction from computed', () => {
    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: {
          ...createDefaultComputed(),
          damageReductionPercent: 35, // Pre-computed value
        },
      },
    };
    world.add(player);

    const result = processPreDamage(player, 100);

    // 35% damage reduction: 100 * 0.65 = 65
    expect(result.finalDamage).toBe(65);
    expect(result.damageReduced).toBe(35);
  });

  it('should apply max damage cap from computed', () => {
    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: {
          ...createDefaultComputed(),
          maxDamagePerHitPercent: 20, // Pre-computed value
        },
      },
    };
    world.add(player);

    const result = processPreDamage(player, 50);

    // Max 20% of 100 max HP = 20 damage
    expect(result.finalDamage).toBe(20);
    expect(result.wasCapped).toBe(true);
  });

  it('should apply conditional armor from computed', () => {
    const player: Entity = {
      player: true,
      health: { current: 25, max: 100 }, // Below 30%
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: {
          ...createDefaultComputed(),
          conditionalArmorPercent: 50, // Already computed by updateConditionalEffects
        },
      },
    };
    world.add(player);

    const result = processPreDamage(player, 100);

    // Conditional armor provides additional DR (simplified: 50% armor -> ~25% DR)
    // 100 - (100 * 50 / 200) = 100 - 25 = 75
    expect(result.finalDamage).toBe(75);
    expect(result.damageReduced).toBe(25);
  });

  it('should return unchanged damage when no passiveEffectState', () => {
    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
    };
    world.add(player);

    const result = processPreDamage(player, 100);

    expect(result.finalDamage).toBe(100);
    expect(result.damageReduced).toBe(0);
    expect(result.wasCapped).toBe(false);
  });

  it('should ensure minimum 1 damage', () => {
    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: {
          ...createDefaultComputed(),
          damageReductionPercent: 99, // Very high reduction
        },
      },
    };
    world.add(player);

    const result = processPreDamage(player, 5);

    // Should never go below 1
    expect(result.finalDamage).toBe(1);
  });

  it('should combine damage reduction and max damage cap', () => {
    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: {
          ...createDefaultComputed(),
          damageReductionPercent: 20, // 20% DR
          maxDamagePerHitPercent: 30, // Max 30 damage
        },
      },
    };
    world.add(player);

    const result = processPreDamage(player, 100);

    // 100 * 0.8 = 80 after DR, then capped to 30
    expect(result.finalDamage).toBe(30);
    expect(result.wasCapped).toBe(true);
  });
});
