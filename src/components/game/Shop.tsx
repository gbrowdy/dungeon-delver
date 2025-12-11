import { Item, Power, Player, ItemType } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getItemPrice } from '@/data/items';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<ItemType, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};

interface ShopProps {
  player: Player;
  items: Item[];
  availablePower: Power | null;
  onBuyItem: (index: number) => void;
  onLearnPower: () => void;
  onContinue: () => void;
}

const RARITY_COLORS = {
  common: 'border-rarity-common bg-rarity-common/10',
  uncommon: 'border-rarity-uncommon bg-rarity-uncommon/10',
  rare: 'border-rarity-rare bg-rarity-rare/10',
  epic: 'border-rarity-epic bg-rarity-epic/10',
  legendary: 'border-rarity-legendary bg-rarity-legendary/10',
};

const RARITY_TEXT = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  epic: 'text-rarity-epic',
  legendary: 'text-rarity-legendary',
};

export function Shop({ player, items, availablePower, onBuyItem, onLearnPower, onContinue }: ShopProps) {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">🏪 The Shop</h1>
          <p className="text-muted-foreground">Gold: <span className="text-gold font-bold">{player.gold}</span></p>
        </div>
        
        {availablePower && (
          <Card className="border-primary bg-gradient-to-br from-primary/10 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{availablePower.icon}</span>
                New Power Available!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-bold text-primary">{availablePower.name}</h4>
                <p className="text-pixel-sm text-muted-foreground">{availablePower.description}</p>
                <p className="text-pixel-xs text-muted-foreground mt-1">
                  Mana: {availablePower.manaCost} | Cooldown: {availablePower.cooldown}
                </p>
              </div>
              <Button onClick={onLearnPower} className="w-full">
                Learn Power (Free)
              </Button>
            </CardContent>
          </Card>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item, index) => {
            const price = getItemPrice(item);
            const canAfford = player.gold >= price;
            const alreadyOwnsType = player.equippedItems.some(
              (equipped) => equipped.type === item.type
            );
            const canBuy = canAfford && !alreadyOwnsType;

            return (
              <Card key={item.id} className={cn('transition-all', RARITY_COLORS[item.rarity])}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <CardTitle className={cn('text-lg', RARITY_TEXT[item.rarity])}>
                        {item.name}
                      </CardTitle>
                      <p className="text-pixel-xs uppercase tracking-wide text-muted-foreground">
                        {item.rarity} {TYPE_LABELS[item.type]}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-pixel-sm text-muted-foreground">{item.description}</p>

                  <div className="space-y-1">
                    {Object.entries(item.statBonus).map(([stat, value]) => (
                      <div key={stat} className="flex justify-between text-pixel-sm">
                        <span className="text-muted-foreground capitalize">{stat}</span>
                        <span className="text-success font-mono">+{value}</span>
                      </div>
                    ))}
                  </div>

                  {alreadyOwnsType ? (
                    <div className="text-center text-pixel-sm text-muted-foreground py-2">
                      Already have a {TYPE_LABELS[item.type].toLowerCase()}
                    </div>
                  ) : (
                    <Button
                      onClick={() => onBuyItem(index)}
                      disabled={!canBuy}
                      className="w-full"
                      variant={canBuy ? 'default' : 'outline'}
                    >
                      Buy for {price} 💰
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {items.length === 0 && !availablePower && (
          <p className="text-center text-muted-foreground">No items available</p>
        )}
        
        <div className="flex justify-center pt-4">
          <Button onClick={onContinue} size="lg" variant="outline">
            Continue to Next Floor →
          </Button>
        </div>
      </div>
    </div>
  );
}
