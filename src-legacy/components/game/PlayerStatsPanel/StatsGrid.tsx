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
