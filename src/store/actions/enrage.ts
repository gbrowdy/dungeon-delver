import type { GameState } from '@/types/game';
import { ENRAGE_THRESHOLD_MS, ENRAGE_POWER_RAMP } from '@/math/balance';

/**
 * After ENRAGE_THRESHOLD_MS, enemy power ramps: basePower * (1 + 0.05 * seconds_past_enrage)
 */
export function tickEnrage(state: GameState): void {
  if (!state.enemy) return;
  if (state.combatElapsed <= ENRAGE_THRESHOLD_MS) return;

  const secondsPast = (state.combatElapsed - ENRAGE_THRESHOLD_MS) / 1000;
  state.enemy.power = Math.round(
    state.enemy.basePower * (1 + ENRAGE_POWER_RAMP * secondsPast)
  );
}
