// src/utils/testHooks.ts
//
// Exposes window.__TEST_HOOKS__ for Playwright E2E tests.
// Only initialized when ?testMode=true URL param is present.

import { useGameStore } from '@/store/gameStore';
import type { GameState, GamePhase, CombatEntity, EquippedItems, ItemId, StatType } from '@/types/game';
import { createInitialPlayer } from '@/store/actions/setup';
import { generateEnemy } from '@/data/enemies';
import { getRoomsPerFloor } from '@/math/scaling';
import { getMaxHp } from '@/math/stats';
import { PLAYER_BASE_HP, FINAL_BOSS_FLOOR } from '@/math/balance';
import { ITEM_DEFINITIONS } from '@/data/items';
import { handlePlayerDeath, handleEnemyDeath } from '@/store/actions/flow';

export interface TestHooks {
  /** Get full current game state (snapshot) */
  getState: () => GameState;

  /** Set any state fields directly */
  setState: (partial: Partial<GameState>) => void;

  /** Set a specific game phase */
  setPhase: (phase: GamePhase) => void;

  /** Set player stats directly */
  setPlayerStats: (stats: Partial<Pick<CombatEntity, 'power' | 'fortitude' | 'speed' | 'luck' | 'hp' | 'maxHp'>>) => void;

  /** Set floor + room, spawn appropriate enemy */
  setFloor: (floor: number, room?: number) => void;

  /** Equip an item by ID */
  equipItem: (itemId: ItemId) => void;

  /** Fast-forward: skip to floor N with specified class and stats */
  setupRun: (options: {
    classId: string;
    floor: number;
    stats?: Partial<Pick<CombatEntity, 'power' | 'fortitude' | 'speed' | 'luck'>>;
    items?: Partial<EquippedItems>;
  }) => void;

  /** Kill the current enemy instantly */
  killEnemy: () => void;

  /** Kill the player instantly */
  killPlayer: () => void;

  /** Boost a stat by value */
  boostStat: (stat: StatType, value: number) => void;
}

declare global {
  interface Window {
    __TEST_HOOKS__?: TestHooks;
  }
}

export function initTestHooks(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('testMode')) return;

  const hooks: TestHooks = {
    getState: () => {
      return useGameStore.getState();
    },

    setState: (partial) => {
      useGameStore.setState(partial);
    },

    setPhase: (phase) => {
      useGameStore.setState({ phase });
    },

    setPlayerStats: (stats) => {
      const state = useGameStore.getState();
      const player = { ...state.player, ...stats };
      // Recalculate maxHp if fortitude changed
      if (stats.fortitude !== undefined && stats.maxHp === undefined) {
        player.maxHp = getMaxHp(PLAYER_BASE_HP, player.fortitude);
      }
      // Cap hp to maxHp
      if (player.hp > player.maxHp) {
        player.hp = player.maxHp;
      }
      useGameStore.setState({ player });
    },

    setFloor: (floor, room = 1) => {
      const state = useGameStore.getState();
      const roomsPerFloor = getRoomsPerFloor(floor);
      const generated = generateEnemy(floor);

      useGameStore.setState({
        floor,
        room,
        roomsPerFloor,
        depth: Math.max(state.depth, floor),
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
      });
    },

    equipItem: (itemId) => {
      const def = ITEM_DEFINITIONS[itemId];
      if (!def) return;

      const state = useGameStore.getState();
      const equippedItems = { ...state.equippedItems };
      equippedItems[def.slot as keyof EquippedItems] = {
        id: itemId,
        slot: def.slot,
        tier: 1,
      };
      useGameStore.setState({ equippedItems });
    },

    setupRun: ({ classId, floor, stats, items }) => {
      const player = createInitialPlayer();

      // Apply custom stats
      if (stats) {
        if (stats.power !== undefined) player.power = stats.power;
        if (stats.fortitude !== undefined) player.fortitude = stats.fortitude;
        if (stats.speed !== undefined) player.speed = stats.speed;
        if (stats.luck !== undefined) player.luck = stats.luck;
      }

      // Recalculate derived stats
      player.basePower = player.power;
      player.baseSpeed = player.speed;
      player.maxHp = getMaxHp(PLAYER_BASE_HP, player.fortitude);
      player.hp = player.maxHp;

      const roomsPerFloor = getRoomsPerFloor(floor);
      const generated = generateEnemy(floor);
      const equippedItems = {
        weapon: items?.weapon ?? null,
        armor: items?.armor ?? null,
        accessory: items?.accessory ?? null,
      };

      useGameStore.setState({
        phase: 'combat',
        classId,
        player,
        floor,
        room: 1,
        roomsPerFloor,
        fightCount: 1,
        depth: floor,
        checkpoint: floor >= FINAL_BOSS_FLOOR ? FINAL_BOSS_FLOOR : 0,
        enemy: generated.entity,
        enemyDefinition: { tier: generated.tier, modifiers: generated.modifiers },
        equippedItems,
        combatElapsed: 0,
        combatEvents: [],
        combatCounters: {
          playerAttackCount: 0,
          playerHitCount: 0,
          shieldRefreshTimer: 0,
          curseDecayTimer: 0,
        },
        lastPlayerHitDamage: 0,
        paused: false,
      });
    },

    killEnemy: () => {
      const state = useGameStore.getState();
      if (state.enemy) {
        state.enemy.hp = 0;
        handleEnemyDeath(state);
        useGameStore.setState({ phase: state.phase, enemy: state.enemy });
      }
    },

    killPlayer: () => {
      const state = useGameStore.getState();
      state.player.hp = 0;
      handlePlayerDeath(state);
      useGameStore.setState({ phase: state.phase, lastDeathStats: state.lastDeathStats });
    },

    boostStat: (stat, value) => {
      const state = useGameStore.getState();
      const player = { ...state.player };
      player[stat] += value;
      if (stat === 'power') player.basePower = player.power;
      if (stat === 'speed') player.baseSpeed = player.speed;
      if (stat === 'fortitude') {
        player.maxHp = getMaxHp(PLAYER_BASE_HP, player.fortitude);
        player.hp = player.maxHp;
      }
      useGameStore.setState({ player });
    },
  };

  window.__TEST_HOOKS__ = hooks;

  // eslint-disable-next-line no-console
  console.log('[TestHooks] Initialized — window.__TEST_HOOKS__ available');
}
