import { useState } from 'react';
import { Item } from '@/types/game';
import type { ShopItem } from '@/types/shop';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TIER_COLORS } from './constants';
import { getItemIcon, isDowngrade } from './helpers';

interface ItemCardProps {
  item: ShopItem;
  isPurchased: boolean;
  canAfford: boolean;
  onPurchase: (item: ShopItem) => void;
  showPathSynergy?: boolean;
  equippedItems: (Item | null)[];
}

export function ItemCard({ item, isPurchased, canAfford, onPurchase, showPathSynergy, equippedItems }: ItemCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const colors = TIER_COLORS[item.tier];
  const iconName = getItemIcon(item.icon);
  const IconComponent = Icons[iconName as keyof typeof Icons] || Icons.Package;

  // Check if this item is a downgrade from currently equipped item
  const equippedItem = equippedItems.find(equipped => equipped?.type === item.type);
  const isItemDowngrade = equippedItem && equippedItem.tier && isDowngrade(item.tier, equippedItem.tier);

  // Handle purchase - show confirmation if downgrade
  const handlePurchaseClick = () => {
    if (isItemDowngrade && !isPurchased) {
      setShowDowngradeDialog(true);
    } else {
      onPurchase(item);
    }
  };

  const handleConfirmDowngrade = () => {
    setShowDowngradeDialog(false);
    onPurchase(item);
  };

  // Format stats for display
  const stats = Object.entries(item.stats)
    .filter(([_, value]) => value && value !== 0)
    .map(([key, value]) => {
      const sign = value && value > 0 ? '+' : '';
      let label = key;

      // Format stat names
      if (key === 'maxHealth') label = 'HP';
      if (key === 'power') label = 'PWR';
      if (key === 'armor') label = 'ARM';
      if (key === 'speed') label = 'SPD';
      if (key === 'fortune') label = 'FOR';

      return `${sign}${value} ${label}`;
    });

  const isLocked = !canAfford && !isPurchased;

  return (
    <div
      className={cn(
        'pixel-card relative p-3 transition-all duration-200',
        'border-2 min-h-[160px] flex flex-col',
        isHovered && !isPurchased && canAfford && 'pixel-card-hover',
        isPurchased && 'opacity-75'
      )}
      style={{
        borderColor: isHovered && !isPurchased ? colors.primary : 'rgba(100, 100, 120, 0.3)',
        backgroundColor: isPurchased ? colors.bg : undefined,
        boxShadow: isHovered && !isPurchased ? `0 0 20px ${colors.glow}` : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Item icon */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{
            backgroundColor: colors.bg,
            boxShadow: isHovered ? `0 0 15px ${colors.glow}` : undefined,
          }}
        >
          <IconComponent
            className="w-6 h-6"
            style={{ color: colors.primary }}
            aria-hidden="true"
          />
        </div>

        {/* Badges */}
        <div className="flex flex-col gap-1 items-end">
          {/* Purchased indicator */}
          {isPurchased && (
            <Badge
              variant="outline"
              className="pixel-text text-pixel-2xs uppercase border-green-500 text-green-500"
            >
              <Icons.Check className="w-3 h-3 mr-1 text-green-500" />
              Owned
            </Badge>
          )}

          {/* Downgrade warning badge */}
          {isItemDowngrade && !isPurchased && (
            <Badge
              variant="outline"
              className="pixel-text text-pixel-2xs uppercase border-orange-500 text-orange-500 bg-orange-950/30"
            >
              <Icons.AlertTriangle className="w-3 h-3 mr-1 text-orange-500" />
              Downgrade
            </Badge>
          )}

          {/* Path synergy badge - shown even on downgrades so players know about synergy */}
          {showPathSynergy && !isPurchased && (
            <Badge
              variant="outline"
              className="pixel-text text-pixel-2xs uppercase border-purple-400 text-purple-400"
            >
              <Icons.Zap className="w-3 h-3 mr-1 text-purple-400" />
              Synergy
            </Badge>
          )}
        </div>
      </div>

      {/* Item name */}
      <h3
        className="pixel-text text-pixel-xs uppercase mb-1 leading-tight"
        style={{ color: isHovered && !isPurchased ? colors.primary : '#e2e8f0' }}
      >
        {item.name}
      </h3>

      {/* Item type */}
      <p className="pixel-text text-pixel-2xs text-slate-500 mb-2 capitalize">
        {item.type}
      </p>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {stats.map((stat, idx) => (
            <span
              key={idx}
              className="pixel-text text-pixel-2xs px-1.5 py-0.5 rounded bg-slate-900/50 border border-slate-700/30"
              style={{ color: colors.secondary }}
            >
              {stat}
            </span>
          ))}
        </div>
      )}

      {/* Effect description */}
      {item.effect && (
        <p className="pixel-text text-pixel-2xs text-slate-400 mb-2 leading-relaxed flex-1">
          {item.effect.description}
        </p>
      )}

      {/* Price and buy button */}
      <div className="mt-auto pt-2">
        {isPurchased ? (
          <div className="text-center py-2">
            <span className="pixel-text text-pixel-xs text-green-500">
              Already Purchased
            </span>
          </div>
        ) : (
          <Button
            onClick={handlePurchaseClick}
            disabled={!canAfford}
            className={cn(
              'w-full pixel-button text-pixel-xs uppercase font-bold',
              'transition-all duration-150',
              // Active state provides press feedback (verified H3)
              canAfford
                ? 'border-b-4 active:border-b-2 active:translate-y-[2px]'
                : 'cursor-not-allowed opacity-50'
            )}
            style={{
              backgroundColor: canAfford ? colors.primary : '#475569',
              borderBottomColor: canAfford ? colors.secondary : '#334155',
              color: '#ffffff',
            }}
          >
            <Icons.Coins className="w-3 h-3 mr-1.5 text-amber-400" />
            {item.price}g
            {!canAfford && ' - Need More'}
          </Button>
        )}
      </div>

      {/* Downgrade confirmation dialog */}
      <AlertDialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <AlertDialogContent className="pixel-card border-2 border-orange-500/50 bg-gradient-to-b from-slate-900 to-slate-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="pixel-text text-pixel-sm uppercase text-orange-400 flex items-center gap-2">
              <Icons.AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirm Purchase
            </AlertDialogTitle>
            <AlertDialogDescription className="pixel-text text-pixel-2xs text-slate-300 leading-relaxed">
              This {item.type} is a lower tier than your current equipment. Purchase anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              className="pixel-button text-pixel-xs uppercase border-b-4 border-slate-700 hover:border-slate-600"
              onClick={() => setShowDowngradeDialog(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="pixel-button text-pixel-xs uppercase border-b-4 bg-orange-600 hover:bg-orange-500 border-orange-800 hover:border-orange-700"
              onClick={handleConfirmDowngrade}
            >
              <Icons.Coins className="w-3 h-3 mr-1.5 text-amber-400" />
              Buy Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
