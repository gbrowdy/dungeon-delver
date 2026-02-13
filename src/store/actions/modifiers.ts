import type { GameState, EnemyModifier } from '@/types/game';
import { addStatusEffect } from './statusEffects';
import {
  BERSERKER_POWER_MULT,
  BERSERKER_HP_THRESHOLD,
  REGEN_PERCENT_PER_SEC,
  SHIELD_REFRESH_MS,
  SHIELD_HP_PERCENT,
} from '@/math/balance';

function hasModifier(state: GameState, modifier: EnemyModifier): boolean {
  return state.enemyDefinition?.modifiers.includes(modifier) ?? false;
}

/**
 * Tick modifier-based behaviors. Called each combat tick.
 */
export function tickModifierBehaviors(state: GameState, dt: number): void {
  if (!state.enemy || !state.enemyDefinition) return;
  const enemy = state.enemy;

  // Berserker: Power * 1.5 below 30% HP
  // Multiplies enemy.power (not basePower) to compose with enrage
  if (hasModifier(state, 'berserker')) {
    const hpPercent = enemy.hp / enemy.maxHp;
    if (hpPercent < BERSERKER_HP_THRESHOLD) {
      enemy.power = Math.round(enemy.power * BERSERKER_POWER_MULT);
    }
  }

  // Regenerating: 2% max HP per second
  if (hasModifier(state, 'regenerating')) {
    const healPerTick = (enemy.maxHp * REGEN_PERCENT_PER_SEC * dt) / 1000;
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + healPerTick);
  }

  // Shielded: 20% max HP shield every 8 seconds
  if (hasModifier(state, 'shielded')) {
    state.combatCounters.shieldRefreshTimer += dt;
    if (state.combatCounters.shieldRefreshTimer >= SHIELD_REFRESH_MS) {
      state.combatCounters.shieldRefreshTimer -= SHIELD_REFRESH_MS;
      const shieldHp = Math.round(enemy.maxHp * SHIELD_HP_PERCENT);
      addStatusEffect(enemy, 'shield', state.combatElapsed, shieldHp);
    }
  }
}
