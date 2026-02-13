import type { StatType } from '@/types/game';

const STAT_ICONS: Record<StatType, { symbol: string; color: string }> = {
  power: { symbol: '/', color: 'text-red-400' },
  fortitude: { symbol: '#', color: 'text-blue-400' },
  speed: { symbol: '>', color: 'text-yellow-400' },
  luck: { symbol: '*', color: 'text-purple-400' },
};

const STAT_LABELS: Record<StatType, string> = {
  power: 'Power',
  fortitude: 'Fortitude',
  speed: 'Speed',
  luck: 'Luck',
};

export function StatIcon({ stat, size = 'md' }: { stat: StatType; size?: 'sm' | 'md' | 'lg' }) {
  const { symbol, color } = STAT_ICONS[stat];
  const sizeClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <span className={`${color} ${sizeClass} font-bold pixel-text`} aria-label={STAT_LABELS[stat]}>
      {symbol}
    </span>
  );
}

export { STAT_LABELS };
