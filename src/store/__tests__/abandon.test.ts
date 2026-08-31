import { describe, test, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

beforeEach(() => {
  useGameStore.setState(useGameStore.getInitialState());
});

describe('abandonRun', () => {
  test('resets game to menu phase', () => {
    const store = useGameStore.getState();
    store.selectClass('warrior');
    store.startRun();
    expect(useGameStore.getState().phase).toBe('combat');

    useGameStore.getState().abandonRun();
    expect(useGameStore.getState().phase).toBe('menu');
  });

  test('clears player and enemy state', () => {
    const store = useGameStore.getState();
    store.selectClass('rogue');
    store.startRun();

    useGameStore.getState().abandonRun();
    const state = useGameStore.getState();
    expect(state.player.hp).toBe(0);
    expect(state.enemy).toBeNull();
    expect(state.classId).toBe('');
  });
});
