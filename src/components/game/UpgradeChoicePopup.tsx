import { useState } from 'react';
import { useGame, useGameActions } from '@/ecs/context/GameContext';
import { getBerserkerPowerUpgrade } from '@/data/paths/berserker-powers';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import { PixelIcon, IconType } from '@/components/ui/PixelIcon';
import { cn } from '@/lib/utils';
import { Check, ArrowUp, Sparkles } from 'lucide-react';

/**
 * UpgradeChoicePopup displays when the player has a pending upgrade choice
 * (typically at odd levels 3, 5, 7, 9+ for active paths).
 *
 * Shows the player's current powers and what upgrades are available.
 */
export function UpgradeChoicePopup() {
  const { player } = useGame();
  const actions = useGameActions();
  const [selectedPowerId, setSelectedPowerId] = useState<string | null>(null);
  const [hoveredPowerId, setHoveredPowerId] = useState<string | null>(null);

  // Don't render if no pending upgrade choice
  if (!player?.pendingUpgradeChoice) return null;

  const { powerIds } = player.pendingUpgradeChoice;

  // Get player's powers that can be upgraded
  const upgradeablePowers = player.powers?.filter(p => powerIds.includes(p.id)) ?? [];

  // Get current tier for each power from pathProgression
  const getPowerTier = (powerId: string): 0 | 1 | 2 => {
    const upgrade = player.pathProgression?.powerUpgrades?.find(u => u.powerId === powerId);
    return upgrade?.currentTier ?? 0;
  };

  const handleConfirm = () => {
    if (selectedPowerId) {
      actions.upgradePower(selectedPowerId);
    }
  };

  // Get the resource label for cost display
  const getResourceLabel = (): string => {
    if (player.pathResource) {
      const resourceType = player.pathResource.type;
      return resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
    }
    return 'Resource';
  };

  return (
    <div
      data-testid="upgrade-choice-popup"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-300 p-2 sm:p-4"
    >
      <div className="pixel-panel border-2 border-emerald-500/50 rounded-lg p-4 sm:p-6 max-w-2xl w-full shadow-2xl shadow-emerald-500/20 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="mb-2" aria-hidden="true">
            <ArrowUp className="w-12 h-12 mx-auto text-emerald-400" />
          </div>
          <h2 className="pixel-title text-base sm:text-lg md:text-xl font-bold tracking-wider uppercase mb-3">
            <span className="pixel-glow-emerald bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 bg-clip-text text-transparent">
              Upgrade a Power
            </span>
          </h2>

          <PixelDivider color="emerald" className="pt-3" />

          <p className="pixel-text text-pixel-xs text-slate-400 mt-3">
            Choose a power to enhance with new abilities
          </p>
        </div>

        {/* Power Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {upgradeablePowers.map((power) => {
            const currentTier = getPowerTier(power.id);
            const nextTier = currentTier + 1;
            const upgradeInfo = getBerserkerPowerUpgrade(power.id, nextTier);
            const isSelected = selectedPowerId === power.id;
            const isHovered = hoveredPowerId === power.id;

            return (
              <div
                key={power.id}
                className={cn(
                  'relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200',
                  'hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/30'
                    : isHovered
                    ? 'border-emerald-400/60 bg-slate-800/60'
                    : 'border-slate-600/50 bg-slate-800/40'
                )}
                onClick={() => setSelectedPowerId(power.id)}
                onMouseEnter={() => setHoveredPowerId(power.id)}
                onMouseLeave={() => setHoveredPowerId(null)}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`Upgrade ${power.name} from tier ${currentTier} to tier ${nextTier}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedPowerId(power.id);
                  }
                }}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 z-10" aria-hidden="true">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Power icon */}
                  <div
                    className={cn(
                      'p-3 rounded-lg transition-all duration-200 shrink-0',
                      isSelected || isHovered
                        ? 'bg-emerald-500/20 shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-700/50'
                    )}
                  >
                    <PixelIcon
                      type={power.icon as IconType}
                      size={40}
                      className="w-10 h-10"
                    />
                  </div>

                  {/* Power info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3
                        className={cn(
                          'pixel-text text-pixel-base font-bold uppercase tracking-wide',
                          isSelected || isHovered ? 'text-emerald-400' : 'text-slate-200'
                        )}
                      >
                        {power.name}
                      </h3>

                      {/* Tier indicator */}
                      <div className="flex items-center gap-1.5">
                        <span className="pixel-text text-pixel-2xs text-slate-500">
                          Tier {currentTier}
                        </span>
                        <ArrowUp className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                        <span className="pixel-text text-pixel-2xs text-emerald-400 font-bold">
                          {nextTier}
                        </span>
                      </div>
                    </div>

                    {/* Current description */}
                    <p className="pixel-text text-pixel-xs text-slate-400 mb-3">
                      {power.description}
                    </p>

                    {/* Upgrade info */}
                    {upgradeInfo && (
                      <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-md p-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="pixel-text text-pixel-xs text-emerald-300">
                          {upgradeInfo.description}
                        </p>
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-700/50">
                      <span className="pixel-text text-pixel-2xs text-slate-500">
                        {power.resourceCost} {getResourceLabel()}
                      </span>
                      <span className="pixel-text text-pixel-2xs text-slate-500">
                        {power.cooldown}s CD
                      </span>
                    </div>
                  </div>
                </div>

                {/* Choose button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPowerId(power.id);
                  }}
                  className={cn(
                    'w-full mt-4 pixel-button text-pixel-xs uppercase font-bold',
                    'transition-all duration-150 border-b-4',
                    isSelected
                      ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white'
                      : 'bg-slate-600 hover:bg-slate-500 border-slate-800 text-slate-200'
                  )}
                >
                  {isSelected ? 'Selected' : 'Choose'}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Confirm button */}
        <Button
          onClick={handleConfirm}
          disabled={!selectedPowerId}
          size="lg"
          className={cn(
            'w-full pixel-button text-pixel-sm uppercase font-bold',
            'transition-all duration-150 border-b-4',
            selectedPowerId
              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-800 hover:border-emerald-700 active:border-b-2 active:translate-y-[2px]'
              : 'bg-slate-700 border-slate-800 cursor-not-allowed opacity-50'
          )}
        >
          {selectedPowerId
            ? `Upgrade ${upgradeablePowers.find(p => p.id === selectedPowerId)?.name}`
            : 'Select a Power'}
        </Button>
      </div>
    </div>
  );
}
