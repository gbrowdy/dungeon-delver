import { describe, it, expect } from 'vitest';
import { deepClonePlayer, deepCloneEnemy } from '../cloneUtils';
import type { Player, Enemy, StatusEffect, ActiveBuff, Power, Item, EnemyAbility, EnemyIntent } from '@/types/game';

describe('cloneUtils', () => {
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
          fortune: 5,
        },
        currentStats: {
          health: 45,
          maxHealth: 50,
          power: 10,
          armor: 5,
          speed: 8,
          fortune: 5,
        },
        powers: [
          {
            id: 'fireball',
            name: 'Fireball',
            description: 'Deals fire damage',
            resourceCost: 15,
            cooldown: 3,
            effect: 'damage',
            value: 25,
            icon: 'power-fireball',
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
            icon: 'item-sword',
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
            icon: 'buff-power',
          },
        ],
        statusEffects: [
          {
            id: 'poison-1',
            type: 'poison',
            damage: 5,
            remainingTurns: 2,
            icon: 'status-poison',
          },
        ],
        isBlocking: false,
        comboCount: 0,
        lastPowerUsed: null,
        // upgradePurchases removed - old upgrade system deprecated
        isDying: false,
        // New path ability fields
        abilityCounters: {},
        attackModifiers: [],
        hpRegen: 0,
        path: null,
        pendingAbilityChoice: false,
        shield: 0,
        shieldMaxDuration: 0,
        shieldRemainingDuration: 0,
        usedCombatAbilities: [],
        usedFloorAbilities: [],
        enemyAttackCounter: 0,
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
          fortune: 5,
        },
        currentStats: {
          health: 50,
          maxHealth: 50,
          power: 10,
          armor: 5,
          speed: 8,
          fortune: 5,
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
        // New path ability fields
        abilityCounters: {},
        attackModifiers: [],
        hpRegen: 0,
        path: null,
        pendingAbilityChoice: false,
        shield: 0,
        shieldMaxDuration: 0,
        shieldRemainingDuration: 0,
        usedCombatAbilities: [],
        usedFloorAbilities: [],
        enemyAttackCounter: 0,
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
          fortune: 5,
              
        },
        currentStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 8,
          fortune: 5,
              
        },
        powers: [],
        inventory: [],
        equippedItems: [],
        activeBuffs: [],
        statusEffects: [
          { id: 'poison-1', type: 'poison', damage: 5, remainingTurns: 3, icon: 'status-poison' },
          { id: 'stun-1', type: 'stun', damage: 0, remainingTurns: 1, icon: 'status-stun' },
        ],
        isBlocking: false,
        comboCount: 0,
        lastPowerUsed: null,
        // upgradePurchases removed
        isDying: false,
        // New path ability fields
        abilityCounters: {},
        attackModifiers: [],
        hpRegen: 0,
        path: null,
        pendingAbilityChoice: false,
        shield: 0,
        shieldMaxDuration: 0,
        shieldRemainingDuration: 0,
        usedCombatAbilities: [],
        usedFloorAbilities: [],
        enemyAttackCounter: 0,
      };

      const clonedPlayer = deepClonePlayer(originalPlayer);

      // Modify clone's status effects
      clonedPlayer.statusEffects[0].remainingTurns = 999;
      clonedPlayer.statusEffects.push({
        id: 'bleed-1', type: 'bleed', damage: 10, remainingTurns: 5, icon: 'status-bleed',
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
          fortune: 5,
              
        },
        currentStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 8,
          fortune: 5,
              
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
            icon: 'item-sword',
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
        // New path ability fields
        abilityCounters: {},
        attackModifiers: [],
        hpRegen: 0,
        path: null,
        pendingAbilityChoice: false,
        shield: 0,
        shieldMaxDuration: 0,
        shieldRemainingDuration: 0,
        usedCombatAbilities: [],
        usedFloorAbilities: [],
        enemyAttackCounter: 0,
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
          fortune: 5,
              
        },
        currentStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 8,
          fortune: 5,
              
        },
        powers: [],
        inventory: [],
        equippedItems: [],
        activeBuffs: [
          { id: 'buff-1', name: 'Strength', stat: 'power', multiplier: 1.5, remainingTurns: 3, icon: 'buff-power' },
          { id: 'buff-2', name: 'Speed', stat: 'speed', multiplier: 1.2, remainingTurns: 2, icon: 'buff-speed' },
        ],
        statusEffects: [],
        isBlocking: false,
        comboCount: 0,
        lastPowerUsed: null,
        // upgradePurchases removed
        isDying: false,
        // New path ability fields
        abilityCounters: {},
        attackModifiers: [],
        hpRegen: 0,
        path: null,
        pendingAbilityChoice: false,
        shield: 0,
        shieldMaxDuration: 0,
        shieldRemainingDuration: 0,
        usedCombatAbilities: [],
        usedFloorAbilities: [],
        enemyAttackCounter: 0,
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
          fortune: 5,
              
        },
        currentStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 8,
          fortune: 5,
              
        },
        powers: [
          {
            id: 'fireball',
            name: 'Fireball',
            description: 'Deals fire damage',
            resourceCost: 15,
            cooldown: 3,
            effect: 'damage',
            value: 25,
            icon: 'power-fireball',
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
        // New path ability fields
        abilityCounters: {},
        attackModifiers: [],
        hpRegen: 0,
        path: null,
        pendingAbilityChoice: false,
        shield: 0,
        shieldMaxDuration: 0,
        shieldRemainingDuration: 0,
        usedCombatAbilities: [],
        usedFloorAbilities: [],
        enemyAttackCounter: 0,
      };

      const clonedPlayer = deepClonePlayer(originalPlayer);

      // Modify clone's powers
      clonedPlayer.powers[0].upgradeLevel = 3;
      clonedPlayer.powers[0].value = 50;

      // Verify original is unchanged
      expect(originalPlayer.powers[0].upgradeLevel).toBe(2);
      expect(originalPlayer.powers[0].value).toBe(25);

      // Verify arrays are not the same reference
      expect(clonedPlayer.powers).not.toBe(originalPlayer.powers);
      expect(clonedPlayer.powers[0]).not.toBe(originalPlayer.powers[0]);
    });

    // DEPRECATED: Test removed - upgradePurchases system deprecated
    // it('should create independent copies of upgradePurchases object', () => {
    //   ... test code removed ...
    // });

    it('should create independent copies of path ability fields (abilityCounters, attackModifiers, hpRegen)', () => {
      const originalPlayer: Player = {
        name: 'TestHero',
        class: 'rogue',
        level: 5,
        experience: 500,
        experienceToNext: 750,
        gold: 100,
        baseStats: {
          health: 50, maxHealth: 50, power: 10, armor: 5, speed: 15,
          fortune: 5,
        },
        currentStats: {
          health: 45, maxHealth: 50, power: 10, armor: 5, speed: 15,
          fortune: 5,
        },
        powers: [],
        inventory: [],
        equippedItems: [],
        activeBuffs: [],
        statusEffects: [],
        isBlocking: false,
        comboCount: 0,
        lastPowerUsed: null,
        isDying: false,
        // Path ability fields with populated data
        abilityCounters: {
          blur_consecutive_dodges: 3,
          perfect_form_momentum: 5,
        },
        attackModifiers: [
          { id: 'mod-1', effect: 'guaranteed_crit', remainingAttacks: 1, sourceName: 'Shadow Strike' },
          { id: 'mod-2', effect: 'bonus_damage', value: 25, remainingAttacks: 2, sourceName: 'Power Buff' },
          { id: 'mod-3', effect: 'lifesteal', value: 0.3, remainingAttacks: 1, sourceName: 'Vampiric Touch' },
        ],
        hpRegen: 2.5,
        path: null,
        pendingAbilityChoice: false,
        shield: 15,
        shieldMaxDuration: 5000,
        shieldRemainingDuration: 3000,
        usedCombatAbilities: ['shadow_step', 'blur'],
        usedFloorAbilities: ['immortal_guardian'],
        enemyAttackCounter: 7,
      };

      const clonedPlayer = deepClonePlayer(originalPlayer);

      // Verify initial equality
      expect(clonedPlayer).toEqual(originalPlayer);
      expect(clonedPlayer).not.toBe(originalPlayer);

      // Modify clone's abilityCounters
      clonedPlayer.abilityCounters.blur_consecutive_dodges = 999;
      clonedPlayer.abilityCounters.new_counter = 10;

      // Verify original abilityCounters unchanged
      expect(originalPlayer.abilityCounters.blur_consecutive_dodges).toBe(3);
      expect(originalPlayer.abilityCounters).not.toHaveProperty('new_counter');
      expect(clonedPlayer.abilityCounters).not.toBe(originalPlayer.abilityCounters);

      // Modify clone's attackModifiers
      clonedPlayer.attackModifiers![0]!.remainingAttacks = 999;
      clonedPlayer.attackModifiers!.push({
        id: 'mod-new',
        effect: 'guaranteed_crit',
        remainingAttacks: 5,
        sourceName: 'New Buff',
      });

      // Verify original attackModifiers unchanged
      expect(originalPlayer.attackModifiers).toHaveLength(3);
      expect(originalPlayer.attackModifiers![0]!.remainingAttacks).toBe(1);
      expect(clonedPlayer.attackModifiers).not.toBe(originalPlayer.attackModifiers);
      expect(clonedPlayer.attackModifiers![0]).not.toBe(originalPlayer.attackModifiers![0]);

      // Modify clone's hpRegen
      clonedPlayer.hpRegen = 100;
      expect(originalPlayer.hpRegen).toBe(2.5);

      // Modify clone's shield fields
      clonedPlayer.shield = 0;
      clonedPlayer.shieldRemainingDuration = 0;
      expect(originalPlayer.shield).toBe(15);
      expect(originalPlayer.shieldRemainingDuration).toBe(3000);

      // Modify clone's ability tracking arrays
      clonedPlayer.usedCombatAbilities.push('new_ability');
      clonedPlayer.usedFloorAbilities.push('another_ability');
      expect(originalPlayer.usedCombatAbilities).toHaveLength(2);
      expect(originalPlayer.usedFloorAbilities).toHaveLength(1);
      expect(clonedPlayer.usedCombatAbilities).not.toBe(originalPlayer.usedCombatAbilities);
      expect(clonedPlayer.usedFloorAbilities).not.toBe(originalPlayer.usedFloorAbilities);

      // Modify clone's enemyAttackCounter
      clonedPlayer.enemyAttackCounter = 999;
      expect(originalPlayer.enemyAttackCounter).toBe(7);
    });
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
            icon: 'ability-multi_hit',
            description: 'Attacks twice',
          },
        ],
        intent: {
          type: 'attack',
          damage: 8,
          icon: 'ability-attack',
        },
        statusEffects: [
          {
            id: 'poison-1',
            type: 'poison',
            damage: 3,
            remainingTurns: 2,
            icon: 'status-poison',
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
            icon: 'ability-poison',
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
            icon: 'ability-heal',
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
        icon: 'ability-stun',
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
            icon: 'ability-special',
            description: 'Special attack',
          },
          icon: 'ability-special',
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
        icon: 'ability-attack',
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
          { id: 'poison-1', type: 'poison', damage: 5, remainingTurns: 3, icon: 'status-poison' },
          { id: 'slow-1', type: 'slow', damage: 0, remainingTurns: 2, icon: 'status-slow' },
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
        id: 'bleed-1', type: 'bleed', damage: 10, remainingTurns: 5, icon: 'status-bleed',
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
