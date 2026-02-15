import { useGameStore } from '@/store/gameStore';
import { ITEM_DEFINITIONS } from '@/data/items';
import type { ItemSlot } from '@/types/game';

const SLOT_LABELS: Record<ItemSlot, string> = {
  weapon: 'W',
  armor: 'A',
  accessory: 'C',
};

const SLOT_COLORS: Record<ItemSlot, string> = {
  weapon: 'text-red-400 border-red-400/30',
  armor: 'text-blue-400 border-blue-400/30',
  accessory: 'text-amber-400 border-amber-400/30',
};

export function ItemSlots() {
  const equippedItems = useGameStore(s => s.equippedItems);

  return (
    <div className="flex gap-2">
      {(['weapon', 'armor', 'accessory'] as ItemSlot[]).map(slot => {
        const item = equippedItems[slot];
        const def = item ? ITEM_DEFINITIONS[item.id] : null;

        return (
          <div
            key={slot}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border ${SLOT_COLORS[slot]} ${item ? 'bg-slate-800/50' : 'bg-slate-900/30 opacity-40'}`}
          >
            <span className="pixel-text text-pixel-xs font-bold">{SLOT_LABELS[slot]}</span>
            {def ? (
              <span className="pixel-text text-pixel-xs text-foreground truncate max-w-[80px]">
                {def.name}{item!.tier > 1 ? ` T${item!.tier}` : ''}
              </span>
            ) : (
              <span className="pixel-text text-pixel-xs text-muted-foreground">Empty</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
