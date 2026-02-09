/**
 * Pure utility functions for path resource calculations.
 * These read from PathResource data and return computed values.
 * No state management - that's handled by ECS.
 */

import type { PathResource, ThresholdEffect } from '@/types/game';

/**
 * Get effective cost after threshold reductions
 */
export function getEffectiveCost(resource: PathResource, baseCost: number): number {
  const thresholdEffects = resource.thresholds?.filter(
    t => resource.current >= t.value && t.effect.type === 'cost_reduction'
  ) ?? [];

  let cost = baseCost;
  for (const threshold of thresholdEffects) {
    cost *= (1 - (threshold.effect.value ?? 0));
  }
  return Math.max(1, Math.floor(cost));
}

/**
 * Get all currently active threshold effects
 */
export function getActiveThresholdEffects(resource: PathResource): ThresholdEffect[] {
  return resource.thresholds?.filter(
    t => resource.current >= t.value
  ).map(t => t.effect) ?? [];
}

/**
 * Get cumulative damage multiplier from threshold effects
 */
export function getDamageMultiplier(resource: PathResource): number {
  const damageEffects = resource.thresholds?.filter(
    t => resource.current >= t.value && t.effect.type === 'damage_bonus'
  ) ?? [];

  let multiplier = 1;

  if (resource.type === 'arcane_charges' || resource.type === 'fury') {
    const chargeBonus = damageEffects.find(t => t.effect.value);
    if (chargeBonus) {
      multiplier += (chargeBonus.effect.value ?? 0) * resource.current;
    }
  } else {
    for (const threshold of damageEffects) {
      multiplier += threshold.effect.value ?? 0;
    }
  }

  return multiplier;
}
