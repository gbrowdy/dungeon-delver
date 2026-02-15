import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnrageBar } from '../EnrageBar';

describe('EnrageBar', () => {
  it('does not render before 10s', () => {
    const { container } = render(<EnrageBar combatElapsed={5000} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders at 15s', () => {
    const { container } = render(<EnrageBar combatElapsed={15000} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows "Enraged" text when past threshold', () => {
    render(<EnrageBar combatElapsed={50000} />);
    expect(screen.getByText('Enraged')).toBeDefined();
  });
});
