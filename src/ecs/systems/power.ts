// src/ecs/systems/power.ts
/**
 * PowerSystem - handles power casting effects.
 * Processes entities with the casting component and applies power effects.
 * Runs after CombatSystem to allow manual power usage during combat.
 */

import { world } from '../world';
import { getPlayer, getActiveEnemy, getGameState } from '../queries';
import { getTick } from '../loop';
import type { Entity, AnimationEvent, AnimationPayload } from '../components';
import type { Power, StatusEffect } from '@/types/game';
import { recordPathTrigger } from './path-ability';
import { queueAnimationEvent, addCombatLog, getEntityName } from '../utils';

// Query for entities that are casting
const castingQuery = world.with('casting', 'powers');

/**
 * Calculate damage for a power based on the caster's attack stats.
 * Similar to combat damage calculation but uses power value as multiplier.
 *
 * @param resourceValueForThreshold - The resource value to use for threshold checks.
 *   For spend-type resources (Fury), this should be the value BEFORE spending.
 *   For gain-type resources (Arcane Charges), this should be the value AFTER gaining.
 */
function calculatePowerDamage(
  caster: Entity,
  power: Power,
  target: Entity,
  resourceValueForThreshold?: number
): number {
  const baseDamage = caster.attack?.baseDamage ?? 10;
  let multiplier = power.value;

  // === Execute mechanics: bonus damage vs low HP enemies ===
  if (power.executeThreshold && power.executeMultiplier && target.health) {
    const targetHpPercent = target.health.current / target.health.max;
    if (targetHpPercent < power.executeThreshold) {
      multiplier *= power.executeMultiplier;
    }
  }

  // === Conditional damage bonus: bonus damage if player below HP threshold ===
  if (power.hpThreshold && power.bonusMultiplier && caster.health) {
    const casterHpPercent = caster.health.current / caster.health.max;
    if (casterHpPercent < power.hpThreshold) {
      multiplier *= (1 + power.bonusMultiplier);
    }
  }

  // Apply variance (similar to combat)
  const variance = caster.attack?.variance ?? { min: 0.85, max: 1.15 };
  const varianceMultiplier = variance.min + Math.random() * (variance.max - variance.min);

  let damage = Math.round(baseDamage * multiplier * varianceMultiplier);

  // Apply amplify threshold bonuses from pathResource
  if (caster.pathResource?.thresholds && resourceValueForThreshold !== undefined) {
    for (const threshold of caster.pathResource.thresholds) {
      if (resourceValueForThreshold >= threshold.value) {
        if (threshold.effect.type === 'damage_bonus') {
          // For arcane_charges and fury, bonus is per-point (0.5% per charge/fury point)
          if (caster.pathResource.type === 'arcane_charges' || caster.pathResource.type === 'fury') {
            const bonus = resourceValueForThreshold * threshold.effect.value;
            damage = Math.round(damage * (1 + bonus));
          } else {
            // Fixed bonus for other resource types
            damage = Math.round(damage * (1 + threshold.effect.value));
          }
        }
      }
    }
  }

  // Apply target defense
  const defense = target.defense?.value ?? 0;
  damage = Math.max(1, damage - defense);

  return damage;
}

/**
 * Apply a damage power effect to the target enemy.
 * Handles special mechanics: stun, self-damage, lifesteal, death immunity, CD reset
 */
