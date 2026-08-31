import { cn } from '@/lib/utils';
import { ENRAGE_THRESHOLD_MS } from '@/math/balance';

interface EnrageBarProps {
  combatElapsed: number;
  className?: string;
}

export function EnrageBar({ combatElapsed, className }: EnrageBarProps) {
  const progress = Math.min(1, combatElapsed / ENRAGE_THRESHOLD_MS);
  const isEnraged = combatElapsed >= ENRAGE_THRESHOLD_MS;

  const getBarColor = () => {
    if (isEnraged) return 'bg-red-500 animate-pulse';
    if (combatElapsed >= 40000) return 'bg-orange-500';
    if (combatElapsed >= 30000) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Don't show until 10s into combat (avoids clutter on quick fights)
  if (combatElapsed < 10000) return null;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-2">
        <div className="pixel-progress-bar flex-1 h-1.5 rounded-sm overflow-hidden">
          <div
            className={cn('h-full transition-colors duration-300', getBarColor())}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {isEnraged && (
          <span className="pixel-text text-pixel-xs text-red-400 uppercase animate-pulse">
            Enraged
          </span>
        )}
      </div>
    </div>
  );
}
