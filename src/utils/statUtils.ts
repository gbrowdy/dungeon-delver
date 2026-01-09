// src/utils/statUtils.ts
/**
 * Stat computation utilities for deriving combat stats.
 * Used to compute cached stats that depend on base attributes like fortune.
 */

import { getCritChance, getCritDamage, getDodgeChance } from './fortuneUtils';
import type { Entity } from '@/ecs/components';

/**
 * Compute derived stats from fortune stat.
 * These are cached in the derivedStats component to avoid repeated computation.
 */
export function computeDerivedStats(fortune: number): {
  critChance: number;
  critDamage: number;
  dodgeChance: number;
} {
  return {
    critChance: getCritChance(fortune),
    critDamage: getCritDamage(fortune),
    dodgeChance: getDodgeChance(fortune),
  };
}

/**
 * Recompute and update the derivedStats component on a player entity.
 * Call this whenever fortune changes (equipment, level-up bonuses, etc.).
 */
export function recomputeDerivedStats(player: Entity): void {
  if (!player.fortune) {
    // No fortune stat - use defaults
    player.derivedStats = {
      critChance: 0,
      critDamage: 1.5,
      dodgeChance: 0,
    };
    return;
  }

  player.derivedStats = computeDerivedStats(player.fortune);
}
