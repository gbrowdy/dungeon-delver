import { describe, it, expect } from 'vitest';
import { isBossFloor, shouldTriggerDraft, getCheckpoint, spawnEnemy, handleEnemyDeath } from '../actions/flow';
import { useGameStore } from '../gameStore';
import type { GameState } from '@/types/game';

// ─── isBossFloor ────────────────────────────────────────────────

describe('isBossFloor', () => {
  it('floor 3 is the first boss', () => {
    expect(isBossFloor(3)).toBe(true);
  });
  it('floors 1-2 are not bosses', () => {
    expect(isBossFloor(1)).toBe(false);
    expect(isBossFloor(2)).toBe(false);
  });
  it('floor 4 is not a boss', () => {
    expect(isBossFloor(4)).toBe(false);
  });
  it('every 5th floor after 3 is a boss (5, 10, 15, 20...)', () => {
    expect(isBossFloor(5)).toBe(true);
    expect(isBossFloor(10)).toBe(true);
    expect(isBossFloor(15)).toBe(true);
    expect(isBossFloor(20)).toBe(true);
    expect(isBossFloor(25)).toBe(true);
    expect(isBossFloor(100)).toBe(true);
  });
  it('non-5th floors after 3 are not bosses', () => {
    expect(isBossFloor(6)).toBe(false);
    expect(isBossFloor(7)).toBe(false);
    expect(isBossFloor(11)).toBe(false);
    expect(isBossFloor(99)).toBe(false);
  });
});

// ─── shouldTriggerDraft ─────────────────────────────────────────

describe('shouldTriggerDraft', () => {
  it('triggers on every 3rd fight', () => {
    expect(shouldTriggerDraft(3)).toBe(true);
    expect(shouldTriggerDraft(6)).toBe(true);
    expect(shouldTriggerDraft(9)).toBe(true);
  });
  it('does not trigger on non-3rd fights', () => {
    expect(shouldTriggerDraft(1)).toBe(false);
    expect(shouldTriggerDraft(2)).toBe(false);
    expect(shouldTriggerDraft(4)).toBe(false);
    expect(shouldTriggerDraft(5)).toBe(false);
  });
  it('does not trigger on fight 0', () => {
    expect(shouldTriggerDraft(0)).toBe(false);
  });
});

// ─── getCheckpoint ──────────────────────────────────────────────

describe('getCheckpoint', () => {
  it('returns 0 before any boss is cleared', () => {
    expect(getCheckpoint(1)).toBe(0);
    expect(getCheckpoint(2)).toBe(0);
  });
  it('returns floor 3 after clearing floor 3 boss', () => {
    expect(getCheckpoint(3)).toBe(3);
    expect(getCheckpoint(4)).toBe(3);
  });
  it('returns the last boss floor cleared', () => {
    expect(getCheckpoint(5)).toBe(5);
    expect(getCheckpoint(7)).toBe(5);
    expect(getCheckpoint(10)).toBe(10);
    expect(getCheckpoint(12)).toBe(10);
    expect(getCheckpoint(25)).toBe(25);
    expect(getCheckpoint(99)).toBe(95);
    expect(getCheckpoint(100)).toBe(100);
  });
});

// ─── spawnEnemy ─────────────────────────────────────────────────

function createCombatState(): GameState {
  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.getState().selectClass('warrior');
  useGameStore.getState().startRun();
  return useGameStore.getState();
}

