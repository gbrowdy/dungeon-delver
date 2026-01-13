// src/ecs/systems/passive-effect.ts
/**
 * PassiveEffectSystem - processes passive path effects (Guardian, Enchanter, etc.)
 *
 * This file contains only the system tick function.
 * State management, computation, and hooks are in ./passive-effect/
 *
 * ECS Architecture:
 * - recomputePassiveEffects(): Called on stance/enhancement change, writes to entity.passiveEffectState.computed
 * - updateConditionalEffects(): Called each tick, updates conditional values based on current HP
 * - PassiveEffectSystem(): Tick function - updates conditionals, processes auras
 * - Combat hooks (processPreDamage, etc.): READ from computed, never compute
 */

import { getPlayer, getActiveEnemy, getGameState } from '../queries';
import { getEffectiveDelta } from '../loop';
import { updateConditionalEffects } from './passive-effect/computation';

// Re-export public API for backward compatibility
export {
  initializePassiveEffectState,
  resetCombatState,
  resetFloorState,
} from './passive-effect/state';

export { recomputePassiveEffects } from './passive-effect/computation';

export {
  processPreDamage,
  processOnDamaged,
  checkSurviveLethal,
  type PreDamageResult,
  type OnDamagedResult,
  type SurviveLethalResult,
} from './passive-effect/hooks';

// ============================================================================
// SYSTEM TICK FUNCTION
// ============================================================================

/**
 * PassiveEffectSystem - main tick function.
 * Runs early in the tick loop, before combat.
 *
 * Responsibilities:
 * 1. Update conditional bonuses based on current HP
 * 2. Process continuous effects (damage auras)
 */
export function PassiveEffectSystem(deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') return;

  const player = getPlayer();
  if (!player?.passiveEffectState) return;

  const effectiveDelta = getEffectiveDelta(deltaMs);
  const computed = player.passiveEffectState.computed;

  // 1. Update conditional effects based on current HP
  updateConditionalEffects(player);

  // 2. Process damage aura (Thorns Aura)
  if (computed.damageAuraPerSecond > 0) {
    const enemy = getActiveEnemy();
    if (enemy?.health && !enemy.dying) {
      const auraDamage = Math.round(computed.damageAuraPerSecond * (effectiveDelta / 1000));
      if (auraDamage > 0) {
        enemy.health.current = Math.max(0, enemy.health.current - auraDamage);
      }
    }
  }

  // 3. Process hex damage aura (only in hex_veil stance)
  // Note: getActiveEnemy() uses activeEnemyQuery which already excludes dying enemies
  if (player.stanceState?.activeStanceId === 'hex_veil' && computed.hexDamageAura > 0) {
    const enemy = getActiveEnemy();
    if (enemy?.health) {
      const hexAuraDamage = computed.hexDamageAura * computed.hexIntensityMultiplier;
      const auraDamage = Math.round(hexAuraDamage * (effectiveDelta / 1000));
      if (auraDamage > 0) {
        enemy.health.current = Math.max(0, enemy.health.current - auraDamage);
      }
    }
  }
}
