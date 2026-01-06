import { describe, it, expect } from 'vitest';
import {
  createPlayerEntity,
  createEnemyEntity,
  createGameStateEntity,
  calculateAttackInterval,
} from '../index';
import { CLASS_DATA } from '@/data/classes';
import { FLOOR_CONFIG } from '@/constants/game';
import { COMBAT_BALANCE } from '@/constants/balance';

describe('calculateAttackInterval', () => {
  it('should return base interval at base speed', () => {
    const baseSpeed = COMBAT_BALANCE.BASE_SPEED; // 10
    const baseInterval = 2500;
    const result = calculateAttackInterval(baseSpeed, baseInterval);
    expect(result).toBe(2500);
  });

  it('should halve interval at double speed', () => {
    const result = calculateAttackInterval(20, 2500);
    expect(result).toBe(1250);
  });

  it('should double interval at half speed', () => {
    const result = calculateAttackInterval(5, 2500);
    expect(result).toBe(5000);
  });

  it('should use default base interval when not specified', () => {
    const result = calculateAttackInterval(10);
    expect(result).toBe(2500);
  });

  it('should handle non-standard speeds correctly', () => {
    // Speed 14 (rogue base): 2500 * (10/14) = ~1785
    const result = calculateAttackInterval(14, 2500);
    expect(result).toBe(Math.floor(2500 * (10 / 14)));
  });
});

describe('createPlayerEntity', () => {
  it('should create a valid player entity with all required components', () => {
    const player = createPlayerEntity({
      name: 'Test Hero',
      characterClass: 'warrior',
    });

    // Check identity tag
    expect(player.player).toBe(true);

    // Check identity component
    expect(player.identity).toEqual({
      name: 'Test Hero',
      class: 'warrior',
    });

    // Check combat stats exist
    expect(player.health).toBeDefined();
    expect(player.mana).toBeDefined();
    expect(player.attack).toBeDefined();
    expect(player.defense).toBeDefined();
    expect(player.speed).toBeDefined();

    // Check progression
    expect(player.progression).toEqual({
      level: 1,
      xp: 0,
      xpToNext: FLOOR_CONFIG.STARTING_EXP_TO_LEVEL,
    });

    // Check powers
    expect(player.powers).toHaveLength(1);
    expect(player.powers![0].id).toBe('basic-strike');

    // Check equipment slots
    expect(player.equipment).toEqual({
      weapon: null,
      armor: null,
      accessory: null,
    });

    // Check inventory
    expect(player.inventory).toEqual({
      gold: FLOOR_CONFIG.STARTING_GOLD,
      items: [],
    });

    // Check status arrays
    expect(player.statusEffects).toEqual([]);
    expect(player.buffs).toEqual([]);

    // Check cooldowns map
    expect(player.cooldowns).toBeInstanceOf(Map);
    expect(player.cooldowns!.size).toBe(0);

    // Check regen
    expect(player.regen).toBeDefined();

    // Check combo
    expect(player.combo).toEqual({
      count: 0,
      lastPowerUsed: null,
    });

    // Check ability tracking
    expect(player.abilityTracking).toEqual({
      usedCombatAbilities: [],
      usedFloorAbilities: [],
      enemyAttackCounter: 0,
      abilityCounters: {},
    });
  });

  it('should use correct class stats for warrior', () => {
    const player = createPlayerEntity({
      name: 'Warrior Test',
      characterClass: 'warrior',
    });

    const warriorStats = CLASS_DATA.warrior.baseStats;

    expect(player.health).toEqual({
      current: warriorStats.maxHealth,
      max: warriorStats.maxHealth,
    });

    expect(player.mana).toEqual({
      current: warriorStats.maxMana,
      max: warriorStats.maxMana,
    });

    expect(player.attack!.baseDamage).toBe(warriorStats.power);
    expect(player.defense!.value).toBe(warriorStats.armor);
    expect(player.speed!.value).toBe(warriorStats.speed);
  });

  it('should use correct class stats for mage', () => {
    const player = createPlayerEntity({
      name: 'Mage Test',
      characterClass: 'mage',
    });

    const mageStats = CLASS_DATA.mage.baseStats;

    expect(player.health).toEqual({
      current: mageStats.maxHealth,
      max: mageStats.maxHealth,
    });

    expect(player.mana).toEqual({
      current: mageStats.maxMana,
      max: mageStats.maxMana,
    });

    expect(player.attack!.baseDamage).toBe(mageStats.power);
    expect(player.powers![0].id).toBe('basic-zap');
  });

  it('should use correct class stats for rogue', () => {
    const player = createPlayerEntity({
      name: 'Rogue Test',
      characterClass: 'rogue',
    });

    const rogueStats = CLASS_DATA.rogue.baseStats;

    expect(player.health).toEqual({
      current: rogueStats.maxHealth,
      max: rogueStats.maxHealth,
    });

    expect(player.speed!.value).toBe(rogueStats.speed);
    expect(player.powers![0].id).toBe('basic-slash');
  });

  it('should use correct class stats for paladin with HP regen', () => {
    const player = createPlayerEntity({
      name: 'Paladin Test',
      characterClass: 'paladin',
    });

    const paladinStats = CLASS_DATA.paladin.baseStats;
    const paladinHpRegen = CLASS_DATA.paladin.hpRegen;

    expect(player.health).toEqual({
      current: paladinStats.maxHealth,
      max: paladinStats.maxHealth,
    });

    expect(player.regen!.healthPerSecond).toBe(paladinHpRegen);
    expect(player.powers![0].id).toBe('basic-smite');
  });

  it('should calculate attack interval correctly from speed', () => {
    const player = createPlayerEntity({
      name: 'Speed Test',
      characterClass: 'rogue',
    });

    const rogueSpeed = CLASS_DATA.rogue.baseStats.speed; // 14
    const expectedInterval = calculateAttackInterval(rogueSpeed);

    expect(player.speed!.attackInterval).toBe(expectedInterval);
  });

  it('should calculate crit chance from fortune', () => {
    const player = createPlayerEntity({
      name: 'Fortune Test',
      characterClass: 'rogue',
    });

    const rogueFortune = CLASS_DATA.rogue.baseStats.fortune; // 10
    expect(player.attack!.critChance).toBe(rogueFortune / 100); // 0.10
  });
});

