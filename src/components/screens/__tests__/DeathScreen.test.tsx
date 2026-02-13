import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeathScreen } from '../DeathScreen';
import { useGameStore } from '@/store/gameStore';

describe('DeathScreen', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({
      phase: 'death',
      floor: 12,
      checkpoint: 10,
      lastDeathStats: {
        floor: 12,
        room: 3,
        enemyTier: 'rare',
        enemyModifiers: ['armored'],
        playerStats: { power: 148, fortitude: 107, speed: 16, luck: 12 },
        enemyStats: { power: 89, fortitude: 142, speed: 10 },
        playerDamagePerHit: 28,
        enemyDamagePerHit: 41,
        weaknessHint: 'Your Power was 42% below the enemy Fortitude. Consider prioritizing Power picks or DoT weapons against Armored enemies.',
      },
      player: {
        power: 148, fortitude: 107, speed: 16, luck: 12,
        basePower: 148, baseSpeed: 16,
        hp: 0, maxHp: 635, attackTimer: 0,
        statusEffects: [],
      },
    });
  });

  it('shows defeated heading', () => {
    render(<DeathScreen />);
    expect(screen.getByText(/Defeated/)).toBeDefined();
  });

  it('shows floor and room', () => {
    render(<DeathScreen />);
    expect(screen.getByText(/Floor 12, Room 3/)).toBeDefined();
  });

  it('shows enemy info', () => {
    render(<DeathScreen />);
    expect(screen.getByText(/Rare/i)).toBeDefined();
    expect(screen.getAllByText(/Armored/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows stat comparison', () => {
    render(<DeathScreen />);
    expect(screen.getByText(/148/)).toBeDefined(); // player power
    expect(screen.getByText(/89/)).toBeDefined();  // enemy power
  });

  it('shows weakness hint', () => {
    render(<DeathScreen />);
    expect(screen.getByText(/Power was 42% below/)).toBeDefined();
  });

  it('respawn button calls respawnAtCheckpoint', () => {
    render(<DeathScreen />);
    fireEvent.click(screen.getByText(/Respawn at Floor 10/));
    expect(useGameStore.getState().phase).toBe('combat');
  });
});
