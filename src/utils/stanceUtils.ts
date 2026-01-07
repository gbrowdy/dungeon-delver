/**
 * Stance Utility Functions
 *
 * Provides helper functions for applying stance effects in the ECS combat system.
 */

import type { Entity } from '@/ecs/components';
import { getStancesForPath } from '@/data/stances';
import type { StanceEffect, PassiveStance, StanceEnhancement, StanceEnhancementEffect } from '@/types/paths';
import { getGuardianEnhancementById } from '@/data/paths/guardian-enhancements';

// Registry for enhancement lookups
type EnhancementLookup = (enhancementId: string) => StanceEnhancement | undefined;

const enhancementRegistry: Record<string, EnhancementLookup> = {
  guardian: getGuardianEnhancementById,
  // Future paths:
  // chronomancer: getChronomancerEnhancement,
  // shadow: getShadowEnhancement,
  // templar: getTemplarEnhancement,
};

/**
 * Convert a stance enhancement effect to the StanceEffect format
 */
function convertEnhancementToStanceEffect(
  effect: StanceEnhancementEffect
): StanceEffect | null {
  switch (effect.type) {
    case 'armor_percent':
      return { type: 'stat_modifier', stat: 'armor', percentBonus: effect.value / 100 };
    case 'damage_reduction':
      // damage_reduction is incoming damage reduced by X%
      return { type: 'damage_modifier', damageType: 'incoming', multiplier: 1 - effect.value / 100 };
    case 'hp_regen':
      // hp_regen is flat regen, convert to stat_modifier with flatBonus
      return { type: 'stat_modifier', stat: 'health', flatBonus: effect.value, applyTo: 'regen' };
    case 'reflect_percent':
      return { type: 'behavior_modifier', behavior: 'reflect_damage', value: effect.value / 100 };
    case 'cc_immunity':
      // This doesn't map cleanly to current StanceEffect types - skip for now
      return null;
    case 'max_hp_percent':
      return { type: 'stat_modifier', stat: 'maxHealth', percentBonus: effect.value / 100 };
    // Add other effect types as needed - many guardian effects are complex and may need new effect types
    // For now, only convert the simple ones that map directly to existing StanceEffect types
    default:
      return null;
  }
}

/**
 * Get all stance effects from acquired enhancements
 */
function getEnhancementEffects(entity: Entity): StanceEffect[] {
  const stanceProgression = entity.pathProgression?.stanceProgression;
  const pathId = entity.pathProgression?.pathId;
  if (!stanceProgression || !pathId) return [];

  const lookup = enhancementRegistry[pathId];
  if (!lookup) return [];

  const effects: StanceEffect[] = [];
  for (const enhancementId of stanceProgression.acquiredEnhancements) {
    const enhancement = lookup(enhancementId);
    if (enhancement?.effects) {
      // Note: enhancement.effects is an array
      for (const enhEffect of enhancement.effects) {
        const converted = convertEnhancementToStanceEffect(enhEffect);
        if (converted) {
          effects.push(converted);
        }
      }
    }
  }
  return effects;
}

/**
 * Get the currently active stance for an entity
 */
export function getActiveStance(entity: Entity): PassiveStance | null {
  if (!entity.stanceState || !entity.path) return null;

  const stances = getStancesForPath(entity.path.pathId);
  return stances.find(s => s.id === entity.stanceState!.activeStanceId) ?? null;
}

/**
 * Get all effects from the active stance
 */
export function getActiveStanceEffects(entity: Entity): StanceEffect[] {
  const stance = getActiveStance(entity);
  return stance?.effects ?? [];
}

/**
 * Get stat modifier from stance effects for a specific stat
 * @returns percent bonus (e.g., 0.25 for +25%)
 */
export function getStanceStatModifier(
  entity: Entity,
  stat: string
): number {
  const effects = getActiveStanceEffects(entity);
  let percentBonus = 0;

  for (const effect of effects) {
    if (effect.type === 'stat_modifier' && effect.stat === stat) {
      percentBonus += effect.percentBonus ?? 0;
    }
  }

  return percentBonus;
}

/**
 * Get behavior modifier value from stance effects
 * @returns The behavior value (e.g., 0.20 for 20% reflect)
 */
export function getStanceBehavior(
  entity: Entity,
  behavior: string
): number {
  const effects = getActiveStanceEffects(entity);

  for (const effect of effects) {
    if (effect.type === 'behavior_modifier' && effect.behavior === behavior) {
      return effect.value;
    }
  }

  return 0;
}

/**
 * Get damage multiplier from stance effects
 * @param damageType 'incoming' for damage taken, 'outgoing' for damage dealt
 * @returns multiplier (e.g., 0.85 for -15% damage)
 */
export function getStanceDamageMultiplier(
  entity: Entity,
  damageType: 'incoming' | 'outgoing'
): number {
  const effects = getActiveStanceEffects(entity);
  let multiplier = 1;

  for (const effect of effects) {
    if (effect.type === 'damage_modifier' && effect.damageType === damageType) {
      multiplier *= effect.multiplier;
    }
  }

  return multiplier;
}

/**
 * Apply all stance stat modifiers to calculate effective stats
 * Used for display and combat calculations
 */
export function applyStanceStatModifiers(
  entity: Entity,
  basePower: number,
  baseArmor: number,
  baseSpeed: number
): { power: number; armor: number; speed: number } {
  const powerMod = getStanceStatModifier(entity, 'power');
  const armorMod = getStanceStatModifier(entity, 'armor');
  const speedMod = getStanceStatModifier(entity, 'speed');

  return {
    power: Math.round(basePower * (1 + powerMod)),
    armor: Math.round(baseArmor * (1 + armorMod)),
    speed: Math.round(baseSpeed * (1 + speedMod)),
  };
}

/**
 * Compute all effective stance effects (base + enhancements)
 * This merges base stance effects with acquired enhancement effects
 */
export function computeEffectiveStanceEffects(entity: Entity): StanceEffect[] {
  const stance = getActiveStance(entity);
  const baseEffects = stance?.effects ?? [];
  const enhancementEffects = getEnhancementEffects(entity);
  return [...baseEffects, ...enhancementEffects];
}
