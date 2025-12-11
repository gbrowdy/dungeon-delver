import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Frame-rate independent game loop using requestAnimationFrame.
 * Replaces setInterval for more consistent timing across devices.
 */
interface UseGameLoopOptions {
  onTick: () => void;
  tickInterval: number; // Desired tick interval in ms
  enabled: boolean;
}

export function useGameLoop({ onTick, tickInterval, enabled }: UseGameLoopOptions) {
  const lastTickRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const tickFiredAtRef = useRef<number>(0); // Track when last tick fired
  const [tickProgress, setTickProgress] = useState(0); // 0-1 progress to next tick

  // How long to hold progress at 100% after tick fires (ms)
  const HOLD_FULL_DURATION = 200;

  const gameLoop = useCallback((timestamp: number) => {
    if (!enabled) {
      animationFrameRef.current = null;
      return;
    }

    // Initialize lastTick on first frame
    if (lastTickRef.current === 0) {
      lastTickRef.current = timestamp;
    }

    // Calculate delta time since last frame
    const deltaTime = timestamp - lastTickRef.current;
    lastTickRef.current = timestamp;

    // Accumulate time
    accumulatedTimeRef.current += deltaTime;

    // Process ticks while we have enough accumulated time
    // Cap at 3 ticks per frame to prevent spiral of death on slow devices
    let ticksProcessed = 0;
    const maxTicksPerFrame = 3;

    while (accumulatedTimeRef.current >= tickInterval && ticksProcessed < maxTicksPerFrame) {
      onTick();
      tickFiredAtRef.current = timestamp; // Record when tick fired
      accumulatedTimeRef.current -= tickInterval;
      ticksProcessed++;
    }

    // If we hit the max, discard excess time to prevent queuing
    if (ticksProcessed >= maxTicksPerFrame && accumulatedTimeRef.current > tickInterval) {
      accumulatedTimeRef.current = 0;
    }

    // Update tick progress (0-1 representing progress to next tick)
    // Hold at 100% briefly after tick fires so the attack animation can play
    const timeSinceLastTick = timestamp - tickFiredAtRef.current;
    let progress: number;
    if (timeSinceLastTick < HOLD_FULL_DURATION && tickFiredAtRef.current > 0) {
      // Hold at full while attack animation plays
      progress = 1;
    } else {
      progress = Math.min(1, accumulatedTimeRef.current / tickInterval);
    }
    setTickProgress(progress);

    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [enabled, tickInterval, onTick]);

  // Start/stop loop based on enabled state
  useEffect(() => {
    if (enabled) {
      // Reset timing on enable
      lastTickRef.current = 0;
      accumulatedTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, gameLoop]);

  // Utility to reset timing (useful when pausing/unpausing)
  const resetTiming = useCallback(() => {
    lastTickRef.current = 0;
    accumulatedTimeRef.current = 0;
  }, []);

  return { resetTiming, tickProgress };
}
