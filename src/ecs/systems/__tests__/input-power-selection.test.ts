// src/ecs/systems/__tests__/input-power-selection.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world, clearWorld } from '../../world';
import { createGameStateEntity } from '../../factories';
import { dispatch, Commands, commandQueue } from '../../commands';
import { InputSystem } from '../input';
import type { Entity } from '../../components';

describe('InputSystem - Power Selection Commands', () => {
  beforeEach(() => {
    clearWorld();
    commandQueue.length = 0;
    world.add(createGameStateEntity());
  });

  describe('SELECT_POWER', () => {
    it('should handle SELECT_POWER command', () => {
      // Create player with pending power choice
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        progression: { level: 2, xp: 0, xpToNext: 200 },
        pathProgression: {
          pathId: 'berserker',
          pathType: 'active',
          powerUpgrades: [],
        },
        pendingPowerChoice: {
          level: 2,
          choices: [
            {
              id: 'rage_strike',
              name: 'Rage Strike',
              description: 'A powerful strike',
              icon: 'power-rage_strike',
              resourceCost: 30,
              cooldown: 5,
              effect: 'damage',
              value: 1.5,
            },
            {
              id: 'savage_slam',
              name: 'Savage Slam',
              description: 'A brutal slam',
              icon: 'power-savage_slam',
              resourceCost: 35,
              cooldown: 6,
              effect: 'damage',
              value: 1.8,
            },
          ],
        },
        powers: [],
      };
      world.add(player);

      dispatch(Commands.selectPower('rage_strike'));
      InputSystem(16);

      // Should add power to player's powers array
      expect(player.powers).toContainEqual(
        expect.objectContaining({ id: 'rage_strike' })
      );

      // Should initialize power upgrade tracking
      expect(player.pathProgression?.powerUpgrades).toContainEqual({
        powerId: 'rage_strike',
        currentTier: 0,
      });

      // Should clear pending choice
      expect(player.pendingPowerChoice).toBeUndefined();
    });

    it('should not add power if pendingPowerChoice is missing', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        powers: [],
      };
      world.add(player);

      dispatch(Commands.selectPower('rage_strike'));
      InputSystem(16);

      // Should not add power
      expect(player.powers).toEqual([]);
    });

    it('should not add power if selected power is not in choices', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pendingPowerChoice: {
          level: 2,
          choices: [
            {
              id: 'rage_strike',
              name: 'Rage Strike',
              description: 'A powerful strike',
              icon: 'power-rage_strike',
              resourceCost: 30,
              cooldown: 5,
              effect: 'damage',
              value: 1.5,
            },
          ],
        },
        powers: [],
      };
      world.add(player);

      dispatch(Commands.selectPower('invalid_power'));
      InputSystem(16);

      // Should not add power
      expect(player.powers).toEqual([]);
      // Should not clear pending choice (invalid selection)
      expect(player.pendingPowerChoice).toBeDefined();
    });

    it('should work without pathProgression', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pendingPowerChoice: {
          level: 2,
          choices: [
            {
              id: 'rage_strike',
              name: 'Rage Strike',
              description: 'A powerful strike',
              icon: 'power-rage_strike',
              resourceCost: 30,
              cooldown: 5,
              effect: 'damage',
              value: 1.5,
            },
          ],
        },
        powers: [],
      };
      world.add(player);

      dispatch(Commands.selectPower('rage_strike'));
      InputSystem(16);

      // Should add power
      expect(player.powers).toContainEqual(
        expect.objectContaining({ id: 'rage_strike' })
      );
      // Should clear pending choice
      expect(player.pendingPowerChoice).toBeUndefined();
    });
  });

  describe('UPGRADE_POWER', () => {
    it('should handle UPGRADE_POWER command', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pathProgression: {
          pathId: 'berserker',
          pathType: 'active',
          powerUpgrades: [{ powerId: 'rage_strike', currentTier: 0 }],
        },
        pendingUpgradeChoice: { powerIds: ['rage_strike'] },
      };
      world.add(player);

      dispatch(Commands.upgradePower('rage_strike'));
      InputSystem(16);

      // Should upgrade the power
      expect(player.pathProgression?.powerUpgrades[0].currentTier).toBe(1);
      // Should clear pending choice
      expect(player.pendingUpgradeChoice).toBeUndefined();
    });

    it('should not upgrade if pendingUpgradeChoice is missing', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pathProgression: {
          pathId: 'berserker',
          pathType: 'active',
          powerUpgrades: [{ powerId: 'rage_strike', currentTier: 0 }],
        },
      };
      world.add(player);

      dispatch(Commands.upgradePower('rage_strike'));
      InputSystem(16);

      // Should not upgrade
      expect(player.pathProgression?.powerUpgrades[0].currentTier).toBe(0);
    });

    it('should not upgrade if pathProgression is missing', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pendingUpgradeChoice: { powerIds: ['rage_strike'] },
      };
      world.add(player);

      dispatch(Commands.upgradePower('rage_strike'));
      InputSystem(16);

      // Should still clear pending choice
      expect(player.pendingUpgradeChoice).toBeUndefined();
    });

    it('should not upgrade if power is not in upgrade choices', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pathProgression: {
          pathId: 'berserker',
          pathType: 'active',
          powerUpgrades: [
            { powerId: 'rage_strike', currentTier: 0 },
            { powerId: 'savage_slam', currentTier: 0 },
          ],
        },
        pendingUpgradeChoice: { powerIds: ['rage_strike'] },
      };
      world.add(player);

      dispatch(Commands.upgradePower('savage_slam'));
      InputSystem(16);

      // Should not upgrade
      expect(player.pathProgression?.powerUpgrades[1].currentTier).toBe(0);
      // Should not clear pending choice (invalid selection)
      expect(player.pendingUpgradeChoice).toBeDefined();
    });

    it('should upgrade from tier 0 to tier 1', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pathProgression: {
          pathId: 'berserker',
          pathType: 'active',
          powerUpgrades: [{ powerId: 'rage_strike', currentTier: 0 }],
        },
        pendingUpgradeChoice: { powerIds: ['rage_strike'] },
      };
      world.add(player);

      dispatch(Commands.upgradePower('rage_strike'));
      InputSystem(16);

      expect(player.pathProgression?.powerUpgrades[0].currentTier).toBe(1);
    });

    it('should upgrade from tier 1 to tier 2', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pathProgression: {
          pathId: 'berserker',
          pathType: 'active',
          powerUpgrades: [{ powerId: 'rage_strike', currentTier: 1 }],
        },
        pendingUpgradeChoice: { powerIds: ['rage_strike'] },
      };
      world.add(player);

      dispatch(Commands.upgradePower('rage_strike'));
      InputSystem(16);

      expect(player.pathProgression?.powerUpgrades[0].currentTier).toBe(2);
    });

    it('should not upgrade beyond tier 2', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pathProgression: {
          pathId: 'berserker',
          pathType: 'active',
          powerUpgrades: [{ powerId: 'rage_strike', currentTier: 2 }],
        },
        pendingUpgradeChoice: { powerIds: ['rage_strike'] },
      };
      world.add(player);

      dispatch(Commands.upgradePower('rage_strike'));
      InputSystem(16);

      // Should remain at tier 2
      expect(player.pathProgression?.powerUpgrades[0].currentTier).toBe(2);
      // Should still clear pending choice
      expect(player.pendingUpgradeChoice).toBeUndefined();
    });
  });

  describe('SELECT_STANCE_ENHANCEMENT', () => {
    it('should handle SELECT_STANCE_ENHANCEMENT command for iron', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pathProgression: {
          pathId: 'guardian',
          pathType: 'passive',
          stanceProgression: {
            ironTier: 0,
            retributionTier: 0,
            acquiredEnhancements: [],
          },
        },
        pendingStanceEnhancement: {
          ironChoice: {
            id: 'iron_1_fortified_skin',
            tier: 1,
            stanceId: 'iron_stance',
            name: 'Fortified Skin',
            description: 'Increases armor',
            effects: [{ type: 'flat_armor', value: 5 }],
          },
          retributionChoice: {
            id: 'retribution_1_sharpened_thorns',
            tier: 1,
            stanceId: 'retribution_stance',
            name: 'Sharpened Thorns',
            description: 'Increases thorns damage',
            effects: [{ type: 'thorns_damage', value: 3 }],
          },
        },
      };
      world.add(player);

      dispatch(Commands.selectStanceEnhancement('iron'));
      InputSystem(16);

      // Should update iron tier
      expect(player.pathProgression?.stanceProgression?.ironTier).toBe(1);
      // Should track acquired enhancement
      expect(
        player.pathProgression?.stanceProgression?.acquiredEnhancements
      ).toContain('iron_1_fortified_skin');
      // Should not change retribution tier
      expect(player.pathProgression?.stanceProgression?.retributionTier).toBe(
        0
      );
      // Should clear pending choice
      expect(player.pendingStanceEnhancement).toBeUndefined();
    });

    it('should handle SELECT_STANCE_ENHANCEMENT command for retribution', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pathProgression: {
          pathId: 'guardian',
          pathType: 'passive',
          stanceProgression: {
            ironTier: 0,
            retributionTier: 0,
            acquiredEnhancements: [],
          },
        },
        pendingStanceEnhancement: {
          ironChoice: {
            id: 'iron_1_fortified_skin',
            tier: 1,
            stanceId: 'iron_stance',
            name: 'Fortified Skin',
            description: 'Increases armor',
            effects: [{ type: 'flat_armor', value: 5 }],
          },
          retributionChoice: {
            id: 'retribution_1_sharpened_thorns',
            tier: 1,
            stanceId: 'retribution_stance',
            name: 'Sharpened Thorns',
            description: 'Increases thorns damage',
            effects: [{ type: 'thorns_damage', value: 3 }],
          },
        },
      };
      world.add(player);

      dispatch(Commands.selectStanceEnhancement('retribution'));
      InputSystem(16);

      // Should update retribution tier
      expect(player.pathProgression?.stanceProgression?.retributionTier).toBe(
        1
      );
      // Should track acquired enhancement
      expect(
        player.pathProgression?.stanceProgression?.acquiredEnhancements
      ).toContain('retribution_1_sharpened_thorns');
      // Should not change iron tier
      expect(player.pathProgression?.stanceProgression?.ironTier).toBe(0);
      // Should clear pending choice
      expect(player.pendingStanceEnhancement).toBeUndefined();
    });

    it('should not enhance if pendingStanceEnhancement is missing', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pathProgression: {
          pathId: 'guardian',
          pathType: 'passive',
          stanceProgression: {
            ironTier: 0,
            retributionTier: 0,
            acquiredEnhancements: [],
          },
        },
      };
      world.add(player);

      dispatch(Commands.selectStanceEnhancement('iron'));
      InputSystem(16);

      // Should not update tiers
      expect(player.pathProgression?.stanceProgression?.ironTier).toBe(0);
      expect(player.pathProgression?.stanceProgression?.acquiredEnhancements)
        .toHaveLength(0);
    });

    it('should not enhance if pathProgression is missing', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pendingStanceEnhancement: {
          ironChoice: {
            id: 'iron_1_fortified_skin',
            tier: 1,
            stanceId: 'iron_stance',
            name: 'Fortified Skin',
            description: 'Increases armor',
            effects: [{ type: 'flat_armor', value: 5 }],
          },
          retributionChoice: {
            id: 'retribution_1_sharpened_thorns',
            tier: 1,
            stanceId: 'retribution_stance',
            name: 'Sharpened Thorns',
            description: 'Increases thorns damage',
            effects: [{ type: 'thorns_damage', value: 3 }],
          },
        },
      };
      world.add(player);

      dispatch(Commands.selectStanceEnhancement('iron'));
      InputSystem(16);

      // Should still clear pending choice
      expect(player.pendingStanceEnhancement).toBeUndefined();
    });

    it('should handle multiple enhancements in sequence', () => {
      const player: Entity = {
        player: true,
        identity: { name: 'Hero', class: 'warrior' },
        health: { current: 100, max: 100 },
        pathProgression: {
          pathId: 'guardian',
          pathType: 'passive',
          stanceProgression: {
            ironTier: 1,
            retributionTier: 0,
            acquiredEnhancements: ['iron_1_fortified_skin'],
          },
        },
        pendingStanceEnhancement: {
          ironChoice: {
            id: 'iron_2_steel_resolve',
            tier: 2,
            stanceId: 'iron_stance',
            name: 'Steel Resolve',
            description: 'More armor',
            effects: [{ type: 'flat_armor', value: 10 }],
          },
          retributionChoice: {
            id: 'retribution_1_sharpened_thorns',
            tier: 1,
            stanceId: 'retribution_stance',
            name: 'Sharpened Thorns',
            description: 'Increases thorns damage',
            effects: [{ type: 'thorns_damage', value: 3 }],
          },
        },
      };
      world.add(player);

      dispatch(Commands.selectStanceEnhancement('iron'));
      InputSystem(16);

      // Should update iron tier
      expect(player.pathProgression?.stanceProgression?.ironTier).toBe(2);
      // Should add new enhancement
      expect(
        player.pathProgression?.stanceProgression?.acquiredEnhancements
      ).toContain('iron_2_steel_resolve');
      // Should keep old enhancement
      expect(
        player.pathProgression?.stanceProgression?.acquiredEnhancements
      ).toContain('iron_1_fortified_skin');
    });
  });
});
