import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraftScreen } from '../DraftScreen';
import { useGameStore } from '@/store/gameStore';

describe('DraftScreen', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({
      phase: 'draft',
      floor: 1,
      room: 1,
      roomsPerFloor: 3,
      player: {
        power: 100, fortitude: 80, speed: 12, luck: 8,
        basePower: 100, baseSpeed: 12,
        hp: 500, maxHp: 500, attackTimer: 2000,
        statusEffects: [],
      },
      draftChoices: [
        { stat: 'power', value: 15, impactPreview: '+11% damage' },
        { stat: 'fortitude', value: 12, impactPreview: '-8% dmg taken' },
        { stat: 'speed', value: 2, impactPreview: '-300ms interval' },
      ],
      selectedChoices: [],
    });
  });

  it('renders current stats bar', () => {
    render(<DraftScreen />);
    expect(screen.getByText(/Power: 100/)).toBeDefined();
    expect(screen.getByText(/Fortitude: 80/)).toBeDefined();
  });

  it('renders all 3 draft cards', () => {
    render(<DraftScreen />);
    expect(screen.getByText('+15')).toBeDefined();
    expect(screen.getByText('+12')).toBeDefined();
    expect(screen.getByText('+2')).toBeDefined();
  });

  it('selecting a card calls selectDraftCard', () => {
    render(<DraftScreen />);
    fireEvent.click(screen.getByText('+15').closest('button')!);
    expect(useGameStore.getState().selectedChoices).toEqual([0]);
  });

  it('confirm button calls confirmDraft', () => {
    useGameStore.setState({ selectedChoices: [0] });
    render(<DraftScreen />);
    fireEvent.click(screen.getByText('Confirm'));
    // confirmDraft applies the stat and transitions phase
    expect(useGameStore.getState().player.power).toBe(115);
  });

  it('confirm button is disabled with no selection', () => {
    render(<DraftScreen />);
    const btn = screen.getByText('Confirm');
    expect(btn.closest('button')?.disabled).toBe(true);
  });
});
