// src/ecs/context/__tests__/GameContext.test.tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  GameProvider,
  useGame,
  usePlayer,
  useEnemy,
  useGameState,
  useGameActions,
  useAttackProgress,
} from '../GameContext';
import { world, clearWorld } from '../../world';
import type { Entity } from '../../components';

// Mock the game engine hook to avoid actual loop
vi.mock('../../hooks/useGameEngine', () => ({
  useGameEngine: vi.fn(() => ({
    tick: 0,
    isRunning: false,
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

// Mock the loop functions
vi.mock('../../loop', () => ({
  startLoop: vi.fn(),
  stopLoop: vi.fn(),
  getTick: vi.fn(() => 0),
  isLoopRunning: vi.fn(() => false),
  subscribeToTick: vi.fn(() => () => {}),
}));

// Helper to create a test player entity
function createTestPlayerEntity(): Entity {
  return {
    player: true,
    identity: { name: 'Test Hero', class: 'warrior' },
    health: { current: 100, max: 100 },
    mana: { current: 50, max: 50 },
    attack: {
      baseDamage: 10,
      critChance: 0.1,
      critMultiplier: 2,
      variance: { min: 0.9, max: 1.1 },
    },
    defense: { value: 5, blockReduction: 0.4 },
    speed: { value: 10, attackInterval: 2500, accumulated: 1000 },
    progression: { level: 1, xp: 0, xpToNext: 100 },
    inventory: { gold: 50, items: [] },
    powers: [],
    cooldowns: new Map(),
    statusEffects: [],
    buffs: [],
    equipment: { weapon: null, armor: null, accessory: null },
  };
}

// Helper to create a test enemy entity
function createTestEnemyEntity(): Entity {
  return {
    enemy: {
      tier: 'common',
      name: 'Test Goblin',
      isBoss: false,
      abilities: [],
      intent: null,
    },
    health: { current: 50, max: 50 },
    attack: {
      baseDamage: 5,
      critChance: 0.05,
      critMultiplier: 1.5,
      variance: { min: 0.9, max: 1.1 },
    },
    defense: { value: 2, blockReduction: 0 },
    speed: { value: 8, attackInterval: 3000, accumulated: 500 },
    statusEffects: [],
    rewards: { xp: 10, gold: 5 },
  };
}

// Helper to create a test game state entity
function createTestGameStateEntity(): Entity {
  return {
    gameState: true,
    phase: 'combat',
    paused: false,
    combatSpeed: { multiplier: 1 },
    floor: { number: 1, room: 1, totalRooms: 5 },
    isTransitioning: false,
    popups: {},
    pendingLevelUp: null,
    pendingRewards: null,
    animationEvents: [],
    combatLog: [],
  };
}

describe('GameContext', () => {
  beforeEach(() => {
    clearWorld();
  });

  afterEach(() => {
    clearWorld();
    vi.clearAllMocks();
  });

  describe('GameProvider', () => {
    it('renders children', () => {
      render(
        <GameProvider>
          <div data-testid="child">Hello</div>
        </GameProvider>
      );

      expect(screen.getByTestId('child')).toBeDefined();
      expect(screen.getByText('Hello')).toBeDefined();
    });

    it('accepts enabled prop', () => {
      render(
        <GameProvider enabled={false}>
          <div data-testid="child">Hello</div>
        </GameProvider>
      );

      expect(screen.getByTestId('child')).toBeDefined();
    });
  });

  describe('useGame', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useGame());
      }).toThrow('useGame must be used within a GameProvider');

      consoleSpy.mockRestore();
    });

    it('provides context value within provider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.tick).toBe(0);
      expect(result.current.isRunning).toBe(false);
      expect(result.current.actions).toBeDefined();
    });
  });

  describe('Snapshot creation', () => {
    it('provides null player when no player entity exists', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.player).toBeNull();
    });

    it('provides player snapshot when player entity exists', () => {
      world.add(createTestPlayerEntity());

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.player).not.toBeNull();
      expect(result.current.player?.name).toBe('Test Hero');
      expect(result.current.player?.characterClass).toBe('warrior');
      expect(result.current.player?.health.current).toBe(100);
    });

    it('provides null enemy when no enemy entity exists', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.enemy).toBeNull();
    });

    it('provides enemy snapshot when enemy entity exists', () => {
      world.add(createTestEnemyEntity());

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.enemy).not.toBeNull();
      expect(result.current.enemy?.name).toBe('Test Goblin');
      expect(result.current.enemy?.tier).toBe('common');
      expect(result.current.enemy?.health.current).toBe(50);
    });

    it('provides default game state when no game state entity exists', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.gameState).toBeDefined();
      expect(result.current.gameState.phase).toBe('menu');
      expect(result.current.gameState.floor).toBe(1);
    });

    it('provides game state snapshot when game state entity exists', () => {
      world.add(createTestGameStateEntity());

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.gameState.phase).toBe('combat');
      expect(result.current.gameState.combatSpeed).toBe(1);
      expect(result.current.gameState.isPaused).toBe(false);
    });
  });

  describe('Attack progress', () => {
    it('provides heroProgress as 0 when no player exists', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.heroProgress).toBe(0);
    });

    it('calculates heroProgress from player speed', () => {
      world.add(createTestPlayerEntity()); // accumulated: 1000, interval: 2500

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.heroProgress).toBe(0.4); // 1000 / 2500
    });

    it('provides enemyProgress as 0 when no enemy exists', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.enemyProgress).toBe(0);
    });

    it('calculates enemyProgress from enemy speed', () => {
      world.add(createTestEnemyEntity()); // accumulated: 500, interval: 3000

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.enemyProgress).toBeCloseTo(0.167, 2); // 500 / 3000
    });
  });

  describe('Actions', () => {
    it('provides all action functions', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });
      const { actions } = result.current;

      // Game flow
      expect(typeof actions.startGame).toBe('function');
      expect(typeof actions.selectClass).toBe('function');
      expect(typeof actions.selectPath).toBe('function');
      expect(typeof actions.selectAbility).toBe('function');
      expect(typeof actions.selectSubpath).toBe('function');

      // Combat
      expect(typeof actions.usePower).toBe('function');

      // UI
      expect(typeof actions.togglePause).toBe('function');
      expect(typeof actions.setCombatSpeed).toBe('function');
      expect(typeof actions.dismissLevelUp).toBe('function');

      // Progression
      expect(typeof actions.continueFromFloorComplete).toBe('function');
      expect(typeof actions.restartGame).toBe('function');
      expect(typeof actions.retryFloor).toBe('function');

      // Shop
      expect(typeof actions.openShop).toBe('function');
      expect(typeof actions.closeShop).toBe('function');
      expect(typeof actions.purchaseShopItem).toBe('function');
      expect(typeof actions.enhanceEquippedItem).toBe('function');

      // Animation callbacks
      expect(typeof actions.handleTransitionComplete).toBe('function');
      expect(typeof actions.handleEnemyDeathAnimationComplete).toBe('function');
      expect(typeof actions.handlePlayerDeathAnimationComplete).toBe('function');
    });

    it('actions are callable without throwing', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGame(), { wrapper });
      const { actions } = result.current;

      // These should not throw
      expect(() => actions.startGame()).not.toThrow();
      expect(() => actions.selectClass('warrior')).not.toThrow();
      expect(() => actions.togglePause()).not.toThrow();
      expect(() => actions.setCombatSpeed(2)).not.toThrow();
      expect(() => actions.usePower('fireball')).not.toThrow();
    });
  });

  describe('Convenience hooks', () => {
    it('usePlayer returns player snapshot', () => {
      world.add(createTestPlayerEntity());

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => usePlayer(), { wrapper });

      expect(result.current?.name).toBe('Test Hero');
    });

    it('useEnemy returns enemy snapshot', () => {
      world.add(createTestEnemyEntity());

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useEnemy(), { wrapper });

      expect(result.current?.name).toBe('Test Goblin');
    });

    it('useGameState returns game state snapshot', () => {
      world.add(createTestGameStateEntity());

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGameState(), { wrapper });

      expect(result.current.phase).toBe('combat');
    });

    it('useGameActions returns actions object', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useGameActions(), { wrapper });

      expect(typeof result.current.togglePause).toBe('function');
    });

    it('useAttackProgress returns progress values', () => {
      world.add(createTestPlayerEntity());
      world.add(createTestEnemyEntity());

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GameProvider>{children}</GameProvider>
      );

      const { result } = renderHook(() => useAttackProgress(), { wrapper });

      expect(result.current.heroProgress).toBe(0.4);
      expect(result.current.enemyProgress).toBeCloseTo(0.167, 2);
    });
  });
});
