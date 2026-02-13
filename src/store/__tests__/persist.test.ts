import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// We need to mock localStorage BEFORE the store module loads
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

// Set up localStorage mock before any imports
vi.stubGlobal('localStorage', localStorageMock);

import { useGameStore } from '../gameStore';

beforeEach(() => {
  localStorageMock.clear();
  (localStorageMock.setItem as ReturnType<typeof vi.fn>).mockClear();
  (localStorageMock.getItem as ReturnType<typeof vi.fn>).mockClear();
  useGameStore.setState(useGameStore.getInitialState());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('persistence', () => {
  it('persist middleware is configured with correct storage name', () => {
    const persistApi = (useGameStore as unknown as { persist: { getOptions: () => { name: string } } }).persist;
    expect(persistApi.getOptions().name).toBe('rogue-game-state');
  });

  it('partialize returns empty for combat phase', () => {
    // Access persist options via the store's persist API
    const persistOptions = (useGameStore as unknown as { persist: { getOptions: () => { partialize: (s: unknown) => unknown } } }).persist.getOptions();

    const combatState = { ...useGameStore.getInitialState(), phase: 'combat' };
    const result = persistOptions.partialize(combatState);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('partialize returns empty for menu phase', () => {
    const persistOptions = (useGameStore as unknown as { persist: { getOptions: () => { partialize: (s: unknown) => unknown } } }).persist.getOptions();

    const menuState = { ...useGameStore.getInitialState(), phase: 'menu' };
    const result = persistOptions.partialize(menuState);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('partialize returns empty for endless mode (floor > 100)', () => {
    const persistOptions = (useGameStore as unknown as { persist: { getOptions: () => { partialize: (s: unknown) => unknown } } }).persist.getOptions();

    const endlessState = { ...useGameStore.getInitialState(), phase: 'floor-complete', floor: 101 };
    const result = persistOptions.partialize(endlessState);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('partialize excludes transient fields for saveable state', () => {
    const persistOptions = (useGameStore as unknown as { persist: { getOptions: () => { partialize: (s: unknown) => unknown } } }).persist.getOptions();

    const saveableState = {
      ...useGameStore.getInitialState(),
      phase: 'floor-complete',
      floor: 5,
    };
    const result = persistOptions.partialize(saveableState) as Record<string, unknown>;

    // Should include core state
    expect(result.phase).toBe('floor-complete');
    expect(result.floor).toBe(5);

    // Should exclude transient state
    expect(result.combatEvents).toBeUndefined();
    expect(result.combatElapsed).toBeUndefined();
    expect(result.combatCounters).toBeUndefined();
    expect(result.renderVersion).toBeUndefined();
    expect(result.gameTick).toBeUndefined();
    expect(result.enemy).toBeUndefined();
    expect(result.enemyDefinition).toBeUndefined();
    expect(result.lastPlayerHitDamage).toBeUndefined();
  });
});

describe('hydration', () => {
  it('transient state always starts at defaults regardless of stored data', () => {
    // After any hydration, transient fields should be defaults
    const state = useGameStore.getState();
    expect(state.combatEvents).toEqual([]);
    expect(state.combatElapsed).toBe(0);
    expect(state.renderVersion).toBe(0);
    expect(state.gameTick).toBe(0);
    expect(state.enemy).toBeNull();
    expect(state.enemyDefinition).toBeNull();
  });

  it('onRehydrateStorage clears status effects from interrupted combat', () => {
    const persistApi = (useGameStore as unknown as {
      persist: { getOptions: () => { onRehydrateStorage?: () => (state: Record<string, unknown> | undefined) => void } }
    }).persist;

    const onRehydrate = persistApi.getOptions().onRehydrateStorage;
    expect(onRehydrate).toBeDefined();

    if (onRehydrate) {
      // Simulate rehydrated state with lingering status effects
      const rehydratedState = {
        ...useGameStore.getInitialState(),
        phase: 'floor-complete',
        floor: 5,
        player: {
          power: 50, fortitude: 40, speed: 12, luck: 8,
          basePower: 50, baseSpeed: 12,
          hp: 300, maxHp: 300,
          attackTimer: 0,
          statusEffects: [{ type: 'poison', stacks: 3, duration: 1000 }],
        },
      } as Record<string, unknown>;

      // Call the rehydration handler
      const handler = onRehydrate();
      handler(rehydratedState);

      // Status effects should be cleared
      const player = rehydratedState.player as { statusEffects: unknown[] };
      expect(player.statusEffects).toEqual([]);

      // Transient state should be reset
      expect(rehydratedState.combatElapsed).toBe(0);
      expect(rehydratedState.combatEvents).toEqual([]);
      expect(rehydratedState.renderVersion).toBe(0);
      expect(rehydratedState.gameTick).toBe(0);
      expect(rehydratedState.enemy).toBeNull();
      expect(rehydratedState.enemyDefinition).toBeNull();
    }
  });

  it('onRehydrateStorage handles undefined state gracefully', () => {
    const persistApi = (useGameStore as unknown as {
      persist: { getOptions: () => { onRehydrateStorage?: () => (state: Record<string, unknown> | undefined) => void } }
    }).persist;

    const onRehydrate = persistApi.getOptions().onRehydrateStorage;
    expect(onRehydrate).toBeDefined();

    if (onRehydrate) {
      const handler = onRehydrate();
      // Should not throw when state is undefined (no saved state)
      expect(() => handler(undefined)).not.toThrow();
    }
  });
});
