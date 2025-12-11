import { useCombatPlayer } from '@/contexts/CombatContext';
import { cn } from '@/lib/utils';
import { Item, ItemType } from '@/types/game';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TouchTooltip } from '@/components/ui/touch-tooltip';
import { formatItemStatBonus } from '@/utils/itemUtils';

const ALL_ITEM_TYPES: ItemType[] = ['weapon', 'armor', 'accessory'];

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

/**
 * PlayerStatsPanel - Displays player info, equipment, stats grid, and XP bar.
 * Styled with pixel art / 8-bit retro aesthetic.
 * Compact layout on mobile to reduce visual clutter.
 */
export function PlayerStatsPanel() {
  const player = useCombatPlayer();

  return (
    <div className="pixel-panel rounded-lg p-1.5 xs:p-2 sm:p-3">
      {/* Header: Player info and equipment - more compact on mobile */}
      <div className="flex items-center justify-between flex-wrap gap-1 xs:gap-2">
        <PlayerInfo
          name={player.name}
          playerClass={player.class}
          level={player.level}
        />
        <EquipmentDisplay items={player.equippedItems} />
      </div>

      {/* Stats Grid - only show primary stats on very small screens */}
      <StatsGrid
        attack={player.currentStats.attack}
        defense={player.currentStats.defense}
        speed={player.currentStats.speed}
        critChance={player.currentStats.critChance}
        dodgeChance={player.currentStats.dodgeChance}
        critDamage={player.currentStats.critDamage || 2}
        hpRegen={player.currentStats.hpRegen || 0}
        mpRegen={player.currentStats.mpRegen || 0}
        cooldownSpeed={player.currentStats.cooldownSpeed || 1}
        goldFind={player.currentStats.goldFind || 0}
      />

      {/* Gold and XP Progress */}
      <div className="mt-1.5 xs:mt-2 space-y-1">
        <div className="flex items-center gap-1 pixel-text text-pixel-2xs xs:text-pixel-xs">
          <span className="text-slate-400">Gold:</span>
          <span className="text-gold font-bold">{player.gold}💰</span>
        </div>
        <XPProgressBar
          current={player.experience}
          max={player.experienceToNext}
        />
      </div>
    </div>
  );
}

/**
 * PlayerInfo - Shows player name, class icon, and level with pixel styling.
 */
interface PlayerInfoProps {
  name: string;
  playerClass: string;
  level: number;
}

function PlayerInfo({ name, playerClass, level }: PlayerInfoProps) {
  return (
    <div className="flex items-center gap-1 xs:gap-2">
      <span className="text-lg xs:text-xl sm:text-2xl" aria-hidden="true">{getClassIcon(playerClass)}</span>
      <div>
        <div className="pixel-text text-pixel-xs xs:text-pixel-sm sm:text-pixel-base text-amber-200 font-bold">{name}</div>
        <div className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400">Level {level}</div>
      </div>
    </div>
  );
}

/**
 * Returns the emoji icon for a player class.
 */
function getClassIcon(playerClass: string): string {
  const icons: Record<string, string> = {
    warrior: '⚔️',
    mage: '🔮',
    rogue: '🗡️',
    paladin: '🛡️',
  };
  return icons[playerClass] || '👤';
}

/**
 * EquipmentDisplay - Shows all equipment slots (weapon, armor, accessory).
 * Empty slots are clearly indicated with dashed borders.
 * On mobile, shows item stats inline since tooltips don't work well with touch.
 */
interface EquipmentDisplayProps {
  items: Item[];
}

function EquipmentDisplay({ items }: EquipmentDisplayProps) {
  // Create a map of equipped items by type for O(1) lookup
  const equippedByType = new Map<ItemType, Item>();
  items.forEach((item) => equippedByType.set(item.type, item));

  return (
    <div className="flex flex-col xs:flex-row gap-1 xs:gap-1.5 overflow-hidden">
      {ALL_ITEM_TYPES.map((type) => {
        const item = equippedByType.get(type);
        return item ? (
          <EquipmentSlot key={type} item={item} />
        ) : (
          <EmptyEquipmentSlot key={type} type={type} />
        );
      })}
    </div>
  );
}

