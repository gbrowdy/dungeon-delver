import { Stats, Player, Enemy, Item, Power } from '@/types/game';

/**
 * Type guards and validation utilities for game types
 */

// Valid stat keys for type-safe stat manipulation
export const VALID_STAT_KEYS: ReadonlyArray<keyof Stats> = [
  'health',
  'maxHealth',
  'power',
  'armor',
  'speed',
  'fortune',
  'mana',
  'maxMana',
] as const;

/**
 * Type guard to check if a string is a valid Stats key
 */
export function isValidStatKey(key: string): key is keyof Stats {
  return VALID_STAT_KEYS.includes(key as keyof Stats);
}

/**
 * Type guard to check if a value is a valid stat value (number, not NaN)
 */
export function isValidStatValue(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Type guard for Player
 */
export function isPlayer(value: unknown): value is Player {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['name'] === 'string' &&
    typeof obj['class'] === 'string' &&
    typeof obj['level'] === 'number' &&
    obj['baseStats'] !== null &&
    obj['currentStats'] !== null &&
    Array.isArray(obj['powers']) &&
    Array.isArray(obj['inventory']) &&
    Array.isArray(obj['equippedItems'])
  );
}

/**
 * Type guard for Enemy
 */
export function isEnemy(value: unknown): value is Enemy {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['health'] === 'number' &&
    typeof obj['maxHealth'] === 'number' &&
    typeof obj['power'] === 'number' &&
    typeof obj['armor'] === 'number'
  );
}

/**
 * Type guard for Item
 */
export function isItem(value: unknown): value is Item {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['type'] === 'string' &&
    typeof obj['rarity'] === 'string' &&
    obj['statBonus'] !== null &&
    typeof obj['statBonus'] === 'object'
  );
}

/**
 * Type guard for Power
 */
export function isPower(value: unknown): value is Power {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['manaCost'] === 'number' &&
    typeof obj['cooldown'] === 'number' &&
    typeof obj['effect'] === 'string'
  );
}

/**
 * Safely apply a stat bonus to a stats object
 * Returns true if successful, false if validation failed
 */
export function safeApplyStatBonus(
  stats: Stats,
  key: string,
  value: unknown
): boolean {
  if (!isValidStatKey(key)) {
    console.warn(`Invalid stat key: ${key}`);
    return false;
  }
  if (!isValidStatValue(value)) {
    console.warn(`Invalid stat value for ${key}: ${value}`);
    return false;
  }
  stats[key] += value;
  return true;
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Safely get a value from an array with bounds checking
 */
export function safeArrayAccess<T>(arr: T[], index: number): T | undefined {
  if (index < 0 || index >= arr.length) {
    return undefined;
  }
  return arr[index];
}

/**
 * Assert that a value is non-null/undefined, throwing if it is
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value is null or undefined'
): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

/**
 * Exhaustiveness check helper - use in switch default case to ensure
 * all cases are handled. TypeScript will error if a case is missed.
 *
 * @example
 * switch (value) {
 *   case 'a': return 1;
 *   case 'b': return 2;
 *   default: return assertNever(value); // Error if value can be 'c'
 * }
 */
export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${value}`);
}

/**
 * Type-safe object keys helper
 */
export function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Type-safe object entries helper
 */
export function typedEntries<T extends object>(
  obj: T
): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}
