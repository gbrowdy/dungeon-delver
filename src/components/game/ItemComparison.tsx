// src/components/game/ItemComparison.tsx
import { ITEM_DEFINITIONS } from '@/data/items';
import type { Item, ItemId } from '@/types/game';
import { Button } from '@/components/ui/button';

interface ItemComparisonProps {
  currentItem: Item | null;
  newItemId: ItemId;
  isUpgrade: boolean;
  onKeep: () => void;
  onEquip: () => void;
}

export function ItemComparison({ currentItem, newItemId, isUpgrade, onKeep, onEquip }: ItemComparisonProps) {
  const newDef = ITEM_DEFINITIONS[newItemId];
  const currentDef = currentItem ? ITEM_DEFINITIONS[currentItem.id] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="pixel-panel p-6 w-full max-w-lg space-y-6 rounded-lg">
        <h3 className="pixel-title text-pixel-sm text-center text-foreground uppercase">
          {newDef.slot} Comparison
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Current item */}
          <div className="pixel-panel-dark p-4 rounded space-y-2">
            <div className="pixel-text text-pixel-xs text-muted-foreground uppercase">Current</div>
            {currentDef ? (
              <>
                <div className="pixel-text text-pixel-xs text-foreground font-bold">
                  {currentDef.name}{currentItem!.tier > 1 ? ` (T${currentItem!.tier})` : ''}
                </div>
                <div className="pixel-text text-[8px] text-muted-foreground leading-relaxed">
                  {currentDef.description}
                </div>
              </>
            ) : (
              <div className="pixel-text text-pixel-xs text-muted-foreground italic">Empty slot</div>
            )}
          </div>

          {/* New item */}
          <div className="pixel-panel-dark p-4 rounded space-y-2 border border-amber-500/30">
            <div className="pixel-text text-pixel-xs text-amber-400 uppercase">
              {isUpgrade ? 'Upgrade' : 'New'}
            </div>
            <div className="pixel-text text-pixel-xs text-foreground font-bold">
              {newDef.name}{isUpgrade && currentItem ? ` (T${currentItem.tier + 1})` : ''}
            </div>
            <div className="pixel-text text-[8px] text-muted-foreground leading-relaxed">
              {newDef.description}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={onKeep}
            className="pixel-text text-pixel-xs px-4 py-2"
          >
            Keep Current
          </Button>
          <Button
            onClick={onEquip}
            className="pixel-text text-pixel-xs px-4 py-2 bg-amber-600 hover:bg-amber-500"
          >
            {isUpgrade ? 'Upgrade' : 'Equip New'}
          </Button>
        </div>
      </div>
    </div>
  );
}
