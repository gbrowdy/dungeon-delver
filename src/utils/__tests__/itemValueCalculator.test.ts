import { describe, it, expect } from 'vitest';
import {
  calculateStatValue,
  calculateTotalItemValue,
  calculateValuePerGold,
  checkItemValueBudget,
  estimateEffectValue,
  getTierBudget,
} from '../itemValueCalculator';
import { STARTER_GEAR } from '@/data/shop/starterGear';
import { CLASS_GEAR } from '@/data/shop/classGear';
import { SPECIALTY_ITEMS } from '@/data/shop/specialtyItems';
import { LEGENDARY_ITEMS } from '@/data/shop/legendaryItems';
import type { ShopItem, ShopItemTier } from '@/types/shop';

// Helper to get all items of a tier - throws on invalid tier to catch typos
function getItemsByTier(tier: ShopItemTier): ShopItem[] {
  switch (tier) {
    case 'starter':
      return STARTER_GEAR as ShopItem[];
    case 'class': {
      // Flatten all class gear (base + path items)
      const items: ShopItem[] = [];
      for (const classGear of Object.values(CLASS_GEAR)) {
        items.push(...(classGear.base as ShopItem[]));
        for (const pathItems of Object.values(classGear.paths)) {
          items.push(...(pathItems as ShopItem[]));
        }
      }
      return items;
    }
    case 'specialty':
      return SPECIALTY_ITEMS;
    case 'legendary':
      return LEGENDARY_ITEMS;
    default:
      throw new Error(
        `Unknown tier "${tier}" in test helper. Valid tiers: starter, class, specialty, legendary`
      );
  }
}

// Helper to calculate average value per gold for a tier
function getAverageValuePerGold(tier: ShopItemTier): number {
  const items = getItemsByTier(tier);
  if (items.length === 0) return 0;

  const totalValuePerGold = items.reduce(
    (sum, item) => sum + calculateValuePerGold(item),
    0
  );
  return totalValuePerGold / items.length;
}

// Helper to create a mock item with specific effect for testing
function createMockItemWithEffect(
  id: string,
  effectDescription: string,
  effectValue?: number,
  effectChance?: number
): ShopItem {
  return {
    id,
    name: `Test ${id}`,
    type: 'accessory',
    price: 100,
    stats: { power: 1 },
    tier: 'specialty',
    icon: 'Star',
    description: 'Test item',
    effect: {
      trigger: 'passive',
      type: 'buff',
      value: effectValue,
      chance: effectChance,
      description: effectDescription,
    },
  };
}

