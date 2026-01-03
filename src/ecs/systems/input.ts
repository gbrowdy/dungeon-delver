// src/ecs/systems/input.ts
/**
 * InputSystem - processes commands from the command queue.
 * Runs first each tick to translate user input into component changes.
 */

import { drainCommands, type Command } from '../commands';
import { getPlayer, getGameState } from '../queries';
import { getTick } from '../loop';
import { COMBAT_BALANCE } from '@/constants/balance';

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

      // TODO: Handle remaining commands as systems are implemented
      default:
        // Unknown command - ignore for now
        break;
    }
  }
}
