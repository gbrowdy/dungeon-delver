import { Power } from '@/types/game';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PowerWithSynergies, hasSynergy, getSynergy, getPathName } from '@/utils/powerSynergies';
import * as Icons from 'lucide-react';
import { getIcon, type LucideIconName, POWER_ICONS } from '@/lib/icons';

// Map power IDs to Lucide icon names (extends POWER_ICONS with kebab-case IDs)
const POWER_ICON_MAP: Record<string, LucideIconName> = {
  'crushing-blow': 'Hammer',
  'power-strike': 'Swords',
  'fan-of-knives': 'Fan',
  'flurry': 'Zap',
  'ambush': 'Crosshair',
  'shadow-strike': 'Crosshair',
  'coup-de-grace': 'Target',
  'frost-nova': 'Snowflake',
  'stunning-blow': 'CircleSlash',
  'battle-cry': 'Megaphone',
  'inner-focus': 'Focus',
  'reckless-swing': 'Axe',
  'blood-pact': 'Droplets',
  'divine-heal': 'Cross',
  'regeneration': 'HeartPulse',
  'earthquake': 'Mountain',
  'vampiric-touch': 'Hand',
  'fireball': 'Flame',
  'berserker-rage': 'Axe',
};

/**
 * Get the Lucide icon component for a power.
 */
function getPowerIcon(power: Power): React.ComponentType<{ className?: string }> {
  // Check by power ID first
  const iconName = POWER_ICON_MAP[power.id];
  if (iconName) {
    return getIcon(iconName, 'Sparkles');
  }

  // Check if power.icon is a valid Lucide name directly
  if (power.icon) {
    return getIcon(power.icon, 'Sparkles');
  }

  // Default fallback
  return getIcon('Sparkles');
}

/**
 * Props for the PowerButton component.
 *
 * @property power - The power/ability configuration containing icon, name, cooldown, mana cost
 * @property cooldownRemaining - Current cooldown remaining (from cooldowns Map)
 * @property currentResource - Player's current resource value for affordability check
 * @property effectiveCost - Actual cost after path ability reductions (optional, defaults to power.manaCost)
 * @property onUse - Callback fired when the power button is clicked
 * @property disabled - Whether the button is disabled (e.g., combat paused, not in combat phase)
 * @property playerPathId - Player's current path ID for synergy checking
 * @property resourceBehavior - 'spend' (default) or 'gain' for Arcane Charges
 * @property resourceMax - Max resource value (required for gain-type to check overflow)
 * @property resourceLabel - Display label for resource (e.g., 'MP', 'Fury', 'Charges')
 */
interface PowerButtonProps {
  /** The power configuration (icon, name, cooldown, mana cost, effect) */
  power: Power;
  /** Current cooldown remaining in seconds (from cooldowns Map, 0 = ready) */
  cooldownRemaining: number;
  /** Player's current resource value for affordability check */
  currentMana: number;
  /** Effective cost after path ability reductions */
  effectiveManaCost?: number;
  /** Callback when power button is clicked */
  onUse: () => void;
  /** Whether the button is disabled (combat paused, etc.) */
  disabled?: boolean;
  /** Player's current path ID for synergy detection */
  playerPathId?: string | null;
  /** Resource behavior: 'spend' (default) or 'gain' for Arcane Charges */
  resourceBehavior?: 'spend' | 'gain';
  /** Max resource value (required for gain-type to check overflow) */
  resourceMax?: number;
  /** Display label for resource (e.g., 'MP', 'Fury', 'Charges') */
  resourceLabel?: string;
}

function getPowerDescription(power: Power): string {
  const descriptions: Record<string, string> = {
    'battle-cry': '+ATK for 3 turns',
    'whirlwind': 'Heavy damage attack',
    'fireball': 'Magic damage',
    'mana-surge': 'Restore mana',
    'frost-nova': 'Ice damage',
    'backstab': 'High damage, combos well',
    'smoke-bomb': '+Evasion for 3 turns',
    'vampiric-touch': 'Damage + lifesteal',
    'holy-light': 'Heal yourself',
    'divine-shield': '+DEF for 3 turns',
    'smite': 'Holy damage',
  };
  return descriptions[power.id] || (power.effect === 'damage' ? 'Deal damage' : power.effect === 'heal' ? 'Restore HP/MP' : 'Buff stats');
}

/**
 * PowerButton - Displays a usable power/ability with cooldown tracking.
 *
 * Shows:
 * - Power icon and name
 * - Mana cost or cooldown remaining
 * - Visual cooldown overlay that fills from bottom up
 * - Accessible tooltip with power description
 * - Synergy indicator if power matches player's path
 *
 * The button is disabled when:
 * - On cooldown (cooldownRemaining > 0)
 * - Insufficient mana
 * - Explicitly disabled via prop (combat paused, etc.)
 */
