import type { GameState, EnemyModifier } from '@/types/game';
import { addStatusEffect } from './statusEffects';

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
  if (hasModifier(state, 'berserker')) {
    const hpPercent = enemy.hp / enemy.maxHp;
    if (hpPercent < 0.3) {
      enemy.power = Math.round(enemy.basePower * 1.5);
    } else {
      enemy.power = enemy.basePower;
    }
  }

  // Regenerating: 2% max HP per second
  if (hasModifier(state, 'regenerating')) {
    const healPerTick = (enemy.maxHp * 0.02 * dt) / 1000;
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + healPerTick);
  }

  // Shielded: 20% max HP shield every 8 seconds
  if (hasModifier(state, 'shielded')) {
    state.combatCounters.shieldRefreshTimer += dt;
    if (state.combatCounters.shieldRefreshTimer >= 8000) {
      state.combatCounters.shieldRefreshTimer -= 8000;
      const shieldHp = Math.round(enemy.maxHp * 0.2);
      addStatusEffect(enemy, 'shield', state.combatElapsed, shieldHp);
    }
  }
}
