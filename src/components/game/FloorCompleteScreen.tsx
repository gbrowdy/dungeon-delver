import { useState, useEffect, useMemo, useCallback } from 'react';
import { Player, Item, ItemType } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PixelSprite } from './PixelSprite';
import { cn } from '@/lib/utils';
import { PowerChoice, isPowerUpgrade } from '@/data/powers';
import { formatItemStatBonus } from '@/utils/itemUtils';
import { PowerWithSynergies, hasSynergy, getSynergy, getPathName } from '@/utils/powerSynergies';
import { Star } from 'lucide-react';

const RARITY_COLORS: Record<Item['rarity'], string> = {
  common: 'border-rarity-common bg-rarity-common/10 text-rarity-common',
  uncommon: 'border-rarity-uncommon bg-rarity-uncommon/10 text-rarity-uncommon',
  rare: 'border-rarity-rare bg-rarity-rare/10 text-rarity-rare',
  epic: 'border-rarity-epic bg-rarity-epic/10 text-rarity-epic',
  legendary: 'border-rarity-legendary bg-rarity-legendary/10 text-rarity-legendary',
};

const RARITY_TEXT: Record<Item['rarity'], string> = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  epic: 'text-rarity-epic',
  legendary: 'text-rarity-legendary',
};

const TYPE_LABELS: Record<ItemType, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};

const TYPE_ICONS: Record<ItemType, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
};

const ALL_ITEM_TYPES: ItemType[] = ['weapon', 'armor', 'accessory'];

interface FloorCompleteScreenProps {
  player: Player;
  floor: number;
  shopItems: Item[];
  availablePowers: PowerChoice[];
  onClaimItem: (index: number) => void;
  onLearnPower: (index: number) => void;
  onContinue: () => void;
  onVisitShop: () => void;
}

