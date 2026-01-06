// src/ecs/systems/__tests__/input-path.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world, clearWorld } from '../../world';
import { createGameStateEntity, createPlayerEntity } from '../../factories';
import { dispatch, Commands, commandQueue } from '../../commands';
import { InputSystem } from '../input';
import { getPlayer } from '../../queries';

describe('InputSystem - Path Selection', () => {
  beforeEach(() => {
    clearWorld();
    commandQueue.length = 0;
    world.add(createGameStateEntity());
  });

  it('should remove mana component when selecting active path', () => {
    // Create player with mana
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    world.add(player);

    // Verify player has mana before path selection
    expect(player.mana).toBeDefined();
    expect(player.mana?.current).toBeGreaterThan(0);

    // Select Berserker (active path)
    dispatch(Commands.selectPath('berserker'));
    InputSystem(16);

    const playerAfterPath = getPlayer();

    // Mana should be removed
    expect(playerAfterPath?.mana).toBeUndefined();

    // pathResource should be added (fury for berserker)
    expect(playerAfterPath?.pathResource).toBeDefined();
    expect(playerAfterPath?.pathResource?.type).toBe('fury');
  });

  it('should remove mana when selecting passive path', () => {
    // Create player with mana
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    world.add(player);

    // Verify player has mana before path selection
    expect(player.mana).toBeDefined();

    // Select Guardian (passive path)
    dispatch(Commands.selectPath('guardian'));
    InputSystem(16);

    const playerAfterPath = getPlayer();

    // Mana should be removed
    expect(playerAfterPath?.mana).toBeUndefined();

    // pathResource should NOT be added (passive paths have no resource)
    expect(playerAfterPath?.pathResource).toBeUndefined();

    // stanceState should be added
    expect(playerAfterPath?.stanceState).toBeDefined();
    expect(playerAfterPath?.stanceState?.activeStanceId).toBe('iron_stance');
  });

  it('should clear powers when selecting passive path', () => {
    // Create player with powers
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    world.add(player);

    // Verify player has powers before path selection
    expect(player.powers).toBeDefined();
    expect(player.powers?.length).toBeGreaterThan(0);

    // Select Enchanter (passive mage path)
    dispatch(Commands.selectPath('enchanter'));
    InputSystem(16);

    const playerAfterPath = getPlayer();

    // Powers should be cleared (passive paths use stances, not powers)
    expect(playerAfterPath?.powers).toEqual([]);

    // Mana should be removed
    expect(playerAfterPath?.mana).toBeUndefined();

    // stanceState should be added
    expect(playerAfterPath?.stanceState).toBeDefined();
  });

  it('should NOT clear powers when selecting active path', () => {
    // Create player with powers
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    world.add(player);

    const initialPowersLength = player.powers?.length || 0;
    expect(initialPowersLength).toBeGreaterThan(0);

    // Select Archmage (active mage path)
    dispatch(Commands.selectPath('archmage'));
    InputSystem(16);

    const playerAfterPath = getPlayer();

    // Powers should remain (active paths use powers)
    expect(playerAfterPath?.powers).toBeDefined();
    expect(playerAfterPath?.powers?.length).toBe(initialPowersLength);

    // Mana should be removed
    expect(playerAfterPath?.mana).toBeUndefined();

    // pathResource should be added (arcane_charges for archmage)
    expect(playerAfterPath?.pathResource).toBeDefined();
    expect(playerAfterPath?.pathResource?.type).toBe('arcane_charges');
  });

  it('should handle path selection for all active paths', () => {
    const activePaths = [
      { pathId: 'berserker', class: 'warrior', resourceType: 'fury' },
      { pathId: 'archmage', class: 'mage', resourceType: 'arcane_charges' },
      { pathId: 'assassin', class: 'rogue', resourceType: 'momentum' },
      { pathId: 'paladin_crusader', class: 'paladin', resourceType: 'zeal' },
    ] as const;

    for (const { pathId, class: characterClass, resourceType } of activePaths) {
      // Clear and recreate for each test
      clearWorld();
      commandQueue.length = 0;
      world.add(createGameStateEntity());

      const player = createPlayerEntity({ name: 'Hero', characterClass });
      world.add(player);

      expect(player.mana).toBeDefined();

      dispatch(Commands.selectPath(pathId));
      InputSystem(16);

      const playerAfterPath = getPlayer();

      // Mana should be removed for all paths
      expect(playerAfterPath?.mana).toBeUndefined();

      // pathResource should be added with correct type
      expect(playerAfterPath?.pathResource).toBeDefined();
      expect(playerAfterPath?.pathResource?.type).toBe(resourceType);
    }
  });

  it('should handle path selection for all passive paths', () => {
    const passivePaths = [
      { pathId: 'guardian', class: 'warrior', firstStance: 'iron_stance' },
      { pathId: 'enchanter', class: 'mage', firstStance: 'arcane_surge' },
      { pathId: 'duelist', class: 'rogue', firstStance: 'evasion_stance' },
      { pathId: 'paladin_protector', class: 'paladin', firstStance: 'healing_stance' },
    ] as const;

    for (const { pathId, class: characterClass, firstStance } of passivePaths) {
      // Clear and recreate for each test
      clearWorld();
      commandQueue.length = 0;
      world.add(createGameStateEntity());

      const player = createPlayerEntity({ name: 'Hero', characterClass });
      world.add(player);

      expect(player.mana).toBeDefined();

      dispatch(Commands.selectPath(pathId));
      InputSystem(16);

      const playerAfterPath = getPlayer();

      // Mana should be removed for all paths
      expect(playerAfterPath?.mana).toBeUndefined();

      // Powers should be cleared
      expect(playerAfterPath?.powers).toEqual([]);

      // pathResource should NOT be added
      expect(playerAfterPath?.pathResource).toBeUndefined();

      // stanceState should be added
      expect(playerAfterPath?.stanceState).toBeDefined();
      expect(playerAfterPath?.stanceState?.activeStanceId).toBe(firstStance);
    }
  });

  it('should initialize pathProgression for active paths', () => {
    // Create player with mana
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    world.add(player);

    // Select Berserker (active path)
    dispatch(Commands.selectPath('berserker'));
    InputSystem(16);

    const playerAfterPath = getPlayer();

    // pathProgression should be initialized for active path
    expect(playerAfterPath?.pathProgression).toBeDefined();
    expect(playerAfterPath?.pathProgression?.pathId).toBe('berserker');
    expect(playerAfterPath?.pathProgression?.pathType).toBe('active');
    expect(playerAfterPath?.pathProgression?.powerUpgrades).toEqual([]);
    expect(playerAfterPath?.pathProgression?.stanceProgression).toBeUndefined();
  });

  it('should initialize pathProgression for passive paths', () => {
    // Create player with mana
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    world.add(player);

    // Select Guardian (passive path)
    dispatch(Commands.selectPath('guardian'));
    InputSystem(16);

    const playerAfterPath = getPlayer();

    // pathProgression should be initialized for passive path
    expect(playerAfterPath?.pathProgression).toBeDefined();
    expect(playerAfterPath?.pathProgression?.pathId).toBe('guardian');
    expect(playerAfterPath?.pathProgression?.pathType).toBe('passive');
    expect(playerAfterPath?.pathProgression?.powerUpgrades).toBeUndefined();
    expect(playerAfterPath?.pathProgression?.stanceProgression).toBeDefined();
    expect(playerAfterPath?.pathProgression?.stanceProgression?.ironTier).toBe(0);
    expect(playerAfterPath?.pathProgression?.stanceProgression?.retributionTier).toBe(0);
    expect(playerAfterPath?.pathProgression?.stanceProgression?.acquiredEnhancements).toEqual([]);
  });

  describe('Power Activation with pathResource', () => {
    it('should allow power activation with sufficient pathResource (spend-type)', () => {
      const gameState = createGameStateEntity();
      gameState.phase = 'combat';
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };
      world.add(gameState);

      const player: Entity = {
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        powers: [{
          id: 'strike',
          name: 'Strike',
          description: '',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.5,
          icon: '',
        }],
        pathResource: {
          type: 'fury',
          current: 50,
          max: 100,
          color: '#dc2626',
          resourceBehavior: 'spend',
          generation: { onHit: 8 },
        },
        cooldowns: new Map(),
      };
      world.add(player);

      dispatch(Commands.activatePower('strike'));
      InputSystem(16);

      // Should set casting component
      expect(player.casting).toBeDefined();
      expect(player.casting?.powerId).toBe('strike');
    });

    it('should reject power activation with insufficient pathResource (spend-type)', () => {
      const gameState = createGameStateEntity();
      gameState.phase = 'combat';
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };
      world.add(gameState);

      const player: Entity = {
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        powers: [{
          id: 'strike',
          name: 'Strike',
          description: '',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.5,
          icon: '',
        }],
        pathResource: {
          type: 'fury',
          current: 20, // Not enough
          max: 100,
          color: '#dc2626',
          resourceBehavior: 'spend',
          generation: { onHit: 8 },
        },
        cooldowns: new Map(),
      };
      world.add(player);

      dispatch(Commands.activatePower('strike'));
      InputSystem(16);

      // Should NOT set casting component
      expect(player.casting).toBeUndefined();
    });

    it('should allow power activation with gain-type resource below max', () => {
      const gameState = createGameStateEntity();
      gameState.phase = 'combat';
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };
      world.add(gameState);

      const player: Entity = {
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        powers: [{
          id: 'arcane_bolt',
          name: 'Arcane Bolt',
          description: '',
          manaCost: 1,
          resourceCost: 1,
          cooldown: 0,
          effect: 'damage',
          value: 1.2,
          icon: '',
        }],
        pathResource: {
          type: 'arcane_charges',
          current: 2,
          max: 5,
          color: '#3b82f6',
          resourceBehavior: 'gain',
          generation: {},
        },
        cooldowns: new Map(),
      };
      world.add(player);

      dispatch(Commands.activatePower('arcane_bolt'));
      InputSystem(16);

      // Should set casting component (2 + 1 = 3, which is <= 5)
      expect(player.casting).toBeDefined();
      expect(player.casting?.powerId).toBe('arcane_bolt');
    });

    it('should reject power activation with gain-type resource at max', () => {
      const gameState = createGameStateEntity();
      gameState.phase = 'combat';
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };
      world.add(gameState);

      const player: Entity = {
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        powers: [{
          id: 'arcane_bolt',
          name: 'Arcane Bolt',
          description: '',
          manaCost: 1,
          resourceCost: 1,
          cooldown: 0,
          effect: 'damage',
          value: 1.2,
          icon: '',
        }],
        pathResource: {
          type: 'arcane_charges',
          current: 5,
          max: 5,
          color: '#3b82f6',
          resourceBehavior: 'gain',
          generation: {},
        },
        cooldowns: new Map(),
      };
      world.add(player);

      dispatch(Commands.activatePower('arcane_bolt'));
      InputSystem(16);

      // Should NOT set casting component (5 + 1 = 6, which is > 5)
      expect(player.casting).toBeUndefined();
    });

    it('should respect cooldown even with sufficient pathResource', () => {
      const gameState = createGameStateEntity();
      gameState.phase = 'combat';
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };
      world.add(gameState);

      const player: Entity = {
        player: true,
        identity: { name: 'Hero' },
        health: { current: 100, max: 100 },
        powers: [{
          id: 'strike',
          name: 'Strike',
          description: '',
          manaCost: 20,
          resourceCost: 30,
          cooldown: 5,
          effect: 'damage',
          value: 1.5,
          icon: '',
        }],
        pathResource: {
          type: 'fury',
          current: 50,
          max: 100,
          color: '#dc2626',
          resourceBehavior: 'spend',
          generation: { onHit: 8 },
        },
        cooldowns: new Map([['strike', { remaining: 3, base: 5 }]]),
      };
      world.add(player);

      dispatch(Commands.activatePower('strike'));
      InputSystem(16);

      // Should NOT set casting component (on cooldown)
      expect(player.casting).toBeUndefined();
    });
  });
});
