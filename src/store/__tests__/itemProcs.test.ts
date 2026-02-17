import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processItemProcs } from '../actions/itemProcs';
import { useGameStore } from '../gameStore';
import { ITEM_DEFINITIONS } from '@/data/items';
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

    expect(passiveEffects.damageMult).toBeCloseTo(1.40);
    expect(passiveEffects.speedMult).toBeCloseTo(0.90);
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

  describe('Shocking Edge — stun every 4th hit', () => {
    it('stuns enemy on every 4th attack', () => {
      const state = createCombatState();
      state.equippedItems.weapon = { id: 'shocking_edge', slot: 'weapon', tier: 1 };

      for (let i = 1; i <= 4; i++) {
        state.combatCounters.playerAttackCount = i;
        processItemProcs(state, 'on_player_attack', { damage: 10 });
      }

      const stun = state.enemy!.statusEffects.find(e => e.type === 'stun');
      expect(stun).toBeDefined();
    });

    it('does not stun on non-4th attacks', () => {
      const state = createCombatState();
      state.equippedItems.weapon = { id: 'shocking_edge', slot: 'weapon', tier: 1 };
      state.combatCounters.playerAttackCount = 3;

      processItemProcs(state, 'on_player_attack', { damage: 10 });

      const stun = state.enemy!.statusEffects.find(e => e.type === 'stun');
      expect(stun).toBeUndefined();
    });
  });

  describe('Hex Blade — curse on hit', () => {
    it('applies curse stack on each attack', () => {
      const state = createCombatState();
      state.equippedItems.weapon = { id: 'hex_blade', slot: 'weapon', tier: 1 };
      state.combatCounters.playerAttackCount = 1;

      processItemProcs(state, 'on_player_attack', { damage: 10 });

      const curse = state.enemy!.statusEffects.find(e => e.type === 'curse');
      expect(curse).toBeDefined();
      expect(curse!.stacks).toBe(1);
    });
  });

  describe('Twin Fang — double_hit flag', () => {
    it('returns double_hit as a passive flag (handled in combat.ts)', () => {
      const state = createCombatState();
      state.equippedItems.weapon = { id: 'twin_fang', slot: 'weapon', tier: 1 };

      const def = ITEM_DEFINITIONS['twin_fang'];
      expect(def.effects[0].effect).toBe('double_hit');
    });
  });

  describe('Vampiric Shroud — lifesteal', () => {
    it('heals player for 8% of damage dealt', () => {
      const state = createCombatState();
      state.equippedItems.armor = { id: 'vampiric_shroud', slot: 'armor', tier: 1 };
      state.player.hp = state.player.maxHp - 50;
      const hpBefore = state.player.hp;

      processItemProcs(state, 'on_player_attack', { damage: 100 });

      expect(state.player.hp).toBe(hpBefore + 8);
    });

    it('does not heal above max HP', () => {
      const state = createCombatState();
      state.equippedItems.armor = { id: 'vampiric_shroud', slot: 'armor', tier: 1 };
      state.player.hp = state.player.maxHp;

      processItemProcs(state, 'on_player_attack', { damage: 100 });

      expect(state.player.hp).toBe(state.player.maxHp);
    });
  });

  describe('Stone Skin — passive damage_reduction + speed_mult', () => {
    it('returns 20% damage reduction and 90% speed mult', () => {
      const state = createCombatState();
      state.equippedItems.armor = { id: 'stone_skin', slot: 'armor', tier: 1 };

      const passives = processItemProcs(state, 'passive', {});

      expect(passives.damageReduction).toBeCloseTo(0.20);
      expect(passives.speedMult).toBeCloseTo(0.90);
    });
  });

  describe('Phase Cloak — dodge bonus', () => {
    it('returns 15% dodge bonus', () => {
      const state = createCombatState();
      state.equippedItems.armor = { id: 'phase_cloak', slot: 'armor', tier: 1 };

      const passives = processItemProcs(state, 'passive', {});

      expect(passives.dodgeBonus).toBeCloseTo(0.15);
    });
  });

  describe('Berserker Plate — incoming + outgoing damage mult', () => {
    it('returns 1.10 incoming and 1.15 outgoing multipliers', () => {
      const state = createCombatState();
      state.equippedItems.armor = { id: 'berserker_plate', slot: 'armor', tier: 1 };

      const passives = processItemProcs(state, 'passive', {});

      expect(passives.incomingDamageMult).toBeCloseTo(1.10);
      expect(passives.outgoingDamageMult).toBeCloseTo(1.15);
    });
  });

  describe('Regeneration Band — regen', () => {
    it('returns 1% max HP regen per second', () => {
      const state = createCombatState();
      state.equippedItems.accessory = { id: 'regeneration_band', slot: 'accessory', tier: 1 };

      const passives = processItemProcs(state, 'passive', {});

      expect(passives.regenPerSecond).toBeCloseTo(0.01);
    });
  });

  describe('Bloodstone — damage per missing HP', () => {
    it('returns 1% damage per 5% HP missing', () => {
      const state = createCombatState();
      state.equippedItems.accessory = { id: 'bloodstone', slot: 'accessory', tier: 1 };

      const passives = processItemProcs(state, 'passive', {});

      expect(passives.damagePerMissingHpPercent).toBeCloseTo(0.03);
    });
  });
});
