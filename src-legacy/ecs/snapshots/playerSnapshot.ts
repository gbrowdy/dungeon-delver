// src/ecs/snapshots/playerSnapshot.ts
/**
 * Player snapshot type and creation function.
 */

import type { Entity } from '../components';
import type { CharacterClass, Power, Item, ActiveBuff, StatusEffect, PathResource, AttackModifier } from '@/types/game';
import type { PlayerPath, PlayerStanceState, StanceEnhancement, StanceEffect } from '@/types/paths';
import { getTick } from '../loop';
import { getStanceStatModifier } from '@/utils/stanceUtils';
import { ticksToMs, applyStatModifier } from './types';

/**
 * Snapshot of player entity state for React components.
 * Contains all player data needed for rendering.
 */
export interface PlayerSnapshot {
  // Identity
  name: string;
  characterClass: CharacterClass;

  // Combat stats
  health: { current: number; max: number };
  attack: {
    baseDamage: number;
    critChance: number;
    critMultiplier: number;
    variance: { min: number; max: number };
  };
  defense: { value: number };
  speed: { value: number; attackInterval: number };

  // Fortune and derived stats
  fortune: number;
  derivedStats: {
    critChance: number;
    critDamage: number;
    dodgeChance: number;
  };

  // Effective stats (base stats modified by stances, buffs, etc.)
  // Used for display - shows what's actually used in combat
  effectiveStats: {
    power: { value: number; modifier: number }; // modifier is percentage (e.g., 0.25 = +25%)
    armor: { value: number; modifier: number };
    speed: { value: number; modifier: number };
  };

  // Progression
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;

  // Abilities
  powers: Power[];
  effectivePowers: Power[];
  effectiveStanceEffects: StanceEffect[];
  cooldowns: Map<string, { remaining: number; base: number }>;

  // Equipment
  equipment: {
    weapon: Item | null;
    armor: Item | null;
    accessory: Item | null;
  };
  inventory: Item[];

  // Status
  statusEffects: StatusEffect[];
  buffs: ActiveBuff[];
  shield: { value: number; remaining: number; maxDuration: number } | null;
  isDying: boolean;

  // Path
  path: PlayerPath | null;
  pathResource: PathResource | null;
  stanceState: PlayerStanceState | null;
  pendingAbilityChoice: boolean;
  pendingPowerChoice: {
    level: number;
    choices: Power[];
  } | null;
  pendingUpgradeChoice: {
    powerIds: string[];
  } | null;
  pendingStanceEnhancement:
    | {
        pathId: 'guardian';
        ironChoice: StanceEnhancement;
        retributionChoice: StanceEnhancement;
      }
    | {
        pathId: 'enchanter';
        arcaneSurgeChoice: StanceEnhancement;
        hexVeilChoice: StanceEnhancement;
      }
    | null;

  // Path progression tracking
  pathProgression: {
    pathId: string;
    pathType: 'active' | 'passive';
    subpathId?: string;
    powerUpgrades?: Array<{ powerId: string; currentTier: 0 | 1 | 2 }>;
  } | null;

  // Combat modifiers
  attackModifiers: AttackModifier[];
  comboCount: number;
  lastPowerUsed: string | null;

  // Ability tracking
  abilityTracking: {
    usedCombatAbilities: string[];
    usedFloorAbilities: string[];
    enemyAttackCounter: number;
    abilityCounters: Record<string, number>;
  };

  // Regen
  healthRegen: number;

  // Animation state
  combatAnimation: {
    type: string;
    progress: number; // 0-1
    powerId?: string;
  } | null;

  visualEffects: {
    flash: { color?: 'white' | 'red' | 'green' | 'gold' } | null;
    shake: boolean;
    hitStop: boolean;
  };

  // Passive effect state for UI display (COPIED from entity, not computed)
  passiveEffects: {
    // From combat state
    damageStacks: number;
    nextAttackBonus: number;
    reflectBonusPercent: number;

    // From floor state
    survivedLethalUsed: boolean;

    // From permanent state
    permanentPowerBonus: number;

    // From computed (pre-computed by system)
    hasSurviveLethal: boolean;
    damageStacksMax: number;
    totalReflectPercent: number;
    totalDamageReduction: number;
    damageAuraPerSecond: number;
    isImmuneToStuns: boolean;
    isImmuneToSlows: boolean;

    // Conditional status (from computed conditional values)
    lastBastionActive: boolean;
    painConduitActive: boolean;
    regenSurgeActive: boolean;
  } | null;
}

