// src/ecs/systems/__tests__/input-popup.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world, clearWorld } from '../../world';
import { createGameStateEntity, createPlayerEntity } from '../../factories';
import { dispatch, Commands, commandQueue } from '../../commands';
import { InputSystem } from '../input';

describe('InputSystem - DISMISS_POPUP', () => {
  beforeEach(() => {
    clearWorld();
    commandQueue.length = 0;
  });

  describe('levelUp popup', () => {
    it('should clear pendingLevelUp at level 3+ when player has path', () => {
      // Create player at level 3 with a path
      const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
      player.progression = { level: 3, xp: 0, xpToNext: 300 };
      player.path = { pathId: 'berserker', abilities: [] };
      world.add(player);

      // Create game state with pending level up
      const gameState = createGameStateEntity({ initialPhase: 'combat' });
      gameState.pendingLevelUp = 3;
      gameState.popups = { levelUp: { level: 3 } };
      gameState.paused = true;
      world.add(gameState);

      // Dispatch dismiss popup command
      dispatch(Commands.dismissPopup('levelUp'));
      InputSystem(16);

      // Verify pendingLevelUp is cleared
      expect(gameState.pendingLevelUp).toBeNull();
      expect(gameState.paused).toBe(false);
      expect(gameState.phase).toBe('combat'); // Should NOT change to path-select
    });

    it('should clear pendingLevelUp at level 2 when player has no path and transition to path-select', () => {
      // Create player at level 2 without a path
      const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
      player.progression = { level: 2, xp: 0, xpToNext: 200 };
      // No path assigned
      world.add(player);

      // Create game state with pending level up
      const gameState = createGameStateEntity();
      gameState.pendingLevelUp = 2;
      gameState.popups = { levelUp: { level: 2 } };
      gameState.paused = true;
      gameState.phase = 'combat';
      world.add(gameState);

      // Dispatch dismiss popup command
      dispatch(Commands.dismissPopup('levelUp'));
      InputSystem(16);

      // Verify pendingLevelUp is cleared
      expect(gameState.pendingLevelUp).toBeNull();
      expect(gameState.paused).toBe(false);
      expect(gameState.phase).toBe('path-select'); // Should transition to path-select
    });

    it('should clear pendingLevelUp at level 4+ when player has path', () => {
      // Create player at level 4 with a path
      const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
      player.progression = { level: 4, xp: 0, xpToNext: 400 };
      player.path = { pathId: 'archmage', abilities: ['ability1'] };
      world.add(player);

      // Create game state with pending level up
      const gameState = createGameStateEntity({ initialPhase: 'combat' });
      gameState.pendingLevelUp = 4;
      gameState.popups = { levelUp: { level: 4 } };
      gameState.paused = true;
      world.add(gameState);

      // Dispatch dismiss popup command
      dispatch(Commands.dismissPopup('levelUp'));
      InputSystem(16);

      // Verify pendingLevelUp is cleared
      expect(gameState.pendingLevelUp).toBeNull();
      expect(gameState.paused).toBe(false);
      expect(gameState.phase).toBe('combat'); // Should NOT change to path-select
    });

    it('should clear levelUp popup', () => {
      const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
      player.progression = { level: 3, xp: 0, xpToNext: 300 };
      player.path = { pathId: 'berserker', abilities: [] };
      world.add(player);

      const gameState = createGameStateEntity({ initialPhase: 'combat' });
      gameState.pendingLevelUp = 3;
      gameState.popups = { levelUp: { level: 3 } };
      world.add(gameState);

      dispatch(Commands.dismissPopup('levelUp'));
      InputSystem(16);

      // Verify popup is cleared
      expect(gameState.popups.levelUp).toBeUndefined();
    });

    it('should unpause combat after dismissing level-up popup', () => {
      const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
      player.progression = { level: 3, xp: 0, xpToNext: 300 };
      player.path = { pathId: 'berserker', abilities: [] };
      world.add(player);

      const gameState = createGameStateEntity({ initialPhase: 'combat' });
      gameState.pendingLevelUp = 3;
      gameState.popups = { levelUp: { level: 3 } };
      gameState.paused = true; // Paused during level-up
      world.add(gameState);

      dispatch(Commands.dismissPopup('levelUp'));
      InputSystem(16);

      // Verify game is unpaused
      expect(gameState.paused).toBe(false);
    });
  });

  describe('other popups', () => {
    it('should clear other popup types without affecting pendingLevelUp', () => {
      const gameState = createGameStateEntity();
      gameState.popups = { someOtherPopup: { data: 'test' } };
      gameState.pendingLevelUp = 3;
      world.add(gameState);

      dispatch(Commands.dismissPopup('someOtherPopup'));
      InputSystem(16);

      // Verify popup is cleared but pendingLevelUp is unchanged
      expect(gameState.popups.someOtherPopup).toBeUndefined();
      expect(gameState.pendingLevelUp).toBe(3);
    });
  });
});
