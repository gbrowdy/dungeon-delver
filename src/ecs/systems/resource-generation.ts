// src/ecs/systems/resource-generation.ts
/**
 * ResourceGenerationSystem - generates path resources based on combat events.
 *
 * Active paths have unique resources (Fury, Arcane Charges, Momentum, Zeal)
 * that generate from combat events like hitting enemies, taking damage, etc.
 *
 * This system reads the pending triggers from combat and power systems,
 * checks the player's pathResource.generation config, and adds to the resource.
 *
 * Runs BEFORE PathAbilitySystem so it can read from the same trigger queue.
 */

import { getPlayer, getGameState } from '../queries';
import { getPendingTriggers } from './path-ability';
import type { PathAbilityTrigger } from '@/types/paths';

/**
 * Map trigger types to generation config keys.
 */
const TRIGGER_TO_GENERATION: Record<PathAbilityTrigger, keyof NonNullable<typeof generation> | null> = {
  on_hit: 'onHit',
  on_crit: 'onCrit',
  on_kill: 'onKill',
  on_damaged: 'onDamaged',
  on_power_use: 'onPowerUse',
  on_block: 'onBlock',
  on_dodge: null,        // No resource generation for dodge
  combat_start: null,    // No resource generation for combat start
  turn_start: null,      // No resource generation for turn start
};

// Workaround for TypeScript - define the type separately
type GenerationKey = 'onHit' | 'onCrit' | 'onKill' | 'onDamaged' | 'onPowerUse' | 'onBlock' | 'passive';
const generation: Record<GenerationKey, number | undefined> = {} as Record<GenerationKey, number | undefined>;

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

/**
 * Get display name for resource type.
 */
function getResourceName(type: string): string {
  switch (type) {
    case 'fury': return 'Fury';
    case 'arcane_charges': return 'Arcane Charges';
    case 'momentum': return 'Momentum';
    case 'zeal': return 'Zeal';
    default: return 'Resource';
  }
}

export function ResourceGenerationSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  const player = getPlayer();
  if (!player?.pathResource) return;

  // Skip if player has default mana (passive paths or pre-level-2)
  if (player.pathResource.type === 'mana') return;

  const resource = player.pathResource;
  const pendingTriggers = getPendingTriggers();

  // Track total gained this tick for logging
  let totalGained = 0;

  for (const event of pendingTriggers) {
    const generationKey = TRIGGER_TO_GENERATION[event.trigger];
    if (!generationKey) continue;

    const amount = resource.generation[generationKey];
    if (!amount || amount <= 0) continue;

    // Add to resource, capped at max
    const oldValue = resource.current;
    resource.current = Math.min(resource.max, resource.current + amount);
    const actualGain = resource.current - oldValue;

    if (actualGain > 0) {
      totalGained += actualGain;
    }
  }

  // Log resource gain (aggregate for the tick to avoid spam)
  if (totalGained > 0) {
    const resourceName = getResourceName(resource.type);
    addCombatLog(`+${totalGained} ${resourceName} (${resource.current}/${resource.max})`);
  }
}