/**
 * Rarity border colors for equipment slots.
 */
const RARITY_BORDER_COLORS: Record<string, string> = {
  common: 'border-rarity-common',
  uncommon: 'border-rarity-uncommon',
  rare: 'border-rarity-rare',
  epic: 'border-rarity-epic',
  legendary: 'border-rarity-legendary pixel-border-pulse',
};

/**
 * Rarity background colors for equipment slots.
 */
const RARITY_BG_COLORS: Record<string, string> = {
  common: 'bg-rarity-common/10',
  uncommon: 'bg-rarity-uncommon/10',
  rare: 'bg-rarity-rare/10',
  epic: 'bg-rarity-epic/10',
  legendary: 'bg-rarity-legendary/20',
};

/**
 * EmptyEquipmentSlot - Shows an empty equipment slot with clear visual indication.
 */
interface EmptyEquipmentSlotProps {
  type: ItemType;
}

function EmptyEquipmentSlot({ type }: EmptyEquipmentSlotProps) {
  const slotButton = (
    <div
      className="pixel-panel-dark w-8 h-8 sm:w-10 sm:h-10 rounded border-2 border-dashed border-slate-600/50 flex items-center justify-center opacity-50"
      aria-label={`Empty ${TYPE_LABELS[type]} slot`}
    >
      <span className="text-base text-slate-500" aria-hidden="true">{TYPE_ICONS[type]}</span>
    </div>
  );

  // Mobile: just show the slot
  // Desktop: show with inline label
  return (
    <>
      {/* Mobile: Simple empty slot */}
      <div className="xs:hidden">
        {slotButton}
      </div>

      {/* Desktop: Show slot with type label */}
      <div className="hidden xs:flex items-center gap-1.5">
        {slotButton}
        <span className="pixel-text text-pixel-xs text-slate-500 hidden sm:inline">
          Empty
        </span>
      </div>
    </>
  );
}

/**
 * EquipmentSlot - A single equipped item with tooltip, pixel-styled.
 * On desktop, shows item stats inline for better visibility.
 */
interface EquipmentSlotProps {
  item: Item;
}

