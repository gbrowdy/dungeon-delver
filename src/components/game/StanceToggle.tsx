import { cn } from '@/lib/utils';
import type { PassiveStance } from '@/types/paths';
import { getIcon, type LucideIconName } from '@/lib/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Map stance icons to Lucide icon names
 */
const STANCE_ICON_MAP: Record<string, LucideIconName> = {
  'shield': 'Shield',
  'swords': 'Swords',
  'sparkles': 'Sparkles',
  'shield-alert': 'ShieldAlert',
  'wind': 'Wind',
  'heart-pulse': 'HeartPulse',
  'shield-check': 'ShieldCheck',
};

interface StanceToggleProps {
  /** Available stances for the current path */
  stances: PassiveStance[];
  /** Currently active stance ID */
  currentStanceId: string | undefined;
  /** Callback when a stance is selected */
  onSwitch: (stanceId: string) => void;
  /** Remaining cooldown in milliseconds before stance can be switched */
  cooldownRemaining: number;
  /** Whether the game is paused */
  isPaused?: boolean;
}

/**
 * StanceToggle - UI for switching between passive path stances
 *
 * Displays stance buttons with visual feedback:
 * - Active stance is highlighted
 * - Cooldown overlay when switching is unavailable
 * - Tooltips with stance descriptions and effects
 *
 * Only shown for passive paths when the PASSIVE_STANCE_SYSTEM feature is enabled.
 */