export function FloorCompleteScreen({
  player,
  floor,
  shopItems,
  availablePowers,
  onClaimItem,
  onLearnPower,
  onContinue,
  onVisitShop,
}: FloorCompleteScreenProps) {
  const [spriteState, setSpriteState] = useState<'idle' | 'walk'>('walk');
  const [highlightedSlot, setHighlightedSlot] = useState<ItemType | null>(null);
  const [itemClaimed, setItemClaimed] = useState(false);
  const [isLoadingRewards, setIsLoadingRewards] = useState(true);

  // Victory walk animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setSpriteState('idle');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Simulate reward generation loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingRewards(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [floor]);

  // Memoize equipped items map for O(1) lookup
  const equippedItemsMap = useMemo(() => {
    const map = new Map<ItemType, Item>();
    player.equippedItems.forEach((item) => {
      map.set(item.type, item);
    });
    return map;
  }, [player.equippedItems]);

  const getEquippedItem = useCallback((type: ItemType): Item | undefined => {
    return equippedItemsMap.get(type);
  }, [equippedItemsMap]);

  const compareStats = useCallback((newItem: Item, oldItem: Item | undefined) => {
    if (!oldItem) return null;

    const comparisons: { stat: string; diff: number }[] = [];
    const allStats = new Set([
      ...Object.keys(newItem.statBonus),
      ...Object.keys(oldItem.statBonus),
    ]);

    allStats.forEach((stat) => {
      const newVal = (newItem.statBonus as Record<string, number>)[stat] || 0;
      const oldVal = (oldItem.statBonus as Record<string, number>)[stat] || 0;
      const diff = newVal - oldVal;
      if (diff !== 0) {
        comparisons.push({ stat, diff });
      }
    });

    return comparisons;
  }, []);

  const handleClaimItem = (index: number) => {
    const item = shopItems[index];
    if (!item) return;

    try {
      onClaimItem(index);
      setItemClaimed(true);
      setHighlightedSlot(item.type);
      setTimeout(() => setHighlightedSlot(null), 800);
    } catch (error) {
      console.error('Failed to claim item:', error);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Dark atmospheric background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Pixel stars scattered in background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="pixel-star" style={{ top: '8%', left: '12%', animationDelay: '0s' }} />
        <div className="pixel-star" style={{ top: '18%', right: '15%', animationDelay: '0.5s' }} />
        <div className="pixel-star" style={{ top: '55%', left: '5%', animationDelay: '1s' }} />
        <div className="pixel-star" style={{ top: '70%', right: '8%', animationDelay: '1.5s' }} />
        <div className="pixel-star" style={{ top: '12%', left: '55%', animationDelay: '0.7s' }} />
        <div className="pixel-star" style={{ top: '88%', left: '40%', animationDelay: '1.2s' }} />
      </div>

      <div className="relative z-10 max-w-5xl w-full space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-5xl sm:text-6xl mb-2">🏆</div>
          <h1 className="pixel-title text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-wider uppercase">
            <span className="pixel-glow-gold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              Floor {floor} Complete!
            </span>
          </h1>

          {/* Pixel divider */}
          <div className="flex justify-center items-center gap-2 pt-2" aria-hidden="true">
            <div className="pixel-diamond bg-amber-500" />
            <div className="w-12 sm:w-20 h-[2px] bg-gradient-to-r from-amber-500/80 to-transparent" />
            <div className="pixel-diamond bg-amber-400" />
            <div className="w-12 sm:w-20 h-[2px] bg-gradient-to-l from-amber-500/80 to-transparent" />
            <div className="pixel-diamond bg-amber-500" />
          </div>

          <p className="pixel-text text-pixel-xs text-slate-400 tracking-wider pt-2">
            Choose your rewards and prepare for the next challenge
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {/* Left: Character Panel */}
          <div className="pixel-panel rounded-lg p-4">
            <div className="flex flex-col items-center gap-3">
              {/* Sprite Display */}
              <div className="relative pixel-panel-dark rounded-lg p-3 border-2 border-primary/50">
                <PixelSprite
                  type={player.class}
                  state={spriteState}
                  direction="right"
                  scale={4}
                  frame={0}
                />
                <div className="absolute inset-0 bg-primary/10 rounded-lg animate-pulse" />
              </div>
              <div className="text-center">
                <div className="pixel-text text-pixel-sm text-amber-200">{player.name}</div>
                <div className="pixel-text text-pixel-xs text-slate-400">Level {player.level}</div>
              </div>

              {/* Resource Bars - show full since player gets restored on continue */}
              <div className="w-full space-y-1.5">
                <PixelStatBar
                  label="HP"
                  current={player.currentStats.maxHealth}
                  max={player.currentStats.maxHealth}
                  color="red"
                />
                <PixelStatBar
                  label="MP"
                  current={player.currentStats.maxMana}
                  max={player.currentStats.maxMana}
                  color="blue"
                />
              </div>

              {/* Stat Boxes - Core Stats */}
              <div className="grid grid-cols-4 gap-1 w-full">
                <PixelStatBox icon="⚔️" label="PWR" value={player.currentStats.power} />
                <PixelStatBox icon="🛡️" label="ARM" value={player.currentStats.armor} />
                <PixelStatBox icon="💨" label="SPD" value={player.currentStats.speed} />
                <PixelStatBox icon="✨" label="FOR" value={player.currentStats.fortune} />
              </div>

              {/* Gold Display */}
              <div className="w-full">
                <PixelStatBox icon="💰" label="GOLD" value={player.gold} />
              </div>

              {/* Equipment Slots */}
              <div className="w-full">
                <div className="pixel-text text-pixel-xs text-slate-400 mb-1.5">Equipment</div>
                <div className="space-y-1">
                  {ALL_ITEM_TYPES.map((type) => {
                    const item = getEquippedItem(type);
                    const isHighlighted = highlightedSlot === type;

                    if (item) {
                      return (
                        <div
                          key={type}
                          className={cn(
                            'pixel-panel-dark flex items-center gap-2 rounded px-2 py-1 border transition-all',
                            RARITY_COLORS[item.rarity],
                            isHighlighted && 'ring-2 ring-primary scale-[1.02]'
                          )}
                        >
                          <span className="text-sm">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className={cn('pixel-text text-pixel-xs font-medium truncate', RARITY_TEXT[item.rarity])}>
                              {item.name}
                            </div>
                            <div className="pixel-text text-pixel-xs text-success truncate">
                              {formatItemStatBonus(item)}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Empty slot - more visible styling
                    return (
                      <div
                        key={type}
                        className={cn(
                          'pixel-panel-dark flex items-center gap-2 rounded px-2 py-1 border-2 border-dashed border-slate-600/50 opacity-50 transition-all',
                          isHighlighted && 'ring-2 ring-primary scale-[1.02]'
                        )}
                      >
                        <span className="text-sm text-slate-500">{TYPE_ICONS[type]}</span>
                        <span className="pixel-text text-pixel-xs text-slate-500">
                          No {TYPE_LABELS[type]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Center: Item Rewards */}
          <div className="space-y-4">
            <div className="pixel-panel rounded-lg p-4">
              <h3 className="pixel-text text-pixel-sm text-primary mb-3 flex items-center gap-2">
                🎁 Choose One Item Reward
                {itemClaimed && <span className="text-slate-400">(Claimed)</span>}
              </h3>

              {/* Loading skeleton */}
              {isLoadingRewards ? (
                <div className="space-y-2">
                  {/* Show 3 skeleton placeholders to match typical shop item count */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="pixel-panel-dark p-3 rounded border border-slate-700/30">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-2 w-36" />
                        </div>
                        <Skeleton className="h-6 w-14 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : shopItems.length > 0 && !itemClaimed ? (
                <div className="space-y-2">
                  {shopItems.map((item, index) => {
                    const currentItem = getEquippedItem(item.type);
                    const comparison = compareStats(item, currentItem);
                    const isUpgrade = comparison
                      ? comparison.reduce((sum, c) => sum + c.diff, 0) > 0
                      : true;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'pixel-panel-dark p-3 rounded border cursor-pointer transition-all hover:scale-[1.02]',
                          RARITY_COLORS[item.rarity]
                        )}
                        onClick={() => handleClaimItem(index)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className={cn('pixel-text text-pixel-sm font-medium', RARITY_TEXT[item.rarity])}>
                              {item.name}
                            </div>
                            <div className="pixel-text text-pixel-xs text-slate-400">
                              {Object.entries(item.statBonus)
                                .map(([stat, val]) => `+${val} ${stat}`)
                                .join(', ')}
                            </div>
                          </div>
                          <Button size="sm" className="pixel-button text-pixel-xs h-6 px-2">
                            {currentItem ? 'Replace' : 'Claim'}
                          </Button>
                        </div>

                        {/* Visual stat comparison */}
                        {currentItem && comparison && comparison.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <div className="flex items-center gap-2 pixel-text text-pixel-xs mb-1.5">
                              <span className="text-slate-400">vs {currentItem.icon} {currentItem.name}</span>
                              {isUpgrade ? (
                                <span className="text-success ml-auto font-medium">↑ Upgrade</span>
                              ) : (
                                <span className="text-health ml-auto font-medium">↓ Downgrade</span>
                              )}
                            </div>
                            <div className="space-y-1">
                              {comparison.map(({ stat, diff }) => (
                                <div key={stat} className="flex items-center gap-2 pixel-text text-pixel-xs">
                                  <span className="w-12 text-slate-400 capitalize truncate">{stat}</span>
                                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        'h-full rounded-full',
                                        diff > 0 ? 'bg-success' : 'bg-health'
                                      )}
                                      style={{ width: `${Math.min(Math.abs(diff) * 10, 100)}%` }}
                                    />
                                  </div>
                                  <span className={cn('w-8 text-right font-mono', diff > 0 ? 'text-success' : 'text-health')}>
                                    {diff > 0 ? '+' : ''}{diff}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !itemClaimed ? (
                <p className="pixel-text text-pixel-xs text-slate-500 text-center py-4">
                  No items available
                </p>
              ) : (
                <p className="pixel-text text-pixel-xs text-success text-center py-4">
                  ✓ Item claimed!
                </p>
              )}
            </div>

            {/* Power Choice */}
            {availablePowers.length > 0 && (
              <div className="pixel-panel rounded-lg p-4 border-2 border-primary/30">
                <h3 className="pixel-text text-pixel-sm text-primary mb-3 flex items-center gap-2">
                  ✨ Choose a Power!
                </h3>
                <div className="space-y-2">
                  {availablePowers.map((choice, index) => {
                    const isUpgrade = isPowerUpgrade(choice);

                    // Check for synergy with player's path (only for new powers, not upgrades)
                    const powerWithSynergies = !isUpgrade ? (choice as PowerWithSynergies) : null;
                    const playerPathId = player.path?.pathId ?? null;
                    const synergizes = powerWithSynergies && playerPathId ? hasSynergy(powerWithSynergies, playerPathId) : false;
                    const synergy = powerWithSynergies && playerPathId ? getSynergy(powerWithSynergies, playerPathId) : null;

                    if (isUpgrade) {
                      return (
                        <div
                          key={`upgrade-${choice.powerId}`}
                          className="pixel-panel-dark p-3 rounded border border-gold/30 hover:border-gold/60 transition-all cursor-pointer"
                          onClick={() => onLearnPower(index)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <span className="text-2xl">{choice.powerIcon}</span>
                              <span className="absolute -top-1 -right-1 pixel-text text-pixel-xs bg-gold text-black px-1 rounded font-bold">
                                +{choice.newLevel - 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="pixel-text text-pixel-sm font-bold text-gold">{choice.powerName}</h4>
                                <span className="pixel-text text-pixel-xs bg-gold/20 text-gold px-1 py-0.5 rounded">
                                  Lv.{choice.currentLevel} → Lv.{choice.newLevel}
                                </span>
                              </div>
                              <p className="pixel-text text-pixel-xs text-slate-400">{choice.description}</p>
                            </div>
                            <Button size="sm" className="pixel-button text-pixel-xs h-6 px-2 bg-gold hover:bg-gold/90 text-black">
                              Upgrade
                            </Button>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div
                          key={choice.id}
                          className={cn(
                            "pixel-panel-dark p-3 rounded border transition-all cursor-pointer relative",
                            synergizes
                              ? "border-amber-500/50 hover:border-amber-400/70 bg-amber-500/5 shadow-sm shadow-amber-500/10"
                              : "border-info/30 hover:border-info/60"
                          )}
                          onClick={() => onLearnPower(index)}
                        >
                          {/* Synergy indicator badge */}
                          {synergizes && synergy && (
                            <div className="absolute top-2 right-2">
                              <div className="flex items-center gap-0.5 bg-amber-500/20 border border-amber-500/40 rounded px-1.5 py-0.5">
                                <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" aria-hidden="true" />
                                <span className="pixel-text text-pixel-2xs text-amber-400 font-bold">
                                  {getPathName(synergy.pathId)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{choice.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="pixel-text text-pixel-sm font-bold text-primary">{choice.name}</h4>
                                <span className="pixel-text text-pixel-xs bg-info/20 text-info px-1 py-0.5 rounded">
                                  NEW
                                </span>
                              </div>
                              <p className="pixel-text text-pixel-xs text-slate-400">{choice.description}</p>
                              <div className="flex gap-2 mt-1 pixel-text text-pixel-xs text-slate-500">
                                <span>💧 {choice.manaCost} MP</span>
                                <span>⏱️ {choice.cooldown}s CD</span>
                              </div>
                              {/* Synergy description */}
                              {synergy && (
                                <div className="mt-2 pt-2 border-t border-amber-500/20">
                                  <p className="pixel-text text-pixel-2xs text-amber-300 italic">
                                    ★ {synergy.description}
                                  </p>
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              className={cn(
                                "pixel-button text-pixel-xs h-6 px-2",
                                synergizes && "bg-amber-600 hover:bg-amber-500 text-black font-bold"
                              )}
                            >
                              Learn
                            </Button>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Powers & Gold Display */}
          <div className="pixel-panel rounded-lg p-4">
            <h3 className="pixel-text text-pixel-sm text-gold mb-3 flex items-center gap-2">
              💰 Gold: {player.gold}
            </h3>

            {/* Powers Display */}
            {player.powers.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-700/30">
                <div className="pixel-text text-pixel-xs text-slate-400 mb-2">Powers</div>
                <div className="flex flex-wrap gap-1">
                  {player.powers.map((power) => (
                    <div
                      key={power.id}
                      className="pixel-panel-dark flex items-center gap-1 border border-mana/30 rounded px-2 py-1"
                      title={power.description}
                    >
                      <span className="text-sm">{power.icon}</span>
                      <span className="pixel-text text-pixel-xs">{power.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button
            onClick={onVisitShop}
            variant="outline"
            className="pixel-button text-pixel-sm px-6 sm:px-8 py-3 sm:py-4 border-amber-600 hover:bg-amber-900/20 text-amber-400 uppercase"
          >
            🛒 Visit Shop
          </Button>
          <Button
            onClick={onContinue}
            className="pixel-button text-pixel-sm px-8 sm:px-12 py-3 sm:py-4 bg-orange-600 hover:bg-orange-500 uppercase"
          >
            Continue to Floor {floor + 1} →
          </Button>
        </div>
      </div>

      {/* Bottom decorative accent */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-1 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
      </div>
    </div>
  );
}

// Pixel art stat bar component
function PixelStatBar({
  label,
  current,
  max,
  color,
}: {
  label: string;
  current: number;
  max: number;
  color: 'red' | 'blue';
}) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const bgGradient = color === 'red'
    ? 'bg-gradient-to-r from-red-500 to-red-400'
    : 'bg-gradient-to-r from-blue-500 to-blue-400';
  const textColor = color === 'red' ? 'text-red-400' : 'text-blue-400';

  return (
    <div className="rounded">
      <div className="flex justify-between pixel-text text-pixel-xs mb-0.5">
        <span className={textColor}>{label}</span>
        <span className="text-slate-400">{current} / {max}</span>
      </div>
      <div className="pixel-progress-bar h-1.5 rounded overflow-hidden">
        <div
          className={cn('pixel-progress-fill transition-all duration-500', bgGradient)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Pixel art stat box component
function PixelStatBox({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="pixel-panel-dark rounded p-1.5 text-center">
      <div className="text-sm">{icon}</div>
      <div className="pixel-text text-pixel-xs text-slate-400">{label}</div>
      <div className="pixel-text text-pixel-sm font-bold text-slate-200">{value}</div>
    </div>
  );
}
