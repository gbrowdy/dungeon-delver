import { render, screen } from '@testing-library/react';
import { ProcCounters } from '../ProcCounters';

describe('ProcCounters', () => {
  const baseCounts = { playerAttackCount: 0, playerHitCount: 0, shieldRefreshTimer: 0, curseDecayTimer: 0 };

  it('renders nothing when no proc items equipped', () => {
    const { container } = render(
      <ProcCounters equippedItems={{ weapon: null, armor: null, accessory: null }} counters={baseCounts} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows Shocking Edge counter', () => {
    const items = { weapon: { id: 'shocking_edge' as const, slot: 'weapon' as const, tier: 1 }, armor: null, accessory: null };
    render(<ProcCounters equippedItems={items} counters={{ ...baseCounts, playerAttackCount: 2 }} />);
    expect(screen.getByText('2/4')).toBeDefined();
  });

  it('shows Flurry Ring counter', () => {
    const items = { weapon: null, armor: null, accessory: { id: 'flurry_ring' as const, slot: 'accessory' as const, tier: 1 } };
    render(<ProcCounters equippedItems={items} counters={{ ...baseCounts, playerAttackCount: 3 }} />);
    expect(screen.getByText('3/5')).toBeDefined();
  });
});
