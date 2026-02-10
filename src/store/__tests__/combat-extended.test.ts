import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';

describe('combat counters', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
  });

  it('initial state has combat counters', () => {
    const state = useGameStore.getState();
    expect(state.combatCounters).toEqual({
      playerAttackCount: 0,
      playerHitCount: 0,
      shieldRefreshTimer: 0,
      curseDecayTimer: 0,
    });
  });

  it('initial state has lastPlayerHitDamage at 0', () => {
    expect(useGameStore.getState().lastPlayerHitDamage).toBe(0);
  });

  it('player has baseSpeed set', () => {
    const state = useGameStore.getState();
    expect(state.player.baseSpeed).toBeGreaterThan(0);
    expect(state.player.baseSpeed).toBe(state.player.speed);
  });

  it('enemy has baseSpeed set', () => {
    const state = useGameStore.getState();
    expect(state.enemy!.baseSpeed).toBeGreaterThan(0);
    expect(state.enemy!.baseSpeed).toBe(state.enemy!.speed);
  });
});
