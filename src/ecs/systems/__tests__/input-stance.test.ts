// src/ecs/systems/__tests__/input-stance.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { world, clearWorld } from '../../world';
import { createGameStateEntity, createPlayerEntity } from '../../factories';
import { dispatch, Commands, commandQueue } from '../../commands';
import { InputSystem } from '../input';
import { getPlayer } from '../../queries';
import { DEFAULT_STANCE_COOLDOWN } from '@/data/stances';

describe('InputSystem SWITCH_STANCE command', () => {
  beforeEach(() => {
    clearWorld();
    commandQueue.length = 0;
    world.add(createGameStateEntity());
  });

  it('should switch stance when player has stanceState and path', () => {
    // Create player and select Guardian path
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    world.add(player);

    // Simulate selecting guardian path (passive warrior path)
    dispatch(Commands.selectPath('guardian'));
    InputSystem(16);

    // Verify initial stance is iron_stance (first stance)
    const playerAfterPath = getPlayer();
    expect(playerAfterPath?.stanceState?.activeStanceId).toBe('iron_stance');
    expect(playerAfterPath?.stanceState?.stanceCooldownRemaining).toBe(0);

    // Switch to retribution_stance
    dispatch(Commands.switchStance('retribution_stance'));
    InputSystem(16);

    const playerAfterSwitch = getPlayer();
    expect(playerAfterSwitch?.stanceState?.activeStanceId).toBe('retribution_stance');
    expect(playerAfterSwitch?.stanceState?.stanceCooldownRemaining).toBe(DEFAULT_STANCE_COOLDOWN);
  });

  it('should not switch stance when on cooldown', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    world.add(player);

    // Select guardian path
    dispatch(Commands.selectPath('guardian'));
    InputSystem(16);

    // Switch to retribution_stance
    dispatch(Commands.switchStance('retribution_stance'));
    InputSystem(16);

    const playerAfterFirstSwitch = getPlayer();
    expect(playerAfterFirstSwitch?.stanceState?.activeStanceId).toBe('retribution_stance');
    expect(playerAfterFirstSwitch?.stanceState?.stanceCooldownRemaining).toBe(DEFAULT_STANCE_COOLDOWN);

    // Try to switch back immediately (should be blocked by cooldown)
    dispatch(Commands.switchStance('iron_stance'));
    InputSystem(16);

    const playerAfterSecondAttempt = getPlayer();
    expect(playerAfterSecondAttempt?.stanceState?.activeStanceId).toBe('retribution_stance'); // Still retribution
    expect(playerAfterSecondAttempt?.stanceState?.stanceCooldownRemaining).toBe(DEFAULT_STANCE_COOLDOWN);
  });

  it('should not switch to same stance', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    world.add(player);

    // Select guardian path
    dispatch(Commands.selectPath('guardian'));
    InputSystem(16);

    // Try to switch to same stance (iron_stance is default)
    dispatch(Commands.switchStance('iron_stance'));
    InputSystem(16);

    const playerAfter = getPlayer();
    expect(playerAfter?.stanceState?.activeStanceId).toBe('iron_stance');
    expect(playerAfter?.stanceState?.stanceCooldownRemaining).toBe(0); // No cooldown set
  });

  it('should not switch stance if player has no stanceState', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'mage' });
    world.add(player);

    // Select archmage path (active path - no stances)
    dispatch(Commands.selectPath('archmage'));
    InputSystem(16);

    const playerAfterPath = getPlayer();
    expect(playerAfterPath?.stanceState).toBeUndefined();

    // Try to switch stance (should be ignored)
    dispatch(Commands.switchStance('iron_stance'));
    InputSystem(16);

    const playerAfterSwitch = getPlayer();
    expect(playerAfterSwitch?.stanceState).toBeUndefined();
  });

  it('should not switch to invalid stance ID', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    world.add(player);

    // Select guardian path
    dispatch(Commands.selectPath('guardian'));
    InputSystem(16);

    const playerBefore = getPlayer();
    expect(playerBefore?.stanceState?.activeStanceId).toBe('iron_stance');

    // Try to switch to invalid stance
    dispatch(Commands.switchStance('invalid_stance_id'));
    InputSystem(16);

    const playerAfter = getPlayer();
    expect(playerAfter?.stanceState?.activeStanceId).toBe('iron_stance'); // No change
    expect(playerAfter?.stanceState?.stanceCooldownRemaining).toBe(0); // No cooldown set
  });

  it('should use stance-specific cooldown from definition', () => {
    const player = createPlayerEntity({ name: 'Hero', characterClass: 'warrior' });
    world.add(player);

    // Select guardian path
    dispatch(Commands.selectPath('guardian'));
    InputSystem(16);

    // Switch stance
    dispatch(Commands.switchStance('retribution_stance'));
    InputSystem(16);

    const playerAfter = getPlayer();
    // Verify cooldown is set from stance definition (DEFAULT_STANCE_COOLDOWN = 5000)
    expect(playerAfter?.stanceState?.stanceCooldownRemaining).toBe(5000);
  });
});
