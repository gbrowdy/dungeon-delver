import { useState } from 'react';
import { useGame, useGameActions } from '@/ecs/context/GameContext';
import { dispatch, Commands } from '@/ecs/commands';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import { cn } from '@/lib/utils';
import { Check, Shield, Flame } from 'lucide-react';
import type { StanceEnhancement } from '@/types/paths';

/**
 * StanceEnhancementPopup displays when the player has a pending stance enhancement choice
 * (Guardian passive path level-up progression).
 *
 * Shows two enhancement options - one for Iron Stance (defensive) and one for
 * Retribution Stance (reflect damage). Each enhancement strengthens that specific stance.
 */
export function StanceEnhancementPopup() {
  const { player } = useGame();
  const actions = useGameActions();
  const [selectedStance, setSelectedStance] = useState<'iron' | 'retribution' | null>(null);
  const [hoveredStance, setHoveredStance] = useState<'iron' | 'retribution' | null>(null);

  // Don't render if no pending stance enhancement
  if (!player?.pendingStanceEnhancement) return null;

  const { ironChoice, retributionChoice } = player.pendingStanceEnhancement;

  const handleConfirm = () => {
    if (selectedStance) {
      dispatch(Commands.selectStanceEnhancement(selectedStance));
    }
  };

  // Get theme colors for each stance
  const getStanceTheme = (stance: 'iron' | 'retribution') => {
    if (stance === 'iron') {
      return {
        border: 'border-sky-500/30',
        borderSelected: 'border-sky-500',
        bg: 'bg-sky-500/10',
        bgHover: 'hover:bg-sky-900/40',
        text: 'text-sky-400',
        textLight: 'text-sky-300',
        glow: 'shadow-sky-500/30',
        button: {
          selected: 'bg-sky-500 hover:bg-sky-400 border-sky-700',
          default: 'bg-slate-600 hover:bg-slate-500 border-slate-800',
        },
        ring: 'focus-visible:ring-sky-500',
        check: 'bg-sky-500',
        icon: Shield,
        label: 'Iron Stance',
        description: 'Defensive Enhancement',
      };
    }
    return {
      border: 'border-orange-500/30',
      borderSelected: 'border-orange-500',
      bg: 'bg-orange-500/10',
      bgHover: 'hover:bg-orange-900/40',
      text: 'text-orange-400',
      textLight: 'text-orange-300',
      glow: 'shadow-orange-500/30',
      button: {
        selected: 'bg-orange-500 hover:bg-orange-400 border-orange-700',
        default: 'bg-slate-600 hover:bg-slate-500 border-slate-800',
      },
      ring: 'focus-visible:ring-orange-500',
      check: 'bg-orange-500',
      icon: Flame,
      label: 'Retribution Stance',
      description: 'Aggressive Enhancement',
    };
  };

  const renderEnhancementCard = (
    enhancement: StanceEnhancement,
    stanceId: 'iron' | 'retribution'
  ) => {
    const isSelected = selectedStance === stanceId;
    const isHovered = hoveredStance === stanceId;
    const theme = getStanceTheme(stanceId);
    const Icon = theme.icon;

    return (
      <div
        key={stanceId}
        className={cn(
          'relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200',
          'hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          theme.ring,
          isSelected
            ? `${theme.borderSelected} ${theme.bg} shadow-lg ${theme.glow}`
            : isHovered
            ? `${theme.border} bg-slate-800/60`
            : 'border-slate-600/50 bg-slate-800/40'
        )}
        onClick={() => setSelectedStance(stanceId)}
        onMouseEnter={() => setHoveredStance(stanceId)}
        onMouseLeave={() => setHoveredStance(null)}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected}
        aria-label={`${theme.label}: ${enhancement.name} - ${enhancement.description}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedStance(stanceId);
          }
        }}
      >
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-3 right-3 z-10" aria-hidden="true">
            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', theme.check)}>
              <Check className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        {/* Stance label and icon */}
        <div className="flex flex-col items-center gap-3 mb-4">
          <div
            className={cn(
              'p-3 rounded-lg transition-all duration-200',
              isSelected || isHovered
                ? `${theme.bg} shadow-lg ${theme.glow}`
                : 'bg-slate-700/50'
            )}
          >
            <Icon
              className={cn(
                'w-10 h-10 transition-colors duration-200',
                isSelected || isHovered ? theme.text : 'text-slate-400'
              )}
              aria-hidden="true"
            />
          </div>

          <div className="text-center">
            <div className={cn('text-xs uppercase tracking-wider mb-1', theme.text)}>
              {theme.label}
            </div>
            <h3
              className={cn(
                'pixel-text text-pixel-base font-bold uppercase tracking-wide',
                isSelected || isHovered ? theme.textLight : 'text-slate-200'
              )}
            >
              {enhancement.name}
            </h3>
            <span className="text-xs text-slate-500">Tier {enhancement.tier}</span>
          </div>
        </div>

        {/* Description */}
        <p className="pixel-text text-pixel-xs text-slate-300 text-center leading-relaxed mb-4">
          {enhancement.description}
        </p>

        {/* Stance theme indicator */}
        <div className={cn(
          'text-xs text-center py-2 px-3 rounded border',
          isSelected || isHovered
            ? `${theme.bg} ${theme.border} ${theme.text}`
            : 'bg-slate-700/30 border-slate-600/30 text-slate-500'
        )}>
          {theme.description}
        </div>

        {/* Choose button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedStance(stanceId);
          }}
          className={cn(
            'w-full mt-4 pixel-button text-pixel-xs uppercase font-bold',
            'transition-all duration-150 border-b-4',
            isSelected
              ? `${theme.button.selected} text-white`
              : `${theme.button.default} text-slate-200`
          )}
        >
          {isSelected ? 'Selected' : 'Choose'}
        </Button>
      </div>
    );
  };

  return (
    <div
      data-testid="stance-enhancement-popup"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-300 p-2 sm:p-4"
    >
      <div className="pixel-panel border-2 border-purple-500/50 rounded-lg p-4 sm:p-6 max-w-2xl w-full shadow-2xl shadow-purple-500/20 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="mb-2 flex justify-center gap-2" aria-hidden="true">
            <Shield className="w-8 h-8 text-sky-400" />
            <Flame className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="pixel-title text-base sm:text-lg md:text-xl font-bold tracking-wider uppercase mb-3">
            <span className="pixel-glow-purple bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              Enhance Your Stance
            </span>
          </h2>

          <PixelDivider color="purple" className="pt-3" />

          <p className="pixel-text text-pixel-xs text-slate-400 mt-3">
            Choose which stance to strengthen
          </p>
        </div>

        {/* Enhancement Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {renderEnhancementCard(ironChoice, 'iron')}
          {renderEnhancementCard(retributionChoice, 'retribution')}
        </div>

        {/* Confirm button */}
        <Button
          onClick={handleConfirm}
          disabled={!selectedStance}
          size="lg"
          className={cn(
            'w-full pixel-button text-pixel-sm uppercase font-bold',
            'transition-all duration-150 border-b-4',
            selectedStance
              ? 'bg-purple-600 hover:bg-purple-500 border-purple-800 hover:border-purple-700 active:border-b-2 active:translate-y-[2px]'
              : 'bg-slate-700 border-slate-800 cursor-not-allowed opacity-50'
          )}
        >
          {selectedStance
            ? `Enhance ${selectedStance === 'iron' ? 'Iron' : 'Retribution'} Stance`
            : 'Select an Enhancement'}
        </Button>
      </div>
    </div>
  );
}
