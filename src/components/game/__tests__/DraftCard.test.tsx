// src/components/game/__tests__/DraftCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraftCard } from '../DraftCard';

describe('DraftCard', () => {
  const card = { stat: 'power' as const, value: 15, impactPreview: '+11% damage' };

  it('renders stat name and value', () => {
    render(<DraftCard card={card} selected={false} onSelect={() => {}} />);
    expect(screen.getByText('+15')).toBeDefined();
    expect(screen.getByText('Power')).toBeDefined();
  });

  it('renders impact preview', () => {
    render(<DraftCard card={card} selected={false} onSelect={() => {}} />);
    expect(screen.getByText('+11% damage')).toBeDefined();
  });

  it('calls onSelect when clicked', () => {
    let called = false;
    render(<DraftCard card={card} selected={false} onSelect={() => { called = true; }} />);
    fireEvent.click(screen.getByText('+15').closest('button')!);
    expect(called).toBe(true);
  });

  it('shows selected state', () => {
    render(<DraftCard card={card} selected={true} onSelect={() => {}} />);
    const button = screen.getByText('+15').closest('button');
    expect(button?.getAttribute('data-selected')).toBe('true');
  });
});