/**
 * Compute effective stats by applying stance modifiers to base stats.
 * Returns both the computed value and the modifier for UI display.
 */
function computeEffectiveStats(entity: Entity): PlayerSnapshot['effectiveStats'] {
  const basePower = entity.attack?.baseDamage ?? 0;
  const baseArmor = entity.defense?.value ?? 0;
  const baseSpeed = entity.speed?.value ?? 10;

  const powerMod = getStanceStatModifier(entity, 'power');
  const armorMod = getStanceStatModifier(entity, 'armor');
  const speedMod = getStanceStatModifier(entity, 'speed');

  return {
    power: {
      value: applyStatModifier(basePower, powerMod),
      modifier: powerMod,
    },
    armor: {
      value: applyStatModifier(baseArmor, armorMod),
      modifier: armorMod,
    },
    speed: {
      value: applyStatModifier(baseSpeed, speedMod),
      modifier: speedMod,
    },
  };
}

/**
 * Create a player snapshot from an entity.
 * Returns null if the entity doesn't have required player components.
 */
export function createPlayerSnapshot(entity: Entity): PlayerSnapshot | null {
  if (!entity.player || !entity.health || !entity.identity) {
    return null;
  }

  return {
    // Identity
    name: entity.identity.name,
    characterClass: entity.identity.class,

    // Combat stats
    health: { ...entity.health },
    attack: entity.attack ? { ...entity.attack } : {
      baseDamage: 0,
      critChance: 0,
      critMultiplier: 1,
      variance: { min: 0.85, max: 1.15 },
    },
    defense: entity.defense ? { ...entity.defense } : { value: 0 },
    speed: entity.speed ? {
      value: entity.speed.value,
      attackInterval: entity.speed.attackInterval
    } : { value: 10, attackInterval: 2500 },

    // Fortune and derived stats
    fortune: entity.fortune ?? 0,
    derivedStats: entity.derivedStats ?? {
      critChance: 0,
      critDamage: 1.5,
      dodgeChance: 0,
    },

    // Effective stats (base stats + stance modifiers)
    effectiveStats: computeEffectiveStats(entity),

    // Progression
    level: entity.progression?.level ?? 1,
    xp: entity.progression?.xp ?? 0,
    xpToNext: entity.progression?.xpToNext ?? 100,
    gold: entity.inventory?.gold ?? 0,

    // Abilities
    powers: entity.powers ? [...entity.powers] : [],
    effectivePowers: entity.effectivePowers ?? entity.powers ?? [],
    effectiveStanceEffects: entity.effectiveStanceEffects ?? [],
    // Deep-copy cooldowns Map so mutations to entity don't affect snapshot
    cooldowns: entity.cooldowns
      ? new Map(Array.from(entity.cooldowns.entries()).map(([k, v]) => [k, { ...v }]))
      : new Map(),

    // Equipment
    equipment: entity.equipment ? {
      weapon: entity.equipment.weapon,
      armor: entity.equipment.armor,
      accessory: entity.equipment.accessory,
    } : { weapon: null, armor: null, accessory: null },
    inventory: entity.inventory?.items ? [...entity.inventory.items] : [],

    // Status
    statusEffects: entity.statusEffects ? [...entity.statusEffects] : [],
    buffs: entity.buffs ? [...entity.buffs] : [],
    shield: entity.shield ? { ...entity.shield } : null,
    isDying: !!entity.dying,

    // Path
    path: entity.path ?? null,
    pathResource: entity.pathResource ?? null,
    stanceState: entity.stanceState ?? null,
    pendingAbilityChoice: entity.pendingAbilityChoice ?? false,
    pendingPowerChoice: entity.pendingPowerChoice ? {
      level: entity.pendingPowerChoice.level,
      choices: [...entity.pendingPowerChoice.choices],
    } : null,
    pendingUpgradeChoice: entity.pendingUpgradeChoice ? {
      powerIds: [...entity.pendingUpgradeChoice.powerIds],
    } : null,
    pendingStanceEnhancement: entity.pendingStanceEnhancement
      ? entity.pendingStanceEnhancement.pathId === 'guardian'
        ? {
            pathId: 'guardian' as const,
            ironChoice: { ...entity.pendingStanceEnhancement.ironChoice },
            retributionChoice: { ...entity.pendingStanceEnhancement.retributionChoice },
          }
        : {
            pathId: 'enchanter' as const,
            arcaneSurgeChoice: { ...entity.pendingStanceEnhancement.arcaneSurgeChoice },
            hexVeilChoice: { ...entity.pendingStanceEnhancement.hexVeilChoice },
          }
      : null,

    // Path progression tracking
    pathProgression: entity.pathProgression ? {
      pathId: entity.pathProgression.pathId,
      pathType: entity.pathProgression.pathType,
      subpathId: entity.pathProgression.subpathId,
      powerUpgrades: entity.pathProgression.powerUpgrades
        ? entity.pathProgression.powerUpgrades.map(u => ({ ...u }))
        : undefined,
    } : null,

    // Combat modifiers
    attackModifiers: entity.attackModifiers ? [...entity.attackModifiers] : [],
    comboCount: entity.combo?.count ?? 0,
    lastPowerUsed: entity.combo?.lastPowerUsed ?? null,

    // Ability tracking
    abilityTracking: {
      usedCombatAbilities: entity.abilityTracking?.usedCombatAbilities ? [...entity.abilityTracking.usedCombatAbilities] : [],
      usedFloorAbilities: entity.abilityTracking?.usedFloorAbilities ? [...entity.abilityTracking.usedFloorAbilities] : [],
      enemyAttackCounter: entity.abilityTracking?.enemyAttackCounter ?? 0,
      abilityCounters: entity.abilityTracking?.abilityCounters ? { ...entity.abilityTracking.abilityCounters } : {},
    },

    // Regen
    healthRegen: entity.regen?.healthPerSecond ?? 0,

    // Animation state
    combatAnimation: entity.combatAnimation ? {
      type: entity.combatAnimation.type,
      progress: Math.min(1, ticksToMs(getTick() - entity.combatAnimation.startedAtTick) / entity.combatAnimation.duration),
      powerId: entity.combatAnimation.powerId,
    } : null,

    visualEffects: {
      flash: entity.visualEffects?.flash
        ? { color: entity.visualEffects.flash.color }
        : null,
      shake: !!entity.visualEffects?.shake,
      hitStop: !!entity.visualEffects?.hitStop,
    },

    // Passive effects - PURE COPY from entity state
    passiveEffects: (() => {
      const state = entity.passiveEffectState;
      if (entity.pathProgression?.pathType !== 'passive' || !state) {
        return null;
      }

      const computed = state.computed;
      return {
        // Copy from combat state
        damageStacks: state.combat.damageStacks,
        nextAttackBonus: state.combat.nextAttackBonus,
        reflectBonusPercent: state.combat.reflectBonusPercent,

        // Copy from floor state
        survivedLethalUsed: state.floor.survivedLethal,

        // Copy from permanent state
        permanentPowerBonus: state.permanent.powerBonusPercent,

        // Copy from computed (pure copy, no computation)
        hasSurviveLethal: computed.hasSurviveLethal,
        damageStacksMax: computed.damageStackConfig?.maxStacks ?? 0,
        totalReflectPercent: computed.currentTotalReflectPercent,
        totalDamageReduction: computed.damageReductionPercent,
        damageAuraPerSecond: computed.damageAuraPerSecond,
        isImmuneToStuns: computed.isImmuneToStuns,
        isImmuneToSlows: computed.isImmuneToSlows,

        // Conditional status - read from pre-computed conditional values
        lastBastionActive: computed.conditionalArmorPercent > 0,
        painConduitActive: computed.conditionalReflectMultiplier > 1,
        regenSurgeActive: computed.conditionalRegenMultiplier > 1,
      };
    })(),
  };
}
