import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialPlayer } from '../actions/setup';
import { useGameStore } from '../gameStore';
import { CLASSES } from '@/data/classes';
import {
  PLAYER_BASE_HP,
  PLAYER_BASE_POWER,
  PLAYER_BASE_FORTITUDE,
  PLAYER_BASE_SPEED,
  PLAYER_BASE_LUCK,
} from '@/math/balance';
import { getMaxHp, getAttackInterval } from '@/math/stats';

describe('createInitialPlayer', () => {
  it('creates a player with base stats', () => {
    const player = createInitialPlayer();
    expect(player.power).toBe(PLAYER_BASE_POWER);
    expect(player.fortitude).toBe(PLAYER_BASE_FORTITUDE);
    expect(player.speed).toBe(PLAYER_BASE_SPEED);
    expect(player.luck).toBe(PLAYER_BASE_LUCK);
  });

  it('computes maxHp from base HP + fortitude', () => {
    const player = createInitialPlayer();
    const expectedMaxHp = getMaxHp(PLAYER_BASE_HP, PLAYER_BASE_FORTITUDE);
    expect(player.maxHp).toBe(expectedMaxHp);
    expect(player.hp).toBe(expectedMaxHp);
  });

  it('sets basePower equal to power', () => {
    const player = createInitialPlayer();
    expect(player.basePower).toBe(PLAYER_BASE_POWER);
  });

  it('initializes attackTimer to the full attack interval', () => {
    const player = createInitialPlayer();
    expect(player.attackTimer).toBe(getAttackInterval(PLAYER_BASE_SPEED));
  });

  it('starts with empty status effects', () => {
    const player = createInitialPlayer();
    expect(player.statusEffects).toEqual([]);
  });
});

describe('selectClass', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('sets the classId', () => {
    useGameStore.getState().selectClass('warrior');
    expect(useGameStore.getState().classId).toBe('warrior');
  });

  it('transitions phase to class-select', () => {
    useGameStore.getState().selectClass('warrior');
    expect(useGameStore.getState().phase).toBe('class-select');
  });

  it('creates the player entity with base stats', () => {
    useGameStore.getState().selectClass('rogue');
    const player = useGameStore.getState().player;
    expect(player.power).toBe(PLAYER_BASE_POWER);
    expect(player.hp).toBeGreaterThan(0);
    expect(player.maxHp).toBe(player.hp);
  });

  it('throws on unknown classId', () => {
    expect(() => {
      useGameStore.getState().selectClass('necromancer');
    }).toThrow('Unknown class: necromancer');
  });

  it('works for all three classes', () => {
    for (const classId of ['warrior', 'rogue', 'mage']) {
      useGameStore.setState(useGameStore.getInitialState());
      useGameStore.getState().selectClass(classId);
      expect(useGameStore.getState().classId).toBe(classId);
      expect(useGameStore.getState().player.hp).toBeGreaterThan(0);
    }
  });
});
