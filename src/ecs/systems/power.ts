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

// Query for entities that are casting
const castingQuery = world.with('casting', 'powers', 'mana');

let nextAnimationId = 0;

function getNextAnimationId(): string {
  return `power-anim-${nextAnimationId++}`;
}

function queueAnimationEvent(
  type: AnimationEvent['type'],
  payload: AnimationPayload,
  durationTicks: number = 30
): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.animationEvents) {
    gameState.animationEvents = [];
  }

  const currentTick = getTick();
  gameState.animationEvents.push({
    id: getNextAnimationId(),
    type,
    payload,
    createdAtTick: currentTick,
    displayUntilTick: currentTick + durationTicks,
    consumed: false,
  });
}

function addCombatLog(message: string): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.combatLog) {
    gameState.combatLog = [];
  }

  gameState.combatLog.push(message);

  // Keep last 50 entries
  if (gameState.combatLog.length > 50) {
    gameState.combatLog.shift();
  }
}

function getEntityName(entity: Entity): string {
  if (entity.player) {
    return entity.identity?.name ?? 'Hero';
  }
  if (entity.enemy) {
    return entity.enemy.name;
  }
  return 'Unknown';
}

/**
 * Calculate damage for a power based on the caster's attack stats.
 * Similar to combat damage calculation but uses power value as multiplier.
 */
function calculatePowerDamage(caster: Entity, power: Power, target: Entity): number {
  const baseDamage = caster.attack?.baseDamage ?? 10;
  const multiplier = power.value;

  // Apply variance (similar to combat)
  const variance = caster.attack?.variance ?? { min: 0.85, max: 1.15 };
  const varianceMultiplier = variance.min + Math.random() * (variance.max - variance.min);

  let damage = Math.round(baseDamage * multiplier * varianceMultiplier);

  // Apply target defense
  const defense = target.defense?.value ?? 0;
  damage = Math.max(1, damage - defense);

  return damage;
}

/**
 * Apply a damage power effect to the target enemy.
 */
function applyDamagePower(caster: Entity, power: Power, target: Entity): void {
  const damage = calculatePowerDamage(caster, power, target);

  if (target.health) {
    target.health.current = Math.max(0, target.health.current - damage);
  }

  const casterName = getEntityName(caster);
  const targetName = getEntityName(target);
  addCombatLog(`${casterName} uses ${power.name} for ${damage} damage to ${targetName}`);

  queueAnimationEvent('spell_cast', {
    type: 'spell',
    powerId: power.id,
    value: damage,
  });
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
 */
function applyBuffPower(caster: Entity, power: Power): void {
  if (!caster.buffs) {
    caster.buffs = [];
  }

  // Default buff duration is 6 seconds
  const duration = 6;

  // Determine which stat to buff based on power
  // Default to 'power' stat if not specified
  const stat: 'power' | 'armor' | 'speed' | 'fortune' = 'power';

  const buff = {
    id: `buff-${power.id}-${Date.now()}`,
    name: power.name,
    stat,
    multiplier: 1 + power.value, // e.g., value of 0.5 = 1.5x multiplier
    remainingTurns: duration, // Using remainingTurns for seconds
    icon: power.icon,
  };

  caster.buffs.push(buff);

  const casterName = getEntityName(caster);
  const percentBonus = Math.round(power.value * 100);
  addCombatLog(`${casterName} uses ${power.name} (+${percentBonus}% ${stat} for ${duration}s)`);

  queueAnimationEvent('spell_cast', {
    type: 'spell',
    powerId: power.id,
    value: power.value,
  });
}

/**
 * Apply a debuff power effect to the target enemy.
 */
function applyDebuffPower(caster: Entity, power: Power, target: Entity): void {
  if (!target.statusEffects) {
    target.statusEffects = [];
  }

  // Also deal damage for debuff powers (they typically do damage + debuff)
  const damage = calculatePowerDamage(caster, power, target);

  if (target.health) {
    target.health.current = Math.max(0, target.health.current - damage);
  }

  // Apply a slow effect as default debuff (can be customized per power)
  const debuff: StatusEffect = {
    id: `debuff-${power.id}-${Date.now()}`,
    type: 'slow',
    value: 30, // 30% slow
    remainingTurns: 4, // 4 seconds
    icon: power.icon,
  };

  target.statusEffects.push(debuff);

  const casterName = getEntityName(caster);
  const targetName = getEntityName(target);
  addCombatLog(`${casterName} uses ${power.name} for ${damage} damage and slows ${targetName}`);

  queueAnimationEvent('spell_cast', {
    type: 'spell',
    powerId: power.id,
    value: damage,
  });

  queueAnimationEvent('status_applied', {
    type: 'status',
    effectType: 'slow',
    applied: true,
  });
}

/**
 * Set the cooldown on a power after casting.
 */
function setCooldown(entity: Entity, power: Power): void {
  // Find the power in the entity's powers array and set its cooldown
  const powers = entity.powers;
  if (!powers) return;

  const powerIndex = powers.findIndex(p => p.id === power.id);
  if (powerIndex !== -1) {
    powers[powerIndex].currentCooldown = power.cooldown;
  }
}

export function PowerSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  // Process all entities that are casting
  for (const entity of castingQuery) {
    const castingData = entity.casting;
    if (!castingData) continue;

    // Find the power being cast
    const power = entity.powers?.find(p => p.id === castingData.powerId);
    if (!power) {
      // Power not found - clear casting and continue
      world.removeComponent(entity, 'casting');
      continue;
    }

    // Check if entity has enough mana
    if (entity.mana && entity.mana.current < power.manaCost) {
      // Not enough mana - clear casting
      addCombatLog(`Not enough mana to cast ${power.name}`);
      world.removeComponent(entity, 'casting');
      continue;
    }

    // Deduct mana cost
    if (entity.mana) {
      entity.mana.current = Math.max(0, entity.mana.current - power.manaCost);
    }

    // Get target for damage/debuff powers
    const target = entity.player ? getActiveEnemy() : getPlayer();

    // Apply power effect based on type
    switch (power.effect) {
      case 'damage':
        if (target && !target.dying) {
          applyDamagePower(entity, power, target);
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
          applyDebuffPower(entity, power, target);
        }
        break;
    }

    // Set cooldown on the power
    setCooldown(entity, power);

    // Clear the casting component
    world.removeComponent(entity, 'casting');
  }
}
