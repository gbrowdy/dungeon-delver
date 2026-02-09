// src/ecs/systems/cooldown.ts
/**
 * CooldownSystem - ticks down power cooldowns and stance cooldowns.
 * Runs each tick, reducing cooldown timers by effective delta time.
 */

import { entitiesWithCooldowns, getPlayer } from '../queries';
import { getEffectiveDelta } from '../loop';

export function CooldownSystem(deltaMs: number): void {
  const effectiveDelta = getEffectiveDelta(deltaMs);

  // Tick power cooldowns
  for (const entity of entitiesWithCooldowns) {
    const cooldowns = entity.cooldowns;
    if (!cooldowns) continue;

    for (const [abilityId, cooldown] of cooldowns) {
      if (cooldown.remaining > 0) {
        // Convert ms to seconds for cooldown (powers use seconds)
        const deltaSeconds = effectiveDelta / 1000;
        cooldown.remaining = Math.max(0, cooldown.remaining - deltaSeconds);

        // Sync cooldown back to ability.currentCooldown for enemies
        if (entity.enemy) {
          const abilityInArray = entity.enemy.abilities.find(a => a.id === abilityId);
          if (abilityInArray) {
            abilityInArray.currentCooldown = cooldown.remaining;
          }
        }
      }
    }
  }

  // Tick stance cooldown (player only, in milliseconds)
  const player = getPlayer();
  if (player?.stanceState && player.stanceState.stanceCooldownRemaining > 0) {
    player.stanceState.stanceCooldownRemaining = Math.max(
      0,
      player.stanceState.stanceCooldownRemaining - effectiveDelta
    );
  }
}
