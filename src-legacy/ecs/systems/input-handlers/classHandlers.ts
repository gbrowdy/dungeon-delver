// src/ecs/systems/input-handlers/classHandlers.ts
/**
 * Handler for class selection command.
 */

import type { Command } from '../../commands';
import type { CommandHandler } from './types';
import { clearCommands } from '../../commands';
import { getPlayer } from '../../queries';
import { getTick } from '../../loop';
import { world } from '../../world';
import { createPlayerEntity, createEnemyEntity } from '../../factories';
import { FLOOR_CONFIG } from '@/constants/game';
import type { CharacterClass } from '@/types/game';
import { getDevModeParams } from '@/utils/devMode';

type SelectClassCommand = Extract<Command, { type: 'SELECT_CLASS' }>;

export const handleSelectClass: CommandHandler<SelectClassCommand> = (cmd, ctx) => {
  const { gameState } = ctx;
  if (!gameState) return;

  // Remove existing player if any
  const existingPlayer = getPlayer();
  if (existingPlayer) {
    world.remove(existingPlayer);
  }

  // Clear any pending commands from previous game
  clearCommands();

  // Get dev mode overrides
  const devParams = getDevModeParams();
  const devOverrides = devParams.enabled
    ? {
        attackOverride: devParams.attackOverride,
        defenseOverride: devParams.defenseOverride,
        goldOverride: devParams.goldOverride,
      }
    : undefined;

  // Create new player with selected class
  const playerEntity = createPlayerEntity({
    name: 'Hero',
    characterClass: cmd.classId as CharacterClass,
    devOverrides,
  });
  world.add(playerEntity);

  // Set up floor state (with possible startFloor override)
  const startFloor = devParams.enabled && devParams.startFloor ? devParams.startFloor : 1;
  gameState.floor = {
    number: startFloor,
    room: 0,
    totalRooms:
      FLOOR_CONFIG.ROOMS_PER_FLOOR[startFloor - 1] ?? FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR,
    theme: undefined,
  };

  // Transition to combat and spawn first enemy
  gameState.phase = 'combat';

  // Spawn first enemy
  const floor = gameState.floor;
  floor.room = 1;
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
    duration: 800, // matches CSS --anim-entering-phase
  };
  gameState.groundScrolling = true;
};
