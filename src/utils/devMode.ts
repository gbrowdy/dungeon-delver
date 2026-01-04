/**
 * Dev mode utilities for E2E testing.
 * Reads URL params to modify game behavior for faster test execution.
 *
 * Usage: Add ?devMode=true&xpMultiplier=5&playerAttack=30 to URL
 */

export interface DevModeParams {
  enabled: boolean;
  xpMultiplier: number;
  attackOverride: number | null;
  defenseOverride: number | null;
  goldOverride: number | null;
  startFloor: number | null;
}

const defaultParams: DevModeParams = {
  enabled: false,
  xpMultiplier: 1,
  attackOverride: null,
  defenseOverride: null,
  goldOverride: null,
  startFloor: null,
};

// Cached params to avoid re-parsing
let cachedParams: DevModeParams | null = null;

/**
 * Check if dev mode is enabled via URL param.
 */
export function isDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('devMode') === 'true';
}

/**
 * Get all dev mode parameters.
 * Returns defaults if dev mode is not enabled.
 */
export function getDevModeParams(): DevModeParams {
  if (cachedParams) return cachedParams;

  if (!isDevMode()) {
    cachedParams = { ...defaultParams };
    return cachedParams;
  }

  const params = new URLSearchParams(window.location.search);

  const parseNumber = (key: string): number | null => {
    const value = params.get(key);
    if (!value) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  };

  cachedParams = {
    enabled: true,
    xpMultiplier: parseNumber('xpMultiplier') ?? 1,
    attackOverride: parseNumber('playerAttack'),
    defenseOverride: parseNumber('playerDefense'),
    goldOverride: parseNumber('gold'),
    startFloor: parseNumber('startFloor'),
  };

  return cachedParams;
}

/**
 * Clear cached params. Used in tests.
 */
export function clearDevModeCache(): void {
  cachedParams = null;
}
