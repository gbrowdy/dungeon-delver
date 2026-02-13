import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { TICK_MS, MAX_CATCHUP_TICKS } from '@/math/balance';

/**
 * Game loop hook. Uses requestAnimationFrame with a fixed-timestep
 * accumulator pattern. Game logic runs in TICK_MS (16ms) increments
 * regardless of frame rate.
 *
 * - Speed multiplier scales effective delta (1x/2x/4x)
 * - Catchup is capped to MAX_CATCHUP_TICKS after tab backgrounding
 * - Paused state skips accumulation entirely
 */
export function useGameLoop(): void {
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(-1);
  const accumulatorRef = useRef<number>(0);

  useEffect(() => {
    function loop(timestamp: number) {
      const state = useGameStore.getState();

      if (lastTimeRef.current < 0) {
        lastTimeRef.current = timestamp;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      if (!state.paused) {
        const rawDelta = timestamp - lastTimeRef.current;
        const cappedDelta = Math.min(rawDelta, MAX_CATCHUP_TICKS * TICK_MS);
        accumulatorRef.current += cappedDelta * state.speedMultiplier;

        while (accumulatorRef.current >= TICK_MS) {
          state.tick(TICK_MS);
          accumulatorRef.current -= TICK_MS;
        }
      }

      lastTimeRef.current = timestamp;
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);
}
