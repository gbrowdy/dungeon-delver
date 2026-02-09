import { create } from 'zustand';
import type { GameState } from '@/types/game';

// -- Actions interface (methods on the store) ---------------------------------
export interface GameActions {
  // Setup actions (3A)
  selectClass: (classId: string) => void;
  startRun: () => void;

  // Combat tick placeholder (3B)
  tick: (dt: number) => void;

  // Reset
  resetGame: () => void;
}

export type GameStore = GameState & GameActions;

// -- Initial state ------------------------------------------------------------
const INITIAL_STATE: GameState = {
  // Run state
  phase: 'menu',
  floor: 0,
  room: 0,
  roomsPerFloor: 0,
  paused: false,
  fightCount: 0,

  // Player (zeroed -- populated by selectClass)
  player: {
    power: 0,
    fortitude: 0,
    speed: 0,
    luck: 0,
    basePower: 0,
    hp: 0,
    maxHp: 0,
    attackTimer: 0,
    statusEffects: [],
  },
  classId: '',
  equippedItems: { weapon: null, armor: null, accessory: null },

  // Enemy (null until combat starts)
  enemy: null,
  enemyDefinition: null,

  // Combat state
  combatElapsed: 0,
  combatEvents: [],
  speedMultiplier: 1,
  gameTick: 0,

  // Draft/shop
  draftChoices: [],
  shopCards: [],
  selectedChoices: [],

  // Progression
  depth: 0,
  checkpoint: 0,
  lastDeathStats: null,

  // Rendering
  renderVersion: 0,
};

// -- Store --------------------------------------------------------------------
export const useGameStore = create<GameStore>()((set, _get) => ({
  ...INITIAL_STATE,

  selectClass: (_classId: string) => {
    // Implemented in Task 3
  },

  startRun: () => {
    // Implemented in Task 4
  },

  tick: (_dt: number) => {
    // Placeholder -- implemented in 3B
  },

  resetGame: () => {
    set({ ...INITIAL_STATE });
  },
}));
