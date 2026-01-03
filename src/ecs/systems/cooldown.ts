// src/ecs/systems/cooldown.ts
/**
 * CooldownSystem - ticks down power cooldowns.
 * Runs each tick, reducing cooldown timers by effective delta time.
 */

import { entitiesWithCooldowns } from '../queries';
import { getEffectiveDelta } from '../loop';

export function CooldownSystem(deltaMs: number): void {
  const effectiveDelta = getEffectiveDelta(deltaMs);

  for (const entity of entitiesWithCooldowns) {
    const cooldowns = entity.cooldowns;
    if (!cooldowns) continue;

    for (const [powerId, cooldown] of cooldowns) {
      if (cooldown.remaining > 0) {
        // Convert ms to seconds for cooldown (powers use seconds)
        const deltaSeconds = effectiveDelta / 1000;
        cooldown.remaining = Math.max(0, cooldown.remaining - deltaSeconds);
      }
    }
  }
}