export function StanceToggle({
  stances,
  currentStanceId,
  onSwitch,
  cooldownRemaining,
  isPaused = false,
}: StanceToggleProps) {
  const canSwitch = cooldownRemaining <= 0 && !isPaused;
  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

  if (stances.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="pixel-text text-pixel-xs text-slate-400">Stance</h3>
        {cooldownRemaining > 0 && (
          <span className="pixel-text text-pixel-2xs text-amber-400">
            Switch: {cooldownSeconds}s
          </span>
        )}
      </div>

      {/* Stance buttons */}
      <div className="flex gap-1.5">
        {stances.map((stance) => {
          const isActive = stance.id === currentStanceId;
          const StanceIcon = getIcon(
            STANCE_ICON_MAP[stance.icon] ?? 'Circle',
            'Circle'
          );

          return (
            <TooltipProvider key={stance.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSwitch(stance.id)}
                    disabled={isActive || !canSwitch}
                    className={cn(
                      'pixel-panel-dark relative flex flex-col items-center gap-0.5 p-1.5 xs:p-2',
                      'min-w-[70px] xs:min-w-[80px] sm:min-w-[90px] min-h-[56px] xs:min-h-[60px]',
                      'rounded border transition-all overflow-hidden',
                      // Active stance styling
                      isActive && 'border-emerald-500/70 bg-emerald-500/15 shadow-sm shadow-emerald-500/20',
                      // Switchable stance styling
                      !isActive && canSwitch && 'border-slate-500/40 hover:border-primary/60 hover:bg-primary/10 cursor-pointer',
                      // Disabled/cooldown styling
                      !isActive && !canSwitch && 'border-slate-700/30 opacity-60 cursor-not-allowed'
                    )}
                    aria-label={`${stance.name}: ${stance.description}${isActive ? ' (Active)' : ''}`}
                    aria-pressed={isActive}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div
                        className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400"
                        aria-hidden="true"
                      />
                    )}

                    {/* Cooldown overlay */}
                    {!isActive && cooldownRemaining > 0 && (
                      <div
                        className="absolute inset-0 bg-slate-800/60 flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <span className="pixel-text text-pixel-xs text-slate-400">
                          {cooldownSeconds}s
                        </span>
                      </div>
                    )}

                    <div className="relative z-10" aria-hidden="true">
                      <StanceIcon
                        className={cn(
                          'w-5 h-5 xs:w-6 xs:h-6',
                          isActive ? 'text-emerald-400' : 'text-slate-300'
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        'pixel-text text-pixel-2xs font-medium relative z-10 truncate max-w-full',
                        isActive ? 'text-emerald-300' : 'text-slate-200'
                      )}
                    >
                      {stance.name}
                    </span>
                    {isActive && (
                      <span className="pixel-text text-pixel-2xs text-emerald-500 relative z-10">
                        Active
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="pixel-panel max-w-xs">
                  <p className="pixel-text text-pixel-xs font-medium">
                    {stance.name}
                  </p>
                  <p className="pixel-text text-pixel-2xs text-slate-300 mt-1">
                    {stance.description}
                  </p>
                  <StanceEffectsList effects={stance.effects} />
                  {isActive ? (
                    <p className="pixel-text text-pixel-2xs text-emerald-400 mt-2 font-bold">
                      Currently Active
                    </p>
                  ) : (
                    <p className="pixel-text text-pixel-2xs text-slate-500 mt-2">
                      Click to switch ({(stance.switchCooldown / 1000).toFixed(0)}s cooldown)
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Display stance effects in a readable format
 */
function StanceEffectsList({ effects }: { effects: PassiveStance['effects'] }) {
  if (effects.length === 0) return null;

  return (
    <ul className="mt-2 space-y-0.5">
      {effects.map((effect, index) => (
        <li key={index} className="pixel-text text-pixel-2xs text-slate-400">
          {formatStanceEffect(effect)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Format a single stance effect for display
 * Uses discriminated union - no defensive checks needed for required fields
 */
function formatStanceEffect(effect: PassiveStance['effects'][number]): string {
  switch (effect.type) {
    case 'stat_modifier': {
      // Discriminated union guarantees stat exists
      if (effect.percentBonus !== undefined) {
        const sign = effect.percentBonus >= 0 ? '+' : '';
        const suffix = effect.applyTo === 'regen' ? ' Regen' : '';
        return `${sign}${Math.round(effect.percentBonus * 100)}% ${formatStatName(effect.stat)}${suffix}`;
      }
      if (effect.flatBonus !== undefined) {
        const sign = effect.flatBonus >= 0 ? '+' : '';
        return `${sign}${effect.flatBonus} ${formatStatName(effect.stat)}`;
      }
      return `${formatStatName(effect.stat)} modifier`;
    }

    case 'behavior_modifier':
      // Discriminated union guarantees behavior and value exist
      return formatBehavior(effect.behavior, effect.value);

    case 'damage_modifier': {
      // Discriminated union guarantees multiplier and damageType exist
      const reduction = effect.multiplier < 1;
      const percent = Math.abs(Math.round((effect.multiplier - 1) * 100));
      const direction = effect.damageType === 'incoming' ? 'damage taken' : 'damage dealt';
      return reduction
        ? `-${percent}% ${direction}`
        : `+${percent}% ${direction}`;
    }

    default: {
      // Exhaustive check - TypeScript will error if new effect types are added
      const _exhaustive: never = effect;
      return 'Unknown effect';
    }
  }
}

function formatStatName(stat: string): string {
  // Note: No mana mappings - passive paths (which use stances) have no mana resource
  const names: Record<string, string> = {
    health: 'HP Regen',
    maxHealth: 'Max HP',
    power: 'Power',
    armor: 'Armor',
    speed: 'Speed',
    fortune: 'Fortune',
  };
  return names[stat] ?? stat;
}

function formatBehavior(behavior: string, value: number): string {
  const percent = Math.round(value * 100);
  switch (behavior) {
    case 'reflect_damage':
      return `Reflect ${percent}% damage`;
    case 'counter_attack':
      return `${percent}% counter-attack chance`;
    case 'auto_block':
      return `${percent}% auto-negate chance`;
    case 'lifesteal':
      return `${percent}% lifesteal`;
    default:
      return `${behavior}: ${percent}%`;
  }
}
