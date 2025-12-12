import { describe, it, expect } from 'vitest';
import { deepClonePlayer, deepCloneEnemy } from '../stateUtils';
import type { Player, Enemy, StatusEffect, ActiveBuff, Power, Item, EnemyAbility, EnemyIntent } from '@/types/game';

describe('stateUtils', () => {
  describe('deepClonePlayer', () => {
    it('should create a deep clone without mutating the original player', () => {
      const originalPlayer: Player = {
        name: 'TestHero',
        class: 'warrior',
        level: 5,
        experience: 500,
        experienceToNext: 750,
        gold: 100,
        baseStats: {
          health: 50,
          maxHealth: 50,
          power: 10,
          armor: 5,
          speed: 8,
          fortune: 0.1,
          fortune: 0.05,
          mana: 30,
          maxMana: 30,
          
          
          
          
          
        },
        currentStats: {
          health: 45,
          maxHealth: 50,
          power: 10,
          armor: 5,
          speed: 8,
          fortune: 0.1,
          fortune: 0.05,
          mana: 25,
          maxMana: 30,
          
          
          
          
          
        },
        powers: [
          {
            id: 'fireball',
            name: 'Fireball',
            description: 'Deals fire damage',
            manaCost: 15,
            cooldown: 3,
            currentCooldown: 0,
            effect: 'damage',
            value: 25,
            icon: '🔥',
            upgradeLevel: 1,
          },
        ],
        inventory: [],
        equippedItems: [
          {
            id: 'sword-1',
            name: 'Iron Sword',
            type: 'weapon',
            rarity: 'common',
            statBonus: { power: 5 },
            description: 'A basic sword',
            icon: '⚔️',
            effect: {
              trigger: 'on_hit',
              type: 'damage',
              value: 3,
              chance: 0.3,
              description: 'Deal extra damage',
            },
          },
        ],
        activeBuffs: [
          {
            id: 'buff-1',
            name: 'Power Up',
            stat: 'power',
            multiplier: 1.5,
            remainingTurns: 3,
            icon: '💪',
          },
        ],
        statusEffects: [
          {
            id: 'poison-1',
            type: 'poison',
            damage: 5,
            remainingTurns: 2,
            icon: '☠️',
          },
        ],
        isBlocking: false,
        comboCount: 0,
        lastPowerUsed: null,
        // upgradePurchases removed - old upgrade system deprecated
        isDying: false,
      };

      const clonedPlayer = deepClonePlayer(originalPlayer);

      // Verify original is unchanged at top level
      expect(originalPlayer.name).toBe('TestHero');
      expect(originalPlayer.level).toBe(5);
      expect(originalPlayer.gold).toBe(100);

      // Verify clone is equal but not the same reference
      expect(clonedPlayer).toEqual(originalPlayer);
      expect(clonedPlayer).not.toBe(originalPlayer);
    });

    it('should create independent copies of nested Stats objects', () => {
      const originalPlayer: Player = {
        name: 'TestHero',
        class: 'warrior',
        level: 1,
        experience: 0,
        experienceToNext: 100,
        gold: 0,
        baseStats: {
          health: 50,
          maxHealth: 50,
          power: 10,
          armor: 5,
          speed: 8,
          fortune: 0.1,
          fortune: 0.05,
          mana: 30,
          maxMana: 30,
          
          
          
          
          
        },
        currentStats: {
          health: 50,
          maxHealth: 50,
          power: 10,
          armor: 5,
          speed: 8,
          fortune: 0.1,
          fortune: 0.05,
          mana: 30,
          maxMana: 30,
          
          
          
          
          
        },
        powers: [],
        inventory: [],
        equippedItems: [],
        activeBuffs: [],
        statusEffects: [],
        isBlocking: false,
        comboCount: 0,
        lastPowerUsed: null,
        // upgradePurchases removed
        isDying: false,
      };

      const clonedPlayer = deepClonePlayer(originalPlayer);

      // Modify clone's stats
      clonedPlayer.baseStats.power = 999;
      clonedPlayer.currentStats.health = 1;

      // Verify original is unchanged
      expect(originalPlayer.baseStats.power).toBe(10);
      expect(originalPlayer.currentStats.health).toBe(50);

      // Verify the objects are not the same reference
      expect(clonedPlayer.baseStats).not.toBe(originalPlayer.baseStats);
      expect(clonedPlayer.currentStats).not.toBe(originalPlayer.currentStats);
    });

    it('should create independent copies of statusEffects array', () => {
      const originalPlayer: Player = {
        name: 'TestHero',
        class: 'warrior',
        level: 1,
        experience: 0,
        experienceToNext: 100,
        gold: 0,
        baseStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 8,
          fortune: 0.1, fortune: 0.05, mana: 30, maxMana: 30,
              
        },
        currentStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 8,
          fortune: 0.1, fortune: 0.05, mana: 30, maxMana: 30,
              
        },
        powers: [],
        inventory: [],
        equippedItems: [],
        activeBuffs: [],
        statusEffects: [
          { id: 'poison-1', type: 'poison', damage: 5, remainingTurns: 3, icon: '☠️' },
          { id: 'stun-1', type: 'stun', damage: 0, remainingTurns: 1, icon: '💫' },
        ],
        isBlocking: false,
        comboCount: 0,
        lastPowerUsed: null,
        // upgradePurchases removed
        isDying: false,
      };

      const clonedPlayer = deepClonePlayer(originalPlayer);

      // Modify clone's status effects
      clonedPlayer.statusEffects[0].remainingTurns = 999;
      clonedPlayer.statusEffects.push({
        id: 'bleed-1', type: 'bleed', damage: 10, remainingTurns: 5, icon: '🩸',
      });

      // Verify original is unchanged
      expect(originalPlayer.statusEffects).toHaveLength(2);
      expect(originalPlayer.statusEffects[0].remainingTurns).toBe(3);
      expect(clonedPlayer.statusEffects).toHaveLength(3);

      // Verify arrays are not the same reference
      expect(clonedPlayer.statusEffects).not.toBe(originalPlayer.statusEffects);
      expect(clonedPlayer.statusEffects[0]).not.toBe(originalPlayer.statusEffects[0]);
    });

    it('should create independent copies of equipped items with nested effects', () => {
      const originalPlayer: Player = {
        name: 'TestHero',
        class: 'warrior',
        level: 1,
        experience: 0,
        experienceToNext: 100,
        gold: 0,
        baseStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 8,
          fortune: 0.1, fortune: 0.05, mana: 30, maxMana: 30,
              
        },
        currentStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 8,
          fortune: 0.1, fortune: 0.05, mana: 30, maxMana: 30,
              
        },
        powers: [],
        inventory: [],
        equippedItems: [
          {
            id: 'weapon-1',
            name: 'Magic Sword',
            type: 'weapon',
            rarity: 'rare',
            statBonus: { power: 10, fortune: 0.05 },
            description: 'A magical weapon',
            icon: '⚔️',
            effect: {
              trigger: 'on_crit',
              type: 'damage',
              value: 15,
              chance: 0.5,
              description: 'Deal bonus damage on crit',
            },
          },
        ],
        activeBuffs: [],
        statusEffects: [],
        isBlocking: false,
        comboCount: 0,
        lastPowerUsed: null,
        // upgradePurchases removed
        isDying: false,
      };

      const clonedPlayer = deepClonePlayer(originalPlayer);

      // Modify clone's item and nested effect
      clonedPlayer.equippedItems[0].statBonus.power = 999;
      if (clonedPlayer.equippedItems[0].effect) {
        clonedPlayer.equippedItems[0].effect.value = 888;
      }

      // Verify original is unchanged
      expect(originalPlayer.equippedItems[0].statBonus.power).toBe(10);
      expect(originalPlayer.equippedItems[0].effect?.value).toBe(15);

      // Verify objects are not the same reference
      expect(clonedPlayer.equippedItems).not.toBe(originalPlayer.equippedItems);
      expect(clonedPlayer.equippedItems[0]).not.toBe(originalPlayer.equippedItems[0]);
      expect(clonedPlayer.equippedItems[0].statBonus).not.toBe(originalPlayer.equippedItems[0].statBonus);
      expect(clonedPlayer.equippedItems[0].effect).not.toBe(originalPlayer.equippedItems[0].effect);
    });

    it('should create independent copies of activeBuffs array', () => {
      const originalPlayer: Player = {
        name: 'TestHero',
        class: 'warrior',
        level: 1,
        experience: 0,
        experienceToNext: 100,
        gold: 0,
        baseStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 8,
          fortune: 0.1, fortune: 0.05, mana: 30, maxMana: 30,
              
        },
        currentStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 8,
          fortune: 0.1, fortune: 0.05, mana: 30, maxMana: 30,
              
        },
        powers: [],
        inventory: [],
        equippedItems: [],
        activeBuffs: [
          { id: 'buff-1', name: 'Strength', stat: 'power', multiplier: 1.5, remainingTurns: 3, icon: '💪' },
          { id: 'buff-2', name: 'Speed', stat: 'speed', multiplier: 1.2, remainingTurns: 2, icon: '⚡' },
        ],
        statusEffects: [],
        isBlocking: false,
        comboCount: 0,
        lastPowerUsed: null,
        // upgradePurchases removed
        isDying: false,
      };

      const clonedPlayer = deepClonePlayer(originalPlayer);

      // Modify clone's buffs
      clonedPlayer.activeBuffs[0].multiplier = 999;
      clonedPlayer.activeBuffs.pop();

      // Verify original is unchanged
      expect(originalPlayer.activeBuffs).toHaveLength(2);
      expect(originalPlayer.activeBuffs[0].multiplier).toBe(1.5);

      // Verify arrays are not the same reference
      expect(clonedPlayer.activeBuffs).not.toBe(originalPlayer.activeBuffs);
      expect(clonedPlayer.activeBuffs[0]).not.toBe(originalPlayer.activeBuffs[0]);
    });

    it('should create independent copies of powers array', () => {
      const originalPlayer: Player = {
        name: 'TestHero',
        class: 'Mage',
        level: 1,
        experience: 0,
        experienceToNext: 100,
        gold: 0,
        baseStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 8,
          fortune: 0.1, fortune: 0.05, mana: 30, maxMana: 30,
              
        },
        currentStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 8,
          fortune: 0.1, fortune: 0.05, mana: 30, maxMana: 30,
              
        },
        powers: [
          {
            id: 'fireball',
            name: 'Fireball',
            description: 'Deals fire damage',
            manaCost: 15,
            cooldown: 3,
            currentCooldown: 2,
            effect: 'damage',
            value: 25,
            icon: '🔥',
            upgradeLevel: 2,
          },
        ],
        inventory: [],
        equippedItems: [],
        activeBuffs: [],
        statusEffects: [],
        isBlocking: false,
        comboCount: 0,
        lastPowerUsed: null,
        // upgradePurchases removed
        isDying: false,
      };

      const clonedPlayer = deepClonePlayer(originalPlayer);

      // Modify clone's powers
      clonedPlayer.powers[0].currentCooldown = 0;
      clonedPlayer.powers[0].upgradeLevel = 3;

      // Verify original is unchanged
      expect(originalPlayer.powers[0].currentCooldown).toBe(2);
      expect(originalPlayer.powers[0].upgradeLevel).toBe(2);

      // Verify arrays are not the same reference
      expect(clonedPlayer.powers).not.toBe(originalPlayer.powers);
      expect(clonedPlayer.powers[0]).not.toBe(originalPlayer.powers[0]);
    });

    // DEPRECATED: Test removed - upgradePurchases system deprecated
    // it('should create independent copies of upgradePurchases object', () => {
    //   ... test code removed ...
    // });
  });

  describe('deepCloneEnemy', () => {
    it('should create a deep clone without mutating the original enemy', () => {
      const originalEnemy: Enemy = {
        id: 'goblin-1',
        name: 'Goblin',
        health: 30,
        maxHealth: 30,
        power: 8,
        armor: 3,
        speed: 10,
        experienceReward: 50,
        goldReward: 25,
        isBoss: false,
        abilities: [
          {
            id: 'multi-hit',
            name: 'Multi Hit',
            type: 'multi_hit',
            value: 2,
            cooldown: 3,
            currentCooldown: 0,
            chance: 0.3,
            icon: '⚔️',
            description: 'Attacks twice',
          },
        ],
        intent: {
          type: 'attack',
          damage: 8,
          icon: '⚔️',
        },
        statusEffects: [
          {
            id: 'poison-1',
            type: 'poison',
            damage: 3,
            remainingTurns: 2,
            icon: '☠️',
          },
        ],
        isShielded: false,
        shieldTurnsRemaining: 0,
        isEnraged: false,
        enrageTurnsRemaining: 0,
        basePower: 8,
        isDying: false,
      };

      const clonedEnemy = deepCloneEnemy(originalEnemy);

      // Verify original is unchanged at top level
      expect(originalEnemy.name).toBe('Goblin');
      expect(originalEnemy.health).toBe(30);
      expect(originalEnemy.power).toBe(8);

      // Verify clone is equal but not the same reference
      expect(clonedEnemy).toEqual(originalEnemy);
      expect(clonedEnemy).not.toBe(originalEnemy);
    });

    it('should create independent copies of abilities array', () => {
      const originalEnemy: Enemy = {
        id: 'boss-1',
        name: 'Boss',
        health: 100,
        maxHealth: 100,
        power: 15,
        armor: 8,
        speed: 12,
        experienceReward: 200,
        goldReward: 100,
        isBoss: true,
        abilities: [
          {
            id: 'poison-attack',
            name: 'Poison Attack',
            type: 'poison',
            value: 5,
            cooldown: 4,
            currentCooldown: 2,
            chance: 0.5,
            icon: '☠️',
            description: 'Poisons the enemy',
          },
          {
            id: 'heal',
            name: 'Heal',
            type: 'heal',
            value: 20,
            cooldown: 5,
            currentCooldown: 0,
            chance: 0.3,
            icon: '💚',
            description: 'Heals self',
          },
        ],
        intent: null,
        statusEffects: [],
        isShielded: false,
        shieldTurnsRemaining: 0,
        isEnraged: false,
        enrageTurnsRemaining: 0,
        basePower: 15,
        isDying: false,
      };

      const clonedEnemy = deepCloneEnemy(originalEnemy);

      // Modify clone's abilities
      clonedEnemy.abilities[0].currentCooldown = 999;
      clonedEnemy.abilities[1].value = 888;
      clonedEnemy.abilities.push({
        id: 'new-ability',
        name: 'New',
        type: 'stun',
        value: 1,
        cooldown: 3,
        currentCooldown: 0,
        chance: 0.2,
        icon: '💫',
        description: 'Stuns',
      });

      // Verify original is unchanged
      expect(originalEnemy.abilities).toHaveLength(2);
      expect(originalEnemy.abilities[0].currentCooldown).toBe(2);
      expect(originalEnemy.abilities[1].value).toBe(20);

      // Verify arrays are not the same reference
      expect(clonedEnemy.abilities).not.toBe(originalEnemy.abilities);
      expect(clonedEnemy.abilities[0]).not.toBe(originalEnemy.abilities[0]);
    });

    it('should create independent copies of intent object', () => {
      const originalEnemy: Enemy = {
        id: 'enemy-1',
        name: 'Enemy',
        health: 50,
        maxHealth: 50,
        power: 10,
        armor: 5,
        speed: 8,
        experienceReward: 100,
        goldReward: 50,
        isBoss: false,
        abilities: [],
        intent: {
          type: 'ability',
          damage: 15,
          ability: {
            id: 'special',
            name: 'Special Attack',
            type: 'multi_hit',
            value: 2,
            cooldown: 3,
            currentCooldown: 0,
            chance: 1,
            icon: '💥',
            description: 'Special attack',
          },
          icon: '💥',
        },
        statusEffects: [],
        isShielded: false,
        shieldTurnsRemaining: 0,
        isEnraged: false,
        enrageTurnsRemaining: 0,
        basePower: 10,
        isDying: false,
      };

      const clonedEnemy = deepCloneEnemy(originalEnemy);

      // Modify clone's intent
      if (clonedEnemy.intent) {
        clonedEnemy.intent.damage = 999;
        if (clonedEnemy.intent.ability) {
          clonedEnemy.intent.ability.value = 888;
        }
      }

      // Verify original is unchanged
      expect(originalEnemy.intent?.damage).toBe(15);
      expect(originalEnemy.intent?.ability?.value).toBe(2);

      // Verify objects are not the same reference
      expect(clonedEnemy.intent).not.toBe(originalEnemy.intent);
      expect(clonedEnemy.intent?.ability).not.toBe(originalEnemy.intent?.ability);
    });

    it('should handle null intent correctly', () => {
      const originalEnemy: Enemy = {
        id: 'enemy-1',
        name: 'Enemy',
        health: 50,
        maxHealth: 50,
        power: 10,
        armor: 5,
        speed: 8,
        experienceReward: 100,
        goldReward: 50,
        isBoss: false,
        abilities: [],
        intent: null,
        statusEffects: [],
        isShielded: false,
        shieldTurnsRemaining: 0,
        isEnraged: false,
        enrageTurnsRemaining: 0,
        basePower: 10,
        isDying: false,
      };

      const clonedEnemy = deepCloneEnemy(originalEnemy);

      // Verify intent is null in both
      expect(originalEnemy.intent).toBeNull();
      expect(clonedEnemy.intent).toBeNull();

      // Modify clone's intent
      clonedEnemy.intent = {
        type: 'attack',
        damage: 15,
        icon: '⚔️',
      };

      // Verify original is still null
      expect(originalEnemy.intent).toBeNull();
    });

    it('should create independent copies of statusEffects array', () => {
      const originalEnemy: Enemy = {
        id: 'enemy-1',
        name: 'Enemy',
        health: 50,
        maxHealth: 50,
        power: 10,
        armor: 5,
        speed: 8,
        experienceReward: 100,
        goldReward: 50,
        isBoss: false,
        abilities: [],
        intent: null,
        statusEffects: [
          { id: 'poison-1', type: 'poison', damage: 5, remainingTurns: 3, icon: '☠️' },
          { id: 'slow-1', type: 'slow', damage: 0, remainingTurns: 2, icon: '🐌' },
        ],
        isShielded: false,
        shieldTurnsRemaining: 0,
        isEnraged: false,
        enrageTurnsRemaining: 0,
        basePower: 10,
        isDying: false,
      };

      const clonedEnemy = deepCloneEnemy(originalEnemy);

      // Modify clone's status effects
      clonedEnemy.statusEffects[0].remainingTurns = 999;
      clonedEnemy.statusEffects.push({
        id: 'bleed-1', type: 'bleed', damage: 10, remainingTurns: 5, icon: '🩸',
      });

      // Verify original is unchanged
      expect(originalEnemy.statusEffects).toHaveLength(2);
      expect(originalEnemy.statusEffects[0].remainingTurns).toBe(3);
      expect(clonedEnemy.statusEffects).toHaveLength(3);

      // Verify arrays are not the same reference
      expect(clonedEnemy.statusEffects).not.toBe(originalEnemy.statusEffects);
      expect(clonedEnemy.statusEffects[0]).not.toBe(originalEnemy.statusEffects[0]);
    });

    it('should create independent copies with all optional fields', () => {
      const originalEnemy: Enemy = {
        id: 'shielded-enemy',
        name: 'Shielded Enemy',
        health: 60,
        maxHealth: 60,
        power: 12,
        armor: 8,
        speed: 9,
        experienceReward: 150,
        goldReward: 75,
        isBoss: false,
        abilities: [],
        intent: null,
        statusEffects: [],
        isShielded: true,
        shieldTurnsRemaining: 3,
        isEnraged: true,
        enrageTurnsRemaining: 2,
        basePower: 10,
        isDying: false,
      };

      const clonedEnemy = deepCloneEnemy(originalEnemy);

      // Modify clone's optional fields
      clonedEnemy.isShielded = false;
      clonedEnemy.shieldTurnsRemaining = 0;
      clonedEnemy.isEnraged = false;
      clonedEnemy.enrageTurnsRemaining = 0;

      // Verify original is unchanged
      expect(originalEnemy.isShielded).toBe(true);
      expect(originalEnemy.shieldTurnsRemaining).toBe(3);
      expect(originalEnemy.isEnraged).toBe(true);
      expect(originalEnemy.enrageTurnsRemaining).toBe(2);
    });

    it('should handle modifying clone without affecting original', () => {
      const originalEnemy: Enemy = {
        id: 'test-enemy',
        name: 'Test Enemy',
        health: 40,
        maxHealth: 40,
        power: 8,
        armor: 4,
        speed: 10,
        experienceReward: 75,
        goldReward: 40,
        isBoss: false,
        abilities: [],
        intent: null,
        statusEffects: [],
        isShielded: false,
        shieldTurnsRemaining: 0,
        isEnraged: false,
        enrageTurnsRemaining: 0,
        basePower: 8,
        isDying: false,
      };

      const clonedEnemy = deepCloneEnemy(originalEnemy);

      // Heavily modify the clone
      clonedEnemy.health = 1;
      clonedEnemy.power = 999;
      clonedEnemy.isBoss = true;
      clonedEnemy.isDying = true;

      // Verify original is completely unchanged
      expect(originalEnemy.health).toBe(40);
      expect(originalEnemy.power).toBe(8);
      expect(originalEnemy.isBoss).toBe(false);
      expect(originalEnemy.isDying).toBe(false);
    });
  });
});
