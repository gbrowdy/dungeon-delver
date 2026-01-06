// src/ecs/systems/__tests__/flow.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { world } from '../../world';
import { FlowSystem } from '../flow';
import { resetTick } from '../../loop';

// Mock generateEnemy to avoid randomness in tests
vi.mock('@/data/enemies', () => ({
  generateEnemy: vi.fn((floor: number, room: number, _totalRooms: number) => ({
    id: `enemy-${floor}-${room}`,
    name: `Test Enemy ${room}`,
    health: 100,
    maxHealth: 100,
    power: 10,
    armor: 5,
    speed: 10,
    experienceReward: 25,
    goldReward: 15,
    isBoss: false,
    abilities: [],
    intent: null,
    statusEffects: [],
  })),
}));

describe('FlowSystem', () => {
  beforeEach(() => {
    // Clear all entities
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
    resetTick();

    // Add game state
    world.add({
      gameState: true,
      phase: 'combat',
      combatSpeed: { multiplier: 1 },
      floor: { number: 1, room: 1, totalRooms: 5 },
      scheduledTransitions: [],
      scheduledSpawns: [],
      animationEvents: [],
      combatLog: [],
    });
  });

  describe('scheduled transitions', () => {
    it('should tick down scheduled transition delays', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledTransitions = [{ toPhase: 'defeat', delay: 500 }];

      FlowSystem(16);

      expect(gameState.scheduledTransitions?.[0]?.delay).toBe(484); // 500 - 16
    });

    it('should apply phase transition when delay reaches 0', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledTransitions = [{ toPhase: 'defeat', delay: 10 }];

      FlowSystem(16);

      expect(gameState.phase).toBe('defeat');
      expect(gameState.scheduledTransitions?.length).toBe(0);
    });

    it('should remove completed transitions from array', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledTransitions = [
        { toPhase: 'defeat', delay: 5 },
        { toPhase: 'floor-complete', delay: 100 },
      ];

      FlowSystem(16);

      expect(gameState.scheduledTransitions?.length).toBe(1);
      expect(gameState.scheduledTransitions?.[0]?.toPhase).toBe('floor-complete');
    });

    it('should handle multiple transitions completing in same tick', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledTransitions = [
        { toPhase: 'shop', delay: 5 },
        { toPhase: 'combat', delay: 10 },
      ];

      FlowSystem(16);

      // Both should be processed (last one wins for phase)
      expect(gameState.scheduledTransitions?.length).toBe(0);
      // Note: The final phase depends on processing order
      expect(['shop', 'combat']).toContain(gameState.phase);
    });

    it('should not log phase transitions to combat log', () => {
      const gameState = world.with('gameState').first!;
      gameState.combatLog = [];
      gameState.scheduledTransitions = [{ toPhase: 'floor-complete', delay: 0 }];

      FlowSystem(16);

      // Combat log should not contain phase transition messages
      const phaseLogEntry = gameState.combatLog.find(log => log.includes('Phase:'));
      expect(phaseLogEntry).toBeUndefined();
    });

    it('should add victory message when transitioning to victory', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledTransitions = [{ toPhase: 'victory', delay: 5 }];

      FlowSystem(16);

      expect(gameState.combatLog).toContainEqual(
        expect.stringContaining('Victory!')
      );
    });
  });

  describe('scheduled spawns', () => {
    it('should tick down scheduled spawn delays', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 500 }];

      FlowSystem(16);

      expect(gameState.scheduledSpawns?.[0]?.delay).toBe(484); // 500 - 16
    });

    it('should spawn enemy when spawn delay reaches 0', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };

      FlowSystem(16);

      // Should have spawned an enemy
      const enemies = world.with('enemy').entities;
      expect(enemies.length).toBe(1);
    });

    it('should increment room number when spawning enemy', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };

      FlowSystem(16);

      expect(gameState.floor?.room).toBe(2);
    });

    it('should remove completed spawns from array', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 5 }, { delay: 100 }];
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };

      FlowSystem(16);

      expect(gameState.scheduledSpawns?.length).toBe(1);
      expect(gameState.scheduledSpawns?.[0]?.delay).toBe(84); // 100 - 16
    });

    it('should clear isTransitioning flag when enemy spawns', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.isTransitioning = true;
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };

      FlowSystem(16);

      expect(gameState.isTransitioning).toBe(false);
    });

    it('should log enemy spawn to combat log', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };

      FlowSystem(16);

      expect(gameState.combatLog).toContainEqual(
        expect.stringContaining('Room 2:')
      );
    });
  });

  describe('floor completion', () => {
    it('should schedule floor-complete when last enemy in non-final floor dies', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 1, room: 5, totalRooms: 5 }; // Last room

      FlowSystem(16);

      // Room increments to 6, which is > totalRooms, so floor-complete
      const floorCompleteTransition = gameState.scheduledTransitions?.find(
        (t) => t.toPhase === 'floor-complete'
      );
      expect(floorCompleteTransition).toBeDefined();
    });

    it('should not spawn enemy when floor is complete', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 1, room: 5, totalRooms: 5 }; // Last room

      FlowSystem(16);

      // Should not have spawned an enemy
      const enemies = world.with('enemy').entities;
      expect(enemies.length).toBe(0);
    });
  });

  describe('victory condition', () => {
    it('should schedule victory when final boss floor is complete', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 5, room: 5, totalRooms: 5 }; // Final boss floor, last room

      FlowSystem(16);

      // Should schedule victory transition
      const victoryTransition = gameState.scheduledTransitions?.find(
        (t) => t.toPhase === 'victory'
      );
      expect(victoryTransition).toBeDefined();
    });

    it('should log final boss defeat message', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 5, room: 5, totalRooms: 5 };

      FlowSystem(16);

      expect(gameState.combatLog).toContainEqual(
        expect.stringContaining('final boss')
      );
    });
  });

  describe('combat speed multiplier', () => {
    it('should respect 2x combat speed for transitions', () => {
      const gameState = world.with('gameState').first!;
      gameState.combatSpeed = { multiplier: 2 };
      gameState.scheduledTransitions = [{ toPhase: 'defeat', delay: 500 }];

      FlowSystem(16);

      // At 2x speed, 16ms tick = 32ms effective
      expect(gameState.scheduledTransitions?.[0]?.delay).toBe(468); // 500 - 32
    });

    it('should respect 3x combat speed for spawns', () => {
      const gameState = world.with('gameState').first!;
      gameState.combatSpeed = { multiplier: 3 };
      gameState.scheduledSpawns = [{ delay: 500 }];

      FlowSystem(16);

      // At 3x speed, 16ms tick = 48ms effective
      expect(gameState.scheduledSpawns?.[0]?.delay).toBe(452); // 500 - 48
    });

    it('should complete transitions faster at higher speeds', () => {
      const gameState = world.with('gameState').first!;
      gameState.combatSpeed = { multiplier: 3 };
      gameState.scheduledTransitions = [{ toPhase: 'defeat', delay: 40 }];

      FlowSystem(16);

      // At 3x speed, 16ms tick = 48ms effective, which exceeds 40ms delay
      expect(gameState.phase).toBe('defeat');
      expect(gameState.scheduledTransitions?.length).toBe(0);
    });
  });

  describe('phase restrictions', () => {
    it('should process transitions during defeat phase', () => {
      const gameState = world.with('gameState').first!;
      gameState.phase = 'defeat';
      gameState.scheduledTransitions = [{ toPhase: 'menu', delay: 10 }];

      FlowSystem(16);

      expect(gameState.phase).toBe('menu');
    });

    it('should process transitions during victory phase', () => {
      const gameState = world.with('gameState').first!;
      gameState.phase = 'victory';
      gameState.scheduledTransitions = [{ toPhase: 'menu', delay: 10 }];

      FlowSystem(16);

      expect(gameState.phase).toBe('menu');
    });

    it('should not process spawns outside combat phase', () => {
      const gameState = world.with('gameState').first!;
      gameState.phase = 'shop';
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };

      FlowSystem(16);

      // Should not spawn - delay should remain unchanged
      // (shop phase doesn't process spawns)
      const enemies = world.with('enemy').entities;
      expect(enemies.length).toBe(0);
    });

    it('should still process transitions in non-combat phases', () => {
      const gameState = world.with('gameState').first!;
      gameState.phase = 'floor-complete';
      gameState.scheduledTransitions = [{ toPhase: 'combat', delay: 10 }];

      FlowSystem(16);

      expect(gameState.phase).toBe('combat');
    });
  });

  describe('enemy entity creation', () => {
    it('should create enemy with proper health component', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };

      FlowSystem(16);

      const enemy = world.with('enemy', 'health').first;
      expect(enemy?.health).toBeDefined();
      expect(enemy?.health?.current).toBe(100);
      expect(enemy?.health?.max).toBe(100);
    });

    it('should create enemy with attack component', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };

      FlowSystem(16);

      const enemy = world.with('enemy', 'attack').first;
      expect(enemy?.attack).toBeDefined();
      expect(enemy?.attack?.baseDamage).toBe(10);
    });

    it('should create enemy with defense component', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };

      FlowSystem(16);

      const enemy = world.with('enemy', 'defense').first;
      expect(enemy?.defense).toBeDefined();
      expect(enemy?.defense?.value).toBe(5);
    });

    it('should create enemy with speed component', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };

      FlowSystem(16);

      const enemy = world.with('enemy', 'speed').first;
      expect(enemy?.speed).toBeDefined();
      expect(enemy?.speed?.value).toBe(10);
      expect(enemy?.speed?.accumulated).toBe(0);
    });

    it('should create enemy with rewards component', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = { number: 1, room: 1, totalRooms: 5 };

      FlowSystem(16);

      const enemy = world.with('enemy', 'rewards').first;
      expect(enemy?.rewards).toBeDefined();
      expect(enemy?.rewards?.xp).toBe(25);
      expect(enemy?.rewards?.gold).toBe(15);
    });
  });

  describe('edge cases', () => {
    it('should handle empty scheduled transitions array', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledTransitions = [];

      expect(() => FlowSystem(16)).not.toThrow();
    });

    it('should handle empty scheduled spawns array', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [];

      expect(() => FlowSystem(16)).not.toThrow();
    });

    it('should handle undefined scheduled transitions', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledTransitions = undefined;

      expect(() => FlowSystem(16)).not.toThrow();
    });

    it('should handle undefined scheduled spawns', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = undefined;

      expect(() => FlowSystem(16)).not.toThrow();
    });

    it('should handle missing floor data for spawn', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledSpawns = [{ delay: 10 }];
      gameState.floor = undefined;

      // Should not throw, just not spawn
      expect(() => FlowSystem(16)).not.toThrow();
      const enemies = world.with('enemy').entities;
      expect(enemies.length).toBe(0);
    });

    it('should handle exact delay boundary (delay = 0)', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledTransitions = [{ toPhase: 'defeat', delay: 0 }];

      FlowSystem(16);

      expect(gameState.phase).toBe('defeat');
    });

    it('should handle negative delay (already overdue)', () => {
      const gameState = world.with('gameState').first!;
      gameState.scheduledTransitions = [{ toPhase: 'defeat', delay: -100 }];

      FlowSystem(16);

      expect(gameState.phase).toBe('defeat');
    });
  });
});
