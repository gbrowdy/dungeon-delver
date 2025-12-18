import { Button } from '@/components/ui/button';
import { LEVEL_UP_BONUSES } from '@/constants/game';
import { PixelDivider } from '@/components/ui/PixelDivider';

interface LevelUpPopupProps {
  newLevel: number;
  onContinue: () => void;
}

export function LevelUpPopup({ newLevel, onContinue }: LevelUpPopupProps) {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-300 p-2 sm:p-4">
      <div className="pixel-panel border-2 border-gold rounded-lg p-4 sm:p-6 max-w-sm w-full shadow-2xl shadow-gold/20 animate-in zoom-in-95 duration-300 relative overflow-hidden">
        {/* Pixel art burst effects */}
        {!prefersReducedMotion && (
          <>
            {/* Radial golden rays behind text */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full animate-levelup-rays">
                {/* 8 rays emanating from center */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <line
                    key={angle}
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="10"
                    stroke="#ffd700"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.8"
                    style={{ transformOrigin: '50px 50px', transform: `rotate(${angle}deg)` }}
                  />
                ))}
                {/* Additional accent rays */}
                {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
                  <line
                    key={angle}
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="20"
                    stroke="#fbbf24"
                    strokeWidth="1"
                    strokeLinecap="round"
                    opacity="0.6"
                    style={{ transformOrigin: '50px 50px', transform: `rotate(${angle}deg)` }}
                  />
                ))}
              </svg>
            </div>

            {/* Expanding ring effect */}
            <div className="absolute top-1/4 left-1/2 w-32 h-32 pointer-events-none">
              <div className="w-full h-full rounded-full border-4 border-gold/40 animate-levelup-ring" />
            </div>

            {/* Rising sparkle particles */}
            {[...Array(8)].map((_, i) => {
              const angle = (i * 45) + 22.5; // Offset from rays
              const radius = 30 + (i % 2) * 10; // Vary distance
              const x = 50 + Math.cos((angle * Math.PI) / 180) * radius;
              const y = 25 + Math.sin((angle * Math.PI) / 180) * radius;
              const delay = i * 0.08; // Stagger sparkles

              return (
                <div
                  key={i}
                  className="absolute w-2 h-2 pointer-events-none animate-levelup-sparkle"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    animationDelay: `${delay}s`,
                  }}
                >
                  {/* Pixel star shape */}
                  <div className="relative w-2 h-2">
                    <div className="absolute inset-0 bg-gold" />
                    <div className="absolute -left-1 top-0 w-1 h-2 bg-gold/80" />
                    <div className="absolute -right-1 top-0 w-1 h-2 bg-gold/80" />
                    <div className="absolute left-0 -top-1 w-2 h-1 bg-gold/80" />
                    <div className="absolute left-0 -bottom-1 w-2 h-1 bg-gold/80" />
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Header */}
        <div className="text-center mb-5 relative z-10">
          <h2 className="pixel-title text-base sm:text-lg md:text-xl font-bold tracking-wider uppercase mb-3">
            <span className="pixel-glow-gold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              LEVEL UP!
            </span>
          </h2>

          {/* Pixel divider */}
          <PixelDivider color="amber" className="pt-3" />

          <p className="pixel-text text-lg sm:text-xl font-bold text-white mt-3">
            Level {newLevel}
          </p>
        </div>

        {/* Stat Gains */}
        <div className="pixel-panel-dark rounded-lg p-4 mb-5">
          <h3 className="pixel-text text-pixel-sm font-medium text-gold mb-3 text-center">
            Stats Increased
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <StatGain icon="❤️" label="Max HP" value={`+${LEVEL_UP_BONUSES.MAX_HEALTH}`} />
            <StatGain icon="⚔️" label="Power" value={`+${LEVEL_UP_BONUSES.POWER}`} />
            <StatGain icon="💧" label="Max Mana" value={`+${LEVEL_UP_BONUSES.MAX_MANA}`} />
          </div>
        </div>

        {/* Continue Button */}
        <Button
          onClick={onContinue}
          className="w-full pixel-button text-pixel-sm py-3 bg-gold hover:bg-gold/90 text-black font-bold uppercase"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function StatGain({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 pixel-panel-dark rounded px-3 py-2 border border-slate-700/50">
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <div className="pixel-text text-pixel-xs text-slate-400">{label}</div>
        <div className="pixel-text text-pixel-sm font-bold text-success">{value}</div>
      </div>
    </div>
  );
}
