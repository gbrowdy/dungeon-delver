/**
 * Speed Calculation Utilities
 *
 * These utilities handle speed-to-attack-interval conversions with optional soft caps.
 * Speed determines how quickly a combatant attacks.
 */

import { isFeatureEnabled } from '@/constants/features';
import { COMBAT_BALANCE } from '@/constants/balance';

/**
 * Calculate speed multiplier with optional soft cap.
 *
 * With SPEED_SOFT_CAP enabled:
 * - Speed 1-12: Linear scaling (0.1x → 1.2x)
 * - Speed 12+: Soft cap with diminished scaling
 *   - Speed 15 = 1.32x, Speed 20 = 1.52x, Speed 25 = 1.72x
 *
 * Legacy: Square root scaling for diminishing returns
 *
 * @param speed - The combatant's speed stat
 * @returns Attack speed multiplier (higher = faster attacks)
 */
export function getSpeedMultiplier(speed: number): number {
  const clampedSpeed = Math.max(1, Math.min(50, speed));

  if (!isFeatureEnabled('SPEED_SOFT_CAP')) {
    // Legacy: sqrt scaling
    return Math.sqrt(clampedSpeed / COMBAT_BALANCE.BASE_SPEED);
  }

  // Soft cap: Full linear value up to SPEED_LINEAR_CAP, diminished after
  if (clampedSpeed <= COMBAT_BALANCE.SPEED_LINEAR_CAP) {
    return clampedSpeed / COMBAT_BALANCE.BASE_SPEED;
  }

  // At cap: 1.2x (12/10)
  // After cap: +SPEED_DIMINISH_RATE per speed point
  const linearPortion = COMBAT_BALANCE.SPEED_LINEAR_CAP / COMBAT_BALANCE.BASE_SPEED;
  const diminishedPortion =
    (clampedSpeed - COMBAT_BALANCE.SPEED_LINEAR_CAP) *
    COMBAT_BALANCE.SPEED_DIMINISH_RATE;

  return linearPortion + diminishedPortion;
}

/**
 * Convert speed stat to attack interval in milliseconds.
 * Higher speed = lower interval = faster attacks.
 *
 * @param speed - The combatant's speed stat
 * @param baseInterval - Base attack interval in milliseconds
 * @returns Attack interval in milliseconds
 */
export function speedToInterval(speed: number, baseInterval: number): number {
  const multiplier = getSpeedMultiplier(speed);
  return Math.floor(baseInterval / multiplier);
}
