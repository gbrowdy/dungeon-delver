import { create } from 'zustand';
import type { GameState } from '@/types/game';
import { createInitialPlayer } from './actions/setup';
import { CLASSES } from '@/data/classes';
import { generateEnemy } from '@/data/enemies';
import { getRoomsPerFloor } from '@/math/scaling';
import { tickCombat } from './actions/combat';

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
    baseSpeed: 0,
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
  combatCounters: {
    playerAttackCount: 0,
    playerHitCount: 0,
    shieldRefreshTimer: 0,
    curseDecayTimer: 0,
  },
  lastPlayerHitDamage: 0,
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
export const useGameStore = create<GameStore>()((set, get) => ({
  ...INITIAL_STATE,

  selectClass: (classId: string) => {
    if (!CLASSES[classId]) {
      throw new Error(`Unknown class: ${classId}`);
    }
    const player = createInitialPlayer();
    set({
      classId,
      player,
      phase: 'class-select',
    });
  },

  startRun: () => {
    const { classId } = get();
    if (!classId) {
      throw new Error('Cannot start run: no class selected');
    }

    const floor = 1;
    const generated = generateEnemy(floor);
    const roomsPerFloor = getRoomsPerFloor(floor);

    set({
      phase: 'combat',
      floor,
      room: 1,
      roomsPerFloor,
      fightCount: 1,
      enemy: generated.entity,
      enemyDefinition: { tier: generated.tier, modifiers: generated.modifiers },
      combatElapsed: 0,
      combatEvents: [],
      combatCounters: {
        playerAttackCount: 0,
        playerHitCount: 0,
        shieldRefreshTimer: 0,
        curseDecayTimer: 0,
      },
      lastPlayerHitDamage: 0,
      depth: 1,
      checkpoint: 0,
      lastDeathStats: null,
    });
  },

  tick: (dt: number) => {
    const state = get();
    state.gameTick += 1;
    tickCombat(state, dt);
    set({ renderVersion: state.renderVersion + 1 });
  },

  resetGame: () => {
    set({ ...INITIAL_STATE });
  },
}));
