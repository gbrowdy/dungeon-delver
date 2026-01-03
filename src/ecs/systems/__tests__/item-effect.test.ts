// src/ecs/systems/__tests__/item-effect.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { world } from '../../world';
import {
  ItemEffectSystem,
  recordPlayerAttack,
  recordPlayerDamaged,
  recordEnemyKilled,
  clearCombatEventTracking,
} from '../item-effect';
import { ITEM_EFFECT_TRIGGER, EFFECT_TYPE } from '@/constants/enums';
import type { Entity } from '../../components';
import type { Item } from '@/types/game';

// Helper to create a test item with an effect
function createTestItem(
  name: string,
  trigger: string,
  effectType: string,
  value: number,
  chance?: number
): Item {
  return {
    id: `test-${name.toLowerCase().replace(/\s/g, '-')}`,
    name,
    type: 'weapon',
    rarity: 'rare',
    statBonus: {},
    description: `Test item: ${name}`,
    icon: 'T',
    enhancementLevel: 0,
    maxEnhancement: 3,
    effect: {
      trigger: trigger as Item['effect']['trigger'],
      type: effectType as Item['effect']['type'],
      value,
      chance,
      description: `${name} effect`,
    },
  };
}

// Helper to create player entity
function createPlayer(equipment?: {
  weapon?: Item | null;
  armor?: Item | null;
  accessory?: Item | null;
}): Entity {
  return world.add({
    player: true,
    identity: { name: 'Hero', class: 'warrior' },
    health: { current: 80, max: 100 },
    mana: { current: 40, max: 50 },
    attack: {
      baseDamage: 20,
      critChance: 0,
      critMultiplier: 2,
      variance: { min: 1, max: 1 },
    },
    defense: { value: 5, blockReduction: 0.4 },
    speed: { value: 10, attackInterval: 2500, accumulated: 0 },
    equipment: equipment ?? { weapon: null, armor: null, accessory: null },
  });
}

// Helper to create enemy entity
function createEnemy(health: number = 50): Entity {
  return world.add({
    enemy: { tier: 'common', name: 'Goblin', isBoss: false, abilities: [], intent: null },
    health: { current: health, max: health },
    attack: {
      baseDamage: 10,
      critChance: 0,
      critMultiplier: 2,
      variance: { min: 1, max: 1 },
    },
    defense: { value: 3, blockReduction: 0 },
    speed: { value: 8, attackInterval: 3000, accumulated: 0 },
  });
}

