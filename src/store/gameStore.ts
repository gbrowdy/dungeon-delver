import { create } from 'zustand';
import type { GameState, CombatEntity, StatType } from '@/types/game';
import { createInitialPlayer } from './actions/setup';
import { CLASSES } from '@/data/classes';
import { generateEnemy } from '@/data/enemies';
import { getRoomsPerFloor } from '@/math/scaling';
import { tickCombat } from './actions/combat';
import { spawnEnemy, isBossFloor } from './actions/flow';
import { generateDraftCards } from './actions/draft';
import { generateShopCards } from './actions/shop';
import { ITEM_DEFINITIONS } from '@/data/items';
import { ENDLESS_START_FLOOR, FINAL_BOSS_FLOOR, PLAYER_BASE_HP } from '@/math/balance';
import { getMaxHp } from '@/math/stats';

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

  // Draft actions (3E)
  openDraft: () => void;
  selectDraftCard: (index: number) => void;
  confirmDraft: () => void;

  // Shop actions (3E)
  openShop: () => void;
  selectShopCard: (index: number) => void;
  confirmShop: () => void;

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

// -- Helpers ------------------------------------------------------------------
function applyStatBoost(player: CombatEntity, stat: StatType, value: number): void {
  switch (stat) {
    case 'power': player.power += value; break;
    case 'fortitude': player.fortitude += value; break;
    case 'speed': player.speed += value; break;
    case 'luck': player.luck += value; break;
  }
}

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

  openDraft: () => {
    const state = get();
    const cards = generateDraftCards(state);
    set({
      phase: 'draft',
      draftChoices: cards,
      selectedChoices: [],
    });
  },

  selectDraftCard: (index: number) => {
    const { selectedChoices } = get();
    if (selectedChoices.includes(index)) {
      set({ selectedChoices: [] });
    } else {
      set({ selectedChoices: [index] }); // only 1 selection for draft
    }
  },

  confirmDraft: () => {
    const state = get();
    if (state.selectedChoices.length === 0) return;

    const card = state.draftChoices[state.selectedChoices[0]];
    if (!card) return;

    // Apply stat boost
    applyStatBoost(state.player, card.stat, card.value);

    // If fortitude was boosted, recalculate maxHp and heal proportionally
    if (card.stat === 'fortitude') {
      const newMaxHp = getMaxHp(PLAYER_BASE_HP, state.player.fortitude);
      const hpGain = newMaxHp - state.player.maxHp;
      state.player.maxHp = newMaxHp;
      state.player.hp += hpGain;
    }

    // Update basePower if power was boosted
    if (card.stat === 'power') {
      state.player.basePower = state.player.power;
    }

    // Update baseSpeed if speed was boosted
    if (card.stat === 'speed') {
      state.player.baseSpeed = state.player.speed;
    }

    // Clear draft state
    set({
      draftChoices: [],
      selectedChoices: [],
      player: { ...state.player },
    });

    // Resume combat (calls resumeCombat which handles flow)
    get().resumeCombat();
  },

  openShop: () => {
    const state = get();
    const cards = generateShopCards(state);
    set({
      phase: 'shop',
      shopCards: cards,
      selectedChoices: [],
    });
  },

  selectShopCard: (index: number) => {
    const { selectedChoices } = get();
    if (selectedChoices.includes(index)) {
      // Toggle off
      set({ selectedChoices: selectedChoices.filter(i => i !== index) });
    } else if (selectedChoices.length < 2) {
      // Add selection (max 2)
      set({ selectedChoices: [...selectedChoices, index] });
    }
    // If already at 2, ignore
  },

  confirmShop: () => {
    const state = get();
    if (state.selectedChoices.length < 2) return;

    for (const idx of state.selectedChoices) {
      const card = state.shopCards[idx];
      if (!card) continue;

      if (card.type === 'stat_boost' && card.stat && card.statValue) {
        applyStatBoost(state.player, card.stat, card.statValue);

        if (card.stat === 'fortitude') {
          const newMaxHp = getMaxHp(PLAYER_BASE_HP, state.player.fortitude);
          const hpGain = newMaxHp - state.player.maxHp;
          state.player.maxHp = newMaxHp;
          state.player.hp += hpGain;
        }
        if (card.stat === 'power') {
          state.player.basePower = state.player.power;
        }
        if (card.stat === 'speed') {
          state.player.baseSpeed = state.player.speed;
        }
      }

      if (card.type === 'item' && card.itemId) {
        const itemDef = ITEM_DEFINITIONS[card.itemId];
        const slot = itemDef.slot;

        if (card.isUpgrade && state.equippedItems[slot]?.id === card.itemId) {
          // Tier upgrade
          state.equippedItems[slot]!.tier += 1;
        } else {
          // Equip new item
          state.equippedItems[slot] = {
            id: card.itemId,
            slot,
            tier: 1,
          };
        }
      }
    }

    set({
      phase: 'floor-complete',
      shopCards: [],
      selectedChoices: [],
      player: { ...state.player },
      equippedItems: { ...state.equippedItems },
    });
  },

  resetGame: () => {
    set({ ...INITIAL_STATE });
  },
}));
