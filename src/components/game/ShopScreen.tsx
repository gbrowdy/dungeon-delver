import { useState } from 'react';
import { Item } from '@/types/game';
import type { PlayerSnapshot } from '@/ecs/snapshot';
import { ShopState, ShopItem, SHOP_UNLOCKS, ShopTier } from '@/types/shop';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { PixelDivider } from '@/components/ui/PixelDivider';
import { PixelIcon } from '@/components/ui/PixelIcon';
import {
  canEnhance,
  getEnhancementCost,
  getEnhancedItemName,
  getNextEnhancementBonus,
  getEnhancedStats,
} from '@/utils/enhancementUtils';
import { ENHANCEMENT_COLORS, ENHANCEMENT_DISPLAY } from '@/constants/shop';
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

// Map tier to rarity (tiers roughly correspond to rarity levels)
const TIER_TO_RARITY: Record<ShopTier, Item['rarity']> = {
  starter: 'common',
  class: 'uncommon',
  specialty: 'rare',
  legendary: 'legendary',
};

/**
 * Convert a ShopItem to the Item type expected by the game engine.
 * Maps shop-specific fields to the standard Item interface.
 */
function shopItemToItem(shopItem: ShopItem): Item {
  return {
    id: shopItem.id,
    name: shopItem.name,
    type: shopItem.type,
    rarity: TIER_TO_RARITY[shopItem.tier],
    statBonus: shopItem.stats,
    description: shopItem.description,
    icon: shopItem.icon,
    effect: shopItem.effect,
    enhancementLevel: shopItem.enhancementLevel ?? 0,
    maxEnhancement: 3,
    tier: shopItem.tier,
  };
}

interface ShopScreenProps {
  player: PlayerSnapshot;
  shopState: ShopState;
  currentFloor: number;
  onPurchase: (item: Item, cost: number) => void;
  onEnhance: (slot: 'weapon' | 'armor' | 'accessory') => void;
  onClose: () => void;
}

// Tier colors matching the design spec
const TIER_COLORS = {
  starter: {
    primary: '#94a3b8', // slate-400
    secondary: '#64748b', // slate-500
    glow: 'rgba(148, 163, 184, 0.5)',
    bg: 'rgba(148, 163, 184, 0.1)',
  },
  class: {
    primary: '#3b82f6', // blue-500
    secondary: '#2563eb', // blue-600
    glow: 'rgba(59, 130, 246, 0.5)',
    bg: 'rgba(59, 130, 246, 0.1)',
  },
  specialty: {
    primary: '#a855f7', // purple-500
    secondary: '#9333ea', // purple-600
    glow: 'rgba(168, 85, 247, 0.5)',
    bg: 'rgba(168, 85, 247, 0.1)',
  },
  legendary: {
    primary: '#f59e0b', // amber-500
    secondary: '#d97706', // amber-600
    glow: 'rgba(245, 158, 11, 0.5)',
    bg: 'rgba(245, 158, 11, 0.1)',
  },
};

/**
 * Get the Lucide icon component for an item.
 * Item data stores icon names directly as valid Lucide icon names (e.g., 'Sword', 'Axe', 'Wand2').
 * Falls back to 'Package' if the icon doesn't exist.
 */
function getItemIcon(iconName: string): keyof typeof Icons {
  // Check if the icon exists in Lucide icons
  if (iconName in Icons) {
    return iconName as keyof typeof Icons;
  }
  return 'Package';
}

/**
 * Tier hierarchy for comparison: starter < class < specialty < legendary
 * Returns true if newItemTier is lower than equippedItemTier (i.e., a downgrade)
 */
function isDowngrade(newItemTier: ShopTier, equippedItemTier: ShopTier): boolean {
  const tierOrder: ShopTier[] = ['starter', 'class', 'specialty', 'legendary'];
  const newTierIndex = tierOrder.indexOf(newItemTier);
  const equippedTierIndex = tierOrder.indexOf(equippedItemTier);

  // Guard against invalid tier values (indexOf returns -1)
  if (newTierIndex === -1 || equippedTierIndex === -1) {
    return false;
  }

  return newTierIndex < equippedTierIndex;
}

