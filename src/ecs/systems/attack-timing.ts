// src/ecs/systems/attack-timing.ts
/**
 * AttackTimingSystem - accumulates attack progress and triggers attacks.
 * Each entity with speed accumulates time toward their attack interval.
 * When accumulated time >= interval, mark entity as ready to attack.
 */

import { attackersQuery, getGameState } from '../queries';
import { getEffectiveDelta } from '../loop';
import { world } from '../world';
import type { Entity } from '../components';

// Check if entity is stunned
function isStunned(entity: Entity): boolean {
  return entity.statusEffects?.some((e) => e.type === 'stun') ?? false;
}

// Calculate attack damage with variance and crit
function calculateAttackDamage(entity: Entity): { damage: number; isCrit: boolean } {
  const attack = entity.attack;
  if (!attack) return { damage: 0, isCrit: false };

  // Apply variance
  const { min, max } = attack.variance;
  const variance = min + Math.random() * (max - min);
  let damage = Math.floor(attack.baseDamage * variance);

  // Check for crit
  const isCrit = Math.random() < attack.critChance;
  if (isCrit) {
    damage = Math.floor(damage * attack.critMultiplier);
  }

  return { damage, isCrit };
}

export function AttackTimingSystem(deltaMs: number): void {
  const gameState = getGameState();

  if (gameState?.phase !== 'combat') return;

  const effectiveDelta = getEffectiveDelta(deltaMs);

  for (const entity of attackersQuery) {
    // Skip if stunned
    if (isStunned(entity)) continue;

    const speed = entity.speed;
    if (!speed) continue;

    // Accumulate time
    speed.accumulated += effectiveDelta;

    // Check if attack should fire
    if (speed.accumulated >= speed.attackInterval) {
      const { damage, isCrit } = calculateAttackDamage(entity);

      // Mark as ready to attack - CombatSystem will process
      // Must use world.addComponent for miniplex queries to detect the new component
      world.addComponent(entity, 'attackReady', { damage, isCrit });

      // Carry over excess time (prevents drift)
      speed.accumulated -= speed.attackInterval;
    }
  }
}
