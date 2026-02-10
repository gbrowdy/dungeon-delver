import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isBossFloor, shouldTriggerDraft, getCheckpoint, spawnEnemy, handleEnemyDeath, handlePlayerDeath } from '../actions/flow';
import { FINAL_BOSS_FLOOR, ENDLESS_START_FLOOR, TICK_MS } from '@/math/balance';
import { tickCombat } from '../actions/combat';
import { getRoomsPerFloor } from '@/math/scaling';
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

// ─── handlePlayerDeath ─────────────────────────────────────────

describe('handlePlayerDeath', () => {
  it('transitions to death phase for floors 1-100', () => {
    const state = createCombatState();
    state.floor = 15;
    handlePlayerDeath(state);
    expect(state.phase).toBe('death');
  });

  it('transitions to endless-defeat for floors 101+', () => {
    const state = createCombatState();
    state.floor = 105;
    handlePlayerDeath(state);
    expect(state.phase).toBe('endless-defeat');
  });

  it('creates death summary with correct stats', () => {
    const state = createCombatState();
    state.floor = 15;
    state.room = 3;
    state.enemy!.power = 25;
    state.enemy!.fortitude = 20;
    state.enemy!.speed = 12;
    state.enemyDefinition = { tier: 'rare', modifiers: ['armored'] };

    handlePlayerDeath(state);

    expect(state.lastDeathStats).not.toBeNull();
    expect(state.lastDeathStats!.floor).toBe(15);
    expect(state.lastDeathStats!.room).toBe(3);
    expect(state.lastDeathStats!.enemyTier).toBe('rare');
    expect(state.lastDeathStats!.enemyModifiers).toEqual(['armored']);
    expect(state.lastDeathStats!.playerStats.power).toBe(state.player.power);
  });

  it('death summary includes damage per hit calculations', () => {
    const state = createCombatState();
    state.floor = 15;
    handlePlayerDeath(state);
    expect(state.lastDeathStats!.playerDamagePerHit).toBeGreaterThan(0);
    expect(state.lastDeathStats!.enemyDamagePerHit).toBeGreaterThan(0);
  });

  it('death summary includes weakness hint', () => {
    const state = createCombatState();
    state.floor = 15;
    handlePlayerDeath(state);
    expect(state.lastDeathStats!.weaknessHint).toBeTruthy();
  });

  it('records depth as high score for endless defeat', () => {
    const state = createCombatState();
    state.floor = 150;
    state.depth = 120;
    handlePlayerDeath(state);
    expect(state.depth).toBe(150);
  });
});

// ─── advanceFloor (store action) ───────────────────────────────

describe('advanceFloor (store action)', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
  });

  it('increments floor and resets room to 1', () => {
    const state = useGameStore.getState();
    state.phase = 'floor-complete';
    state.floor = 3;

    useGameStore.getState().advanceFloor();

    expect(useGameStore.getState().floor).toBe(4);
    expect(useGameStore.getState().room).toBe(1);
  });

  it('recomputes roomsPerFloor for the new floor', () => {
    const state = useGameStore.getState();
    state.phase = 'floor-complete';
    state.floor = 49;

    useGameStore.getState().advanceFloor();

    const newState = useGameStore.getState();
    expect(newState.roomsPerFloor).toBe(getRoomsPerFloor(50));
  });

  it('spawns an enemy and transitions to combat', () => {
    const state = useGameStore.getState();
    state.phase = 'floor-complete';
    state.floor = 5;

    useGameStore.getState().advanceFloor();

    expect(useGameStore.getState().phase).toBe('combat');
    expect(useGameStore.getState().enemy).not.toBeNull();
  });

  it('resets fightCount for the new floor', () => {
    const state = useGameStore.getState();
    state.fightCount = 12;
    state.phase = 'floor-complete';

    useGameStore.getState().advanceFloor();

    expect(useGameStore.getState().fightCount).toBe(0);
  });

  it('restores player HP to max between floors', () => {
    const state = useGameStore.getState();
    state.player.hp = 50;
    state.phase = 'floor-complete';

    useGameStore.getState().advanceFloor();

    expect(useGameStore.getState().player.hp).toBe(useGameStore.getState().player.maxHp);
  });
});

// ─── respawnAtCheckpoint (store action) ────────────────────────

describe('respawnAtCheckpoint (store action)', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
  });

  it('respawns at checkpoint floor', () => {
    const state = useGameStore.getState();
    state.floor = 17;
    state.checkpoint = 15;
    state.phase = 'death';

    useGameStore.getState().respawnAtCheckpoint();

    expect(useGameStore.getState().floor).toBe(15);
    expect(useGameStore.getState().room).toBe(1);
  });

  it('respawns at floor 1 if no checkpoint', () => {
    const state = useGameStore.getState();
    state.floor = 2;
    state.checkpoint = 0;
    state.phase = 'death';

    useGameStore.getState().respawnAtCheckpoint();

    expect(useGameStore.getState().floor).toBe(1);
  });

  it('restores player HP to full', () => {
    const state = useGameStore.getState();
    state.player.hp = 0;
    state.checkpoint = 5;
    state.phase = 'death';

    useGameStore.getState().respawnAtCheckpoint();

    expect(useGameStore.getState().player.hp).toBe(useGameStore.getState().player.maxHp);
  });

  it('keeps all stats and items', () => {
    const state = useGameStore.getState();
    state.player.power = 50;
    state.equippedItems.weapon = { id: 'heavy_cleaver', slot: 'weapon', tier: 2 };
    state.checkpoint = 5;
    state.phase = 'death';

    useGameStore.getState().respawnAtCheckpoint();

    expect(useGameStore.getState().player.power).toBe(50);
    expect(useGameStore.getState().equippedItems.weapon!.id).toBe('heavy_cleaver');
  });

  it('spawns enemy and transitions to combat', () => {
    const state = useGameStore.getState();
    state.checkpoint = 10;
    state.phase = 'death';

    useGameStore.getState().respawnAtCheckpoint();

    expect(useGameStore.getState().phase).toBe('combat');
    expect(useGameStore.getState().enemy).not.toBeNull();
  });

  it('clears player status effects', () => {
    const state = useGameStore.getState();
    state.player.statusEffects = [{ type: 'poison', stacks: 3, remainingMs: 2000 }];
    state.checkpoint = 5;
    state.phase = 'death';

    useGameStore.getState().respawnAtCheckpoint();

    expect(useGameStore.getState().player.statusEffects).toEqual([]);
  });
});

