// src/hooks/useSpriteAnimation.ts
//
// Tracks CSS animation classes for player and enemy sprites based on combat events.
// Uses refs so the component reads current animation state during its per-tick render
// (driven by renderVersion) without needing extra re-renders.

import { useRef, useCallback } from 'react';
import type { CombatEvent } from '@/types/game';

type AnimState = 'idle' | 'attacking' | 'hit' | 'critting' | 'dodging' | 'dying';

// Duration in ms for each animation (matches CSS durations)
const ANIM_DURATIONS: Record<AnimState, number> = {
  idle: 0,
  attacking: 200,
  hit: 150,
  critting: 200,
  dodging: 200,
  dying: 400, // dying persists, but we still track the duration
};

// CSS classes for each animation state. Player faces right, enemy faces left.
const PLAYER_CLASSES: Record<AnimState, string> = {
  idle: '',
  attacking: 'animate-combat-attack-right',
  hit: 'animate-combat-hit',
  critting: 'animate-combat-crit-hit',
  dodging: 'animate-combat-dodge',
  dying: 'animate-combat-die',
};

const ENEMY_CLASSES: Record<AnimState, string> = {
  idle: '',
  attacking: 'animate-combat-attack-left',
  hit: 'animate-combat-hit-left',
  critting: 'animate-combat-crit-hit-left',
  dodging: 'animate-combat-dodge-left',
  dying: 'animate-combat-die',
};

export interface SpriteAnimationResult {
  /** Current CSS animation class for the player sprite wrapper */
  playerClass: string;
  /** Current CSS animation class for the enemy sprite wrapper */
  enemyClass: string;
  /** Process new combat events to trigger animations. Call with the current lastTick threshold. */
  processEvents: (events: CombatEvent[], lastTick: number) => void;
}

export function useSpriteAnimation(): SpriteAnimationResult {
  const playerClassRef = useRef('');
  const enemyClassRef = useRef('');
  const playerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enemyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPlayerAnim = useCallback((state: AnimState) => {
    // Clear any pending timer
    if (playerTimerRef.current !== null) {
      clearTimeout(playerTimerRef.current);
      playerTimerRef.current = null;
    }

    playerClassRef.current = PLAYER_CLASSES[state];

    // Dying persists - no auto-clear
    if (state !== 'idle' && state !== 'dying') {
      playerTimerRef.current = setTimeout(() => {
        playerClassRef.current = '';
        playerTimerRef.current = null;
      }, ANIM_DURATIONS[state]);
    }
  }, []);

  const setEnemyAnim = useCallback((state: AnimState) => {
    if (enemyTimerRef.current !== null) {
      clearTimeout(enemyTimerRef.current);
      enemyTimerRef.current = null;
    }

    enemyClassRef.current = ENEMY_CLASSES[state];

    if (state !== 'idle' && state !== 'dying') {
      enemyTimerRef.current = setTimeout(() => {
        enemyClassRef.current = '';
        enemyTimerRef.current = null;
      }, ANIM_DURATIONS[state]);
    }
  }, []);

  const processEvents = useCallback((events: CombatEvent[], lastTick: number) => {
    const newEvents = events.filter(e => e.tick > lastTick);
    if (newEvents.length === 0) return;

    // Process each event and map to animation states.
    // Later events in the array take priority (overwrite earlier ones).
    for (const event of newEvents) {
      switch (event.type) {
        case 'damage':
        case 'dot':
        case 'reflect':
          if (event.target === 'enemy') {
            setEnemyAnim('hit');
            setPlayerAnim('attacking');
          } else {
            setPlayerAnim('hit');
            setEnemyAnim('attacking');
          }
          break;

        case 'crit':
          if (event.target === 'enemy') {
            setEnemyAnim('critting');
            setPlayerAnim('attacking');
          } else {
            setPlayerAnim('critting');
            setEnemyAnim('attacking');
          }
          break;

        case 'dodge':
          if (event.target === 'player') {
            setPlayerAnim('dodging');
            setEnemyAnim('attacking');
          } else {
            setEnemyAnim('dodging');
            setPlayerAnim('attacking');
          }
          break;

        case 'death':
          if (event.target === 'enemy') {
            setEnemyAnim('dying');
          } else {
            setPlayerAnim('dying');
          }
          break;

        // heal, stun, curse: no sprite animation
        default:
          break;
      }
    }
  }, [setPlayerAnim, setEnemyAnim]);

  return {
    get playerClass() { return playerClassRef.current; },
    get enemyClass() { return enemyClassRef.current; },
    processEvents,
  };
}
