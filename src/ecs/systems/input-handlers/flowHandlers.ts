// src/ecs/systems/input-handlers/flowHandlers.ts
/**
 * Handlers for game flow commands: start, restart, advance room, shop transitions.
 */

import type { Command } from '../../commands';
import type { CommandHandler, HandlerContext } from './types';
import { clearCommands } from '../../commands';
import { getPlayer } from '../../queries';
import { getTick } from '../../loop';
import { world } from '../../world';
import { createEnemyEntity } from '../../factories';
import { FLOOR_CONFIG } from '@/constants/game';
import { resetFloorState } from '../passive-effect';

type StartGameCommand = Extract<Command, { type: 'START_GAME' }>;
type RestartGameCommand = Extract<Command, { type: 'RESTART_GAME' }>;
type AdvanceRoomCommand = Extract<Command, { type: 'ADVANCE_ROOM' }>;
type GoToShopCommand = Extract<Command, { type: 'GO_TO_SHOP' }>;
type LeaveShopCommand = Extract<Command, { type: 'LEAVE_SHOP' }>;
type RetryFloorCommand = Extract<Command, { type: 'RETRY_FLOOR' }>;
type AbandonRunCommand = Extract<Command, { type: 'ABANDON_RUN' }>;

export const handleStartGame: CommandHandler<StartGameCommand> = (_cmd, ctx) => {
  const { gameState } = ctx;
  if (gameState) {
    gameState.phase = 'class-select';
  }
};

export const handleRestartGame: CommandHandler<RestartGameCommand> = (_cmd, ctx) => {
  const { gameState } = ctx;
  if (gameState) {
    // Clear any pending commands
    clearCommands();
    gameState.phase = 'menu';
  }
};

export const handleAdvanceRoom: CommandHandler<AdvanceRoomCommand> = (_cmd, ctx) => {
  const { player, gameState } = ctx;
  if (!gameState?.floor) return;

  const floor = gameState.floor;

  // Remove any existing enemy (including dying ones)
  for (const e of world.with('enemy')) {
    world.remove(e);
  }

  // If already on floor-complete, advance to next floor (same as leaving shop)
  if (gameState.phase === 'floor-complete') {
    floor.number += 1;
    floor.room = 1;
    floor.totalRooms =
      FLOOR_CONFIG.ROOMS_PER_FLOOR[floor.number - 1] ?? FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR;

    // Full reset for new floor (same as retry: health, cooldowns, status, resource)
    if (player) {
      // Reset health to full
      if (player.health) {
        player.health.current = player.health.max;
      }

      // Clear cooldowns
      if (player.cooldowns) {
        player.cooldowns.clear();
      }

      // Clear status effects
      player.statusEffects = [];

      // Reset passive effect floor state for new floor
      if (player.passiveEffectState) {
        resetFloorState(player);
      }

      // Reset pathResource (stamina to max, others to 0)
      if (player.pathResource) {
        player.pathResource.current =
          player.pathResource.type === 'stamina' ? player.pathResource.max : 0;
      }
    }

    // Spawn first enemy of new floor
    const enemy = createEnemyEntity({
      floor: floor.number,
      room: floor.room,
      roomsPerFloor: floor.totalRooms,
    });
    world.add(enemy);

    // Start entering animation phase
    gameState.battlePhase = {
      phase: 'entering',
      startedAtTick: getTick(),
      duration: 800,
    };
    gameState.groundScrolling = true;

    gameState.phase = 'combat';
    return;
  }

  // Check if floor is complete
  if (floor.room >= floor.totalRooms) {
    // Check for victory
    if (floor.number >= FLOOR_CONFIG.FINAL_BOSS_FLOOR) {
      gameState.phase = 'victory';
    } else {
      gameState.phase = 'floor-complete';
    }
    return;
  }

  // Advance to next room
  floor.room += 1;

  // Spawn next enemy
  const nextEnemy = createEnemyEntity({
    floor: floor.number,
    room: floor.room,
    roomsPerFloor: floor.totalRooms,
  });
  world.add(nextEnemy);

  // Start entering animation phase
  gameState.battlePhase = {
    phase: 'entering',
    startedAtTick: getTick(),
    duration: 800,
  };
  gameState.groundScrolling = true;

  gameState.phase = 'combat';
};

export const handleGoToShop: CommandHandler<GoToShopCommand> = (_cmd, ctx) => {
  const { gameState } = ctx;
  if (gameState) {
    // Track where we came from (for proper exit behavior)
    gameState.shopEnteredFrom = gameState.phase === 'defeat' ? 'defeat' : 'floor-complete';
    gameState.phase = 'shop';
  }
};