interface ItemCardProps {
  item: ShopItem;
  isPurchased: boolean;
  canAfford: boolean;
  onPurchase: (item: ShopItem) => void;
  showPathSynergy?: boolean;
  equippedItems: (Item | null)[];
}

function ItemCard({ item, isPurchased, canAfford, onPurchase, showPathSynergy, equippedItems }: ItemCardProps) {
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

interface EquippedItemCardProps {
  item: Item | null;
  slotType: 'weapon' | 'armor' | 'accessory';
  playerGold: number;
  onEnhance: (slot: 'weapon' | 'armor' | 'accessory') => void;
}

function EquippedItemCard({ item, slotType, playerGold, onEnhance }: EquippedItemCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Get slot display info
  const slotInfo = {
    weapon: { name: 'Weapon', icon: Icons.Sword, color: '#ef4444' },
    armor: { name: 'Armor', icon: Icons.Shield, color: '#3b82f6' },
    accessory: { name: 'Accessory', icon: Icons.Sparkles, color: '#a855f7' },
  }[slotType];

  const SlotIcon = slotInfo.icon;

  // If no item equipped
  if (!item) {
    return (
      <div
        className="pixel-card relative p-3 border-2 min-h-[180px] flex flex-col items-center justify-center"
        style={{
          borderColor: 'rgba(100, 100, 120, 0.2)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <SlotIcon className="w-8 h-8 mb-2 text-slate-700" />
        <p className="pixel-text text-pixel-2xs text-slate-600 uppercase text-center">
          No {slotInfo.name}
        </p>
      </div>
    );
  }

  // Enhancement info
  const canEnhanceItem = canEnhance(item);
  const enhancementCost = getEnhancementCost(item);
  const canAfford = playerGold >= enhancementCost;
  const nextBonus = getNextEnhancementBonus(item);
  const enhancedStats = getEnhancedStats(item);
  const isMaxEnhanced = !canEnhanceItem;

  // Get tier color or default
  const tierColors = item.tier ? TIER_COLORS[item.tier] : TIER_COLORS.starter;
  const enhancementColor = ENHANCEMENT_COLORS[item.enhancementLevel as 0 | 1 | 2 | 3];

  // Format stats for display (using enhanced stats)
  const stats = Object.entries(enhancedStats)
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

  return (
    <div
      className={cn(
        'pixel-card relative p-3 transition-all duration-200',
        'border-2 min-h-[180px] flex flex-col',
        isHovered && canEnhanceItem && canAfford && 'pixel-card-hover'
      )}
      style={{
        borderColor: isHovered && canEnhanceItem && canAfford ? tierColors.primary : 'rgba(100, 100, 120, 0.3)',
        backgroundColor: 'rgba(30, 27, 75, 0.4)',
        boxShadow: isHovered && canEnhanceItem && canAfford ? `0 0 20px ${tierColors.glow}` : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Item icon */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{
            backgroundColor: tierColors.bg,
            boxShadow: isHovered ? `0 0 15px ${tierColors.glow}` : undefined,
          }}
        >
          <SlotIcon
            className="w-6 h-6"
            style={{ color: tierColors.primary }}
            aria-hidden="true"
          />
        </div>

        {/* Enhancement level badge */}
        {item.enhancementLevel > 0 && (
          <Badge
            variant="outline"
            className={cn('pixel-text text-pixel-2xs uppercase border-current', enhancementColor)}
          >
            {ENHANCEMENT_DISPLAY[item.enhancementLevel as 0 | 1 | 2 | 3]}
          </Badge>
        )}
      </div>

      {/* Item name with enhancement */}
      <h3
        className="pixel-text text-pixel-xs uppercase mb-1 leading-tight"
        style={{ color: isHovered && canEnhanceItem ? tierColors.primary : '#e2e8f0' }}
      >
        {getEnhancedItemName(item)}
      </h3>

      {/* Item type */}
      <p className="pixel-text text-pixel-2xs text-slate-500 mb-2 capitalize">
        {slotInfo.name}
      </p>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {stats.map((stat, idx) => (
            <span
              key={idx}
              className="pixel-text text-pixel-2xs px-1.5 py-0.5 rounded bg-slate-900/50 border border-slate-700/30"
              style={{ color: tierColors.secondary }}
            >
              {stat}
            </span>
          ))}
        </div>
      )}

      {/* Enhancement preview */}
      {canEnhanceItem && nextBonus && (
        <div className="mb-2 p-1.5 rounded bg-green-900/20 border border-green-500/30">
          <p className="pixel-text text-pixel-2xs text-green-400 mb-0.5">Next Level:</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(nextBonus).map(([key, value]) => {
              let label = key;
              if (key === 'maxHealth') label = 'HP';
              if (key === 'power') label = 'PWR';
              if (key === 'armor') label = 'ARM';
              if (key === 'speed') label = 'SPD';
              if (key === 'fortune') label = 'FOR';
              
              return (
                <span
                  key={key}
                  className="pixel-text text-pixel-2xs text-green-300"
                >
                  +{value} {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Effect description */}
      {item.effect && (
        <p className="pixel-text text-pixel-2xs text-slate-400 mb-2 leading-relaxed flex-1">
          {item.effect.description}
        </p>
      )}

      {/* Enhancement button */}
      <div className="mt-auto pt-2">
        {isMaxEnhanced ? (
          <div
            className="w-full text-center py-2 px-3 rounded border-2"
            style={{
              borderColor: '#a855f7',
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
            }}
          >
            <span className="pixel-text text-pixel-xs text-purple-400 uppercase font-bold flex items-center justify-center gap-1">
              <Icons.Star className="w-3 h-3 text-purple-400" />
              MAX
            </span>
          </div>
        ) : (
          <Button
            onClick={() => onEnhance(slotType)}
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
              backgroundColor: canAfford ? '#10b981' : '#475569',
              borderBottomColor: canAfford ? '#059669' : '#334155',
              color: '#ffffff',
            }}
          >
            <Icons.TrendingUp className="w-3 h-3 mr-1.5 text-emerald-300" />
            Enhance +{item.enhancementLevel + 1}
            <span className="ml-1.5 flex items-center">
              <Icons.Coins className="w-3 h-3 mr-0.5 text-amber-400" />
              {enhancementCost}g
            </span>
            {!canAfford && <span className="ml-1">- Need More</span>}
          </Button>
        )}
      </div>
    </div>
  );
}

export function ShopScreen({ player, shopState, currentFloor, onPurchase, onEnhance, onClose }: ShopScreenProps) {
  const legendaryUnlocked = currentFloor >= SHOP_UNLOCKS.legendary;

  // Check if item is purchased (either in purchasedItems list or currently equipped)
  // Note: This mirrors useShopState.isItemPurchased but uses local props
  // (needed because shopState resets on floor transition but equipped items persist)
  const isItemPurchased = (itemId: string) =>
    shopState.purchasedItems.includes(itemId) ||
    Object.values(player.equipment).some(item => item?.id === itemId);

  // Check if player can afford item
  const canAfford = (item: ShopItem) => player.gold >= item.price;

  // Path synergy detection (placeholder - would check player.path)
  const hasPathSynergy = (item: ShopItem) => {
    if (!player.path || !item.pathRestriction) return false;
    return item.pathRestriction === player.path.pathId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center p-4 sm:p-6 overflow-y-auto">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-900/5 rounded-full blur-[120px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-6xl space-y-6 sm:space-y-8 py-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="pixel-title text-base sm:text-xl md:text-2xl font-bold tracking-wider uppercase">
            <span className="pixel-glow bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Shop
            </span>
          </h1>

          {/* Pixel divider */}
          <PixelDivider color="orange" />

          {/* Gold display */}
          <div className="flex items-center justify-center gap-2">
            <PixelIcon type="stat-gold" size={24} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
            <span className="pixel-text text-pixel-base text-amber-400">
              {player.gold} Gold
            </span>
          </div>
        </div>

        {/* YOUR EQUIPMENT Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-600/50">
            <div className="w-2 h-2 bg-slate-400" />
            <h2 className="pixel-text text-pixel-sm uppercase text-slate-300 tracking-wider">
              Your Equipment
            </h2>
            <div className="flex-1 h-[2px] bg-gradient-to-r from-slate-600/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Get equipped items by type */}
            {(['weapon', 'armor', 'accessory'] as const).map((slotType) => {
              const equippedItem = player.equipment[slotType] || null;
              return (
                <EquippedItemCard
                  key={slotType}
                  item={equippedItem}
                  slotType={slotType}
                  playerGold={player.gold}
                  onEnhance={onEnhance}
                />
              );
            })}
          </div>
        </section>

        {/* STARTER GEAR Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50">
            <div className="w-2 h-2 bg-slate-400" />
            <h2 className="pixel-text text-pixel-sm uppercase text-slate-300 tracking-wider">
              Starter Gear
            </h2>
            <div className="flex-1 h-[2px] bg-gradient-to-r from-slate-700/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {shopState.starterGear.map((shopItem) => (
              <ItemCard
                key={shopItem.id}
                item={shopItem}
                isPurchased={isItemPurchased(shopItem.id)}
                canAfford={canAfford(shopItem)}
                onPurchase={(si) => onPurchase(shopItemToItem(si), si.price)}
                equippedItems={Object.values(player.equipment)}
              />
            ))}
          </div>
        </section>

        {/* CLASS GEAR Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-blue-700/50">
            <div className="w-2 h-2 bg-blue-500" />
            <h2 className="pixel-text text-pixel-sm uppercase text-blue-300 tracking-wider">
              Class Gear
            </h2>
            <div className="flex-1 h-[2px] bg-gradient-to-r from-blue-700/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {shopState.classGear.map((shopItem) => (
              <ItemCard
                key={shopItem.id}
                item={shopItem}
                isPurchased={isItemPurchased(shopItem.id)}
                canAfford={canAfford(shopItem)}
                onPurchase={(si) => onPurchase(shopItemToItem(si), si.price)}
                equippedItems={Object.values(player.equipment)}
              />
            ))}
          </div>
        </section>

        {/* TODAY'S SELECTION Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-purple-700/50">
            <div className="w-2 h-2 bg-purple-500" />
            <h2 className="pixel-text text-pixel-sm uppercase text-purple-300 tracking-wider">
              Today's Selection
            </h2>
            <div className="flex-1 h-[2px] bg-gradient-to-r from-purple-700/50 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {shopState.todaysSelection.map((shopItem) => (
              <ItemCard
                key={shopItem.id}
                item={shopItem}
                isPurchased={isItemPurchased(shopItem.id)}
                canAfford={canAfford(shopItem)}
                onPurchase={(si) => onPurchase(shopItemToItem(si), si.price)}
                showPathSynergy={hasPathSynergy(shopItem)}
                equippedItems={Object.values(player.equipment)}
              />
            ))}
          </div>
        </section>

        {/* LEGENDARY Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-amber-700/50">
            <div className="w-2 h-2 bg-amber-500" />
            <h2 className="pixel-text text-pixel-sm uppercase text-amber-300 tracking-wider">
              Legendary
            </h2>
            <div className="flex-1 h-[2px] bg-gradient-to-r from-amber-700/50 to-transparent" />
            {!legendaryUnlocked && (
              <span className="pixel-text text-pixel-2xs text-slate-500 flex items-center gap-1">
                <Icons.Lock className="w-3 h-3 text-slate-500" />
                Unlocks Floor {SHOP_UNLOCKS.legendary}
              </span>
            )}
          </div>

          {legendaryUnlocked && shopState.legendary ? (
            <div className="max-w-md mx-auto">
              <ItemCard
                item={shopState.legendary}
                isPurchased={isItemPurchased(shopState.legendary.id)}
                canAfford={canAfford(shopState.legendary)}
                onPurchase={(si) => onPurchase(shopItemToItem(si), si.price)}
                showPathSynergy={hasPathSynergy(shopState.legendary)}
                equippedItems={Object.values(player.equipment)}
              />
            </div>
          ) : !legendaryUnlocked ? (
            <div className="max-w-md mx-auto">
              <div
                className="pixel-card p-6 border-2 text-center"
                style={{
                  borderColor: 'rgba(100, 100, 120, 0.3)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                }}
              >
                <Icons.Lock className="w-12 h-12 mx-auto mb-3 text-slate-600/70" />
                <p className="pixel-text text-pixel-xs text-slate-500 uppercase mb-2">
                  Legendary Items Locked
                </p>
                <p className="pixel-text text-pixel-2xs text-slate-600 leading-relaxed">
                  Reach floor {SHOP_UNLOCKS.legendary} to unlock powerful legendary gear
                </p>
              </div>
            </div>
          ) : null}
        </section>

        {/* Continue button */}
        <div className="text-center pt-4 sm:pt-6">
          <Button
            onClick={onClose}
            size="lg"
            className={cn(
              'pixel-button-main text-pixel-sm px-8 sm:px-12 py-3 sm:py-4',
              'transition-all duration-150 uppercase font-bold',
              'bg-orange-600 hover:bg-orange-500 border-b-4 border-orange-800 hover:border-orange-700',
              'active:border-b-2 active:translate-y-[2px]'
            )}
          >
            Continue
          </Button>
        </div>
      </div>

      {/* CSS for pixel art effects */}
      <style>{`
        /* Pixel glow effect for title */
        .pixel-glow {
          filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.6))
                  drop-shadow(0 0 20px rgba(251, 146, 60, 0.3));
        }

        /* Pixel-style title text */
        .pixel-title {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          text-shadow:
            3px 3px 0 #1a1a2e,
            -1px -1px 0 #1a1a2e,
            1px -1px 0 #1a1a2e,
            -1px 1px 0 #1a1a2e;
          letter-spacing: 0.05em;
        }

        /* Pixel-style body text */
        .pixel-text {
          font-family: 'Press Start 2P', 'Courier New', monospace;
        }

        /* Pixel card styling */
        .pixel-card {
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
          image-rendering: pixelated;
          box-shadow:
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.05);
        }

        /* Only apply hover transform on devices with hover capability */
        @media (hover: hover) and (pointer: fine) {
          .pixel-card:hover {
            transform: translateY(-2px);
          }
        }

        .pixel-card-hover {
          box-shadow:
            0 0 20px var(--card-glow, rgba(255, 255, 255, 0.2)),
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.1);
        }

        /* Button pixel style */
        .pixel-button,
        .pixel-button-main {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          image-rendering: pixelated;
          box-shadow:
            inset -2px -2px 0 rgba(0, 0, 0, 0.3),
            inset 2px 2px 0 rgba(255, 255, 255, 0.2);
        }

        /* Text sizes */
        .text-pixel-2xs { font-size: 0.5rem; line-height: 1.2; }
        .text-pixel-xs { font-size: 0.625rem; line-height: 1.3; }
        .text-pixel-sm { font-size: 0.75rem; line-height: 1.4; }
        .text-pixel-base { font-size: 0.875rem; line-height: 1.5; }
        .text-pixel-lg { font-size: 1rem; line-height: 1.5; }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .pixel-card:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
