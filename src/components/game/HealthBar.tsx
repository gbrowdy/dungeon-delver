import { cn } from '@/lib/utils';

interface HealthBarProps {
  current: number;
  max: number;
  label: string;
  variant?: 'health' | 'mana' | 'xp';
  showValues?: boolean;
  className?: string;
}

export function HealthBar({ 
  current, 
  max, 
  label, 
  variant = 'health', 
  showValues = true,
  className 
}: HealthBarProps) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  const barColors = {
    health: 'bg-health',
    mana: 'bg-mana',
    xp: 'bg-xp',
  };

  const bgColors = {
    health: 'bg-health/20',
    mana: 'bg-mana/20',
    xp: 'bg-xp/20',
  };
  
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-pixel-sm">
        <span className="text-muted-foreground">{label}</span>
        {showValues && (
          <span className="font-mono text-foreground">{current}/{max}</span>
        )}
      </div>
      <div className={cn('h-3 rounded-full overflow-hidden', bgColors[variant])}>
        <div 
          className={cn('h-full transition-all duration-300 rounded-full', barColors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
