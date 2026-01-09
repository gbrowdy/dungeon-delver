import { cn } from '@/lib/utils';
import { Item, ItemType } from '@/types/game';
import type { PlayerSnapshot } from '@/ecs/snapshot';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TouchTooltip } from '@/components/ui/touch-tooltip';
import { formatItemStatBonus } from '@/utils/itemUtils';
import { ReactNode } from 'react';
import { getPlayerDisplayName } from '@/utils/powerSynergies';
import * as Icons from 'lucide-react';
import { getAbilitiesByIds } from '@/utils/pathUtils';
import { PathAbility } from '@/types/paths';
import {
  getIcon,
  type LucideIconName,
  STAT_ICONS,
  CLASS_ICONS,
  ITEM_ICONS,
  CLASS_COLORS,
  type CharacterClassKey,
} from '@/lib/icons';
import { ActiveEffectsBar } from './ActiveEffectsBar';

const ALL_ITEM_TYPES: ItemType[] = ['weapon', 'armor', 'accessory'];

const TYPE_LABELS: Record<ItemType, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};

interface PlayerStatsPanelProps {
  player: PlayerSnapshot;
}

/**
 * PlayerStatsPanel - Displays player info, equipment, stats grid, and XP bar.
 * Styled with pixel art / 8-bit retro aesthetic.
 * Compact layout on mobile to reduce visual clutter.
 */
export function PlayerStatsPanel({ player }: PlayerStatsPanelProps) {
  // Create a compatible player object for utility functions that expect old Player type
  const playerForUtils = {
    ...player,
    class: player.characterClass,
    currentStats: {
      // Use effective stats (with stance modifiers applied)
      power: player.effectiveStats.power.value,
      armor: player.effectiveStats.armor.value,
      speed: player.effectiveStats.speed.value,
      fortune: player.attack.critChance * 100, // Convert back to fortune approximation
    },
    experience: player.xp,
    experienceToNext: player.xpToNext,
    equippedItems: [
      player.equipment.weapon,
      player.equipment.armor,
      player.equipment.accessory,
    ].filter((item): item is Item => item !== null),
  };

  return (
    <div className="pixel-panel rounded-lg p-1.5 xs:p-2 sm:p-3">
      {/* Header: Player info and equipment - more compact on mobile */}
      <div className="flex items-center justify-between flex-wrap gap-1 xs:gap-2">
        <PlayerInfo
          name={getPlayerDisplayName(player)}
          playerClass={playerForUtils.class}
          level={playerForUtils.level}
        />
        <EquipmentDisplay items={playerForUtils.equippedItems} />
      </div>

      {/* Stats Grid - only show primary stats on very small screens */}
      <StatsGrid
        power={playerForUtils.currentStats.power}
        armor={playerForUtils.currentStats.armor}
        speed={playerForUtils.currentStats.speed}
        fortune={playerForUtils.currentStats.fortune}
        derivedStats={player.derivedStats}
        modifiers={{
          power: player.effectiveStats.power.modifier,
          armor: player.effectiveStats.armor.modifier,
          speed: player.effectiveStats.speed.modifier,
        }}
      />

      {/* Path Abilities Display */}
      {player.path && player.path.abilities.length > 0 && (
        <AbilitiesDisplay abilityIds={player.path.abilities} />
      )}

      {/* Active Passive Effects Display */}
      {player.passiveEffects && <ActiveEffectsBar player={player} />}

      {/* Gold and XP Progress */}
      <div className="mt-1.5 xs:mt-2 space-y-1">
        <div className="flex items-center gap-1 pixel-text text-pixel-2xs xs:text-pixel-xs">
          <span className="text-slate-400">Gold:</span>
          <span className="text-gold font-bold flex items-center gap-0.5">
            {player.gold}
            <Icons.Coins className="w-4 h-4 text-amber-400" />
          </span>
        </div>
        <XPProgressBar
          current={playerForUtils.experience}
          max={playerForUtils.experienceToNext}
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
  const ClassIcon = getClassIcon(playerClass);
  const classColor = CLASS_COLORS[playerClass as CharacterClassKey] || CLASS_COLORS.warrior;

  return (
    <div className="flex items-center gap-1 xs:gap-2">
      <div style={{ color: classColor.primary }}>
        <ClassIcon className="w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8" />
      </div>
      <div>
        <div
          data-testid="player-path-name"
          className="pixel-text text-pixel-xs xs:text-pixel-sm sm:text-pixel-base font-bold"
          style={{ color: classColor.primary }}
        >
          {name}
        </div>
        <div className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400">Level {level}</div>
      </div>
    </div>
  );
}

/**
 * Returns the icon component for a player class.
 */
function getClassIcon(playerClass: string): React.ComponentType<{ className?: string }> {
  const iconNames: Record<string, string> = {
    warrior: CLASS_ICONS.WARRIOR,
    mage: CLASS_ICONS.MAGE,
    rogue: CLASS_ICONS.ROGUE,
    paladin: CLASS_ICONS.PALADIN,
  };
  const iconName = iconNames[playerClass] || CLASS_ICONS.WARRIOR;
  return getIcon(iconName);
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
  const SlotIcon = getIcon(ITEM_ICONS[type.toUpperCase() as keyof typeof ITEM_ICONS], 'Package');

  const slotButton = (
    <div
      className="pixel-panel-dark w-8 h-8 sm:w-10 sm:h-10 rounded border-2 border-dashed border-slate-600/50 flex items-center justify-center opacity-50"
      aria-label={`Empty ${TYPE_LABELS[type]} slot`}
    >
      <SlotIcon className="w-4 h-4 text-slate-500 opacity-50" />
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
        const IconComponent = getIcon(item.icon, 'Package');
        return <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />;
      })()}
      {itemHasEffect && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border border-background flex items-center justify-center" aria-hidden="true">
          <Icons.Sparkles className="w-2 h-2" />
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
  derivedStats: {
    critChance: number;
    critDamage: number;
    dodgeChance: number;
  };
  modifiers?: {
    power: number;
    armor: number;
    speed: number;
  };
}

