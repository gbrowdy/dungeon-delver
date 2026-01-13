// src/ecs/snapshots/types.ts
/**
 * Shared utility types and functions for snapshot creation.
 */

import { TICK_MS } from '../loop';

/**
 * Deep readonly type helper - makes all nested properties readonly.
 * Handles arrays, Maps, Sets, and plain objects recursively.
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

/**
 * Convert ticks to milliseconds.
 */
export function ticksToMs(tickCount: number): number {
  return tickCount * TICK_MS;
}

/**
 * Apply a stat modifier with smart rounding:
 * - Positive bonuses use Math.ceil (always at least +1)
 * - Negative penalties use Math.floor (always at least -1)
 * - Zero modifier returns base value unchanged
 */
export function applyStatModifier(base: number, modifier: number): number {
  if (modifier === 0) return base;
  const modified = base * (1 + modifier);
  // For positive bonuses, round up to ensure at least +1
  // For negative penalties, round down to ensure at least -1
  if (modifier > 0) {
    return Math.max(base + 1, Math.ceil(modified));
  } else {
    return Math.min(base - 1, Math.floor(modified));
  }
}
