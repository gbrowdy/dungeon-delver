// src/store/actions/combat.ts
//
// Core combat tick. Mutates state in-place.
// Called with a fixed dt (TICK_MS = 16ms) every logical tick.
// Handles attack timer countdown, basic damage resolution, and combat event emission.

import type { GameState, CombatEntity, CombatEvent } from '@/types/game';
import { calculateDamage } from '@/math/damage';
import { getAttackInterval } from '@/math/stats';

/**
 * Core combat tick. Mutates state in-place.
 * Called with a fixed dt (TICK_MS = 16ms) every logical tick.
 */
export function tickCombat(state: GameState, dt: number): void {
  if (state.phase !== 'combat') return;
  if (!state.enemy) return;

  const player = state.player;
  const enemy = state.enemy;

  // Tick attack timers
  player.attackTimer -= dt;
  enemy.attackTimer -= dt;

  // Player attacks
  if (player.attackTimer <= 0) {
    resolvePlayerAttack(state, player, enemy);
    player.attackTimer = getAttackInterval(player.speed);
  }

  // Enemy attacks
  if (enemy.attackTimer <= 0) {
    resolveEnemyAttack(state, player, enemy);
    enemy.attackTimer = getAttackInterval(enemy.speed);
  }
}

function resolvePlayerAttack(
  state: GameState,
  player: CombatEntity,
  enemy: CombatEntity,
): void {
  const result = calculateDamage(player.power, enemy.fortitude, 1.0);
  enemy.hp -= result.final;

  emitCombatEvent(state, {
    type: 'damage',
    target: 'enemy',
    value: result.final,
    tick: state.gameTick,
  });
}

function resolveEnemyAttack(
  state: GameState,
  player: CombatEntity,
  enemy: CombatEntity,
): void {
  const result = calculateDamage(enemy.power, player.fortitude, 1.0);
  player.hp -= result.final;

  emitCombatEvent(state, {
    type: 'damage',
    target: 'player',
    value: result.final,
    tick: state.gameTick,
  });
}

function emitCombatEvent(state: GameState, event: CombatEvent): void {
  state.combatEvents.push(event);
}
