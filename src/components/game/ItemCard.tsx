// src/components/game/ItemCard.tsx
import { ITEM_DEFINITIONS, type ItemDefinition } from '@/data/items';
import type { ShopCard as ShopCardType, StatType } from '@/types/game';
import { StatIcon, STAT_LABELS } from './StatIcon';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  shopCard: ShopCardType;
  selected: boolean;
  onSelect: () => void;
}

const SLOT_COLORS: Record<string, string> = {
  weapon: 'border-red-500/50',
  armor: 'border-blue-500/50',
  accessory: 'border-amber-500/50',
};

export function ItemCard({ shopCard, selected, onSelect }: ItemCardProps) {
  if (shopCard.type === 'stat_boost' && shopCard.stat) {
    return (
      <StatBoostCard
        stat={shopCard.stat}
        value={shopCard.statValue ?? 0}
        selected={selected}
        onSelect={onSelect}
      />
    );
  }

  if (shopCard.type === 'item' && shopCard.itemId) {
    const def = ITEM_DEFINITIONS[shopCard.itemId];
    return (
      <ItemEquipCard
        def={def}
        isUpgrade={shopCard.isUpgrade ?? false}
        selected={selected}
        onSelect={onSelect}
      />
    );
  }

  return null;
}

function StatBoostCard({
  stat, value, selected, onSelect,
}: {
  stat: StatType; value: number; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      data-selected={selected}
      className={cn(
        'pixel-panel p-3 sm:p-4 flex flex-col items-center gap-2 rounded-lg border-2 transition-all cursor-pointer w-full min-w-[100px]',
        selected ? 'border-amber-500/70 shadow-lg shadow-amber-500/20' : 'border-transparent hover:border-slate-600',
      )}
    >
      <StatIcon stat={stat} size="md" />
      <div className="pixel-text text-pixel-sm text-foreground font-bold">+{value}</div>
      <div className="pixel-text text-pixel-xs text-muted-foreground">{STAT_LABELS[stat]}</div>
    </button>
  );
}

function ItemEquipCard({
  def, isUpgrade, selected, onSelect,
}: {
  def: ItemDefinition; isUpgrade: boolean; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      data-selected={selected}
      className={cn(
        'pixel-panel p-3 sm:p-4 flex flex-col items-center gap-2 rounded-lg border-2 transition-all cursor-pointer w-full min-w-[100px]',
        selected ? 'border-amber-500/70 shadow-lg shadow-amber-500/20' : `${SLOT_COLORS[def.slot]} hover:border-slate-500`,
      )}
    >
      <div className="pixel-text text-pixel-xs text-amber-400 uppercase">{def.slot}</div>
      <div className="pixel-text text-pixel-xs text-foreground font-bold text-center">{def.name}</div>
      {isUpgrade && (
        <div className="pixel-text text-pixel-2xs text-green-400 uppercase">Tier Up</div>
      )}
      <div className="pixel-text text-pixel-2xs text-muted-foreground text-center leading-relaxed">
        {def.description}
      </div>
    </button>
  );
}
