// src/ecs/systems/regen.ts
/**
 * RegenSystem - applies health and mana regeneration over time.
 * Runs each tick, accumulating delta time until 1 second passes,
 * then applies regen values.
 */

import { entitiesWithRegen, getGameState } from '../queries';
import { getEffectiveDelta } from '../loop';

const REGEN_TICK_MS = 1000; // Apply regen every 1 second

export function RegenSystem(deltaMs: number): void {
  // Only regen during combat phase
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  const effectiveDelta = getEffectiveDelta(deltaMs);

  for (const entity of entitiesWithRegen) {
    // Skip dying entities
    if (entity.dying) continue;

    const regen = entity.regen;
    const health = entity.health;
    if (!regen || !health) continue;

    // Accumulate time
    regen.accumulated += effectiveDelta;

    // Check if enough time has passed for a regen tick
    if (regen.accumulated >= REGEN_TICK_MS) {
      // Apply health regen (capped at max)
      if (regen.healthPerSecond > 0) {
        health.current = Math.min(
          health.max,
          health.current + regen.healthPerSecond
        );
      }

      // Apply mana regen (capped at max) if entity has mana
      const mana = entity.mana;
      if (mana && regen.manaPerSecond > 0) {
        mana.current = Math.min(mana.max, mana.current + regen.manaPerSecond);
      }

      // Reset accumulated time (keeping overflow for precision)
      regen.accumulated -= REGEN_TICK_MS;
    }
  }
}
