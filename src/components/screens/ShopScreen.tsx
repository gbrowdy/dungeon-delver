import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ItemCard } from '@/components/game/ItemCard';
import { ItemComparison } from '@/components/game/ItemComparison';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import { ITEM_DEFINITIONS } from '@/data/items';
import type { ItemId } from '@/types/game';

export function ShopScreen() {
  const shopCards = useGameStore(s => s.shopCards);
  const selectedChoices = useGameStore(s => s.selectedChoices);
  const equippedItems = useGameStore(s => s.equippedItems);
  const selectShopCard = useGameStore(s => s.selectShopCard);
  const confirmShop = useGameStore(s => s.confirmShop);

  // Item comparison modal state
  const [comparingItem, setComparingItem] = useState<{
    index: number;
    itemId: ItemId;
    isUpgrade: boolean;
  } | null>(null);

  const handleCardSelect = (index: number) => {
    const card = shopCards[index];

    // If it's an item card, open comparison first
    if (card.type === 'item' && card.itemId && !selectedChoices.includes(index)) {
      setComparingItem({
        index,
        itemId: card.itemId,
        isUpgrade: card.isUpgrade ?? false,
      });
      return;
    }

    selectShopCard(index);
  };

  const handleKeep = () => {
    setComparingItem(null);
  };

  const handleEquip = () => {
    if (comparingItem) {
      selectShopCard(comparingItem.index);
      setComparingItem(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h2 className="pixel-title text-pixel-sm text-amber-400 mb-2 uppercase">
            Boss Defeated
          </h2>
          <p className="pixel-text text-pixel-xs text-muted-foreground">
            Choose 2 Rewards
          </p>
        </div>

        <PixelDivider color="orange" />

        {/* Shop cards — horizontal scroll on mobile */}
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
          {shopCards.map((card, index) => (
            <div key={index} className="snap-center shrink-0 w-[140px] sm:w-auto">
              <ItemCard
                shopCard={card}
                selected={selectedChoices.includes(index)}
                onSelect={() => handleCardSelect(index)}
              />
            </div>
          ))}
        </div>

        {/* Selection count indicator */}
        <div className="text-center pixel-text text-pixel-xs text-muted-foreground">
          {selectedChoices.length}/2 selected
        </div>

        {/* Confirm button */}
        <div className="text-center">
          <Button
            onClick={confirmShop}
            disabled={selectedChoices.length === 0}
            className="pixel-button-main text-pixel-xs px-8 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed border-b-4 border-orange-800 uppercase font-bold"
          >
            Confirm
          </Button>
        </div>
      </div>

      {/* Item comparison modal */}
      {comparingItem && (
        <ItemComparison
          currentItem={equippedItems[ITEM_DEFINITIONS[comparingItem.itemId].slot]}
          newItemId={comparingItem.itemId}
          isUpgrade={comparingItem.isUpgrade}
          onKeep={handleKeep}
          onEquip={handleEquip}
        />
      )}
    </div>
  );
}