describe('ItemEffectSystem', () => {
  beforeEach(() => {
    // Clear all entities
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
    // Add game state
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
      animationEvents: [],
      combatLog: [],
    });
    // Clear any lingering event tracking
    clearCombatEventTracking();
  });

  describe('ON_HIT effects', () => {
    it('should process ON_HIT heal effect when player attacks', () => {
      const lifestealItem = createTestItem(
        'Vampiric Blade',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.HEAL,
        5 // Flat heal
      );

      const player = createPlayer({
        weapon: lifestealItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      // Record player attack
      recordPlayerAttack(15, false);

      ItemEffectSystem(16);

      // Player should be healed
      expect(player.health?.current).toBe(85); // 80 + 5
    });

    it('should process ON_HIT damage effect when player attacks', () => {
      const bonusDamageItem = createTestItem(
        'Fiery Sword',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.DAMAGE,
        10 // Flat bonus damage
      );

      const player = createPlayer({
        weapon: bonusDamageItem,
        armor: null,
        accessory: null,
      });
      const enemy = createEnemy(50);

      // Record player attack
      recordPlayerAttack(15, false);

      ItemEffectSystem(16);

      // Enemy should take bonus damage
      expect(enemy.health?.current).toBe(40); // 50 - 10
    });

    it('should not process ON_HIT effects when player does not attack', () => {
      const lifestealItem = createTestItem(
        'Vampiric Blade',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.HEAL,
        5
      );

      const player = createPlayer({
        weapon: lifestealItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      // No attack recorded

      ItemEffectSystem(16);

      // Player health unchanged
      expect(player.health?.current).toBe(80);
    });
  });

  describe('ON_CRIT effects', () => {
    it('should process ON_CRIT heal effect on critical hits', () => {
      const critHealItem = createTestItem(
        'Critical Lifebringer',
        ITEM_EFFECT_TRIGGER.ON_CRIT,
        EFFECT_TYPE.HEAL,
        15
      );

      const player = createPlayer({
        weapon: critHealItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      // Record critical attack
      recordPlayerAttack(30, true);

      ItemEffectSystem(16);

      // Player should be healed
      expect(player.health?.current).toBe(95); // 80 + 15
    });

    it('should process ON_CRIT damage multiplier effect', () => {
      const critDamageItem = createTestItem(
        'Executioner Blade',
        ITEM_EFFECT_TRIGGER.ON_CRIT,
        EFFECT_TYPE.DAMAGE,
        0.5 // 50% of crit damage as bonus
      );

      const player = createPlayer({
        weapon: critDamageItem,
        armor: null,
        accessory: null,
      });
      const enemy = createEnemy(100);

      // Record critical attack with 40 damage
      recordPlayerAttack(40, true);

      ItemEffectSystem(16);

      // Enemy should take bonus damage: 40 * 0.5 = 20
      expect(enemy.health?.current).toBe(80);
    });

    it('should process ON_CRIT mana restore effect', () => {
      const critManaItem = createTestItem(
        'Arcane Edge',
        ITEM_EFFECT_TRIGGER.ON_CRIT,
        EFFECT_TYPE.MANA,
        10
      );

      const player = createPlayer({
        weapon: critManaItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      // Record critical attack
      recordPlayerAttack(30, true);

      ItemEffectSystem(16);

      // Player should gain mana
      expect(player.mana?.current).toBe(50); // 40 + 10, capped at max
    });

    it('should not process ON_CRIT effects on non-critical hits', () => {
      const critHealItem = createTestItem(
        'Critical Lifebringer',
        ITEM_EFFECT_TRIGGER.ON_CRIT,
        EFFECT_TYPE.HEAL,
        15
      );

      const player = createPlayer({
        weapon: critHealItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      // Record non-critical attack
      recordPlayerAttack(20, false);

      ItemEffectSystem(16);

      // Player health unchanged (ON_CRIT didn't trigger)
      expect(player.health?.current).toBe(80);
    });
  });

  describe('ON_KILL effects', () => {
    it('should process ON_KILL heal effect when enemy dies', () => {
      const killHealItem = createTestItem(
        'Soul Reaver',
        ITEM_EFFECT_TRIGGER.ON_KILL,
        EFFECT_TYPE.HEAL,
        20
      );

      const player = createPlayer({
        weapon: killHealItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      // Record enemy killed
      recordEnemyKilled();

      ItemEffectSystem(16);

      // Player should be healed
      expect(player.health?.current).toBe(100); // 80 + 20, capped at max
    });

    it('should process ON_KILL percentage heal effect', () => {
      const killPercentHealItem = createTestItem(
        'Life Drinker',
        ITEM_EFFECT_TRIGGER.ON_KILL,
        EFFECT_TYPE.HEAL,
        0.1 // 10% max HP
      );

      const player = createPlayer({
        weapon: killPercentHealItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      // Record enemy killed
      recordEnemyKilled();

      ItemEffectSystem(16);

      // Player should heal 10% of max HP = 10
      expect(player.health?.current).toBe(90); // 80 + 10
    });

    it('should process ON_KILL mana restore effect', () => {
      const killManaItem = createTestItem(
        'Spirit Blade',
        ITEM_EFFECT_TRIGGER.ON_KILL,
        EFFECT_TYPE.MANA,
        15
      );

      const player = createPlayer({
        weapon: killManaItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      // Record enemy killed
      recordEnemyKilled();

      ItemEffectSystem(16);

      // Player should gain mana (capped at max 50)
      expect(player.mana?.current).toBe(50);
    });

    it('should not process ON_KILL effects when enemy not killed', () => {
      const killHealItem = createTestItem(
        'Soul Reaver',
        ITEM_EFFECT_TRIGGER.ON_KILL,
        EFFECT_TYPE.HEAL,
        20
      );

      const player = createPlayer({
        weapon: killHealItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      // Just attack, no kill
      recordPlayerAttack(15, false);

      ItemEffectSystem(16);

      // Player health unchanged
      expect(player.health?.current).toBe(80);
    });
  });

  describe('ON_DAMAGED effects', () => {
    it('should process ON_DAMAGED heal effect when player takes damage', () => {
      const absorbItem = createTestItem(
        'Life Shield',
        ITEM_EFFECT_TRIGGER.ON_DAMAGED,
        EFFECT_TYPE.HEAL,
        5
      );

      const player = createPlayer({
        weapon: null,
        armor: absorbItem,
        accessory: null,
      });
      createEnemy();

      // Record player damaged
      recordPlayerDamaged(15);

      ItemEffectSystem(16);

      // Player should be healed
      expect(player.health?.current).toBe(85); // 80 + 5
    });

    it('should process ON_DAMAGED reflect damage effect', () => {
      const thornmailItem = createTestItem(
        'Thornmail',
        ITEM_EFFECT_TRIGGER.ON_DAMAGED,
        EFFECT_TYPE.DAMAGE,
        8 // Reflect damage
      );

      const player = createPlayer({
        weapon: null,
        armor: thornmailItem,
        accessory: null,
      });
      const enemy = createEnemy(50);

      // Record player damaged
      recordPlayerDamaged(15);

      ItemEffectSystem(16);

      // Enemy should take reflect damage
      expect(enemy.health?.current).toBe(42); // 50 - 8
    });

    it('should not process ON_DAMAGED effects when player not damaged', () => {
      const absorbItem = createTestItem(
        'Life Shield',
        ITEM_EFFECT_TRIGGER.ON_DAMAGED,
        EFFECT_TYPE.HEAL,
        5
      );

      const player = createPlayer({
        weapon: null,
        armor: absorbItem,
        accessory: null,
      });
      createEnemy();

      // Player attacks but not damaged
      recordPlayerAttack(20, false);

      ItemEffectSystem(16);

      // Player health unchanged
      expect(player.health?.current).toBe(80);
    });
  });

  describe('proc chance', () => {
    it('should respect proc chance for effects', () => {
      // Mock Math.random to control proc chance
      const randomSpy = vi.spyOn(Math, 'random');

      const lowChanceItem = createTestItem(
        'Lucky Strike',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.HEAL,
        10,
        0.25 // 25% chance
      );

      const player = createPlayer({
        weapon: lowChanceItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      // First attack - random returns 0.5 (above 0.25, should NOT proc)
      randomSpy.mockReturnValue(0.5);
      recordPlayerAttack(15, false);
      ItemEffectSystem(16);

      expect(player.health?.current).toBe(80); // No heal

      // Second attack - random returns 0.1 (below 0.25, should proc)
      randomSpy.mockReturnValue(0.1);
      recordPlayerAttack(15, false);
      ItemEffectSystem(16);

      expect(player.health?.current).toBe(90); // Healed

      randomSpy.mockRestore();
    });

    it('should default to 100% proc chance when not specified', () => {
      const noChanceItem = createTestItem(
        'Reliable Blade',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.HEAL,
        5
        // No chance specified - defaults to 1.0
      );

      const player = createPlayer({
        weapon: noChanceItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      // Should always proc
      recordPlayerAttack(15, false);
      ItemEffectSystem(16);

      expect(player.health?.current).toBe(85);
    });
  });

  describe('combat log entries', () => {
    it('should add combat log entry for heal effects', () => {
      const healItem = createTestItem(
        'Healing Blade',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.HEAL,
        5
      );

      createPlayer({
        weapon: healItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      recordPlayerAttack(15, false);
      ItemEffectSystem(16);

      const gameState = world.with('gameState').first;
      expect(gameState?.combatLog).toContain('T Life steal: +5 HP');
    });

    it('should add combat log entry for damage effects', () => {
      const damageItem = createTestItem(
        'Fiery Blade',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.DAMAGE,
        10
      );

      createPlayer({
        weapon: damageItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      recordPlayerAttack(15, false);
      ItemEffectSystem(16);

      const gameState = world.with('gameState').first;
      expect(gameState?.combatLog).toContain('T Bonus damage: +10');
    });

    it('should add combat log entry for mana effects', () => {
      const manaItem = createTestItem(
        'Arcane Blade',
        ITEM_EFFECT_TRIGGER.ON_KILL,
        EFFECT_TYPE.MANA,
        10
      );

      createPlayer({
        weapon: manaItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      recordEnemyKilled();
      ItemEffectSystem(16);

      const gameState = world.with('gameState').first;
      expect(gameState?.combatLog).toContain('T Mana restored: +10');
    });
  });

  describe('multiple items', () => {
    it('should process effects from multiple equipped items', () => {
      const weaponItem = createTestItem(
        'Vampiric Blade',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.HEAL,
        5
      );
      const armorItem = createTestItem(
        'Thorned Armor',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.DAMAGE,
        3
      );
      const accessoryItem = createTestItem(
        'Mana Ring',
        ITEM_EFFECT_TRIGGER.ON_KILL,
        EFFECT_TYPE.MANA,
        15
      );

      const player = createPlayer({
        weapon: weaponItem,
        armor: armorItem,
        accessory: accessoryItem,
      });
      const enemy = createEnemy(50);

      // Attack triggers weapon and armor effects
      recordPlayerAttack(20, false);
      ItemEffectSystem(16);

      expect(player.health?.current).toBe(85); // 80 + 5 heal
      expect(enemy.health?.current).toBe(47); // 50 - 3 damage

      // Kill triggers accessory effect
      recordEnemyKilled();
      ItemEffectSystem(16);

      expect(player.mana?.current).toBe(50); // 40 + 10, capped at max
    });
  });

  describe('edge cases', () => {
    it('should not process effects when not in combat phase', () => {
      // Change to non-combat phase
      const gameState = world.with('gameState').first!;
      gameState.phase = 'shop';

      const healItem = createTestItem(
        'Healing Blade',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.HEAL,
        10
      );

      const player = createPlayer({
        weapon: healItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      recordPlayerAttack(15, false);
      ItemEffectSystem(16);

      // No effect - not in combat
      expect(player.health?.current).toBe(80);
    });

    it('should not process effects when player has no equipment', () => {
      const player = createPlayer();
      createEnemy();

      recordPlayerAttack(15, false);
      ItemEffectSystem(16);

      // No effect - no items
      expect(player.health?.current).toBe(80);
    });

    it('should handle items without effects', () => {
      // Create item with no effect
      const plainItem: Item = {
        id: 'plain-sword',
        name: 'Plain Sword',
        type: 'weapon',
        rarity: 'common',
        statBonus: { power: 5 },
        description: 'A plain sword',
        icon: 'S',
        enhancementLevel: 0,
        maxEnhancement: 3,
        // No effect
      };

      const player = createPlayer({
        weapon: plainItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      recordPlayerAttack(15, false);
      ItemEffectSystem(16);

      // No effect - item has no effect
      expect(player.health?.current).toBe(80);
    });

    it('should cap healing at max health', () => {
      const bigHealItem = createTestItem(
        'Super Healer',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.HEAL,
        50
      );

      const player = createPlayer({
        weapon: bigHealItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      recordPlayerAttack(15, false);
      ItemEffectSystem(16);

      // Capped at max health
      expect(player.health?.current).toBe(100);
    });

    it('should cap mana at max mana', () => {
      const bigManaItem = createTestItem(
        'Mana Fountain',
        ITEM_EFFECT_TRIGGER.ON_KILL,
        EFFECT_TYPE.MANA,
        100
      );

      const player = createPlayer({
        weapon: bigManaItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      recordEnemyKilled();
      ItemEffectSystem(16);

      // Capped at max mana
      expect(player.mana?.current).toBe(50);
    });

    it('should not damage dying enemies', () => {
      const damageItem = createTestItem(
        'Fiery Blade',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.DAMAGE,
        10
      );

      createPlayer({
        weapon: damageItem,
        armor: null,
        accessory: null,
      });
      const enemy = createEnemy(50);
      enemy.dying = { startedAtTick: 0, duration: 500 };

      recordPlayerAttack(15, false);
      ItemEffectSystem(16);

      // Dying enemy not damaged
      expect(enemy.health?.current).toBe(50);
    });

    it('should clear event tracking after processing', () => {
      const healItem = createTestItem(
        'Healing Blade',
        ITEM_EFFECT_TRIGGER.ON_HIT,
        EFFECT_TYPE.HEAL,
        5
      );

      const player = createPlayer({
        weapon: healItem,
        armor: null,
        accessory: null,
      });
      createEnemy();

      // First attack
      recordPlayerAttack(15, false);
      ItemEffectSystem(16);
      expect(player.health?.current).toBe(85);

      // Second tick with no new attack - should not heal again
      ItemEffectSystem(16);
      expect(player.health?.current).toBe(85); // Unchanged
    });
  });
});
