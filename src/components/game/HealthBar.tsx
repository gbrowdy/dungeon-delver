import { cn } from '@/lib/utils';

interface HealthBarProps {
  current: number;
  max: number;
  label: string;
  variant?: 'health' | 'xp';
  showValues?: boolean;
  className?: string;
  testId?: string;
}

export function HealthBar({
  current,
  max,
  label,
  variant = 'health',
  showValues = true,
  className,
  testId
}: HealthBarProps) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));

  const barColors = {
    health: 'bg-health',
    xp: 'bg-xp',
  };

  const bgColors = {
    health: 'bg-health/20',
    xp: 'bg-xp/20',
  };

  const isLow = variant === 'health' && percentage < 25;

  return (
    <div data-testid={testId} className={cn('space-y-1', className)}>
      <div className="flex justify-between text-pixel-sm">
        <span className="text-muted-foreground">{label}</span>
        {showValues && (
          <span className="font-mono text-foreground">{Math.floor(current)}/{max}</span>
        )}
      </div>
      <div className={cn(
        'pixel-progress-bar h-4 rounded-sm overflow-hidden relative',
        bgColors[variant],
        isLow && 'animate-pulse shadow-[0_0_8px_theme(colors.red.500),0_0_16px_theme(colors.red.500/0.3)]',
      )}>
        <div
          className={cn(
            'pixel-progress-fill h-full transition-all duration-300',
            barColors[variant],
            isLow && 'bg-red-500',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