function applyDamagePower(
  caster: Entity,
  power: Power,
  target: Entity,
  resourceValueForThreshold?: number
): void {
  const damage = calculatePowerDamage(caster, power, target, resourceValueForThreshold);
  const oldTargetHealth = target.health?.current ?? 0;

  if (target.health) {
    target.health.current = Math.max(0, target.health.current - damage);
  }

  const casterName = getEntityName(caster);
  const targetName = getEntityName(target);
  const targetDied = (target.health?.current ?? 0) <= 0;

  // If target died, immediately clear their pending attack to prevent posthumous hits
  if (targetDied && target.attackReady) {
    world.removeComponent(target, 'attackReady');
  }

  // Build log message with any special effects
  let logMessage = `${casterName} uses ${power.name} for ${damage} damage to ${targetName}`;

  // === Stun application ===
  if (power.stunDuration && power.stunDuration > 0) {
    if (!target.statusEffects) {
      target.statusEffects = [];
    }
    target.statusEffects.push({
      id: `stun-${power.id}-${Date.now()}`,
      type: 'stun',
      value: 0,
      remainingTurns: power.stunDuration,
      icon: 'shield-alert',
    });
    logMessage += ` (stunned for ${power.stunDuration}s)`;

    queueAnimationEvent('status_applied', {
      type: 'status',
      effectType: 'stun',
      applied: true,
    });
  }

  // === Lifesteal: heal based on damage dealt ===
  if (power.lifestealPercent && power.lifestealPercent > 0 && caster.health) {
    const healAmount = Math.round(damage * (power.lifestealPercent / 100));
    if (healAmount > 0) {
      const oldHealth = caster.health.current;
      caster.health.current = Math.min(caster.health.max, caster.health.current + healAmount);
      const actualHeal = caster.health.current - oldHealth;
      if (actualHeal > 0) {
        logMessage += ` (healed ${actualHeal} HP)`;
      }
    }
  }

  // === Self-damage (sacrifice powers) ===
  if (power.selfDamagePercent && power.selfDamagePercent > 0 && caster.health) {
    const selfDamage = Math.round(caster.health.max * (power.selfDamagePercent / 100));
    caster.health.current = Math.max(1, caster.health.current - selfDamage); // Min 1 HP to avoid instant death
    logMessage += ` (lost ${selfDamage} HP)`;
  }

  // === Death immunity: apply status effect ===
  if (power.deathImmunityDuration && power.deathImmunityDuration > 0) {
    if (!caster.statusEffects) {
      caster.statusEffects = [];
    }
    caster.statusEffects.push({
      id: `death_immunity-${power.id}-${Date.now()}`,
      type: 'death_immunity',
      value: 0,
      remainingTurns: power.deathImmunityDuration,
      icon: 'shield-check',
    });
    logMessage += ` (death immune for ${power.deathImmunityDuration}s)`;
  }

  // === Cooldown reset on kill ===
  if (power.resetCooldownsOnKill && targetDied && caster.cooldowns) {
    caster.cooldowns.clear();
    logMessage += ' (all cooldowns reset!)';
  }

  addCombatLog(logMessage);

  queueAnimationEvent('spell_cast', {
    type: 'spell',
    powerId: power.id,
    value: damage,
  });

  // If target died, queue enemy_hit event with targetDied=true for death animation
  // This ensures the death animation plays even for power kills (not just auto-attacks)
  if (targetDied) {
    queueAnimationEvent('enemy_hit', {
      type: 'damage',
      value: damage,
      isCrit: false,
      targetDied: true,
    });
  }
}

/**
 * Apply a heal power effect to the caster.
 */
function applyHealPower(caster: Entity, power: Power): void {
  if (!caster.health) return;

  // Value < 1 means percentage of max health, >= 1 means flat heal
  const healAmount = power.value < 1
    ? Math.round(caster.health.max * power.value)
    : Math.round(power.value);

  const oldHealth = caster.health.current;
  caster.health.current = Math.min(caster.health.max, caster.health.current + healAmount);
  const actualHeal = caster.health.current - oldHealth;

  const casterName = getEntityName(caster);
  addCombatLog(`${casterName} uses ${power.name} and heals for ${actualHeal} HP`);

  queueAnimationEvent('spell_cast', {
    type: 'heal',
    value: actualHeal,
    source: power.name,
  });
}

/**
 * Apply a buff power effect to the caster.
 * Handles multi-stat buffs via buffStats array.
 */
