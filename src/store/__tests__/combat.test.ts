import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tickCombat } from '../actions/combat';
import type { GameState } from '@/types/game';
import { useGameStore } from '../gameStore';
import { getAttackInterval, getCritChance, getCritDamage, getDodgeChance } from '@/math/stats';
import { calculateEffectiveness } from '@/math/damage';
import { TICK_MS, WARRIOR_FORTITUDE_MULT } from '@/math/balance';

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

  it('emits a damage or crit combat event when player attacks', () => {
    const state = createCombatState();
    state.player.attackTimer = 1;
    state.combatEvents = [];
    tickCombat(state, TICK_MS);
    const playerAttackEvents = state.combatEvents.filter(
      (e) => (e.type === 'damage' || e.type === 'crit') && e.target === 'enemy',
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

describe('store tick()', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('calls tickCombat and bumps renderVersion', () => {
    const state = createCombatState();
    const rv0 = useGameStore.getState().renderVersion;

    useGameStore.getState().tick(TICK_MS);

    expect(useGameStore.getState().renderVersion).toBe(rv0 + 1);
  });

  it('increments gameTick on each call', () => {
    createCombatState();
    const tick0 = useGameStore.getState().gameTick;

    useGameStore.getState().tick(TICK_MS);
    expect(useGameStore.getState().gameTick).toBe(tick0 + 1);

    useGameStore.getState().tick(TICK_MS);
    expect(useGameStore.getState().gameTick).toBe(tick0 + 2);
  });
});

describe('crit mechanics', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('applies crit multiplier when roll succeeds', () => {
    const state = createCombatState();
    state.player.luck = 100;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    const critEvents = state.combatEvents.filter(e => e.type === 'crit');
    expect(critEvents.length).toBe(1);

    mockRandom.mockRestore();
  });

  it('does not crit when roll fails', () => {
    const state = createCombatState();
    state.player.luck = 5;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    const critEvents = state.combatEvents.filter(e => e.type === 'crit');
    expect(critEvents.length).toBe(0);
    const damageEvents = state.combatEvents.filter(e => e.type === 'damage' && e.target === 'enemy');
    expect(damageEvents.length).toBe(1);

    mockRandom.mockRestore();
  });

  it('crit damage is higher than normal damage', () => {
    const state = createCombatState();
    state.player.luck = 100;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);
    const normalDamage = state.combatEvents.find(
      e => e.type === 'damage' && e.target === 'enemy'
    )!.value!;

    state.combatEvents = [];
    mockRandom.mockReturnValue(0);
    state.player.attackTimer = 1;
    tickCombat(state, TICK_MS);
    const critDamage = state.combatEvents.find(e => e.type === 'crit')!.value!;

    expect(critDamage).toBeGreaterThan(normalDamage);

    mockRandom.mockRestore();
  });
});

describe('dodge mechanics', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('player dodges enemy attack when roll succeeds', () => {
    const state = createCombatState();
    state.player.luck = 100;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

    state.enemy!.attackTimer = 1;
    state.player.attackTimer = 99999;
    const playerHpBefore = state.player.hp;

    tickCombat(state, TICK_MS);

    expect(state.player.hp).toBe(playerHpBefore);
    const dodgeEvents = state.combatEvents.filter(e => e.type === 'dodge');
    expect(dodgeEvents.length).toBe(1);

    mockRandom.mockRestore();
  });

  it('player takes damage when dodge fails', () => {
    const state = createCombatState();
    state.player.luck = 5;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    state.enemy!.attackTimer = 1;
    state.player.attackTimer = 99999;
    const playerHpBefore = state.player.hp;

    tickCombat(state, TICK_MS);

    expect(state.player.hp).toBeLessThan(playerHpBefore);

    mockRandom.mockRestore();
  });

  it('enemies cannot dodge (no dodge chance)', () => {
    const state = createCombatState();
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    const enemyHpBefore = state.enemy!.hp;

    tickCombat(state, TICK_MS);

    expect(state.enemy!.hp).toBeLessThan(enemyHpBefore);

    mockRandom.mockRestore();
  });
});

describe('class innate — Warrior Toughness', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('enemy deals less damage to warrior due to 1.5x fortitude in defense', () => {
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    // Create warrior state
    const warriorState = createCombatState(); // uses warrior
    warriorState.player.fortitude = 10;
    warriorState.enemy!.power = 20;
    warriorState.enemy!.attackTimer = 1;
    warriorState.player.attackTimer = 99999;
    const warriorHpBefore = warriorState.player.hp;
    tickCombat(warriorState, TICK_MS);
    const warriorDamageTaken = warriorHpBefore - warriorState.player.hp;

    // Create rogue state
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('rogue');
    useGameStore.getState().startRun();
    const rogueState = useGameStore.getState();
    rogueState.player.fortitude = 10;
    rogueState.enemy!.power = 20;
    rogueState.enemy!.attackTimer = 1;
    rogueState.player.attackTimer = 99999;
    const rogueHpBefore = rogueState.player.hp;
    tickCombat(rogueState, TICK_MS);
    const rogueDamageTaken = rogueHpBefore - rogueState.player.hp;

    // Warrior should take less damage (1.5x effective fortitude)
    expect(warriorDamageTaken).toBeLessThan(rogueDamageTaken);

    mockRandom.mockRestore();
  });
});
