// src/components/screens/__tests__/ClassSelect.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClassSelect } from '../ClassSelect';
import { useGameStore } from '@/store/gameStore';

describe('ClassSelect', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({ phase: 'class-select' });
  });

  it('renders all three class cards', () => {
    render(<ClassSelect />);
    expect(screen.getByText('Warrior')).toBeDefined();
    expect(screen.getByText('Rogue')).toBeDefined();
    expect(screen.getByText('Mage')).toBeDefined();
  });

  it('shows innate description for each class', () => {
    render(<ClassSelect />);
    expect(screen.getByText(/Toughness/)).toBeDefined();
    expect(screen.getByText(/Precision/)).toBeDefined();
    expect(screen.getByText(/Amplify/)).toBeDefined();
  });

  it('selecting a class highlights it', () => {
    render(<ClassSelect />);
    const warriorCard = screen.getByText('Warrior').closest('[data-testid]');
    fireEvent.click(warriorCard!);
    expect(warriorCard!.getAttribute('data-selected')).toBe('true');
  });

  it('confirm button calls selectClass and startRun', () => {
    render(<ClassSelect />);
    // Select warrior
    fireEvent.click(screen.getByText('Warrior').closest('[data-testid]')!);
    // Confirm
    fireEvent.click(screen.getByText('Begin Descent'));

    const state = useGameStore.getState();
    expect(state.classId).toBe('warrior');
    // startRun transitions to combat phase
    expect(state.phase).toBe('combat');
  });

  it('confirm button is disabled until a class is selected', () => {
    render(<ClassSelect />);
    const btn = screen.getByText('Begin Descent');
    expect(btn.closest('button')?.disabled).toBe(true);
  });
});
