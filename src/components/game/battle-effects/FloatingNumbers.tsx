import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Floating damage number that rises and fades
export interface DamageNumberProps {
  value: number;
  x: number;
  y: number;
  isCrit?: boolean;
  isHeal?: boolean;
  isMiss?: boolean;
  onComplete?: () => void;
}

export function DamageNumber({
  value,
  x,
  y,
  isCrit = false,
  isHeal = false,
  isMiss = false,
  onComplete,
}: DamageNumberProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  // Miss text styling
  if (isMiss) {
    return (
      <div
        className="absolute pointer-events-none font-bold text-pixel-lg animate-damage-float text-slate-400 italic"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
          textShadow: '2px 2px 0 black, -1px -1px 0 black',
        }}
      >
        MISS
      </div>
    );
  }

  return (
    <div
      className={cn(
        'absolute pointer-events-none font-bold text-pixel-lg animate-damage-float',
        isHeal ? 'text-success' : 'text-health',
        isCrit && 'text-pixel-xl text-warning'
      )}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        textShadow: '2px 2px 0 black, -1px -1px 0 black',
      }}
    >
      {isCrit && <span className="text-warning">CRIT! </span>}
      {isHeal ? '+' : '-'}{value}
    </div>
  );
}
