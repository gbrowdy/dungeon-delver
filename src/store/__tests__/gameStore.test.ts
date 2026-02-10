import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  describe('initial state', () => {
    it('has the correct initial phase', () => {
      const state = useGameStore.getState();
      expect(state.phase).toBe('menu');
    });

    it('has the correct initial run state', () => {
      const state = useGameStore.getState();
      expect(state.floor).toBe(0);
      expect(state.room).toBe(0);
      expect(state.roomsPerFloor).toBe(0);
      expect(state.paused).toBe(false);
      expect(state.fightCount).toBe(0);
    });

    it('has a zeroed-out player entity', () => {
      const state = useGameStore.getState();
      expect(state.player).toEqual({
        power: 0,
        fortitude: 0,
        speed: 0,
        luck: 0,
        basePower: 0,
        baseSpeed: 0,
        hp: 0,
        maxHp: 0,
        attackTimer: 0,
        statusEffects: [],
      });
    });

    it('has empty equipped items', () => {
      const state = useGameStore.getState();
      expect(state.equippedItems).toEqual({
        weapon: null,
        armor: null,
        accessory: null,
      });
    });

    it('has no enemy', () => {
      const state = useGameStore.getState();
      expect(state.enemy).toBeNull();
      expect(state.enemyDefinition).toBeNull();
    });

    it('has initial combat state', () => {
      const state = useGameStore.getState();
      expect(state.combatElapsed).toBe(0);
      expect(state.combatEvents).toEqual([]);
      expect(state.speedMultiplier).toBe(1);
      expect(state.gameTick).toBe(0);
    });

    it('has empty draft/shop state', () => {
      const state = useGameStore.getState();
      expect(state.draftChoices).toEqual([]);
      expect(state.shopCards).toEqual([]);
      expect(state.selectedChoices).toEqual([]);
    });

    it('has initial progression state', () => {
      const state = useGameStore.getState();
      expect(state.depth).toBe(0);
      expect(state.checkpoint).toBe(0);
      expect(state.lastDeathStats).toBeNull();
    });

    it('has renderVersion 0', () => {
      const state = useGameStore.getState();
      expect(state.renderVersion).toBe(0);
    });
  });

  describe('resetGame', () => {
    it('resets all state back to initial', () => {
      const store = useGameStore;
      // Mutate state
      store.getState().selectClass('warrior');
      store.getState().startRun();
      expect(store.getState().phase).toBe('combat');
      expect(store.getState().enemy).not.toBeNull();

      // Reset
      store.getState().resetGame();
      const state = store.getState();
      expect(state.phase).toBe('menu');
      expect(state.classId).toBe('');
      expect(state.player.hp).toBe(0);
      expect(state.enemy).toBeNull();
      expect(state.floor).toBe(0);
      expect(state.depth).toBe(0);
    });
  });
});
