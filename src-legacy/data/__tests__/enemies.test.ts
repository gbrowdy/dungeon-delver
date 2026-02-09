/**
 * Unit tests for enemy generation and scaling
 *
 * Tests cover:
 * - generateEnemy input validation
 * - Enemy scaling behavior
 * - Feature flag effects on scaling
 * - Ability generation
 *
 * Run with: npx vitest run
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateEnemy } from '../enemies';

// Mock the feature flags - use a mutable ref so we can change it in tests
let enemyScalingV2Enabled = true;
vi.mock('@/constants/features', () => ({
  isFeatureEnabled: vi.fn((flag: string) => {
    if (flag === 'ENEMY_SCALING_V2') return enemyScalingV2Enabled;
    return false;
  }),
}));

// Mock gameLogger to avoid console output during tests
vi.mock('@/utils/gameLogger', () => ({
  logError: vi.fn(),
}));

describe('generateEnemy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic generation', () => {
    it('should generate an enemy with valid properties', () => {
      const enemy = generateEnemy(1, 1, 5);

      expect(enemy).toBeDefined();
      expect(enemy.name).toBeDefined();
      expect(enemy.health).toBeGreaterThan(0);
      expect(enemy.maxHealth).toBeGreaterThan(0);
      expect(enemy.power).toBeGreaterThan(0);
      expect(enemy.armor).toBeGreaterThanOrEqual(0);
      expect(enemy.speed).toBeGreaterThan(0);
    });

    it('should generate different enemies on different floors', () => {
      const floor1Enemy = generateEnemy(1, 1, 5);
      const floor5Enemy = generateEnemy(5, 1, 5);

      // Floor 5 enemy should have higher stats (due to scaling)
      expect(floor5Enemy.maxHealth).toBeGreaterThan(floor1Enemy.maxHealth);
    });

    it('should generate different enemies on different rooms', () => {
      const room1Enemy = generateEnemy(1, 1, 5);
      const room5Enemy = generateEnemy(1, 5, 5);

      // Room 5 enemy should have higher stats (due to room scaling)
      expect(room5Enemy.maxHealth).toBeGreaterThanOrEqual(room1Enemy.maxHealth);
    });
  });

  describe('input validation', () => {
    it('should handle floor = 0 by clamping to 1', () => {
      const enemy = generateEnemy(0, 1, 5);

      expect(enemy).toBeDefined();
      expect(enemy.health).toBeGreaterThan(0);
    });

    it('should handle negative floor by clamping to 1', () => {
      const enemy = generateEnemy(-5, 1, 5);

      expect(enemy).toBeDefined();
      expect(enemy.health).toBeGreaterThan(0);
    });

    it('should handle room = 0 by clamping to 1', () => {
      const enemy = generateEnemy(1, 0, 5);

      expect(enemy).toBeDefined();
      expect(enemy.health).toBeGreaterThan(0);
    });

    it('should handle NaN floor gracefully', () => {
      const enemy = generateEnemy(NaN, 1, 5);

      expect(enemy).toBeDefined();
      expect(enemy.health).toBeGreaterThan(0);
    });

    it('should handle NaN room gracefully', () => {
      const enemy = generateEnemy(1, NaN, 5);

      expect(enemy).toBeDefined();
      expect(enemy.health).toBeGreaterThan(0);
    });

    it('should handle roomsPerFloor = 0 by clamping to 1', () => {
      const enemy = generateEnemy(1, 1, 0);

      expect(enemy).toBeDefined();
      expect(enemy.health).toBeGreaterThan(0);
    });

    it('should clamp floor to maximum (5)', () => {
      const enemy = generateEnemy(100, 1, 5);

      // Should not crash, stats should be capped at floor 5 level
      expect(enemy).toBeDefined();
      expect(enemy.health).toBeGreaterThan(0);
    });
  });

  describe('enemy abilities', () => {
    it('should generate enemies with abilities array', () => {
      const enemy = generateEnemy(1, 1, 5);

      expect(enemy.abilities).toBeDefined();
      expect(Array.isArray(enemy.abilities)).toBe(true);
    });

    it('should generate boss enemies on final room with abilities', () => {
      // Final room on floor 5 should be the final boss
      const enemy = generateEnemy(5, 5, 5);

      expect(enemy.isBoss).toBe(true);
      expect(enemy.abilities.length).toBeGreaterThan(0);
    });
  });

  describe('stat scaling', () => {
    it('should scale health with floor', () => {
      const floor1 = generateEnemy(1, 1, 5);
      const floor3 = generateEnemy(3, 1, 5);
      const floor5 = generateEnemy(5, 1, 5);

      // Progressive scaling
      expect(floor3.maxHealth).toBeGreaterThan(floor1.maxHealth);
      expect(floor5.maxHealth).toBeGreaterThan(floor3.maxHealth);
    });

    it('should scale power with floor', () => {
      const floor1 = generateEnemy(1, 1, 5);
      const floor5 = generateEnemy(5, 1, 5);

      expect(floor5.power).toBeGreaterThan(floor1.power);
    });

    it('should apply room scaling within a floor', () => {
      const room1 = generateEnemy(3, 1, 5);
      const room3 = generateEnemy(3, 3, 5);
      const room5 = generateEnemy(3, 5, 5);

      // Room scaling should be visible
      expect(room3.maxHealth).toBeGreaterThan(room1.maxHealth);
      expect(room5.maxHealth).toBeGreaterThan(room3.maxHealth);
    });
  });

  describe('XP and gold rewards', () => {
    it('should give experience and gold rewards', () => {
      const enemy = generateEnemy(1, 1, 5);

      expect(enemy.experienceReward).toBeGreaterThan(0);
      expect(enemy.goldReward).toBeGreaterThanOrEqual(0);
    });

    it('should scale rewards with floor', () => {
      const floor1 = generateEnemy(1, 1, 5);
      const floor5 = generateEnemy(5, 1, 5);

      expect(floor5.experienceReward).toBeGreaterThan(floor1.experienceReward);
    });
  });
});

describe('generateEnemy - feature flag disabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Disable the feature flag via the mutable ref
    enemyScalingV2Enabled = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Re-enable the feature flag
    enemyScalingV2Enabled = true;
  });

  it('should still generate valid enemies with legacy scaling', () => {
    const enemy = generateEnemy(3, 2, 5);

    expect(enemy).toBeDefined();
    expect(enemy.health).toBeGreaterThan(0);
    expect(enemy.maxHealth).toBeGreaterThan(0);
  });

  it('should use linear scaling when feature disabled', () => {
    // With legacy scaling, floor 2 should still scale
    const floor1 = generateEnemy(1, 1, 5);
    const floor2 = generateEnemy(2, 1, 5);

    // Basic check that scaling still works
    expect(floor2.maxHealth).toBeGreaterThan(floor1.maxHealth);
  });
});
