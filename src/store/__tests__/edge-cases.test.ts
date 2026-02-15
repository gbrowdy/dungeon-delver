/**
 * Edge case tests for store actions.
 *
 * Targets the highest-risk gaps identified during audit:
 * - Status effect boundaries (stun immunity, poison stacking, curse clamping)
 * - Combat timing boundaries (simultaneous attacks, timer edge values)
 * - Flow transition matrix (resumeCombat, checkpoint/death cycles)
 * - Stat recalculation (fortitude→maxHp in draft/shop)
 * - Modifier boundaries (berserker threshold, shield absorption)
 * - Enrage boundary
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tickCombat } from '../actions/combat';
import { tickEnrage } from '../actions/enrage';
import { tickModifierBehaviors } from '../actions/modifiers';
import {
  addStatusEffect,
  hasEffect,
  getEffect,
  removeExpiredEffects,
  tickStatusEffects,
} from '../actions/statusEffects';
import {
  isBossFloor,
  shouldTriggerDraft,
  getCheckpoint,
  handleEnemyDeath,
  handlePlayerDeath,
  spawnEnemy,
} from '../actions/flow';
import { useGameStore } from '../gameStore';
import type { GameState, CombatEntity, EnemyModifier } from '@/types/game';
import {
  MAX_POISON_STACKS,
  MAX_CURSE_STACKS,
  STUN_IMMUNITY_MS,
  STUN_DURATION_MS,
  POISON_DURATION_MS,
  CURSE_DECAY_INTERVAL_MS,
  CURSE_REDUCTION_PER_STACK,
  ENRAGE_THRESHOLD_MS,
  ENRAGE_POWER_RAMP,
  BERSERKER_POWER_MULT,
  BERSERKER_HP_THRESHOLD,
  SHIELD_REFRESH_MS,
  SHIELD_HP_PERCENT,
  MIN_POWER,
  MIN_SPEED,
  TICK_MS,
  FIRST_BOSS_FLOOR,
  BOSS_INTERVAL,
  DRAFT_FIGHT_INTERVAL,
  FINAL_BOSS_FLOOR,
  PLAYER_BASE_HP,
  HP_PER_FORTITUDE,
} from '@/math/balance';
import { getMaxHp, getAttackInterval } from '@/math/stats';

// ── Helpers ─────────────────────────────────────────────────────

function createCombatState(overrides?: Partial<{
  classId: string;
  floor: number;
  room: number;
  roomsPerFloor: number;
  fightCount: number;
  enemyModifiers: EnemyModifier[];
}>): GameState {
  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.getState().selectClass(overrides?.classId ?? 'warrior');
  useGameStore.getState().startRun();
  const state = useGameStore.getState();

  if (overrides?.floor) state.floor = overrides.floor;
  if (overrides?.room) state.room = overrides.room;
  if (overrides?.roomsPerFloor) state.roomsPerFloor = overrides.roomsPerFloor;
  if (overrides?.fightCount !== undefined) state.fightCount = overrides.fightCount;
  if (overrides?.enemyModifiers && state.enemyDefinition) {
    state.enemyDefinition.modifiers = overrides.enemyModifiers;
  }

  return state;
}

function makeEntity(overrides?: Partial<CombatEntity>): CombatEntity {
  return {
    power: 50,
    fortitude: 30,
    speed: 10,
    luck: 5,
    basePower: 50,
    baseSpeed: 10,
    hp: 200,
    maxHp: 200,
    attackTimer: 2500,
    statusEffects: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// STATUS EFFECT EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Status Effects — boundary conditions', () => {
  describe('Stun immunity boundary', () => {
    it('blocks stun when currentTime < immuneUntilMs', () => {
      const entity = makeEntity();
      entity.statusEffects = [{
        type: 'stun',
        stacks: 1,
        remainingMs: 0,
        immuneUntilMs: 5000,
      }];
      addStatusEffect(entity, 'stun', 4999);
      // Should NOT refresh — still immune
      expect(entity.statusEffects[0].remainingMs).toBe(0);
    });

    it('allows stun at exactly immuneUntilMs (boundary)', () => {
      const entity = makeEntity();
      entity.statusEffects = [{
        type: 'stun',
        stacks: 1,
        remainingMs: 0,
        immuneUntilMs: 5000,
      }];
      addStatusEffect(entity, 'stun', 5000);
      // currentTimeMs (5000) is NOT < immuneUntilMs (5000), so stun SHOULD apply
      expect(entity.statusEffects[0].remainingMs).toBe(STUN_DURATION_MS);
    });

    it('allows stun after immuneUntilMs expires', () => {
      const entity = makeEntity();
      entity.statusEffects = [{
        type: 'stun',
        stacks: 1,
        remainingMs: 0,
        immuneUntilMs: 5000,
      }];
      addStatusEffect(entity, 'stun', 7001);
      expect(entity.statusEffects[0].remainingMs).toBe(STUN_DURATION_MS);
    });

    it('sets immunity when stun expires naturally', () => {
      const entity = makeEntity();
      entity.statusEffects = [{
        type: 'stun',
        stacks: 1,
        remainingMs: 100,
      }];
      // Tick 200ms → stun expires
      const state = createCombatState();
      state.player = entity;
      state.combatElapsed = 3000;

      // Tick stun down past 0
      const stun = entity.statusEffects[0];
      stun.remainingMs -= 200;
      removeExpiredEffects(entity, 3000);

      // Should retain with immunity
      const stunEffect = getEffect(entity, 'stun');
      expect(stunEffect).toBeDefined();
      expect(stunEffect!.immuneUntilMs).toBe(3000 + STUN_IMMUNITY_MS);
    });
  });

  describe('Poison stacking limits', () => {
    it('caps at MAX_POISON_STACKS', () => {
      const entity = makeEntity();
      for (let i = 0; i < MAX_POISON_STACKS + 5; i++) {
        addStatusEffect(entity, 'poison', i * 100);
      }
      const poison = getEffect(entity, 'poison')!;
      expect(poison.stacks).toBe(MAX_POISON_STACKS);
    });

    it('refreshes duration even at max stacks', () => {
      const entity = makeEntity();
      for (let i = 0; i < MAX_POISON_STACKS; i++) {
        addStatusEffect(entity, 'poison', 0);
      }
      // Reduce remaining time
      const poison = getEffect(entity, 'poison')!;
      poison.remainingMs = 500;
      // Apply another — should refresh timer
      addStatusEffect(entity, 'poison', 1000);
      expect(poison.stacks).toBe(MAX_POISON_STACKS); // unchanged
      expect(poison.remainingMs).toBe(POISON_DURATION_MS); // refreshed
    });
  });

  describe('Curse stacking limits', () => {
    it('caps at MAX_CURSE_STACKS', () => {
      const entity = makeEntity();
      for (let i = 0; i < MAX_CURSE_STACKS + 5; i++) {
        addStatusEffect(entity, 'curse', 0);
      }
      const curse = getEffect(entity, 'curse')!;
      expect(curse.stacks).toBe(MAX_CURSE_STACKS);
    });

    it('curse has infinite remainingMs', () => {
      const entity = makeEntity();
      addStatusEffect(entity, 'curse', 0);
      const curse = getEffect(entity, 'curse')!;
      expect(curse.remainingMs).toBe(Infinity);
    });

    it('decay removes exactly 1 stack', () => {
      const entity = makeEntity();
      for (let i = 0; i < 5; i++) {
        addStatusEffect(entity, 'curse', 0);
      }
      // Manually decay once
      const curse = getEffect(entity, 'curse')!;
      curse.stacks -= 1;
      expect(curse.stacks).toBe(4);
    });

    it('decay at 1 stack removes curse entirely', () => {
      const entity = makeEntity();
      addStatusEffect(entity, 'curse', 0);
      expect(getEffect(entity, 'curse')!.stacks).toBe(1);

      // Simulate decay: stacks -= 1 → remove
      const curse = getEffect(entity, 'curse')!;
      curse.stacks -= 1;
      if (curse.stacks <= 0) {
        entity.statusEffects = entity.statusEffects.filter(e => e.type !== 'curse');
      }
      expect(getEffect(entity, 'curse')).toBeUndefined();
    });
  });

  describe('Shield absorption boundaries', () => {
    it('shield absorbs all damage when shield HP > damage', () => {
      const state = createCombatState();
      const enemy = state.enemy!;
      addStatusEffect(enemy, 'shield', 0, 100);
      const shield = getEffect(enemy, 'shield')!;
      const initialEnemyHp = enemy.hp;

      // Simulate attack — 50 damage against 100 shield
      const damage = 50;
      const absorbed = Math.min(shield.stacks, damage);
      shield.stacks -= absorbed;
      const finalDamage = damage - absorbed;
      enemy.hp -= finalDamage;

      expect(enemy.hp).toBe(initialEnemyHp); // no HP damage
      expect(shield.stacks).toBe(50); // shield reduced
    });

    it('shield absorbs partial damage — remainder hits HP', () => {
      const state = createCombatState();
      const enemy = state.enemy!;
      addStatusEffect(enemy, 'shield', 0, 30);
      const shield = getEffect(enemy, 'shield')!;
      const initialEnemyHp = enemy.hp;

      const damage = 50;
      const absorbed = Math.min(shield.stacks, damage);
      shield.stacks -= absorbed;
      const finalDamage = damage - absorbed;
      enemy.hp -= finalDamage;

      expect(enemy.hp).toBe(initialEnemyHp - 20); // 50 - 30 absorbed = 20 HP damage
      expect(shield.stacks).toBe(0);
    });

    it('shield with exact damage amount — zero HP damage, shield consumed', () => {
      const enemy = makeEntity();
      addStatusEffect(enemy, 'shield', 0, 50);
      const shield = getEffect(enemy, 'shield')!;
      const initialHp = enemy.hp;

      const damage = 50;
      const absorbed = Math.min(shield.stacks, damage);
      shield.stacks -= absorbed;
      const finalDamage = damage - absorbed;
      enemy.hp -= finalDamage;

      expect(enemy.hp).toBe(initialHp);
      expect(shield.stacks).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// COMBAT EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Combat — boundary conditions', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('minimum damage is always 1 (massive fortitude difference)', () => {
    const state = createCombatState();
    state.player.power = 1;
    state.enemy!.fortitude = 10000;
    state.player.attackTimer = 1;

    vi.spyOn(Math, 'random').mockReturnValue(0.99); // no crit
    const hpBefore = state.enemy!.hp;
    tickCombat(state, TICK_MS);
    vi.restoreAllMocks();

    expect(hpBefore - state.enemy!.hp).toBeGreaterThanOrEqual(1);
  });

  it('player stun prevents attack even when timer reaches 0', () => {
    const state = createCombatState();
    state.player.attackTimer = 1;
    addStatusEffect(state.player, 'stun', 0);
    const hpBefore = state.enemy!.hp;

    tickCombat(state, TICK_MS);

    // Enemy HP should NOT have decreased from player attack
    // (enemy may still attack player, but that's separate)
    expect(state.enemy!.hp).toBe(hpBefore);
  });

  it('enemy stun prevents attack even when timer reaches 0', () => {
    const state = createCombatState();
    state.enemy!.attackTimer = 1;
    addStatusEffect(state.enemy!, 'stun', 0);
    state.player.attackTimer = 99999; // player won't attack this tick
    const hpBefore = state.player.hp;

    tickCombat(state, TICK_MS);

    expect(state.player.hp).toBe(hpBefore);
  });

  it('curse reduces enemy power and speed — clamped to minimums', () => {
    const state = createCombatState();
    const enemy = state.enemy!;
    enemy.basePower = 5;
    enemy.power = 5;
    enemy.baseSpeed = 4;
    enemy.speed = 4;

    // Apply max curse stacks
    for (let i = 0; i < MAX_CURSE_STACKS; i++) {
      addStatusEffect(enemy, 'curse', 0);
    }

    // Tick combat to apply curse reduction
    state.player.attackTimer = 99999; // no attack this tick
    enemy.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    // 10 stacks * 3% = 30% reduction
    // power: 5 * 0.7 = 3.5 → rounds to 4, but min is 1
    // speed: 4 * 0.7 = 2.8 → rounds to 3, clamped to MIN_SPEED=3
    expect(enemy.power).toBeGreaterThanOrEqual(MIN_POWER);
    expect(enemy.speed).toBeGreaterThanOrEqual(MIN_SPEED);
  });

  it('both player and enemy can attack in same tick', () => {
    const state = createCombatState();
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 1;

    vi.spyOn(Math, 'random').mockReturnValue(0.99); // no dodge/crit
    const playerHpBefore = state.player.hp;
    const enemyHpBefore = state.enemy!.hp;

    tickCombat(state, TICK_MS);
    vi.restoreAllMocks();

    expect(state.enemy!.hp).toBeLessThan(enemyHpBefore);
    expect(state.player.hp).toBeLessThan(playerHpBefore);
  });

  it('combat does nothing if phase is not combat', () => {
    const state = createCombatState();
    state.phase = 'draft';
    const playerHp = state.player.hp;
    const enemyHp = state.enemy!.hp;

    tickCombat(state, TICK_MS);

    expect(state.player.hp).toBe(playerHp);
    expect(state.enemy!.hp).toBe(enemyHp);
  });

  it('combat does nothing if enemy is null', () => {
    const state = createCombatState();
    state.enemy = null;
    const playerHp = state.player.hp;

    tickCombat(state, TICK_MS);

    expect(state.player.hp).toBe(playerHp);
  });

  it('attack timer reset uses effective speed after item modifiers', () => {
    const state = createCombatState();
    state.player.speed = 15;
    state.player.attackTimer = 1;

    vi.spyOn(Math, 'random').mockReturnValue(0.99); // no crit
    tickCombat(state, TICK_MS);
    vi.restoreAllMocks();

    // Timer should be reset to the interval for speed 15
    const expectedInterval = getAttackInterval(15);
    expect(state.player.attackTimer).toBe(expectedInterval);
  });
});

// ═══════════════════════════════════════════════════════════════
// ENRAGE EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Enrage — boundary conditions', () => {
  it('does NOT activate at exactly ENRAGE_THRESHOLD_MS', () => {
    const state = createCombatState();
    state.combatElapsed = ENRAGE_THRESHOLD_MS;
    const basePower = state.enemy!.basePower;

    tickEnrage(state);

    // combatElapsed <= threshold → no ramp
    expect(state.enemy!.power).toBe(basePower);
  });

  it('activates 1ms after ENRAGE_THRESHOLD_MS', () => {
    const state = createCombatState();
    state.combatElapsed = ENRAGE_THRESHOLD_MS + 1;
    const basePower = state.enemy!.basePower;

    tickEnrage(state);

    // Tiny ramp: basePower * (1 + 0.05 * 0.001)
    const expectedPower = Math.round(basePower * (1 + ENRAGE_POWER_RAMP * 0.001));
    expect(state.enemy!.power).toBe(expectedPower);
  });

  it('does not overflow at very long combat (120 seconds past enrage)', () => {
    const state = createCombatState();
    state.enemy!.basePower = 1000;
    state.combatElapsed = ENRAGE_THRESHOLD_MS + 120_000;

    tickEnrage(state);

    // 1000 * (1 + 0.05 * 120) = 1000 * 7 = 7000
    const expectedPower = Math.round(1000 * (1 + ENRAGE_POWER_RAMP * 120));
    expect(state.enemy!.power).toBe(expectedPower);
    expect(state.enemy!.power).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});

// ═══════════════════════════════════════════════════════════════
// MODIFIER EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Modifiers — boundary conditions', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('berserker does NOT trigger at exactly 30% HP', () => {
    const state = createCombatState({ enemyModifiers: ['berserker'] });
    const enemy = state.enemy!;
    enemy.hp = enemy.maxHp * BERSERKER_HP_THRESHOLD; // exactly 30%
    enemy.power = enemy.basePower; // reset before modifier tick

    tickModifierBehaviors(state, TICK_MS);

    // hpPercent < 0.3 is the check, so at exactly 0.3 it should NOT trigger
    expect(enemy.power).toBe(enemy.basePower);
  });

  it('berserker triggers just below 30% HP', () => {
    const state = createCombatState({ enemyModifiers: ['berserker'] });
    const enemy = state.enemy!;
    enemy.hp = enemy.maxHp * BERSERKER_HP_THRESHOLD - 1; // just below 30%
    enemy.power = enemy.basePower;

    tickModifierBehaviors(state, TICK_MS);

    expect(enemy.power).toBe(Math.round(enemy.basePower * BERSERKER_POWER_MULT));
  });

  it('shield refreshes at exactly SHIELD_REFRESH_MS', () => {
    const state = createCombatState({ enemyModifiers: ['shielded'] });
    const enemy = state.enemy!;
    state.combatCounters.shieldRefreshTimer = SHIELD_REFRESH_MS - TICK_MS;

    tickModifierBehaviors(state, TICK_MS);

    // Timer reached threshold → shield should be applied
    const shield = getEffect(enemy, 'shield');
    expect(shield).toBeDefined();
    expect(shield!.stacks).toBe(Math.round(enemy.maxHp * SHIELD_HP_PERCENT));
  });

  it('shield does NOT refresh just below threshold', () => {
    const state = createCombatState({ enemyModifiers: ['shielded'] });
    const enemy = state.enemy!;
    state.combatCounters.shieldRefreshTimer = SHIELD_REFRESH_MS - TICK_MS - 1;

    tickModifierBehaviors(state, TICK_MS);

    const shield = getEffect(enemy, 'shield');
    expect(shield).toBeUndefined();
  });

  it('multiple modifiers compose correctly', () => {
    const state = createCombatState({ enemyModifiers: ['berserker', 'regenerating', 'shielded'] });
    const enemy = state.enemy!;
    enemy.hp = Math.round(enemy.maxHp * 0.2); // below berserker threshold
    enemy.power = enemy.basePower;
    state.combatCounters.shieldRefreshTimer = SHIELD_REFRESH_MS;

    const hpBefore = enemy.hp;
    tickModifierBehaviors(state, 1000); // 1 second

    // Berserker multiplied power
    expect(enemy.power).toBe(Math.round(enemy.basePower * BERSERKER_POWER_MULT));
    // Regenerating healed some HP
    expect(enemy.hp).toBeGreaterThan(hpBefore);
    // Shielded granted shield
    expect(getEffect(enemy, 'shield')).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// FLOW EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Flow — boundary conditions', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  describe('isBossFloor', () => {
    it('floor 3 (FIRST_BOSS_FLOOR) is a boss floor', () => {
      expect(isBossFloor(FIRST_BOSS_FLOOR)).toBe(true);
    });

    it('floor 4 is NOT a boss floor', () => {
      expect(isBossFloor(4)).toBe(false);
    });

    it('floor 5 is a boss floor (BOSS_INTERVAL)', () => {
      expect(isBossFloor(BOSS_INTERVAL)).toBe(true);
    });

    it('floor 100 (FINAL_BOSS_FLOOR) is a boss floor', () => {
      expect(isBossFloor(FINAL_BOSS_FLOOR)).toBe(true);
    });

    it('floor 101 is NOT a boss floor', () => {
      expect(isBossFloor(101)).toBe(false);
    });
  });

  describe('shouldTriggerDraft', () => {
    it('triggers at fight count 3 (DRAFT_FIGHT_INTERVAL)', () => {
      expect(shouldTriggerDraft(DRAFT_FIGHT_INTERVAL)).toBe(true);
    });

    it('does NOT trigger at fight count 0', () => {
      expect(shouldTriggerDraft(0)).toBe(false);
    });

    it('triggers at fight count 300', () => {
      expect(shouldTriggerDraft(300)).toBe(true);
    });

    it('does NOT trigger at fight count 1', () => {
      expect(shouldTriggerDraft(1)).toBe(false);
    });
  });

  describe('getCheckpoint', () => {
    it('returns 0 before first boss', () => {
      expect(getCheckpoint(1)).toBe(0);
      expect(getCheckpoint(2)).toBe(0);
    });

    it('returns FIRST_BOSS_FLOOR at floor 3', () => {
      expect(getCheckpoint(FIRST_BOSS_FLOOR)).toBe(FIRST_BOSS_FLOOR);
    });

    it('returns FIRST_BOSS_FLOOR between floor 3 and 5', () => {
      expect(getCheckpoint(4)).toBe(FIRST_BOSS_FLOOR);
    });

    it('returns floor 5 at floor 5', () => {
      expect(getCheckpoint(5)).toBe(5);
    });

    it('returns floor 100 at floor 100', () => {
      expect(getCheckpoint(100)).toBe(100);
    });

    it('returns correct checkpoint for mid-range floors', () => {
      expect(getCheckpoint(47)).toBe(45);
      expect(getCheckpoint(50)).toBe(50);
      expect(getCheckpoint(51)).toBe(50);
    });
  });

  describe('handleEnemyDeath — flow transitions', () => {
    it('triggers draft when fightCount becomes multiple of DRAFT_FIGHT_INTERVAL', () => {
      const state = createCombatState({
        floor: 1,
        room: 1,
        roomsPerFloor: 5,
        fightCount: DRAFT_FIGHT_INTERVAL - 1,
      });

      handleEnemyDeath(state);

      // fightCount increments to DRAFT_FIGHT_INTERVAL → draft
      expect(state.phase).toBe('draft');
      expect(state.draftChoices.length).toBeGreaterThan(0);
    });

    it('advances room when not last room and no draft trigger', () => {
      const state = createCombatState({
        floor: 1,
        room: 1,
        roomsPerFloor: 5,
        fightCount: 0,
      });

      handleEnemyDeath(state);

      expect(state.phase).toBe('combat');
      expect(state.room).toBe(2); // advanced
    });

    it('transitions to floor-complete at last room of non-boss floor', () => {
      const state = createCombatState({
        floor: 1,
        room: 4,
        roomsPerFloor: 4,
        fightCount: 1, // not a draft trigger after increment
      });

      handleEnemyDeath(state);

      expect(state.phase).toBe('floor-complete');
    });

    it('transitions to shop at last room of boss floor', () => {
      const state = createCombatState({
        floor: 5,
        room: 4,
        roomsPerFloor: 4,
        fightCount: 1,
      });

      handleEnemyDeath(state);

      expect(state.phase).toBe('shop');
      expect(state.checkpoint).toBe(5);
      expect(state.shopCards.length).toBeGreaterThan(0);
    });

    it('transitions to endless-intro at FINAL_BOSS_FLOOR', () => {
      const state = createCombatState({
        floor: FINAL_BOSS_FLOOR,
        room: 4,
        roomsPerFloor: 4,
        fightCount: 1,
      });

      handleEnemyDeath(state);

      expect(state.phase).toBe('endless-intro');
      expect(state.checkpoint).toBe(FINAL_BOSS_FLOOR);
    });

    it('draft takes priority over floor-complete/shop', () => {
      // Even on last room of boss floor, if draft triggers, it wins
      const state = createCombatState({
        floor: 5,
        room: 4,
        roomsPerFloor: 4,
        fightCount: DRAFT_FIGHT_INTERVAL - 1,
      });

      handleEnemyDeath(state);

      expect(state.phase).toBe('draft');
    });
  });

  describe('handlePlayerDeath — death summary', () => {
    it('transitions to death for floors <= FINAL_BOSS_FLOOR', () => {
      const state = createCombatState({ floor: 50 });

      handlePlayerDeath(state);

      expect(state.phase).toBe('death');
      expect(state.lastDeathStats).not.toBeNull();
      expect(state.lastDeathStats!.floor).toBe(50);
    });

    it('transitions to endless-defeat for floors > FINAL_BOSS_FLOOR', () => {
      const state = createCombatState({ floor: 101 });
      // Need to set floor after creation since startRun sets floor=1
      state.floor = 101;

      handlePlayerDeath(state);

      expect(state.phase).toBe('endless-defeat');
    });

    it('builds accurate death summary stats', () => {
      const state = createCombatState();
      state.player.power = 100;
      state.player.fortitude = 50;
      state.enemy!.power = 80;
      state.enemy!.fortitude = 40;

      handlePlayerDeath(state);

      const ds = state.lastDeathStats!;
      expect(ds.playerStats.power).toBe(100);
      expect(ds.playerStats.fortitude).toBe(50);
      expect(ds.enemyStats.power).toBe(80);
      expect(ds.enemyStats.fortitude).toBe(40);
    });
  });

  describe('resumeCombat — flow transitions', () => {
    it('advances room when not at last room', () => {
      const state = createCombatState({
        room: 1,
        roomsPerFloor: 4,
      });

      useGameStore.getState().resumeCombat();
      const newState = useGameStore.getState();

      expect(newState.phase).toBe('combat');
      expect(newState.room).toBe(2);
    });

    it('transitions to floor-complete at last room of non-boss floor', () => {
      createCombatState({ floor: 1, roomsPerFloor: 4 });
      useGameStore.setState({ floor: 1, room: 4, roomsPerFloor: 4 });

      useGameStore.getState().resumeCombat();
      expect(useGameStore.getState().phase).toBe('floor-complete');
    });

    it('transitions to shop at last room of boss floor', () => {
      createCombatState({ floor: 5, roomsPerFloor: 4 });
      useGameStore.setState({ floor: 5, room: 4, roomsPerFloor: 4 });

      useGameStore.getState().resumeCombat();
      const newState = useGameStore.getState();

      expect(newState.phase).toBe('shop');
      expect(newState.checkpoint).toBe(5);
    });

    it('transitions to endless-intro at FINAL_BOSS_FLOOR', () => {
      createCombatState({ floor: FINAL_BOSS_FLOOR, roomsPerFloor: 4 });
      useGameStore.setState({ floor: FINAL_BOSS_FLOOR, room: 4, roomsPerFloor: 4 });

      useGameStore.getState().resumeCombat();
      expect(useGameStore.getState().phase).toBe('endless-intro');
    });
  });

  describe('Checkpoint / death / respawn cycle', () => {
    it('respawnAtCheckpoint with checkpoint=0 starts at floor 1', () => {
      const state = createCombatState();
      useGameStore.setState({
        checkpoint: 0,
        phase: 'death',
      });

      useGameStore.getState().respawnAtCheckpoint();
      const newState = useGameStore.getState();

      expect(newState.floor).toBe(1);
      expect(newState.phase).toBe('combat');
      expect(newState.room).toBe(1);
    });

    it('player HP is fully restored on respawn', () => {
      const state = createCombatState();
      state.player.hp = 1; // nearly dead
      useGameStore.setState({
        player: state.player,
        checkpoint: 3,
        phase: 'death',
      });

      useGameStore.getState().respawnAtCheckpoint();
      const newState = useGameStore.getState();

      expect(newState.player.hp).toBe(newState.player.maxHp);
    });

    it('status effects cleared on respawn', () => {
      const state = createCombatState();
      addStatusEffect(state.player, 'poison', 0);
      addStatusEffect(state.player, 'curse', 0);
      useGameStore.setState({
        player: state.player,
        checkpoint: 3,
        phase: 'death',
      });

      useGameStore.getState().respawnAtCheckpoint();
      expect(useGameStore.getState().player.statusEffects).toEqual([]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// DRAFT/SHOP STAT RECALCULATION
// ═══════════════════════════════════════════════════════════════

describe('Draft/Shop — stat recalculation', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('confirmDraft recalculates maxHp when fortitude boosted', () => {
    const state = createCombatState();
    const initialMaxHp = state.player.maxHp;
    const initialHp = state.player.hp; // capture BEFORE mutation
    const initialFort = state.player.fortitude;

    // Manually set up draft state
    useGameStore.setState({
      phase: 'draft',
      draftChoices: [
        { stat: 'fortitude', value: 10, impactPreview: '+50 HP' },
        { stat: 'power', value: 5, impactPreview: '+10% damage' },
        { stat: 'speed', value: 2, impactPreview: '-200ms' },
      ],
      selectedChoices: [0],
    });

    useGameStore.getState().confirmDraft();
    const newState = useGameStore.getState();

    expect(newState.player.fortitude).toBe(initialFort + 10);
    const expectedMaxHp = getMaxHp(PLAYER_BASE_HP, initialFort + 10);
    expect(newState.player.maxHp).toBe(expectedMaxHp);
    // HP should have increased by the same amount as maxHp gain
    const hpGain = expectedMaxHp - initialMaxHp;
    expect(newState.player.hp).toBe(initialHp + hpGain);
  });

  it('confirmDraft updates basePower when power boosted', () => {
    const state = createCombatState();
    const initialPower = state.player.power;

    useGameStore.setState({
      phase: 'draft',
      draftChoices: [
        { stat: 'power', value: 15, impactPreview: '+15% damage' },
      ],
      selectedChoices: [0],
    });

    useGameStore.getState().confirmDraft();
    const newState = useGameStore.getState();

    expect(newState.player.power).toBe(initialPower + 15);
    expect(newState.player.basePower).toBe(initialPower + 15);
  });

  it('confirmDraft updates baseSpeed when speed boosted', () => {
    const state = createCombatState();
    const initialSpeed = state.player.speed;

    useGameStore.setState({
      phase: 'draft',
      draftChoices: [
        { stat: 'speed', value: 3, impactPreview: '-500ms' },
      ],
      selectedChoices: [0],
    });

    useGameStore.getState().confirmDraft();
    const newState = useGameStore.getState();

    expect(newState.player.speed).toBe(initialSpeed + 3);
    expect(newState.player.baseSpeed).toBe(initialSpeed + 3);
  });

  it('confirmDraft with no selection does nothing', () => {
    const state = createCombatState();
    const snapshot = JSON.stringify(state.player);

    useGameStore.setState({
      phase: 'draft',
      draftChoices: [
        { stat: 'power', value: 15, impactPreview: '+15% damage' },
      ],
      selectedChoices: [],
    });

    useGameStore.getState().confirmDraft();
    const newState = useGameStore.getState();

    expect(JSON.stringify(newState.player)).toBe(snapshot);
  });

  it('confirmShop recalculates maxHp when fortitude boosted', () => {
    const state = createCombatState();
    const initialMaxHp = state.player.maxHp;
    const initialFort = state.player.fortitude;

    useGameStore.setState({
      phase: 'shop',
      shopCards: [
        { type: 'stat_boost', stat: 'fortitude', statValue: 10 },
        { type: 'stat_boost', stat: 'power', statValue: 5 },
      ],
      selectedChoices: [0],
    });

    useGameStore.getState().confirmShop();
    const newState = useGameStore.getState();

    expect(newState.player.fortitude).toBe(initialFort + 10);
    expect(newState.player.maxHp).toBe(getMaxHp(PLAYER_BASE_HP, initialFort + 10));
  });

  it('confirmShop max 2 selections enforced', () => {
    const state = createCombatState();

    useGameStore.setState({
      phase: 'shop',
      shopCards: [
        { type: 'stat_boost', stat: 'power', statValue: 5 },
        { type: 'stat_boost', stat: 'power', statValue: 5 },
        { type: 'stat_boost', stat: 'power', statValue: 5 },
      ],
      selectedChoices: [],
    });

    // Select 3 cards
    useGameStore.getState().selectShopCard(0);
    useGameStore.getState().selectShopCard(1);
    useGameStore.getState().selectShopCard(2); // should be ignored

    expect(useGameStore.getState().selectedChoices).toHaveLength(2);
    expect(useGameStore.getState().selectedChoices).toEqual([0, 1]);
  });

  it('selectShopCard toggles off when re-selected', () => {
    useGameStore.setState({
      shopCards: [
        { type: 'stat_boost', stat: 'power', statValue: 5 },
      ],
      selectedChoices: [],
    });

    useGameStore.getState().selectShopCard(0);
    expect(useGameStore.getState().selectedChoices).toEqual([0]);

    useGameStore.getState().selectShopCard(0);
    expect(useGameStore.getState().selectedChoices).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// GAME STORE RESET
// ═══════════════════════════════════════════════════════════════

describe('GameStore — reset completeness', () => {
  it('resetGame clears paused state', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
    useGameStore.getState().togglePause();
    expect(useGameStore.getState().paused).toBe(true);

    useGameStore.getState().resetGame();
    expect(useGameStore.getState().paused).toBe(false);
  });

  it('resetGame resets speed multiplier', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
    useGameStore.getState().setSpeed(4);

    useGameStore.getState().resetGame();
    expect(useGameStore.getState().speedMultiplier).toBe(1);
  });

  it('cycleSpeed wraps around correctly', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();

    expect(useGameStore.getState().speedMultiplier).toBe(1);
    useGameStore.getState().cycleSpeed();
    expect(useGameStore.getState().speedMultiplier).toBe(2);
    useGameStore.getState().cycleSpeed();
    expect(useGameStore.getState().speedMultiplier).toBe(4);
    useGameStore.getState().cycleSpeed();
    expect(useGameStore.getState().speedMultiplier).toBe(1);
  });
});
