import { Sparkles } from 'lucide-react';
import { PowerButton } from './PowerButton';
import { StanceToggle } from './StanceToggle';
import { ResourceBar } from './ResourceBar';
import { getPowerModifiers, hasComboMechanic, isPassivePath } from '@/utils/pathUtils';
import { getStancesForPath } from '@/data/stances';
import { isFeatureEnabled } from '@/constants/features';
import { getResourceDisplayName } from '@/data/pathResources';
import type { PlayerSnapshot } from '@/ecs/snapshot';
import { useGameActions } from '@/ecs/context/GameContext';

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
  // Calculate effective resource costs with path ability reductions
  const powerMods = getPowerModifiers({ path: player.path });
  const getEffectiveResourceCost = (baseCost: number) =>
    Math.max(0, Math.floor(baseCost * (1 - powerMods.costReduction)));

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

  // Check if player has any resource to display (stamina at level 1, or path resource after)
  const hasResource = player.pathResource != null;

  return (
    <div className="pixel-panel rounded-lg p-2 sm:p-3">
      {/* Resource bar header - show resource bar if player has any resource (stamina or path resource) */}
      {hasResource && player.pathResource ? (
        <div className="mb-2">
          <h3 className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400 mb-1">Powers</h3>
          <ResourceBar
            resource={player.pathResource}
            thresholdMarkers={true}
            showLabel={true}
          />
        </div>
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
              // Use pathResource for active paths
              const currentResource = player.pathResource?.current ?? 0;
              const resourceCost = power.resourceCost ?? 0;
              const resourceBehavior = player.pathResource?.resourceBehavior ?? 'spend';
              const resourceMax = player.pathResource?.max ?? 100;
              const resourceLabel = player.pathResource
                ? getResourceDisplayName(player.pathResource.type)
                : '';
              return (
                <PowerButton
                  key={power.id}
                  power={power}
                  cooldownRemaining={player.cooldowns.get(power.id)?.remaining ?? 0}
                  currentResource={currentResource}
                  effectiveCost={getEffectiveResourceCost(resourceCost)}
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
