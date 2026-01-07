import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PowerButton } from './PowerButton';
import { StanceToggle } from './StanceToggle';
import { ResourceBar } from './ResourceBar';
import { getPowerModifiers, hasComboMechanic, isPassivePath, pathUsesResourceSystem } from '@/utils/pathUtils';
import { getStancesForPath } from '@/data/stances';
import { isFeatureEnabled } from '@/constants/features';
import { getResourceDisplayName } from '@/data/pathResources';
import type { PlayerSnapshot } from '@/ecs/snapshot';
import { useGameActions } from '@/ecs/context/GameContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PowersPanelProps {
  player: PlayerSnapshot;
  canUsePowers: boolean;
  onUsePower: (powerId: string) => void;
}

/**
 * PowersPanel - Displays resource bar, power buttons, and combo indicator.
 * For passive paths with PASSIVE_STANCE_SYSTEM enabled, shows stance toggle UI.
 * Styled with pixel art / 8-bit retro aesthetic.
 */
export function PowersPanel({
  player,
  canUsePowers,
  onUsePower,
}: PowersPanelProps) {
  // Calculate effective mana costs with path ability reductions
  const powerMods = getPowerModifiers({ path: player.path });
  const getEffectiveManaCost = (baseCost: number) =>
    Math.max(1, Math.floor(baseCost * (1 - powerMods.costReduction)));

  // Check if this player's path uses the combo system
  const showCombo = hasComboMechanic({ path: player.path });

  // Get game actions for stance switching
  const actions = useGameActions();

  // Stance system for passive paths - now uses ECS state
  const pathId = player.path?.pathId ?? '';
  const availableStances = getStancesForPath(pathId);
  const stanceState = player.stanceState;
  const currentStanceId = stanceState?.activeStanceId;
  const cooldownRemaining = stanceState?.stanceCooldownRemaining ?? 0;

  // Determine if we should show stance UI instead of standard powers
  const showStanceUI = isFeatureEnabled('PASSIVE_STANCE_SYSTEM') &&
    isPassivePath({ path: player.path }) &&
    !!stanceState &&
    availableStances.length > 0;

  // Check if player uses path resource system (or has stamina pre-path)
  // Pre-path players have pathResource.type === 'stamina'
  const usesPathResource = (pathUsesResourceSystem(pathId) || player.pathResource?.type === 'stamina') && player.pathResource;

  return (
    <div className="pixel-panel rounded-lg p-2 sm:p-3">
      {/* Resource bar header - show path resource OR mana (passive paths have neither) */}
      {usesPathResource && player.pathResource ? (
        <div className="mb-2">
          <h3 className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400 mb-1">Powers</h3>
          <ResourceBar
            resource={player.pathResource}
            thresholdMarkers={true}
            showLabel={true}
          />
        </div>
      ) : player.mana ? (
        <ManaBar
          current={player.mana.current}
          max={player.mana.max}
        />
      ) : null}

      {showStanceUI ? (
        /* Stance UI for passive paths */
        <StanceToggle
          stances={availableStances}
          currentStanceId={currentStanceId}
          onSwitch={actions.switchStance}
          cooldownRemaining={cooldownRemaining}
          isPaused={false}
        />
      ) : (
        /* Standard powers UI for active paths */
        <>
          {/* Powers grid */}
          <div className="flex flex-wrap gap-1.5">
            {/* Power buttons */}
            {player.powers.map(power => {
              // Use pathResource for active paths, mana for pre-level-2
              const currentResource = player.pathResource?.current ?? player.mana?.current ?? 0;
              const resourceCost = player.pathResource
                ? (power.resourceCost ?? power.manaCost)
                : power.manaCost;
              const resourceBehavior = player.pathResource?.resourceBehavior ?? 'spend';
              const resourceMax = player.pathResource?.max ?? player.mana?.max ?? 100;
              const resourceLabel = player.pathResource
                ? getResourceDisplayName(player.pathResource.type)
                : 'MP';
              return (
                <PowerButton
                  key={power.id}
                  power={power}
                  cooldownRemaining={player.cooldowns.get(power.id)?.remaining ?? 0}
                  currentMana={currentResource}
                  effectiveManaCost={getEffectiveManaCost(resourceCost)}
                  onUse={() => onUsePower(power.id)}
                  disabled={!canUsePowers}
                  playerPathId={player.path?.pathId ?? null}
                  resourceBehavior={resourceBehavior}
                  resourceMax={resourceMax}
                  resourceLabel={resourceLabel}
                />
              );
            })}
          </div>

          {/* Combo indicator - only show for active paths */}
          {showCombo && (player.comboCount ?? 0) > 0 && (
            <ComboIndicator count={player.comboCount ?? 0} />
          )}
        </>
      )}
    </div>
  );
}

/**
 * ManaBar - Shows current mana with a pixel-styled progress bar.
 */
interface ManaBarProps {
  current: number;
  max: number;
}

function ManaBar({ current, max }: ManaBarProps) {
  // Guard against division by zero and invalid values
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeCurrent = Number.isFinite(current) ? Math.max(0, current) : 0;
  const percentage = Math.min(100, (safeCurrent / safeMax) * 100);

  return (
    <div className="flex items-center gap-1.5 xs:gap-2 mb-2">
      <h3 className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400">Powers</h3>
      <div className="flex-1 flex items-center gap-1 xs:gap-1.5">
        <span className="pixel-text text-pixel-2xs xs:text-pixel-xs text-mana font-bold">MP</span>
        <div
          className="flex-1 max-w-24 xs:max-w-32 pixel-progress-bar h-1.5 rounded overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.floor(current)}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`Mana: ${Math.floor(current)} of ${max}`}
        >
          <div
            className="pixel-progress-fill h-full bg-gradient-to-r from-mana to-mana/80 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span data-testid="mana-display" className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400">
          {Math.floor(current)}/{max}
        </span>
      </div>
    </div>
  );
}

/**
 * ComboIndicator - Shows the current combo multiplier with pixel styling.
 */
interface ComboIndicatorProps {
  count: number;
}

function ComboIndicator({ count }: ComboIndicatorProps) {
  const bonusDamage = count * 10;

  return (
    <div
      className="mt-2 pixel-text text-pixel-sm text-warning combo-pulse flex items-center gap-1"
      role="status"
      aria-live="polite"
    >
      <Sparkles className="w-4 h-4 text-warning" aria-hidden="true" />
      <span>{count}x Combo Active (+{bonusDamage}% damage)</span>
    </div>
  );
}