describe('spawnEnemy', () => {
  it('spawns a regular enemy for non-boss floors', () => {
    const state = createCombatState();
    state.floor = 5;
    state.room = 2;
    spawnEnemy(state, false);
    expect(state.enemy).not.toBeNull();
    expect(state.enemy!.hp).toBeGreaterThan(0);
    expect(state.enemyDefinition).not.toBeNull();
    expect(state.enemyDefinition!.tier).not.toBe('boss');
  });
  it('spawns a boss for boss floor last room', () => {
    const state = createCombatState();
    state.floor = 5;
    spawnEnemy(state, true);
    expect(state.enemy).not.toBeNull();
    expect(state.enemyDefinition!.tier).toBe('boss');
  });
  it('resets combatElapsed and combat counters', () => {
    const state = createCombatState();
    state.combatElapsed = 5000;
    state.combatCounters.playerAttackCount = 10;
    state.combatCounters.playerHitCount = 5;
    spawnEnemy(state, false);
    expect(state.combatElapsed).toBe(0);
    expect(state.combatCounters.playerAttackCount).toBe(0);
    expect(state.combatCounters.playerHitCount).toBe(0);
    expect(state.combatCounters.shieldRefreshTimer).toBe(0);
    expect(state.combatCounters.curseDecayTimer).toBe(0);
  });
  it('clears combat events', () => {
    const state = createCombatState();
    state.combatEvents = [{ type: 'damage', target: 'enemy', value: 10, tick: 1 }];
    spawnEnemy(state, false);
    expect(state.combatEvents).toEqual([]);
  });
  it('resets lastPlayerHitDamage', () => {
    const state = createCombatState();
    state.lastPlayerHitDamage = 50;
    spawnEnemy(state, false);
    expect(state.lastPlayerHitDamage).toBe(0);
  });
  it('clears player status effects from previous fight', () => {
    const state = createCombatState();
    state.player.statusEffects = [
      { type: 'poison', value: 5, duration: 3, elapsed: 1 },
    ] as any;
    spawnEnemy(state, false);
    expect(state.player.statusEffects).toEqual([]);
  });
});

// ─── handleEnemyDeath ───────────────────────────────────────────

describe('handleEnemyDeath', () => {
  it('triggers draft when fightCount is multiple of 3', () => {
    const state = createCombatState();
    state.fightCount = 2; // handleEnemyDeath increments first → becomes 3
    handleEnemyDeath(state);
    expect(state.phase).toBe('draft');
  });

  it('advances room when not last room and no draft', () => {
    const state = createCombatState();
    state.fightCount = 1;
    state.room = 1;
    state.roomsPerFloor = 4;
    handleEnemyDeath(state);
    expect(state.room).toBe(2);
    expect(state.phase).toBe('combat');
    expect(state.enemy).not.toBeNull();
  });

  it('transitions to shop on boss floor last room', () => {
    const state = createCombatState();
    state.floor = 5; // boss floor
    state.room = 4;
    state.roomsPerFloor = 4;
    state.fightCount = 1; // not draft trigger
    handleEnemyDeath(state);
    expect(state.phase).toBe('shop');
  });

  it('transitions to floor-complete on non-boss floor last room', () => {
    const state = createCombatState();
    state.floor = 4; // not boss floor
    state.room = 4;
    state.roomsPerFloor = 4;
    state.fightCount = 1;
    handleEnemyDeath(state);
    expect(state.phase).toBe('floor-complete');
  });

  it('transitions to endless-intro when floor 100 is complete', () => {
    const state = createCombatState();
    state.floor = 100;
    state.room = 4;
    state.roomsPerFloor = 4;
    state.fightCount = 1;
    handleEnemyDeath(state);
    expect(state.phase).toBe('endless-intro');
  });

  it('increments fightCount', () => {
    const state = createCombatState();
    state.fightCount = 5;
    handleEnemyDeath(state);
    expect(state.fightCount).toBe(6);
  });

  it('updates depth if floor is higher', () => {
    const state = createCombatState();
    state.floor = 10;
    state.depth = 5;
    state.room = 1;
    state.roomsPerFloor = 4;
    state.fightCount = 1;
    handleEnemyDeath(state);
    expect(state.depth).toBe(10);
  });

  it('updates checkpoint when boss floor is completed', () => {
    const state = createCombatState();
    state.floor = 5;
    state.room = 4;
    state.roomsPerFloor = 4;
    state.fightCount = 1;
    handleEnemyDeath(state);
    expect(state.checkpoint).toBe(5);
  });
});
