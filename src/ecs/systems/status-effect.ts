// src/ecs/systems/status-effect.ts
/**
 * StatusEffectSystem - processes DoT effects and ticks down durations.
 * Handles poison, bleed, slow, and stun effects.
 * Runs after CombatSystem to apply tick damage, before DeathSystem to check for deaths.
 */

import { entitiesWithStatusEffects, getGameState } from '../queries';
import { getEffectiveDelta, getTick } from '../loop';
import type { Entity, AnimationEvent, AnimationPayload } from '../components';
import type { StatusEffect } from '@/types/game';

let nextAnimationId = 0;

function getNextAnimationId(): string {
  return `status-anim-${nextAnimationId++}`;
}

function queueAnimationEvent(
  type: AnimationEvent['type'],
  payload: AnimationPayload,
  durationTicks: number = 30
): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.animationEvents) {
    gameState.animationEvents = [];
  }

  const currentTick = getTick();
  gameState.animationEvents.push({
    id: getNextAnimationId(),
    type,
    payload,
    createdAtTick: currentTick,
    displayUntilTick: currentTick + durationTicks,
    consumed: false,
  });
}

function addCombatLog(message: string): void {
  const gameState = getGameState();
  if (!gameState) return;

  if (!gameState.combatLog) {
    gameState.combatLog = [];
  }

  gameState.combatLog.push(message);

  // Keep last 50 entries
  if (gameState.combatLog.length > 50) {
    gameState.combatLog.shift();
  }
}

function getEntityName(entity: Entity): string {
  if (entity.player) {
    return entity.identity?.name ?? 'Hero';
  }
  if (entity.enemy) {
    return entity.enemy.name;
  }
  return 'Unknown';
}

/**
 * Process a single status effect for an entity.
 * Returns true if the effect should be removed (expired).
 */
function processStatusEffect(
  entity: Entity,
  effect: StatusEffect,
  deltaSeconds: number
): boolean {
  const entityName = getEntityName(entity);

  // Process DoT effects (poison, bleed)
  if ((effect.type === 'poison' || effect.type === 'bleed') && effect.damage) {
    // Calculate damage for this tick (damage per second * delta time)
    const tickDamage = Math.round(effect.damage * deltaSeconds);

    if (tickDamage > 0 && entity.health) {
      entity.health.current = Math.max(0, entity.health.current - tickDamage);

      const effectName = effect.type === 'poison' ? 'Poison' : 'Bleed';
      addCombatLog(`${entityName} takes ${tickDamage} ${effectName.toLowerCase()} damage`);

      // Queue damage animation
      const isPlayer = !!entity.player;
      queueAnimationEvent(isPlayer ? 'player_hit' : 'enemy_hit', {
        type: 'damage',
        value: tickDamage,
        isCrit: false,
        blocked: false,
      });
    }
  }

  // Tick down duration (slow and stun just tick down, their effect is handled elsewhere)
  effect.remainingTurns -= deltaSeconds;

  // Return true if effect has expired
  return effect.remainingTurns <= 0;
}

export function StatusEffectSystem(deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  // Get effective delta (scaled by combat speed)
  const effectiveDelta = getEffectiveDelta(deltaMs);
  const deltaSeconds = effectiveDelta / 1000;

  // Process all entities with status effects
  for (const entity of entitiesWithStatusEffects) {
    // Skip dying entities - no need to process effects on them
    if (entity.dying) continue;

    const effects = entity.statusEffects;
    if (!effects || effects.length === 0) continue;

    // Process each effect and track which ones to remove
    const expiredEffects: StatusEffect[] = [];

    for (const effect of effects) {
      const expired = processStatusEffect(entity, effect, deltaSeconds);
      if (expired) {
        expiredEffects.push(effect);
      }
    }

    // Remove expired effects
    for (const expiredEffect of expiredEffects) {
      const index = effects.indexOf(expiredEffect);
      if (index !== -1) {
        effects.splice(index, 1);

        const entityName = getEntityName(entity);
        const effectName = expiredEffect.type.charAt(0).toUpperCase() + expiredEffect.type.slice(1);
        addCombatLog(`${effectName} wears off from ${entityName}`);

        // Queue status removed animation
        queueAnimationEvent('status_removed', {
          type: 'status',
          effectType: expiredEffect.type,
          applied: false,
        });
      }
    }
  }
}
