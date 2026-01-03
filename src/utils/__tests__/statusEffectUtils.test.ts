import { describe, it, expect } from 'vitest';
import {
  applyStatusToPlayer,
  applyStatusToEnemy,
  hasStatusEffect,
} from '../statusEffectUtils';
import { Player, Enemy, StatusEffect } from '@/types/game';
import { STATUS_EFFECT_TYPE } from '@/constants/enums';
import { COMBAT_BALANCE } from '@/constants/balance';

const createMockPlayer = (overrides?: Partial<Player>): Player => ({
  name: 'Test Player',
  class: 'warrior',
  level: 1,
  experience: 0,
  experienceToNext: 100,
  gold: 0,
  baseStats: {
    health: 100,
    maxHealth: 100,
    power: 10,
    armor: 5,
    speed: 10,
    mana: 50,
    maxMana: 50,
    fortune: 5,
  },
  currentStats: {
    health: 100,
    maxHealth: 100,
    power: 10,
    armor: 5,
    speed: 10,
    mana: 50,
    maxMana: 50,
    fortune: 5,
  },
  powers: [],
  inventory: [],
  equippedItems: [],
  activeBuffs: [],
  statusEffects: [],
  isBlocking: false,
  comboCount: 0,
  lastPowerUsed: null,
  isDying: false,
  path: null,
  pendingAbilityChoice: false,
  shield: 0,
  shieldMaxDuration: 0,
  shieldRemainingDuration: 0,
  usedCombatAbilities: [],
  usedFloorAbilities: [],
  enemyAttackCounter: 0,
  abilityCounters: {},
  attackModifiers: [],
  hpRegen: 0,
  ...overrides,
});

const createMockEnemy = (overrides?: Partial<Enemy>): Enemy => ({
  id: 'test-enemy',
  name: 'Test Enemy',
  health: 100,
  maxHealth: 100,
  power: 10,
  armor: 5,
  speed: 10,
  tier: 'common',
  abilities: [],
  statusEffects: [],
  ...overrides,
});

describe('hasStatusEffect', () => {
  it('returns true when effect exists', () => {
    const effects: StatusEffect[] = [
      { id: 'poison-1', type: 'poison', damage: 5, remainingTurns: 3, icon: 'status-poison' },
    ];
    expect(hasStatusEffect(effects, STATUS_EFFECT_TYPE.POISON)).toBe(true);
  });

  it('returns false when effect does not exist', () => {
    const effects: StatusEffect[] = [
      { id: 'poison-1', type: 'poison', damage: 5, remainingTurns: 3, icon: 'status-poison' },
    ];
    expect(hasStatusEffect(effects, STATUS_EFFECT_TYPE.STUN)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasStatusEffect([], STATUS_EFFECT_TYPE.POISON)).toBe(false);
  });
});

describe('applyStatusToPlayer', () => {
  it('applies poison with correct duration and icon', () => {
    const player = createMockPlayer();
    const result = applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.POISON, damage: 5 },
      'enemy_ability'
    );

    expect(result.applied).toBe(true);
    expect(result.player.statusEffects).toHaveLength(1);
    expect(result.player.statusEffects[0].type).toBe('poison');
    expect(result.player.statusEffects[0].damage).toBe(5);
    expect(result.player.statusEffects[0].remainingTurns).toBe(COMBAT_BALANCE.DEFAULT_POISON_DURATION);
    expect(result.player.statusEffects[0].icon).toBe('status-poison');
  });

  it('applies stun with default duration from COMBAT_BALANCE', () => {
    const player = createMockPlayer();
    const result = applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.STUN },
      'enemy_ability'
    );

    expect(result.applied).toBe(true);
    expect(result.player.statusEffects[0].type).toBe('stun');
    expect(result.player.statusEffects[0].remainingTurns).toBe(COMBAT_BALANCE.DEFAULT_STUN_DURATION);
  });

  it('respects immunity - returns applied: false', () => {
    const player = createMockPlayer();
    const result = applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.STUN },
      'enemy_ability',
      [STATUS_EFFECT_TYPE.STUN]
    );

    expect(result.applied).toBe(false);
    expect(result.player.statusEffects).toHaveLength(0);
    expect(result.logs[0]).toContain('Resisted');
  });

  it('refreshes existing effect instead of stacking', () => {
    const existingEffect: StatusEffect = {
      id: 'poison-old',
      type: 'poison',
      damage: 3,
      remainingTurns: 1,
      icon: 'status-poison',
    };
    const player = createMockPlayer({ statusEffects: [existingEffect] });

    const result = applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.POISON, damage: 5, duration: 3 },
      'enemy_ability'
    );

    expect(result.player.statusEffects).toHaveLength(1);
    expect(result.player.statusEffects[0].remainingTurns).toBe(3);
  });

  it('takes higher damage when refreshing poison', () => {
    const existingEffect: StatusEffect = {
      id: 'poison-old',
      type: 'poison',
      damage: 10,
      remainingTurns: 1,
      icon: 'status-poison',
    };
    const player = createMockPlayer({ statusEffects: [existingEffect] });

    const result = applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.POISON, damage: 5 },
      'enemy_ability'
    );

    expect(result.player.statusEffects[0].damage).toBe(10);
  });

  it('does not mutate original player', () => {
    const player = createMockPlayer();
    const originalEffectsLength = player.statusEffects.length;

    applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.POISON, damage: 5 },
      'enemy_ability'
    );

    expect(player.statusEffects.length).toBe(originalEffectsLength);
  });

  it('applies bleed with correct duration and icon', () => {
    const player = createMockPlayer();
    const result = applyStatusToPlayer(
      player,
      { type: STATUS_EFFECT_TYPE.BLEED, damage: 8 },
      'enemy_ability'
    );

    expect(result.applied).toBe(true);
    expect(result.player.statusEffects).toHaveLength(1);
    expect(result.player.statusEffects[0].type).toBe('bleed');
    expect(result.player.statusEffects[0].damage).toBe(8);
    expect(result.player.statusEffects[0].remainingTurns).toBe(COMBAT_BALANCE.DEFAULT_POISON_DURATION);
    expect(result.player.statusEffects[0].icon).toBe('status-bleed');
    expect(result.logs[0]).toContain('bleeding');
  });
});

