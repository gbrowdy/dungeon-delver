import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processItemProcs } from '../actions/itemProcs';
import { useGameStore } from '../gameStore';
import type { GameState } from '@/types/game';

function createCombatState(): GameState {
  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.getState().selectClass('warrior');
  useGameStore.getState().startRun();
  return useGameStore.getState();
}

describe('processItemProcs', () => {
  it('does nothing when no items equipped', () => {
    const state = createCombatState();
    const enemyHpBefore = state.enemy!.hp;

    processItemProcs(state, 'on_player_attack', { damage: 10 });

    expect(state.enemy!.hp).toBe(enemyHpBefore);
  });

  it('processes passive effects from Heavy Cleaver (damage_mult)', () => {
    const state = createCombatState();
    state.equippedItems.weapon = { id: 'heavy_cleaver', slot: 'weapon', tier: 1 };

    const passiveEffects = processItemProcs(state, 'passive', {});

    expect(passiveEffects.damageMult).toBeCloseTo(1.25);
    expect(passiveEffects.speedMult).toBeCloseTo(0.85);
  });

  it('processes on_player_attack effects from Venomous Fang (apply_poison)', () => {
    const state = createCombatState();
    state.equippedItems.weapon = { id: 'venomous_fang', slot: 'weapon', tier: 1 };

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

    processItemProcs(state, 'on_player_attack', { damage: 10 });

    const poison = state.enemy!.statusEffects.find(e => e.type === 'poison');
    expect(poison).toBeDefined();

    mockRandom.mockRestore();
  });

  it('processes on_player_hit effects from Thorned Mail (reflect_damage)', () => {
    const state = createCombatState();
    state.equippedItems.armor = { id: 'thorned_mail', slot: 'armor', tier: 1 };

    const enemyHpBefore = state.enemy!.hp;
    processItemProcs(state, 'on_player_hit', { damage: 100 });

    expect(state.enemy!.hp).toBeLessThan(enemyHpBefore);
  });
});