export function PowerButton({
  power,
  cooldownRemaining,
  currentMana,
  effectiveManaCost,
  onUse,
  disabled,
  playerPathId,
  resourceBehavior = 'spend',
  resourceMax,
  resourceLabel = 'MP',
}: PowerButtonProps) {
  // Use effective cost if provided, otherwise fall back to base cost
  const cost = effectiveManaCost ?? power.manaCost;
  const hasReduction = effectiveManaCost !== undefined && effectiveManaCost < power.manaCost;

  // Check if power can be used based on resource behavior:
  // - spend: Need enough resource (current >= cost)
  // - gain: Need room for more charges (current + cost <= max)
  const canAfford = resourceBehavior === 'gain'
    ? (resourceMax !== undefined && currentMana + cost <= resourceMax)
    : currentMana >= cost;

  const canUse = cooldownRemaining <= 0 && canAfford && !disabled;
  const isOnCooldown = cooldownRemaining > 0;
  const cooldownProgress = isOnCooldown ? (cooldownRemaining / power.cooldown) * 100 : 0;

  // Check for synergy with player's path
  const powerWithSynergies = power as PowerWithSynergies;
  const synergizes = playerPathId ? hasSynergy(powerWithSynergies, playerPathId) : false;
  const synergy = playerPathId ? getSynergy(powerWithSynergies, playerPathId) : null;

  // Build accessible status description
  const statusDescription = isOnCooldown
    ? `On cooldown: ${Math.ceil(cooldownRemaining)} seconds remaining`
    : !canAfford
    ? resourceBehavior === 'gain'
      ? `Resource full: ${Math.floor(currentMana)}/${resourceMax} ${resourceLabel}`
      : `Insufficient ${resourceLabel.toLowerCase()}: need ${cost}, have ${Math.floor(currentMana)}`
    : `Ready. ${resourceBehavior === 'gain' ? 'Adds' : 'Costs'} ${cost} ${resourceLabel}.`;

  const PowerIcon = getPowerIcon(power);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            data-testid={`power-${power.id}`}
            onClick={onUse}
            disabled={!canUse}
            className={cn(
              'pixel-panel-dark relative flex flex-col items-center gap-0.5 p-1.5 xs:p-2 min-w-[60px] xs:min-w-[70px] sm:min-w-[80px] min-h-[50px] xs:min-h-[56px] rounded border transition-all overflow-hidden',
              canUse && !synergizes && 'border-primary/40 hover:border-primary/70 hover:bg-primary/10 cursor-pointer',
              canUse && synergizes && 'border-amber-500/60 hover:border-amber-400/80 hover:bg-amber-500/10 cursor-pointer shadow-sm shadow-amber-500/20',
              !canUse && 'opacity-50 cursor-not-allowed border-slate-700/30'
            )}
            aria-label={`${power.name}: ${getPowerDescription(power)}. ${statusDescription}${synergizes && synergy ? ` Synergizes with ${getPathName(synergy.pathId)} path.` : ''}`}
          >
            {/* Synergy indicator badge */}
            {synergizes && (
              <div className="absolute top-1 right-1 z-20">
                <Icons.Star className="h-3 w-3 text-amber-400 fill-amber-400" aria-hidden="true" />
              </div>
            )}

            {/* Cooldown fill overlay - fills from bottom up as cooldown progresses */}
            {isOnCooldown && (
              <div
                className="absolute inset-x-0 bottom-0 bg-slate-600/80"
                style={{ height: `${cooldownProgress}%` }}
                aria-hidden="true"
              />
            )}
            <div className={cn("relative z-10", isOnCooldown && "opacity-50")} aria-hidden="true">
              <PowerIcon className="w-6 h-6 xs:w-7 xs:h-7" />
            </div>
            <span className={cn("pixel-text text-pixel-2xs font-medium relative z-10 text-slate-200 truncate max-w-full", isOnCooldown && "opacity-50")}>{power.name}</span>
            <span
              data-testid={isOnCooldown ? `power-cooldown-${power.id}` : undefined}
              className={cn("pixel-text text-pixel-2xs relative z-10", isOnCooldown ? "text-slate-400" : hasReduction ? "text-emerald-400" : "text-mana")}
              aria-hidden="true"
            >
              {isOnCooldown ? `${Math.ceil(cooldownRemaining)}s` : `${resourceBehavior === 'gain' ? '+' : ''}${cost} ${resourceLabel}`}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="pixel-panel max-w-xs">
          <p className="pixel-text text-pixel-xs font-medium">{getPowerDescription(power)}</p>
          <p className={cn("pixel-text text-pixel-2xs mt-1", hasReduction ? "text-emerald-400" : "text-mana")}>
            {hasReduction ? (
              <><span className="line-through text-slate-500">{power.manaCost}</span> {resourceBehavior === 'gain' ? '+' : ''}{cost} {resourceLabel}</>
            ) : (
              <>{resourceBehavior === 'gain' ? '+' : ''}{cost} {resourceLabel}</>
            )} · {power.cooldown}s cooldown
          </p>
          {synergy && (
            <div className="mt-2 pt-2 border-t border-amber-500/30">
              <div className="flex items-center gap-1 mb-1">
                <Icons.Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span className="pixel-text text-pixel-2xs text-amber-400 font-bold uppercase">
                  {getPathName(synergy.pathId)} Synergy
                </span>
              </div>
              <p className="pixel-text text-pixel-2xs text-slate-300 italic">
                {synergy.description}
              </p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
