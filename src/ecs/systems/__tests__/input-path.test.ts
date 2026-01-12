// src/ecs/systems/__tests__/input-path.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world, clearWorld } from '../../world';
import { createGameStateEntity, createPlayerEntity } from '../../factories';
import { dispatch, Commands, commandQueue } from '../../commands';
import { InputSystem } from '../input';
import { getPlayer } from '../../queries';
import type { Entity, ComputedPassiveEffects } from '../../components';

/**
 * Create default computed passive effects (all zeroed/neutral).
 */
function createDefaultComputed(): ComputedPassiveEffects {
  return {
    armorPercent: 0,
    powerPercent: 0,
    speedPercent: 0,
    maxHealthPercent: 0,
    healthRegenFlat: 0,
    damageReductionPercent: 0,
    maxDamagePerHitPercent: null,
    armorReducesDot: false,
    baseReflectPercent: 0,
    reflectIgnoresArmor: false,
    reflectCanCrit: false,
    healOnReflectPercent: 0,
    healOnReflectKillPercent: 0,
    reflectScalingPerHit: 0,
    counterAttackChance: 0,
    damageStackConfig: null,
    healOnDamagedChance: 0,
    healOnDamagedPercent: 0,
    nextAttackBonusOnDamaged: 0,
    permanentPowerPerHit: 0,
    onHitBurstChance: 0,
    onHitBurstPowerPercent: 0,
    damageAuraPerSecond: 0,
    hasSurviveLethal: false,
    isImmuneToStuns: false,
    isImmuneToSlows: false,
    removeSpeedPenalty: false,
    lowHpArmorThreshold: 0,
    lowHpArmorBonus: 0,
    lowHpReflectThreshold: 0,
    lowHpReflectMultiplier: 1,
    highHpRegenThreshold: 100,
    highHpRegenMultiplier: 1,
    conditionalArmorPercent: 0,
    conditionalDamageReduction: 0,
    conditionalReflectMultiplier: 1,
    conditionalRegenMultiplier: 1,
  };
}

