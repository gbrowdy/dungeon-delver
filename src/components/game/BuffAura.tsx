import { cn } from '@/lib/utils';
import type { ActiveBuff } from '@/types/game';

interface BuffAuraProps {
  buffs: ActiveBuff[];
  className?: string;
}

// Determine aura color based on active buffs
function getAuraColor(buffs: ActiveBuff[]): string {
  const hasPower = buffs.some(b => b.stat === 'power');
  const hasSpeed = buffs.some(b => b.stat === 'speed');

  if (hasPower && hasSpeed) return 'rgba(251, 146, 60, 0.5)'; // orange blend
  if (hasPower) return 'rgba(239, 68, 68, 0.5)'; // red
  if (hasSpeed) return 'rgba(250, 204, 21, 0.5)'; // yellow
  return 'rgba(34, 197, 94, 0.4)'; // green default
}

export function BuffAura({ buffs, className }: BuffAuraProps) {
  if (buffs.length === 0) return null;

  const color = getAuraColor(buffs);

  return (
    <div
      className={cn(
        'absolute inset-0 rounded-full pointer-events-none z-0 animate-buff-aura',
        className
      )}
      style={{
        boxShadow: `0 0 20px 10px ${color}, inset 0 0 15px 5px ${color}`,
      }}
    />
  );
}
