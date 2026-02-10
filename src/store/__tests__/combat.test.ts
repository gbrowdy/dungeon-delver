import { describe, it, expect, beforeEach } from 'vitest';
import { tickCombat } from '../actions/combat';
import type { GameState } from '@/types/game';
import { useGameStore } from '../gameStore';
import { getAttackInterval } from '@/math/stats';
import { TICK_MS } from '@/math/balance';

/** Helper: set up a combat-ready state */
function createCombatState(): GameState {
  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.getState().selectClass('warrior');
  useGameStore.getState().startRun();
  return useGameStore.getState();
}

describe('tickCombat — attack timers', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('decrements player attack timer by dt', () => {
    const state = createCombatState();
    const initialTimer = state.player.attackTimer;
    tickCombat(state, TICK_MS);
    expect(state.player.attackTimer).toBe(initialTimer - TICK_MS);
  });

  it('decrements enemy attack timer by dt', () => {
    const state = createCombatState();
    const initialTimer = state.enemy!.attackTimer;
    tickCombat(state, TICK_MS);
    // Enemy timer should have been decremented (may have also reset if it hit 0)
    expect(state.enemy!.attackTimer).toBeDefined();
  });

  it('player attacks when timer reaches 0 — enemy takes damage', () => {
    const state = createCombatState();
    state.player.attackTimer = 1;
    const enemyHpBefore = state.enemy!.hp;
    tickCombat(state, TICK_MS);
    expect(state.enemy!.hp).toBeLessThan(enemyHpBefore);
  });

  it('resets player attack timer after attacking', () => {
    const state = createCombatState();
    state.player.attackTimer = 1;
    tickCombat(state, TICK_MS);
    const expectedInterval = getAttackInterval(state.player.speed);
    expect(state.player.attackTimer).toBe(expectedInterval);
  });

  it('enemy attacks when timer reaches 0 — player takes damage', () => {
    const state = createCombatState();
    state.enemy!.attackTimer = 1;
    const playerHpBefore = state.player.hp;
    tickCombat(state, TICK_MS);
    expect(state.player.hp).toBeLessThan(playerHpBefore);
  });

  it('resets enemy attack timer after attacking', () => {
    const state = createCombatState();
    state.enemy!.attackTimer = 1;
    tickCombat(state, TICK_MS);
    const expectedInterval = getAttackInterval(state.enemy!.speed);
    expect(state.enemy!.attackTimer).toBe(expectedInterval);
  });

  it('emits a damage combat event when player attacks', () => {
    const state = createCombatState();
    state.player.attackTimer = 1;
    state.combatEvents = [];
    tickCombat(state, TICK_MS);
    const playerAttackEvents = state.combatEvents.filter(
      (e) => e.type === 'damage' && e.target === 'enemy',
    );
    expect(playerAttackEvents.length).toBe(1);
    expect(playerAttackEvents[0].value).toBeGreaterThan(0);
    expect(playerAttackEvents[0].tick).toBe(state.gameTick);
  });

  it('emits a damage combat event when enemy attacks', () => {
    const state = createCombatState();
    state.enemy!.attackTimer = 1;
    state.combatEvents = [];
    tickCombat(state, TICK_MS);
    const enemyAttackEvents = state.combatEvents.filter(
      (e) => e.type === 'damage' && e.target === 'player',
    );
    expect(enemyAttackEvents.length).toBe(1);
    expect(enemyAttackEvents[0].value).toBeGreaterThan(0);
  });

  it('does nothing if phase is not combat', () => {
    const state = createCombatState();
    state.phase = 'menu';
    const enemyHpBefore = state.enemy!.hp;
    state.player.attackTimer = 0;
    tickCombat(state, TICK_MS);
    expect(state.enemy!.hp).toBe(enemyHpBefore);
  });

  it('does nothing if enemy is null', () => {
    const state = createCombatState();
    state.enemy = null;
    const playerHpBefore = state.player.hp;
    tickCombat(state, TICK_MS);
    expect(state.player.hp).toBe(playerHpBefore);
  });
});
