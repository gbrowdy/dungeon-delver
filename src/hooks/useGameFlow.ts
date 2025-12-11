/**
 * Game flow event system - manages game state transitions in an event-driven manner.
 *
 * Instead of using effects to detect "stuck" states and recover, this system
 * uses explicit events to trigger transitions. When an action completes (like
 * dismissing a level up popup), it explicitly requests the next transition.
 */
import { useCallback, useRef } from 'react';
import { GameState } from '@/types/game';
import { GAME_PHASE } from '@/constants/enums';
import { logRecovery } from '@/utils/gameLogger';
import { useTrackedTimeouts } from '@/hooks/useTrackedTimeouts';

export type GameFlowEvent =
  | { type: 'ENEMY_DEFEATED' }
  | { type: 'ENEMY_DEATH_ANIMATION_COMPLETE' }
  | { type: 'PLAYER_DEATH_ANIMATION_COMPLETE' }
  | { type: 'LEVEL_UP_DISMISSED' }
  | { type: 'ITEM_POPUP_DISMISSED' }
  | { type: 'FLOOR_COMPLETE_CONTINUE' }
  | { type: 'REQUEST_NEXT_ROOM' };

interface UseGameFlowOptions {
  getState: () => GameState;
  nextRoom: () => void;
  showFloorComplete: () => void;
}

/**
 * Hook for managing game flow transitions in an event-driven manner.
 *
 * This replaces the reactive recovery effects with explicit event dispatching.
 * When a popup is dismissed or animation completes, the caller dispatches
 * an event which triggers the appropriate next action.
 */
export function useGameFlow({ getState, nextRoom, showFloorComplete }: UseGameFlowOptions) {
  // Track pending transitions to prevent double-execution
  const pendingTransitionRef = useRef<string | null>(null);
  // Track timeouts for proper cleanup on unmount
  const { createTrackedTimeout } = useTrackedTimeouts();

  /**
   * Dispatch a game flow event and handle the appropriate transition.
   */
  const dispatch = useCallback((event: GameFlowEvent) => {
    const state = getState();

    // Guard: only handle events in combat phase
    if (state.gamePhase !== GAME_PHASE.COMBAT) {
      return;
    }

    // Generate a transition key to prevent duplicates
    const transitionKey = `${event.type}-${state.currentRoom}-${state.currentFloor}`;

    switch (event.type) {
      case 'LEVEL_UP_DISMISSED':
      case 'ITEM_POPUP_DISMISSED': {
        // After dismissing a popup, check if we need to continue the game flow
        // This is the event-driven replacement for the recovery effect
        if (pendingTransitionRef.current === transitionKey) {
          return; // Already handling this transition
        }

        // If enemy is already cleared and we're not paused, trigger next action
        if (!state.currentEnemy && !state.isPaused && !state.pendingLevelUp) {
          pendingTransitionRef.current = transitionKey;
          logRecovery('event_driven_transition', {
            event: event.type,
            room: state.currentRoom
          });

          if (state.currentRoom < state.roomsPerFloor) {
            // More rooms to go
            createTrackedTimeout(() => {
              nextRoom();
              pendingTransitionRef.current = null;
            }, 0);
          } else {
            // Floor complete
            createTrackedTimeout(() => {
              showFloorComplete();
              pendingTransitionRef.current = null;
            }, 0);
          }
        }
        break;
      }

      case 'ENEMY_DEATH_ANIMATION_COMPLETE': {
        // Animation system should handle clearing the enemy
        // This event just logs for debugging
        logRecovery('enemy_death_complete', { room: state.currentRoom });
        break;
      }

      case 'REQUEST_NEXT_ROOM': {
        // Explicit request to spawn next room
        if (!state.currentEnemy && !state.isPaused && !state.pendingLevelUp) {
          if (pendingTransitionRef.current === transitionKey) {
            return;
          }
          pendingTransitionRef.current = transitionKey;

          if (state.currentRoom < state.roomsPerFloor) {
            createTrackedTimeout(() => {
              nextRoom();
              pendingTransitionRef.current = null;
            }, 0);
          } else {
            createTrackedTimeout(() => {
              showFloorComplete();
              pendingTransitionRef.current = null;
            }, 0);
          }
        }
        break;
      }

      default:
        // Other events are logged but don't trigger transitions
        break;
    }
  }, [getState, nextRoom, showFloorComplete, createTrackedTimeout]);

  /**
   * Reset the pending transition tracking (e.g., when starting a new floor)
   */
  const resetFlow = useCallback(() => {
    pendingTransitionRef.current = null;
  }, []);

  return {
    dispatch,
    resetFlow,
  };
}
