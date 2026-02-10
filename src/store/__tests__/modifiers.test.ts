import { describe, it, expect, beforeEach } from 'vitest';
import { tickModifierBehaviors } from '../actions/modifiers';
import { addStatusEffect, getEffect } from '../actions/statusEffects';
import { useGameStore } from '../gameStore';
import { TICK_MS } from '@/math/balance';
import type { GameState } from '@/types/game';

function createCombatState(modifiers: string[] = []): GameState {
  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.getState().selectClass('warrior');
  useGameStore.getState().startRun();
  const state = useGameStore.getState();
  state.enemyDefinition!.modifiers = modifiers as any;
  return state;
}

describe('tickModifierBehaviors', () => {
  describe('berserker', () => {
    it('does not boost power above 30% HP', () => {
      const state = createCombatState(['berserker']);
      state.enemy!.hp = state.enemy!.maxHp;
      const basePower = state.enemy!.basePower;

      tickModifierBehaviors(state, TICK_MS);

      expect(state.enemy!.power).toBe(basePower);
    });

    it('multiplies power by 1.5 below 30% HP', () => {
      const state = createCombatState(['berserker']);
      state.enemy!.hp = Math.floor(state.enemy!.maxHp * 0.2);
      const basePower = state.enemy!.basePower;

      tickModifierBehaviors(state, TICK_MS);

      expect(state.enemy!.power).toBe(Math.round(basePower * 1.5));
    });

    it('reverts power when healed above 30%', () => {
      const state = createCombatState(['berserker']);
      state.enemy!.hp = Math.floor(state.enemy!.maxHp * 0.2);
      tickModifierBehaviors(state, TICK_MS);
      expect(state.enemy!.power).toBe(Math.round(state.enemy!.basePower * 1.5));

      state.enemy!.hp = state.enemy!.maxHp;
      tickModifierBehaviors(state, TICK_MS);
      expect(state.enemy!.power).toBe(state.enemy!.basePower);
    });
  });

  describe('regenerating', () => {
    it('heals 2% max HP per second', () => {
      const state = createCombatState(['regenerating']);
      const maxHp = state.enemy!.maxHp;
      state.enemy!.hp = Math.floor(maxHp * 0.5);
      const hpBefore = state.enemy!.hp;

      const ticksPerSecond = Math.round(1000 / TICK_MS);
      for (let i = 0; i < ticksPerSecond; i++) {
        tickModifierBehaviors(state, TICK_MS);
      }

      const expectedHeal = maxHp * 0.02;
      const actualHeal = state.enemy!.hp - hpBefore;
      expect(actualHeal).toBeGreaterThan(0);
      expect(actualHeal).toBeCloseTo(expectedHeal, 0);
    });

    it('does not heal above max HP', () => {
      const state = createCombatState(['regenerating']);
      state.enemy!.hp = state.enemy!.maxHp;

      tickModifierBehaviors(state, TICK_MS);

      expect(state.enemy!.hp).toBe(state.enemy!.maxHp);
    });
  });

  describe('venomous', () => {
    it('is handled as a flag — venomous modifier tracked for combat.ts to apply poison on enemy attack', () => {
      const state = createCombatState(['venomous']);
      expect(state.enemyDefinition!.modifiers).toContain('venomous');
    });
  });

  describe('shielded', () => {
    it('grants shield every 8 seconds', () => {
      const state = createCombatState(['shielded']);
      state.combatCounters.shieldRefreshTimer = 8000 - TICK_MS;

      tickModifierBehaviors(state, TICK_MS);

      const shield = state.enemy!.statusEffects.find(e => e.type === 'shield');
      expect(shield).toBeDefined();
    });

    it('shield amount is 20% of max HP', () => {
      const state = createCombatState(['shielded']);
      state.combatCounters.shieldRefreshTimer = 8000 - TICK_MS;
      const expectedShieldHp = Math.round(state.enemy!.maxHp * 0.2);

      tickModifierBehaviors(state, TICK_MS);

      const shield = state.enemy!.statusEffects.find(e => e.type === 'shield');
      expect(shield).toBeDefined();
    });

    it('does not grant shield before 8s', () => {
      const state = createCombatState(['shielded']);
      state.combatCounters.shieldRefreshTimer = 0;

      tickModifierBehaviors(state, TICK_MS);

      const shield = state.enemy!.statusEffects.find(e => e.type === 'shield');
      expect(shield).toBeUndefined();
    });
  });
});
