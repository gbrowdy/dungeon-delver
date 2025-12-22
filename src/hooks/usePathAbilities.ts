/**
 * Path Ability Effects Processing Hook
 *
 * Centralized processing for path ability effects during combat.
 * Similar to useItemEffects.ts but for the path system.
 *
 * Handles:
 * - Passive stat bonuses (always active)
 * - Trigger-based effects (on_hit, on_crit, on_kill, etc.)
 * - Conditional abilities (HP thresholds, etc.)
 * - All PathAbilityTrigger types
 */

import { useCallback } from 'react';
import { Player, Enemy, Stats, StatusEffect, EnemyStatDebuff, ActiveBuff, AttackModifier } from '@/types/game';
import {
  PathAbility,
  PathAbilityEffect,
  PathAbilityTrigger,
  PathAbilityCondition,
  StatModifier,
  PowerModifier,
  DamageModifier,
  StatusApplication,
  PathDefinition,
} from '@/types/paths';
import { deepClonePlayer } from '@/utils/stateUtils';
import { logError } from '@/utils/gameLogger';
import { WARRIOR_PATHS } from '@/data/paths/warrior';
import { MAGE_PATHS } from '@/data/paths/mage';
import { ROGUE_PATHS } from '@/data/paths/rogue';
import { PALADIN_PATHS } from '@/data/paths/paladin';
import { PATH_PLAYSTYLE_MODIFIERS } from '@/constants/balance';
import { isFeatureEnabled } from '@/constants/features';

/**
 * Neutral modifiers that don't change any values (1.0 multipliers)
 * Used when feature is disabled or player hasn't selected a path yet
 */
const NEUTRAL_MODIFIERS = {
  autoDamageMultiplier: 1.0,
  attackSpeedMultiplier: 1.0,
  powerDamageMultiplier: 1.0,
  cooldownMultiplier: 1.0,
  procChanceMultiplier: 1.0,
  procDamageMultiplier: 1.0,
  armorEffectiveness: 1.0,
  blockEffectiveness: 1.0,
} as const;

/** Type for path playstyle modifiers */
export type PathPlaystyleModifiers = typeof NEUTRAL_MODIFIERS;

/**
 * Get all path definitions from all classes
 * Used internally for path lookups
 */
function getAllPaths(): PathDefinition[] {
  return [
    ...Object.values(WARRIOR_PATHS),
    ...MAGE_PATHS,
    ...ROGUE_PATHS,
    ...PALADIN_PATHS,
  ];
}

/**
 * Get the playstyle modifiers for a player based on their selected path.
 *
 * Active paths: Lower auto damage (-40%), stronger powers (+100%), faster cooldowns (-40%)
 * Passive paths: Higher auto damage (+50%), weaker powers (-50%), enhanced procs (+50%)
 *
 * Returns neutral modifiers (1.0) if:
 * - Feature flag is disabled
 * - No path selected yet (level 1)
 * - Path not found (should never happen)
 *
 * @param player - The player to get modifiers for
 * @returns Path playstyle modifiers object
 */
export function getPathPlaystyleModifiers(player: Player): PathPlaystyleModifiers {
  // Feature flag check - return neutral if disabled
  if (!isFeatureEnabled('PATH_PLAYSTYLE_MODIFIERS')) {
    return NEUTRAL_MODIFIERS;
  }

  // No path selected yet (level 1)
  if (!player.path?.pathId) {
    return NEUTRAL_MODIFIERS;
  }

  // Get path definition to determine if active or passive
  const allPaths = getAllPaths();
  const selectedPath = allPaths.find(p => p.id === player.path!.pathId);

  if (!selectedPath) {
    logError('Unknown path in getPathPlaystyleModifiers', {
      pathId: player.path.pathId,
      playerClass: player.class?.id,
    });
    return NEUTRAL_MODIFIERS;
  }

  // Return the appropriate modifiers based on path type
  if (selectedPath.type === 'active') {
    // Active paths use the active modifiers, but need to fill in missing fields
    return {
      ...NEUTRAL_MODIFIERS,
      autoDamageMultiplier: PATH_PLAYSTYLE_MODIFIERS.active.autoDamageMultiplier,
      attackSpeedMultiplier: PATH_PLAYSTYLE_MODIFIERS.active.attackSpeedMultiplier,
      powerDamageMultiplier: PATH_PLAYSTYLE_MODIFIERS.active.powerDamageMultiplier,
      cooldownMultiplier: PATH_PLAYSTYLE_MODIFIERS.active.cooldownMultiplier,
    };
  } else {
    return PATH_PLAYSTYLE_MODIFIERS.passive;
  }
}

