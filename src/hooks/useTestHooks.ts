// src/hooks/useTestHooks.ts

import { useEffect, useCallback } from 'react';
import { GameState } from '@/types/game';
import type { TestHooks } from '@/types/test-hooks';
import { getAbilityById } from '@/data/enemies';

interface UseTestHooksParams {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

/**
 * Check if player is in test invincible mode.
 * Uses window global for reliable cross-module access.
 */
export function isTestInvincible(): boolean {
  return typeof window !== 'undefined' && window.__TEST_INVINCIBLE__ === true;
}

/**
 * Set player invincibility mode.
 */
function setTestInvincible(invincible: boolean): void {
  if (typeof window !== 'undefined') {
    window.__TEST_INVINCIBLE__ = invincible;
  }
}

/**
 * Exposes test hooks on window.__TEST_HOOKS__ when testMode=true URL param is present.
 * Only use for E2E testing - these hooks bypass normal game logic.
 */
export function useTestHooks({ state, setState }: UseTestHooksParams): void {
  // Check if test mode is enabled via URL param
  const isTestMode = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('testMode') === 'true';

  const setPlayerHealth = useCallback((hp: number) => {
    setState(prev => {
      if (!prev.player) return prev;
      return {
        ...prev,
        player: {
          ...prev.player,
          currentStats: {
            ...prev.player.currentStats,
            health: hp,
          },
        },
      };
    });
  }, [setState]);

  const setPlayerMana = useCallback((mana: number) => {
    setState(prev => {
      if (!prev.player) return prev;
      return {
        ...prev,
        player: {
          ...prev.player,
          currentStats: {
            ...prev.player.currentStats,
            mana,
          },
        },
      };
    });
  }, [setState]);

  const setEnemyHealth = useCallback((hp: number) => {
    setState(prev => {
      if (!prev.currentEnemy) return prev;
      return {
        ...prev,
        currentEnemy: {
          ...prev.currentEnemy,
          health: hp,
        },
      };
    });
  }, [setState]);

  const setPlayerXP = useCallback((xp: number) => {
    setState(prev => {
      if (!prev.player) return prev;
      return {
        ...prev,
        player: {
          ...prev.player,
          experience: xp,
        },
      };
    });
  }, [setState]);

  const setPlayerLevel = useCallback((level: number) => {
    setState(prev => {
      if (!prev.player) return prev;
      return {
        ...prev,
        player: {
          ...prev.player,
          level,
        },
        // Trigger level-up popup
        pendingLevelUp: level,
      };
    });
  }, [setState]);

  const getGameState = useCallback(() => state, [state]);

  const getPlayerLevel = useCallback(() => state.player?.level ?? 0, [state.player?.level]);

  const getCurrentFloor = useCallback(() => state.currentFloor, [state.currentFloor]);

  const getCurrentRoom = useCallback(() => state.currentRoom, [state.currentRoom]);

  const setEnemyOneHitKill = useCallback(() => {
    setState(prev => {
      if (!prev.currentEnemy) return prev;
      return {
        ...prev,
        currentEnemy: {
          ...prev.currentEnemy,
          health: 1,
        },
      };
    });
  }, [setState]);

  const setPlayerInvincible = useCallback((invincible: boolean) => {
    setTestInvincible(invincible);
  }, []);

  const isPlayerInvincible = useCallback(() => {
    return isTestInvincible();
  }, []);

  const setEnemyAbilities = useCallback((abilityIds: string[]) => {
    setState(prev => {
      if (!prev.currentEnemy) return prev;
      const abilities = abilityIds
        .map(id => getAbilityById(id))
        .filter((a): a is NonNullable<typeof a> => a !== undefined);
      return {
        ...prev,
        currentEnemy: {
          ...prev.currentEnemy,
          abilities,
        },
      };
    });
  }, [setState]);

  const getCombatLogs = useCallback(() => {
    return state.combatLog?.toArray() ?? [];
  }, [state.combatLog]);

  useEffect(() => {
    if (!isTestMode) {
      // Clean up if test mode is disabled
      if (window.__TEST_HOOKS__) {
        delete window.__TEST_HOOKS__;
      }
      return;
    }

    const hooks: TestHooks = {
      setPlayerHealth,
      setPlayerMana,
      setEnemyHealth,
      setPlayerXP,
      setPlayerLevel,
      getGameState,
      getPlayerLevel,
      getCurrentFloor,
      getCurrentRoom,
      setEnemyOneHitKill,
      setPlayerInvincible,
      isPlayerInvincible,
      setEnemyAbilities,
      getCombatLogs,
    };

    window.__TEST_HOOKS__ = hooks;

    return () => {
      delete window.__TEST_HOOKS__;
    };
  }, [
    isTestMode,
    setPlayerHealth,
    setPlayerMana,
    setEnemyHealth,
    setPlayerXP,
    setPlayerLevel,
    getGameState,
    getPlayerLevel,
    getCurrentFloor,
    getCurrentRoom,
    setEnemyOneHitKill,
    setPlayerInvincible,
    isPlayerInvincible,
    setEnemyAbilities,
    getCombatLogs,
  ]);
}
