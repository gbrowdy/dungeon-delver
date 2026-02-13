import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CombatScreen } from '../CombatScreen';
import { useGameStore } from '@/store/gameStore';
import { generateEnemy } from '@/data/enemies';

function setupCombatState() {
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
    speedMultiplier: 1,
    paused: false,
    combatEvents: [],
  });
}

describe('CombatScreen', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    setupCombatState();
  });

  it('renders floor and room info', () => {
    render(<CombatScreen />);
    expect(screen.getByText(/Floor 1/)).toBeDefined();
    expect(screen.getByText(/Room 1/)).toBeDefined();
  });

  it('renders speed toggle', () => {
    render(<CombatScreen />);
    expect(screen.getByTestId('speed-toggle')).toBeDefined();
  });

  it('renders pause button', () => {
    render(<CombatScreen />);
    expect(screen.getByTestId('pause-toggle')).toBeDefined();
  });

  it('cycles speed on speed button click', () => {
    render(<CombatScreen />);
    fireEvent.click(screen.getByTestId('speed-toggle'));
    expect(useGameStore.getState().speedMultiplier).toBe(2);
  });

  it('toggles pause on pause button click', () => {
    render(<CombatScreen />);
    fireEvent.click(screen.getByTestId('pause-toggle'));
    expect(useGameStore.getState().paused).toBe(true);
  });

  it('renders player and enemy health bars', () => {
    render(<CombatScreen />);
    // HealthBar renders labels — there are two (player + enemy)
    const hpLabels = screen.getAllByText('HP');
    expect(hpLabels.length).toBe(2);
  });
});
