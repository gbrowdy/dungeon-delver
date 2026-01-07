// src/ecs/systems/status-effect.ts
/**
 * StatusEffectSystem - processes DoT effects and ticks down durations.
 * Handles poison, bleed, slow, and stun effects.
 * Runs after CombatSystem to apply tick damage, before DeathSystem to check for deaths.
 */

import { entitiesWithStatusEffects, getGameState, enemyQuery } from '../queries';
import { getEffectiveDelta, getTick } from '../loop';
import type { Entity, AnimationEvent, AnimationPayload } from '../components';
import type { StatusEffect } from '@/types/game';
import { queueAnimationEvent, addCombatLog, getEntityName } from '../utils';

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

  // Process DoT effects (poison, bleed, burn)
  if ((effect.type === 'poison' || effect.type === 'bleed' || effect.type === 'burn') && effect.damage) {
    // Accumulate fractional damage to handle small deltas
    const rawDamage = effect.damage * deltaSeconds;
    effect.accumulatedDamage = (effect.accumulatedDamage ?? 0) + rawDamage;

    // Only apply when we've accumulated at least 1 damage
    const tickDamage = Math.floor(effect.accumulatedDamage);
    if (tickDamage >= 1 && entity.health) {
      effect.accumulatedDamage -= tickDamage;
      entity.health.current = Math.max(0, entity.health.current - tickDamage);

      const effectName = effect.type === 'poison' ? 'Poison' : effect.type === 'bleed' ? 'Bleed' : 'Burn';
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

/**
 * Process enemy flags like enrage and shield that have durations.
 */
function processEnemyFlags(deltaSeconds: number): void {
  for (const enemy of enemyQuery) {
    if (enemy.dying || !enemy.enemyFlags) continue;

    const flags = enemy.enemyFlags;
    const enemyName = enemy.enemy?.name ?? 'Enemy';

    // Tick down enrage
    if (flags.isEnraged && flags.enrageTurnsRemaining !== undefined) {
      flags.enrageTurnsRemaining -= deltaSeconds;
      if (flags.enrageTurnsRemaining <= 0) {
        flags.isEnraged = false;
        flags.enrageTurnsRemaining = 0;
        // Restore original attack power
        if (enemy.attack && flags.basePower !== undefined) {
          enemy.attack.baseDamage = flags.basePower;
        }
        addCombatLog(`${enemyName}'s rage subsides`);
      }
    }

    // Tick down shield
    if (flags.isShielded && flags.shieldTurnsRemaining !== undefined) {
      flags.shieldTurnsRemaining -= deltaSeconds;
      if (flags.shieldTurnsRemaining <= 0) {
        flags.isShielded = false;
        flags.shieldTurnsRemaining = 0;
        addCombatLog(`${enemyName}'s shield fades`);
      }
    }
  }
}

export function StatusEffectSystem(deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  // Get effective delta (scaled by combat speed)
  const effectiveDelta = getEffectiveDelta(deltaMs);
  const deltaSeconds = effectiveDelta / 1000;

  // Process enemy flags (enrage, shield)
  processEnemyFlags(deltaSeconds);

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
