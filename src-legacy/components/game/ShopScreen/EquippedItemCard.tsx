import { useState } from 'react';
import { Item } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import {
  canEnhance,
  getEnhancementCost,
  getEnhancedItemName,
  getNextEnhancementBonus,
  getEnhancedStats,
} from '@/utils/enhancementUtils';
import { ENHANCEMENT_COLORS, ENHANCEMENT_DISPLAY } from '@/constants/shop';
import { TIER_COLORS } from './constants';

interface EquippedItemCardProps {
  item: Item | null;
  slotType: 'weapon' | 'armor' | 'accessory';
  playerGold: number;
  onEnhance: (slot: 'weapon' | 'armor' | 'accessory') => void;
}

export function EquippedItemCard({ item, slotType, playerGold, onEnhance }: EquippedItemCardProps) {
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