/**
 * Generate a unique ID for debuffs/buffs without module-level state.
 * Uses timestamp + random string to avoid collisions.
 */
function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Context for trigger processing
 */
export interface TriggerContext {
  player: Player;
  enemy?: Enemy;
  damage?: number;
  isCrit?: boolean;
  powerUsed?: string;
  isDodge?: boolean;
  isBlock?: boolean;
}

/**
 * Result of trigger processing
 */
export interface TriggerResult {
  player: Player;                    // Updated player state
  statModifiers?: Partial<Stats>;    // Temporary stat modifications
  healAmount?: number;                // HP to heal
  damageAmount?: number;              // Bonus damage to deal
  manaRestored?: number;              // Mana to restore
  statusToApply?: StatusEffect;       // Status effect to apply to enemy
  enemyDebuffs?: EnemyStatDebuff[];   // Stat debuffs to apply to enemy
  preventDeath?: boolean;             // Whether death was prevented
  reflectedDamage?: number;           // Damage to reflect back
  logs: string[];                     // Combat log messages
}

/**
 * Hook for processing path ability effects during combat.
 *
 * Handles passive stat bonuses, trigger-based effects, and conditional abilities from player's chosen path.
 *
 * @returns Object with methods to process path abilities and retrieve active bonuses
 */
