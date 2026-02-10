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
import { WARRIOR_PATHS } from '@/data/paths/warrior';
import { MAGE_PATHS } from '@/data/paths/mage';
import { ROGUE_PATHS } from '@/data/paths/rogue';
import { PALADIN_PATHS } from '@/data/paths/paladin';

// Counter for generating unique debuff IDs (avoids collision when multiple debuffs applied in same millisecond)
let debuffIdCounter = 0;

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
      console.warn(`[usePathAbilities] Path not found: "${pathId}". Available paths: ${allPaths.map(p => p.id).join(', ')}`);
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
      case 'enemy_has_status': {
        if (!enemy) return false;
        return (enemy.statusEffects?.length ?? 0) > 0;
      }
      default: {
        console.error(`[usePathAbilities] Unknown condition type: "${(condition as PathAbilityCondition).type}". Condition will be treated as not met.`);
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
      console.error(`[usePathAbilities] Cannot get abilities: path "${player.path.pathId}" not found`);
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
      console.warn(`[usePathAbilities] Player has abilities not in path definition: ${orphanedAbilities.join(', ')}`);
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
              // mod.value is a decimal ratio (e.g., 2.0 = 200% bonus, 0.5 = 50% bonus)
              const bonusDmg = Math.floor((context.damage || 0) * mod.value);
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
                    id: `${ability.id}_${stat}_${Date.now()}_${debuffIdCounter++}`,
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
                  // Create an active buff
                  const buff: ActiveBuff = {
                    id: `${ability.id}_${stat}_${Date.now()}_${debuffIdCounter++}`,
                    name: ability.name,
                    stat,
                    multiplier: 1 + bonus,
                    remainingTurns: effect.duration,
                    icon: ability.icon || '✨',
                  };
                  updatedPlayer.activeBuffs = updatedPlayer.activeBuffs || [];
                  updatedPlayer.activeBuffs.push(buff);
                  const percentDisplay = Math.round(bonus * 100);
                  logs.push(`⬆️ ${ability.name}: ${stat} increased by ${percentDisplay}% for ${effect.duration}s`);
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
   * Returns flat bonuses to add to base regen rates
   */
  const getRegenModifiers = useCallback((player: Player): { hpRegen: number; manaRegen: number } => {
    const abilities = getActiveAbilities(player);
    let hpRegen = 0;
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
              // Support scaling regen (e.g., regen based on missing HP)
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

    return { hpRegen, manaRegen };
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
      console.warn(`[usePathAbilities] Unknown status type: "${type}"`);
      return '❓';
    }
  }
}
