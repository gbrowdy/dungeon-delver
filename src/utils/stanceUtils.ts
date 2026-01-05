/**
 * Stance Utility Functions
 *
 * Provides helper functions for applying stance effects in the ECS combat system.
 */

import type { Entity } from '@/ecs/components';
import { getStancesForPath } from '@/data/stances';
import type { StanceEffect, PassiveStance } from '@/types/paths';

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
