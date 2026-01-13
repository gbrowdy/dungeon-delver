// src/ecs/systems/path-ability/index.ts
/**
 * PathAbilitySystem - processes path ability triggers during combat.
 *
 * This system processes path ability effects based on combat events:
 * - on_hit: When player attacks
 * - on_crit: When player lands a critical hit
 * - on_kill: When player kills an enemy
 * - on_damaged: When player takes damage
 * - on_dodge: When player dodges an attack
 * - on_power_use: When player uses a power
 * - combat_start: At the start of combat
 * - turn_start: At the start of each combat turn
 *
 * Runs after ItemEffectSystem and before StatusEffectSystem.
 */

import { getPlayer, getActiveEnemy, getGameState } from '@/ecs/queries';
import { getEffectiveDelta } from '@/ecs/loop';
import { getPlayerActiveAbilities } from '@/data/paths/registry';
import type { Entity } from '@/ecs/components';
import type { PathAbility, PathAbilityTrigger } from '@/types/paths';

// Re-export submodules for consumers
export {
  recordPathTrigger,
  clearPathTriggerTracking,
  getPendingTriggers,
  type TriggerContext,
  type PathTriggerEvent,
} from './triggers';

export { checkCondition } from './conditions';
export { processEffect } from './effects';

// Internal imports for this module
import {
  getPendingTriggers,
  clearPathTriggerTracking,
  type TriggerContext,
} from './triggers';
import { checkCondition } from './conditions';
import { processEffect } from './effects';

// ============================================================================
// TRIGGER PROCESSING
// ============================================================================

/**
 * Process all abilities for a given trigger.
 */
function processTrigger(
  trigger: PathAbilityTrigger,
  context: TriggerContext,
  player: Entity,
  enemy: Entity | undefined,
  abilities: PathAbility[]
): void {
  for (const ability of abilities) {
    for (const effect of ability.effects) {
      // Check if this effect matches the trigger
      if (effect.trigger !== trigger) continue;

      // Check condition if present
      if (effect.condition && !checkCondition(effect.condition, player, enemy)) {
        continue;
      }

      // Check if ability is on cooldown (from previous uses)
      if (player.path?.abilityCooldowns?.[ability.id] && player.path.abilityCooldowns[ability.id] > 0) {
        // Ability is on cooldown, skip
        continue;
      }

      // If effect has a cooldown, set it after processing
      let shouldSetCooldown = false;
      if (effect.cooldown && effect.cooldown > 0) {
        shouldSetCooldown = true;
      }

      // Check proc chance
      if (effect.chance !== undefined && Math.random() > effect.chance) {
        continue;
      }

      // Process the effect
      processEffect(effect, ability, player, enemy, context);

      // Set cooldown after processing (if effect has one)
      if (shouldSetCooldown && player.path) {
        if (!player.path.abilityCooldowns) {
          player.path.abilityCooldowns = {};
        }
        // Convert seconds to milliseconds
        player.path.abilityCooldowns[ability.id] = effect.cooldown! * 1000;
      }
    }
  }
}

/**
 * Update cooldowns for all abilities.
 */
function updateCooldowns(player: Entity, deltaMs: number): void {
  if (!player.path?.abilityCooldowns) return;

  const cooldowns = player.path.abilityCooldowns;
  for (const abilityId of Object.keys(cooldowns)) {
    const remaining = cooldowns[abilityId];
    if (remaining > 0) {
      cooldowns[abilityId] = Math.max(0, remaining - deltaMs);
    }
  }
}

// ============================================================================
// SYSTEM
// ============================================================================

/**
 * PathAbilitySystem - processes path ability triggers during combat.
 *
 * @param deltaMs - Time since last tick
 */
export function PathAbilitySystem(deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') {
    clearPathTriggerTracking();
    return;
  }

  const player = getPlayer();
  if (!player) {
    clearPathTriggerTracking();
    return;
  }

  // Check if player has a path
  if (!player.path) {
    clearPathTriggerTracking();
    return;
  }

  const enemy = getActiveEnemy();
  const effectiveDelta = getEffectiveDelta(deltaMs);

  // Update cooldowns
  updateCooldowns(player, effectiveDelta);

  // Get active abilities
  const abilities = getPlayerActiveAbilities(player);
  if (abilities.length === 0) {
    clearPathTriggerTracking();
    return;
  }

  // Process all pending triggers
  for (const event of getPendingTriggers()) {
    processTrigger(event.trigger, event.context, player, enemy, abilities);
  }

  // Clear triggers for next tick
  clearPathTriggerTracking();
}
