// src/ecs/systems/passive-effect/index.ts
/**
 * Passive effect system - public API exports.
 *
 * State management:
 * - initializePassiveEffectState, resetCombatState, resetFloorState
 *
 * Computation:
 * - recomputePassiveEffects
 *
 * Combat hooks:
 * - processPreDamage, processOnDamaged, checkSurviveLethal
 * - PreDamageResult, OnDamagedResult, SurviveLethalResult
 */

export * from './state';
export { recomputePassiveEffects } from './computation';
export * from './hooks';