function StatsGrid({
  power,
  armor,
  speed,
  fortune,
  derivedStats,
  modifiers,
}: StatsGridProps) {
  // Use precomputed derived stats from snapshot
  const critChance = Math.floor(derivedStats.critChance * 100);
  const critDamage = Math.floor(derivedStats.critDamage * 100);
  const dodgeChance = Math.floor(derivedStats.dodgeChance * 100);

  return (
    <div className="mt-1.5 grid grid-cols-4 gap-1">
      <StatItemWithTooltip
        iconName={STAT_ICONS.POWER}
        label="PWR"
        value={power}
        tooltip="Power - determines attack damage"
        iconColor="text-amber-400"
        modifier={modifiers?.power}
      />
      <StatItemWithTooltip
        iconName={STAT_ICONS.ARMOR}
        label="ARM"
        value={armor}
        tooltip="Armor - reduces incoming damage"
        iconColor="text-sky-400"
        modifier={modifiers?.armor}
      />
      <StatItemWithTooltip
        iconName={STAT_ICONS.SPEED}
        label="SPD"
        value={speed}
        tooltip="Speed - affects attack rate"
        iconColor="text-emerald-400"
        modifier={modifiers?.speed}
      />
      <StatItemWithTooltip
        iconName={STAT_ICONS.FORTUNE}
        label="FOR"
        value={fortune}
        tooltip={
          <>
            <div>Fortune - affects luck</div>
            <div>Crit: {critChance}% | Dodge: {dodgeChance}%</div>
            <div>Crit Dmg: {critDamage}%</div>
          </>
        }
        iconColor="text-purple-400"
      />
    </div>
  );
}

/**
 * StatItemWithTooltip - A single stat display with icon, label, value, and tooltip in pixel style.
 * When modifier is provided and non-zero, shows colored text and arrow indicator.
 */
interface StatItemWithTooltipProps {
  iconName: string;
  label: string;
  value: string | number;
  tooltip: ReactNode;
  iconColor?: string;
  modifier?: number; // Percentage modifier (e.g., 0.25 = +25%, -0.15 = -15%)
}

function StatItemWithTooltip({ iconName, label, value, tooltip, iconColor, modifier }: StatItemWithTooltipProps) {
  const IconComponent = getIcon(iconName);

  // Determine text color and arrow based on modifier
  const hasModifier = modifier !== undefined && modifier !== 0;
  const isPositive = modifier !== undefined && modifier > 0;

  // Color: green for positive, red for negative, default slate for no modifier
  const valueColor = hasModifier
    ? isPositive
      ? 'text-emerald-400'
      : 'text-red-400'
    : 'text-slate-200';

  // Arrow indicator
  const arrow = hasModifier ? (isPositive ? ' \u2191' : ' \u2193') : '';

  const content = (
    <div className="pixel-panel-dark flex flex-col items-center text-center rounded p-1 xs:p-1.5 sm:p-2">
      <IconComponent className={cn("w-5 h-5 xs:w-6 xs:h-6 mb-0.5", iconColor)} />
      <span className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400">{label}</span>
      <span className={cn("pixel-text text-pixel-2xs xs:text-pixel-xs sm:text-pixel-sm font-medium", valueColor)}>
        {value}{arrow}
      </span>
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
    ? (ability.icon as LucideIconName)
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
