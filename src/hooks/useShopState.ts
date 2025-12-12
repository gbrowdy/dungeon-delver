import { useState, useCallback } from 'react';
import { ShopState, ShopItem } from '@/types/shop';
import { CharacterClass, Player, Item } from '@/types/game';
import { STARTER_GEAR } from '@/data/shop/starterGear';
import { CLASS_GEAR } from '@/data/shop/classGear';
import { SPECIALTY_ITEMS } from '@/data/shop/specialtyItems';
import { LEGENDARY_ITEMS } from '@/data/shop/legendaryItems';
import { SHOP_UNLOCKS } from '@/types/shop';

/**
 * Seeded random number generator (LCG - Linear Congruential Generator)
 * Provides deterministic randomness for shop rotation
 *
 * Uses the formula: next = (a * seed + c) % m
 * - a = 1103515245 (multiplier from glibc)
 * - c = 12345 (increment from glibc)
 * - m = 2^31 (modulus)
 */
class SeededRandom {
  private seed: number;
  private readonly a = 1103515245;
  private readonly c = 12345;
  private readonly m = 2147483648; // 2^31

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Get next random number between 0 and 1
   */
  next(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m;
  }

  /**
   * Get random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm with seeded random
   */
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
 * Convert ShopItem to Item format for player equipment
 */
function convertShopItemToItem(shopItem: ShopItem): Item {
  return {
    id: shopItem.id,
    name: shopItem.name,
    type: shopItem.type,
    rarity: 'legendary', // Shop items are always legendary tier for now
    statBonus: shopItem.stats,
    description: shopItem.description,
    icon: shopItem.icon,
    effect: shopItem.effect,
    enhancementLevel: 0,
    maxEnhancement: 3,
    tier: shopItem.tier,
  };
}

/**
 * Initial shop state
 */
const INITIAL_SHOP_STATE: ShopState = {
  starterGear: [],
  classGear: [],
  todaysSelection: [],
  legendary: null,
  purchasedItems: [],
};

export interface PurchaseResult {
  success: boolean;
  message: string;
  item?: Item;
}

export interface UseShopStateResult {
  shopState: ShopState;
  initializeShop: (
    characterClass: CharacterClass,
    pathId: string | null,
    currentFloor: number,
    seed?: number
  ) => void;
  updateShopForPath: (pathId: string) => void;
  purchaseItem: (itemId: string, player: Player) => PurchaseResult;
  canAfford: (itemId: string, playerGold: number) => boolean;
  isItemPurchased: (itemId: string) => boolean;
  getItemById: (itemId: string) => ShopItem | undefined;
  getShopItemsForDisplay: (currentFloor: number) => {
    starter: ShopItem[];
    class: ShopItem[];
    specialty: ShopItem[];
    legendary: ShopItem | null;
  };
}

/**
 * Hook to manage shop state, rotation, and purchases
 *
 * Handles:
 * - Shop initialization with class-specific gear
 * - Seeded random rotation for specialty and legendary items
 * - Path-based class gear updates
 * - Purchase validation and processing
 * - Item availability based on floor progression
 */
export function useShopState(): UseShopStateResult {
  const [shopState, setShopState] = useState<ShopState>(INITIAL_SHOP_STATE);

  /**
   * Initialize shop with starter gear, class gear, and random rotation
   */
  const initializeShop = useCallback(
    (
      characterClass: CharacterClass,
      pathId: string | null,
      currentFloor: number,
      seed: number = Date.now()
    ) => {
      const rng = new SeededRandom(seed);

      // 1. Load starter gear (always same 3 items)
      const starterGear = [...STARTER_GEAR];

      // 2. Load class gear based on class and path
      const classGearSet = CLASS_GEAR[characterClass];
      let classGear: ShopItem[];

      if (pathId && classGearSet.paths[pathId]) {
        // Use path-specific gear if path is chosen
        classGear = [...classGearSet.paths[pathId]];
      } else {
        // Use base class gear if no path chosen yet
        classGear = [...classGearSet.base];
      }

      // 3. Select 2-3 random specialty items
      const shuffledSpecialty = rng.shuffle(SPECIALTY_ITEMS);
      const specialtyCount = rng.nextInt(2, 4); // 2 or 3 items
      const todaysSelection = shuffledSpecialty.slice(0, specialtyCount);

      // 4. Select 1 random legendary (only if floor >= 3)
      let legendary: ShopItem | null = null;
      if (currentFloor >= SHOP_UNLOCKS.legendary) {
        const shuffledLegendary = rng.shuffle(LEGENDARY_ITEMS);
        legendary = shuffledLegendary[0];
      }

      setShopState({
        starterGear,
        classGear,
        todaysSelection,
        legendary,
        purchasedItems: [],
      });
    },
    []
  );

  /**
   * Update class gear when player chooses a path
   * Replaces base class gear with path-specific gear
   */
  const updateShopForPath = useCallback((pathId: string) => {
    setShopState((prev) => {
      // Find the current class by checking which class the current gear belongs to
      let characterClass: CharacterClass | null = null;
      for (const [className, gearSet] of Object.entries(CLASS_GEAR)) {
        if (
          gearSet.base.some((item) =>
            prev.classGear.some((prevItem) => prevItem.id === item.id)
          )
        ) {
          characterClass = className as CharacterClass;
          break;
        }
      }

      if (!characterClass) {
        console.warn('Could not determine character class for path update');
        return prev;
      }

      const classGearSet = CLASS_GEAR[characterClass];
      const pathGear = classGearSet.paths[pathId];

      if (!pathGear) {
        console.warn(`Path gear not found for pathId: ${pathId}`);
        return prev;
      }

      return {
        ...prev,
        classGear: [...pathGear],
      };
    });
  }, []);

  /**
   * Get item by ID from all shop sections
   */
  const getItemById = useCallback(
    (itemId: string): ShopItem | undefined => {
      // Check all shop sections
      const allItems = [
        ...shopState.starterGear,
        ...shopState.classGear,
        ...shopState.todaysSelection,
        ...(shopState.legendary ? [shopState.legendary] : []),
      ];

      return allItems.find((item) => item.id === itemId);
    },
    [shopState]
  );

  /**
   * Check if an item has been purchased
   */
  const isItemPurchased = useCallback(
    (itemId: string): boolean => {
      return shopState.purchasedItems.includes(itemId);
    },
    [shopState.purchasedItems]
  );

  /**
   * Check if player can afford an item
   */
  const canAfford = useCallback(
    (itemId: string, playerGold: number): boolean => {
      const item = getItemById(itemId);
      if (!item) return false;
      return playerGold >= item.price;
    },
    [getItemById]
  );

  /**
   * Purchase an item from the shop
   * Validates affordability, deducts gold, and adds item to player
   */
  const purchaseItem = useCallback(
    (itemId: string, player: Player): PurchaseResult => {
      const item = getItemById(itemId);

      if (!item) {
        return {
          success: false,
          message: 'Item not found',
        };
      }

      // Check if already purchased
      if (shopState.purchasedItems.includes(itemId)) {
        return {
          success: false,
          message: 'Item already purchased',
        };
      }

      // Check if player can afford
      if (player.gold < item.price) {
        return {
          success: false,
          message: `Not enough gold. Need ${item.price}g, have ${player.gold}g`,
        };
      }

      // Mark as purchased
      setShopState((prev) => ({
        ...prev,
        purchasedItems: [...prev.purchasedItems, itemId],
      }));

      // Convert to Item and return
      const convertedItem = convertShopItemToItem(item);

      return {
        success: true,
        message: `Purchased ${item.name} for ${item.price}g`,
        item: convertedItem,
      };
    },
    [getItemById, shopState.purchasedItems]
  );

  /**
   * Get shop items organized by section for display
   * Respects floor unlock requirements (legendary only at floor 3+)
   */
  const getShopItemsForDisplay = useCallback(
    (currentFloor: number) => {
      return {
        starter: shopState.starterGear,
        class: shopState.classGear,
        specialty: shopState.todaysSelection,
        legendary:
          currentFloor >= SHOP_UNLOCKS.legendary ? shopState.legendary : null,
      };
    },
    [shopState]
  );

  return {
    shopState,
    initializeShop,
    updateShopForPath,
    purchaseItem,
    canAfford,
    isItemPurchased,
    getItemById,
    getShopItemsForDisplay,
  };
}
