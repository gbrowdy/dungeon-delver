import { create } from 'zustand';
import type { GameState } from '@/types/game';
import { createInitialPlayer } from './actions/setup';
import { CLASSES } from '@/data/classes';
import { generateEnemy } from '@/data/enemies';
import { getRoomsPerFloor } from '@/math/scaling';
import { tickCombat } from './actions/combat';
import { spawnEnemy, isBossFloor } from './actions/flow';
import { ENDLESS_START_FLOOR, FINAL_BOSS_FLOOR } from '@/math/balance';

// -- Actions interface (methods on the store) ---------------------------------
export interface GameActions {
  // Setup actions (3A)
  selectClass: (classId: string) => void;
  startRun: () => void;

  // Combat tick placeholder (3B)
  tick: (dt: number) => void;

  // Flow actions (3D)
  advanceFloor: () => void;
  respawnAtCheckpoint: () => void;
  startEndless: () => void;
  resumeCombat: () => void;

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

  advanceFloor: () => {
    const state = get();
    const nextFloor = state.floor + 1;
    const roomsPerFloor = getRoomsPerFloor(nextFloor);

    state.player.hp = state.player.maxHp;
    state.player.statusEffects = [];
    state.floor = nextFloor;
    state.room = 1;
    state.roomsPerFloor = roomsPerFloor;
    state.fightCount = 0;
    state.depth = Math.max(state.depth, nextFloor);

    spawnEnemy(state, false);

    set({
      phase: 'combat',
      floor: nextFloor,
      room: 1,
      roomsPerFloor,
      fightCount: 0,
      player: state.player,
      enemy: state.enemy,
      enemyDefinition: state.enemyDefinition,
      combatElapsed: state.combatElapsed,
      combatEvents: state.combatEvents,
      combatCounters: state.combatCounters,
      lastPlayerHitDamage: state.lastPlayerHitDamage,
      depth: state.depth,
    });
  },

  respawnAtCheckpoint: () => {
    const state = get();
    const respawnFloor = Math.max(1, state.checkpoint);
    const roomsPerFloor = getRoomsPerFloor(respawnFloor);

    state.player.hp = state.player.maxHp;
    state.player.statusEffects = [];
    state.floor = respawnFloor;
    state.room = 1;
    state.roomsPerFloor = roomsPerFloor;
    state.fightCount = 0;

    spawnEnemy(state, false);

    set({
      phase: 'combat',
      floor: respawnFloor,
      room: 1,
      roomsPerFloor,
      fightCount: 0,
      player: state.player,
      enemy: state.enemy,
      enemyDefinition: state.enemyDefinition,
      combatElapsed: state.combatElapsed,
      combatEvents: state.combatEvents,
      combatCounters: state.combatCounters,
      lastPlayerHitDamage: state.lastPlayerHitDamage,
    });
  },

  startEndless: () => {
    const state = get();
    const floor = ENDLESS_START_FLOOR;
    const roomsPerFloor = getRoomsPerFloor(floor);

    state.player.hp = state.player.maxHp;
    state.player.statusEffects = [];
    state.floor = floor;
    state.room = 1;
    state.roomsPerFloor = roomsPerFloor;
    state.fightCount = 0;

    spawnEnemy(state, false);

    set({
      phase: 'combat',
      floor,
      room: 1,
      roomsPerFloor,
      fightCount: 0,
      player: state.player,
      enemy: state.enemy,
      enemyDefinition: state.enemyDefinition,
      combatElapsed: state.combatElapsed,
      combatEvents: state.combatEvents,
      combatCounters: state.combatCounters,
      lastPlayerHitDamage: state.lastPlayerHitDamage,
      depth: Math.max(state.depth, floor),
    });
  },

  resumeCombat: () => {
    const state = get();
    const isLastRoom = state.room >= state.roomsPerFloor;

    if (!isLastRoom) {
      state.room += 1;
      spawnEnemy(state, false);
      set({
        phase: 'combat',
        room: state.room,
        enemy: state.enemy,
        enemyDefinition: state.enemyDefinition,
        combatElapsed: state.combatElapsed,
        combatEvents: state.combatEvents,
        combatCounters: state.combatCounters,
        lastPlayerHitDamage: state.lastPlayerHitDamage,
      });
      return;
    }

    if (state.floor === FINAL_BOSS_FLOOR) {
      set({ phase: 'endless-intro' });
      return;
    }

    if (isBossFloor(state.floor)) {
      state.checkpoint = state.floor;
      set({ phase: 'shop', checkpoint: state.floor });
      return;
    }

    set({ phase: 'floor-complete' });
  },

  resetGame: () => {
    set({ ...INITIAL_STATE });
  },
}));
