// src/ecs/systems/path-ability/triggers.ts
/**
 * Trigger tracking for path abilities.
 * Records combat events that may activate path ability effects.
 */

import type { PathAbilityTrigger } from '@/types/paths';

/**
 * Context for trigger processing
 */
export interface TriggerContext {
  damage?: number;
  isCrit?: boolean;
  powerId?: string;
  isDodge?: boolean;
}

export interface PathTriggerEvent {
  trigger: PathAbilityTrigger;
  context: TriggerContext;
}

// Module-level tracking for path triggers (reset each tick)
let pendingTriggers: PathTriggerEvent[] = [];

/**
 * Record that a path ability trigger occurred this tick.
 * Called by CombatSystem or other systems when relevant events happen.
 */
export function recordPathTrigger(trigger: PathAbilityTrigger, context: TriggerContext): void {
  pendingTriggers.push({ trigger, context });
}

/**
 * Clear all recorded triggers.
 */
export function clearPathTriggerTracking(): void {
  pendingTriggers = [];
}

/**
 * Get pending triggers for this tick (read-only access).
 * Used by ResourceGenerationSystem to process resource gains.
 */
export function getPendingTriggers(): readonly PathTriggerEvent[] {
  return pendingTriggers;
}
