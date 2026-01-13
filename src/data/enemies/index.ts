/**
 * Enemy generation system
 *
 * This module provides enemy generation, abilities, scaling, and intent calculation.
 * Re-exports maintain backwards compatibility with the original enemies.ts API.
 */

// Main public API - backwards compatible re-exports
export { generateEnemy } from './generator';
export { calculateEnemyIntent } from './intent';
export { getAbilityById } from './abilities';
