import { cn } from '@/lib/utils';

interface AttackBarProps {
  attackTimer: number;   // ms remaining until next attack
  attackInterval: number; // total ms between attacks
  className?: string;
}

export function AttackBar({ attackTimer, attackInterval, className }: AttackBarProps) {
  // Timer counts down from interval to 0. Fill = how much has elapsed.
  const elapsed = Math.max(0, attackInterval - attackTimer);
  const fillPercent = Math.min(100, Math.max(0, (elapsed / attackInterval) * 100));

  // Color shifts: blue (0-50%) → yellow (50-80%) → white (80-100%)
  const getBarColor = () => {
    if (fillPercent >= 80) return 'bg-white';
    if (fillPercent >= 50) return 'bg-yellow-400';
    return 'bg-blue-400';
  };

  return (
    <div className={cn('h-1.5 bg-slate-800 rounded-full overflow-hidden', className)}>
      <div
        data-testid="attack-bar-fill"
        className={cn('h-full rounded-full transition-colors duration-100', getBarColor())}
        style={{ width: `${fillPercent}%` }}
      />
    </div>
  );
}
