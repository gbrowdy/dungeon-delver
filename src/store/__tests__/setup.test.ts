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
import { getMaxHp } from '@/math/stats';
import { getRoomsPerFloor } from '@/math/scaling';

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

  it('player starts with attackTimer at 0 for initiative', () => {
    const player = createInitialPlayer();
    expect(player.attackTimer).toBe(0);
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

describe('startRun', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
    // Must select class first
    useGameStore.getState().selectClass('warrior');
  });

  it('transitions phase to combat', () => {
    useGameStore.getState().startRun();
    expect(useGameStore.getState().phase).toBe('combat');
  });

  it('sets floor to 1 and room to 1', () => {
    useGameStore.getState().startRun();
    const state = useGameStore.getState();
    expect(state.floor).toBe(1);
    expect(state.room).toBe(1);
  });

  it('computes roomsPerFloor for floor 1', () => {
    useGameStore.getState().startRun();
    expect(useGameStore.getState().roomsPerFloor).toBe(getRoomsPerFloor(1));
  });

  it('spawns an enemy', () => {
    useGameStore.getState().startRun();
    const state = useGameStore.getState();
    expect(state.enemy).not.toBeNull();
    expect(state.enemy!.hp).toBeGreaterThan(0);
    expect(state.enemyDefinition).not.toBeNull();
    expect(state.enemyDefinition!.tier).toBeDefined();
    expect(state.enemyDefinition!.modifiers).toBeDefined();
  });

  it('resets combat elapsed and fight count', () => {
    useGameStore.getState().startRun();
    const state = useGameStore.getState();
    expect(state.combatElapsed).toBe(0);
    expect(state.fightCount).toBe(1);
  });

  it('clears combat events', () => {
    useGameStore.getState().startRun();
    expect(useGameStore.getState().combatEvents).toEqual([]);
  });

  it('sets depth to 1', () => {
    useGameStore.getState().startRun();
    expect(useGameStore.getState().depth).toBe(1);
  });

  it('throws if no class selected', () => {
    useGameStore.setState(useGameStore.getInitialState());
    expect(() => {
      useGameStore.getState().startRun();
    }).toThrow();
  });
});

describe('full setup flow: menu → class-select → combat', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('completes the full setup flow for each class', () => {
    for (const classId of ['warrior', 'rogue', 'mage']) {
      useGameStore.setState(useGameStore.getInitialState());

      // Start at menu
      expect(useGameStore.getState().phase).toBe('menu');

      // Select class
      useGameStore.getState().selectClass(classId);
      expect(useGameStore.getState().phase).toBe('class-select');
      expect(useGameStore.getState().classId).toBe(classId);

      // Start run
      useGameStore.getState().startRun();
      const state = useGameStore.getState();
      expect(state.phase).toBe('combat');
      expect(state.floor).toBe(1);
      expect(state.room).toBe(1);
      expect(state.enemy).not.toBeNull();
      expect(state.player.hp).toBeGreaterThan(0);
      expect(state.enemy!.hp).toBeGreaterThan(0);
    }
  });

  it('reset returns to menu from mid-run', () => {
    useGameStore.getState().selectClass('mage');
    useGameStore.getState().startRun();
    expect(useGameStore.getState().phase).toBe('combat');

    useGameStore.getState().resetGame();
    expect(useGameStore.getState().phase).toBe('menu');
    expect(useGameStore.getState().enemy).toBeNull();
  });
});
