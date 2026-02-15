import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameLoop } from '../useGameLoop';
import { useGameStore } from '@/store/gameStore';

// Mock requestAnimationFrame
let rafCallbacks: ((time: number) => void)[] = [];
let rafId = 0;

beforeEach(() => {
  rafCallbacks = [];
  rafId = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
    rafCallbacks.push(cb);
    return ++rafId;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  useGameStore.setState(useGameStore.getInitialState());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function simulateFrame(time: number) {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach(cb => cb(time));
}

describe('useGameLoop', () => {
  it('starts the loop and calls tick on animation frames', () => {
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();

    const tickBefore = useGameStore.getState().gameTick;

    renderHook(() => useGameLoop());

    simulateFrame(0);   // first frame initializes lastTime
    simulateFrame(16);  // second frame produces a tick

    expect(useGameStore.getState().gameTick).toBeGreaterThan(tickBefore);
  });

  it('does not tick when paused', () => {
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();

    renderHook(() => useGameLoop());

    simulateFrame(0);

    // Pause the game
    useGameStore.setState({ paused: true });

    const tickCountBefore = useGameStore.getState().gameTick;
    simulateFrame(16);
    simulateFrame(32);

    // gameTick should not increase while paused
    expect(useGameStore.getState().gameTick).toBe(tickCountBefore);
  });

  it('applies speed multiplier to delta', () => {
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
    useGameStore.setState({ speedMultiplier: 2 });

    renderHook(() => useGameLoop());

    simulateFrame(0);

    const tickBefore = useGameStore.getState().gameTick;
    simulateFrame(16); // 16ms * 2x = 32ms effective -> 2 ticks

    const ticksProduced = useGameStore.getState().gameTick - tickBefore;
    // At 2x speed, 16ms wall time should produce 2 ticks (32ms / 16ms)
    expect(ticksProduced).toBeGreaterThanOrEqual(2);
  });

  it('caps catchup ticks after tab backgrounding', () => {
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();

    renderHook(() => useGameLoop());

    simulateFrame(0);

    const tickBefore = useGameStore.getState().gameTick;
    simulateFrame(5000); // 5 second gap (tab was backgrounded)

    const ticksProduced = useGameStore.getState().gameTick - tickBefore;
    // Should cap at MAX_CATCHUP_TICKS (10), not process 5000/16 = 312 ticks
    expect(ticksProduced).toBeLessThanOrEqual(10);
  });

  it('runs combat via game loop: player and enemy trade hits', () => {
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();

    const initialEnemyHp = useGameStore.getState().enemy!.hp;
    const initialPlayerHp = useGameStore.getState().player.hp;

    renderHook(() => useGameLoop());

    // Simulate 3 seconds of game time at 60fps
    let time = 0;
    for (let i = 0; i < 180; i++) {
      time += 16.67;
      simulateFrame(time);
    }

    // After 3 seconds, combat should have progressed
    const state = useGameStore.getState();
    const enemyTookDamage = state.enemy != null && state.enemy.hp < initialEnemyHp;
    const playerTookDamage = state.player.hp < initialPlayerHp;

    expect(enemyTookDamage || playerTookDamage).toBe(true);
  });

  it('stops progressing combat when phase is not combat', () => {
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
    useGameStore.setState({ phase: 'draft' });

    renderHook(() => useGameLoop());

    simulateFrame(0);

    const playerHpBefore = useGameStore.getState().player.hp;

    simulateFrame(16);
    simulateFrame(32);
    simulateFrame(48);

    // tick() is called but tickCombat returns early for non-combat phases
    // Player HP shouldn't change
    expect(useGameStore.getState().player.hp).toBe(playerHpBefore);
    expect(useGameStore.getState().phase).toBe('draft');
  });

  it('cleans up on unmount', () => {
    const cancelSpy = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelSpy);

    const { unmount } = renderHook(() => useGameLoop());
    simulateFrame(0);

    unmount();

    expect(cancelSpy).toHaveBeenCalled();
  });
});
