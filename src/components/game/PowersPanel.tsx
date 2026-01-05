import { Shield, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PowerButton } from './PowerButton';
import { StanceToggle } from './StanceToggle';
import { ResourceBar } from './ResourceBar';
import { COMBAT_BALANCE } from '@/constants/balance';
import { getPowerModifiers, hasComboMechanic, isPassivePath } from '@/utils/pathUtils';
import { getStancesForPath } from '@/data/stances';
import { isFeatureEnabled } from '@/constants/features';
import { pathUsesResourceSystem } from '@/hooks/usePathResource';
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
  onActivateBlock: () => void;
}

/**
 * PowersPanel - Displays mana bar, block button, power buttons, and combo indicator.
 * For passive paths with PASSIVE_STANCE_SYSTEM enabled, shows stance toggle UI.
 * Styled with pixel art / 8-bit retro aesthetic.
 */
export function PowersPanel({
  player,
  canUsePowers,
  onUsePower,
  onActivateBlock,
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

  // Check if player uses path resource system
  const usesPathResource = pathUsesResourceSystem(pathId) && player.pathResource;

  return (
    <div className="pixel-panel rounded-lg p-2 sm:p-3">
      {/* Resource bar header - show path resource OR mana */}
      {usesPathResource && player.pathResource ? (
        <div className="mb-2">
          <h3 className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400 mb-1">Powers</h3>
          <ResourceBar
            resource={player.pathResource}
            thresholdMarkers={true}
            showLabel={true}
          />
        </div>
      ) : (
        <ManaBar
          current={player.mana.current}
          max={player.mana.max}
        />
      )}

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
            {/* Block Button */}
            <BlockButton
              isBlocking={player.isBlocking}
              currentMana={player.mana.current}
              canUse={canUsePowers}
              onActivate={onActivateBlock}
            />

            {/* Power buttons */}
            {player.powers.map(power => (
              <PowerButton
                key={power.id}
                power={power}
                currentMana={player.mana.current}
                effectiveManaCost={getEffectiveManaCost(power.manaCost)}
                onUse={() => onUsePower(power.id)}
                disabled={!canUsePowers}
                playerPathId={player.path?.pathId ?? null}
              />
            ))}
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
 * BlockButton - Pixel-styled button to activate the block ability.
 */
interface BlockButtonProps {
  isBlocking: boolean;
  currentMana: number;
  canUse: boolean;
  onActivate: () => void;
}

function BlockButton({ isBlocking, currentMana, canUse, onActivate }: BlockButtonProps) {
  const canAfford = currentMana >= COMBAT_BALANCE.BLOCK_MANA_COST;
  const isDisabled = !canUse || isBlocking || !canAfford;
  const canActivate = !isDisabled;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              'pixel-panel-dark flex flex-col items-center gap-0.5 p-1.5 xs:p-2 min-w-[60px] xs:min-w-[70px] sm:min-w-[80px] min-h-[50px] xs:min-h-[56px] rounded border transition-all',
              canActivate && 'border-info/40 hover:border-info/70 hover:bg-info/10 cursor-pointer',
              !canActivate && 'opacity-50 cursor-not-allowed border-slate-700/30',
              isBlocking && 'bg-info/20 border-info/60'
            )}
            onClick={onActivate}
            disabled={isDisabled}
            aria-label={`Block: Reduce damage by 50% from next attack. Costs ${COMBAT_BALANCE.BLOCK_MANA_COST} mana.${isBlocking ? ' Currently active.' : ''}`}
          >
            <Shield className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-info" aria-hidden="true" />
            <span className="pixel-text text-pixel-2xs font-medium text-slate-200">Block</span>
            <span className="pixel-text text-pixel-2xs text-mana">
              {COMBAT_BALANCE.BLOCK_MANA_COST} MP
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="pixel-panel">
          <p className="pixel-text text-pixel-xs">Reduce damage by 50% from next attack</p>
          <p className="pixel-text text-pixel-2xs text-mana mt-1">{COMBAT_BALANCE.BLOCK_MANA_COST} MP</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
