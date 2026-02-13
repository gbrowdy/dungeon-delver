import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttackBar } from '../AttackBar';

describe('AttackBar', () => {
  it('renders with correct fill percentage', () => {
    // Timer starts at full interval, counts down to 0
    // attackTimer=1000, interval=2000 → 50% elapsed → 50% fill
    render(<AttackBar attackTimer={1000} attackInterval={2000} />);
    const fill = screen.getByTestId('attack-bar-fill');
    expect(fill.style.width).toBe('50%');
  });

  it('shows 100% when timer is at 0', () => {
    render(<AttackBar attackTimer={0} attackInterval={2000} />);
    const fill = screen.getByTestId('attack-bar-fill');
    expect(fill.style.width).toBe('100%');
  });

  it('shows 0% when timer equals interval', () => {
    render(<AttackBar attackTimer={2000} attackInterval={2000} />);
    const fill = screen.getByTestId('attack-bar-fill');
    expect(fill.style.width).toBe('0%');
  });
});
