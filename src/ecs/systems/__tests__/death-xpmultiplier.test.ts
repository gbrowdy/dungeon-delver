// src/ecs/systems/__tests__/death-xpmultiplier.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { world } from '../../world';
import { createGameStateEntity, createPlayerEntity, createEnemyEntity } from '../../factories';
import { DeathSystem } from '../death';
import { getPlayer } from '../../queries';
import { resetTick } from '../../loop';
import * as devMode from '@/utils/devMode';

describe('DeathSystem XP multiplier', () => {
  beforeEach(() => {
    // Clear world
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
    resetTick();

    // Add game state and player
    world.add(createGameStateEntity({ initialPhase: 'combat' }));
    world.add(createPlayerEntity({ name: 'Hero', characterClass: 'warrior' }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    devMode.clearDevModeCache();
  });

  it('applies XP multiplier when enemy dies', () => {
    vi.spyOn(devMode, 'getDevModeParams').mockReturnValue({
      enabled: true,
      xpMultiplier: 5,
      attackOverride: null,
      defenseOverride: null,
      goldOverride: null,
      startFloor: null,
    });

    // Add enemy with known XP reward
    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health!.current = 0; // Mark as dead
    world.add(enemy);

    const xpReward = enemy.rewards?.xp ?? 10;
    const playerBefore = getPlayer();
    const initialXp = playerBefore?.progression?.xp ?? 0;

    DeathSystem(16);

    const playerAfter = getPlayer();
    // XP should be multiplied by 5
    expect(playerAfter?.progression?.xp).toBe(initialXp + xpReward * 5);
  });

  it('uses normal XP when dev mode disabled', () => {
    vi.spyOn(devMode, 'getDevModeParams').mockReturnValue({
      enabled: false,
      xpMultiplier: 1,
      attackOverride: null,
      defenseOverride: null,
      goldOverride: null,
      startFloor: null,
    });

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health!.current = 0;
    world.add(enemy);

    const xpReward = enemy.rewards?.xp ?? 10;
    const initialXp = getPlayer()?.progression?.xp ?? 0;

    DeathSystem(16);

    expect(getPlayer()?.progression?.xp).toBe(initialXp + xpReward);
  });

  it('handles XP multiplier of 10 for fast leveling', () => {
    vi.spyOn(devMode, 'getDevModeParams').mockReturnValue({
      enabled: true,
      xpMultiplier: 10,
      attackOverride: null,
      defenseOverride: null,
      goldOverride: null,
      startFloor: null,
    });

    const enemy = createEnemyEntity({ floor: 1, room: 1 });
    enemy.health!.current = 0;
    world.add(enemy);

    const xpReward = enemy.rewards?.xp ?? 10;
    const initialXp = getPlayer()?.progression?.xp ?? 0;

    DeathSystem(16);

    expect(getPlayer()?.progression?.xp).toBe(initialXp + xpReward * 10);
  });
});
