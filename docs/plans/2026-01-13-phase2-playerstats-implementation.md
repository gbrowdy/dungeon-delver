# PlayerStatsPanel Split - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split PlayerStatsPanel.tsx (624 lines) into 7 focused files under a directory structure.

**Architecture:** Extract inline sub-components to separate files, keeping tightly-coupled components together. Create index.ts for backwards-compatible export.

**Tech Stack:** React, TypeScript, Tailwind CSS

---

## Task 1: Create Directory Structure

**Files:**
- Create: `src/components/game/PlayerStatsPanel/` (directory)

**Step 1: Create the directory**

```bash
mkdir -p src/components/game/PlayerStatsPanel
```

**Step 2: Verify directory exists**

```bash
ls -la src/components/game/ | grep PlayerStatsPanel
```

Expected: Shows `PlayerStatsPanel` directory

---

## Task 2: Create constants.ts

**Files:**
- Create: `src/components/game/PlayerStatsPanel/constants.ts`

**Step 1: Create constants file**

Create `src/components/game/PlayerStatsPanel/constants.ts`:

```typescript
import type { ItemType } from '@/types/game';

export const ALL_ITEM_TYPES: ItemType[] = ['weapon', 'armor', 'accessory'];

export const TYPE_LABELS: Record<ItemType, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};

export const RARITY_BORDER_COLORS: Record<string, string> = {
  common: 'border-rarity-common',
  uncommon: 'border-rarity-uncommon',
  rare: 'border-rarity-rare',
  epic: 'border-rarity-epic',
  legendary: 'border-rarity-legendary pixel-border-pulse',
};

export const RARITY_BG_COLORS: Record<string, string> = {
  common: 'bg-rarity-common/10',
  uncommon: 'bg-rarity-uncommon/10',
  rare: 'bg-rarity-rare/10',
  epic: 'bg-rarity-epic/10',
  legendary: 'bg-rarity-legendary/20',
};
```

**Step 2: Verify file compiles**

```bash
npx tsc --noEmit src/components/game/PlayerStatsPanel/constants.ts 2>&1 | head -5
```

Expected: No errors (or minimal config-related warnings)

---

## Task 3: Create XPProgressBar.tsx

**Files:**
- Create: `src/components/game/PlayerStatsPanel/XPProgressBar.tsx`

**Step 1: Create component file**

Create `src/components/game/PlayerStatsPanel/XPProgressBar.tsx`:

```typescript
interface XPProgressBarProps {
  current: number;
  max: number;
}

export function XPProgressBar({ current, max }: XPProgressBarProps) {
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
```

---

## Task 4: Create PlayerInfo.tsx

**Files:**
- Create: `src/components/game/PlayerStatsPanel/PlayerInfo.tsx`

**Step 1: Create component file**

Create `src/components/game/PlayerStatsPanel/PlayerInfo.tsx`:

```typescript
import {
  getIcon,
  CLASS_ICONS,
  CLASS_COLORS,
  type CharacterClassKey,
} from '@/lib/icons';

interface PlayerInfoProps {
  name: string;
  playerClass: string;
  level: number;
}

export function PlayerInfo({ name, playerClass, level }: PlayerInfoProps) {
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
```

---

## Task 5: Create StatsGrid.tsx

**Files:**
- Create: `src/components/game/PlayerStatsPanel/StatsGrid.tsx`

**Step 1: Create component file**

Create `src/components/game/PlayerStatsPanel/StatsGrid.tsx`:

```typescript
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TouchTooltip } from '@/components/ui/touch-tooltip';
import { getIcon, STAT_ICONS } from '@/lib/icons';

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

export function StatsGrid({
  power,
  armor,
  speed,
  fortune,
  derivedStats,
  modifiers,
}: StatsGridProps) {
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

interface StatItemWithTooltipProps {
  iconName: string;
  label: string;
  value: string | number;
  tooltip: ReactNode;
  iconColor?: string;
  modifier?: number;
}

function StatItemWithTooltip({ iconName, label, value, tooltip, iconColor, modifier }: StatItemWithTooltipProps) {
  const IconComponent = getIcon(iconName);

  const hasModifier = modifier !== undefined && modifier !== 0;
  const isPositive = modifier !== undefined && modifier > 0;

  const valueColor = hasModifier
    ? isPositive
      ? 'text-emerald-400'
      : 'text-red-400'
    : 'text-slate-200';

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
```

---

## Task 6: Create AbilitiesDisplay.tsx

**Files:**
- Create: `src/components/game/PlayerStatsPanel/AbilitiesDisplay.tsx`

**Step 1: Create component file**

Create `src/components/game/PlayerStatsPanel/AbilitiesDisplay.tsx`:

```typescript
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TouchTooltip } from '@/components/ui/touch-tooltip';
import { getAbilitiesByIds } from '@/utils/pathUtils';
import type { PathAbility } from '@/types/paths';
import type { LucideIconName } from '@/lib/icons';

interface AbilitiesDisplayProps {
  abilityIds: string[];
}

export function AbilitiesDisplay({ abilityIds }: AbilitiesDisplayProps) {
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
      <div className="xs:hidden">
        <TouchTooltip content={tooltipContent} side="bottom">
          {abilityButton}
        </TouchTooltip>
      </div>

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
```

---

## Task 7: Create EquipmentDisplay.tsx

**Files:**
- Create: `src/components/game/PlayerStatsPanel/EquipmentDisplay.tsx`

**Step 1: Create component file**

