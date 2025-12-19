import { BattlePhaseType } from '@/constants/enums';
import { BATTLE_PHASE } from '@/constants/enums';
import { Enemy } from '@/types/game';
import { Trophy, Skull } from 'lucide-react';

interface BattleOverlayProps {
  isPaused: boolean;
  playerDeathEffect: boolean;
  isFloorComplete: boolean;
  phase: BattlePhaseType;
  enemy: Enemy | null;
}

export function BattleOverlay({
  isPaused,
  playerDeathEffect,
  isFloorComplete,
  phase,
  enemy,
}: BattleOverlayProps) {
  return (
    <>
      {/* Transitioning message */}
      {!enemy && phase === BATTLE_PHASE.TRANSITIONING && !isFloorComplete && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="pixel-text text-pixel-base text-white/80 font-medium animate-pulse">
            Advancing to next room...
          </div>
        </div>
      )}

      {/* Floor complete */}
      {isFloorComplete && (
        <div className="absolute inset-0 flex items-center justify-center animate-floor-complete">
          <div className="text-center">
            <div className="mb-2 animate-bounce"><Trophy className="w-12 h-12 text-gold mx-auto" /></div>
            <div className="pixel-title text-base sm:text-lg md:text-xl font-bold text-gold animate-pulse pixel-glow-gold">
              FLOOR COMPLETE!
            </div>
          </div>
        </div>
      )}

      {/* Player death overlay */}
      {playerDeathEffect && (
        <div className="absolute inset-0 bg-gradient-to-t from-health/60 via-black/80 to-black/60 flex items-center justify-center animate-fade-in">
          <div className="text-center">
            <div className="mb-4 animate-pulse"><Skull className="w-12 h-12 text-health mx-auto" /></div>
            <div className="pixel-title text-xl sm:text-2xl md:text-3xl font-bold text-health animate-pulse pixel-glow-red">
              DEFEATED
            </div>
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && !playerDeathEffect && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="pixel-title text-base sm:text-lg md:text-xl font-bold text-white animate-pulse">PAUSED</div>
        </div>
      )}
    </>
  );
}
