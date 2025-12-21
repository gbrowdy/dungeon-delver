import { useState, useEffect } from 'react';
import { Player } from '@/types/game';
import { Button } from '@/components/ui/button';
import { PixelSprite } from './PixelSprite';
import { cn } from '@/lib/utils';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { getPlayerDisplayName } from '@/utils/powerSynergies';
import { FLOOR_CONFIG } from '@/constants/game';
import { getIcon } from '@/lib/icons';
import type { SpriteType } from '@/data/sprites';

interface VictoryScreenProps {
  player: Player;
  onNewRun: () => void;
  onReturnToMenu: () => void;
}

export function VictoryScreen({ player, onNewRun, onReturnToMenu }: VictoryScreenProps) {
  const [spriteState, setSpriteState] = useState<'idle' | 'walk'>('walk');
  const [showStats, setShowStats] = useState(false);

  // Determine sprite type - use path variant if player has selected a path
  const getSpriteType = (): SpriteType | string => {
    if (player.path?.pathId) {
      return player.path.pathId;
    }
    return player.class as SpriteType;
  };
  const spriteType = getSpriteType();

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 via-yellow-950 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Victory atmospheric background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[300px] bg-yellow-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Celebration stars, confetti, and fireworks in background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Twinkling stars */}
        {[...Array(12)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="pixel-star-gold"
            style={{
              top: `${10 + (i * 7) % 80}%`,
              left: `${5 + (i * 13) % 90}%`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}

        {/* Falling confetti */}
        {[...Array(25)].map((_, i) => {
          const colors = ['#fbbf24', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'];
          const color = colors[i % colors.length];
          const startX = (i * 15) % 100;
          const duration = 2 + (i % 3) * 0.5;
          const delay = (i % 5) * 0.2;
          const rotation = (i * 137) % 720; // Golden angle for distribution

          return (
            <div
              key={`confetti-${i}`}
              className="absolute w-2 h-2 animate-confetti"
              style={{
                left: `${startX}%`,
                top: '-20px',
                backgroundColor: color,
                '--confetti-start': '-20px',
                '--confetti-end': '100vh',
                '--confetti-rot': `${rotation}deg`,
                '--confetti-duration': `${duration}s`,
                animationDelay: `${delay}s`,
                animationIterationCount: 'infinite',
              } as React.CSSProperties}
            />
          );
        })}

        {/* Firework bursts at different positions */}
        {[
          { x: 20, y: 30, delay: 0.3 },
          { x: 70, y: 25, delay: 0.6 },
          { x: 50, y: 40, delay: 0.9 },
        ].map((fw, fwIdx) => (
          <div
            key={`firework-${fwIdx}`}
            className="absolute"
            style={{
              left: `${fw.x}%`,
              top: `${fw.y}%`,
            }}
          >
            {/* Firework center burst */}
            <div
              className="absolute w-8 h-8 rounded-full bg-amber-400/60 animate-firework"
              style={{
                left: '50%',
                top: '50%',
                animationDelay: `${fw.delay}s`,
                animationIterationCount: 'infinite',
                animationDuration: '2s',
              }}
            />

            {/* Radiating particles */}
            {[...Array(10)].map((_, pIdx) => {
              const angle = (pIdx * 360) / 10;
              const distance = 50 + (pIdx % 3) * 10;

              return (
                <div
                  key={`particle-${fwIdx}-${pIdx}`}
                  className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-firework-trail"
                  style={{
                    left: '50%',
                    top: '50%',
                    '--trail-distance': `${distance}px`,
                    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                    transformOrigin: 'center',
                    animationDelay: `${fw.delay}s`,
                    animationIterationCount: 'infinite',
                    animationDuration: '2s',
                  } as React.CSSProperties}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-3xl w-full space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 sm:gap-4 animate-bounce-slow">
            <PixelIcon type="ui-trophy" size={48} animated />
            <h1 className="pixel-title text-lg sm:text-xl md:text-2xl font-bold tracking-wider uppercase">
              <span className="pixel-glow-gold bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
                VICTORY!
              </span>
            </h1>
            <PixelIcon type="ui-trophy" size={48} animated />
          </div>

          <div className="flex items-center justify-center gap-2">
            <PixelIcon type="ui-sparkle" size={24} animated />
            <p className="pixel-text text-pixel-xs sm:text-pixel-sm text-amber-300 tracking-wider">
              The Final Boss has been defeated!
            </p>
            <PixelIcon type="ui-sparkle" size={24} animated />
          </div>
        </div>

        {/* Victorious sprite */}
        <div className="flex justify-center">
          <div className="relative pixel-panel rounded-lg p-4 sm:p-6 border-2 border-amber-500/50 bg-gradient-to-b from-amber-900/20 to-slate-900/50">
            <PixelSprite
              type={spriteType}
              state={spriteState}
              direction="right"
              scale={5}
              frame={0}
            />

            {/* Victory effects */}
            <div className="absolute -top-2 -right-2">
              <PixelIcon type="ui-star" size={24} className="animate-spin-slow" />
            </div>
            <div className="absolute -bottom-2 -left-2">
              <PixelIcon type="ui-star" size={24} className="animate-spin-slow" style={{ animationDelay: '0.5s' }} />
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
            {/* Class (with path) */}
            <div className="pixel-panel-dark rounded p-3 sm:col-span-2">
              <div className="pixel-text text-pixel-2xs sm:text-pixel-xs text-slate-400 mb-1">Class</div>
              <div className="pixel-text text-pixel-xs sm:text-pixel-sm text-amber-300 font-bold">
                {getPlayerDisplayName(player)}
              </div>
            </div>

            {/* Floor Cleared */}
            <div className="pixel-panel-dark rounded p-3">
              <div className="pixel-text text-pixel-2xs sm:text-pixel-xs text-slate-400 mb-1">Floors Cleared</div>
              <div className="pixel-text text-pixel-xs sm:text-pixel-sm text-green-400 font-bold">
                {FLOOR_CONFIG.MAX_FLOORS} / {FLOOR_CONFIG.MAX_FLOORS}
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
                <PixelIcon type="stat-gold" size={16} /> {player.gold}
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
                {player.equippedItems.map((item, idx) => {
                  const IconComponent = getIcon(item.icon, 'Package');
                  return (
                    <div
                      key={idx}
                      className="pixel-panel-dark rounded px-2 py-1 flex items-center gap-1"
                    >
                      <IconComponent className="w-4 h-4" aria-hidden="true" />
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
                  );
                })}
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
              "pixel-glow-gold",
              "flex items-center justify-center gap-2"
            )}
          >
            <PixelIcon type="ui-sparkle" size={16} />
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
          .animate-bounce-slow,
          .animate-confetti,
          .animate-firework,
          .animate-firework-trail {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
