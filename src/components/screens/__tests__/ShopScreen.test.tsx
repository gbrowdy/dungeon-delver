// src/components/screens/__tests__/ShopScreen.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShopScreen } from '../ShopScreen';
import { useGameStore } from '@/store/gameStore';

describe('ShopScreen', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({
      phase: 'shop',
      floor: 5,
      player: {
        power: 100, fortitude: 80, speed: 12, luck: 8,
        basePower: 100, baseSpeed: 12,
        hp: 500, maxHp: 500, attackTimer: 2000,
        statusEffects: [],
      },
      shopCards: [
        { type: 'stat_boost', stat: 'power', statValue: 18 },
        { type: 'stat_boost', stat: 'fortitude', statValue: 14 },
        { type: 'item', itemId: 'venomous_fang' },
        { type: 'stat_boost', stat: 'speed', statValue: 2 },
        { type: 'item', itemId: 'thorned_mail' },
      ],
      selectedChoices: [],
    });
  });

  it('renders "Choose 2 Rewards" heading', () => {
    render(<ShopScreen />);
    expect(screen.getByText(/Choose 2 Rewards/)).toBeDefined();
  });

  it('renders all 5 shop cards', () => {
    render(<ShopScreen />);
    expect(screen.getByText('+18')).toBeDefined();
    expect(screen.getByText('Venomous Fang')).toBeDefined();
    expect(screen.getByText('Thorned Mail')).toBeDefined();
  });

  it('allows selecting up to 2 cards', () => {
    render(<ShopScreen />);
    // Select first two stat cards
    fireEvent.click(screen.getByText('+18').closest('button')!);
    fireEvent.click(screen.getByText('+14').closest('button')!);
    expect(useGameStore.getState().selectedChoices).toEqual([0, 1]);
  });

  it('confirm applies selections and transitions to floor-complete', () => {
    useGameStore.setState({ selectedChoices: [0, 1] });
    render(<ShopScreen />);
    fireEvent.click(screen.getByText('Confirm'));
    const state = useGameStore.getState();
    expect(state.phase).toBe('floor-complete');
    expect(state.player.power).toBe(118); // +18 power applied
  });
});
