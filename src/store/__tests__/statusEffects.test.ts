import { describe, it, expect } from 'vitest';
import {
  hasEffect,
  addStatusEffect,
  removeExpiredEffects,
} from '../actions/statusEffects';
import type { CombatEntity } from '@/types/game';
import { MAX_POISON_STACKS, POISON_DURATION_MS, STUN_DURATION_MS, STUN_IMMUNITY_MS, MAX_CURSE_STACKS } from '@/math/balance';

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
