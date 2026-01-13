// src/ecs/systems/input-handlers/types.ts
/**
 * Type definitions for input command handlers.
 */

import type { Entity } from '../../components';
import type { Command } from '../../commands';

/**
 * Context passed to every command handler.
 */
export interface HandlerContext {
  player: Entity | undefined;
  gameState: Entity | undefined;
}

/**
 * Type for a command handler function.
 * Handlers receive the specific command and shared context.
 */
export type CommandHandler<T extends Command = Command> = (
  cmd: T,
  ctx: HandlerContext
) => void;
