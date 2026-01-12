// src/ecs/systems/__tests__/input-path-power-choices.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world, clearWorld } from '../../world';
import { createPlayerEntity, createGameStateEntity } from '../../factories';
import { dispatch, Commands, commandQueue } from '../../commands';
import { InputSystem } from '../input';

describe('InputSystem - Path-Aware Power Selection', () => {
  beforeEach(() => {
    clearWorld();
    commandQueue.length = 0;
    world.add(createGameStateEntity());
  });

  it('should offer Archmage powers when SELECT_PATH for Archmage at power level', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    player.progression = { level: 2, xp: 0, xpToNext: 100 };
    world.add(player);

    // Dispatch SELECT_PATH command (simulating path selection)
    dispatch(Commands.selectPath('archmage'));
    InputSystem(16);

    // After path selection at level 2, should show power choice
    expect(player.pendingPowerChoice).toBeDefined();
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'arcane_bolt')).toBe(true);
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'meteor_strike')).toBe(true);
    // Negative: should NOT have Berserker powers
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'rage_strike')).toBe(false);
  });

  it('should offer Berserker powers when SELECT_PATH for Berserker at power level', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    player.progression = { level: 2, xp: 0, xpToNext: 100 };
    world.add(player);

    dispatch(Commands.selectPath('berserker'));
    InputSystem(16);

    expect(player.pendingPowerChoice).toBeDefined();
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'rage_strike')).toBe(true);
    // Negative: should NOT have Archmage powers
    expect(player.pendingPowerChoice?.choices.some(p => p.id === 'arcane_bolt')).toBe(false);
  });
});
