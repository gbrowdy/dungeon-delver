import { Stats } from '@/types/game';
import * as Icons from 'lucide-react';
import { STAT_ICONS } from '@/constants/icons';

interface StatDisplayProps {
  stats: Stats;
  compact?: boolean;
}

type LucideIconName = keyof typeof Icons;

export function StatDisplay({ stats, compact = false }: StatDisplayProps) {
  const statItems: { label: string; value: number; icon: LucideIconName; color: string }[] = [
    { label: 'PWR', value: stats.power, icon: STAT_ICONS.POWER as LucideIconName, color: 'text-amber-400' },
    { label: 'ARM', value: stats.armor, icon: STAT_ICONS.ARMOR as LucideIconName, color: 'text-sky-400' },
    { label: 'SPD', value: stats.speed, icon: STAT_ICONS.SPEED as LucideIconName, color: 'text-emerald-400' },
    { label: 'FOR', value: stats.fortune, icon: STAT_ICONS.FORTUNE as LucideIconName, color: 'text-purple-400' },
  ];

  if (compact) {
    return (
      <div className="flex gap-3 text-pixel-sm">
        {statItems.map(stat => {
          const IconComponent = Icons[stat.icon] as React.ComponentType<{ className?: string }>;
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
        const IconComponent = Icons[stat.icon] as React.ComponentType<{ className?: string }>;
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
