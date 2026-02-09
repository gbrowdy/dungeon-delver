// src/ecs/hooks/__tests__/useGameEngine.test.ts
/**
 * Unit tests for useGameEngine hook.
 *
 * Tests cover:
 * - Loop starts when enabled is true
 * - Loop stops when enabled becomes false
 * - Cleanup on unmount
 * - Tick state updates as loop runs
 * - Manual start/stop controls
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameEngine } from '../useGameEngine';
import {
  startLoop,
  stopLoop,
  getTick,
  getRenderVersion,
  resetTick,
  isLoopRunning,
  subscribeToTick,
} from '../../loop';

// Mock the loop module
vi.mock('../../loop', () => ({
  startLoop: vi.fn(),
  stopLoop: vi.fn(),
  getTick: vi.fn(() => 0),
  getRenderVersion: vi.fn(() => 0),
  isLoopRunning: vi.fn(() => false),
  subscribeToTick: vi.fn(() => vi.fn()),
}));

const mockStartLoop = startLoop as ReturnType<typeof vi.fn>;
const mockStopLoop = stopLoop as ReturnType<typeof vi.fn>;
const mockGetTick = getTick as ReturnType<typeof vi.fn>;
const mockGetRenderVersion = getRenderVersion as ReturnType<typeof vi.fn>;
const mockIsLoopRunning = isLoopRunning as ReturnType<typeof vi.fn>;
const mockSubscribeToTick = subscribeToTick as ReturnType<typeof vi.fn>;

describe('useGameEngine', () => {
  let unsubscribeFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribeFn = vi.fn();
    mockSubscribeToTick.mockReturnValue(unsubscribeFn);
    mockGetTick.mockReturnValue(0);
    mockIsLoopRunning.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('enabled option', () => {
    it('should start loop when enabled is true', () => {
      renderHook(() => useGameEngine({ enabled: true }));

      expect(mockStartLoop).toHaveBeenCalledTimes(1);
    });

    it('should not start loop when enabled is false', () => {
      renderHook(() => useGameEngine({ enabled: false }));

      expect(mockStartLoop).not.toHaveBeenCalled();
      expect(mockStopLoop).toHaveBeenCalledTimes(1);
    });

    it('should stop loop when enabled changes from true to false', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useGameEngine({ enabled }),
        { initialProps: { enabled: true } }
      );

      expect(mockStartLoop).toHaveBeenCalledTimes(1);
      mockStartLoop.mockClear();

      rerender({ enabled: false });

      expect(mockStopLoop).toHaveBeenCalled();
    });

    it('should start loop when enabled changes from false to true', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useGameEngine({ enabled }),
        { initialProps: { enabled: false } }
      );

      expect(mockStartLoop).not.toHaveBeenCalled();

      rerender({ enabled: true });

      expect(mockStartLoop).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup on unmount', () => {
    it('should stop loop when component unmounts', () => {
      const { unmount } = renderHook(() => useGameEngine({ enabled: true }));

      mockStopLoop.mockClear();
      unmount();

      expect(mockStopLoop).toHaveBeenCalled();
    });

    it('should unsubscribe from tick updates on unmount', () => {
      const { unmount } = renderHook(() => useGameEngine({ enabled: true }));

      unmount();

      expect(unsubscribeFn).toHaveBeenCalled();
    });
  });

  describe('tick state', () => {
    it('should return initial tick value', () => {
      mockGetTick.mockReturnValue(0);

      const { result } = renderHook(() => useGameEngine({ enabled: true }));

      expect(result.current.tick).toBe(0);
    });

    it('should update tick when subscriber callback is called', () => {
      let subscriberCallback: (() => void) | null = null;
      mockSubscribeToTick.mockImplementation((callback) => {
        subscriberCallback = callback;
        return unsubscribeFn;
      });

      const { result } = renderHook(() => useGameEngine({ enabled: true }));

      expect(result.current.tick).toBe(0);

      // Simulate tick update
      mockGetTick.mockReturnValue(5);
      mockIsLoopRunning.mockReturnValue(true);

      act(() => {
        if (subscriberCallback) {
          subscriberCallback();
        }
      });

      expect(result.current.tick).toBe(5);
    });
  });

  describe('isRunning state', () => {
    it('should return true when loop is started with enabled=true', () => {
      const { result } = renderHook(() => useGameEngine({ enabled: true }));

      expect(result.current.isRunning).toBe(true);
    });

    it('should return false when enabled is false', () => {
      const { result } = renderHook(() => useGameEngine({ enabled: false }));

      expect(result.current.isRunning).toBe(false);
    });

    it('should update isRunning when subscriber callback is called', () => {
      let subscriberCallback: (() => void) | null = null;
      mockSubscribeToTick.mockImplementation((callback) => {
        subscriberCallback = callback;
        return unsubscribeFn;
      });

      const { result } = renderHook(() => useGameEngine({ enabled: true }));

      // Simulate tick with running=false
      mockGetTick.mockReturnValue(1);
      mockIsLoopRunning.mockReturnValue(false);

      act(() => {
        if (subscriberCallback) {
          subscriberCallback();
        }
      });

      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('manual start/stop controls', () => {
    it('should start loop when start() is called', () => {
      const { result } = renderHook(() => useGameEngine({ enabled: false }));

      mockStartLoop.mockClear();

      act(() => {
        result.current.start();
      });

      expect(mockStartLoop).toHaveBeenCalledTimes(1);
      expect(result.current.isRunning).toBe(true);
    });

    it('should stop loop when stop() is called', () => {
      const { result } = renderHook(() => useGameEngine({ enabled: true }));

      mockStopLoop.mockClear();

      act(() => {
        result.current.stop();
      });

      expect(mockStopLoop).toHaveBeenCalledTimes(1);
      expect(result.current.isRunning).toBe(false);
    });

    it('should allow toggling via start/stop', () => {
      const { result } = renderHook(() => useGameEngine({ enabled: false }));

      // Start
      act(() => {
        result.current.start();
      });
      expect(result.current.isRunning).toBe(true);

      // Stop
      act(() => {
        result.current.stop();
      });
      expect(result.current.isRunning).toBe(false);

      // Start again
      act(() => {
        result.current.start();
      });
      expect(result.current.isRunning).toBe(true);
    });
  });

  describe('subscription', () => {
    it('should subscribe to tick updates on mount', () => {
      renderHook(() => useGameEngine({ enabled: true }));

      expect(mockSubscribeToTick).toHaveBeenCalledTimes(1);
      expect(typeof mockSubscribeToTick.mock.calls[0][0]).toBe('function');
    });

    it('should only subscribe once (stable subscription)', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useGameEngine({ enabled }),
        { initialProps: { enabled: true } }
      );

      expect(mockSubscribeToTick).toHaveBeenCalledTimes(1);

      rerender({ enabled: false });
      rerender({ enabled: true });

      // Still only 1 subscription
      expect(mockSubscribeToTick).toHaveBeenCalledTimes(1);
    });
  });
});
