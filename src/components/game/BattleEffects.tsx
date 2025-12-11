import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Floating damage number that rises and fades
interface DamageNumberProps {
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

// Slash effect for melee attacks
interface SlashEffectProps {
  x: number;
  y: number;
  direction?: 'left' | 'right';
  onComplete?: () => void;
}

export function SlashEffect({
  x,
  y,
  direction = 'right',
  onComplete,
}: SlashEffectProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 450); // Longer visibility for slash effects
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className="absolute pointer-events-none animate-slash"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) ${direction === 'left' ? 'scaleX(-1)' : ''}`,
      }}
    >
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        className="drop-shadow-lg"
      >
        {/* Diagonal slash marks */}
        <path
          d="M 20 60 L 60 20"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          className="animate-slash-draw"
        />
        <path
          d="M 25 55 L 55 25"
          stroke="#fbbf24"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          className="animate-slash-draw"
          style={{ animationDelay: '50ms' }}
        />
        <path
          d="M 30 65 L 65 30"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
          className="animate-slash-draw"
          style={{ animationDelay: '100ms' }}
        />
      </svg>
    </div>
  );
}

// Pixel art weapon swing effect - 8-bit Final Fantasy style
// Shows weapon swinging twice in quick succession
interface PixelSlashProps {
  direction: 'left' | 'right';
  variant?: 'sword' | 'dagger' | 'staff' | 'mace' | 'claw';
}

// Pixel art weapon definitions (each is a small grid)
// Format: array of [x, y, color] for each pixel
type PixelDef = [number, number, string][];

const WEAPONS: Record<string, PixelDef> = {
  // Warrior sword - classic longsword with fuller and pommel
  sword: [
    // Blade with fuller groove
    [0, 6, '#808080'], [1, 5, '#e0e0e0'], [2, 4, '#ffffff'], [3, 3, '#ffffff'],
    [4, 2, '#ffffff'], [5, 1, '#e0e0e0'], [6, 0, '#c0c0c0'], [7, 0, '#a0a0a0'],
    // Edge highlight
    [1, 6, '#c0c0c0'], [2, 5, '#f0f0f0'], [3, 4, '#f8f8f8'], [4, 3, '#f0f0f0'], [5, 2, '#e0e0e0'],
    // Fuller (dark groove down center)
    [2, 6, '#909090'], [3, 5, '#a0a0a0'], [4, 4, '#a0a0a0'], [5, 3, '#a0a0a0'],
    // Crossguard
    [0, 7, '#fbbf24'], [1, 7, '#f59e0b'], [2, 7, '#ffd700'], [3, 7, '#f59e0b'], [4, 7, '#fbbf24'],
    // Handle with grip
    [2, 8, '#8b4513'], [2, 9, '#654321'], [2, 10, '#8b4513'],
    [1, 8, '#654321'], [3, 8, '#654321'],
    // Pommel
    [1, 11, '#fbbf24'], [2, 11, '#ffd700'], [3, 11, '#fbbf24'],
  ],
  // Rogue dagger - sleek curved blade
  dagger: [
    // Curved blade
    [3, 3, '#c0c0c0'], [4, 2, '#e0e0e0'], [5, 1, '#ffffff'], [6, 1, '#f0f0f0'],
    [2, 4, '#a0a0a0'], [3, 4, '#d0d0d0'], [4, 3, '#f0f0f0'], [5, 2, '#f8f8f8'],
    // Sharp edge
    [4, 4, '#b0b0b0'], [5, 3, '#e0e0e0'], [6, 2, '#e0e0e0'],
    // Ornate guard
    [1, 5, '#7c3aed'], [2, 5, '#a855f7'], [3, 5, '#9333ea'],
    [2, 6, '#6b21a8'],
    // Wrapped handle
    [2, 7, '#3a3a3a'], [2, 8, '#2a2a2a'], [2, 9, '#3a3a3a'],
    [1, 7, '#2a2a2a'], [3, 7, '#2a2a2a'],
  ],
  // Mage staff - ornate with larger glowing orb
  staff: [
    // Wooden shaft with runes
    [3, 4, '#8b4513'], [3, 5, '#a0522d'], [3, 6, '#8b4513'],
    [3, 7, '#a0522d'], [3, 8, '#8b4513'], [3, 9, '#a0522d'],
    [2, 5, '#654321'], [4, 6, '#654321'], // wood grain
    // Ornate orb housing
    [2, 2, '#4b5563'], [4, 2, '#4b5563'],
    [2, 3, '#6b7280'], [4, 3, '#6b7280'],
    // Large magical orb
    [2, 0, '#60a5fa'], [3, 0, '#3b82f6'], [4, 0, '#60a5fa'],
    [1, 1, '#3b82f6'], [2, 1, '#93c5fd'], [3, 1, '#dbeafe'], [4, 1, '#93c5fd'], [5, 1, '#3b82f6'],
    [2, 2, '#3b82f6'], [3, 2, '#93c5fd'], [4, 2, '#3b82f6'],
    // Orb glow (translucent)
    [0, 0, '#60a5fa60'], [5, 0, '#60a5fa60'], [6, 1, '#3b82f660'],
    [0, 1, '#3b82f680'], [6, 1, '#3b82f680'], [3, -1, '#93c5fd80'],
    // Bottom cap
    [2, 10, '#6b7280'], [3, 10, '#4b5563'], [4, 10, '#6b7280'],
  ],
  // Paladin mace - holy war hammer with radiance
  mace: [
    // Hammer head with holy symbol
    [3, 0, '#f59e0b'], [4, 0, '#fbbf24'], [5, 0, '#ffd700'], [6, 0, '#fbbf24'], [7, 0, '#f59e0b'],
    [2, 1, '#fbbf24'], [3, 1, '#ffd700'], [4, 1, '#ffffff'], [5, 1, '#ffd700'], [6, 1, '#ffd700'], [7, 1, '#fbbf24'], [8, 1, '#f59e0b'],
    [3, 2, '#f59e0b'], [4, 2, '#fbbf24'], [5, 2, '#ffd700'], [6, 2, '#fbbf24'], [7, 2, '#f59e0b'],
    // Vertical holy line
    [5, 3, '#ffd700'],
    // Metal shaft
    [5, 4, '#c0c0c0'], [5, 5, '#a0a0a0'], [5, 6, '#c0c0c0'],
    [4, 4, '#909090'], [6, 4, '#909090'], // shaft shading
    // Leather grip
    [4, 7, '#8b4513'], [5, 7, '#a0522d'], [6, 7, '#8b4513'],
    [5, 8, '#8b4513'], [5, 9, '#a0522d'],
    // Holy glow
    [2, 0, '#ffd70040'], [8, 0, '#ffd70040'], [3, -1, '#ffffff30'], [7, -1, '#ffffff30'],
  ],
  // Enemy claw - vicious talons with blood
  claw: [
    // Three sharp claws
    [1, 0, '#ff2222'], [2, 1, '#ff4444'], [3, 2, '#ff6666'], [4, 3, '#cc4444'],
    [4, 0, '#ff2222'], [5, 1, '#ff4444'], [6, 2, '#ff6666'], [7, 3, '#cc4444'],
    [7, 0, '#ff2222'], [8, 1, '#ff4444'], [9, 2, '#ff6666'], [10, 3, '#cc4444'],
    // Claw tips (sharp points)
    [0, 0, '#ffffff'], [3, 0, '#ffffff'], [6, 0, '#ffffff'],
    [1, 1, '#f0f0f0'], [4, 1, '#f0f0f0'], [7, 1, '#f0f0f0'],
    // Dark palm/knuckles
    [3, 4, '#2a2a2a'], [4, 4, '#1a1a1a'], [5, 4, '#2a2a2a'], [6, 4, '#1a1a1a'], [7, 4, '#2a2a2a'],
    [4, 5, '#1a1a1a'], [5, 5, '#0a0a0a'], [6, 5, '#1a1a1a'],
    // Blood drips
    [2, 2, '#8b0000'], [5, 2, '#8b0000'], [8, 2, '#8b0000'],
  ],
};

function PixelWeapon({ type, scale = 3 }: { type: string; scale?: number }) {
  const pixels = WEAPONS[type as keyof typeof WEAPONS] ?? WEAPONS.sword;
  const px = scale;

  return (
    <div
      className="relative"
      style={{
        width: 12 * px,
        height: 12 * px,
        imageRendering: 'pixelated',
      }}
    >
      {pixels.map(([x, y, color], i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: x * px,
            top: y * px,
            width: px,
            height: px,
            backgroundColor: color,
            boxShadow: color.includes('ff') || color.includes('fb')
              ? `0 0 ${px}px ${color}`
              : undefined,
          }}
        />
      ))}
    </div>
  );
}

export function PixelSlash({ direction, variant = 'sword' }: PixelSlashProps) {
  const weaponType = variant;

  // Simple double-swing: weapon pivots from handle (bottom-left), swings from -45deg to 0deg twice
  return (
    <div
      className="relative"
      style={{
        width: 70,
        height: 70,
        transform: direction === 'left' ? 'scaleX(-1)' : undefined,
      }}
    >
      {/* Single weapon that swings twice */}
      <div
        className="absolute animate-weapon-double-swing"
        style={{
          left: 0,
          top: 10,
          transformOrigin: 'left bottom', // Pivot from handle
        }}
      >
        <PixelWeapon type={weaponType} scale={5} />
      </div>

      {/* Small impact flash */}
      <div
        className="absolute animate-weapon-flash"
        style={{
          right: 5,
          top: 0,
          width: 12,
          height: 12,
          backgroundColor: 'white',
          borderRadius: '50%',
          boxShadow: '0 0 8px white, 0 0 16px #fbbf24',
        }}
      />
    </div>
  );
}

// Pixel art spell effect - 8-bit style projectiles and effects
interface PixelSpellProps {
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
    'mana-surge': { colors: ['#0044ff', '#0088ff', '#00ccff'], shape: 'holy' },
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

// Pixel art shield effect - defensive visual
interface PixelShieldProps {
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

// Legacy spell effect (keeping for compatibility)
interface SpellEffectProps {
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

// Screen shake wrapper
interface ScreenShakeProps {
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
interface HitFlashProps {
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

// Effect manager for coordinating multiple effects
export interface BattleEffect {
  id: string;
  type: 'damage' | 'slash' | 'spell' | 'heal' | 'miss';
  x: number;
  y: number;
  value?: number;
  isCrit?: boolean;
  spellType?: SpellEffectProps['type'];
}

interface EffectsLayerProps {
  effects: BattleEffect[];
  onEffectComplete: (id: string) => void;
}

export function EffectsLayer({ effects, onEffectComplete }: EffectsLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {effects.map((effect) => {
        switch (effect.type) {
          case 'damage':
            return (
              <DamageNumber
                key={effect.id}
                value={effect.value || 0}
                x={effect.x}
                y={effect.y}
                isCrit={effect.isCrit}
                onComplete={() => onEffectComplete(effect.id)}
              />
            );
          case 'heal':
            return (
              <DamageNumber
                key={effect.id}
                value={effect.value || 0}
                x={effect.x}
                y={effect.y}
                isHeal
                onComplete={() => onEffectComplete(effect.id)}
              />
            );
          case 'miss':
            return (
              <DamageNumber
                key={effect.id}
                value={0}
                x={effect.x}
                y={effect.y}
                isMiss
                onComplete={() => onEffectComplete(effect.id)}
              />
            );
          case 'slash':
            return (
              <SlashEffect
                key={effect.id}
                x={effect.x}
                y={effect.y}
                onComplete={() => onEffectComplete(effect.id)}
              />
            );
          case 'spell':
            return (
              <SpellEffect
                key={effect.id}
                type={effect.spellType || 'generic'}
                x={effect.x}
                y={effect.y}
                onComplete={() => onEffectComplete(effect.id)}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
