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
