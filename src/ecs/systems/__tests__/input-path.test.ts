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
      { pathId: 'enchanter', class: 'mage', firstStance: 'arcane_stance' },
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
});
