// src/ecs/systems/regen.ts
/**
 * RegenSystem - applies health regeneration over time.
 * Runs each tick, accumulating delta time until 1 second passes,
 * then applies regen values.
 */

import { entitiesWithRegen, getGameState, getPlayer } from '../queries';
import { getEffectiveDelta } from '../loop';

const REGEN_TICK_MS = 1000; // Apply regen every 1 second

export function RegenSystem(deltaMs: number): void {
  // Only regen during combat phase
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  const effectiveDelta = getEffectiveDelta(deltaMs);
  const inCombat = gameState?.phase === 'combat';

  for (const entity of entitiesWithRegen) {
    // Skip dying entities or entities at 0 HP (dead, waiting for DeathSystem)
    if (entity.dying) continue;

    const regen = entity.regen;
    const health = entity.health;
    if (!regen || !health) continue;

    // Don't regen if HP <= 0 - regen shouldn't resurrect
    if (health.current <= 0) continue;

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

      // Note: Path resource passive regen is handled per-tick below for smoothness

      // Reset accumulated time (keeping overflow for precision)
      regen.accumulated -= REGEN_TICK_MS;
    }
  }

  // Path resource passive regeneration (smooth per-tick application)
  // Applied every tick proportionally for smooth bar fill instead of chunky 1-second jumps
  const player = getPlayer();
  if (player?.pathResource?.generation?.passive && player.pathResource.generation.passive > 0) {
    const regenPerMs = player.pathResource.generation.passive / 1000;
    const regenAmount = regenPerMs * effectiveDelta;
    player.pathResource.current = Math.min(
      player.pathResource.max,
      player.pathResource.current + regenAmount
    );
  }

  // Path resource decay (out of combat only)
  if (player?.pathResource?.decay) {
    const decay = player.pathResource.decay;
    if (!decay.outOfCombatOnly || !inCombat) {
      const decayAmount = decay.rate * (effectiveDelta / decay.tickInterval);
      player.pathResource.current = Math.max(0, player.pathResource.current - decayAmount);
    }
  }

  // Hex regen (player in hex_veil stance)
  // Don't regen if HP <= 0 (dead) - regen shouldn't resurrect
  if (player && !player.dying && player.health && player.health.current > 0 && player.stanceState?.activeStanceId === 'hex_veil') {
    const computed = player.passiveEffectState?.computed;
    const hexRegen = (computed?.hexRegen ?? 0) * (computed?.hexIntensityMultiplier ?? 1);
    if (hexRegen > 0) {
      const regenAmount = (hexRegen * effectiveDelta) / 1000;
      player.health.current = Math.min(player.health.max, player.health.current + regenAmount);
    }
  }
}
