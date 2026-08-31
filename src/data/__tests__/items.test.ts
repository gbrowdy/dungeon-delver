// src/data/__tests__/items.test.ts
import { describe, it, expect } from 'vitest';
import {
  ITEM_DEFINITIONS,
  WEAPONS,
  ARMORS,
  ACCESSORIES,
  ALL_ITEMS,
  getItemsBySlot,
  getScaledValue,
} from '../items';
import type { ItemId } from '@/types/game';

describe('item definitions', () => {
  it('defines exactly 15 items (5 weapons, 5 armors, 5 accessories)', () => {
    expect(WEAPONS).toHaveLength(5);
    expect(ARMORS).toHaveLength(5);
    expect(ACCESSORIES).toHaveLength(5);
    expect(ALL_ITEMS).toHaveLength(15);
    expect(Object.keys(ITEM_DEFINITIONS)).toHaveLength(15);
  });

  it('every item has a unique id', () => {
    const ids = ALL_ITEMS.map(i => i.id);
    expect(new Set(ids).size).toBe(15);
  });

  it('every weapon has slot "weapon"', () => {
    for (const w of WEAPONS) {
      expect(w.slot).toBe('weapon');
    }
  });

  it('every armor has slot "armor"', () => {
    for (const a of ARMORS) {
      expect(a.slot).toBe('armor');
    }
  });

  it('every accessory has slot "accessory"', () => {
    for (const a of ACCESSORIES) {
      expect(a.slot).toBe('accessory');
    }
  });

  it('every item has at least one effect', () => {
    for (const item of ALL_ITEMS) {
      expect(item.effects.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every item has name, description, and philosophy', () => {
    for (const item of ALL_ITEMS) {
      expect(item.name).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.philosophy).toBeTruthy();
    }
  });

  it('ITEM_DEFINITIONS lookup matches array contents', () => {
    for (const item of ALL_ITEMS) {
      expect(ITEM_DEFINITIONS[item.id]).toBe(item);
    }
  });

  it('all ItemId values have a corresponding definition', () => {
    // Exhaustive check: every ID in the type has a definition
    const expectedIds: ItemId[] = [
      'venomous_fang', 'shocking_edge', 'heavy_cleaver', 'twin_fang', 'hex_blade',
      'thorned_mail', 'vampiric_shroud', 'stone_skin', 'phase_cloak', 'berserker_plate',
      'riposte_charm', 'flurry_ring', 'war_cry_totem', 'bloodstone', 'regeneration_band',
    ];
    for (const id of expectedIds) {
      expect(ITEM_DEFINITIONS[id]).toBeDefined();
    }
  });
});

describe('item effect design: data-driven checks', () => {
  it('Heavy Cleaver has exactly 2 passive effects (damage up, speed down)', () => {
    const hc = ITEM_DEFINITIONS.heavy_cleaver;
    expect(hc.effects).toHaveLength(2);
    expect(hc.effects.every(e => e.trigger === 'passive')).toBe(true);

    const damageMult = hc.effects.find(e => e.effect === 'damage_mult');
    const speedMult = hc.effects.find(e => e.effect === 'speed_mult');
    expect(damageMult!.value).toBe(1.40);
    expect(speedMult!.value).toBe(0.90);
  });

  it('Shocking Edge stuns every 4th hit', () => {
    const se = ITEM_DEFINITIONS.shocking_edge;
    expect(se.effects[0].interval).toBe(4);
    expect(se.effects[0].effect).toBe('apply_stun');
  });

  it('Twin Fang double-hits at 55% damage', () => {
    const tf = ITEM_DEFINITIONS.twin_fang;
    expect(tf.effects[0].effect).toBe('double_hit');
    expect(tf.effects[0].value).toBe(0.55);
  });

  it('Berserker Plate is a double-edged sword (more damage taken AND dealt)', () => {
    const bp = ITEM_DEFINITIONS.berserker_plate;
    expect(bp.effects).toHaveLength(2);
    const incoming = bp.effects.find(e => e.effect === 'incoming_damage_mult');
    const outgoing = bp.effects.find(e => e.effect === 'outgoing_damage_mult');
    expect(incoming!.value).toBeGreaterThan(1); // take MORE damage
    expect(outgoing!.value).toBeGreaterThan(1); // deal MORE damage
  });

  it('Flurry Ring triggers every 5th attack', () => {
    const fr = ITEM_DEFINITIONS.flurry_ring;
    expect(fr.effects[0].interval).toBe(5);
    expect(fr.effects[0].effect).toBe('bonus_attack');
  });
});

describe('getItemsBySlot', () => {
  it('returns 5 weapons', () => {
    expect(getItemsBySlot('weapon')).toHaveLength(5);
    expect(getItemsBySlot('weapon')).toEqual(WEAPONS);
  });

  it('returns 5 armors', () => {
    expect(getItemsBySlot('armor')).toHaveLength(5);
  });

  it('returns 5 accessories', () => {
    expect(getItemsBySlot('accessory')).toHaveLength(5);
  });
});

describe('getScaledValue (tier upgrades)', () => {
  it('tier 1 returns the base value unchanged', () => {
    expect(getScaledValue(0.12, 1)).toBe(0.12);
    expect(getScaledValue(1.25, 1)).toBe(1.25);
  });

  it('tier 2 is noticeably higher than tier 1', () => {
    const t1 = getScaledValue(0.12, 1);
    const t2 = getScaledValue(0.12, 2);
    expect(t2).toBeGreaterThan(t1);
    // Tier 2 adds 15% of base (0.12 * 0.15 = 0.018)
    expect(t2).toBeCloseTo(0.138, 2);
  });

  it('tier upgrades have diminishing returns', () => {
    const jump2to3 = getScaledValue(1.0, 3) - getScaledValue(1.0, 2);
    const jump9to10 = getScaledValue(1.0, 10) - getScaledValue(1.0, 9);
    expect(jump2to3).toBeGreaterThan(jump9to10);
  });

  it('high tiers still improve (never zero delta)', () => {
    const t10 = getScaledValue(0.25, 10);
    const t11 = getScaledValue(0.25, 11);
    expect(t11).toBeGreaterThan(t10);
  });
});
