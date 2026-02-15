// src/types/__tests__/game.test.ts
import { describe, it, expect } from 'vitest';
import type {
  CombatEntity,
  GameState,
  Item,
  StatusEffect,
  DraftCard,
  ShopCard,
  CombatEvent,
  DeathSummary,
  GamePhase,
  EnemyTier,
  EnemyModifier,
  ItemSlot,
  StatusEffectType,
} from '../game';

// Type-level tests: these verify that the types compile correctly
// and that we can construct valid instances of each interface.

describe('game types: structural validation', () => {
  it('CombatEntity has all required fields', () => {
    const entity: CombatEntity = {
      power: 10,
      fortitude: 8,
      speed: 10,
      luck: 5,
      basePower: 10,
      hp: 150,
      maxHp: 150,
      attackTimer: 2500,
      statusEffects: [],
    };
    expect(entity.power).toBe(10);
    expect(entity.statusEffects).toHaveLength(0);
  });

  it('StatusEffect represents all 5 types', () => {
    const types: StatusEffectType[] = ['poison', 'stun', 'curse', 'shield', 'regen'];
    expect(types).toHaveLength(5);

    const poisonEffect: StatusEffect = {
      type: 'poison',
      stacks: 3,
      remainingMs: 3000,
    };
    expect(poisonEffect.stacks).toBe(3);

    const stunEffect: StatusEffect = {
      type: 'stun',
      stacks: 1,
      remainingMs: 1000,
      immuneUntilMs: 5000,
    };
    expect(stunEffect.immuneUntilMs).toBe(5000);
  });

  it('Item has slot and tier', () => {
    const item: Item = {
      id: 'venomous_fang',
      slot: 'weapon',
      tier: 2,
    };
    expect(item.tier).toBe(2);
    expect(item.slot).toBe('weapon');
  });

  it('all 3 item slots exist', () => {
    const slots: ItemSlot[] = ['weapon', 'armor', 'accessory'];
    expect(slots).toHaveLength(3);
  });

  it('DraftCard has impact preview', () => {
    const card: DraftCard = {
      stat: 'power',
      value: 15,
      impactPreview: '+11% damage',
    };
    expect(card.impactPreview).toBeTruthy();
  });

  it('ShopCard supports both stat boosts and items', () => {
    const statCard: ShopCard = {
      type: 'stat_boost',
      stat: 'power',
      statValue: 20,
    };
    expect(statCard.type).toBe('stat_boost');

    const itemCard: ShopCard = {
      type: 'item',
      itemId: 'hex_blade',
    };
    expect(itemCard.type).toBe('item');
  });

  it('CombatEvent covers all event types', () => {
    const eventTypes: CombatEvent['type'][] = [
      'damage', 'crit', 'dot', 'reflect', 'heal', 'stun', 'curse', 'dodge', 'death',
    ];
    expect(eventTypes).toHaveLength(9);

    const event: CombatEvent = {
      type: 'damage',
      target: 'enemy',
      value: 34,
      tick: 100,
    };
    expect(event.target).toBe('enemy');
  });

  it('all 9 game phases exist', () => {
    const phases: GamePhase[] = [
      'menu', 'class-select', 'combat', 'draft', 'shop',
      'floor-complete', 'death', 'endless-intro', 'endless-defeat',
    ];
    expect(phases).toHaveLength(9);
  });

  it('all 4 enemy tiers exist', () => {
    const tiers: EnemyTier[] = ['common', 'uncommon', 'rare', 'boss'];
    expect(tiers).toHaveLength(4);
  });

  it('all 6 enemy modifiers exist', () => {
    const mods: EnemyModifier[] = [
      'swift', 'armored', 'berserker', 'regenerating', 'venomous', 'shielded',
    ];
    expect(mods).toHaveLength(6);
  });

  it('DeathSummary captures diagnostic info', () => {
    const summary: DeathSummary = {
      floor: 23,
      room: 3,
      enemyTier: 'rare',
      enemyModifiers: ['armored'],
      playerStats: { power: 148, fortitude: 107, speed: 16, luck: 12 },
      enemyStats: { power: 89, fortitude: 142, speed: 10 },
      playerDamagePerHit: 28,
      enemyDamagePerHit: 41,
      weaknessHint: 'Your Power was 42% below the enemy\'s Fortitude.',
    };
    expect(summary.weaknessHint).toContain('Power');
  });

  it('GameState can be fully constructed', () => {
    const state: GameState = {
      phase: 'menu',
      floor: 1,
      room: 1,
      roomsPerFloor: 2,
      paused: false,
      fightCount: 0,
      player: {
        power: 10, fortitude: 8, speed: 10, luck: 5,
        basePower: 10, hp: 150, maxHp: 150,
        attackTimer: 2500, statusEffects: [],
      },
      classId: 'warrior',
      equippedItems: { weapon: null, armor: null, accessory: null },
      enemy: null,
      enemyDefinition: null,
      combatElapsed: 0,
      combatEvents: [],
      speedMultiplier: 1,
      gameTick: 0,
      draftChoices: [],
      shopCards: [],
      selectedChoices: [],
      depth: 0,
      checkpoint: 0,
      lastDeathStats: null,
      renderVersion: 0,
    };
    expect(state.phase).toBe('menu');
    expect(state.equippedItems.weapon).toBeNull();
  });
});
