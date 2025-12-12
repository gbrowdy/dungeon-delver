import { Button } from '@/components/ui/button';
import { LEVEL_UP_BONUSES } from '@/constants/game';

interface LevelUpPopupProps {
  newLevel: number;
  onContinue: () => void;
}

export function LevelUpPopup({ newLevel, onContinue }: LevelUpPopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-300 p-2 sm:p-4">
      <div className="pixel-panel border-2 border-gold rounded-lg p-4 sm:p-6 max-w-sm w-full shadow-2xl shadow-gold/20 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-5xl mb-3 animate-bounce">🎉</div>
          <h2 className="pixel-title text-base sm:text-lg md:text-xl font-bold tracking-wider uppercase">
            <span className="pixel-glow-gold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              LEVEL UP!
            </span>
          </h2>

          {/* Pixel divider */}
          <div className="flex justify-center items-center gap-2 pt-3" aria-hidden="true">
            <div className="pixel-diamond bg-gold" />
            <div className="w-12 sm:w-16 h-[2px] bg-gradient-to-r from-gold/80 to-transparent" />
            <div className="pixel-diamond bg-amber-400" />
            <div className="w-12 sm:w-16 h-[2px] bg-gradient-to-l from-gold/80 to-transparent" />
            <div className="pixel-diamond bg-gold" />
          </div>

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
