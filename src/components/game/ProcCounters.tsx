import type { EquippedItems, CombatCounters } from '@/types/game';

interface ProcCountersProps {
  equippedItems: EquippedItems;
  counters: CombatCounters;
}

export function ProcCounters({ equippedItems, counters }: ProcCountersProps) {
  const hasShockingEdge = equippedItems.weapon?.id === 'shocking_edge';
  const hasFlurryRing = equippedItems.accessory?.id === 'flurry_ring';

  if (!hasShockingEdge && !hasFlurryRing) return null;

  return (
    <div className="flex gap-2">
      {hasShockingEdge && (
        <span className="pixel-text text-pixel-2xs text-yellow-400" title="Hits until stun">
          {counters.playerAttackCount % 4}/{4}
        </span>
      )}
      {hasFlurryRing && (
        <span className="pixel-text text-pixel-2xs text-blue-400" title="Hits until bonus">
          {counters.playerAttackCount % 5}/{5}
        </span>
      )}
    </div>
  );
}