export const handleLeaveShop: CommandHandler<LeaveShopCommand> = (_cmd, ctx) => {
  const { player, gameState } = ctx;
  if (!gameState?.floor || !player) return;

  const floor = gameState.floor;
  const cameFromDefeat = gameState.shopEnteredFrom === 'defeat';

  // Clear the tracking field
  gameState.shopEnteredFrom = undefined;

  // Remove any existing enemy (including dying ones)
  for (const e of world.with('enemy')) {
    world.remove(e);
  }

  if (cameFromDefeat) {
    // CRITICAL: Remove dying component so player can attack again
    if (player.dying) {
      world.removeComponent(player, 'dying');
    }

    // Came from defeat: retry floor (reset health, stay on same floor)
    if (player.health) {
      player.health.current = player.health.max;
    }

    // Clear cooldowns
    if (player.cooldowns) {
      player.cooldowns.clear();
    }

    player.statusEffects = [];

    // Reset pathResource (stamina to max, others to 0)
    if (player.pathResource) {
      player.pathResource.current =
        player.pathResource.type === 'stamina' ? player.pathResource.max : 0;
    }

    floor.room = 1;
  } else {
    // Came from floor-complete: advance to next floor
    floor.number += 1;
    floor.room = 1;
    floor.totalRooms =
      FLOOR_CONFIG.ROOMS_PER_FLOOR[floor.number - 1] ?? FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR;

    // Full reset for new floor (same as retry: health, cooldowns, status, resource)
    // Reset health to full
    if (player.health) {
      player.health.current = player.health.max;
    }

    // Clear cooldowns
    if (player.cooldowns) {
      player.cooldowns.clear();
    }

    // Clear status effects
    player.statusEffects = [];

    // Reset passive effect floor state for new floor
    if (player.passiveEffectState) {
      resetFloorState(player);
    }

    // Reset pathResource (stamina to max, others to 0)
    if (player.pathResource) {
      player.pathResource.current =
        player.pathResource.type === 'stamina' ? player.pathResource.max : 0;
    }
  }

  // Spawn first enemy
  const shopEnemy = createEnemyEntity({
    floor: floor.number,
    room: floor.room,
    roomsPerFloor: floor.totalRooms,
  });
  world.add(shopEnemy);

  // Start entering animation phase
  gameState.battlePhase = {
    phase: 'entering',
    startedAtTick: getTick(),
    duration: 800,
  };
  gameState.groundScrolling = true;

  gameState.phase = 'combat';
};

export const handleRetryFloor: CommandHandler<RetryFloorCommand> = (_cmd, ctx) => {
  const { player, gameState } = ctx;
  if (!gameState?.floor || !player) return;

  const floor = gameState.floor;

  // CRITICAL: Remove dying component so player can attack again
  // The dying component excludes entities from attackersQuery
  if (player.dying) {
    world.removeComponent(player, 'dying');
  }

  // Reset player health
  if (player.health) {
    player.health.current = player.health.max;
  }

  // Clear cooldowns
  if (player.cooldowns) {
    player.cooldowns.clear();
  }

  // Clear status effects
  player.statusEffects = [];

  // Reset pathResource (stamina to max, others to 0)
  if (player.pathResource) {
    player.pathResource.current =
      player.pathResource.type === 'stamina' ? player.pathResource.max : 0;
  }

  // Reset room to 1
  floor.room = 1;

  // Remove any existing enemy (including dying ones)
  for (const e of world.with('enemy')) {
    world.remove(e);
  }

  // Spawn first enemy of floor
  const retryEnemy = createEnemyEntity({
    floor: floor.number,
    room: floor.room,
    roomsPerFloor: floor.totalRooms,
  });
  world.add(retryEnemy);

  // Start entering animation phase
  gameState.battlePhase = {
    phase: 'entering',
    startedAtTick: getTick(),
    duration: 800,
  };
  gameState.groundScrolling = true;

  gameState.phase = 'combat';
};

export const handleAbandonRun: CommandHandler<AbandonRunCommand> = (_cmd, ctx) => {
  const { gameState } = ctx;
  if (!gameState) return;

  // Remove player and enemy (including dying ones)
  const oldPlayer = getPlayer();
  if (oldPlayer) {
    world.remove(oldPlayer);
  }
  for (const e of world.with('enemy')) {
    world.remove(e);
  }

  // Clear any pending commands
  clearCommands();

  // Reset to menu
  gameState.phase = 'menu';
};
