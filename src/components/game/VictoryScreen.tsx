import { useState, useEffect } from 'react';
import { Player } from '@/types/game';
import { Button } from '@/components/ui/button';
import { PixelSprite } from './PixelSprite';
import { cn } from '@/lib/utils';
import { Trophy, Star, Crown, Sparkles } from 'lucide-react';
import { getPathName } from '@/utils/powerSynergies';

interface VictoryScreenProps {
  player: Player;
  onNewRun: () => void;
  onReturnToMenu: () => void;
}

export function VictoryScreen({ player, onNewRun, onReturnToMenu }: VictoryScreenProps) {
  const [spriteState, setSpriteState] = useState<'idle' | 'walk'>('walk');
  const [showStats, setShowStats] = useState(false);

  // Victory walk animation, then show stats
  useEffect(() => {
    const walkTimer = setTimeout(() => {
      setSpriteState('idle');
    }, 1500);

    const statsTimer = setTimeout(() => {
      setShowStats(true);
    }, 800);

    return () => {
      clearTimeout(walkTimer);
      clearTimeout(statsTimer);
    };
  }, []);

  const pathName = player.path ? getPathName(player.path.pathId) : 'No Path';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 via-yellow-950 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Victory atmospheric background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[300px] bg-yellow-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Celebration stars scattered in background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="pixel-star-gold"
            style={{
              top: `${10 + (i * 7) % 80}%`,
              left: `${5 + (i * 13) % 90}%`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-3xl w-full space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 sm:gap-4 animate-bounce-slow">
            <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-amber-400" />
            <h1 className="pixel-title text-lg sm:text-xl md:text-2xl font-bold tracking-wider uppercase">
              <span className="pixel-glow-gold bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
                VICTORY!
              </span>
            </h1>
            <Crown className="w-8 h-8 sm:w-12 sm:h-12 text-amber-400" />
          </div>

          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />
            <p className="pixel-text text-pixel-xs sm:text-pixel-sm text-amber-300 tracking-wider">
              The Final Boss has been defeated!
            </p>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />
          </div>
        </div>

        {/* Victorious sprite */}
        <div className="flex justify-center">
          <div className="relative pixel-panel rounded-lg p-4 sm:p-6 border-2 border-amber-500/50 bg-gradient-to-b from-amber-900/20 to-slate-900/50">
            <PixelSprite
              type={player.class}
              state={spriteState}
              direction="right"
              scale={5}
              frame={0}
            />

            {/* Victory effects */}
            <div className="absolute -top-2 -right-2">
              <Star className="w-6 h-6 text-amber-400 animate-spin-slow" />
            </div>
            <div className="absolute -bottom-2 -left-2">
              <Star className="w-6 h-6 text-yellow-400 animate-spin-slow" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
        </div>

        {/* Run Statistics */}
        <div
          className={cn(
            "pixel-panel rounded-lg p-4 sm:p-6 space-y-4 transition-all duration-700",
            showStats ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <h2 className="pixel-text text-pixel-sm sm:text-pixel-base text-amber-400 font-bold tracking-wider text-center mb-4">
            RUN STATISTICS
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Class and Path */}
            <div className="pixel-panel-dark rounded p-3">
              <div className="pixel-text text-pixel-2xs sm:text-pixel-xs text-slate-400 mb-1">Class</div>
              <div className="pixel-text text-pixel-xs sm:text-pixel-sm text-amber-300 font-bold capitalize">
                {player.class}
              </div>
            </div>

            <div className="pixel-panel-dark rounded p-3">
              <div className="pixel-text text-pixel-2xs sm:text-pixel-xs text-slate-400 mb-1">Path</div>
              <div className="pixel-text text-pixel-xs sm:text-pixel-sm text-amber-300 font-bold">
                {pathName}
              </div>
            </div>

            {/* Floor Cleared */}
            <div className="pixel-panel-dark rounded p-3">
              <div className="pixel-text text-pixel-2xs sm:text-pixel-xs text-slate-400 mb-1">Floors Cleared</div>
              <div className="pixel-text text-pixel-xs sm:text-pixel-sm text-green-400 font-bold">
                5 / 5
              </div>
            </div>

            {/* Final Level */}
            <div className="pixel-panel-dark rounded p-3">
              <div className="pixel-text text-pixel-2xs sm:text-pixel-xs text-slate-400 mb-1">Final Level</div>
              <div className="pixel-text text-pixel-xs sm:text-pixel-sm text-purple-400 font-bold">
                Level {player.level}
              </div>
            </div>

            {/* Total Gold */}
            <div className="pixel-panel-dark rounded p-3">
              <div className="pixel-text text-pixel-2xs sm:text-pixel-xs text-slate-400 mb-1">Total Gold</div>
              <div className="pixel-text text-pixel-xs sm:text-pixel-sm text-amber-400 font-bold flex items-center gap-1">
                <span>💰</span> {player.gold}
              </div>
            </div>

            {/* Powers Learned */}
            <div className="pixel-panel-dark rounded p-3">
              <div className="pixel-text text-pixel-2xs sm:text-pixel-xs text-slate-400 mb-1">Powers Learned</div>
              <div className="pixel-text text-pixel-xs sm:text-pixel-sm text-cyan-400 font-bold">
                {player.powers.length}
              </div>
            </div>
          </div>

          {/* Equipment showcase */}
          {player.equippedItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="pixel-text text-pixel-2xs sm:text-pixel-xs text-slate-400 mb-2 text-center">
                Equipment
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {player.equippedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="pixel-panel-dark rounded px-2 py-1 flex items-center gap-1"
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className={cn(
                      "pixel-text text-pixel-2xs",
                      item.rarity === 'legendary' ? 'text-rarity-legendary' :
                      item.rarity === 'epic' ? 'text-rarity-epic' :
                      item.rarity === 'rare' ? 'text-rarity-rare' :
                      item.rarity === 'uncommon' ? 'text-rarity-uncommon' :
                      'text-rarity-common'
                    )}>
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={onNewRun}
            size="lg"
            className={cn(
              "w-full pixel-text text-pixel-sm sm:text-pixel-base tracking-wider uppercase",
              "bg-gradient-to-r from-amber-600 to-yellow-600",
              "hover:from-amber-500 hover:to-yellow-500",
              "text-white font-bold shadow-lg",
              "transition-all duration-200",
              "border-2 border-amber-400/50",
              "pixel-glow-gold"
            )}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Start New Run
          </Button>

          <Button
            onClick={onReturnToMenu}
            variant="outline"
            size="lg"
            className={cn(
              "w-full pixel-text text-pixel-sm sm:text-pixel-base tracking-wider uppercase",
              "border-2 border-slate-600 hover:border-slate-500",
              "bg-slate-900/50 hover:bg-slate-800/50",
              "text-slate-300 hover:text-slate-200"
            )}
          >
            Return to Menu
          </Button>
        </div>
      </div>

      {/* Pixel-art styling */}
      <style>{`
        .pixel-title {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          text-shadow:
            3px 3px 0 #1a1a2e,
            -1px -1px 0 #1a1a2e,
            1px -1px 0 #1a1a2e,
            -1px 1px 0 #1a1a2e;
          letter-spacing: 0.05em;
        }

        .pixel-glow-gold {
          filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))
                  drop-shadow(0 0 20px rgba(251, 191, 36, 0.3));
        }

        .pixel-text {
          font-family: 'Press Start 2P', 'Courier New', monospace;
        }

        .pixel-panel {
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
          image-rendering: pixelated;
          box-shadow:
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.05);
        }

        .pixel-panel-dark {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
          image-rendering: pixelated;
          box-shadow:
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.05);
        }

        .pixel-star-gold {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #fbbf24;
          box-shadow: 0 0 6px rgba(251, 191, 36, 0.8);
          animation: twinkle 2s infinite;
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .text-pixel-2xs { font-size: 0.5rem; line-height: 1.2; }
        .text-pixel-xs { font-size: 0.625rem; line-height: 1.3; }
        .text-pixel-sm { font-size: 0.75rem; line-height: 1.4; }
        .text-pixel-base { font-size: 0.875rem; line-height: 1.5; }
        .text-pixel-lg { font-size: 1rem; line-height: 1.5; }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .pixel-star-gold,
          .animate-spin-slow,
          .animate-bounce-slow {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
