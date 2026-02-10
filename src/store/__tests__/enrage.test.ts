import { describe, it, expect, beforeEach } from 'vitest';
import { tickEnrage } from '../actions/enrage';
import { useGameStore } from '../gameStore';
import { ENRAGE_THRESHOLD_MS, ENRAGE_POWER_RAMP, TICK_MS } from '@/math/balance';
import type { GameState } from '@/types/game';

function createCombatState(): GameState {
  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.getState().selectClass('warrior');
  useGameStore.getState().startRun();
  return useGameStore.getState();
}

describe('tickEnrage', () => {
  it('does not modify enemy power before enrage threshold', () => {
    const state = createCombatState();
    state.combatElapsed = ENRAGE_THRESHOLD_MS - 1000;
    const basePower = state.enemy!.basePower;

    tickEnrage(state);

    expect(state.enemy!.power).toBe(basePower);
  });

  it('ramps enemy power after enrage threshold', () => {
    const state = createCombatState();
    state.combatElapsed = ENRAGE_THRESHOLD_MS + 5000;
    const basePower = state.enemy!.basePower;

    tickEnrage(state);

    const secondsPast = 5;
    const expectedPower = Math.round(basePower * (1 + ENRAGE_POWER_RAMP * secondsPast));
    expect(state.enemy!.power).toBe(expectedPower);
  });

  it('ramps progressively stronger over time', () => {
    const state = createCombatState();
    const basePower = state.enemy!.basePower;

    state.combatElapsed = ENRAGE_THRESHOLD_MS + 10_000;
    tickEnrage(state);
    const power10s = state.enemy!.power;

    state.combatElapsed = ENRAGE_THRESHOLD_MS + 20_000;
    tickEnrage(state);
    const power20s = state.enemy!.power;

    expect(power20s).toBeGreaterThan(power10s);
    expect(power10s).toBeGreaterThan(basePower);
  });

  it('does nothing when enemy is null', () => {
    const state = createCombatState();
    state.enemy = null;
    expect(() => tickEnrage(state)).not.toThrow();
  });
});
