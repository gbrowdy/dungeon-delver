// src/math/damage.ts
//
// Core damage formula: X/(X+K) effectiveness ratio.
// Design doc Section 2: "Two operations: effectiveness ratio, then multiply."
//
// OVERFLOW SAFETY: Always compute effectiveness first (result is 0-1),
// then multiply by power. Never compute power*power as intermediate --
// at floor 25K+, that exceeds Number.MAX_SAFE_INTEGER.

export interface DamageResult {
  /** Raw (unrounded) damage */
  raw: number;
  /** Final damage after rounding and min-1 clamp */
  final: number;
  /** Effectiveness ratio (0-1) */
  effectiveness: number;
  /** Whether this was a critical hit */
  isCrit: boolean;
}

/**
 * Calculates the effectiveness ratio: attacker_power / (attacker_power + defender_fortitude).
 * Always returns 0-1. Returns 0 if both inputs are 0 (avoids NaN).
 */
export function calculateEffectiveness(attackerPower: number, defenderFortitude: number): number {
  if (attackerPower <= 0) return 0;
  return attackerPower / (attackerPower + defenderFortitude);
}

/**
 * Core damage calculation.
 *
 * @param attackerPower - Attacker's Power stat
 * @param defenderFortitude - Defender's Fortitude stat
 * @param critMultiplier - Crit damage multiplier (1.0 for non-crit)
 * @param isDot - If true, treats defender as having half fortitude (DoT special rule)
 */
export function calculateDamage(
  attackerPower: number,
  defenderFortitude: number,
  critMultiplier: number,
  isDot = false,
): DamageResult {
  const effectiveFortitude = isDot ? defenderFortitude * 0.5 : defenderFortitude;
  const effectiveness = calculateEffectiveness(attackerPower, effectiveFortitude);
  const raw = attackerPower * effectiveness * critMultiplier;
  const final = Math.max(1, Math.round(raw));

  return {
    raw,
    final,
    effectiveness,
    isCrit: critMultiplier > 1,
  };
}
