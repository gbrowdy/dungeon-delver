// src/ecs/systems/input-handlers/powerHandlers.ts
/**
 * Handler for power activation command.
 */

import type { Command } from '../../commands';
import type { CommandHandler } from './types';
import { getTick } from '../../loop';
import { world } from '../../world';

type ActivatePowerCommand = Extract<Command, { type: 'ACTIVATE_POWER' }>;

export const handleActivatePower: CommandHandler<ActivatePowerCommand> = (cmd, ctx) => {
  const { player } = ctx;
  if (!player || !player.powers) return;

  // Cannot use powers while dying or dead
  if (player.dying || (player.health && player.health.current <= 0)) return;

  const power = player.powers.find((p) => p.id === cmd.powerId);
  if (!power) return;

  // Check cooldown
  const cooldown = player.cooldowns?.get(cmd.powerId);
  if (cooldown && cooldown.remaining > 0) return;

  // Check resource - active paths use pathResource
  if (player.pathResource) {
    // Active path: use path resource (fury, momentum, arcane charges, etc.)
    const cost = power.resourceCost ?? 0;
    if (player.pathResource.resourceBehavior === 'spend') {
      // Fury/Momentum/Zeal: check if enough resource to spend
      if (player.pathResource.current < cost) return;
    } else {
      // Arcane Charges: check if would overflow
      if (player.pathResource.current + cost > player.pathResource.max) return;
    }
  }
  // No resource check for pre-path players (they can cast freely)

  // Mark as casting - PowerSystem will handle the effect
  // IMPORTANT: Use world.addComponent for miniplex query reactivity
  world.addComponent(player, 'casting', {
    powerId: cmd.powerId,
    startedAtTick: getTick(),
  });
};
