import { Item } from '@/types/game';
import type { PlayerSnapshot } from '@/ecs/snapshot';
import { ShopState, ShopItem, SHOP_UNLOCKS } from '@/types/shop';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { PixelDivider } from '@/components/ui/PixelDivider';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { ItemCard } from './ItemCard';
import { EquippedItemCard } from './EquippedItemCard';
import { shopItemToItem } from './helpers';

interface ShopScreenProps {
  player: PlayerSnapshot;
  shopState: ShopState;
  currentFloor: number;
  onPurchase: (item: Item, cost: number) => void;
  onEnhance: (slot: 'weapon' | 'armor' | 'accessory') => void;
  onClose: () => void;
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
          </div>
          {!legendaryUnlocked && (
            <span className="pixel-text text-pixel-2xs text-slate-500 flex items-center gap-1">
              <Icons.Lock className="w-3 h-3 text-slate-500" />
              Unlocks Floor {SHOP_UNLOCKS.legendary}
            </span>
          )}

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
