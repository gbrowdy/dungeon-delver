// src/ecs/systems/input.ts
/**
 * InputSystem - processes commands from the command queue.
 * Runs first each tick to translate user input into component changes.
 */

import { drainCommands } from '../commands';
import { getPlayer, getGameState } from '../queries';
import { handlers, type HandlerContext } from './input-handlers';

export function InputSystem(_deltaMs: number): void {
  const commands = drainCommands();
  const ctx: HandlerContext = {
    player: getPlayer(),
    gameState: getGameState(),
  };

  for (const cmd of commands) {
    const handler = handlers[cmd.type];
    if (handler) {
      handler(cmd, ctx);
    }
  }
}
