import { Stats } from '@/types/game';
import { getIcon, STAT_ICONS } from '@/lib/icons';

interface StatDisplayProps {
  stats: Stats;
  compact?: boolean;
}

export function StatDisplay({ stats, compact = false }: StatDisplayProps) {
  const statItems = [
    { label: 'PWR', value: stats.power, iconName: STAT_ICONS.POWER, color: 'text-amber-400' },
    { label: 'ARM', value: stats.armor, iconName: STAT_ICONS.ARMOR, color: 'text-sky-400' },
    { label: 'SPD', value: stats.speed, iconName: STAT_ICONS.SPEED, color: 'text-emerald-400' },
    { label: 'FOR', value: stats.fortune, iconName: STAT_ICONS.FORTUNE, color: 'text-purple-400' },
  ];

  if (compact) {
    return (
      <div className="flex gap-3 text-pixel-sm">
        {statItems.map(stat => {
          const IconComponent = getIcon(stat.iconName);
          return (
            <span key={stat.label} className="text-muted-foreground flex items-center gap-1">
              <IconComponent className={`w-5 h-5 ${stat.color}`} /> {stat.value}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {statItems.map(stat => {
        const IconComponent = getIcon(stat.iconName);
        return (
          <div key={stat.label} className="flex items-center gap-2 bg-secondary/50 rounded px-2 py-1">
            <IconComponent className={`w-5 h-5 ${stat.color}`} />
            <span className="text-muted-foreground text-pixel-sm">{stat.label}</span>
            <span className="font-mono ml-auto">{stat.value}</span>
          </div>
        );
      })}
    </div>
  );
}
