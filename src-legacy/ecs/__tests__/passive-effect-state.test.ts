// src/ecs/__tests__/passive-effect-state.test.ts
import type { Entity, PassiveEffectState, ComputedPassiveEffects } from '../components';

describe('PassiveEffectState component', () => {
  it('should allow passiveEffectState with computed sub-object on entity', () => {
    const computed: ComputedPassiveEffects = {
      // Stat modifiers
      armorPercent: 25,
      powerPercent: 15,
      speedPercent: -15,
      maxHealthPercent: 0,
      healthRegenFlat: 0,
      // Damage modification
      damageReductionPercent: 15,
      maxDamagePerHitPercent: null,
      armorReducesDot: false,
      // Reflect
      baseReflectPercent: 20,
      reflectIgnoresArmor: false,
      reflectCanCrit: false,
      healOnReflectPercent: 0,
      healOnReflectKillPercent: 0,
      reflectScalingPerHit: 0,
      // On-damaged
      counterAttackChance: 0,
      damageStackConfig: null,
      healOnDamagedChance: 0,
      healOnDamagedPercent: 0,
      nextAttackBonusOnDamaged: 0,
      // On-hit
      permanentPowerPerHit: 0,
      onHitBurstChance: 0,
      onHitBurstPowerPercent: 0,
      // Auras
      damageAuraPerSecond: 0,
      // Death prevention
      hasSurviveLethal: false,
      // Immunities
      isImmuneToStuns: false,
      isImmuneToSlows: false,
      // Speed
      removeSpeedPenalty: false,
      // Conditional thresholds (static from enhancements)
      lowHpArmorThreshold: 0,
      lowHpArmorBonus: 0,
      lowHpReflectThreshold: 0,
      lowHpReflectMultiplier: 1,
      highHpRegenThreshold: 100,
      highHpRegenMultiplier: 1,
      // Conditional values (updated each tick based on HP)
      conditionalArmorPercent: 0,
      conditionalDamageReduction: 0,
      conditionalReflectMultiplier: 1,
      conditionalRegenMultiplier: 1,
    };

    const entity: Entity = {
      player: true,
      passiveEffectState: {
        combat: {
          hitsTaken: 0,
          hitsDealt: 0,
          nextAttackBonus: 0,
          damageStacks: 0,
          reflectBonusPercent: 0,
        },
        floor: {
          survivedLethal: false,
        },
        permanent: {
          powerBonusPercent: 0,
        },
        computed,
      },
    };
    expect(entity.passiveEffectState?.computed.damageReductionPercent).toBe(15);
  });
});
