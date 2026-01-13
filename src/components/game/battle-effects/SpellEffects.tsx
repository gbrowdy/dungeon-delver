import { useEffect, useState } from 'react';

// Pixel art spell effect - 8-bit style projectiles and effects
export interface PixelSpellProps {
  powerId: string;
  direction: 'left' | 'right';
}

export function PixelSpell({ powerId, direction }: PixelSpellProps) {
  // Map power IDs to spell types
  const spellConfig: Record<string, { colors: string[]; shape: 'fireball' | 'lightning' | 'ice' | 'poison' | 'holy' | 'dark' | 'earth' | 'buff' }> = {
    'fireball': { colors: ['#ff4400', '#ff8800', '#ffcc00'], shape: 'fireball' },
    'berserker-rage': { colors: ['#ff0000', '#ff4444', '#ff8888'], shape: 'buff' },
    'lightning-bolt': { colors: ['#ffff00', '#ffffff', '#88ccff'], shape: 'lightning' },
    'ice-shard': { colors: ['#00ccff', '#88eeff', '#ffffff'], shape: 'ice' },
    'poison-cloud': { colors: ['#00ff00', '#88ff00', '#ccff00'], shape: 'poison' },
    'divine-heal': { colors: ['#ffff88', '#ffffff', '#ffffcc'], shape: 'holy' },
    'shadow-strike': { colors: ['#440066', '#880088', '#cc00cc'], shape: 'dark' },
    'vampiric-touch': { colors: ['#880000', '#cc0000', '#ff0044'], shape: 'dark' },
    'earthquake': { colors: ['#885500', '#aa6600', '#cc8800'], shape: 'earth' },
    'battle-cry': { colors: ['#ff8800', '#ffaa00', '#ffcc00'], shape: 'buff' },
    'shield-wall': { colors: ['#4488ff', '#66aaff', '#88ccff'], shape: 'buff' },
  };

  const config = spellConfig[powerId] || { colors: ['#aa44ff', '#cc66ff', '#ee88ff'], shape: 'fireball' as const };
  const { colors, shape } = config;

  return (
    <div
      className="relative"
      style={{
        width: 80,
        height: 80,
        transform: direction === 'left' ? 'scaleX(-1)' : undefined,
      }}
    >
      {shape === 'fireball' && (
        <div className="absolute inset-0 animate-spell-fireball">
          {/* Core */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
            style={{ backgroundColor: colors[2], boxShadow: `0 0 20px ${colors[0]}, 0 0 40px ${colors[1]}` }} />
          {/* Flames */}
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="absolute animate-flame-flicker"
              style={{
                left: `${35 + Math.random() * 10}%`,
                top: `${30 + i * 8}%`,
                width: 8 - i,
                height: 12 - i * 2,
                backgroundColor: colors[i % 3],
                borderRadius: '50% 50% 50% 50%',
                animationDelay: `${i * 50}ms`,
              }} />
          ))}
        </div>
      )}

      {shape === 'lightning' && (
        <div className="absolute inset-0 animate-spell-lightning">
          <svg viewBox="0 0 80 80" className="w-full h-full">
            <path d="M20 10 L35 35 L25 35 L45 70 L35 45 L45 45 L20 10"
              fill={colors[0]} stroke={colors[1]} strokeWidth="2"
              className="animate-lightning-flash" />
            <path d="M25 15 L38 35 L30 35 L45 60"
              fill="none" stroke={colors[2]} strokeWidth="3"
              className="animate-lightning-flash" style={{ animationDelay: '50ms' }} />
          </svg>
        </div>
      )}

      {shape === 'ice' && (
        <div className="absolute inset-0 animate-spell-ice">
          {/* Ice shards */}
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="absolute animate-ice-shard"
              style={{
                left: '40%',
                top: '40%',
                width: 6,
                height: 20,
                backgroundColor: colors[i % 3],
                transform: `rotate(${i * 72 - 36}deg)`,
                transformOrigin: 'center bottom',
                animationDelay: `${i * 40}ms`,
                boxShadow: `0 0 8px ${colors[0]}`,
              }} />
          ))}
        </div>
      )}

      {shape === 'poison' && (
        <div className="absolute inset-0 animate-spell-poison">
          {/* Poison bubbles */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute rounded-full animate-poison-bubble"
              style={{
                left: `${30 + (i % 3) * 15}%`,
                top: `${30 + Math.floor(i / 3) * 15}%`,
                width: 8 + (i % 3) * 4,
                height: 8 + (i % 3) * 4,
                backgroundColor: colors[i % 3],
                opacity: 0.8,
                animationDelay: `${i * 60}ms`,
              }} />
          ))}
        </div>
      )}

      {shape === 'holy' && (
        <div className="absolute inset-0 animate-spell-holy">
          {/* Holy rays */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute animate-holy-ray"
              style={{
                left: '50%',
                top: '50%',
                width: 4,
                height: 30,
                backgroundColor: colors[i % 3],
                transform: `translate(-50%, -50%) rotate(${i * 60}deg)`,
                transformOrigin: 'center center',
                animationDelay: `${i * 30}ms`,
                boxShadow: `0 0 10px ${colors[0]}`,
              }} />
          ))}
          {/* Center glow */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
            style={{ backgroundColor: colors[2], boxShadow: `0 0 15px ${colors[0]}, 0 0 30px ${colors[1]}` }} />
        </div>
      )}

      {shape === 'dark' && (
        <div className="absolute inset-0 animate-spell-dark">
          {/* Dark swirls */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="absolute rounded-full animate-dark-swirl"
              style={{
                left: `${35 + i * 5}%`,
                top: `${35 + i * 5}%`,
                width: 20 - i * 3,
                height: 20 - i * 3,
                border: `2px solid ${colors[i % 3]}`,
                animationDelay: `${i * 50}ms`,
              }} />
          ))}
        </div>
      )}

      {shape === 'earth' && (
        <div className="absolute inset-0 animate-spell-earth">
          {/* Rocks */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute animate-earth-rock"
              style={{
                left: `${20 + (i % 3) * 20}%`,
                top: `${70 - i * 8}%`,
                width: 12 + (i % 2) * 6,
                height: 10 + (i % 2) * 4,
                backgroundColor: colors[i % 3],
                borderRadius: '30%',
                animationDelay: `${i * 40}ms`,
              }} />
          ))}
        </div>
      )}

      {shape === 'buff' && (
        <div className="absolute inset-0 animate-spell-buff">
          {/* Rising particles */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute animate-buff-particle"
              style={{
                left: `${25 + (i % 4) * 15}%`,
                bottom: '20%',
                width: 6,
                height: 6,
                backgroundColor: colors[i % 3],
                borderRadius: '50%',
                animationDelay: `${i * 80}ms`,
                boxShadow: `0 0 6px ${colors[0]}`,
              }} />
          ))}
        </div>
      )}
    </div>
  );
}

