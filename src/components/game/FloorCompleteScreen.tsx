import { useState, useEffect, useMemo } from 'react';
import { Item, ItemType } from '@/types/game';
import { Button } from '@/components/ui/button';
import { PixelSprite } from './PixelSprite';
import { cn } from '@/lib/utils';
import { formatItemStatBonus } from '@/utils/itemUtils';
import { PixelDivider } from '@/components/ui/PixelDivider';
import { PixelIcon, IconType } from '@/components/ui/PixelIcon';
import { STAT_ICONS, UI_ICONS } from '@/constants/icons';
import type { PlayerSnapshot } from '@/ecs/snapshot';

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

/**
 * Convert item type to PixelIcon type
 */
function getItemIconType(itemType: ItemType): IconType {
  return `item-${itemType}` as IconType;
}

/**
 * Convert power ID to PixelIcon type
 */
function getPowerIconType(powerId: string): IconType {
  const iconName = powerId.replace(/-/g, '_');
  return `power-${iconName}` as IconType;
}

const ALL_ITEM_TYPES: ItemType[] = ['weapon', 'armor', 'accessory'];

/**
 * Get display name for player (class name, optionally with path)
 */
function getPlayerDisplayName(player: PlayerSnapshot): string {
  const className = player.characterClass.charAt(0).toUpperCase() + player.characterClass.slice(1);
  if (player.path) {
    // Extract path name from pathId (e.g., 'warrior-berserker' -> 'Berserker')
    const pathParts = player.path.pathId.split('-');
    if (pathParts.length > 1) {
      const pathName = pathParts[1].charAt(0).toUpperCase() + pathParts[1].slice(1);
      return `${pathName} ${className}`;
    }
  }
  return className;
}

interface FloorCompleteScreenProps {
  player: PlayerSnapshot;
  floor: number;
  onContinue: () => void;
  onVisitShop: () => void;
}

export function FloorCompleteScreen({
  player,
  floor,
  onContinue,
  onVisitShop,
}: FloorCompleteScreenProps) {
  const [spriteState, setSpriteState] = useState<'idle' | 'walk'>('walk');
  const [highlightedSlot, setHighlightedSlot] = useState<ItemType | null>(null);

  // Victory walk animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setSpriteState('idle');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Get equipped item by type from equipment object
  const getEquippedItem = (type: ItemType): Item | null => {
    return player.equipment[type];
  };

  // Create array of equipped items for display
  const equippedItemsList = useMemo(() => {
    const items: Item[] = [];
    if (player.equipment.weapon) items.push(player.equipment.weapon);
    if (player.equipment.armor) items.push(player.equipment.armor);
    if (player.equipment.accessory) items.push(player.equipment.accessory);
    return items;
  }, [player.equipment]);


  return (
    <div data-testid="floor-complete" className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden">
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
          <div className="flex justify-center mb-2">
            <PixelIcon type={UI_ICONS.TROPHY} size={48} />
          </div>
          <h1 className="pixel-title text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-wider uppercase">
            <span className="pixel-glow-gold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              Floor {floor} Complete!
            </span>
          </h1>

          {/* Pixel divider */}
          <PixelDivider color="amber" className="pt-2" />

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
                  type={player.characterClass}
                  state={spriteState}
                  direction="right"
                  scale={4}
                  frame={0}
                />
                <div className="absolute inset-0 bg-primary/10 rounded-lg animate-pulse" />
              </div>
              <div className="text-center">
                <div className="pixel-text text-pixel-sm text-amber-200">{getPlayerDisplayName(player)}</div>
                <div className="pixel-text text-pixel-xs text-slate-400">Level {player.level}</div>
              </div>

              {/* Resource Bars - show full since player gets restored on continue */}
              <div className="w-full space-y-1.5">
                <PixelStatBar
                  label="HP"
                  current={player.health.max}
                  max={player.health.max}
                  color="red"
                />
                {player.mana && (
                  <PixelStatBar
                    label="MP"
                    current={player.mana.max}
                    max={player.mana.max}
                    color="blue"
                  />
                )}
              </div>

              {/* Stat Boxes - Core Stats */}
              <div className="grid grid-cols-4 gap-1 w-full">
                <PixelStatBox iconType={STAT_ICONS.POWER} label="PWR" value={player.attack.baseDamage} />
                <PixelStatBox iconType={STAT_ICONS.ARMOR} label="ARM" value={player.defense.value} />
                <PixelStatBox iconType={STAT_ICONS.SPEED} label="SPD" value={player.speed.value} />
                <PixelStatBox iconType={STAT_ICONS.FORTUNE} label="CRIT" value={`${Math.round(player.attack.critChance * 100)}%`} />
              </div>

              {/* Gold Display */}
              <div className="w-full">
                <PixelStatBox iconType={STAT_ICONS.GOLD} label="GOLD" value={player.gold} />
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
                          <PixelIcon type={getItemIconType(item.type)} size={16} />
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
                        <PixelIcon type={getItemIconType(type)} size={16} className="opacity-50" />
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

          {/* Center: Floor Complete Message */}
          <div className="pixel-panel rounded-lg p-4 flex flex-col items-center justify-center">
            <PixelIcon type={UI_ICONS.SPARKLE} size={48} className="mb-3" />
            <h3 className="pixel-text text-pixel-sm text-primary mb-2 text-center">
              Well Done!
            </h3>
            <p className="pixel-text text-pixel-xs text-slate-400 text-center">
              You've cleared all enemies on this floor. Visit the shop to gear up or continue to the next challenge.
            </p>
          </div>

          {/* Right: Powers & Gold Display */}
          <div className="pixel-panel rounded-lg p-4">
            <h3 className="pixel-text text-pixel-sm text-gold mb-3 flex items-center gap-2">
              <PixelIcon type={STAT_ICONS.GOLD} size={24} /> Gold: {player.gold}
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
                      <PixelIcon type={getPowerIconType(power.id)} size={16} />
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
            className="pixel-button text-pixel-sm px-6 sm:px-8 py-3 sm:py-4 border-amber-600 hover:bg-amber-900/20 text-amber-400 uppercase flex items-center gap-2"
          >
            <PixelIcon type={UI_ICONS.HAMMER} size={16} /> Visit Shop
          </Button>
          <Button
            data-testid="continue-button"
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
  iconType,
  label,
  value,
}: {
  iconType: IconType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="pixel-panel-dark rounded p-1.5 text-center">
      <div className="flex justify-center">
        <PixelIcon type={iconType} size={16} />
      </div>
      <div className="pixel-text text-pixel-xs text-slate-400">{label}</div>
      <div className="pixel-text text-pixel-sm font-bold text-slate-200">{value}</div>
    </div>
  );
}
