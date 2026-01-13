import { cn } from '@/lib/utils';

// Pixel art shield effect - defensive visual
export interface PixelShieldProps {
  active: boolean;
  variant?: 'block' | 'buff' | 'holy';
}

export function PixelShield({ active, variant = 'block' }: PixelShieldProps) {
  if (!active) return null;

  const colors = {
    block: { primary: '#4488ff', secondary: '#66aaff', tertiary: '#88ccff', glow: '#2266dd' },
    buff: { primary: '#44ff88', secondary: '#66ffaa', tertiary: '#88ffcc', glow: '#22dd66' },
    holy: { primary: '#ffdd44', secondary: '#ffee66', tertiary: '#ffff88', glow: '#ddaa22' },
  };

  const c = colors[variant];

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
      <div className="relative animate-shield-appear">
        {/* Main shield body - pixel art style */}
        <svg
          width="70"
          height="80"
          viewBox="0 0 70 80"
          className="animate-shield-pulse drop-shadow-lg"
          style={{ filter: `drop-shadow(0 0 10px ${c.glow})` }}
        >
          {/* Shield outline */}
          <path
            d="M35 5 L60 15 L60 40 Q60 65 35 75 Q10 65 10 40 L10 15 Z"
            fill="none"
            stroke={c.primary}
            strokeWidth="4"
            className="animate-shield-outline"
          />
          {/* Shield fill with gradient effect */}
          <path
            d="M35 8 L57 17 L57 40 Q57 62 35 72 Q13 62 13 40 L13 17 Z"
            fill={`${c.primary}40`}
            stroke={c.secondary}
            strokeWidth="2"
          />
          {/* Inner highlight */}
          <path
            d="M35 15 L50 22 L50 38 Q50 52 35 60 Q20 52 20 38 L20 22 Z"
            fill={`${c.tertiary}30`}
            stroke={c.tertiary}
            strokeWidth="1"
          />
          {/* Cross/emblem in center */}
          <rect x="32" y="28" width="6" height="20" fill={c.tertiary} rx="1" />
          <rect x="25" y="35" width="20" height="6" fill={c.tertiary} rx="1" />
          {/* Shine effect */}
          <ellipse cx="25" cy="25" rx="5" ry="8" fill={`${c.tertiary}60`} />
        </svg>

        {/* Particle effects around shield */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-shield-particle"
            style={{
              left: '50%',
              top: '50%',
              width: 4,
              height: 4,
              backgroundColor: c.secondary,
              borderRadius: '50%',
              boxShadow: `0 0 6px ${c.primary}`,
              transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateY(-45px)`,
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Screen shake wrapper
export interface ScreenShakeProps {
  active: boolean;
  intensity?: 'light' | 'medium' | 'heavy';
  children: React.ReactNode;
}

export function ScreenShake({
  active,
  intensity = 'medium',
  children,
}: ScreenShakeProps) {
  const shakeClass = {
    light: 'animate-shake-light',
    medium: 'animate-shake-medium',
    heavy: 'animate-shake-heavy',
  };

  return (
    <div className={cn(active && shakeClass[intensity])}>
      {children}
    </div>
  );
}

// Hit flash overlay
export interface HitFlashProps {
  active: boolean;
  color?: 'red' | 'white';
}

export function HitFlash({ active, color = 'red' }: HitFlashProps) {
  if (!active) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none animate-flash',
        color === 'red' ? 'bg-health/30' : 'bg-white/50'
      )}
    />
  );
}