describe('createEnemyEntity', () => {
  it('should create a valid enemy entity with all required components', () => {
    const enemy = createEnemyEntity({
      floor: 1,
      room: 1,
    });

    // Check enemy tag exists
    expect(enemy.enemy).toBeDefined();
    expect(enemy.enemy!.name).toBeDefined();
    expect(enemy.enemy!.tier).toBeDefined();
    expect(enemy.enemy!.isBoss).toBeDefined();
    expect(enemy.enemy!.abilities).toBeInstanceOf(Array);

    // Check combat stats
    expect(enemy.health).toBeDefined();
    expect(enemy.health!.current).toBe(enemy.health!.max);
    expect(enemy.attack).toBeDefined();
    expect(enemy.defense).toBeDefined();
    expect(enemy.speed).toBeDefined();

    // Check status
    expect(enemy.statusEffects).toEqual([]);
    expect(enemy.statDebuffs).toEqual([]);

    // Check rewards
    expect(enemy.rewards).toBeDefined();
    expect(enemy.rewards!.xp).toBeGreaterThan(0);
    expect(enemy.rewards!.gold).toBeGreaterThan(0);

    // Check cooldowns
    expect(enemy.cooldowns).toBeInstanceOf(Map);
  });

  it('should create boss enemy on last room of floor', () => {
    const roomsPerFloor = FLOOR_CONFIG.ROOMS_PER_FLOOR[0]; // Floor 1 rooms
    const enemy = createEnemyEntity({
      floor: 1,
      room: roomsPerFloor,
      roomsPerFloor,
    });

    expect(enemy.enemy!.isBoss).toBe(true);
    expect(enemy.enemy!.tier).toBe('boss');
  });

  it('should scale enemy stats with floor', () => {
    const floor1Enemy = createEnemyEntity({
      floor: 1,
      room: 1,
    });

    const floor3Enemy = createEnemyEntity({
      floor: 3,
      room: 1,
    });

    // Higher floor should have higher stats
    expect(floor3Enemy.health!.max).toBeGreaterThan(floor1Enemy.health!.max);
    expect(floor3Enemy.attack!.baseDamage).toBeGreaterThan(floor1Enemy.attack!.baseDamage);
  });

  it('should scale enemy stats with room', () => {
    const room1Enemy = createEnemyEntity({
      floor: 1,
      room: 1,
    });

    const room3Enemy = createEnemyEntity({
      floor: 1,
      room: 3,
    });

    // Higher room should have higher stats
    expect(room3Enemy.health!.max).toBeGreaterThan(room1Enemy.health!.max);
  });

  it('should initialize cooldowns from abilities', () => {
    // Create enemy on later floor where abilities are more likely
    const enemy = createEnemyEntity({
      floor: 5,
      room: 5,
      roomsPerFloor: 5,
    });

    // Boss should have abilities
    if (enemy.enemy!.abilities.length > 0) {
      for (const ability of enemy.enemy!.abilities) {
        expect(enemy.cooldowns!.has(ability.id)).toBe(true);
        const cooldownData = enemy.cooldowns!.get(ability.id);
        expect(cooldownData).toBeDefined();
        expect(cooldownData!.base).toBe(ability.cooldown);
      }
    }
  });

  it('should calculate attack interval from enemy speed', () => {
    const enemy = createEnemyEntity({
      floor: 1,
      room: 1,
    });

    const expectedInterval = calculateAttackInterval(enemy.speed!.value);
    expect(enemy.speed!.attackInterval).toBe(expectedInterval);
  });

  it('should set enemy variance narrower than player', () => {
    const enemy = createEnemyEntity({
      floor: 1,
      room: 1,
    });

    // Enemy variance is 0.9-1.1 (narrower than player's 0.85-1.15)
    expect(enemy.attack!.variance).toEqual({ min: 0.9, max: 1.1 });
  });

  it('should set enemy crit stats lower than player', () => {
    const enemy = createEnemyEntity({
      floor: 1,
      room: 1,
    });

    // Enemy has lower crit chance and multiplier
    expect(enemy.attack!.critChance).toBe(0.05);
    expect(enemy.attack!.critMultiplier).toBe(1.5);
  });
});

