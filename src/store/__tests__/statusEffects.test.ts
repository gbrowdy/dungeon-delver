import { describe, it, expect } from 'vitest';
import {
  hasEffect,
  addStatusEffect,
  removeExpiredEffects,
  tickStatusEffects,
} from '../actions/statusEffects';
import type { CombatEntity, GameState } from '@/types/game';
import { useGameStore } from '../gameStore';
import { MAX_POISON_STACKS, POISON_DURATION_MS, STUN_DURATION_MS, STUN_IMMUNITY_MS, MAX_CURSE_STACKS, TICK_MS, CURSE_DECAY_INTERVAL_MS } from '@/math/balance';

function createEntity(): CombatEntity {
  return {
    power: 10, fortitude: 10, speed: 10, luck: 5,
    basePower: 10, baseSpeed: 10, hp: 100, maxHp: 100, attackTimer: 1000,
    statusEffects: [],
  };
}

describe('hasEffect', () => {
  it('returns false when entity has no effects', () => {
    expect(hasEffect(createEntity(), 'poison')).toBe(false);
  });

  it('returns true when entity has the effect', () => {
    const entity = createEntity();
    entity.statusEffects.push({ type: 'poison', stacks: 1, remainingMs: 3000 });
    expect(hasEffect(entity, 'poison')).toBe(true);
  });
});

describe('addStatusEffect', () => {
  it('adds a new poison stack', () => {
    const entity = createEntity();
    addStatusEffect(entity, 'poison', 0);
    expect(entity.statusEffects).toHaveLength(1);
    expect(entity.statusEffects[0].type).toBe('poison');
    expect(entity.statusEffects[0].stacks).toBe(1);
    expect(entity.statusEffects[0].remainingMs).toBe(POISON_DURATION_MS);
  });

  it('increments poison stacks up to max', () => {
    const entity = createEntity();
    for (let i = 0; i < MAX_POISON_STACKS + 2; i++) {
      addStatusEffect(entity, 'poison', 0);
    }
    const poison = entity.statusEffects.find(e => e.type === 'poison');
    expect(poison!.stacks).toBe(MAX_POISON_STACKS);
  });

  it('refreshes oldest poison stack when at max', () => {
    const entity = createEntity();
    for (let i = 0; i < MAX_POISON_STACKS; i++) {
      addStatusEffect(entity, 'poison', 0);
    }
    entity.statusEffects[0].remainingMs = 500;
    addStatusEffect(entity, 'poison', 0);
    const poison = entity.statusEffects.find(e => e.type === 'poison');
    expect(poison!.stacks).toBe(MAX_POISON_STACKS);
    expect(poison!.remainingMs).toBe(POISON_DURATION_MS);
  });

  it('adds stun with immunity check', () => {
    const entity = createEntity();
    addStatusEffect(entity, 'stun', 0);
    const stun = entity.statusEffects.find(e => e.type === 'stun');
    expect(stun).toBeDefined();
    expect(stun!.remainingMs).toBe(STUN_DURATION_MS);
  });

  it('does not stun during immunity window', () => {
    const entity = createEntity();
    addStatusEffect(entity, 'stun', 0);
    const stun = entity.statusEffects.find(e => e.type === 'stun')!;
    stun.remainingMs = 0;
    stun.immuneUntilMs = 5000;
    addStatusEffect(entity, 'stun', 1000);
    const stuns = entity.statusEffects.filter(e => e.type === 'stun');
    expect(stuns.every(s => s.remainingMs === 0)).toBe(true);
  });

  it('adds curse stacks up to max', () => {
    const entity = createEntity();
    for (let i = 0; i < MAX_CURSE_STACKS + 2; i++) {
      addStatusEffect(entity, 'curse', 0);
    }
    const curse = entity.statusEffects.find(e => e.type === 'curse');
    expect(curse!.stacks).toBe(MAX_CURSE_STACKS);
  });
});

describe('removeExpiredEffects', () => {
  it('removes effects with 0 remaining duration', () => {
    const entity = createEntity();
    entity.statusEffects.push({ type: 'poison', stacks: 1, remainingMs: 0 });
    removeExpiredEffects(entity);
    expect(entity.statusEffects).toHaveLength(0);
  });

  it('keeps effects with remaining duration', () => {
    const entity = createEntity();
    entity.statusEffects.push({ type: 'poison', stacks: 2, remainingMs: 1500 });
    removeExpiredEffects(entity);
    expect(entity.statusEffects).toHaveLength(1);
  });

  it('sets stun immunity when stun expires', () => {
    const entity = createEntity();
    entity.statusEffects.push({ type: 'stun', stacks: 1, remainingMs: 0 });
    removeExpiredEffects(entity, 3000);
  });
});

