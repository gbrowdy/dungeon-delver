/**
 * Enemy difficulty and stat scaling logic
 */

import {
  ENEMY_SCALING,
  FLOOR_MULTIPLIERS,
  ENEMY_STAT_SCALING,
  ROOM_SCALING,
} from '@/constants/game';
import { isFeatureEnabled } from '@/constants/features';
import { logError } from '@/utils/gameLogger';

export interface StatMultipliers {
  health: number;
  power: number;
  armor: number;
  speed: number;
}

/**
 * Calculate difficulty multiplier for enemy scaling
 * Uses exponential floor scaling when ENEMY_SCALING_V2 is enabled
 *
 * Note: This function assumes sanitized inputs (floor >= 1, room >= 1).
 * Input validation is handled by generateEnemy() before calling this function.
 */
export function getDifficultyMultiplier(floor: number, room: number): number {
  // Development-time assertion for invalid inputs
  if (import.meta.env.DEV) {
    if (floor < 1 || room < 1 || !Number.isFinite(floor) || !Number.isFinite(room)) {
      logError('getDifficultyMultiplier called with invalid inputs', { floor, room });
    }
  }

  if (!isFeatureEnabled('ENEMY_SCALING_V2')) {
    // Legacy linear scaling
    return 1 + (floor - 1) * ENEMY_SCALING.PER_FLOOR_MULTIPLIER + (room - 1) * ENEMY_SCALING.PER_ROOM_MULTIPLIER;
  }

  // Exponential floor scaling + linear room scaling
  const floorIndex = Math.min(floor - 1, FLOOR_MULTIPLIERS.length - 1);
  const floorMult = FLOOR_MULTIPLIERS[floorIndex];

  // Log if fallback is used - indicates potential misconfiguration
  if (floorMult === undefined) {
    logError('FLOOR_MULTIPLIERS access returned undefined, using fallback', {
      floorIndex,
      floor,
      arrayLength: FLOOR_MULTIPLIERS.length,
    });
    return 1.0 * (1 + (room - 1) * ROOM_SCALING.MULTIPLIER);
  }

  const roomMult = 1 + (room - 1) * ROOM_SCALING.MULTIPLIER;
  return floorMult * roomMult;
}

/**
 * Apply per-stat scaling rates when ENEMY_SCALING_V2 is enabled
 * Different stats scale at different rates to prevent spongy enemies
 */
export function getStatMultipliers(baseMult: number): StatMultipliers {
  // Sanity check - baseMult should always be >= 1.0
  if (!Number.isFinite(baseMult) || baseMult < 0.1) {
    logError('getStatMultipliers received invalid baseMult', { baseMult });
    baseMult = 1.0; // Safe fallback
  }

  if (!isFeatureEnabled('ENEMY_SCALING_V2')) {
    // Legacy: all stats scale uniformly
    return {
      health: baseMult,
      power: baseMult,
      armor: baseMult,
      speed: 1, // Speed doesn't scale in legacy mode
    };
  }

  // New: separate scaling rates for each stat
  // Speed uses additive scaling: starts at 1x, adds scaled portion of difficulty increase
  // Formula: 1 + (baseMult - 1) * rate means at baseMult=3.0 with rate=0.8: 1 + 2*0.8 = 2.6x
  return {
    health: baseMult * ENEMY_STAT_SCALING.HEALTH,
    power: baseMult * ENEMY_STAT_SCALING.POWER,
    armor: baseMult * ENEMY_STAT_SCALING.ARMOR,
    speed: 1 + (baseMult - 1) * ENEMY_STAT_SCALING.SPEED,
  };
}
