// src/store/actions/combat.ts
//
// Core combat tick. Mutates state in-place.
// Called with a fixed dt (TICK_MS = 16ms) every logical tick.
// Handles attack timer countdown, basic damage resolution, and combat event emission.

import type { GameState, CombatEntity, CombatEvent } from '@/types/game';
import { calculateDamage } from '@/math/damage';
import { getAttackInterval, getCritChance, getCritDamage, getDodgeChance } from '@/math/stats';
import { WARRIOR_FORTITUDE_MULT, ROGUE_CRIT_MULT, MAGE_AMPLIFY_PER_LUCK } from '@/math/balance';

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

function rollCrit(luck: number): { isCrit: boolean; multiplier: number } {
  const chance = getCritChance(luck);
  const isCrit = Math.random() < chance;
  return {
    isCrit,
    multiplier: isCrit ? getCritDamage(luck) : 1.0,
  };
}

function getEffectiveCritMultiplier(multiplier: number, classId: string): number {
  if (classId === 'rogue') {
    return multiplier * ROGUE_CRIT_MULT;
  }
  return multiplier;
}

function getAmplifyMultiplier(luck: number, classId: string): number {
  if (classId === 'mage') {
    return 1 + luck * MAGE_AMPLIFY_PER_LUCK;
  }
  return 1.0;
}

function resolvePlayerAttack(
  state: GameState,
  player: CombatEntity,
  enemy: CombatEntity,
): void {
  const crit = rollCrit(player.luck);
  const critMultiplier = crit.isCrit
    ? getEffectiveCritMultiplier(crit.multiplier, state.classId)
    : 1.0;
  const result = calculateDamage(player.power, enemy.fortitude, critMultiplier);

  // Mage Amplify: multiply final damage by (1 + luck * 0.005)
  const amplify = getAmplifyMultiplier(player.luck, state.classId);
  const finalDamage = Math.max(1, Math.round(result.final * amplify));

  enemy.hp -= finalDamage;

  emitCombatEvent(state, {
    type: crit.isCrit ? 'crit' : 'damage',
    target: 'enemy',
    value: finalDamage,
    tick: state.gameTick,
  });
}

function getEffectiveFortitude(fortitude: number, classId: string, isDefender: boolean): number {
  if (isDefender && classId === 'warrior') {
    return Math.round(fortitude * WARRIOR_FORTITUDE_MULT);
  }
  return fortitude;
}

function resolveEnemyAttack(
  state: GameState,
  player: CombatEntity,
  enemy: CombatEntity,
): void {
  // Player dodge check (only player can dodge)
  const dodgeChance = getDodgeChance(player.luck);
  if (Math.random() < dodgeChance) {
    emitCombatEvent(state, { type: 'dodge', target: 'player', tick: state.gameTick });
    return;
  }

  const effectiveFortitude = getEffectiveFortitude(player.fortitude, state.classId, true);
  const result = calculateDamage(enemy.power, effectiveFortitude, 1.0);
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
