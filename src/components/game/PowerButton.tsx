import { Power } from '@/types/game';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PowerWithSynergies, hasSynergy, getSynergy, getPathName } from '@/utils/powerSynergies';
import { Star } from 'lucide-react';

/**
 * Props for the PowerButton component.
 *
 * @property power - The power/ability configuration containing icon, name, cooldown, mana cost
 * @property currentMana - Player's current mana for affordability check
 * @property onUse - Callback fired when the power button is clicked
 * @property disabled - Whether the button is disabled (e.g., combat paused, not in combat phase)
 * @property playerPathId - Player's current path ID for synergy checking
 */
interface PowerButtonProps {
  /** The power configuration (icon, name, cooldown, mana cost, effect) */
  power: Power;
  /** Player's current mana points for affordability check */
  currentMana: number;
  /** Callback when power button is clicked */
  onUse: () => void;
  /** Whether the button is disabled (combat paused, etc.) */
  disabled?: boolean;
  /** Player's current path ID for synergy detection */
  playerPathId?: string | null;
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
 * - On cooldown (currentCooldown > 0)
 * - Insufficient mana
 * - Explicitly disabled via prop (combat paused, etc.)
 */
export function PowerButton({ power, currentMana, onUse, disabled, playerPathId }: PowerButtonProps) {
  const canUse = power.currentCooldown <= 0 && currentMana >= power.manaCost && !disabled;
  const isOnCooldown = power.currentCooldown > 0;
  const cooldownProgress = isOnCooldown ? (power.currentCooldown / power.cooldown) * 100 : 0;

  // Check for synergy with player's path
  const powerWithSynergies = power as PowerWithSynergies;
  const synergizes = playerPathId ? hasSynergy(powerWithSynergies, playerPathId) : false;
  const synergy = playerPathId ? getSynergy(powerWithSynergies, playerPathId) : null;

  // Build accessible status description
  const statusDescription = isOnCooldown
    ? `On cooldown: ${Math.ceil(power.currentCooldown)} seconds remaining`
    : currentMana < power.manaCost
    ? `Insufficient mana: need ${power.manaCost}, have ${Math.floor(currentMana)}`
    : `Ready. Costs ${power.manaCost} mana.`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
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
              <div className="absolute top-0.5 right-0.5 z-20">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" aria-hidden="true" />
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
            <span className={cn("text-lg xs:text-xl sm:text-2xl relative z-10", isOnCooldown && "opacity-50")} aria-hidden="true">{power.icon}</span>
            <span className={cn("pixel-text text-pixel-2xs font-medium relative z-10 text-slate-200 truncate max-w-full", isOnCooldown && "opacity-50")}>{power.name}</span>
            <span className={cn("pixel-text text-pixel-2xs relative z-10", isOnCooldown ? "text-slate-400" : "text-mana")} aria-hidden="true">
              {isOnCooldown ? `${Math.ceil(power.currentCooldown)}s` : `${power.manaCost} MP`}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="pixel-panel max-w-xs">
          <p className="pixel-text text-pixel-xs font-medium">{getPowerDescription(power)}</p>
          <p className="pixel-text text-pixel-2xs text-mana mt-1">
            {power.manaCost} MP · {power.cooldown}s cooldown
          </p>
          {synergy && (
            <div className="mt-2 pt-2 border-t border-amber-500/30">
              <div className="flex items-center gap-1 mb-1">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
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
