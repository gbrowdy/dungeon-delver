import { useState, useEffect } from 'react';
import { Player, Item, ItemType, UpgradePurchases } from '@/types/game';
import { Button } from '@/components/ui/button';
import { PixelSprite } from './PixelSprite';
import { cn } from '@/lib/utils';
import { calculateUpgradeCost, STAT_UPGRADE_VALUES, StatUpgradeType } from '@/constants/game';
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

// Stat upgrade configuration - same as FloorCompleteScreen for consistency
interface StatUpgradeConfig {
  id: string;
  upgradeType: StatUpgradeType;
  icon: string;
  stat: string;
  formatValue: (value: number) => string;
}

const STAT_UPGRADE_CONFIGS: StatUpgradeConfig[] = [
  { id: 'hp-up', upgradeType: 'HP', icon: '❤️', stat: 'health', formatValue: (v) => `+${v} HP` },
  { id: 'atk-up', upgradeType: 'ATTACK', icon: '⚔️', stat: 'attack', formatValue: (v) => `+${v} ATK` },
  { id: 'def-up', upgradeType: 'DEFENSE', icon: '🛡️', stat: 'defense', formatValue: (v) => `+${v} DEF` },
  { id: 'crit-up', upgradeType: 'CRIT', icon: '💥', stat: 'critChance', formatValue: (v) => `+${v}% CRIT` },
  { id: 'dodge-up', upgradeType: 'DODGE', icon: '🌀', stat: 'dodgeChance', formatValue: (v) => `+${v}% DODGE` },
  { id: 'mana-up', upgradeType: 'MANA', icon: '💠', stat: 'mana', formatValue: (v) => `+${v} MP` },
  { id: 'speed-up', upgradeType: 'SPEED', icon: '💨', stat: 'speed', formatValue: (v) => `+${v} SPD` },
  { id: 'hpregen-up', upgradeType: 'HP_REGEN', icon: '💗', stat: 'hpRegen', formatValue: (v) => `+${v} HP/s` },
  { id: 'mpregen-up', upgradeType: 'MP_REGEN', icon: '💎', stat: 'mpRegen', formatValue: (v) => `+${v} MP/s` },
  { id: 'cooldown-up', upgradeType: 'COOLDOWN_SPEED', icon: '⚡', stat: 'cooldownSpeed', formatValue: (v) => `+${Math.floor(v * 100)}% CD` },
  { id: 'critdmg-up', upgradeType: 'CRIT_DAMAGE', icon: '🎯', stat: 'critDamage', formatValue: (v) => `+${Math.floor(v * 100)}% Crit` },
  { id: 'goldfind-up', upgradeType: 'GOLD_FIND', icon: '🪙', stat: 'goldFind', formatValue: (v) => `+${Math.floor(v * 100)}% Gold` },
];

// Get the current cost for an upgrade based on purchase count
function getUpgradeCost(upgradeType: StatUpgradeType, purchases: UpgradePurchases): number {
  return calculateUpgradeCost(upgradeType, purchases[upgradeType]);
}

// Legacy interface for backwards compatibility
export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  statAffected: 'health' | 'attack' | 'defense' | 'critChance' | 'dodgeChance' | 'mana';
  apply: (player: Player) => Player;
}

// Legacy BASE_UPGRADES for backwards compatibility with applyUpgrade in useGameState
const BASE_UPGRADES: UpgradeOption[] = [];

interface DeathScreenProps {
  player: Player;
  floor: number;
  room: number;
  onUpgrade: (upgradeId: string) => void;
  onRetry: () => void;
  onAbandon: () => void;
}

