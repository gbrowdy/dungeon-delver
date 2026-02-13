import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloorComplete } from '../FloorComplete';
import { useGameStore } from '@/store/gameStore';

describe('FloorComplete', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({
      phase: 'floor-complete',
      floor: 5,
      player: {
        power: 120, fortitude: 90, speed: 14, luck: 10,
        basePower: 120, baseSpeed: 14,
        hp: 550, maxHp: 550, attackTimer: 0,
        statusEffects: [],
      },
      classId: 'warrior',
      equippedItems: {
        weapon: { id: 'heavy_cleaver', slot: 'weapon', tier: 1 },
        armor: null,
        accessory: null,
      },
    });
  });

  it('shows floor complete message', () => {
    render(<FloorComplete />);
    expect(screen.getByText(/Floor 5 Complete/)).toBeDefined();
  });

  it('shows current stats', () => {
    render(<FloorComplete />);
    expect(screen.getByText(/Power/)).toBeDefined();
    expect(screen.getByText(/120/)).toBeDefined();
  });

  it('shows equipped items', () => {
    render(<FloorComplete />);
    expect(screen.getByText(/Heavy Cleaver/)).toBeDefined();
  });

  it('continue button calls advanceFloor', () => {
    render(<FloorComplete />);
    fireEvent.click(screen.getByText(/Continue to Floor 6/));
    expect(useGameStore.getState().floor).toBe(6);
    expect(useGameStore.getState().phase).toBe('combat');
  });
});