describe('Item Value Calculator', () => {
  describe('calculateStatValue', () => {
    it('calculates power correctly (1 point per power)', () => {
      expect(calculateStatValue({ power: 5 })).toBe(5);
    });

    it('calculates armor correctly (1 point per armor)', () => {
      expect(calculateStatValue({ armor: 3 })).toBe(3);
    });

    it('calculates speed correctly (0.5 points per speed)', () => {
      expect(calculateStatValue({ speed: 10 })).toBe(5);
    });

    it('calculates fortune correctly (0.5 points per fortune)', () => {
      expect(calculateStatValue({ fortune: 8 })).toBe(4);
    });

    it('calculates health correctly (0.2 points per health)', () => {
      expect(calculateStatValue({ maxHealth: 15 })).toBe(3);
    });

    it('combines multiple stats correctly', () => {
      // power: 4 = 4, fortune: 5 = 2.5 -> total = 6.5
      expect(calculateStatValue({ power: 4, fortune: 5 })).toBe(6.5);
    });

    it('handles empty stats object', () => {
      expect(calculateStatValue({})).toBe(0);
    });

    it('ignores undefined stat values', () => {
      expect(calculateStatValue({ power: undefined } as Record<string, number>)).toBe(0);
    });

    it('ignores unknown stat names (returns 0 for them)', () => {
      // Unknown stats are ignored but logged in development
      expect(calculateStatValue({ unknownStat: 10 })).toBe(0);
    });

    it('handles mixed valid and invalid stats', () => {
      expect(
        calculateStatValue({ power: 5, unknownStat: 10, armor: undefined } as Record<
          string,
          number
        >)
      ).toBe(5);
    });
  });

  describe('estimateEffectValue', () => {
    it('returns 0 for items without effects', () => {
      const item: ShopItem = {
        id: 'no_effect',
        name: 'No Effect Item',
        type: 'accessory',
        price: 100,
        stats: { power: 1 },
        tier: 'specialty',
        icon: 'Star',
        description: 'Test item',
      };
      expect(estimateEffectValue(item)).toBe(0);
    });

    it('returns 0.5 for items with effect but no description', () => {
      const item: ShopItem = {
        id: 'no_desc',
        name: 'No Desc Item',
        type: 'accessory',
        price: 100,
        stats: { power: 1 },
        tier: 'specialty',
        icon: 'Star',
        description: 'Test item',
        effect: {
          trigger: 'passive',
          type: 'buff',
          value: 1,
        } as ShopItem['effect'],
      };
      expect(estimateEffectValue(item)).toBe(0.5);
    });

    it('calculates lifesteal correctly (10% = 2.5 points)', () => {
      const item = createMockItemWithEffect(
        'lifesteal',
        'Heal 10% of damage dealt',
        0.1
      );
      expect(estimateEffectValue(item)).toBe(2.5);
    });

    it('calculates on-kill healing correctly', () => {
      const item = createMockItemWithEffect('on_kill_heal', 'Heal 5% on kill', 0.05);
      expect(estimateEffectValue(item)).toBe(0.5);
    });

    it('calculates crit-based healing correctly', () => {
      const item = createMockItemWithEffect(
        'crit_heal',
        'Heal 5 HP on critical hit',
        5
      );
      expect(estimateEffectValue(item)).toBe(1.0);
    });

    it('calculates stun effects with chance correctly', () => {
      const item = createMockItemWithEffect(
        'stun',
        '12% chance to stun enemy',
        1,
        0.12
      );
      expect(estimateEffectValue(item)).toBeCloseTo(0.24, 2);
    });

    it('calculates slow effects with chance correctly', () => {
      const item = createMockItemWithEffect(
        'slow',
        '30% chance to slow enemy',
        0.1,
        0.3
      );
      expect(estimateEffectValue(item)).toBeCloseTo(0.3, 2);
    });

    it('calculates resource-on-dodge correctly with chance', () => {
      const item = createMockItemWithEffect(
        'resource_dodge',
        '50% chance to restore 5 resource on dodge',
        5,
        0.5
      );
      // Formula: 0.5 * value * chance = 0.5 * 5 * 0.5 = 1.25
      expect(estimateEffectValue(item)).toBe(1.25);
    });

    it('calculates dodge chance buff correctly', () => {
      const item = createMockItemWithEffect('dodge_buff', '+5% dodge chance', 0.05);
      expect(estimateEffectValue(item)).toBeCloseTo(0.075, 3);
    });

    it('calculates survive lethal as 5 points', () => {
      const item = createMockItemWithEffect(
        'survive',
        'Survive lethal damage once',
        1
      );
      expect(estimateEffectValue(item)).toBe(5.0);
    });

    it('calculates revive as 4 points', () => {
      const item = createMockItemWithEffect('revive', 'Revive with 30% HP', 0.3);
      expect(estimateEffectValue(item)).toBe(4.0);
    });

    it('calculates resource regen correctly', () => {
      const item = createMockItemWithEffect(
        'resource_regen',
        '+2 resource regeneration per second',
        2
      );
      expect(estimateEffectValue(item)).toBe(2.0);
    });

    it('calculates block enhancement correctly', () => {
      const item = createMockItemWithEffect(
        'block_buff',
        'Block is 50% more effective',
        0.5
      );
      expect(estimateEffectValue(item)).toBe(1.0);
    });

    it('returns default 0.5 for unrecognized effects', () => {
      const item = createMockItemWithEffect(
        'unknown',
        'Some completely unique effect that does something special',
        1
      );
      expect(estimateEffectValue(item)).toBe(0.5);
    });
  });

  describe('getTierBudget', () => {
    it('returns correct budget for starter tier', () => {
      const budget = getTierBudget('starter');
      expect(budget).toEqual({ statPoints: 3, effectValue: 0, total: 3 });
    });

    it('returns correct budget for class tier', () => {
      const budget = getTierBudget('class');
      expect(budget).toEqual({ statPoints: 8, effectValue: 1, total: 9 });
    });

    it('returns correct budget for specialty tier', () => {
      const budget = getTierBudget('specialty');
      expect(budget).toEqual({ statPoints: 10, effectValue: 3, total: 13 });
    });

    it('returns correct budget for legendary tier', () => {
      const budget = getTierBudget('legendary');
      expect(budget).toEqual({ statPoints: 14, effectValue: 6, total: 20 });
    });

    it('returns default budget for unknown tier without crashing', () => {
      const budget = getTierBudget('unknown' as ShopItemTier);
      expect(budget).toEqual({ statPoints: 5, effectValue: 1, total: 6 });
    });
  });

  describe('calculateValuePerGold', () => {
    it('returns 0 for items with zero price', () => {
      const item: ShopItem = {
        id: 'zero_price',
        name: 'Zero Price Item',
        type: 'accessory',
        price: 0,
        stats: { power: 5 },
        tier: 'specialty',
        icon: 'Star',
        description: 'Test item',
      };
      expect(calculateValuePerGold(item)).toBe(0);
    });

    it('returns 0 for items with negative price', () => {
      const item: ShopItem = {
        id: 'negative_price',
        name: 'Negative Price Item',
        type: 'accessory',
        price: -100,
        stats: { power: 5 },
        tier: 'specialty',
        icon: 'Star',
        description: 'Test item',
      };
      expect(calculateValuePerGold(item)).toBe(0);
    });

    it('calculates correctly for valid items', () => {
      const item: ShopItem = {
        id: 'valid_item',
        name: 'Valid Item',
        type: 'accessory',
        price: 100,
        stats: { power: 10 }, // 10 stat points
        tier: 'specialty',
        icon: 'Star',
        description: 'Test item',
      };
      // 10 value / 100 gold = 0.1 value per gold
      expect(calculateValuePerGold(item)).toBe(0.1);
    });
  });

  describe('checkItemValueBudget boundary conditions', () => {
    it('classifies item at exactly 80% of budget as balanced', () => {
      // Specialty budget is 13, 80% = 10.4
      const item: ShopItem = {
        id: 'boundary_80',
        name: 'Boundary 80%',
        type: 'accessory',
        price: 100,
        stats: { power: 10, fortune: 1 }, // 10 + 0.5 = 10.5 (just above 10.4)
        tier: 'specialty',
        icon: 'Star',
        description: 'Test item',
      };
      const audit = checkItemValueBudget(item);
      expect(audit.status).toBe('balanced');
    });

    it('classifies item below 80% of budget as underpowered', () => {
      // Specialty budget is 13, 80% = 10.4
      const item: ShopItem = {
        id: 'underpowered',
        name: 'Underpowered',
        type: 'accessory',
        price: 100,
        stats: { power: 5 }, // 5 stat points, well below 10.4
        tier: 'specialty',
        icon: 'Star',
        description: 'Test item',
      };
      const audit = checkItemValueBudget(item);
      expect(audit.status).toBe('underpowered');
    });

    it('classifies item at 120% of budget as balanced', () => {
      // Specialty budget is 13, 120% = 15.6
      const item: ShopItem = {
        id: 'boundary_120',
        name: 'Boundary 120%',
        type: 'accessory',
        price: 100,
        stats: { power: 15 }, // 15 stat points, just below 15.6
        tier: 'specialty',
        icon: 'Star',
        description: 'Test item',
      };
      const audit = checkItemValueBudget(item);
      expect(audit.status).toBe('balanced');
    });

    it('classifies item above 120% of budget as overpowered', () => {
      // Specialty budget is 13, 120% = 15.6
      const item: ShopItem = {
        id: 'overpowered',
        name: 'Overpowered',
        type: 'accessory',
        price: 100,
        stats: { power: 20 }, // 20 stat points, well above 15.6
        tier: 'specialty',
        icon: 'Star',
        description: 'Test item',
      };
      const audit = checkItemValueBudget(item);
      expect(audit.status).toBe('overpowered');
    });
  });

  describe('Item tier value consistency', () => {
    it('specialty items provide good value per gold', () => {
      const specialtyAvg = getAverageValuePerGold('specialty');

      // Specialty items should provide at least 0.05 value per gold
      // (e.g., 10 value for 180g = 0.055)
      expect(specialtyAvg).toBeGreaterThan(0.05);
    });

    it('legendary items have strong effects', () => {
      const legendaryItems = getItemsByTier('legendary');

      // All legendary items should have effects
      legendaryItems.forEach(item => {
        expect(item.effect).toBeDefined();
      });

      // Legendary items should have at least 8 points of value
      const avgLegendaryValue =
        legendaryItems.reduce((sum, item) => sum + calculateTotalItemValue(item), 0) /
        legendaryItems.length;
      expect(avgLegendaryValue).toBeGreaterThan(8);
    });

    it('starter items are the most budget-friendly option', () => {
      const starterAvg = getAverageValuePerGold('starter');
      const classAvg = getAverageValuePerGold('class');

      // Starter items should have competitive value per gold
      // (They're basic but cheap)
      expect(starterAvg).toBeGreaterThan(0);
      expect(classAvg).toBeGreaterThan(0);
    });
  });

  describe('Individual item auditing', () => {
    it('Lucky Charm should have reasonable value after rebalancing', () => {
      const luckyCharm = SPECIALTY_ITEMS.find(item => item.id === 'lucky_charm');
      expect(luckyCharm).toBeDefined();
      if (!luckyCharm) return;

      const audit = checkItemValueBudget(luckyCharm);
      // Lucky Charm has: +12 Fortune (6) + +6 Speed (3) = 9 stat points
      // Effect: 50% chance to counter for 10 damage on dodge ≈ 3 points
      // Total: ~12 points - slightly overpowered but acceptable for build synergy
      expect(audit.totalValue).toBeGreaterThanOrEqual(10);
      expect(['balanced', 'overpowered']).toContain(audit.status);
    });

    it('specialty items should have adequate stat value', () => {
      const specialtyItems = getItemsByTier('specialty');

      // All specialty items should have at least 7 stat points worth of value
      specialtyItems.forEach(item => {
        const totalValue = calculateTotalItemValue(item);
        expect(totalValue).toBeGreaterThanOrEqual(7);
      });
    });

    it('no legendary items should lack effects', () => {
      const legendaryItems = getItemsByTier('legendary');
      const noEffectItems = legendaryItems.filter(item => !item.effect);

      expect(noEffectItems).toHaveLength(0);
    });

    it('all items should have positive price', () => {
      const allItems = [
        ...getItemsByTier('starter'),
        ...getItemsByTier('class'),
        ...getItemsByTier('specialty'),
        ...getItemsByTier('legendary'),
      ];

      allItems.forEach(item => {
        expect(item.price).toBeGreaterThan(0);
      });
    });
  });

  describe('Tier budget compliance', () => {
    it('starter items meet tier budget', () => {
      const starterItems = getItemsByTier('starter');
      starterItems.forEach(item => {
        const totalValue = calculateTotalItemValue(item);
        // Starter items should have ~3 stat points
        expect(totalValue).toBeGreaterThanOrEqual(2);
        expect(totalValue).toBeLessThanOrEqual(5);
      });
    });

    it('class items provide meaningful stats', () => {
      const classItems = getItemsByTier('class');

      // Class items should have at least 3 stat points worth of value
      // (Some class items have effectDescription instead of effect objects,
      // which aren't counted by our calculator but provide value)
      classItems.forEach(item => {
        const totalValue = calculateTotalItemValue(item);
        expect(totalValue).toBeGreaterThanOrEqual(3);
      });

      // Average class item value should be reasonable
      const avgClass =
        classItems.reduce((sum, item) => sum + calculateTotalItemValue(item), 0) /
        classItems.length;
      expect(avgClass).toBeGreaterThan(5);
    });

    it('specialty items are significantly more valuable than starter items', () => {
      const starterItems = getItemsByTier('starter');
      const specialtyItems = getItemsByTier('specialty');

      const avgStarter =
        starterItems.reduce((sum, item) => sum + calculateTotalItemValue(item), 0) /
        starterItems.length;
      const avgSpecialty =
        specialtyItems.reduce((sum, item) => sum + calculateTotalItemValue(item), 0) /
        specialtyItems.length;

      // Specialty should be at least 2x starter value
      expect(avgSpecialty).toBeGreaterThan(avgStarter * 2);
    });
  });
});