// Legacy spell effect (keeping for compatibility)
export interface SpellEffectProps {
  type: 'fireball' | 'lightning' | 'heal' | 'ice' | 'generic';
  x: number;
  y: number;
  onComplete?: () => void;
}

export function SpellEffect({
  type,
  x,
  y,
  onComplete,
}: SpellEffectProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  const colors = {
    fireball: ['#f97316', '#ef4444', '#fbbf24'],
    lightning: ['#3b82f6', '#8b5cf6', '#f9fafb'],
    heal: ['#22c55e', '#4ade80', '#f9fafb'],
    ice: ['#06b6d4', '#3b82f6', '#f9fafb'],
    generic: ['#8b5cf6', '#a855f7', '#f9fafb'],
  };

  const palette = colors[type];

  return (
    <div
      className="absolute pointer-events-none animate-spell-burst"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Particle burst effect */}
      <div className="relative w-20 h-20">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full animate-particle"
            style={{
              backgroundColor: palette[i % palette.length],
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
              '--particle-angle': `${i * 45}deg`,
              animationDelay: `${i * 30}ms`,
            } as React.CSSProperties}
          />
        ))}
        {/* Center glow */}
        <div
          className="absolute w-8 h-8 rounded-full animate-pulse-fast"
          style={{
            backgroundColor: palette[0],
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 20px ${palette[0]}, 0 0 40px ${palette[1]}`,
          }}
        />
      </div>
    </div>
  );
}