describe('InputSystem - Path Selection', () => {
  beforeEach(() => {
    clearWorld();
    commandQueue.length = 0;
    world.add(createGameStateEntity());
  });

  it('should replace stamina with path resource when selecting active path', () => {
    // Create player with stamina (pre-path resource)
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    world.add(player);

    // Verify player has stamina before path selection
    expect(player.pathResource).toBeDefined();
    expect(player.pathResource?.type).toBe('stamina');

    // Select Berserker (active path)
    dispatch(Commands.selectPath('berserker'));
    InputSystem(16);

    const playerAfterPath = getPlayer();

    // pathResource should be changed to fury (berserker resource)
    expect(playerAfterPath?.pathResource).toBeDefined();
    expect(playerAfterPath?.pathResource?.type).toBe('fury');
  });

  it('should remove pathResource when selecting passive path', () => {
    // Create player with stamina (pre-path resource)
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    world.add(player);

    // Verify player has stamina before path selection
    expect(player.pathResource).toBeDefined();
    expect(player.pathResource?.type).toBe('stamina');

    // Select Guardian (passive path)
    dispatch(Commands.selectPath('guardian'));
    InputSystem(16);

    const playerAfterPath = getPlayer();

    // pathResource should be removed (passive paths use stances, not resources)
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

    // pathResource should be removed (passive paths use stances)
    expect(playerAfterPath?.pathResource).toBeUndefined();

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

    // pathResource should be changed to arcane_charges (archmage resource)
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

      // Player should start with stamina
      expect(player.pathResource).toBeDefined();
      expect(player.pathResource?.type).toBe('stamina');

      dispatch(Commands.selectPath(pathId));
      InputSystem(16);

      const playerAfterPath = getPlayer();

      // pathResource should be replaced with correct type
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

      // Player should start with stamina
      expect(player.pathResource).toBeDefined();
      expect(player.pathResource?.type).toBe('stamina');

      dispatch(Commands.selectPath(pathId));
      InputSystem(16);

      const playerAfterPath = getPlayer();

      // Powers should be cleared
      expect(playerAfterPath?.powers).toEqual([]);

      // pathResource should be removed (passive paths use stances)
      expect(playerAfterPath?.pathResource).toBeUndefined();

      // stanceState should be added
      expect(playerAfterPath?.stanceState).toBeDefined();
      expect(playerAfterPath?.stanceState?.activeStanceId).toBe(firstStance);
    }
  });

  it('should initialize pathProgression for active paths', () => {
    // Create player with stamina
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
    // Create player with stamina
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

describe('Passive effect recomputation', () => {
  beforeEach(() => {
    clearWorld();
    commandQueue.length = 0;
  });

  it('should recompute effects when stance switches', () => {
    const gameState: Entity = { gameState: true, phase: 'combat', paused: false };
    world.add(gameState);

    const player: Entity = {
      player: true,
      identity: { name: 'Test', class: 'warrior' },
      health: { current: 100, max: 100 },
      path: { pathId: 'guardian', abilities: [] },
      stanceState: {
        activeStanceId: 'iron_stance',
        stanceCooldownRemaining: 0,
        triggerCooldowns: {},
      },
      pathProgression: {
        pathId: 'guardian',
        pathType: 'passive',
        stanceProgression: { ironTier: 0, retributionTier: 0, acquiredEnhancements: [] },
      },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: createDefaultComputed(),
      },
    };
    world.add(player);

    // Initially in Iron Stance
    dispatch({ type: 'SWITCH_STANCE', stanceId: 'retribution_stance' });
    InputSystem(16);

    // Should have recomputed to Retribution effects
    // Retribution Stance: +15% Power, +10% Armor, Reflect 20%
    expect(player.passiveEffectState?.computed.baseReflectPercent).toBe(20);
    expect(player.passiveEffectState?.computed.powerPercent).toBe(15);
  });

  it('should recompute effects when enhancement selected', () => {
    const player: Entity = {
      player: true,
      identity: { name: 'Test', class: 'warrior' },
      health: { current: 100, max: 100 },
      path: { pathId: 'guardian', abilities: [] },
      stanceState: {
        activeStanceId: 'iron_stance',
        stanceCooldownRemaining: 0,
        triggerCooldowns: {},
      },
      pathProgression: {
        pathId: 'guardian',
        pathType: 'passive',
        stanceProgression: { ironTier: 0, retributionTier: 0, acquiredEnhancements: [] },
      },
      pendingStanceEnhancement: {
        pathId: 'guardian',
        ironChoice: { id: 'iron_1_fortified_skin', name: 'Fortified Skin', tier: 1, description: '+20% Armor', stanceId: 'iron_stance', effects: [{ type: 'armor_percent', value: 20 }] },
        retributionChoice: { id: 'retribution_1_sharpened_thorns', name: 'Sharpened Thorns', tier: 1, description: '+30% Reflect', stanceId: 'retribution_stance', effects: [{ type: 'reflect_percent', value: 30 }] },
      },
      passiveEffectState: {
        combat: { hitsTaken: 0, hitsDealt: 0, nextAttackBonus: 0, damageStacks: 0, reflectBonusPercent: 0 },
        floor: { survivedLethal: false },
        permanent: { powerBonusPercent: 0 },
        computed: createDefaultComputed(),
      },
    };
    const gameState: Entity = { gameState: true, phase: 'combat', paused: true };
    world.add(player);
    world.add(gameState);

    // Select iron enhancement while in iron stance
    dispatch({ type: 'SELECT_STANCE_ENHANCEMENT', stanceId: 'iron' });
    InputSystem(16);

    // Should have recomputed with new enhancement
    // Iron Stance base 25% + Fortified Skin 20% = 45%
    expect(player.passiveEffectState?.computed.armorPercent).toBe(45);
  });

  it('should initialize and compute effects when passive path selected', () => {
    const gameState: Entity = { gameState: true, phase: 'path-select', paused: false };
    world.add(gameState);

    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    world.add(player);

    // Player starts without passiveEffectState
    expect(player.passiveEffectState).toBeUndefined();

    // Select Guardian (passive path)
    dispatch(Commands.selectPath('guardian'));
    InputSystem(16);

    // Should have initialized passiveEffectState
    expect(player.passiveEffectState).toBeDefined();

    // Should have computed effects for Iron Stance (default)
    // Iron Stance: +25% Armor, -15% Speed, 15% damage reduction
    expect(player.passiveEffectState?.computed.armorPercent).toBe(25);
    expect(player.passiveEffectState?.computed.speedPercent).toBe(-15);
    expect(player.passiveEffectState?.computed.damageReductionPercent).toBe(15);
  });
});

describe('Floor state reset on ADVANCE_ROOM', () => {
  beforeEach(() => {
    clearWorld();
    commandQueue.length = 0;
  });

  it('should reset floor state when advancing to new floor from floor-complete', () => {
    const gameState: Entity = {
      gameState: true,
      phase: 'floor-complete',
      floor: { number: 1, room: 5, totalRooms: 5 },
    };
    world.add(gameState);

    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
      passiveEffectState: {
        combat: {
          hitsTaken: 5,
          hitsDealt: 3,
          nextAttackBonus: 50,
          damageStacks: 3,
          reflectBonusPercent: 15,
        },
        floor: { survivedLethal: true },
        permanent: { powerBonusPercent: 10 },
        computed: createDefaultComputed(),
      },
    };
    world.add(player);

    dispatch({ type: 'ADVANCE_ROOM' });
    InputSystem(16);

    // Floor state should be reset
    expect(player.passiveEffectState?.floor.survivedLethal).toBe(false);

    // Combat state should also be reset (floor reset includes combat reset)
    expect(player.passiveEffectState?.combat.hitsTaken).toBe(0);
    expect(player.passiveEffectState?.combat.damageStacks).toBe(0);

    // Permanent state should be preserved
    expect(player.passiveEffectState?.permanent.powerBonusPercent).toBe(10);
  });

  it('should NOT reset floor state when advancing within same floor', () => {
    const gameState: Entity = {
      gameState: true,
      phase: 'combat',
      floor: { number: 1, room: 2, totalRooms: 5 },
    };
    world.add(gameState);

    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
      passiveEffectState: {
        combat: {
          hitsTaken: 5,
          hitsDealt: 3,
          nextAttackBonus: 50,
          damageStacks: 3,
          reflectBonusPercent: 15,
        },
        floor: { survivedLethal: true },
        permanent: { powerBonusPercent: 10 },
        computed: createDefaultComputed(),
      },
    };
    world.add(player);

    dispatch({ type: 'ADVANCE_ROOM' });
    InputSystem(16);

    // Floor state should be preserved (same floor)
    expect(player.passiveEffectState?.floor.survivedLethal).toBe(true);

    // Combat state is not reset here - that happens in FlowSystem when enemy spawns
    // ADVANCE_ROOM just schedules the spawn
  });
});

