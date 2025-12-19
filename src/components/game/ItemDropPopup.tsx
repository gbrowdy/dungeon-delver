import { Button } from '@/components/ui/button';
import { Item, Player, ItemType } from '@/types/game';
import { cn } from '@/lib/utils';
import { Sword, Shield, Gem } from 'lucide-react';

const RARITY_COLORS: Record<Item['rarity'], string> = {
  common: 'border-rarity-common bg-rarity-common/10',
  uncommon: 'border-rarity-uncommon bg-rarity-uncommon/10',
  rare: 'border-rarity-rare bg-rarity-rare/10',
  epic: 'border-rarity-epic bg-rarity-epic/10',
  legendary: 'border-rarity-legendary bg-rarity-legendary/10 pixel-border-pulse',
};

const RARITY_TEXT: Record<Item['rarity'], string> = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  epic: 'text-rarity-epic',
  legendary: 'text-rarity-legendary',
};

/**
 * Get Lucide icon component for item type
 */
function getItemIcon(itemType: ItemType): React.ComponentType<{ className?: string }> {
  switch (itemType) {
    case 'weapon': return Sword;
    case 'armor': return Shield;
    case 'accessory': return Gem;
    default: return Sword;
  }
}

interface ItemDropPopupProps {
  item: Item;
  player: Player;
  onEquip: () => void;
  onDismiss: () => void;
}

export function ItemDropPopup({ item, player, onEquip, onDismiss }: ItemDropPopupProps) {
  // Find current equipped item of the same type
  const currentItem = player.equippedItems.find((e) => e.type === item.type);

  // Compare stats
  const getStatComparison = () => {
    if (!currentItem) return null;

    const comparisons: { stat: string; diff: number }[] = [];
    const allStats = new Set([
      ...Object.keys(item.statBonus),
      ...Object.keys(currentItem.statBonus),
    ]);

    allStats.forEach((stat) => {
      const newVal = (item.statBonus as Record<string, number>)[stat] || 0;
      const oldVal = (currentItem.statBonus as Record<string, number>)[stat] || 0;
      const diff = newVal - oldVal;
      if (diff !== 0) {
        comparisons.push({ stat, diff });
      }
    });

    return comparisons;
  };

  const comparison = getStatComparison();
  const isUpgrade = comparison
    ? comparison.reduce((sum, c) => sum + c.diff, 0) > 0
    : true;

  const ItemIcon = getItemIcon(item.type);
  const CurrentItemIcon = currentItem ? getItemIcon(currentItem.type) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-in fade-in duration-200 p-2 sm:p-4">
      <div
        className={cn(
          'pixel-panel border-2 rounded-lg p-4 sm:p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200',
          RARITY_COLORS[item.rarity]
        )}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-2">
            <ItemIcon className="w-12 h-12" />
          </div>
          <h2 className={cn('pixel-text text-pixel-sm font-bold', RARITY_TEXT[item.rarity])}>
            {item.name}
          </h2>
          <p className="pixel-text text-pixel-xs text-slate-400 capitalize">{item.rarity} {item.type}</p>
        </div>

        {/* Stats */}
        <div className="pixel-panel-dark rounded-lg p-3 mb-4">
          <div className="pixel-text text-pixel-xs text-slate-400 mb-2">Stats</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(item.statBonus).map(([stat, val]) => (
              <span key={stat} className="pixel-text text-pixel-sm font-medium text-white">
                +{val} {stat}
              </span>
            ))}
          </div>
          {item.effect && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <span className="pixel-text text-pixel-xs text-accent">{item.effect.description}</span>
            </div>
          )}
        </div>

        {/* Comparison with current */}
        {currentItem && comparison && CurrentItemIcon && (
          <div className="pixel-panel-dark rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 pixel-text text-pixel-xs mb-2">
              <span className="text-slate-400 flex items-center gap-1">
                vs <CurrentItemIcon className="w-4 h-4" /> {currentItem.name}
              </span>
            </div>
            <div className="space-y-1">
              {comparison.map(({ stat, diff }) => (
                <div key={stat} className="flex items-center gap-2 pixel-text text-pixel-xs">
                  <span className="w-12 text-slate-400 capitalize truncate">{stat}</span>
                  <div className="flex-1 pixel-progress-bar h-1.5 rounded overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        diff > 0 ? 'bg-success' : 'bg-health'
                      )}
                      style={{ width: `${Math.min(Math.abs(diff) * 10, 100)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      'w-8 text-right pixel-text text-pixel-xs font-medium',
                      diff > 0 ? 'text-success' : 'text-health'
                    )}
                  >
                    {diff > 0 ? '+' : ''}{diff}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-center">
              {isUpgrade ? (
                <span className="pixel-text text-pixel-xs text-success font-bold">↑ Upgrade</span>
              ) : (
                <span className="pixel-text text-pixel-xs text-health font-bold">↓ Downgrade</span>
              )}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={onEquip}
            className="flex-1 pixel-button text-pixel-xs py-2.5 bg-primary hover:bg-primary/90 uppercase"
          >
            {currentItem ? 'Replace' : 'Equip'}
          </Button>
          <Button
            onClick={onDismiss}
            variant="outline"
            className="flex-1 pixel-button text-pixel-xs py-2.5 uppercase"
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