function applyBuffPower(caster: Entity, power: Power): void {
  if (!caster.buffs) {
    caster.buffs = [];
  }

  // Use power's custom duration or default to 6 seconds
  const duration = power.buffDuration ?? 6;
  const casterName = getEntityName(caster);

  // === Multi-stat buffs (buffStats array) ===
  if (power.buffStats && power.buffStats.length > 0) {
    const buffDescriptions: string[] = [];

    for (const statBuff of power.buffStats) {
      const buff = {
        id: `buff-${power.id}-${statBuff.stat}-${Date.now()}`,
        name: power.name,
        stat: statBuff.stat,
        multiplier: 1 + statBuff.value,
        remainingTurns: duration,
        icon: power.icon,
      };
      caster.buffs.push(buff);

      const percentBonus = Math.round(statBuff.value * 100);
      buffDescriptions.push(`+${percentBonus}% ${statBuff.stat}`);
    }

    addCombatLog(`${casterName} uses ${power.name} (${buffDescriptions.join(', ')} for ${duration}s)`);
  } else {
    // Fallback: single stat buff using power.value
    const stat: 'power' | 'armor' | 'speed' | 'fortune' = 'power';

    const buff = {
      id: `buff-${power.id}-${Date.now()}`,
      name: power.name,
      stat,
      multiplier: 1 + power.value,
      remainingTurns: duration,
      icon: power.icon,
    };

    caster.buffs.push(buff);

    const percentBonus = Math.round(power.value * 100);
    addCombatLog(`${casterName} uses ${power.name} (+${percentBonus}% ${stat} for ${duration}s)`);
  }

  queueAnimationEvent('spell_cast', {
    type: 'spell',
    powerId: power.id,
    value: power.value,
  });
}

/**
 * Apply a debuff power effect to the target enemy.
 * Handles special mechanics: stun, enemy damage debuff
 */
function applyDebuffPower(
  caster: Entity,
  power: Power,
  target: Entity,
  resourceValueForThreshold?: number
): void {
  if (!target.statusEffects) {
    target.statusEffects = [];
  }

  // Deal damage for debuff powers (if value > 0)
  const damage = power.value > 0
    ? calculatePowerDamage(caster, power, target, resourceValueForThreshold)
    : 0;

  if (damage > 0 && target.health) {
    target.health.current = Math.max(0, target.health.current - damage);
  }

  const targetDied = (target.health?.current ?? 0) <= 0;
  const casterName = getEntityName(caster);
  const targetName = getEntityName(target);
  const effects: string[] = [];

  // If target died from debuff damage, immediately clear their pending attack
  if (targetDied && target.attackReady) {
    world.removeComponent(target, 'attackReady');
  }

  // === Stun application ===
  if (power.stunDuration && power.stunDuration > 0) {
    target.statusEffects.push({
      id: `stun-${power.id}-${Date.now()}`,
      type: 'stun',
      value: 0,
      remainingTurns: power.stunDuration,
      icon: 'shield-alert',
    });
    effects.push(`stunned for ${power.stunDuration}s`);

    queueAnimationEvent('status_applied', {
      type: 'status',
      effectType: 'stun',
      applied: true,
    });
  }

  // === Enemy damage debuff ===
  if (power.enemyDamageDebuff && power.enemyDamageDebuff > 0) {
    const debuffDuration = power.enemyDebuffDuration ?? 8;
    target.statusEffects.push({
      id: `damage_debuff-${power.id}-${Date.now()}`,
      type: 'weaken',
      value: power.enemyDamageDebuff,
      remainingTurns: debuffDuration,
      icon: 'arrow-down',
    });
    effects.push(`-${power.enemyDamageDebuff}% damage for ${debuffDuration}s`);

    queueAnimationEvent('status_applied', {
      type: 'status',
      effectType: 'weaken',
      applied: true,
    });
  }

  // Fallback: default slow effect if no special debuffs
  if (!power.stunDuration && !power.enemyDamageDebuff) {
    target.statusEffects.push({
      id: `debuff-${power.id}-${Date.now()}`,
      type: 'slow',
      value: 30,
      remainingTurns: 4,
      icon: power.icon,
    });
    effects.push('slowed');

    queueAnimationEvent('status_applied', {
      type: 'status',
      effectType: 'slow',
      applied: true,
    });
  }

  // Build log message
  let logMessage = `${casterName} uses ${power.name}`;
  if (damage > 0) {
    logMessage += ` for ${damage} damage`;
  }
  if (effects.length > 0) {
    logMessage += damage > 0 ? ` (${effects.join(', ')})` : `: ${effects.join(', ')}`;
  }
  addCombatLog(logMessage);

  queueAnimationEvent('spell_cast', {
    type: 'spell',
    powerId: power.id,
    value: damage,
  });

  // If target died from debuff damage, queue enemy_hit event for death animation
  if (targetDied && damage > 0) {
    queueAnimationEvent('enemy_hit', {
      type: 'damage',
      value: damage,
      isCrit: false,
      targetDied: true,
    });
  }
}

