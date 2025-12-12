import { useState, useEffect } from 'react';
import { Player, Item, ItemType } from '@/types/game';
import { Button } from '@/components/ui/button';
import { PixelSprite } from './PixelSprite';
import { cn } from '@/lib/utils';
import { formatItemStatBonus } from '@/utils/itemUtils';
import { TouchTooltip } from '@/components/ui/touch-tooltip';
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

const RARITY_COLORS: Record<Item['rarity'], string> = {
  common: 'border-rarity-common bg-rarity-common/10 text-rarity-common',
  uncommon: 'border-rarity-uncommon bg-rarity-uncommon/10 text-rarity-uncommon',
  rare: 'border-rarity-rare bg-rarity-rare/10 text-rarity-rare',
  epic: 'border-rarity-epic bg-rarity-epic/10 text-rarity-epic',
  legendary: 'border-rarity-legendary bg-rarity-legendary/10 text-rarity-legendary',
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

interface DeathScreenProps {
  player: Player;
  floor: number;
  room: number;
  onRetry: () => void;
  onAbandon: () => void;
}

export function DeathScreen({ player, floor, room, onRetry, onAbandon }: DeathScreenProps) {
  const [spriteState, setSpriteState] = useState<'idle' | 'hit'>('hit');
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  // Start with hit state, then transition to idle
  useEffect(() => {
    const timer = setTimeout(() => {
      setSpriteState('idle');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Dark atmospheric background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Pixel stars scattered in background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="pixel-star" style={{ top: '10%', left: '15%', animationDelay: '0s' }} />
        <div className="pixel-star" style={{ top: '25%', right: '10%', animationDelay: '0.5s' }} />
        <div className="pixel-star" style={{ top: '60%', left: '8%', animationDelay: '1s' }} />
        <div className="pixel-star" style={{ top: '75%', right: '20%', animationDelay: '1.5s' }} />
        <div className="pixel-star" style={{ top: '5%', left: '45%', animationDelay: '0.7s' }} />
        <div className="pixel-star" style={{ top: '85%', left: '55%', animationDelay: '1.2s' }} />
      </div>

      <div className="relative z-10 max-w-4xl w-full space-y-3 sm:space-y-4">
        {/* Header - more compact */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl sm:text-4xl">💀</span>
            <h1 className="pixel-title text-base sm:text-lg md:text-xl font-bold tracking-wider uppercase">
              <span className="pixel-glow-red bg-gradient-to-r from-red-300 via-red-400 to-orange-400 bg-clip-text text-transparent">
                Fallen in Battle
              </span>
            </h1>
          </div>
          <p className="pixel-text text-pixel-2xs text-slate-400 tracking-wider">
            Defeated on Floor {floor}, Room {room}
          </p>
        </div>

        {/* Character Stats Panel */}
        <div className="pixel-panel rounded-lg p-3 sm:p-4">
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
            {/* Sprite Display - more compact */}
            <div className="flex flex-col items-center">
              <div className="relative pixel-panel-dark rounded-lg p-2">
                <PixelSprite
                  type={player.class}
                  state={spriteState}
                  direction="right"
                  scale={4}
                  frame={0}
                />
              </div>
              <div className="mt-1 text-center">
                <div className="pixel-text text-pixel-xs text-amber-200">{player.name}</div>
                <div className="pixel-text text-pixel-2xs text-slate-400">Level {player.level}</div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="flex-1 space-y-2">
              {/* Resource Bars - show full since player gets restored on retry */}
              <div className="grid grid-cols-2 gap-2">
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

              {/* All Stats in one compact grid */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                <PixelStatBox icon="⚔️" label="ATK" value={player.currentStats.attack} />
                <PixelStatBox icon="🛡️" label="DEF" value={player.currentStats.defense} />
                <PixelStatBox icon="💨" label="SPD" value={player.currentStats.speed} />
                <PixelStatBox icon="💥" label="CRIT" value={`${player.currentStats.critChance}%`} />
                <PixelStatBox icon="🌀" label="DODGE" value={`${player.currentStats.dodgeChance}%`} />
                <PixelStatBox icon="💗" label="HP/s" value={player.currentStats.hpRegen.toFixed(1)} />
                <PixelStatBox icon="💎" label="MP/s" value={player.currentStats.mpRegen.toFixed(1)} />
                <PixelStatBox icon="⚡" label="CD" value={`${Math.floor(player.currentStats.cooldownSpeed * 100)}%`} />
                <PixelStatBox icon="🎯" label="CDMG" value={`${Math.floor(player.currentStats.critDamage * 100)}%`} />
                <PixelStatBox icon="🪙" label="GOLD" value={`${Math.floor(player.currentStats.goldFind * 100)}%`} />
              </div>

              {/* Gold, Powers, and Equipment in one row */}
              <div className="flex gap-2 items-stretch">
                <div className="pixel-panel-dark flex items-center gap-1.5 rounded px-2 py-1">
                  <span className="text-base">💰</span>
                  <span className="pixel-text text-pixel-xs text-gold font-bold">{player.gold}</span>
                </div>
                {player.powers.length > 1 && (
                  <div className="pixel-panel-dark flex items-center gap-1.5 rounded px-2 py-1">
                    <span className="text-base">✨</span>
                    <span className="pixel-text text-pixel-xs text-mana font-bold">{player.powers.length}</span>
                  </div>
                )}
                {/* Equipment inline */}
                <div className="flex-1 flex flex-col gap-1">
                  {ALL_ITEM_TYPES.map((type) => {
                    const item = player.equippedItems.find((i) => i.type === type);

                    if (item) {
                      const rarityTextColor = RARITY_COLORS[item.rarity].split(' ').pop() || 'text-slate-400';
                      const tooltipContent = (
                        <>
                          <div className={cn('pixel-text text-pixel-sm font-medium', rarityTextColor)}>
                            {item.name}
                          </div>
                          <div className="pixel-text text-pixel-xs text-slate-400 capitalize">{item.rarity} {item.type}</div>
                          <div className="pixel-text text-pixel-xs text-success mt-1">{formatItemStatBonus(item)}</div>
                          {item.effect && (
                            <div className="pixel-text text-pixel-xs text-accent mt-1 font-medium">{item.effect.description}</div>
                          )}
                        </>
                      );

                      return (
                        <TouchTooltip key={type} content={tooltipContent} side="top">
                          <div
                            className={cn(
                              'pixel-panel-dark flex items-center gap-2 rounded px-2 py-1 border cursor-pointer',
                              RARITY_COLORS[item.rarity]
                            )}
                          >
                            <span className="text-base">{item.icon}</span>
                            <div className="flex-1 min-w-0 hidden sm:block">
                              <div className={cn('pixel-text text-pixel-xs font-medium truncate', rarityTextColor)}>
                                {item.name}
                              </div>
                              <div className="pixel-text text-pixel-xs text-success truncate">
                                {formatItemStatBonus(item)}
                              </div>
                            </div>
                          </div>
                        </TouchTooltip>
                      );
                    }

                    // Empty slot - more visible styling
                    return (
                      <div
                        key={type}
                        className="pixel-panel-dark flex items-center gap-2 rounded px-2 py-1 border-2 border-dashed border-slate-600/50 opacity-50"
                      >
                        <span className="text-base text-slate-500">{TYPE_ICONS[type]}</span>
                        <span className="pixel-text text-pixel-xs text-slate-500 hidden sm:inline">
                          No {TYPE_LABELS[type]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <Button
            onClick={onRetry}
            className="pixel-button text-pixel-xs px-4 sm:px-6 py-2 bg-orange-600 hover:bg-orange-500 uppercase"
          >
            Retry Floor {floor}
          </Button>
          <Button
            onClick={() => setShowAbandonConfirm(true)}
            variant="outline"
            className="pixel-button text-pixel-xs px-4 sm:px-6 py-2 border-slate-600 hover:bg-slate-800 uppercase"
          >
            Start Fresh
          </Button>
        </div>

        {/* Abandon Confirmation Dialog */}
        <AlertDialog open={showAbandonConfirm} onOpenChange={setShowAbandonConfirm}>
          <AlertDialogContent className="pixel-panel border-2 border-red-500/50">
            <AlertDialogHeader>
              <AlertDialogTitle className="pixel-text text-pixel-xs text-red-400">Start a New Run?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-1">
                  <p className="pixel-text text-pixel-2xs text-slate-400">This will permanently abandon:</p>
                  <ul className="space-y-0.5 pixel-text text-pixel-2xs text-slate-300">
                    <li>Level {player.level} {player.class}</li>
                    <li>Floor {floor}, Room {room}</li>
                    <li className="text-gold">{player.gold} gold</li>
                    <li>{player.powers.length} powers learned</li>
                    {player.equippedItems.length > 0 && (
                      <li>{player.equippedItems.length} equipped items</li>
                    )}
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="pixel-button text-pixel-2xs">Keep Playing</AlertDialogCancel>
              <AlertDialogAction
                onClick={onAbandon}
                className="pixel-button text-pixel-2xs bg-red-600 hover:bg-red-500"
              >
                Start Fresh
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Bottom decorative accent */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-1 bg-gradient-to-r from-transparent via-red-700/40 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
      </div>
    </div>
  );
}

// Pixel art stat bar component - compact version
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
    <div className="rounded p-1.5 pixel-panel-dark">
      <div className="flex justify-between pixel-text text-pixel-2xs mb-0.5">
        <span className={textColor}>{label}</span>
        <span className="text-slate-400">{current}/{max}</span>
      </div>
      <div className="pixel-progress-bar h-1.5 rounded overflow-hidden">
        <div
          className={cn('pixel-progress-fill transition-all duration-500 h-full', bgGradient)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Pixel art stat box component - compact version
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
    <div className="pixel-panel-dark rounded p-1 text-center">
      <div className="text-sm">{icon}</div>
      <div className="pixel-text text-pixel-2xs text-slate-400">{label}</div>
      <div className="pixel-text text-pixel-2xs font-bold text-slate-200">{value}</div>
    </div>
  );
}
