import { useState } from 'react';
import type { PlayerSnapshot } from '@/ecs/snapshot';
import { Button } from '@/components/ui/button';
import { PixelSprite } from './PixelSprite';
import { cn } from '@/lib/utils';
import { PixelIcon } from '@/components/ui/PixelIcon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeathScreenProps {
  player: PlayerSnapshot;
  currentFloor: number;
  onRetry: () => void;
  onAbandon: () => void;
  onVisitShop: () => void;
}

export function DeathScreen({ player, currentFloor, onRetry, onAbandon, onVisitShop }: DeathScreenProps) {
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  return (
    <div data-testid="death-screen" className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dark atmospheric background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Pixel stars scattered in background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="pixel-star" style={{ top: '10%', left: '15%', animationDelay: '0s' }} />
        <div className="pixel-star" style={{ top: '25%', right: '10%', animationDelay: '0.5s' }} />
        <div className="pixel-star" style={{ top: '60%', left: '8%', animationDelay: '1s' }} />
        <div className="pixel-star" style={{ top: '75%', right: '20%', animationDelay: '1.5s' }} />
        <div className="pixel-star" style={{ top: '5%', left: '45%', animationDelay: '0.7s' }} />
        <div className="pixel-star" style={{ top: '85%', left: '55%', animationDelay: '1.2s' }} />
      </div>

      <div className="relative z-10 max-w-2xl w-full space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <PixelIcon type="ui-skull" size={48} className="skull-gradient" />
            <h1 className="pixel-title text-lg sm:text-xl md:text-2xl font-bold tracking-wider uppercase">
              <span className="pixel-glow-red bg-gradient-to-r from-red-300 via-red-400 to-orange-400 bg-clip-text text-transparent">
                DEFEATED
              </span>
            </h1>
            <PixelIcon type="ui-skull" size={48} className="skull-gradient" />
          </div>

          <p data-testid="death-floor-display" className="pixel-text text-pixel-xs sm:text-pixel-sm text-slate-400 tracking-wider">
            Floor {currentFloor}
          </p>

          {/* Gold display */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <PixelIcon type="stat-gold" size={32} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
            <span className="pixel-text text-pixel-base sm:text-pixel-lg text-amber-400 font-bold">
              Gold: {player.gold}
            </span>
          </div>
        </div>

        {/* Defeated sprite */}
        <div className="flex justify-center">
          <div className="relative pixel-panel-dark rounded-lg p-4 sm:p-6">
            <PixelSprite
              type={player.path?.pathId || player.characterClass}
              state="idle"
              direction="right"
              scale={5}
              frame={0}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Visit Shop Button - Prominent */}
          <div className="flex justify-center">
            <Button
              onClick={onVisitShop}
              size="lg"
              className={cn(
                'pixel-button text-pixel-sm px-8 sm:px-12 py-3 sm:py-4',
                'transition-all duration-150 uppercase font-bold',
                'bg-amber-600 hover:bg-amber-500 border-b-4 border-amber-800 hover:border-amber-700',
                'active:border-b-2 active:translate-y-[2px]',
                'flex items-center gap-2'
              )}
            >
              <PixelIcon type="ui-hammer" size={24} />
              Visit Shop
            </Button>
          </div>

          {/* Retry and Abandon Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              data-testid="retry-button"
              onClick={onRetry}
              size="lg"
              className={cn(
                'pixel-button text-pixel-xs px-6 sm:px-8 py-3',
                'transition-all duration-150 uppercase font-bold',
                'bg-orange-600 hover:bg-orange-500 border-b-4 border-orange-800 hover:border-orange-700',
                'active:border-b-2 active:translate-y-[2px]'
              )}
            >
              Retry Floor {currentFloor}
            </Button>
            <Button
              onClick={() => setShowAbandonConfirm(true)}
              variant="outline"
              size="lg"
              className="pixel-button text-pixel-xs px-6 sm:px-8 py-3 border-slate-600 hover:bg-slate-800 uppercase"
            >
              Abandon Run
            </Button>
          </div>
        </div>

        {/* Abandon Confirmation Dialog */}
        <AlertDialog open={showAbandonConfirm} onOpenChange={setShowAbandonConfirm}>
          <AlertDialogContent className="pixel-panel border-2 border-red-500/50">
            <AlertDialogHeader>
              <AlertDialogTitle className="pixel-text text-pixel-xs text-red-400">Abandon Run?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p className="pixel-text text-pixel-2xs text-slate-400">
                    This will permanently abandon your current progress:
                  </p>
                  <ul className="space-y-1 pixel-text text-pixel-2xs text-slate-300">
                    <li>Level {player.level} {player.characterClass}</li>
                    <li>Floor {currentFloor}</li>
                    <li className="text-gold">{player.gold} gold</li>
                    <li>{player.powers.length} powers learned</li>
                    {[player.equipment.weapon, player.equipment.armor, player.equipment.accessory].filter(Boolean).length > 0 && (
                      <li>{[player.equipment.weapon, player.equipment.armor, player.equipment.accessory].filter(Boolean).length} equipped items</li>
                    )}
                  </ul>
                  <p className="pixel-text text-pixel-2xs text-red-400 pt-2">
                    You will start fresh from the beginning.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="pixel-button text-pixel-2xs">Keep Playing</AlertDialogCancel>
              <AlertDialogAction
                onClick={onAbandon}
                className="pixel-button text-pixel-2xs bg-red-600 hover:bg-red-500"
              >
                Abandon Run
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Bottom decorative accent */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-1 bg-gradient-to-r from-transparent via-red-700/40 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
      </div>

      {/* Inline styles for pixel effects */}
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

        .pixel-glow-red {
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))
                  drop-shadow(0 0 20px rgba(239, 68, 68, 0.3));
        }

        .skull-gradient {
          color: rgba(15, 23, 42, 0.9);
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))
                  drop-shadow(0 0 20px rgba(239, 68, 68, 0.3));
        }

        .pixel-text {
          font-family: 'Press Start 2P', 'Courier New', monospace;
        }

        .pixel-panel-dark {
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
          image-rendering: pixelated;
          box-shadow:
            inset -2px -2px 0 rgba(0, 0, 0, 0.4),
            inset 2px 2px 0 rgba(255, 255, 255, 0.05);
        }

        .pixel-button {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          image-rendering: pixelated;
          box-shadow:
            inset -2px -2px 0 rgba(0, 0, 0, 0.3),
            inset 2px 2px 0 rgba(255, 255, 255, 0.2);
        }

        .pixel-star {
          position: absolute;
          width: 3px;
          height: 3px;
          background: white;
          box-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
          animation: twinkle 2s infinite;
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        .text-pixel-2xs { font-size: 0.5rem; line-height: 1.2; }
        .text-pixel-xs { font-size: 0.625rem; line-height: 1.3; }
        .text-pixel-sm { font-size: 0.75rem; line-height: 1.4; }
        .text-pixel-base { font-size: 0.875rem; line-height: 1.5; }
        .text-pixel-lg { font-size: 1rem; line-height: 1.5; }
      `}</style>
    </div>
  );
}
