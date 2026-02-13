import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { useGameStore } from '@/store/gameStore';
import { generateEnemy } from '@/data/enemies';

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
    expect(screen.getByText('Choose Your Class')).toBeDefined();
  });

  it('renders CombatScreen when phase is combat', () => {
    const enemy = generateEnemy(1);
    useGameStore.setState({
      phase: 'combat',
      floor: 1,
      room: 1,
      roomsPerFloor: 2,
      classId: 'warrior',
      player: {
        power: 10, fortitude: 8, speed: 10, luck: 5,
        basePower: 10, baseSpeed: 10,
        hp: 140, maxHp: 140, attackTimer: 2500,
        statusEffects: [],
      },
      enemy: enemy.entity,
      enemyDefinition: { tier: enemy.tier, modifiers: enemy.modifiers },
    });
    render(<App />);
    expect(screen.getByText(/Floor 1/)).toBeDefined();
  });

  it('renders DraftScreen when phase is draft', () => {
    useGameStore.setState({ phase: 'draft' });
    render(<App />);
    expect(screen.getByText('Choose a Stat Boost')).toBeDefined();
  });

  it('renders ShopScreen when phase is shop', () => {
    useGameStore.setState({ phase: 'shop' });
    render(<App />);
    expect(screen.getByText('Boss Defeated')).toBeDefined();
  });

  it('renders FloorComplete when phase is floor-complete', () => {
    useGameStore.setState({ phase: 'floor-complete', floor: 3 });
    render(<App />);
    expect(screen.getByText(/Floor 3 Complete/)).toBeDefined();
  });

  it('renders DeathScreen when phase is death', () => {
    useGameStore.setState({ phase: 'death' });
    render(<App />);
    expect(screen.getByText('Defeated')).toBeDefined();
  });

  it('renders EndlessIntro when phase is endless-intro', () => {
    useGameStore.setState({ phase: 'endless-intro' });
    render(<App />);
    expect(screen.getByText('Floor 100 Complete')).toBeDefined();
  });

  it('renders EndlessDefeat when phase is endless-defeat', () => {
    useGameStore.setState({ phase: 'endless-defeat' });
    render(<App />);
    expect(screen.getByText('The Depths Claimed You')).toBeDefined();
  });
});
