// src/ecs/systems/path-ability/effects.ts
/**
 * Effect processing for path abilities.
 * Applies heals, damage, status effects, buffs, debuffs, shields.
 */

import type { Entity } from '@/ecs/components';
import type {
  PathAbility,
  PathAbilityEffect,
  StatusApplication,
} from '@/types/paths';
import type { StatusEffect, EnemyStatDebuff, ActiveBuff } from '@/types/game';
import { queueAnimationEvent, addCombatLog } from '@/ecs/utils';
import { checkCondition } from './conditions';
import type { TriggerContext } from './triggers';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a unique ID for buffs/debuffs.
 */
function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get status effect icon ID.
 */
function getStatusIcon(type: 'poison' | 'stun' | 'slow' | 'bleed'): string {
  switch (type) {
    case 'poison':
      return 'status-poison';
    case 'stun':
      return 'status-stun';
    case 'slow':
      return 'status-slow';
    case 'bleed':
      return 'status-bleed';
    default:
      return 'status-unknown';
  }
}

// ============================================================================
// EFFECT APPLICATIONS
// ============================================================================

/**
 * Apply heal effect to player.
 */
function applyHeal(player: Entity, amount: number, abilityName: string, isPercentage: boolean = false): void {
  if (!player.health) return;

  let healAmount = amount;

  // If the heal value is small (< 100), treat it as percentage of max health
  if (isPercentage || (amount > 0 && amount < 100)) {
    healAmount = Math.floor(player.health.max * (amount / 100));
  }

  const oldHealth = player.health.current;
  const newHealth = Math.min(player.health.max, oldHealth + healAmount);
  const actualHeal = newHealth - oldHealth;

  if (actualHeal > 0) {
    player.health.current = newHealth;
    addCombatLog(`${abilityName}: Healed ${actualHeal} HP`);
    queueAnimationEvent('item_proc', {
      type: 'heal',
      value: actualHeal,
      source: abilityName,
    });
  }
}

/**
 * Apply damage to enemy.
 */
function applyDamageToEnemy(enemy: Entity, amount: number, abilityName: string, isReflect: boolean = false): void {
  if (!enemy.health || enemy.dying) return;

  enemy.health.current = Math.max(0, enemy.health.current - amount);

  const logMessage = isReflect
    ? `${abilityName}: Reflected ${amount} damage`
    : `${abilityName}: +${amount} bonus damage`;

  addCombatLog(logMessage);
  queueAnimationEvent('item_proc', {
    type: 'item',
    itemName: abilityName,
    effectDescription: `${amount} damage`,
  });
}

/**
 * Apply status effect to enemy.
 */
function applyStatusToEnemy(enemy: Entity, status: StatusApplication, abilityName: string, baseDamage?: number): void {
  if (!enemy || enemy.dying) return;

  // Check proc chance
  if (Math.random() > status.chance) return;

  if (!enemy.statusEffects) {
    enemy.statusEffects = [];
  }

  // Calculate damage for bleed (percentage of base damage)
  let statusDamage = status.damage;
  if (status.statusType === 'bleed' && baseDamage && status.damage) {
    statusDamage = Math.floor(baseDamage * (status.damage / 100));
  }

  const newStatus: StatusEffect = {
    id: `${status.statusType}_${Date.now()}`,
    type: status.statusType,
    damage: statusDamage,
    remainingTurns: status.duration,
    icon: getStatusIcon(status.statusType),
  };

  enemy.statusEffects.push(newStatus);
  addCombatLog(`${abilityName}: Applied ${status.statusType}!`);
  queueAnimationEvent('status_applied', {
    type: 'status',
    effectType: status.statusType,
    applied: true,
  });
}

/**
 * Apply shield to player.
 */
function applyShield(player: Entity, amount: number, duration: number, abilityName: string): void {
  if (!player.shield) {
    player.shield = { value: 0, remaining: 0, maxDuration: 0 };
  }

  player.shield.value = (player.shield.value || 0) + amount;
  player.shield.remaining = Math.max(player.shield.remaining || 0, duration);
  player.shield.maxDuration = Math.max(player.shield.maxDuration || 0, duration);

  addCombatLog(`${abilityName}: Gained ${amount} shield`);
}

/**
 * Apply buff to player.
 */
function applyBuff(
  player: Entity,
  stat: 'power' | 'armor' | 'speed' | 'fortune',
  percentBonus: number,
  duration: number,
  abilityName: string,
  abilityId: string,
  icon: string
): void {
  if (!player.buffs) {
    player.buffs = [];
  }

  // Check if a buff from this ability+stat already exists
  const existingBuffIndex = player.buffs.findIndex(b => {
    const parts = b.id.split('_');
    return parts.length >= 2 && parts[0] === abilityId && parts[1] === stat;
  });

  if (existingBuffIndex >= 0) {
    // Refresh the existing buff's duration
    player.buffs[existingBuffIndex] = {
      ...player.buffs[existingBuffIndex],
      remainingTurns: duration,
    };
    const percentDisplay = Math.round(percentBonus * 100);
    addCombatLog(`${abilityName}: ${stat} buff refreshed (+${percentDisplay}%) for ${duration}s`);
  } else {
    // Create a new buff
    const buff: ActiveBuff = {
      id: generateUniqueId(`${abilityId}_${stat}`),
      name: abilityName,
      stat,
      multiplier: 1 + percentBonus,
      remainingTurns: duration,
      icon: icon || 'buff',
    };
    player.buffs.push(buff);
    const percentDisplay = Math.round(percentBonus * 100);
    addCombatLog(`${abilityName}: ${stat} increased by ${percentDisplay}% for ${duration}s`);
  }
}