describe('Floor state reset on LEAVE_SHOP', () => {
  beforeEach(() => {
    clearWorld();
    commandQueue.length = 0;
  });

  it('should reset floor state when leaving shop to advance to new floor', () => {
    const gameState: Entity = {
      gameState: true,
      phase: 'shop',
      shopEnteredFrom: 'floor-complete',
      floor: { number: 1, room: 5, totalRooms: 5 },
    };
    world.add(gameState);

    const player: Entity = {
      player: true,
      health: { current: 100, max: 100 },
      passiveEffectState: {
        combat: {
          hitsTaken: 5,
          hitsDealt: 3,
          nextAttackBonus: 50,
          damageStacks: 3,
          reflectBonusPercent: 15,
        },
        floor: { survivedLethal: true },
        permanent: { powerBonusPercent: 10 },
        computed: createDefaultComputed(),
      },
    };
    world.add(player);

    dispatch({ type: 'LEAVE_SHOP' });
    InputSystem(16);

    // Floor state should be reset
    expect(player.passiveEffectState?.floor.survivedLethal).toBe(false);

    // Combat state should also be reset (floor reset includes combat reset)
    expect(player.passiveEffectState?.combat.hitsTaken).toBe(0);

    // Permanent state should be preserved
    expect(player.passiveEffectState?.permanent.powerBonusPercent).toBe(10);
  });

  it('should NOT reset floor state when leaving shop after defeat (retrying floor)', () => {
    const gameState: Entity = {
      gameState: true,
      phase: 'shop',
      shopEnteredFrom: 'defeat',
      floor: { number: 1, room: 3, totalRooms: 5 },
    };
    world.add(gameState);

    const player: Entity = {
      player: true,
      health: { current: 50, max: 100 },
      passiveEffectState: {
        combat: {
          hitsTaken: 5,
          hitsDealt: 3,
          nextAttackBonus: 50,
          damageStacks: 3,
          reflectBonusPercent: 15,
        },
        floor: { survivedLethal: true },
        permanent: { powerBonusPercent: 10 },
        computed: createDefaultComputed(),
      },
    };
    world.add(player);

    dispatch({ type: 'LEAVE_SHOP' });
    InputSystem(16);

    // Floor state should be preserved (retrying same floor)
    expect(player.passiveEffectState?.floor.survivedLethal).toBe(true);
  });
});
