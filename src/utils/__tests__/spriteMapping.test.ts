import { describe, it, expect } from 'vitest';
import { getEnemySpriteType } from '../spriteMapping';

describe('getEnemySpriteType', () => {
  it('returns a valid sprite type for common enemies', () => {
    const sprite = getEnemySpriteType('common', 1, 1);
    expect(typeof sprite).toBe('string');
    expect(sprite.length).toBeGreaterThan(0);
  });

  it('returns boss sprites for boss tier', () => {
    const sprite = getEnemySpriteType('boss', 5, 4);
    expect(['dragon', 'archdemon', 'death-knight', 'elder-lich', 'titan']).toContain(sprite);
  });

  it('is deterministic for same inputs', () => {
    const a = getEnemySpriteType('common', 3, 2);
    const b = getEnemySpriteType('common', 3, 2);
    expect(a).toBe(b);
  });

  it('varies with different floor/room combos', () => {
    const sprites = new Set([
      getEnemySpriteType('common', 1, 1),
      getEnemySpriteType('common', 2, 1),
      getEnemySpriteType('common', 3, 1),
      getEnemySpriteType('common', 4, 1),
      getEnemySpriteType('common', 5, 1),
    ]);
    // At least some variation
    expect(sprites.size).toBeGreaterThan(1);
  });
});