describe('createGameStateEntity', () => {
  it('should create a valid game state entity with all required components', () => {
    const gameState = createGameStateEntity();

    // Check game state tag
    expect(gameState.gameState).toBe(true);

    // Check phase
    expect(gameState.phase).toBe('menu');

    // Check floor
    expect(gameState.floor).toEqual({
      number: 1,
      room: 0,
      totalRooms: FLOOR_CONFIG.ROOMS_PER_FLOOR[0],
      theme: undefined,
    });

    // Check combat settings
    expect(gameState.combatSpeed).toEqual({ multiplier: 1 });
    expect(gameState.paused).toBe(false);
    expect(gameState.isTransitioning).toBe(false);

    // Check animation/UI
    expect(gameState.animationEvents).toEqual([]);
    expect(gameState.combatLog).toEqual([]);
    expect(gameState.popups).toEqual({});
    expect(gameState.pendingLevelUp).toBeNull();

    // Check scheduled events
    expect(gameState.scheduledTransitions).toEqual([]);
    expect(gameState.scheduledSpawns).toEqual([]);
  });

  it('should accept custom initial phase', () => {
    const gameState = createGameStateEntity({ initialPhase: 'combat' });
    expect(gameState.phase).toBe('combat');
  });

  it('should accept class-select as initial phase', () => {
    const gameState = createGameStateEntity({ initialPhase: 'class-select' });
    expect(gameState.phase).toBe('class-select');
  });

  it('should accept all valid phases', () => {
    const phases = [
      'menu',
      'class-select',
      'path-select',
      'combat',
      'shop',
      'floor-complete',
      'victory',
      'defeat',
    ] as const;

    for (const phase of phases) {
      const gameState = createGameStateEntity({ initialPhase: phase });
      expect(gameState.phase).toBe(phase);
    }
  });

  it('should default to menu phase when no options provided', () => {
    const gameState = createGameStateEntity();
    expect(gameState.phase).toBe('menu');
  });

  it('should set combat speed multiplier to 1 (normal speed)', () => {
    const gameState = createGameStateEntity();
    expect(gameState.combatSpeed!.multiplier).toBe(1);
  });
});

describe('createPlayerEntity with dev mode overrides', () => {
  it('applies attack override', () => {
    const entity = createPlayerEntity({
      name: 'Hero',
      characterClass: 'warrior',
      devOverrides: { attackOverride: 50 },
    });
    expect(entity.attack?.baseDamage).toBe(50);
  });

  it('applies defense override', () => {
    const entity = createPlayerEntity({
      name: 'Hero',
      characterClass: 'warrior',
      devOverrides: { defenseOverride: 20 },
    });
    expect(entity.defense?.value).toBe(20);
  });

  it('applies gold override', () => {
    const entity = createPlayerEntity({
      name: 'Hero',
      characterClass: 'warrior',
      devOverrides: { goldOverride: 500 },
    });
    expect(entity.inventory?.gold).toBe(500);
  });

  it('does not apply overrides when not provided', () => {
    const entity = createPlayerEntity({
      name: 'Hero',
      characterClass: 'warrior',
    });
    // Should use class base stats (warrior has 9 attack)
    expect(entity.attack?.baseDamage).toBe(9);
  });
});

describe('createPlayerEntity with new starting system', () => {
  it('should start with stamina resource', () => {
    const player = createPlayerEntity({
      name: 'Test Hero',
      characterClass: 'warrior',
    });
    expect(player.pathResource?.type).toBe('stamina');
  });

  it('should start with generic Strike power for warrior', () => {
    const player = createPlayerEntity({
      name: 'Test Hero',
      characterClass: 'warrior',
    });
    expect(player.powers).toHaveLength(1);
    expect(player.powers?.[0]?.name).toBe('Strike');
  });

  it('should start with generic Zap power for mage', () => {
    const player = createPlayerEntity({
      name: 'Test Hero',
      characterClass: 'mage',
    });
    expect(player.powers?.[0]?.name).toBe('Zap');
  });

  it('should start with generic Slash power for rogue', () => {
    const player = createPlayerEntity({
      name: 'Test Hero',
      characterClass: 'rogue',
    });
    expect(player.powers?.[0]?.name).toBe('Slash');
  });

  it('should start with generic Smite power for paladin', () => {
    const player = createPlayerEntity({
      name: 'Test Hero',
      characterClass: 'paladin',
    });
    expect(player.powers?.[0]?.name).toBe('Smite');
  });
});
