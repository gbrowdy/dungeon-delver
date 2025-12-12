import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';

interface MainMenuProps {
  onStart: () => void;
}

export function MainMenu({ onStart }: MainMenuProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dark atmospheric background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-900/5 rounded-full blur-[120px]" />
      </div>

      {/* Pixel art torches (left side) */}
      <div className="absolute left-8 sm:left-16 top-1/4 pixel-torch" aria-hidden="true">
        <div className="torch-flame" />
        <div className="torch-stick" />
      </div>

      {/* Pixel art torches (right side) */}
      <div className="absolute right-8 sm:right-16 top-1/4 pixel-torch" aria-hidden="true">
        <div className="torch-flame" />
        <div className="torch-stick" />
      </div>

      {/* Pixel stars scattered in background */}
      <div className="pixel-stars" aria-hidden="true">
        <div className="pixel-star" style={{ top: '15%', left: '20%', animationDelay: '0s' }} />
        <div className="pixel-star" style={{ top: '25%', right: '15%', animationDelay: '0.5s' }} />
        <div className="pixel-star" style={{ top: '60%', left: '10%', animationDelay: '1s' }} />
        <div className="pixel-star" style={{ top: '70%', right: '25%', animationDelay: '1.5s' }} />
        <div className="pixel-star" style={{ top: '10%', left: '50%', animationDelay: '0.7s' }} />
        <div className="pixel-star" style={{ top: '80%', left: '60%', animationDelay: '1.2s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-3xl space-y-8 sm:space-y-12">
        {/* Pixel art dungeon entrance frame */}
        <div className="dungeon-frame mx-auto max-w-2xl">
          {/* Title section */}
          <div className="text-center space-y-6 sm:space-y-8 py-8 sm:py-12 px-4">
            {/* Title with pixel font style */}
            <h1 className="pixel-title text-xl sm:text-2xl md:text-3xl font-bold tracking-wider relative uppercase">
              <span className="pixel-glow bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Dungeon Delver
              </span>
            </h1>

            {/* Pixel divider */}
            <PixelDivider color="orange" />

            {/* Marketing taglines */}
            <div className="space-y-3 pt-2">
              <p className="pixel-text text-pixel-sm text-amber-200/90 tracking-widest uppercase leading-relaxed">
                Ten Floors. One Final Boss.
              </p>
              <p className="pixel-text text-pixel-xs text-slate-400 tracking-wide leading-relaxed">
                Choose your path. Master your abilities. Claim victory.
              </p>
            </div>

            {/* Simple class color indicators */}
            <div className="flex justify-center gap-3 sm:gap-4 pt-4" aria-hidden="true">
              <div className="pixel-class-dot bg-red-500" title="Warrior" />
              <div className="pixel-class-dot bg-violet-500" title="Mage" />
              <div className="pixel-class-dot bg-green-500" title="Rogue" />
              <div className="pixel-class-dot bg-amber-500" title="Paladin" />
            </div>

            {/* CTA Button */}
            <div className="pt-6 sm:pt-8">
              <Button
                onClick={onStart}
                size="lg"
                className="pixel-button-main text-pixel-sm px-8 sm:px-12 py-4 sm:py-5 bg-orange-600 hover:bg-orange-500 transition-colors duration-150 border-b-4 border-orange-800 hover:border-orange-700 active:border-b-2 active:translate-y-[2px] relative uppercase font-bold"
              >
                <span className="relative">Start Game</span>
              </Button>
            </div>

            {/* Version/credit line */}
            <p className="pixel-text text-pixel-xs text-slate-600 tracking-wider pt-4">
              An 8-bit Adventure Awaits
            </p>
          </div>
        </div>
      </div>

      {/* Bottom decorative accent */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-1 bg-gradient-to-r from-transparent via-orange-700/40 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
      </div>

      {/* CSS for pixel art effects */}
      <style jsx>{`
        /* Pixel art torch */
        .pixel-torch {
          position: absolute;
          width: 8px;
          height: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        /* Animated flame using box-shadow pixel art */
        .torch-flame {
          width: 8px;
          height: 12px;
          background: #ff6b00;
          box-shadow:
            0 -4px 0 0 #ffaa00,
            0 -8px 0 0 #ffdd00,
            4px -4px 0 0 #ff8800,
            -4px -4px 0 0 #ff8800;
          animation: flicker 1.5s infinite;
          image-rendering: pixelated;
        }

        @keyframes flicker {
          0%, 100% {
            box-shadow:
              0 -4px 0 0 #ffaa00,
              0 -8px 0 0 #ffdd00,
              4px -4px 0 0 #ff8800,
              -4px -4px 0 0 #ff8800;
            opacity: 1;
          }
          25% {
            box-shadow:
              0 -4px 0 0 #ffaa00,
              0 -8px 0 0 #ffdd00,
              4px -4px 0 0 #ff8800;
            opacity: 0.9;
          }
          50% {
            box-shadow:
              0 -4px 0 0 #ffaa00,
              4px -4px 0 0 #ff8800,
              -4px -4px 0 0 #ff8800;
            opacity: 1;
          }
          75% {
            box-shadow:
              0 -4px 0 0 #ffaa00,
              0 -8px 0 0 #ffdd00,
              -4px -4px 0 0 #ff8800;
            opacity: 0.95;
          }
        }

        /* Torch stick */
        .torch-stick {
          width: 4px;
          height: 20px;
          background: #654321;
          box-shadow:
            0 4px 0 0 #4a3216,
            0 8px 0 0 #4a3216;
        }

        /* Pixel stars with twinkle effect */
        .pixel-stars {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .pixel-star {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #ffd700;
          box-shadow:
            4px 0 0 0 #ffd700,
            -4px 0 0 0 #ffd700,
            0 4px 0 0 #ffd700,
            0 -4px 0 0 #ffd700;
          animation: twinkle 3s infinite;
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        /* Dungeon frame with pixel corners */
        .dungeon-frame {
          position: relative;
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%);
          border: 2px solid rgba(203, 166, 247, 0.2);
          border-radius: 8px;
          backdrop-filter: blur(4px);
        }

        .dungeon-frame::before,
        .dungeon-frame::after {
          content: '';
          position: absolute;
          width: 12px;
          height: 12px;
          background: #8b5cf6;
          box-shadow:
            0 0 0 2px rgba(139, 92, 246, 0.3),
            0 0 12px rgba(139, 92, 246, 0.5);
        }

        .dungeon-frame::before {
          top: -6px;
          left: -6px;
        }

        .dungeon-frame::after {
          top: -6px;
          right: -6px;
        }

        /* Bottom pixel corners */
        .dungeon-frame {
          --corner-size: 12px;
        }

        .dungeon-frame::before {
          top: calc(var(--corner-size) * -0.5);
          left: calc(var(--corner-size) * -0.5);
        }

        .dungeon-frame::after {
          top: calc(var(--corner-size) * -0.5);
          right: calc(var(--corner-size) * -0.5);
        }

        /* Create bottom corners using a wrapper effect */
        @media (min-width: 640px) {
          .torch-flame {
            width: 10px;
            height: 14px;
          }
          .torch-stick {
            width: 5px;
            height: 24px;
          }
          .pixel-star {
            width: 5px;
            height: 5px;
            box-shadow:
              5px 0 0 0 #ffd700,
              -5px 0 0 0 #ffd700,
              0 5px 0 0 #ffd700,
              0 -5px 0 0 #ffd700;
          }
        }

        /* Pixel glow effect for title */
        .pixel-glow {
          filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.6))
                  drop-shadow(0 0 20px rgba(251, 146, 60, 0.3));
        }

        /* Pixel-style title text */
        .pixel-title {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          text-shadow:
            3px 3px 0 #1a1a2e,
            -1px -1px 0 #1a1a2e,
            1px -1px 0 #1a1a2e,
            -1px 1px 0 #1a1a2e;
          letter-spacing: 0.05em;
        }

        /* Pixel-style body text */
        .pixel-text {
          font-family: 'Press Start 2P', 'Courier New', monospace;
        }

        /* Simple class color dots */
        .pixel-class-dot {
          width: 12px;
          height: 12px;
          box-shadow:
            inset -2px -2px 0 rgba(0,0,0,0.3),
            inset 2px 2px 0 rgba(255,255,255,0.3);
        }

        /* Button pixel style */
        .pixel-button-main {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          image-rendering: pixelated;
          box-shadow:
            inset -2px -2px 0 rgba(0,0,0,0.3),
            inset 2px 2px 0 rgba(255,255,255,0.2);
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .torch-flame,
          .pixel-star,
          [class*="animate-pulse"] {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
