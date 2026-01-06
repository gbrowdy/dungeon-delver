import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDevModeParams, isDevMode, clearDevModeCache } from '../devMode';

describe('devMode', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Clear cache before each test
    clearDevModeCache();
    // Mock window.location
    delete (window as unknown as { location?: Location }).location;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  function mockUrl(url: string) {
    window.location = { search: new URL(url).search } as Location;
  }

  it('returns false for isDevMode when devMode param is not set', () => {
    mockUrl('http://localhost:3000/');
    expect(isDevMode()).toBe(false);
  });

  it('returns true for isDevMode when devMode=true', () => {
    mockUrl('http://localhost:3000/?devMode=true');
    expect(isDevMode()).toBe(true);
  });

  it('returns default params when devMode is false', () => {
    mockUrl('http://localhost:3000/');
    const params = getDevModeParams();
    expect(params).toEqual({
      enabled: false,
      xpMultiplier: 1,
      attackOverride: null,
      defenseOverride: null,
      goldOverride: null,
      startFloor: null,
    });
  });

  it('parses all dev mode params', () => {
    mockUrl('http://localhost:3000/?devMode=true&xpMultiplier=5&playerAttack=30&playerDefense=15&gold=500&startFloor=2');
    const params = getDevModeParams();
    expect(params).toEqual({
      enabled: true,
      xpMultiplier: 5,
      attackOverride: 30,
      defenseOverride: 15,
      goldOverride: 500,
      startFloor: 2,
    });
  });

  it('ignores params when devMode is not true', () => {
    mockUrl('http://localhost:3000/?xpMultiplier=5&playerAttack=30');
    const params = getDevModeParams();
    expect(params.enabled).toBe(false);
    expect(params.xpMultiplier).toBe(1);
  });
});