/**
 * Apply debuff to enemy.
 */
function applyDebuffToEnemy(
  enemy: Entity,
  stat: 'power' | 'armor' | 'speed',
  percentReduction: number,
  duration: number,
  abilityName: string,
  abilityId: string
): void {
  if (!enemy || enemy.dying) return;

  if (!enemy.statDebuffs) {
    enemy.statDebuffs = [];
  }

  const debuff: EnemyStatDebuff = {
    id: generateUniqueId(`${abilityId}_${stat}`),
    stat,
    percentReduction,
    remainingDuration: duration,
    sourceName: abilityName,
  };

  enemy.statDebuffs.push(debuff);
  const percentDisplay = Math.round(percentReduction * 100);
  addCombatLog(`${abilityName}: Enemy ${stat} reduced by ${percentDisplay}% for ${duration}s`);
}

// ============================================================================
// MAIN EFFECT PROCESSOR
// ============================================================================

/**
 * Process a single effect for an ability.
 */
export function processEffect(
  effect: PathAbilityEffect,
  ability: PathAbility,
  player: Entity,
  enemy: Entity | undefined,
  context: TriggerContext
): void {
  // Process heal effect
  if (effect.heal !== undefined && effect.heal > 0) {
    applyHeal(player, effect.heal, ability.name, true);
  }

  // Process damage effect (bonus damage)
  if (effect.damage !== undefined && effect.damage > 0 && enemy) {
    applyDamageToEnemy(enemy, effect.damage, ability.name);
  }

  // Process damage modifier
  if (effect.damageModifier) {
    const mod = effect.damageModifier;

    // Check modifier condition if present
    if (mod.condition && !checkCondition(mod.condition, player, enemy)) {
      return;
    }

    switch (mod.type) {
      case 'reflect': {
        if (context.damage && enemy) {
          // mod.value can be a decimal (0.15) or percentage-like (15)
          const reflectRatio = mod.value < 1 ? mod.value : mod.value / 100;
          const reflected = Math.floor(context.damage * reflectRatio);
          applyDamageToEnemy(enemy, reflected, ability.name, true);
        }
        break;
      }
      case 'lifesteal': {
        if (context.damage) {
          const lifestealAmount = Math.floor(context.damage * (mod.value / 100));
          applyHeal(player, lifestealAmount, ability.name, false);
        }
        break;
      }
      case 'bonus_damage': {
        if (enemy) {
          const baseDamage = context.damage || player.attack?.baseDamage || 0;
          const bonusDmg = Math.floor(baseDamage * mod.value);
          applyDamageToEnemy(enemy, bonusDmg, ability.name);
        }
        break;
      }
      case 'convert_heal': {
        if (context.damage) {
          const converted = Math.floor(context.damage * (mod.value / 100));
          applyHeal(player, converted, ability.name, false);
        }
        break;
      }
      // damage_reduction is a passive effect, handled in stat calculation
    }
  }

  // Process status application
  if (effect.statusApplication && enemy) {
    applyStatusToEnemy(enemy, effect.statusApplication, ability.name, context.damage);
  }

  // Process stat modifiers (buffs and debuffs)
  if (effect.statModifiers) {
    effect.statModifiers.forEach(mod => {
      // Process enemy-targeted modifiers (debuffs)
      if (mod.target === 'enemy' && enemy) {
        const stat = mod.stat;
        if (stat === 'power' || stat === 'armor' || stat === 'speed') {
          const reduction = Math.abs(mod.percentBonus || 0);
          if (reduction > 0) {
            applyDebuffToEnemy(enemy, stat, reduction, effect.duration || 5, ability.name, ability.id);
          }
        }
      }
      // Process player-targeted modifiers (buffs)
      else if (!mod.target || mod.target === 'self') {
        const stat = mod.stat;
        if ((stat === 'power' || stat === 'armor' || stat === 'speed' || stat === 'fortune') && effect.duration) {
          const bonus = mod.percentBonus || 0;
          if (bonus > 0) {
            applyBuff(player, stat, bonus, effect.duration, ability.name, ability.id, ability.icon);
          }
        }
      }
    });
  }

  // Process cleanse
  if (effect.cleanse && player.statusEffects) {
    player.statusEffects = [];
    addCombatLog(`${ability.name}: Cleansed all status effects`);
  }

  // Process shield
  if (effect.shield && effect.shield > 0) {
    applyShield(player, effect.shield, effect.duration || 5, ability.name);
  }
}
