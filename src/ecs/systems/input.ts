// src/ecs/systems/input.ts
/**
 * InputSystem - processes commands from the command queue.
 * Runs first each tick to translate user input into component changes.
 */

import { drainCommands, type Command } from '../commands';
import { getPlayer, getGameState, getActiveEnemy } from '../queries';
import { getTick } from '../loop';
import { world } from '../world';
import { createPlayerEntity, createEnemyEntity } from '../factories';
import { COMBAT_BALANCE } from '@/constants/balance';
import { FLOOR_CONFIG } from '@/constants/game';
import type { CharacterClass } from '@/types/game';

export function InputSystem(_deltaMs: number): void {
  const commands = drainCommands();
  const player = getPlayer();
  const gameState = getGameState();

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'ACTIVATE_POWER': {
        if (!player || !player.powers) break;

        const power = player.powers.find((p) => p.id === cmd.powerId);
        if (!power) break;

        // Check cooldown
        const cooldown = player.cooldowns?.get(cmd.powerId);
        if (cooldown && cooldown.remaining > 0) break;

        // Check mana
        if (!player.mana || player.mana.current < power.manaCost) break;

        // Mark as casting - PowerSystem will handle the effect
        player.casting = {
          powerId: cmd.powerId,
          startedAtTick: getTick(),
        };
        break;
      }

      case 'BLOCK': {
        if (!player || !player.mana) break;
        if (player.mana.current < COMBAT_BALANCE.BLOCK_MANA_COST) break;
        if (player.blocking) break; // Already blocking

        player.blocking = { reduction: COMBAT_BALANCE.BLOCK_DAMAGE_REDUCTION };
        player.mana.current -= COMBAT_BALANCE.BLOCK_MANA_COST;
        break;
      }

      case 'SET_COMBAT_SPEED': {
        if (gameState) {
          gameState.combatSpeed = { multiplier: cmd.speed };
        }
        break;
      }

      case 'TOGGLE_PAUSE': {
        if (gameState) {
          gameState.paused = !gameState.paused;
        }
        break;
      }

      case 'DISMISS_POPUP': {
        if (gameState?.popups) {
          // Clear the specific popup
          const popupKey = cmd.popupType as keyof typeof gameState.popups;
          if (popupKey in gameState.popups) {
            delete gameState.popups[popupKey];
          }
        }
        break;
      }

      case 'MARK_ANIMATIONS_CONSUMED': {
        if (gameState?.animationEvents) {
          for (const event of gameState.animationEvents) {
            if (cmd.ids.includes(event.id)) {
              event.consumed = true;
            }
          }
        }
        break;
      }

      case 'PURCHASE_ITEM': {
        if (!player?.inventory) break;
        if (player.inventory.gold < cmd.cost) break;

        player.inventory.gold -= cmd.cost;
        // Item addition handled by FlowSystem or caller
        break;
      }

      case 'ENHANCE_ITEM': {
        // Enhancement logic - deduct gold, upgrade item
        // Detailed implementation depends on existing enhancement utils
        break;
      }

      case 'START_GAME': {
        if (gameState) {
          gameState.phase = 'class-select';
        }
        break;
      }

      case 'RESTART_GAME': {
        if (gameState) {
          gameState.phase = 'menu';
        }
        break;
      }

      case 'SELECT_CLASS': {
        if (!gameState) break;

        // Remove existing player if any
        const existingPlayer = getPlayer();
        if (existingPlayer) {
          world.remove(existingPlayer);
        }

        // Create new player with selected class
        const playerEntity = createPlayerEntity({
          name: 'Hero',
          characterClass: cmd.classId as CharacterClass,
        });
        world.add(playerEntity);

        // Set up floor state
        gameState.floor = {
          number: 1,
          room: 0,
          totalRooms: FLOOR_CONFIG.ROOMS_PER_FLOOR[0] ?? FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR,
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

        break;
      }

      case 'SELECT_PATH': {
        if (!player || !gameState) break;
        // Store the selected path on player
        if (!player.pathProgress) {
          player.pathProgress = {
            pathId: cmd.pathId,
            subpathId: null,
            unlockedAbilities: [],
          };
        } else {
          player.pathProgress.pathId = cmd.pathId;
        }
        // Transition back to combat
        gameState.phase = 'combat';
        break;
      }

      case 'SELECT_ABILITY': {
        if (!player?.pathProgress || !gameState) break;
        // Add ability to unlocked list
        if (!player.pathProgress.unlockedAbilities.includes(cmd.abilityId)) {
          player.pathProgress.unlockedAbilities.push(cmd.abilityId);
        }
        // Transition back to combat
        gameState.phase = 'combat';
        break;
      }

      case 'SELECT_SUBPATH': {
        if (!player?.pathProgress || !gameState) break;
        player.pathProgress.subpathId = cmd.subpathId;
        // Transition back to combat
        gameState.phase = 'combat';
        break;
      }

      case 'ADVANCE_ROOM': {
        if (!gameState?.floor) break;

        const floor = gameState.floor;

        // Remove current enemy
        const currentEnemy = getActiveEnemy();
        if (currentEnemy) {
          world.remove(currentEnemy);
        }

        // Check if floor is complete
        if (floor.room >= floor.totalRooms) {
          // Check for victory
          if (floor.number >= FLOOR_CONFIG.FINAL_BOSS_FLOOR) {
            gameState.phase = 'victory';
          } else {
            gameState.phase = 'floor-complete';
          }
          break;
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

        gameState.phase = 'combat';
        break;
      }

      case 'GO_TO_SHOP': {
        if (gameState) {
          gameState.phase = 'shop';
        }
        break;
      }

      case 'LEAVE_SHOP': {
        if (!gameState?.floor) break;

        // Advance to next floor
        const floor = gameState.floor;
        floor.number += 1;
        floor.room = 1;
        floor.totalRooms = FLOOR_CONFIG.ROOMS_PER_FLOOR[floor.number - 1] ?? FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR;

        // Spawn first enemy of new floor
        const enemy = createEnemyEntity({
          floor: floor.number,
          room: floor.room,
          roomsPerFloor: floor.totalRooms,
        });
        world.add(enemy);

        gameState.phase = 'combat';
        break;
      }

      case 'RETRY_FLOOR': {
        if (!gameState?.floor || !player) break;

        const floor = gameState.floor;

        // Reset player health/mana
        if (player.health) {
          player.health.current = player.health.max;
        }
        if (player.mana) {
          player.mana.current = player.mana.max;
        }

        // Clear status effects
        player.statusEffects = [];

        // Reset room to 1
        floor.room = 1;

        // Remove any existing enemy
        const oldEnemy = getActiveEnemy();
        if (oldEnemy) {
          world.remove(oldEnemy);
        }

        // Spawn first enemy of floor
        const enemy = createEnemyEntity({
          floor: floor.number,
          room: floor.room,
          roomsPerFloor: floor.totalRooms,
        });
        world.add(enemy);

        gameState.phase = 'combat';
        break;
      }

      case 'ABANDON_RUN': {
        if (!gameState) break;

        // Remove player and enemy
        const oldPlayer = getPlayer();
        if (oldPlayer) {
          world.remove(oldPlayer);
        }
        const oldEnemy = getActiveEnemy();
        if (oldEnemy) {
          world.remove(oldEnemy);
        }

        // Reset to menu
        gameState.phase = 'menu';
        break;
      }

      default:
        // Unknown command - ignore for now
        break;
    }
  }
}
