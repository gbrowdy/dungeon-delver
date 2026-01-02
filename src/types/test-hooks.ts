// src/types/test-hooks.ts

import { GameState } from './game';

export interface TestHooks {
  // State manipulation
  setPlayerHealth: (hp: number) => void;
  setPlayerMana: (mana: number) => void;
  setEnemyHealth: (hp: number) => void;
  setPlayerXP: (xp: number) => void;
  setPlayerLevel: (level: number) => void;

  // State inspection
  getGameState: () => GameState;
  getPlayerLevel: () => number;
  getCurrentFloor: () => number;
  getCurrentRoom: () => number;

  // Speed helpers
  setEnemyOneHitKill: () => void;
}

declare global {
  interface Window {
    __TEST_HOOKS__?: TestHooks;
  }
}

export {};