Create `src/components/game/PlayerStatsPanel/EquipmentDisplay.tsx`:

```typescript
import { cn } from '@/lib/utils';
import type { Item, ItemType } from '@/types/game';
import * as Icons from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TouchTooltip } from '@/components/ui/touch-tooltip';
import { formatItemStatBonus } from '@/utils/itemUtils';
import { getIcon, ITEM_ICONS } from '@/lib/icons';
import {
  ALL_ITEM_TYPES,
  TYPE_LABELS,
  RARITY_BORDER_COLORS,
  RARITY_BG_COLORS,
} from './constants';

interface EquipmentDisplayProps {
  items: Item[];
}

export function EquipmentDisplay({ items }: EquipmentDisplayProps) {
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

  return (
    <>
      <div className="xs:hidden">
        {slotButton}
      </div>

      <div className="hidden xs:flex items-center gap-1.5">
        {slotButton}
        <span className="pixel-text text-pixel-xs text-slate-500 hidden sm:inline">
          Empty
        </span>
      </div>
    </>
  );
}

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

  return (
    <>
      <div className="xs:hidden">
        <TouchTooltip content={tooltipContent} side="bottom">
          {itemButton}
        </TouchTooltip>
      </div>

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
```

---

## Task 8: Create Main PlayerStatsPanel.tsx

**Files:**
- Create: `src/components/game/PlayerStatsPanel/PlayerStatsPanel.tsx`

**Step 1: Create main component file**

Create `src/components/game/PlayerStatsPanel/PlayerStatsPanel.tsx`:

```typescript
import * as Icons from 'lucide-react';
import type { Item } from '@/types/game';
import type { PlayerSnapshot } from '@/ecs/snapshot';
import { getPlayerDisplayName } from '@/utils/powerSynergies';
import { ActiveEffectsBar } from '../ActiveEffectsBar';

import { PlayerInfo } from './PlayerInfo';
import { EquipmentDisplay } from './EquipmentDisplay';
import { StatsGrid } from './StatsGrid';
import { AbilitiesDisplay } from './AbilitiesDisplay';
import { XPProgressBar } from './XPProgressBar';

interface PlayerStatsPanelProps {
  player: PlayerSnapshot;
}

export function PlayerStatsPanel({ player }: PlayerStatsPanelProps) {
  const playerForUtils = {
    ...player,
    class: player.characterClass,
    currentStats: {
      power: player.effectiveStats.power.value,
      armor: player.effectiveStats.armor.value,
      speed: player.effectiveStats.speed.value,
      fortune: player.attack.critChance * 100,
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
      <div className="flex items-center justify-between flex-wrap gap-1 xs:gap-2">
        <PlayerInfo
          name={getPlayerDisplayName(player)}
          playerClass={playerForUtils.class}
          level={playerForUtils.level}
        />
        <EquipmentDisplay items={playerForUtils.equippedItems} />
      </div>

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

      {player.path && player.path.abilities.length > 0 && (
        <AbilitiesDisplay abilityIds={player.path.abilities} />
      )}

      {player.passiveEffects && <ActiveEffectsBar player={player} />}

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
```

---

## Task 9: Create index.ts

**Files:**
- Create: `src/components/game/PlayerStatsPanel/index.ts`

**Step 1: Create index file**

Create `src/components/game/PlayerStatsPanel/index.ts`:

```typescript
export { PlayerStatsPanel } from './PlayerStatsPanel';
```

---

## Task 10: Delete Original File and Verify

**Files:**
- Delete: `src/components/game/PlayerStatsPanel.tsx`

**Step 1: Delete original file**

```bash
rm src/components/game/PlayerStatsPanel.tsx
```

**Step 2: Run build to verify imports resolve**

```bash
npm run build
```

Expected: Build succeeds (imports like `@/components/game/PlayerStatsPanel` now resolve to `PlayerStatsPanel/index.ts`)

**Step 3: Run unit tests**

```bash
npx vitest run
```

Expected: All tests pass

**Step 4: Run E2E tests**

```bash
npx playwright test --project="Desktop"
```

Expected: All tests pass

---

## Task 11: Commit

**Step 1: Stage all changes**

```bash
git add -A
```

**Step 2: Commit**

```bash
git commit -m "refactor: split PlayerStatsPanel into directory structure

- PlayerStatsPanel.tsx: Main component (~70 lines)
- PlayerInfo.tsx: Name, class, level display (~50 lines)
- EquipmentDisplay.tsx: Equipment slots (~150 lines)
- StatsGrid.tsx: Stats display with tooltips (~120 lines)
- AbilitiesDisplay.tsx: Path abilities (~90 lines)
- XPProgressBar.tsx: XP progress bar (~25 lines)
- constants.ts: Shared constants (~30 lines)
- index.ts: Backwards-compatible export

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| File | Lines | Purpose |
|------|-------|---------|
| PlayerStatsPanel.tsx | ~70 | Main orchestration |
| PlayerInfo.tsx | ~50 | Player name/class/level |
| EquipmentDisplay.tsx | ~150 | Equipment slots (3 sub-components) |
| StatsGrid.tsx | ~120 | Stats with tooltips (2 sub-components) |
| AbilitiesDisplay.tsx | ~90 | Abilities (2 sub-components) |
| XPProgressBar.tsx | ~25 | XP bar |
| constants.ts | ~30 | Shared constants |
| index.ts | ~1 | Re-export |

**Total: 8 files, ~536 lines (down from 624 due to removed duplication)**
