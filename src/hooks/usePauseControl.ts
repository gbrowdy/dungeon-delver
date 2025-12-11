import { useCallback } from 'react';
import { GameState } from '@/types/game';
import { PAUSE_REASON } from '@/constants/enums';
import { logPauseChange } from '@/utils/gameLogger';
import type { PauseReasonType } from '@/constants/enums';

interface UsePauseControlOptions {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

/**
 * Reusable hook for pause/unpause functionality.
 *
 * Centralizes all pause state management with consistent logging.
 * Ensures isPaused and pauseReason are always in sync.
 *
 * Note: This hook is for standalone pause/unpause operations. For cases where
 * pause state needs to be set atomically with other state changes (e.g., in
 * useCombatActions where pause reason is determined from combat results),
 * it's acceptable to set isPaused/pauseReason directly in the setState callback
 * as long as logPauseChange is called for debugging.
 *
 * @param setState - The GameState setter function
 * @returns Pause control functions
 */
export function usePauseControl({ setState }: UsePauseControlOptions) {
  /**
   * Pause the game with a specific reason
   *
   * @param reason - Why the game is being paused (level_up, item_drop, user, etc.)
   * @param trigger - Optional trigger context for debugging
   */
  const pause = useCallback((reason: PauseReasonType, trigger?: string) => {
    logPauseChange(true, reason, trigger);
    setState((prev: GameState) => ({
      ...prev,
      isPaused: true,
      pauseReason: reason,
    }));
  }, [setState]);

  /**
   * Resume the game (unpause)
   *
   * @param trigger - Optional trigger context for debugging
   */
  const unpause = useCallback((trigger?: string) => {
    logPauseChange(false, null, trigger);
    setState((prev: GameState) => ({
      ...prev,
      isPaused: false,
      pauseReason: null,
    }));
  }, [setState]);

  /**
   * Toggle pause state (for user-initiated pause/unpause)
   *
   * When pausing, uses USER as the reason.
   * When unpausing, clears the pause reason.
   */
  const togglePause = useCallback(() => {
    setState((prev: GameState) => {
      const newIsPaused = !prev.isPaused;
      const newPauseReason = newIsPaused ? PAUSE_REASON.USER : null;
      logPauseChange(newIsPaused, newPauseReason, 'user_toggle');
      return {
        ...prev,
        isPaused: newIsPaused,
        pauseReason: newPauseReason,
      };
    });
  }, [setState]);

  return {
    pause,
    unpause,
    togglePause,
  };
}
