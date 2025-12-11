/**
 * Unit tests for processItemEffects function
 *
 * Tests cover:
 * - Each trigger type (TURN_START, ON_HIT, ON_CRIT, ON_KILL, ON_DAMAGED)
 * - Each effect type (HEAL, DAMAGE, MANA)
 * - Chance-based effects
 * - Edge cases (missing value, invalid type, no items)
 *
 * To run these tests, first install the testing dependencies:
 * npm install -D vitest @vitest/ui jsdom
 *
 * Then run with: npm run test:unit
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processItemEffects, ItemEffectContext } from '../useItemEffects';
import { Player, Item } from '@/types/game';
import { ITEM_EFFECT_TRIGGER, EFFECT_TYPE, ItemEffectTriggerType, EffectType } from '@/constants/enums';

// Helper function to create a minimal test player
function createTestPlayer(overrides?: Partial<Player>): Player {
  return {
    name: 'Test Hero',
    class: 'warrior',
    level: 1,
    experience: 0,
    experienceToNext: 100,
    gold: 0,
    baseStats: {
      health: 50,
      maxHealth: 50,
      attack: 10,
      defense: 5,
      speed: 10,
      critChance: 0.1,
      dodgeChance: 0.1,
      mana: 50,
      maxMana: 50,
      hpRegen: 0,
      mpRegen: 2,
      cooldownSpeed: 1,
      critDamage: 2,
      goldFind: 0,
    },
    currentStats: {
      health: 50,
      maxHealth: 50,
      attack: 10,
      defense: 5,
      speed: 10,
      critChance: 0.1,
      dodgeChance: 0.1,
      mana: 50,
      maxMana: 50,
      hpRegen: 0,
      mpRegen: 2,
      cooldownSpeed: 1,
      critDamage: 2,
      goldFind: 0,
    },
    powers: [],
    inventory: [],
    equippedItems: [],
    activeBuffs: [],
    statusEffects: [],
    isBlocking: false,
    comboCount: 0,
    lastPowerUsed: null,
    upgradePurchases: {
      HP: 0,
      ATTACK: 0,
      DEFENSE: 0,
      CRIT: 0,
      DODGE: 0,
      MANA: 0,
      SPEED: 0,
      HP_REGEN: 0,
      MP_REGEN: 0,
      COOLDOWN_SPEED: 0,
      CRIT_DAMAGE: 0,
      GOLD_FIND: 0,
    },
    isDying: false,
    ...overrides,
  };
}

// Helper function to create a test item with effects
function createTestItem(
  trigger: string,
  effectType: string,
  value: number,
  chance?: number
): Item {
  return {
    id: 'test-item',
    name: 'Test Item',
    type: 'accessory',
    rarity: 'rare',
    statBonus: {},
    description: 'Test item with effect',
    icon: '🔮',
    effect: {
      trigger: trigger as ItemEffectTriggerType,
      type: effectType as EffectType,
      value,
      chance,
      description: 'Test effect',
    },
  };
}

describe('processItemEffects', () => {
  describe('HEAL effect type', () => {
    it('should heal player on TURN_START trigger', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.TURN_START, EFFECT_TYPE.HEAL, 10);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(40);
      expect(result.logs).toContain('🔮 Regenerated 10 HP');
      expect(result.additionalDamage).toBe(0);
    });

    it('should heal player on ON_HIT trigger (life steal)', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.ON_HIT, EFFECT_TYPE.HEAL, 5);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.ON_HIT,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(35);
      expect(result.logs).toContain('🔮 Life steal: +5 HP');
    });

    it('should heal player on ON_CRIT trigger', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.ON_CRIT, EFFECT_TYPE.HEAL, 8);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.ON_CRIT,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(38);
      expect(result.logs).toContain('🔮 Healed 8 HP on crit!');
    });

    it('should heal player on ON_KILL trigger', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.ON_KILL, EFFECT_TYPE.HEAL, 15);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.ON_KILL,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(45);
      expect(result.logs).toContain('🔮 Victory heal: +15 HP');
    });

    it('should heal player on ON_DAMAGED trigger', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.ON_DAMAGED, EFFECT_TYPE.HEAL, 3);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.ON_DAMAGED,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(33);
      expect(result.logs).toContain('🔮 Damage absorbed: +3 HP');
    });

    it('should not exceed max health when healing', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 48, maxHealth: 50 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.TURN_START, EFFECT_TYPE.HEAL, 10);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(50); // Capped at max
      expect(result.player.currentStats.maxHealth).toBe(50);
    });
  });

  describe('DAMAGE effect type', () => {
    it('should add flat bonus damage on ON_HIT trigger', () => {
      const player = createTestPlayer();
      const item = createTestItem(ITEM_EFFECT_TRIGGER.ON_HIT, EFFECT_TYPE.DAMAGE, 5);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.ON_HIT,
        player,
        damage: 20,
      };

      const result = processItemEffects(context);

      expect(result.additionalDamage).toBe(5);
      expect(result.logs).toContain('🔮 Bonus damage: +5');
    });

    it('should multiply damage on ON_CRIT trigger', () => {
      const player = createTestPlayer();
      const item = createTestItem(ITEM_EFFECT_TRIGGER.ON_CRIT, EFFECT_TYPE.DAMAGE, 0.5); // 50% bonus
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.ON_CRIT,
        player,
        damage: 40,
      };

      const result = processItemEffects(context);

      expect(result.additionalDamage).toBe(20); // 40 * 0.5 = 20
      expect(result.logs).toEqual([]); // ON_CRIT damage bonus doesn't log
    });

    it('should handle multiple damage items', () => {
      const player = createTestPlayer();
      const item1 = createTestItem(ITEM_EFFECT_TRIGGER.ON_HIT, EFFECT_TYPE.DAMAGE, 3);
      const item2 = createTestItem(ITEM_EFFECT_TRIGGER.ON_HIT, EFFECT_TYPE.DAMAGE, 4);
      item2.id = 'test-item-2';
      player.equippedItems = [item1, item2];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.ON_HIT,
        player,
        damage: 20,
      };

      const result = processItemEffects(context);

      expect(result.additionalDamage).toBe(7); // 3 + 4
      expect(result.logs.length).toBe(2);
    });
  });

  describe('MANA effect type', () => {
    it('should restore mana on ON_KILL trigger with log', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, mana: 20 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.ON_KILL, EFFECT_TYPE.MANA, 10);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.ON_KILL,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.mana).toBe(30);
      expect(result.logs).toContain('🔮 Mana restored: +10');
    });

    it('should restore mana on TURN_START trigger without log', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, mana: 20 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.TURN_START, EFFECT_TYPE.MANA, 5);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.mana).toBe(25);
      expect(result.logs).toEqual([]); // TURN_START mana doesn't log
    });

    it('should restore mana on ON_DAMAGED trigger without log', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, mana: 20 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.ON_DAMAGED, EFFECT_TYPE.MANA, 3);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.ON_DAMAGED,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.mana).toBe(23);
      expect(result.logs).toEqual([]); // ON_DAMAGED mana doesn't log
    });

    it('should not exceed max mana when restoring', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, mana: 48, maxMana: 50 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.ON_KILL, EFFECT_TYPE.MANA, 10);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.ON_KILL,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.mana).toBe(50); // Capped at max
      expect(result.player.currentStats.maxMana).toBe(50);
    });
  });

  describe('Chance-based effects', () => {
    it('should trigger effect when chance is met (100%)', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.TURN_START, EFFECT_TYPE.HEAL, 10, 1.0);
      player.equippedItems = [item];

      // Mock Math.random to return 0 (always pass)
      vi.spyOn(Math, 'random').mockReturnValue(0);

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(40);
      expect(result.logs.length).toBe(1);

      vi.restoreAllMocks();
    });

    it('should not trigger effect when chance is not met', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.TURN_START, EFFECT_TYPE.HEAL, 10, 0.5);
      player.equippedItems = [item];

      // Mock Math.random to return 0.9 (fail 50% chance)
      vi.spyOn(Math, 'random').mockReturnValue(0.9);

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(30); // No healing
      expect(result.logs).toEqual([]);

      vi.restoreAllMocks();
    });

    it('should default to 100% chance when chance is undefined', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.TURN_START, EFFECT_TYPE.HEAL, 10);
      // Remove chance property to test default
      if (item.effect) {
        delete item.effect.chance;
      }
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(40);
      expect(result.logs.length).toBe(1);
    });

    it('should handle 0% chance (never triggers)', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.TURN_START, EFFECT_TYPE.HEAL, 10, 0);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(30); // No healing
      expect(result.logs).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('should handle no equipped items', () => {
      const player = createTestPlayer();
      player.equippedItems = [];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player).toEqual(player);
      expect(result.additionalDamage).toBe(0);
      expect(result.logs).toEqual([]);
    });

    it('should ignore items with wrong trigger type', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30 },
      });
      const item = createTestItem(ITEM_EFFECT_TRIGGER.ON_HIT, EFFECT_TYPE.HEAL, 10);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START, // Different trigger
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(30); // No change
      expect(result.logs).toEqual([]);
    });

    it('should ignore items without effects', () => {
      const player = createTestPlayer();
      const item: Item = {
        id: 'test-item',
        name: 'Test Item',
        type: 'weapon',
        rarity: 'common',
        statBonus: { attack: 5 },
        description: 'No effect item',
        icon: '⚔️',
        // No effect property
      };
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START,
        player,
      };

      const result = processItemEffects(context);

      expect(result.additionalDamage).toBe(0);
      expect(result.logs).toEqual([]);
    });

    it('should not mutate original player object', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30 },
      });
      const originalHealth = player.currentStats.health;
      const item = createTestItem(ITEM_EFFECT_TRIGGER.TURN_START, EFFECT_TYPE.HEAL, 10);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(40);
      expect(player.currentStats.health).toBe(originalHealth); // Original unchanged
      expect(result.player).not.toBe(player); // Different reference
    });

    it('should handle multiple items with different triggers', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30 },
      });
      const item1 = createTestItem(ITEM_EFFECT_TRIGGER.TURN_START, EFFECT_TYPE.HEAL, 10);
      const item2 = createTestItem(ITEM_EFFECT_TRIGGER.ON_HIT, EFFECT_TYPE.DAMAGE, 5);
      item2.id = 'test-item-2';
      player.equippedItems = [item1, item2];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START,
        player,
      };

      const result = processItemEffects(context);

      // Only item1 should trigger
      expect(result.player.currentStats.health).toBe(40);
      expect(result.additionalDamage).toBe(0);
      expect(result.logs.length).toBe(1);
    });

    it('should handle damage context without damage value', () => {
      const player = createTestPlayer();
      const item = createTestItem(ITEM_EFFECT_TRIGGER.ON_CRIT, EFFECT_TYPE.DAMAGE, 0.5);
      player.equippedItems = [item];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.ON_CRIT,
        player,
        // No damage property
      };

      const result = processItemEffects(context);

      expect(result.additionalDamage).toBe(0); // 0 * 0.5 = 0
    });

    it('should process multiple effects of same type', () => {
      const player = createTestPlayer({
        currentStats: { ...createTestPlayer().currentStats, health: 30, mana: 20 },
      });
      const healItem = createTestItem(ITEM_EFFECT_TRIGGER.TURN_START, EFFECT_TYPE.HEAL, 10);
      const manaItem = createTestItem(ITEM_EFFECT_TRIGGER.TURN_START, EFFECT_TYPE.MANA, 5);
      manaItem.id = 'test-item-2';
      manaItem.icon = '💎';
      player.equippedItems = [healItem, manaItem];

      const context: ItemEffectContext = {
        trigger: ITEM_EFFECT_TRIGGER.TURN_START,
        player,
      };

      const result = processItemEffects(context);

      expect(result.player.currentStats.health).toBe(40);
      expect(result.player.currentStats.mana).toBe(25);
      expect(result.logs.length).toBe(1); // Only heal logs on TURN_START
    });
  });

  describe('All trigger types', () => {
    it('should handle all trigger types', () => {
      const triggers = [
        ITEM_EFFECT_TRIGGER.TURN_START,
        ITEM_EFFECT_TRIGGER.ON_HIT,
        ITEM_EFFECT_TRIGGER.ON_CRIT,
        ITEM_EFFECT_TRIGGER.ON_KILL,
        ITEM_EFFECT_TRIGGER.ON_DAMAGED,
      ];

      triggers.forEach((trigger) => {
        const player = createTestPlayer({
          currentStats: { ...createTestPlayer().currentStats, health: 30 },
        });
        const item = createTestItem(trigger, EFFECT_TYPE.HEAL, 10);
        player.equippedItems = [item];

        const context: ItemEffectContext = {
          trigger,
          player,
          damage: 20,
        };

        const result = processItemEffects(context);

        expect(result.player.currentStats.health).toBe(40);
        expect(result.logs.length).toBeGreaterThan(0);
      });
    });
  });
});