export function DeathScreen({ player, floor, room, onUpgrade, onRetry, onAbandon }: DeathScreenProps) {
  const [highlightedStat, setHighlightedStat] = useState<string | null>(null);
  const [spriteState, setSpriteState] = useState<'idle' | 'hit'>('hit');
  const [showPulse, setShowPulse] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  // Start with hit state, then transition to idle
  useEffect(() => {
    const timer = setTimeout(() => {
      setSpriteState('idle');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleUpgrade = (config: StatUpgradeConfig) => {
    const cost = getUpgradeCost(config.upgradeType, player.upgradePurchases);
    if (player.gold < cost) return;

    // Highlight the affected stat
    setHighlightedStat(config.stat);
    setShowPulse(true);

    // Briefly animate the sprite
    setSpriteState('idle');

    // Clear highlight after animation
    setTimeout(() => {
      setHighlightedStat(null);
      setShowPulse(false);
    }, 800);

    onUpgrade(config.id);
  };

  const getStatClass = (stat: string) => {
    if (highlightedStat === stat) {
      return 'bg-primary/20 scale-110 ring-2 ring-primary';
    }
    return '';
  };

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
              <span className="pixel-glow-red bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent">
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
              <div
                className={cn(
                  'relative pixel-panel-dark rounded-lg p-2 transition-all duration-300',
                  showPulse && 'border-primary animate-pulse'
                )}
              >
                <PixelSprite
                  type={player.class}
                  state={spriteState}
                  direction="right"
                  scale={4}
                  frame={0}
                />
                {showPulse && (
                  <div className="absolute inset-0 bg-primary/20 rounded-lg animate-ping" />
                )}
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
                  highlighted={highlightedStat === 'health'}
                />
                <PixelStatBar
                  label="MP"
                  current={player.currentStats.maxMana}
                  max={player.currentStats.maxMana}
                  color="blue"
                  highlighted={highlightedStat === 'mana'}
                />
              </div>

              {/* All Stats in one compact grid */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                <PixelStatBox icon="⚔️" label="ATK" value={player.currentStats.attack} className={getStatClass('attack')} />
                <PixelStatBox icon="🛡️" label="DEF" value={player.currentStats.defense} className={getStatClass('defense')} />
                <PixelStatBox icon="💨" label="SPD" value={player.currentStats.speed} className={getStatClass('speed')} />
                <PixelStatBox icon="💥" label="CRIT" value={`${player.currentStats.critChance}%`} className={getStatClass('critChance')} />
                <PixelStatBox icon="🌀" label="DODGE" value={`${player.currentStats.dodgeChance}%`} className={getStatClass('dodgeChance')} />
                <PixelStatBox icon="💗" label="HP/s" value={player.currentStats.hpRegen.toFixed(1)} className={getStatClass('hpRegen')} />
                <PixelStatBox icon="💎" label="MP/s" value={player.currentStats.mpRegen.toFixed(1)} className={getStatClass('mpRegen')} />
                <PixelStatBox icon="⚡" label="CD" value={`${Math.floor(player.currentStats.cooldownSpeed * 100)}%`} className={getStatClass('cooldownSpeed')} />
                <PixelStatBox icon="🎯" label="CDMG" value={`${Math.floor(player.currentStats.critDamage * 100)}%`} className={getStatClass('critDamage')} />
                <PixelStatBox icon="🪙" label="GOLD" value={`${Math.floor(player.currentStats.goldFind * 100)}%`} className={getStatClass('goldFind')} />
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

        {/* Upgrades Section */}
        <div className="pixel-panel rounded-lg p-3">
          <h2 className="pixel-text text-pixel-xs text-gold mb-2">💰 Spend Gold on Upgrades</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1">
            {STAT_UPGRADE_CONFIGS.map((config) => {
              const cost = getUpgradeCost(config.upgradeType, player.upgradePurchases);
              const value = STAT_UPGRADE_VALUES[config.upgradeType];
              const purchaseCount = player.upgradePurchases[config.upgradeType];
              const canAfford = player.gold >= cost;
              return (
                <button
                  key={config.id}
                  onClick={() => handleUpgrade(config)}
                  disabled={!canAfford}
                  className={cn(
                    'pixel-panel-dark flex flex-col items-center p-1.5 rounded border transition-all text-center relative',
                    canAfford
                      ? 'border-gold/30 hover:border-gold/60 hover:scale-105 cursor-pointer'
                      : 'border-slate-700/30 opacity-50 cursor-not-allowed'
                  )}
                >
                  {purchaseCount > 0 && (
                    <span className="absolute -top-1 -right-1 pixel-text text-pixel-2xs bg-primary/30 text-primary px-0.5 rounded">
                      {purchaseCount}
                    </span>
                  )}
                  <span className="text-sm">{config.icon}</span>
                  <span className="pixel-text text-pixel-2xs font-medium">{config.formatValue(value)}</span>
                  <span className="pixel-text text-pixel-2xs text-gold">{cost}g</span>
                </button>
              );
            })}
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
  highlighted,
}: {
  label: string;
  current: number;
  max: number;
  color: 'red' | 'blue';
  highlighted: boolean;
}) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const bgGradient = color === 'red'
    ? 'bg-gradient-to-r from-red-500 to-red-400'
    : 'bg-gradient-to-r from-blue-500 to-blue-400';
  const textColor = color === 'red' ? 'text-red-400' : 'text-blue-400';

  return (
    <div
      className={cn(
        'transition-all duration-300 rounded p-1.5 pixel-panel-dark',
        highlighted && 'ring-2 ring-primary scale-[1.02]'
      )}
    >
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
  className,
}: {
  icon: string;
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'pixel-panel-dark rounded p-1 text-center transition-all duration-300',
        className
      )}
    >
      <div className="text-sm">{icon}</div>
      <div className="pixel-text text-pixel-2xs text-slate-400">{label}</div>
      <div className="pixel-text text-pixel-2xs font-bold text-slate-200">{value}</div>
    </div>
  );
}

export { BASE_UPGRADES };