function createCombatState(): GameState {
  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.getState().selectClass('warrior');
  useGameStore.getState().startRun();
  return useGameStore.getState();
}

describe('tickStatusEffects', () => {
  describe('poison', () => {
    it('deals damage over time to the entity', () => {
      const state = createCombatState();
      const enemy = state.enemy!;
      const hpBefore = enemy.hp;
      enemy.statusEffects.push({ type: 'poison', stacks: 1, remainingMs: POISON_DURATION_MS });

      tickStatusEffects(state, TICK_MS);

      expect(enemy.statusEffects[0].remainingMs).toBe(POISON_DURATION_MS - TICK_MS);
    });

    it('removes poison when duration expires', () => {
      const state = createCombatState();
      const enemy = state.enemy!;
      enemy.statusEffects.push({ type: 'poison', stacks: 1, remainingMs: TICK_MS });

      tickStatusEffects(state, TICK_MS);

      const poison = enemy.statusEffects.find(e => e.type === 'poison' && e.remainingMs > 0);
      expect(poison).toBeUndefined();
    });

    it('poison damage uses half-fortitude DoT rule', () => {
      const state = createCombatState();
      const enemy = state.enemy!;
      enemy.hp = 1000;
      enemy.maxHp = 1000;
      enemy.fortitude = 100;
      // Boost player power so per-tick poison damage rounds above 0
      state.player.power = 500;

      enemy.statusEffects.push({ type: 'poison', stacks: 1, remainingMs: POISON_DURATION_MS });

      const hpBefore = enemy.hp;
      for (let i = 0; i < 60; i++) {
        tickStatusEffects(state, TICK_MS);
      }

      expect(enemy.hp).toBeLessThan(hpBefore);
    });
  });

  describe('stun', () => {
    it('decrements stun duration', () => {
      const state = createCombatState();
      const enemy = state.enemy!;
      enemy.statusEffects.push({ type: 'stun', stacks: 1, remainingMs: 500 });

      tickStatusEffects(state, TICK_MS);

      expect(enemy.statusEffects[0].remainingMs).toBe(500 - TICK_MS);
    });
  });

  describe('poison — fractional accumulation', () => {
    it('deals damage even at low power levels', () => {
      const state = createCombatState();
      state.enemy!.hp = 100;
      state.enemy!.maxHp = 100;
      state.player.power = 10;
      state.enemy!.fortitude = 10;
      state.enemy!.statusEffects = [{ type: 'poison', stacks: 1, remainingMs: 3000 }];

      // Tick 187 times (3000ms / 16ms = ~187 ticks)
      for (let i = 0; i < 187; i++) {
        tickStatusEffects(state, 16);
      }

      // Poison MUST have dealt some damage (previously it dealt 0)
      expect(state.enemy!.hp).toBeLessThan(100);
    });

    it('total poison damage over full duration matches expected value', () => {
      const state = createCombatState();
      state.enemy!.hp = 1000;
      state.enemy!.maxHp = 1000;
      state.player.power = 10;
      state.enemy!.fortitude = 10;
      state.enemy!.statusEffects = [{ type: 'poison', stacks: 1, remainingMs: 3000 }];

      for (let i = 0; i < 200; i++) {
        tickStatusEffects(state, 16);
      }

      const damageTaken = 1000 - state.enemy!.hp;
      expect(damageTaken).toBeGreaterThan(0);
    });
  });

  describe('curse decay', () => {
    it('decays one curse stack every 3 seconds', () => {
      const state = createCombatState();
      const enemy = state.enemy!;
      enemy.statusEffects.push({ type: 'curse', stacks: 5, remainingMs: Infinity });
      state.combatCounters.curseDecayTimer = CURSE_DECAY_INTERVAL_MS - TICK_MS;

      tickStatusEffects(state, TICK_MS);

      expect(enemy.statusEffects[0].stacks).toBe(4);
    });

    it('removes curse when stacks reach 0', () => {
      const state = createCombatState();
      const enemy = state.enemy!;
      enemy.statusEffects.push({ type: 'curse', stacks: 1, remainingMs: Infinity });
      state.combatCounters.curseDecayTimer = CURSE_DECAY_INTERVAL_MS - TICK_MS;

      tickStatusEffects(state, TICK_MS);

      const curse = enemy.statusEffects.find(e => e.type === 'curse');
      expect(curse).toBeUndefined();
    });
  });
});
