import { describe, it, expect, beforeEach } from 'vitest';
import { generateShopCards } from '../actions/shop';
import { useGameStore } from '../gameStore';
import type { GameState } from '@/types/game';

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