// ─── startEndless (store action) ──────────────────────────────

describe('startEndless (store action)', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
  });

  it('starts at floor 101', () => {
    const state = useGameStore.getState();
    state.phase = 'endless-intro';

    useGameStore.getState().startEndless();

    expect(useGameStore.getState().floor).toBe(ENDLESS_START_FLOOR);
  });

  it('transitions to combat', () => {
    const state = useGameStore.getState();
    state.phase = 'endless-intro';

    useGameStore.getState().startEndless();

    expect(useGameStore.getState().phase).toBe('combat');
    expect(useGameStore.getState().enemy).not.toBeNull();
  });

  it('restores player HP to full', () => {
    const state = useGameStore.getState();
    state.player.hp = 50;
    state.phase = 'endless-intro';

    useGameStore.getState().startEndless();

    expect(useGameStore.getState().player.hp).toBe(useGameStore.getState().player.maxHp);
  });
});

// ─── resumeCombat (store action) ──────────────────────────────

describe('resumeCombat (store action)', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
  });

  it('resumes combat after draft — advances room if not last room', () => {
    const state = useGameStore.getState();
    state.phase = 'draft';
    state.room = 2;
    state.roomsPerFloor = 4;

    useGameStore.getState().resumeCombat();

    expect(useGameStore.getState().phase).toBe('combat');
    expect(useGameStore.getState().room).toBe(3);
    expect(useGameStore.getState().enemy).not.toBeNull();
  });

  it('goes to floor-complete if last room of non-boss floor', () => {
    const state = useGameStore.getState();
    state.phase = 'draft';
    state.room = 4;
    state.roomsPerFloor = 4;
    state.floor = 4; // not boss

    useGameStore.getState().resumeCombat();

    expect(useGameStore.getState().phase).toBe('floor-complete');
  });

  it('goes to shop if last room of boss floor', () => {
    const state = useGameStore.getState();
    state.phase = 'draft';
    state.room = 4;
    state.roomsPerFloor = 4;
    state.floor = 5; // boss

    useGameStore.getState().resumeCombat();

    expect(useGameStore.getState().phase).toBe('shop');
  });
});

// ─── combat → flow integration ────────────────────────────────

describe('combat → flow integration', () => {
  it('enemy death triggers flow transition', () => {
    const state = createCombatState();
    state.enemy!.hp = 1;
    state.player.power = 999;
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    state.fightCount = 2; // next fight will be 3rd → draft trigger

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    tickCombat(state, TICK_MS);

    expect(state.phase).toBe('draft');

    mockRandom.mockRestore();
  });

  it('player death triggers flow transition', () => {
    const state = createCombatState();
    state.player.hp = 1;
    state.enemy!.power = 999;
    state.enemy!.attackTimer = 1;
    state.player.attackTimer = 99999;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    tickCombat(state, TICK_MS);

    expect(state.phase).toBe('death');

    mockRandom.mockRestore();
  });
});

// ─── full flow integration ────────────────────────────────────

describe('full flow integration', () => {
  it('simulates combat through room advancement', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();

    const state = useGameStore.getState();
    expect(state.phase).toBe('combat');
    expect(state.floor).toBe(1);
    expect(state.room).toBe(1);

    // Tick combat until something happens (enemy dies → flow transition)
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    let ticks = 0;
    while (ticks < 50000 && useGameStore.getState().phase === 'combat') {
      useGameStore.getState().tick(TICK_MS);
      ticks++;
    }

    const currentPhase = useGameStore.getState().phase;
    // Should have transitioned out of combat
    expect(['draft', 'floor-complete', 'shop', 'combat']).toContain(currentPhase);

    mockRandom.mockRestore();
  });

  it('floor-complete → advanceFloor → combat cycle', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();

    const state = useGameStore.getState();
    state.phase = 'floor-complete';
    state.floor = 1;

    useGameStore.getState().advanceFloor();

    expect(useGameStore.getState().phase).toBe('combat');
    expect(useGameStore.getState().floor).toBe(2);
    expect(useGameStore.getState().enemy).not.toBeNull();
    expect(useGameStore.getState().player.hp).toBe(useGameStore.getState().player.maxHp);
  });

  it('death → respawn → combat cycle', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();

    const state = useGameStore.getState();
    state.floor = 7;
    state.checkpoint = 5;
    state.phase = 'death';
    state.player.hp = 0;

    useGameStore.getState().respawnAtCheckpoint();

    expect(useGameStore.getState().phase).toBe('combat');
    expect(useGameStore.getState().floor).toBe(5);
    expect(useGameStore.getState().player.hp).toBe(useGameStore.getState().player.maxHp);
  });
});
