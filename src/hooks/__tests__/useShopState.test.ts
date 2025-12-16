import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShopState } from '../useShopState';
import { Player, CharacterClass } from '@/types/game';
import { CircularBuffer } from '@/utils/circularBuffer';

// Mock player for testing
const createMockPlayer = (gold: number = 100): Player => ({
  name: 'Test Hero',
  class: 'warrior' as CharacterClass,
  level: 1,
  experience: 0,
  experienceToNext: 100,
  gold,
  baseStats: {
    health: 100,
    maxHealth: 100,
    power: 10,
    armor: 5,
    speed: 10,
    mana: 50,
    maxMana: 50,
    fortune: 5,
  },
  currentStats: {
    health: 100,
    maxHealth: 100,
    power: 10,
    armor: 5,
    speed: 10,
    mana: 50,
    maxMana: 50,
    fortune: 5,
  },
  powers: [],
  inventory: [],
  equippedItems: [],
  activeBuffs: [],
  statusEffects: [],
  isBlocking: false,
  comboCount: 0,
  lastPowerUsed: null,
  path: null,
  pendingAbilityChoice: false,
});

describe('useShopState', () => {
  it('should initialize with empty shop state', () => {
    const { result } = renderHook(() => useShopState());

    expect(result.current.shopState.starterGear).toEqual([]);
    expect(result.current.shopState.classGear).toEqual([]);
    expect(result.current.shopState.todaysSelection).toEqual([]);
    expect(result.current.shopState.legendary).toBeNull();
    expect(result.current.shopState.purchasedItems).toEqual([]);
  });

  it('should initialize shop with correct items', () => {
    const { result } = renderHook(() => useShopState());

    act(() => {
      result.current.initializeShop('warrior', null, 1, 12345);
    });

    // Should have 3 starter items
    expect(result.current.shopState.starterGear).toHaveLength(3);

    // Should have 3 class items (base warrior gear)
    expect(result.current.shopState.classGear).toHaveLength(3);

    // Should have 2-3 specialty items
    expect(result.current.shopState.todaysSelection.length).toBeGreaterThanOrEqual(2);
    expect(result.current.shopState.todaysSelection.length).toBeLessThanOrEqual(3);

    // Should NOT have legendary at floor 1
    expect(result.current.shopState.legendary).toBeNull();
  });

  it('should show legendary items at floor 3+', () => {
    const { result } = renderHook(() => useShopState());

    act(() => {
      result.current.initializeShop('warrior', null, 3, 12345);
    });

    // Should have legendary at floor 3
    expect(result.current.shopState.legendary).not.toBeNull();
    expect(result.current.shopState.legendary?.tier).toBe('legendary');
  });

  it('should use seeded random for deterministic rotation', () => {
    const { result: result1 } = renderHook(() => useShopState());
    const { result: result2 } = renderHook(() => useShopState());

    // Initialize with same seed
    act(() => {
      result1.current.initializeShop('warrior', null, 3, 12345);
    });

    act(() => {
      result2.current.initializeShop('warrior', null, 3, 12345);
    });

    // Should have same specialty items
    expect(result1.current.shopState.todaysSelection).toEqual(
      result2.current.shopState.todaysSelection
    );

    // Should have same legendary
    expect(result1.current.shopState.legendary?.id).toBe(
      result2.current.shopState.legendary?.id
    );
  });

  it('should use different items with different seeds', () => {
    const { result: result1 } = renderHook(() => useShopState());
    const { result: result2 } = renderHook(() => useShopState());

    act(() => {
      result1.current.initializeShop('warrior', null, 3, 12345);
    });

    act(() => {
      result2.current.initializeShop('warrior', null, 3, 67890);
    });

    // Should likely have different specialty items (could be same by chance, but very unlikely)
    const items1 = result1.current.shopState.todaysSelection.map((i) => i.id);
    const items2 = result2.current.shopState.todaysSelection.map((i) => i.id);
    expect(items1).not.toEqual(items2);
  });

  it('should update class gear when path is selected', () => {
    const { result } = renderHook(() => useShopState());

    // Initialize with warrior class, no path
    act(() => {
      result.current.initializeShop('warrior', null, 1, 12345);
    });

    const baseGearIds = result.current.shopState.classGear.map((i) => i.id);

    // Select berserker path
    act(() => {
      result.current.updateShopForPath('berserker');
    });

    const pathGearIds = result.current.shopState.classGear.map((i) => i.id);

    // Gear should have changed
    expect(pathGearIds).not.toEqual(baseGearIds);

    // Should still have 3 items
    expect(result.current.shopState.classGear).toHaveLength(3);
  });

  it('should successfully purchase affordable item', () => {
    const { result } = renderHook(() => useShopState());
    const player = createMockPlayer(100); // 100 gold

    act(() => {
      result.current.initializeShop('warrior', null, 1, 12345);
    });

    const itemToPurchase = result.current.shopState.starterGear[0];

    let purchaseResult;
    act(() => {
      purchaseResult = result.current.purchaseItem(itemToPurchase.id, player);
    });

    expect(purchaseResult.success).toBe(true);
    expect(purchaseResult.item).toBeDefined();
    expect(purchaseResult.item?.id).toBe(itemToPurchase.id);
    expect(result.current.isItemPurchased(itemToPurchase.id)).toBe(true);
  });

  it('should fail to purchase item without enough gold', () => {
    const { result } = renderHook(() => useShopState());
    const player = createMockPlayer(10); // Only 10 gold

    act(() => {
      result.current.initializeShop('warrior', null, 1, 12345);
    });

    const itemToPurchase = result.current.shopState.starterGear[0]; // 50g

    let purchaseResult;
    act(() => {
      purchaseResult = result.current.purchaseItem(itemToPurchase.id, player);
    });

    expect(purchaseResult.success).toBe(false);
    expect(purchaseResult.item).toBeUndefined();
    expect(result.current.isItemPurchased(itemToPurchase.id)).toBe(false);
  });

  it('should fail to purchase already purchased item', () => {
    const { result } = renderHook(() => useShopState());
    const player = createMockPlayer(200); // Plenty of gold

    act(() => {
      result.current.initializeShop('warrior', null, 1, 12345);
    });

    const itemToPurchase = result.current.shopState.starterGear[0];

    // Purchase once
    act(() => {
      result.current.purchaseItem(itemToPurchase.id, player);
    });

    // Try to purchase again
    let secondPurchase;
    act(() => {
      secondPurchase = result.current.purchaseItem(itemToPurchase.id, player);
    });

    expect(secondPurchase.success).toBe(false);
    expect(secondPurchase.message).toContain('already purchased');
  });

  it('should correctly check if player can afford items', () => {
    const { result } = renderHook(() => useShopState());

    act(() => {
      result.current.initializeShop('warrior', null, 1, 12345);
    });

    const starterItem = result.current.shopState.starterGear[0]; // 45g

    expect(result.current.canAfford(starterItem.id, 100)).toBe(true);
    expect(result.current.canAfford(starterItem.id, 45)).toBe(true);
    expect(result.current.canAfford(starterItem.id, 44)).toBe(false);
  });

  it('should get items for display based on floor', () => {
    const { result } = renderHook(() => useShopState());

    act(() => {
      result.current.initializeShop('warrior', null, 3, 12345);
    });

    // Floor 1: no legendary
    const floor1Items = result.current.getShopItemsForDisplay(1);
    expect(floor1Items.legendary).toBeNull();

    // Floor 3: legendary shown
    const floor3Items = result.current.getShopItemsForDisplay(3);
    expect(floor3Items.legendary).not.toBeNull();
    expect(floor3Items.starter).toHaveLength(3);
    expect(floor3Items.class).toHaveLength(3);
    expect(floor3Items.specialty.length).toBeGreaterThanOrEqual(2);
  });

  it('should initialize with path-specific gear if path is provided', () => {
    const { result } = renderHook(() => useShopState());

    // Initialize with berserker path already selected
    act(() => {
      result.current.initializeShop('warrior', 'berserker', 1, 12345);
    });

    const gearIds = result.current.shopState.classGear.map((i) => i.id);

    // Should have berserker-specific items
    expect(gearIds).toContain('berserker_blade');
  });
});
