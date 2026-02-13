import { describe, it, expect, beforeEach } from 'vitest';
import { generateShopCards } from '../actions/shop';
import { useGameStore } from '../gameStore';
import type { GameState, ShopCard } from '@/types/game';

function createCombatState(): GameState {
  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.getState().selectClass('warrior');
  useGameStore.getState().startRun();
  return useGameStore.getState();
}

// ─── generateShopCards ──────────────────────────────────────────

describe('generateShopCards', () => {
  it('returns exactly 5 cards', () => {
    const state = createCombatState();
    const cards = generateShopCards(state);
    expect(cards).toHaveLength(5);
  });

  it('includes at least 1 item card', () => {
    const state = createCombatState();
    // Run multiple times to verify
    for (let i = 0; i < 20; i++) {
      const cards = generateShopCards(state);
      const itemCards = cards.filter(c => c.type === 'item');
      expect(itemCards.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('stat_boost cards have stat and value', () => {
    const state = createCombatState();
    const cards = generateShopCards(state);
    const statCards = cards.filter(c => c.type === 'stat_boost');

    for (const card of statCards) {
      expect(card.stat).toBeDefined();
      expect(card.statValue).toBeGreaterThan(0);
    }
  });

  it('item cards have itemId', () => {
    const state = createCombatState();
    const cards = generateShopCards(state);
    const itemCards = cards.filter(c => c.type === 'item');

    for (const card of itemCards) {
      expect(card.itemId).toBeDefined();
    }
  });

  it('can offer tier upgrade for equipped items', () => {
    const state = createCombatState();
    state.equippedItems.weapon = { id: 'heavy_cleaver', slot: 'weapon', tier: 1 };

    // Run multiple times — upgrade should appear eventually
    let foundUpgrade = false;
    for (let i = 0; i < 50; i++) {
      const cards = generateShopCards(state);
      if (cards.some(c => c.isUpgrade)) {
        foundUpgrade = true;
        break;
      }
    }
    // Upgrade should be possible (not guaranteed every time)
    expect(foundUpgrade).toBe(true);
  });
});

// ─── shop store actions ─────────────────────────────────────────

describe('shop store actions', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
  });

  it('openShop generates cards and sets phase', () => {
    useGameStore.getState().openShop();

    const state = useGameStore.getState();
    expect(state.phase).toBe('shop');
    expect(state.shopCards).toHaveLength(5);
    expect(state.selectedChoices).toEqual([]);
  });

  it('selectShopCard selects up to 2 cards', () => {
    useGameStore.getState().openShop();
    useGameStore.getState().selectShopCard(0);
    useGameStore.getState().selectShopCard(2);

    expect(useGameStore.getState().selectedChoices).toEqual([0, 2]);
  });

  it('selectShopCard toggles off if already selected', () => {
    useGameStore.getState().openShop();
    useGameStore.getState().selectShopCard(0);
    useGameStore.getState().selectShopCard(0);

    expect(useGameStore.getState().selectedChoices).toEqual([]);
  });

  it('selectShopCard does not allow more than 2', () => {
    useGameStore.getState().openShop();
    useGameStore.getState().selectShopCard(0);
    useGameStore.getState().selectShopCard(1);
    useGameStore.getState().selectShopCard(2); // should not add

    expect(useGameStore.getState().selectedChoices).toHaveLength(2);
  });

  it('confirmShop applies stat boosts', () => {
    useGameStore.getState().openShop();
    const state = useGameStore.getState();

    // Set up known cards
    state.shopCards = [
      { type: 'stat_boost', stat: 'power', statValue: 10 },
      { type: 'stat_boost', stat: 'fortitude', statValue: 8 },
      { type: 'item', itemId: 'heavy_cleaver' },
      { type: 'stat_boost', stat: 'speed', statValue: 1 },
      { type: 'stat_boost', stat: 'luck', statValue: 2 },
    ];

    const powerBefore = state.player.power;
    const fortBefore = state.player.fortitude;

    useGameStore.getState().selectShopCard(0);
    useGameStore.getState().selectShopCard(1);
    useGameStore.getState().confirmShop();

    expect(useGameStore.getState().player.power).toBe(powerBefore + 10);
    expect(useGameStore.getState().player.fortitude).toBe(fortBefore + 8);
  });

  it('confirmShop equips item', () => {
    useGameStore.getState().openShop();
    const state = useGameStore.getState();

    state.shopCards = [
      { type: 'item', itemId: 'heavy_cleaver' },
      { type: 'stat_boost', stat: 'power', statValue: 5 },
      { type: 'stat_boost', stat: 'speed', statValue: 1 },
      { type: 'stat_boost', stat: 'luck', statValue: 2 },
      { type: 'stat_boost', stat: 'fortitude', statValue: 5 },
    ];

    useGameStore.getState().selectShopCard(0);
    useGameStore.getState().selectShopCard(1);
    useGameStore.getState().confirmShop();

    expect(useGameStore.getState().equippedItems.weapon).not.toBeNull();
    expect(useGameStore.getState().equippedItems.weapon!.id).toBe('heavy_cleaver');
  });

  it('confirmShop upgrades existing item tier', () => {
    useGameStore.getState().openShop();
    const state = useGameStore.getState();
    state.equippedItems.weapon = { id: 'heavy_cleaver', slot: 'weapon', tier: 1 };

    state.shopCards = [
      { type: 'item', itemId: 'heavy_cleaver', isUpgrade: true },
      { type: 'stat_boost', stat: 'power', statValue: 5 },
      { type: 'stat_boost', stat: 'speed', statValue: 1 },
      { type: 'stat_boost', stat: 'luck', statValue: 2 },
      { type: 'stat_boost', stat: 'fortitude', statValue: 5 },
    ];

    useGameStore.getState().selectShopCard(0);
    useGameStore.getState().selectShopCard(1);
    useGameStore.getState().confirmShop();

    expect(useGameStore.getState().equippedItems.weapon!.tier).toBe(2);
  });

  it('confirmShop transitions to floor-complete', () => {
    useGameStore.getState().openShop();
    const state = useGameStore.getState();
    state.shopCards = [
      { type: 'stat_boost', stat: 'power', statValue: 5 },
      { type: 'stat_boost', stat: 'speed', statValue: 1 },
      { type: 'stat_boost', stat: 'luck', statValue: 2 },
      { type: 'stat_boost', stat: 'fortitude', statValue: 5 },
      { type: 'item', itemId: 'heavy_cleaver' },
    ];

    useGameStore.getState().selectShopCard(0);
    useGameStore.getState().selectShopCard(1);
    useGameStore.getState().confirmShop();

    expect(useGameStore.getState().phase).toBe('floor-complete');
  });

  it('confirmShop works with 1 selection', () => {
    useGameStore.getState().openShop();
    const state = useGameStore.getState();
    state.shopCards = [
      { type: 'stat_boost', stat: 'power', statValue: 10 },
      { type: 'stat_boost', stat: 'fortitude', statValue: 8 },
      { type: 'item', itemId: 'heavy_cleaver' },
      { type: 'stat_boost', stat: 'speed', statValue: 1 },
      { type: 'stat_boost', stat: 'luck', statValue: 2 },
    ];
    const powerBefore = state.player.power;

    useGameStore.getState().selectShopCard(0);
    useGameStore.getState().confirmShop();

    expect(useGameStore.getState().player.power).toBe(powerBefore + 10);
    expect(useGameStore.getState().phase).toBe('floor-complete');
  });

  it('confirmShop does nothing with 0 selections', () => {
    useGameStore.getState().openShop();

    const powerBefore = useGameStore.getState().player.power;
    useGameStore.getState().confirmShop();

    expect(useGameStore.getState().player.power).toBe(powerBefore);
    expect(useGameStore.getState().phase).toBe('shop');
  });
});
