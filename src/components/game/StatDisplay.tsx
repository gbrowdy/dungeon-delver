import { Stats } from '@/types/game';
import { PixelIcon, IconType } from '@/components/ui/PixelIcon';

interface StatDisplayProps {
  stats: Stats;
  compact?: boolean;
}

export function StatDisplay({ stats, compact = false }: StatDisplayProps) {
  const statItems: { label: string; value: number; icon: IconType }[] = [
    { label: 'PWR', value: stats.power, icon: 'stat-power' },
    { label: 'ARM', value: stats.armor, icon: 'stat-armor' },
    { label: 'SPD', value: stats.speed, icon: 'stat-speed' },
    { label: 'FOR', value: stats.fortune, icon: 'stat-fortune' },
  ];

  if (compact) {
    return (
      <div className="flex gap-3 text-pixel-sm">
        {statItems.map(stat => (
          <span key={stat.label} className="text-muted-foreground flex items-center gap-1">
            <PixelIcon type={stat.icon} size={16} /> {stat.value}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {statItems.map(stat => (
        <div key={stat.label} className="flex items-center gap-2 bg-secondary/50 rounded px-2 py-1">
          <PixelIcon type={stat.icon} size={16} />
          <span className="text-muted-foreground text-pixel-sm">{stat.label}</span>
          <span className="font-mono ml-auto">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
