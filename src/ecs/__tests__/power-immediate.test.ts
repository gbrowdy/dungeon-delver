// src/ecs/__tests__/power-immediate.test.ts
/**
 * Test that powers fire immediately when activated, not on next attack tick.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { world } from '../world';
import { createPlayerEntity, createEnemyEntity, createGameStateEntity } from '../factories';
import { getPlayer, getActiveEnemy } from '../queries';
import { dispatch, Commands } from '../commands';
import { InputSystem } from '../systems/input';
import { PowerSystem } from '../systems/power';

describe('Power Immediate Execution', () => {
  beforeEach(() => {
    // Clear the world (spread to avoid modifying while iterating)
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }

    // Create game state in combat phase
    const gameState = createGameStateEntity();
    gameState.phase = 'combat';
    world.add(gameState);

    // Create player with a damage power
    const player = createPlayerEntity({
      name: 'Hero',
      characterClass: 'warrior',
    });
    world.add(player);

    // Create enemy
    const enemy = createEnemyEntity({
      floor: 1,
      room: 1,
      roomsPerFloor: 5,
    });
    world.add(enemy);
  });

  it('should deal damage immediately when power is activated', () => {
    const player = getPlayer();
    const enemy = getActiveEnemy();

    expect(player).toBeDefined();
    expect(enemy).toBeDefined();
    expect(player!.powers).toBeDefined();
    expect(player!.powers!.length).toBeGreaterThan(0);

    // Get initial enemy health
    const initialEnemyHealth = enemy!.health!.current;

    // Get the player's first power (should be Berserker Rage for warrior)
    const power = player!.powers![0];
    expect(power).toBeDefined();
    expect(power.effect).toBe('damage');

    // Ensure player has enough mana
    expect(player!.mana!.current).toBeGreaterThanOrEqual(power.manaCost);

    // Activate the power
    dispatch(Commands.activatePower(power.id));

    // Run InputSystem to process the command (adds casting component)
    InputSystem(16);

    // Run PowerSystem to execute the power
    PowerSystem(16);

    // Enemy health should be reduced IMMEDIATELY (same tick)
    const newEnemyHealth = enemy!.health!.current;
    expect(newEnemyHealth).toBeLessThan(initialEnemyHealth);
  });

  it('should deduct mana immediately when power is activated', () => {
    const player = getPlayer();

    expect(player).toBeDefined();
    expect(player!.powers).toBeDefined();

    const power = player!.powers![0];
    // Level 1 players use pathResource (stamina) instead of mana
    const initialResource = player!.pathResource!.current;

    // Activate the power
    dispatch(Commands.activatePower(power.id));

    // Run InputSystem and PowerSystem
    InputSystem(16);
    PowerSystem(16);

    // Resource should be deducted immediately
    expect(player!.pathResource!.current).toBe(initialResource - power.manaCost);
  });

  it('should set cooldown immediately when power is activated', () => {
    const player = getPlayer();

    expect(player).toBeDefined();
    expect(player!.powers).toBeDefined();

    const power = player!.powers![0];

    // Power should not be on cooldown initially (no entry in cooldowns Map)
    expect(player!.cooldowns?.get(power.id)?.remaining ?? 0).toBe(0);

    // Activate the power
    dispatch(Commands.activatePower(power.id));

    // Run InputSystem and PowerSystem
    InputSystem(16);
    PowerSystem(16);

    // Cooldown should be set immediately in the cooldowns Map
    expect(player!.cooldowns?.get(power.id)?.remaining).toBe(power.cooldown);
  });
});