export function usePathAbilities() {
  /**
   * Get an ability counter value
   */
  const getAbilityCounter = useCallback((player: Player, counterId: string): number => {
    return player.abilityCounters?.[counterId] ?? 0;
  }, []);

  /**
   * Increment an ability counter and return the new value
   * Returns updated player with incremented counter
   */
  const incrementAbilityCounter = useCallback((player: Player, counterId: string, maxValue?: number): { player: Player; newValue: number } => {
    const currentValue = player.abilityCounters?.[counterId] ?? 0;
    const newValue = maxValue ? Math.min(currentValue + 1, maxValue) : currentValue + 1;

    return {
      player: {
        ...player,
        abilityCounters: {
          ...player.abilityCounters,
          [counterId]: newValue,
        },
      },
      newValue,
    };
  }, []);

  /**
   * Reset an ability counter to 0
   */
  const resetAbilityCounter = useCallback((player: Player, counterId: string): Player => {
    if (!player.abilityCounters?.[counterId]) return player;

    const newCounters = { ...player.abilityCounters };
    delete newCounters[counterId];

    return {
      ...player,
      abilityCounters: Object.keys(newCounters).length > 0 ? newCounters : undefined,
    };
  }, []);

  /**
   * Add an attack modifier to the player
   */
  const addAttackModifier = useCallback((
    player: Player,
    modifier: Omit<AttackModifier, 'id'>
  ): Player => {
    const newModifier: AttackModifier = {
      ...modifier,
      id: `${modifier.sourceName}_${Date.now()}`,
    };

    return {
      ...player,
      attackModifiers: [...(player.attackModifiers || []), newModifier],
    };
  }, []);

  /**
   * Get a specific path definition by ID
   */
  const getPathById = useCallback((pathId: string): PathDefinition | null => {
    const allPaths: PathDefinition[] = [
      ...Object.values(WARRIOR_PATHS),
      ...MAGE_PATHS,
      ...ROGUE_PATHS,
      ...PALADIN_PATHS,
    ];
    const found = allPaths.find(p => p.id === pathId);
    if (!found) {
      logError('Path not found', {
        pathId,
        availablePaths: allPaths.map(p => p.id),
      });
    }
    return found || null;
  }, []);

  /**
   * Check if a condition is met
   */
  const checkCondition = useCallback((
    condition: PathAbilityCondition,
    context: TriggerContext
  ): boolean => {
    const { player, enemy } = context;

    switch (condition.type) {
      case 'hp_below': {
        const hpPercent = (player.currentStats.health / player.currentStats.maxHealth) * 100;
        return hpPercent < condition.value;
      }
      case 'hp_above': {
        const hpPercent = (player.currentStats.health / player.currentStats.maxHealth) * 100;
        return hpPercent > condition.value;
      }
      case 'hp_threshold': {
        // Support for threshold conditions (value is a ratio 0-1)
        const hpRatio = player.currentStats.health / player.currentStats.maxHealth;
        return hpRatio <= condition.value;
      }
      case 'mana_below': {
        const manaPercent = (player.currentStats.mana / player.currentStats.maxMana) * 100;
        return manaPercent < condition.value;
      }
      case 'mana_above': {
        const manaPercent = (player.currentStats.mana / player.currentStats.maxMana) * 100;
        return manaPercent > condition.value;
      }
      case 'enemy_hp_below': {
        if (!enemy) return false;
        const enemyHpPercent = (enemy.health / enemy.maxHealth) * 100;
        return enemyHpPercent < condition.value;
      }
      case 'combo_count': {
        return player.comboCount >= condition.value;
      }
      case 'attack_count': {
        // For attack-based combos like Holy Avenger - uses abilityCounters
        const attackCount = player.abilityCounters?.[condition.counterId] ?? 0;
        return attackCount >= condition.value;
      }
      case 'enemy_has_status': {
        if (!enemy) return false;
        return (enemy.statusEffects?.length ?? 0) > 0;
      }
      default: {
        logError('Unknown condition type', {
          conditionType: (condition as PathAbilityCondition).type,
          condition,
        });
        return false;
      }
    }
  }, []);

  /**
   * Get all active abilities for a player
   */
  const getActiveAbilities = useCallback((player: Player): PathAbility[] => {
    if (!player.path) return [];

    const pathDef = getPathById(player.path.pathId);
    if (!pathDef) {
      logError('Cannot get abilities: path not found', {
        pathId: player.path.pathId,
        playerClass: player.class,
      });
      return [];
    }

    // Filter abilities that the player has chosen
    const abilities = pathDef.abilities.filter(ability =>
      player.path!.abilities.includes(ability.id)
    );

    // Warn if player has abilities that don't exist in path definition
    const orphanedAbilities = player.path.abilities.filter(
      id => !pathDef.abilities.some(a => a.id === id)
    );
    if (orphanedAbilities.length > 0) {
      logError('Player has abilities not in path definition', {
        orphanedAbilities,
        pathId: player.path.pathId,
        validAbilities: pathDef.abilities.map(a => a.id),
      });
    }

    return abilities;
  }, [getPathById]);

  /**
   * Check if player has a specific ability
   */
  const hasAbility = useCallback((player: Player, abilityId: string): boolean => {
    if (!player.path) return false;
    return player.path.abilities.includes(abilityId);
  }, []);

  /**
   * Calculate passive stat bonuses from all abilities
   * These are always active and should be added to base stats
   */
  const getPassiveStatBonuses = useCallback((player: Player): Partial<Stats> => {
    const abilities = getActiveAbilities(player);
    const bonuses: Partial<Stats> = {};

    abilities.forEach(ability => {
      // Iterate over all effects for this ability
      ability.effects.forEach(effect => {
        // Only process passive or conditional triggers for stat bonuses
        if (effect.trigger !== 'passive' && effect.trigger !== 'conditional') {
          return;
        }

        // Check condition if it's conditional
        if (effect.trigger === 'conditional' && effect.condition) {
          const conditionMet = checkCondition(effect.condition, { player });
          if (!conditionMet) return;
        }

        // Process stat modifiers
        if (effect.statModifiers) {
          effect.statModifiers.forEach((mod: StatModifier) => {
            const stat = mod.stat;

            // Apply flat bonus
            if (mod.flatBonus) {
              bonuses[stat] = (bonuses[stat] || 0) + mod.flatBonus;
            }

            // Apply percentage bonus (as a multiplier on base stat)
            if (mod.percentBonus && player.baseStats[stat] !== undefined) {
              const baseValue = player.baseStats[stat] as number;
              const percentValue = baseValue * mod.percentBonus;
              bonuses[stat] = (bonuses[stat] || 0) + percentValue;
            }

            // Apply scaling bonus (e.g., scalingStat: 'maxHealth', scalingRatio: 0.001 means +1 armor per 1000 max HP)
            if (mod.scalingStat && mod.scalingRatio) {
              const sourceValue = player.currentStats[mod.scalingStat] || player.baseStats[mod.scalingStat] || 0;
              const scaledValue = Math.floor(sourceValue * mod.scalingRatio);
              bonuses[stat] = (bonuses[stat] || 0) + scaledValue;
            }
          });
        }
      });
    });

    return bonuses;
  }, [getActiveAbilities, checkCondition]);

  /**
   * Get passive damage reduction percentage from all abilities
   * Returns a decimal (e.g., 0.10 for 10% reduction)
   */
  const getPassiveDamageReduction = useCallback((player: Player): number => {
    const abilities = getActiveAbilities(player);
    let totalReduction = 0;

    abilities.forEach(ability => {
      ability.effects.forEach(effect => {
        // Only process passive effects
        if (effect.trigger !== 'passive') return;

        // Check for damage_reduction in damageModifier
        if (effect.damageModifier?.type === 'damage_reduction') {
          totalReduction += effect.damageModifier.value / 100; // Convert from percentage to decimal
        }
      });
    });

    return Math.min(totalReduction, 0.75); // Cap at 75% reduction
  }, [getActiveAbilities]);

  /**
   * Process trigger-based abilities
   * Called when a specific trigger occurs during combat
   */
  const processTrigger = useCallback((
    trigger: PathAbilityTrigger,
    context: TriggerContext
  ): TriggerResult => {
    const abilities = getActiveAbilities(context.player);
    const updatedPlayer = deepClonePlayer(context.player);
    const logs: string[] = [];

    let healAmount = 0;
    let damageAmount = 0;
    let manaRestored = 0;
    let reflectedDamage = 0;
    const preventDeath = false;
    let statusToApply: StatusEffect | undefined;
    const enemyDebuffs: EnemyStatDebuff[] = [];

    abilities.forEach(ability => {
      // Iterate over all effects for this ability
      ability.effects.forEach(effect => {
        // Check if this effect matches the trigger
        if (effect.trigger !== trigger) return;

        // Check condition if present
        if (effect.condition) {
          const conditionMet = checkCondition(effect.condition, context);
          if (!conditionMet) return;
        }

        // Check cooldown
        if (effect.cooldown) {
          if (!updatedPlayer.path) return;

          // Initialize cooldowns object if needed
          if (!updatedPlayer.path.abilityCooldowns) {
            updatedPlayer.path.abilityCooldowns = {};
          }

          const cooldownRemaining = updatedPlayer.path.abilityCooldowns[ability.id] || 0;
          if (cooldownRemaining > 0) {
            // Ability is on cooldown, skip
            return;
          }

          // Set cooldown
          updatedPlayer.path.abilityCooldowns[ability.id] = effect.cooldown;
        }

        // Check proc chance
        if (effect.chance !== undefined && Math.random() > effect.chance) {
          return;
        }

        // Process heal effect
        if (effect.heal !== undefined) {
          const healValue = effect.heal;
          healAmount += healValue;
          logs.push(`✨ ${ability.name}: Healed ${healValue} HP`);
        }

        // Process damage effect
        if (effect.damage !== undefined) {
          damageAmount += effect.damage;
          logs.push(`⚔️ ${ability.name}: +${effect.damage} damage`);
        }

        // Process mana restore
        if (effect.manaRestore !== undefined) {
          manaRestored += effect.manaRestore;
          logs.push(`💙 ${ability.name}: Restored ${effect.manaRestore} mana`);
        }

        // Process damage modifier
        if (effect.damageModifier) {
          const mod = effect.damageModifier;

          // Check modifier condition if present
          if (mod.condition) {
            const modConditionMet = checkCondition(mod.condition, context);
            if (!modConditionMet) return;
          }

          switch (mod.type) {
            case 'reflect': {
              if (context.damage) {
                const reflected = Math.floor(context.damage * (mod.value / 100));
                reflectedDamage += reflected;
                logs.push(`🛡️ ${ability.name}: Reflected ${reflected} damage`);
              }
              break;
            }
            case 'lifesteal': {
              if (context.damage) {
                const lifestealAmount = Math.floor(context.damage * (mod.value / 100));
                healAmount += lifestealAmount;
                logs.push(`🩸 ${ability.name}: Life steal +${lifestealAmount} HP`);
              }
              break;
            }
            case 'bonus_damage': {
              // mod.value is a decimal ratio (e.g., 1.5 = 150% of base, 0.5 = 50% bonus)
              // For on_dodge triggers (riposte-style abilities), use player power as the base
              // since there's no incoming damage to modify
              const baseDamage = trigger === 'on_dodge'
                ? context.player.currentStats.power
                : (context.damage || 0);
              const bonusDmg = Math.floor(baseDamage * mod.value);
              damageAmount += bonusDmg;
              logs.push(`💥 ${ability.name}: +${bonusDmg} bonus damage`);
              break;
            }
            case 'convert_heal': {
              if (context.damage) {
                const converted = Math.floor(context.damage * (mod.value / 100));
                healAmount += converted;
                logs.push(`✨ ${ability.name}: Converted ${converted} damage to healing`);
              }
              break;
            }
          }
        }

        // Process status application
        if (effect.statusApplication) {
          const status = effect.statusApplication;

          // Check chance
          if (Math.random() <= status.chance) {
            statusToApply = {
              id: `${status.statusType}_${Date.now()}`,
              type: status.statusType,
              damage: status.damage,
              remainingTurns: status.duration,
              icon: getStatusIcon(status.statusType),
            };
            logs.push(`🎯 ${ability.name}: Applied ${status.statusType}!`);
          }
        }

        // Process stat modifiers (player buffs and enemy debuffs)
        if (effect.statModifiers) {
          effect.statModifiers.forEach(mod => {
            // Process enemy-targeted modifiers (debuffs)
            if (mod.target === 'enemy' && context.enemy) {
              const stat = mod.stat;
              // Only debuff power, armor, or speed
              if (stat === 'power' || stat === 'armor' || stat === 'speed') {
                const reduction = Math.abs(mod.percentBonus || 0);
                if (reduction > 0) {
                  const debuff: EnemyStatDebuff = {
                    id: generateUniqueId(`${ability.id}_${stat}`),
                    stat,
                    percentReduction: reduction,
                    remainingDuration: effect.duration || 5,
                    sourceName: ability.name,
                  };
                  enemyDebuffs.push(debuff);
                  const percentDisplay = Math.round(reduction * 100);
                  logs.push(`🔻 ${ability.name}: Enemy ${stat} reduced by ${percentDisplay}% for ${effect.duration || 5}s`);
                }
              }
            }
            // Process player-targeted modifiers (buffs)
            else if (!mod.target || mod.target === 'self') {
              const stat = mod.stat;
              // Only buff power, armor, speed, fortune
              if (stat === 'power' || stat === 'armor' || stat === 'speed' || stat === 'fortune') {
                const bonus = mod.percentBonus || 0;
                if (bonus > 0 && effect.duration) {
                  updatedPlayer.activeBuffs = updatedPlayer.activeBuffs || [];

                  // Check if a buff from this ability+stat already exists.
                  // IDs are formatted as ability_stat_timestamp_random, so we compare
                  // the first two components (ability ID and stat) explicitly.
                  const existingBuffIndex = updatedPlayer.activeBuffs.findIndex(b => {
                    const parts = b.id.split('_');
                    return parts.length >= 2 && parts[0] === ability.id && parts[1] === stat;
                  });

                  if (existingBuffIndex >= 0) {
                    // Refresh the existing buff's duration instead of adding a new one
                    updatedPlayer.activeBuffs[existingBuffIndex] = {
                      ...updatedPlayer.activeBuffs[existingBuffIndex],
                      remainingTurns: effect.duration,
                    };
                    const percentDisplay = Math.round(bonus * 100);
                    logs.push(`🔄 ${ability.name}: ${stat} buff refreshed (+${percentDisplay}%) for ${effect.duration}s`);
                  } else {
                    // Create a new active buff
                    const buff: ActiveBuff = {
                      id: generateUniqueId(`${ability.id}_${stat}`),
                      name: ability.name,
                      stat,
                      multiplier: 1 + bonus,
                      remainingTurns: effect.duration,
                      icon: ability.icon || '✨',
                    };
                    updatedPlayer.activeBuffs.push(buff);
                    const percentDisplay = Math.round(bonus * 100);
                    logs.push(`⬆️ ${ability.name}: ${stat} increased by ${percentDisplay}% for ${effect.duration}s`);
                  }
                }
              }
            }
          });
        }

        // Process cleanse
        if (effect.cleanse) {
          updatedPlayer.statusEffects = [];
          logs.push(`✨ ${ability.name}: Cleansed all status effects`);
        }

        // Process shield
        if (effect.shield) {
          updatedPlayer.shield = (updatedPlayer.shield || 0) + effect.shield;
          // Use max of current and new duration to prevent shorter shields from reducing duration
          const newDuration = effect.duration || 5;
          updatedPlayer.shieldRemainingDuration = Math.max(updatedPlayer.shieldRemainingDuration || 0, newDuration);
          updatedPlayer.shieldMaxDuration = Math.max(updatedPlayer.shieldMaxDuration || 0, newDuration);
          logs.push(`🛡️ ${ability.name}: Gained ${effect.shield} shield`);
        }
      });
    });

    // Apply heal
    if (healAmount > 0) {
      updatedPlayer.currentStats.health = Math.min(
        updatedPlayer.currentStats.maxHealth,
        updatedPlayer.currentStats.health + healAmount
      );
    }

    // Apply mana restore
    if (manaRestored > 0) {
      updatedPlayer.currentStats.mana = Math.min(
        updatedPlayer.currentStats.maxMana,
        updatedPlayer.currentStats.mana + manaRestored
      );
    }

    return {
      player: updatedPlayer,
      healAmount,
      damageAmount,
      manaRestored,
      statusToApply,
      enemyDebuffs: enemyDebuffs.length > 0 ? enemyDebuffs : undefined,
      preventDeath,
      reflectedDamage,
      logs,
    };
  }, [getActiveAbilities, checkCondition]);

  /**
   * Get power modifiers from path abilities
   * Used to modify power cooldowns, costs, and effectiveness
   */
  const getPowerModifiers = useCallback((player: Player): {
    cooldownReduction: number;
    costReduction: number;
    powerBonus: number;
  } => {
    const abilities = getActiveAbilities(player);
    let cooldownReduction = 0;
    let costReduction = 0;
    let powerBonus = 0;

    abilities.forEach(ability => {
      // Iterate over all effects for this ability
      ability.effects.forEach(effect => {
        // Only process passive modifiers
        if (effect.trigger !== 'passive') return;

        if (effect.powerModifiers) {
          effect.powerModifiers.forEach((mod: PowerModifier) => {
            switch (mod.type) {
              case 'cooldown_reduction':
                cooldownReduction += mod.value;
                break;
              case 'cost_reduction':
                costReduction += mod.value;
                break;
              case 'power_bonus':
                powerBonus += mod.value;
                break;
            }
          });
        }
      });
    });

    return {
      cooldownReduction,
      costReduction,
      powerBonus,
    };
  }, [getActiveAbilities]);

  /**
   * Get HP and mana regen bonuses from path abilities
   * Returns flat bonuses and percent multipliers for regen rates
   */
  const getRegenModifiers = useCallback((player: Player): {
    hpRegen: number;
    hpRegenPercent: number;
    manaRegen: number;
  } => {
    const abilities = getActiveAbilities(player);
    let hpRegen = 0;
    let hpRegenPercent = 0; // Percentage bonus (e.g., 1.0 = +100%)
    let manaRegen = 0;

    abilities.forEach(ability => {
      ability.effects.forEach(effect => {
        if (effect.trigger !== 'passive' && effect.trigger !== 'conditional') return;

        // Check condition if conditional
        if (effect.trigger === 'conditional' && effect.condition) {
          if (!checkCondition(effect.condition, { player })) return;
        }

        if (effect.statModifiers) {
          effect.statModifiers.forEach(mod => {
            if (mod.applyTo !== 'regen') return;

            if (mod.stat === 'health') {
              if (mod.flatBonus) hpRegen += mod.flatBonus;
              if (mod.percentBonus) hpRegenPercent += mod.percentBonus;
              // Support scaling regen (e.g., regen based on armor)
              if (mod.scalingStat && mod.scalingRatio) {
                const sourceValue = player.currentStats[mod.scalingStat] || 0;
                hpRegen += Math.floor(sourceValue * mod.scalingRatio);
              }
            }
            if (mod.stat === 'mana') {
              if (mod.flatBonus) manaRegen += mod.flatBonus;
            }
          });
        }
      });
    });

    return { hpRegen, hpRegenPercent, manaRegen };
  }, [getActiveAbilities, checkCondition]);

  /**
   * Get status immunities from player's path abilities
   * Returns an array of status effect types the player is immune to
   */
  const getStatusImmunities = useCallback((player: Player): StatusEffect['type'][] => {
    const immunities: StatusEffect['type'][] = [];

    if (hasAbility(player, 'immovable_object')) {
      immunities.push('stun', 'slow');
    }

    return immunities;
  }, [hasAbility]);

  /**
   * Get passive enemy debuffs from player's path abilities
   * Returns debuffs that should be applied to enemies when combat starts
   */
  const getPassiveEnemyDebuffs = useCallback((player: Player): { stat: 'speed' | 'power' | 'armor', percentReduction: number, sourceName: string }[] => {
    const debuffs: { stat: 'speed' | 'power' | 'armor', percentReduction: number, sourceName: string }[] = [];

    if (hasAbility(player, 'intimidating_presence')) {
      debuffs.push({
        stat: 'speed',
        percentReduction: 0.10, // 10% slower
        sourceName: 'Intimidating Presence',
      });
    }

    return debuffs;
  }, [hasAbility]);

  /**
   * Check if the player's current path has the combo mechanic.
   * Active paths have combos (rewards timing/skill), passive paths do not.
   */
  const hasComboMechanic = useCallback((player: Player): boolean => {
    if (!player.path) return false;

    const pathDef = getPathById(player.path.pathId);
    if (!pathDef) return false;

    return pathDef.hasComboMechanic;
  }, [getPathById]);

  return {
    getPassiveStatBonuses,
    getPassiveDamageReduction,
    processTrigger,
    hasAbility,
    getActiveAbilities,
    getPowerModifiers,
    getRegenModifiers,
    getStatusImmunities,
    getPassiveEnemyDebuffs,
    getAbilityCounter,
    incrementAbilityCounter,
    resetAbilityCounter,
    addAttackModifier,
    hasComboMechanic,
  };
}

/**
 * Helper to get status effect icon
 */
function getStatusIcon(type: 'poison' | 'stun' | 'slow' | 'bleed'): string {
  switch (type) {
    case 'poison':
      return '☠️';
    case 'stun':
      return '💫';
    case 'slow':
      return '🐌';
    case 'bleed':
      return '🩸';
    default: {
      logError('Unknown status type', { type });
      return '❓';
    }
  }
}