describe('applyStatusToEnemy', () => {
  it('applies status effect to enemy', () => {
    const enemy = createMockEnemy();
    const result = applyStatusToEnemy(
      enemy,
      { type: STATUS_EFFECT_TYPE.SLOW, value: 0.3, duration: 4 },
      'power'
    );

    expect(result.applied).toBe(true);
    expect(result.enemy.statusEffects).toHaveLength(1);
    expect(result.enemy.statusEffects![0].type).toBe('slow');
    expect(result.enemy.statusEffects![0].value).toBe(0.3);
    expect(result.enemy.statusEffects![0].remainingTurns).toBe(4);
  });

  it('adds status effect to empty statusEffects array', () => {
    const enemy = createMockEnemy({ statusEffects: [] });
    const result = applyStatusToEnemy(
      enemy,
      { type: STATUS_EFFECT_TYPE.STUN, duration: 2 },
      'power'
    );

    expect(result.enemy.statusEffects).toBeDefined();
    expect(result.enemy.statusEffects).toHaveLength(1);
    expect(result.enemy.statusEffects![0].type).toBe('stun');
    expect(result.enemy.statusEffects![0].remainingTurns).toBe(2);
  });

  it('refreshes existing effect', () => {
    const existingEffect: StatusEffect = {
      id: 'slow-old',
      type: 'slow',
      value: 0.2,
      remainingTurns: 1,
      icon: 'status-slow',
    };
    const enemy = createMockEnemy({ statusEffects: [existingEffect] });

    const result = applyStatusToEnemy(
      enemy,
      { type: STATUS_EFFECT_TYPE.SLOW, value: 0.3, duration: 4 },
      'power'
    );

    expect(result.enemy.statusEffects).toHaveLength(1);
    expect(result.enemy.statusEffects![0].value).toBe(0.3);
    expect(result.enemy.statusEffects![0].remainingTurns).toBe(4);
  });

  it('does not mutate original enemy', () => {
    const enemy = createMockEnemy();
    const originalEffectsLength = enemy.statusEffects?.length ?? 0;

    applyStatusToEnemy(
      enemy,
      { type: STATUS_EFFECT_TYPE.POISON, damage: 5 },
      'power'
    );

    expect(enemy.statusEffects?.length ?? 0).toBe(originalEffectsLength);
  });

  it('applies bleed with correct duration and icon', () => {
    const enemy = createMockEnemy();
    const result = applyStatusToEnemy(
      enemy,
      { type: STATUS_EFFECT_TYPE.BLEED, damage: 6 },
      'path_ability'
    );

    expect(result.applied).toBe(true);
    expect(result.enemy.statusEffects).toHaveLength(1);
    expect(result.enemy.statusEffects![0].type).toBe('bleed');
    expect(result.enemy.statusEffects![0].damage).toBe(6);
    expect(result.enemy.statusEffects![0].remainingTurns).toBe(COMBAT_BALANCE.DEFAULT_POISON_DURATION);
    expect(result.enemy.statusEffects![0].icon).toBe('status-bleed');
    expect(result.logs[0]).toContain('bleeding');
  });
});
