import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import { useGameStore } from '@/store/gameStore';

export function MainMenu() {
  const handleStart = () => {
    useGameStore.setState({ phase: 'class-select' });
  };
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
                Descend into the darkness.
              </p>
              <p className="pixel-text text-pixel-xs text-slate-400 tracking-wide leading-relaxed">
                Choose your path. Master your abilities. Survive.
              </p>
            </div>

            {/* Simple class color indicators */}
            <div className="flex justify-center gap-3 sm:gap-4 pt-4" aria-hidden="true">
              <div className="pixel-class-dot bg-red-500" title="Warrior" />
              <div className="pixel-class-dot bg-violet-500" title="Mage" />
              <div className="pixel-class-dot bg-green-500" title="Rogue" />
            </div>

            {/* CTA Button */}
            <div className="pt-6 sm:pt-8">
              <Button
                onClick={handleStart}
                size="lg"
                className="pixel-button-main text-pixel-sm px-8 sm:px-12 py-4 sm:py-5 bg-orange-600 hover:bg-orange-500 transition-colors duration-150 border-b-4 border-orange-800 hover:border-orange-700 active:border-b-2 active:translate-y-[2px] relative uppercase font-bold"
              >
                <span className="relative">Start Game</span>
              </Button>
            </div>

            {/* Version/credit line */}
            <p className="pixel-text text-pixel-xs text-slate-400 tracking-wider pt-4">
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

    </div>
  );
}