/**
 * Set the cooldown on a power after casting.
 * Cooldown state is stored in entity.cooldowns Map (single source of truth).
 */
function setCooldown(entity: Entity, power: Power): void {
  if (!entity.cooldowns) {
    entity.cooldowns = new Map();
  }
  entity.cooldowns.set(power.id, { remaining: power.cooldown, base: power.cooldown });
}

export function PowerSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  // Process all entities that are casting
  for (const entity of castingQuery) {
    const castingData = entity.casting;
    if (!castingData) continue;

    // Find the power being cast
    // Prefer effectivePowers (with upgrades) over base powers
    const power = entity.effectivePowers?.find(p => p.id === castingData.powerId)
      ?? entity.powers?.find(p => p.id === castingData.powerId);
    if (!power) {
      // Power not found - clear casting and continue
      world.removeComponent(entity, 'casting');
      continue;
    }

    // Check resource requirements and track value for threshold calculations
    // Priority: pathResource (active paths) > mana (pre-level-2)
    let resourceValueForThreshold: number | undefined;

    if (entity.pathResource && entity.pathResource.type !== 'mana') {
      const resource = entity.pathResource;
      const cost = power.resourceCost ?? power.manaCost;

      if (resource.resourceBehavior === 'gain') {
        // Arcane Charges: casting ADDS to resource
        const newValue = resource.current + cost;
        if (newValue > resource.max) {
          addCombatLog(`Arcane overload! Cannot cast ${power.name}`);
          world.removeComponent(entity, 'casting');
          continue;
        }
        resource.current = newValue;
        // For gain-type, use value AFTER gaining
        resourceValueForThreshold = newValue;
      } else {
        // Fury/Momentum/Zeal: casting COSTS resource
        // Save value BEFORE spending for threshold check
        resourceValueForThreshold = resource.current;

        if (resource.current < cost) {
          const resourceName = resource.type.replace('_', ' ');
          addCombatLog(`Not enough ${resourceName} to cast ${power.name}`);
          world.removeComponent(entity, 'casting');
          continue;
        }
        resource.current -= cost;
      }
    } else if (entity.mana) {
      // Pre-level-2: use mana
      if (entity.mana.current < power.manaCost) {
        addCombatLog(`Not enough mana to cast ${power.name}`);
        world.removeComponent(entity, 'casting');
        continue;
      }
      entity.mana.current = Math.max(0, entity.mana.current - power.manaCost);
    }

    // Get target for damage/debuff powers
    const target = entity.player ? getActiveEnemy() : getPlayer();

    // Apply power effect based on type
    switch (power.effect) {
      case 'damage':
        if (target && !target.dying) {
          applyDamagePower(entity, power, target, resourceValueForThreshold);
        }
        break;

      case 'heal':
        applyHealPower(entity, power);
        break;

      case 'buff':
        applyBuffPower(entity, power);
        break;

      case 'debuff':
        if (target && !target.dying) {
          applyDebuffPower(entity, power, target, resourceValueForThreshold);
        }
        break;
    }

    // Set cooldown on the power
    setCooldown(entity, power);

    // Record path ability trigger for power usage (player only)
    if (entity.player) {
      recordPathTrigger('on_power_use', { powerId: power.id });
    }

    // Clear the casting component
    world.removeComponent(entity, 'casting');
  }
}
