import { useState } from 'react';
import { useGame, useGameActions } from '@/ecs/context/GameContext';
import type { Power } from '@/types/game';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import { PixelIcon, IconType } from '@/components/ui/PixelIcon';
import { cn } from '@/lib/utils';
import { Check, Clock, Zap } from 'lucide-react';

/**
 * PowerChoicePopup displays when the player has a pending power choice
 * (typically at certain level milestones for active paths).
 *
 * Shows two power options side-by-side and lets the player select one.
 */
export function PowerChoicePopup() {
  const { player } = useGame();
  const actions = useGameActions();
  const [selectedPowerId, setSelectedPowerId] = useState<string | null>(null);
  const [hoveredPowerId, setHoveredPowerId] = useState<string | null>(null);

  // Don't render if no pending power choice
  if (!player?.pendingPowerChoice) return null;

  const { level, choices } = player.pendingPowerChoice;

  const handleConfirm = () => {
    if (selectedPowerId) {
      actions.selectPower(selectedPowerId);
    }
  };

  // Get the cost to display
  const getResourceCost = (power: Power): number => {
    return power.resourceCost;
  };

  // Get the resource label based on player's path
  const getResourceLabel = (): string => {
    if (player.pathResource) {
      // Capitalize first letter of resource type
      const resourceType = player.pathResource.type;
      return resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
    }
    return 'Resource';
  };

  return (
    <div
      data-testid="power-choice-popup"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-300 p-2 sm:p-4"
    >
      <div className="pixel-panel border-2 border-amber-500/50 rounded-lg p-4 sm:p-6 max-w-2xl w-full shadow-2xl shadow-amber-500/20 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="mb-2" aria-hidden="true">
            <PixelIcon type="ui-sparkle" size={48} className="mx-auto" />
          </div>
          <h2 className="pixel-title text-base sm:text-lg md:text-xl font-bold tracking-wider uppercase mb-3">
            <span className="pixel-glow-gold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              Level {level}: Choose Your Power
            </span>
          </h2>

          <PixelDivider color="amber" className="pt-3" />

          <p className="pixel-text text-pixel-xs text-slate-400 mt-3">
            Select a new power to add to your arsenal
          </p>
        </div>

        {/* Power Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {choices.map((power) => {
            const isSelected = selectedPowerId === power.id;
            const isHovered = hoveredPowerId === power.id;

            return (
              <div
                key={power.id}
                className={cn(
                  'relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200',
                  'hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/30'
                    : isHovered
                    ? 'border-amber-400/60 bg-slate-800/60'
                    : 'border-slate-600/50 bg-slate-800/40'
                )}
                onClick={() => setSelectedPowerId(power.id)}
                onMouseEnter={() => setHoveredPowerId(power.id)}
                onMouseLeave={() => setHoveredPowerId(null)}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`${power.name} - ${power.description}`}
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
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Power icon and name */}
                <div className="flex flex-col items-center gap-3 mb-4">
                  <div
                    className={cn(
                      'p-3 rounded-lg transition-all duration-200',
                      isSelected || isHovered
                        ? 'bg-amber-500/20 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-700/50'
                    )}
                  >
                    <PixelIcon
                      type={power.icon as IconType}
                      size={40}
                      className="w-10 h-10"
                    />
                  </div>

                  <h3
                    className={cn(
                      'pixel-text text-pixel-base font-bold uppercase tracking-wide text-center',
                      isSelected || isHovered ? 'text-amber-400' : 'text-slate-200'
                    )}
                  >
                    {power.name}
                  </h3>
                </div>

                {/* Description */}
                <p className="pixel-text text-pixel-xs text-slate-300 text-center leading-relaxed mb-4">
                  {power.description}
                </p>

                {/* Stats */}
                <div className="flex justify-center gap-4 pt-3 border-t border-slate-700/50">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-blue-400" aria-hidden="true" />
                    <span className="pixel-text text-pixel-2xs text-slate-400">
                      {getResourceCost(power)} {getResourceLabel()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <span className="pixel-text text-pixel-2xs text-slate-400">
                      {power.cooldown}s CD
                    </span>
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
                      ? 'bg-amber-500 hover:bg-amber-400 border-amber-700 text-white'
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
              ? 'bg-amber-600 hover:bg-amber-500 border-amber-800 hover:border-amber-700 active:border-b-2 active:translate-y-[2px]'
              : 'bg-slate-700 border-slate-800 cursor-not-allowed opacity-50'
          )}
        >
          {selectedPowerId
            ? `Confirm ${choices.find(p => p.id === selectedPowerId)?.name}`
            : 'Select a Power'}
        </Button>
      </div>
    </div>
  );
}
