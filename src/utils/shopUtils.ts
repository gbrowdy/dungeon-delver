// src/utils/shopUtils.ts
/**
 * Shop utility for generating shop state.
 * Extracted from useShopState for use with ECS architecture.
 */

import { ShopState, ShopItem } from '@/types/shop';
import { CharacterClass } from '@/types/game';
import { STARTER_GEAR } from '@/data/shop/starterGear';
import { CLASS_GEAR } from '@/data/shop/classGear';
import { SPECIALTY_ITEMS } from '@/data/shop/specialtyItems';
import { LEGENDARY_ITEMS } from '@/data/shop/legendaryItems';
import { SHOP_UNLOCKS } from '@/types/shop';

/**
 * Seeded random number generator (LCG - Linear Congruential Generator)
 * Provides deterministic randomness for shop rotation
 */
class SeededRandom {
  private seed: number;
  private readonly a = 1103515245;
  private readonly c = 12345;
  private readonly m = 2147483648;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

/**
 * Generate shop state for a given floor and character class.
 * This is a pure function - no React state involved.
 *
 * @param floor Current floor number
 * @param characterClass Player's character class
 * @param pathId Optional path ID for path-specific gear
 * @param seed Optional seed for deterministic generation (defaults to floor * 1000 + class code)
 */
export function generateShopState(
  floor: number,
  characterClass: CharacterClass,
  pathId?: string | null,
  seed?: number
): ShopState {
  const actualSeed = seed ?? floor * 1000 + characterClass.charCodeAt(0);
  const rng = new SeededRandom(actualSeed);

  // 1. Starter gear (always same 3 items)
  const starterGear = [...STARTER_GEAR];

  // 2. Class gear based on class and path
  const classGearSet = CLASS_GEAR[characterClass];
  let classGear: ShopItem[];

  if (pathId && classGearSet.paths[pathId]) {
    classGear = [...classGearSet.paths[pathId]];
  } else {
    classGear = [...classGearSet.base];
  }

  // 3. Select 2-3 random specialty items
  const shuffledSpecialty = rng.shuffle(SPECIALTY_ITEMS);
  const specialtyCount = rng.nextInt(2, 4);
  const todaysSelection = shuffledSpecialty.slice(0, specialtyCount);

  // 4. Select 1 random legendary (only if floor >= 3)
  let legendary: ShopItem | null = null;
  if (floor >= SHOP_UNLOCKS.legendary) {
    const shuffledLegendary = rng.shuffle(LEGENDARY_ITEMS);
    legendary = shuffledLegendary[0];
  }

  return {
    starterGear,
    classGear,
    todaysSelection,
    legendary,
    purchasedItems: [],
  };
}
