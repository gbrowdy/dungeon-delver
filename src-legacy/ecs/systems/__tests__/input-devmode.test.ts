// src/ecs/systems/__tests__/input-devmode.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { world, clearWorld } from '../../world';
import { createGameStateEntity } from '../../factories';
import { dispatch, Commands, commandQueue } from '../../commands';
import { InputSystem } from '../input';
import { getPlayer, getGameState } from '../../queries';
import * as devMode from '@/utils/devMode';

describe('InputSystem dev mode integration', () => {
  beforeEach(() => {
    clearWorld();
    commandQueue.length = 0;
    world.add(createGameStateEntity());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies dev mode overrides when selecting class', () => {
    vi.spyOn(devMode, 'getDevModeParams').mockReturnValue({
      enabled: true,
      xpMultiplier: 1,
      attackOverride: 100,
      defenseOverride: 50,
      goldOverride: 999,
      startFloor: null,
    });

    dispatch(Commands.selectClass('warrior'));
    InputSystem(16);

    const player = getPlayer();
    expect(player?.attack?.baseDamage).toBe(100);
    expect(player?.defense?.value).toBe(50);
    expect(player?.inventory?.gold).toBe(999);
  });

  it('uses normal stats when dev mode is disabled', () => {
    vi.spyOn(devMode, 'getDevModeParams').mockReturnValue({
      enabled: false,
      xpMultiplier: 1,
      attackOverride: null,
      defenseOverride: null,
      goldOverride: null,
      startFloor: null,
    });

    dispatch(Commands.selectClass('warrior'));
    InputSystem(16);

    const player = getPlayer();
    // Warrior base attack is 9
    expect(player?.attack?.baseDamage).toBe(9);
  });

  it('applies startFloor override when dev mode is enabled', () => {
    vi.spyOn(devMode, 'getDevModeParams').mockReturnValue({
      enabled: true,
      xpMultiplier: 1,
      attackOverride: null,
      defenseOverride: null,
      goldOverride: null,
      startFloor: 5,
    });

    dispatch(Commands.selectClass('warrior'));
    InputSystem(16);

    const gameState = getGameState();
    expect(gameState?.floor?.number).toBe(5);
  });

  it('starts at floor 1 when dev mode is disabled', () => {
    vi.spyOn(devMode, 'getDevModeParams').mockReturnValue({
      enabled: false,
      xpMultiplier: 1,
      attackOverride: null,
      defenseOverride: null,
      goldOverride: null,
      startFloor: null,
    });

    dispatch(Commands.selectClass('warrior'));
    InputSystem(16);

    const gameState = getGameState();
    expect(gameState?.floor?.number).toBe(1);
  });
});
