import { cn } from '@/lib/utils';

interface PowerImpactEffectProps {
  powerId: string;
  className?: string;
}

// Map power IDs to visual effect types
const POWER_EFFECTS: Record<string, { type: 'fire' | 'shockwave' | 'slash'; color: string }> = {
  'rage-strike': { type: 'fire', color: '#ef4444' },      // red-500
  'savage-slam': { type: 'shockwave', color: '#fbbf24' }, // amber-400
  'reckless-charge': { type: 'slash', color: '#f97316' }, // orange-500
};

export function PowerImpactEffect({ powerId, className }: PowerImpactEffectProps) {
  const effect = POWER_EFFECTS[powerId] || { type: 'fire', color: '#ef4444' };

  return (
    <div className={cn('absolute inset-0 pointer-events-none z-40', className)}>
      {effect.type === 'fire' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-24 h-24 rounded-full animate-power-burst opacity-80"
            style={{
              background: `radial-gradient(circle, ${effect.color} 0%, transparent 70%)`,
            }}
          />
        </div>
      )}
      {effect.type === 'shockwave' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-32 h-32 rounded-full border-4 animate-shockwave opacity-80"
            style={{ borderColor: effect.color }}
          />
        </div>
      )}
      {effect.type === 'slash' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-20 h-4 animate-slash-trail opacity-80"
            style={{ background: `linear-gradient(90deg, transparent, ${effect.color}, transparent)` }}
          />
        </div>
      )}
    </div>
  );
}
