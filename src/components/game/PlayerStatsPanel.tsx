import { useCombatPlayer } from '@/contexts/CombatContext';
import { cn } from '@/lib/utils';
import { Item, ItemType, Player } from '@/types/game';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TouchTooltip } from '@/components/ui/touch-tooltip';
import { formatItemStatBonus } from '@/utils/itemUtils';
import { getCritChance, getCritDamage, getDodgeChance } from '@/utils/fortuneUtils';
import { ReactNode } from 'react';
import { getPlayerDisplayName, getPathName } from '@/utils/powerSynergies';
import * as Icons from 'lucide-react';
import { getAbilitiesByIds } from '@/utils/pathUtils';
import { PathAbility } from '@/types/paths';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { STAT_ICONS, CLASS_ICONS, ITEM_ICONS, UI_ICONS } from '@/constants/icons';

/**
 * Get the Lucide icon component for an item.
 * Item data stores icon names directly as valid Lucide icon names (e.g., 'Sword', 'Axe', 'Wand2').
 * Falls back to 'Package' if the icon doesn't exist.
 */
function getItemIcon(iconName: string | undefined): keyof typeof Icons {
  if (iconName && iconName in Icons) {
    return iconName as keyof typeof Icons;
  }
  return 'Package';
}

const ALL_ITEM_TYPES: ItemType[] = ['weapon', 'armor', 'accessory'];

const TYPE_LABELS: Record<ItemType, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};

const TYPE_ICON_TYPES: Record<ItemType, string> = {
  weapon: ITEM_ICONS.WEAPON,
  armor: ITEM_ICONS.ARMOR,
  accessory: ITEM_ICONS.ACCESSORY,
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
          name={getPlayerDisplayName(player)}
          playerClass={player.class}
          level={player.level}
        />
        <EquipmentDisplay items={player.equippedItems} />
      </div>

      {/* Stats Grid - only show primary stats on very small screens */}
      <StatsGrid
        power={player.currentStats.power}
        armor={player.currentStats.armor}
        speed={player.currentStats.speed}
        fortune={player.currentStats.fortune}
      />

      {/* Path Abilities Display */}
      {player.path && player.path.abilities.length > 0 && (
        <AbilitiesDisplay abilityIds={player.path.abilities} />
      )}

      {/* Gold and XP Progress */}
      <div className="mt-1.5 xs:mt-2 space-y-1">
        <div className="flex items-center gap-1 pixel-text text-pixel-2xs xs:text-pixel-xs">
          <span className="text-slate-400">Gold:</span>
          <span className="text-gold font-bold flex items-center gap-0.5">
            {player.gold}
            <PixelIcon type={STAT_ICONS.GOLD as any} size={16} />
          </span>
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
  const classIconType = getClassIconType(playerClass);

  return (
    <div className="flex items-center gap-1 xs:gap-2">
      <PixelIcon type={classIconType as any} size={32} className="w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8" />
      <div>
        <div className="pixel-text text-pixel-xs xs:text-pixel-sm sm:text-pixel-base text-amber-200 font-bold">{name}</div>
        <div className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400">Level {level}</div>
      </div>
    </div>
  );
}

/**
 * Returns the icon type for a player class.
 */
