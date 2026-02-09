// src/data/__tests__/enemies.test.ts
import { describe, it, expect } from 'vitest';
import {
  ENEMY_TIERS,
  MODIFIER_EFFECTS,
  MODIFIER_LIST,
  selectEnemyTier,
  selectModifiers,
  generateEnemy,
} from '../enemies';

describe('enemy tier stats', () => {
  it('defines 4 tiers', () => {
    expect(Object.keys(ENEMY_TIERS)).toHaveLength(4);
  });

  it('boss has higher base stats than common', () => {
    expect(ENEMY_TIERS.boss.power).toBeGreaterThan(ENEMY_TIERS.common.power);
    expect(ENEMY_TIERS.boss.hp).toBeGreaterThan(ENEMY_TIERS.common.hp);
  });

  it('tiers are ordered: common < uncommon < rare < boss (by HP)', () => {
    expect(ENEMY_TIERS.common.hp).toBeLessThan(ENEMY_TIERS.uncommon.hp);
    expect(ENEMY_TIERS.uncommon.hp).toBeLessThan(ENEMY_TIERS.rare.hp);
    expect(ENEMY_TIERS.rare.hp).toBeLessThan(ENEMY_TIERS.boss.hp);
  });

  it('all tiers have positive stats', () => {
    for (const tier of Object.values(ENEMY_TIERS)) {
      expect(tier.hp).toBeGreaterThan(0);
      expect(tier.power).toBeGreaterThan(0);
      expect(tier.fortitude).toBeGreaterThan(0);
      expect(tier.speed).toBeGreaterThan(0);
    }
  });
});

describe('modifier definitions', () => {
  it('defines 6 modifiers', () => {
    expect(MODIFIER_LIST).toHaveLength(6);
    expect(Object.keys(MODIFIER_EFFECTS)).toHaveLength(6);
  });

  it('swift has a speed stat multiplier', () => {
    expect(MODIFIER_EFFECTS.swift.statMults?.speed).toBe(1.4);
  });

  it('armored has a fortitude stat multiplier', () => {
    expect(MODIFIER_EFFECTS.armored.statMults?.fortitude).toBe(1.3);
  });

  it('behavioral modifiers have no stat multipliers', () => {
    expect(MODIFIER_EFFECTS.berserker.statMults).toBeUndefined();
    expect(MODIFIER_EFFECTS.regenerating.statMults).toBeUndefined();
    expect(MODIFIER_EFFECTS.venomous.statMults).toBeUndefined();
    expect(MODIFIER_EFFECTS.shielded.statMults).toBeUndefined();
  });
});

describe('selectEnemyTier', () => {
  it('never returns boss (bosses are placed, not rolled)', () => {
    for (let i = 0; i < 100; i++) {
      expect(selectEnemyTier(50)).not.toBe('boss');
    }
  });

  it('always returns a valid tier', () => {
    const validTiers = ['common', 'uncommon', 'rare'];
    for (let i = 0; i < 100; i++) {
      expect(validTiers).toContain(selectEnemyTier(10));
    }
  });
});

describe('selectModifiers', () => {
  it('common enemies get no modifiers', () => {
    for (let i = 0; i < 20; i++) {
      expect(selectModifiers('common', 50)).toHaveLength(0);
    }
  });

  it('uncommon enemies get at most 1 modifier', () => {
    for (let i = 0; i < 50; i++) {
      expect(selectModifiers('uncommon', 100).length).toBeLessThanOrEqual(1);
    }
  });

  it('rare enemies get 1-2 modifiers (at least 1 guaranteed)', () => {
    for (let i = 0; i < 50; i++) {
      const mods = selectModifiers('rare', 50);
      expect(mods.length).toBeGreaterThanOrEqual(1);
      expect(mods.length).toBeLessThanOrEqual(2);
    }
  });

  it('boss enemies always get at least 1 modifier', () => {
    for (let i = 0; i < 50; i++) {
      const mods = selectModifiers('boss', 50);
      expect(mods.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('no duplicate modifiers on the same enemy', () => {
    for (let i = 0; i < 50; i++) {
      const mods = selectModifiers('boss', 100);
      expect(new Set(mods).size).toBe(mods.length);
    }
  });
});

describe('generateEnemy', () => {
  it('generates a valid CombatEntity', () => {
    const { entity } = generateEnemy(1, 'common', []);
    expect(entity.power).toBeGreaterThan(0);
    expect(entity.fortitude).toBeGreaterThanOrEqual(0);
    expect(entity.speed).toBeGreaterThan(0);
    expect(entity.hp).toBeGreaterThan(0);
    expect(entity.hp).toBe(entity.maxHp);
    expect(entity.statusEffects).toEqual([]);
    expect(entity.luck).toBe(0); // enemies don't have luck
  });

  it('floor 1 common enemy has stats close to base', () => {
    const { entity } = generateEnemy(1, 'common', []);
    // Growth multiplier at floor 1 is exactly 1
    // HP = base.hp + fortitude * 5 = 40 + 7*5 = 75
    expect(entity.power).toBe(8);
    expect(entity.fortitude).toBe(7);
    expect(entity.maxHp).toBe(75); // getMaxHp(40, 7)
  });

  it('enemies scale with floor depth', () => {
    const floor1 = generateEnemy(1, 'common', []);
    const floor50 = generateEnemy(50, 'common', []);
    expect(floor50.entity.power).toBeGreaterThan(floor1.entity.power * 5);
    expect(floor50.entity.maxHp).toBeGreaterThan(floor1.entity.maxHp * 5);
  });

  it('boss enemies have significantly more HP', () => {
    const common = generateEnemy(10, 'common', []);
    const boss = generateEnemy(10, 'boss', []);
    // Boss has higher base HP AND gets boss HP multiplier
    expect(boss.entity.maxHp).toBeGreaterThan(common.entity.maxHp * 2);
  });

  it('swift modifier increases speed', () => {
    const base = generateEnemy(10, 'rare', []);
    const swift = generateEnemy(10, 'rare', ['swift']);
    expect(swift.entity.speed).toBeGreaterThan(base.entity.speed);
  });

  it('armored modifier increases fortitude', () => {
    const base = generateEnemy(10, 'rare', []);
    const armored = generateEnemy(10, 'rare', ['armored']);
    expect(armored.entity.fortitude).toBeGreaterThan(base.entity.fortitude);
  });

  it('breakpoint floors get stat boost', () => {
    const normal = generateEnemy(24, 'common', []);
    const breakpoint = generateEnemy(25, 'common', []);
    // Floor 25 is breakpoint — stats should be boosted beyond normal scaling
    expect(breakpoint.entity.power).toBeGreaterThan(normal.entity.power);
  });

  it('basePower is set to initial power (for enrage reference)', () => {
    const { entity } = generateEnemy(10, 'common', []);
    expect(entity.basePower).toBe(entity.power);
  });

  it('attackTimer starts at 0 (enemy ready to attack immediately)', () => {
    const { entity } = generateEnemy(1, 'common', []);
    expect(entity.attackTimer).toBe(0);
  });
});