function EquipmentSlot({ item }: EquipmentSlotProps) {
  const statText = formatItemStatBonus(item);

  const rarityTextColor = {
    common: 'text-rarity-common',
    uncommon: 'text-rarity-uncommon',
    rare: 'text-rarity-rare',
    epic: 'text-rarity-epic',
    legendary: 'text-rarity-legendary',
  }[item.rarity] || 'text-gray-400';

  const itemHasEffect = !!item.effect;

  const tooltipContent = (
    <>
      <div className={cn('pixel-text text-pixel-sm font-medium', rarityTextColor)}>
        {item.name}
      </div>
      <div className="pixel-text text-pixel-xs text-slate-400 capitalize">{item.rarity} {item.type}</div>
      <div className="pixel-text text-pixel-xs text-success mt-1">{statText}</div>
      {item.effect && (
        <div className="pixel-text text-pixel-xs text-accent mt-1 font-medium">{item.effect.description}</div>
      )}
    </>
  );

  const itemButton = (
    <button
      className={cn(
        'pixel-panel-dark w-8 h-8 sm:w-10 sm:h-10 rounded border-2 flex items-center justify-center cursor-pointer transition-all hover:scale-110 relative',
        RARITY_BORDER_COLORS[item.rarity] || 'border-gray-500',
        RARITY_BG_COLORS[item.rarity] || 'bg-gray-500/10'
      )}
      aria-label={`${item.name}: ${item.rarity} ${item.type}. ${statText}${item.effect ? `. ${item.effect.description}` : ''}`}
    >
      <span className="text-base" aria-hidden="true">{item.icon}</span>
      {itemHasEffect && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-accent rounded-full border border-background flex items-center justify-center text-[6px]" aria-hidden="true">
          ✨
        </span>
      )}
    </button>
  );

  // Mobile: Touch tooltip (tap to reveal)
  // Desktop: Show item with inline stats
  return (
    <>
      {/* Mobile: TouchTooltip for tap-to-reveal */}
      <div className="xs:hidden">
        <TouchTooltip content={tooltipContent} side="bottom">
          {itemButton}
        </TouchTooltip>
      </div>

      {/* Desktop: Show item with inline stats */}
      <div className="hidden xs:flex items-center gap-1.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {itemButton}
            </TooltipTrigger>
            <TooltipContent side="top" className="pixel-panel max-w-xs">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {/* Inline stats display for desktop */}
        <div className="hidden sm:block min-w-0">
          <div className={cn('pixel-text text-pixel-xs font-medium break-words', rarityTextColor)}>
            {item.name}
          </div>
          <div className="pixel-text text-pixel-xs text-success break-words">
            {statText}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * StatsGrid - Displays all player stats in a pixel-styled grid layout.
 */
interface StatsGridProps {
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  dodgeChance: number;
  critDamage: number;
  hpRegen: number;
  mpRegen: number;
  cooldownSpeed: number;
  goldFind: number;
}

function StatsGrid({
  attack,
  defense,
  speed,
  critChance,
  dodgeChance,
  critDamage,
  hpRegen,
  mpRegen,
  cooldownSpeed,
  goldFind,
}: StatsGridProps) {
  return (
    <div className="mt-1.5 grid grid-cols-4 xs:grid-cols-5 sm:grid-cols-10 gap-1">
      <StatItem icon="⚔️" label="ATK" value={attack} />
      <StatItem icon="🛡️" label="DEF" value={defense} />
      <StatItem icon="💨" label="SPD" value={speed} />
      <StatItem icon="💥" label="CRIT" value={`${critChance}%`} />
      <StatItem icon="🎯" label="DODGE" value={`${dodgeChance}%`} />
      <StatItem icon="💀" label="CDMG" value={`${Math.floor(critDamage * 100)}%`} />
      <StatItem icon="❤️" label="HP/s" value={hpRegen.toFixed(1)} />
      <StatItem icon="💧" label="MP/s" value={mpRegen.toFixed(1)} />
      <StatItem icon="⏱️" label="CD" value={`${(cooldownSpeed * 100).toFixed(0)}%`} />
      <StatItem icon="💰" label="GOLD+" value={`${Math.floor(goldFind * 100)}%`} />
    </div>
  );
}

/**
 * StatItem - A single stat display with icon, label, and value in pixel style.
 */
interface StatItemProps {
  icon: string;
  label: string;
  value: string | number;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div className="pixel-panel-dark flex flex-col items-center text-center rounded p-1 xs:p-1.5 sm:p-2">
      <span className="text-pixel-xs xs:text-pixel-sm" aria-hidden="true">{icon}</span>
      <span className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400">{label}</span>
      <span className="pixel-text text-pixel-2xs xs:text-pixel-xs sm:text-pixel-sm font-medium text-slate-200">{value}</span>
    </div>
  );
}

/**
 * XPProgressBar - Shows experience progress toward next level with pixel styling.
 */
interface XPProgressBarProps {
  current: number;
  max: number;
}

function XPProgressBar({ current, max }: XPProgressBarProps) {
  const percentage = (current / max) * 100;

  return (
    <div>
      <div className="flex justify-between pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400 mb-0.5 xs:mb-1">
        <span>XP</span>
        <span>{current}/{max}</span>
      </div>
      <div
        className="pixel-progress-bar h-2 xs:h-2.5 rounded overflow-hidden"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`Experience: ${current} of ${max}`}
      >
        <div
          className="pixel-progress-fill h-full bg-gradient-to-r from-xp to-xp/80 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
