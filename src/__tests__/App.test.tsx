import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { useGameStore } from '@/store/gameStore';

describe('App phase router', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useGameStore.getState().resetGame();
  });

  it('renders MainMenu when phase is menu', () => {
    render(<App />);
    expect(screen.getByText('Start Game')).toBeDefined();
  });

  it('renders ClassSelect when phase is class-select', () => {
    useGameStore.setState({ phase: 'class-select' });
    render(<App />);
    expect(screen.getByText('Class Select')).toBeDefined();
  });

  it('renders CombatScreen when phase is combat', () => {
    useGameStore.setState({ phase: 'combat' });
    render(<App />);
    expect(screen.getByText('Combat')).toBeDefined();
  });

  it('renders DraftScreen when phase is draft', () => {
    useGameStore.setState({ phase: 'draft' });
    render(<App />);
    expect(screen.getByText('Draft Pick')).toBeDefined();
  });

  it('renders ShopScreen when phase is shop', () => {
    useGameStore.setState({ phase: 'shop' });
    render(<App />);
    expect(screen.getByText('Boss Shop')).toBeDefined();
  });

  it('renders FloorComplete when phase is floor-complete', () => {
    useGameStore.setState({ phase: 'floor-complete' });
    render(<App />);
    expect(screen.getByText('Floor Complete')).toBeDefined();
  });

  it('renders DeathScreen when phase is death', () => {
    useGameStore.setState({ phase: 'death' });
    render(<App />);
    expect(screen.getByText('Defeated')).toBeDefined();
  });

  it('renders EndlessIntro when phase is endless-intro', () => {
    useGameStore.setState({ phase: 'endless-intro' });
    render(<App />);
    expect(screen.getByText('Endless Mode')).toBeDefined();
  });

  it('renders EndlessDefeat when phase is endless-defeat', () => {
    useGameStore.setState({ phase: 'endless-defeat' });
    render(<App />);
    expect(screen.getByText('Endless Defeat')).toBeDefined();
  });
});