function getClassIconType(playerClass: string): string {
  const icons: Record<string, string> = {
    warrior: CLASS_ICONS.WARRIOR,
    mage: CLASS_ICONS.MAGE,
    rogue: CLASS_ICONS.ROGUE,
    paladin: CLASS_ICONS.PALADIN,
  };
  return icons[playerClass] || CLASS_ICONS.WARRIOR;
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
    <div className="flex flex-col xs:flex-row gap-1 xs:gap-1.5">
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
      <PixelIcon type={TYPE_ICON_TYPES[type] as any} size={16} className="text-slate-500 opacity-50" />
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
      {(() => {
        const iconName = getItemIcon(item.icon);
        const IconComponent = Icons[iconName] as React.ComponentType<{ className?: string }>;
        return <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />;
      })()}
      {itemHasEffect && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border border-background flex items-center justify-center" aria-hidden="true">
          <PixelIcon type={UI_ICONS.SPARKLE as any} size={16} className="w-2 h-2" />
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
  power: number;
  armor: number;
  speed: number;
  fortune: number;
}

function StatsGrid({
  power,
  armor,
  speed,
  fortune,
}: StatsGridProps) {
  // Calculate derived stats from fortune
  const critChance = Math.floor(getCritChance(fortune) * 100);
  const critDamage = Math.floor(getCritDamage(fortune) * 100);
  const dodgeChance = Math.floor(getDodgeChance(fortune) * 100);

  return (
    <div className="mt-1.5 grid grid-cols-4 gap-1">
      <StatItemWithTooltip
        iconType={STAT_ICONS.POWER as any}
        label="PWR"
        value={power}
        tooltip="Power - determines attack damage"
      />
      <StatItemWithTooltip
        iconType={STAT_ICONS.ARMOR as any}
        label="ARM"
        value={armor}
        tooltip="Armor - reduces incoming damage"
      />
      <StatItemWithTooltip
        iconType={STAT_ICONS.SPEED as any}
        label="SPD"
        value={speed}
        tooltip="Speed - affects attack rate"
      />
      <StatItemWithTooltip
        iconType={STAT_ICONS.FORTUNE as any}
        label="FOR"
        value={fortune}
        tooltip={
          <>
            <div>Fortune - affects luck</div>
            <div>Crit: {critChance}% | Dodge: {dodgeChance}%</div>
            <div>Crit Dmg: {critDamage}%</div>
          </>
        }
      />
    </div>
  );
}

/**
 * StatItemWithTooltip - A single stat display with icon, label, value, and tooltip in pixel style.
 */
interface StatItemWithTooltipProps {
  iconType: string;
  label: string;
  value: string | number;
  tooltip: ReactNode;
}

function StatItemWithTooltip({ iconType, label, value, tooltip }: StatItemWithTooltipProps) {
  const content = (
    <div className="pixel-panel-dark flex flex-col items-center text-center rounded p-1 xs:p-1.5 sm:p-2">
      <PixelIcon type={iconType as any} size={16} className="mb-0.5" />
      <span className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400">{label}</span>
      <span className="pixel-text text-pixel-2xs xs:text-pixel-xs sm:text-pixel-sm font-medium text-slate-200">{value}</span>
    </div>
  );

  return (
    <>
      {/* Mobile: TouchTooltip */}
      <div className="xs:hidden">
        <TouchTooltip
          content={
            <div className="pixel-text text-pixel-xs text-slate-200">
              {tooltip}
            </div>
          }
          side="bottom"
        >
          {content}
        </TouchTooltip>
      </div>

      {/* Desktop: Standard Tooltip */}
      <div className="hidden xs:block">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent side="top" className="pixel-panel max-w-xs">
              <div className="pixel-text text-pixel-xs text-slate-200">
                {tooltip}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  );
}

/**
 * AbilitiesDisplay - Shows the player's selected path abilities.
 * Compact display with icons and tooltips for ability details.
 */
interface AbilitiesDisplayProps {
  abilityIds: string[];
}

function AbilitiesDisplay({ abilityIds }: AbilitiesDisplayProps) {
  const abilities = getAbilitiesByIds(abilityIds);

  if (abilities.length === 0) return null;

  return (
    <div className="mt-1.5 xs:mt-2">
      <div className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400 mb-1">
        Abilities
      </div>
      <div className="flex flex-wrap gap-1">
        {abilities.map((ability) => (
          <AbilitySlot key={ability.id} ability={ability} />
        ))}
      </div>
    </div>
  );
}

/**
 * AbilitySlot - A single ability icon with tooltip showing details.
 */
interface AbilitySlotProps {
  ability: PathAbility;
}

function AbilitySlot({ ability }: AbilitySlotProps) {
  const iconName = ability.icon && ability.icon in Icons
    ? (ability.icon as keyof typeof Icons)
    : 'Sparkles';
  const IconComponent = Icons[iconName] as React.ComponentType<{ className?: string }>;

  const tooltipContent = (
    <>
      <div className="pixel-text text-pixel-sm font-medium text-amber-200">
        {ability.name}
      </div>
      <div className="pixel-text text-pixel-xs text-slate-300 mt-1">
        {ability.description}
      </div>
      {ability.isCapstone && (
        <div className="pixel-text text-pixel-xs text-accent mt-1 font-medium">
          Capstone Ability
        </div>
      )}
    </>
  );

  const abilityButton = (
    <div
      className={cn(
        'pixel-panel-dark w-7 h-7 sm:w-8 sm:h-8 rounded border-2 flex items-center justify-center',
        ability.isCapstone
          ? 'border-amber-500/60 bg-amber-500/10'
          : 'border-violet-500/40 bg-violet-500/10'
      )}
      aria-label={`${ability.name}: ${ability.description}`}
    >
      <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-200" aria-hidden="true" />
    </div>
  );

  return (
    <>
      {/* Mobile: TouchTooltip */}
      <div className="xs:hidden">
        <TouchTooltip content={tooltipContent} side="bottom">
          {abilityButton}
        </TouchTooltip>
      </div>

      {/* Desktop: Standard Tooltip */}
      <div className="hidden xs:block">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {abilityButton}
            </TooltipTrigger>
            <TooltipContent side="top" className="pixel-panel max-w-xs">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
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
