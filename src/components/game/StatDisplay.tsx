import { Stats } from '@/types/game';

interface StatDisplayProps {
  stats: Stats;
  compact?: boolean;
}

export function StatDisplay({ stats, compact = false }: StatDisplayProps) {
  const statItems = [
    { label: 'PWR', value: stats.power, icon: '⚔️' },
    { label: 'ARM', value: stats.armor, icon: '🛡️' },
    { label: 'SPD', value: stats.speed, icon: '💨' },
    { label: 'FOR', value: stats.fortune, icon: '✨' },
  ];

  if (compact) {
    return (
      <div className="flex gap-3 text-pixel-sm">
        {statItems.map(stat => (
          <span key={stat.label} className="text-muted-foreground">
            {stat.icon} {stat.value}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {statItems.map(stat => (
        <div key={stat.label} className="flex items-center gap-2 bg-secondary/50 rounded px-2 py-1">
          <span>{stat.icon}</span>
          <span className="text-muted-foreground text-pixel-sm">{stat.label}</span>
          <span className="font-mono ml-auto">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
