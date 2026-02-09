import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Slash effect for melee attacks
export interface SlashEffectProps {
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
export interface PixelSlashProps {
  direction: 'left' | 'right';
  variant?: 'sword' | 'dagger' | 'staff' | 'mace' | 'claw';
}

// Pixel art weapon definitions (each is a small grid)
// Format: array of [x, y, color] for each pixel
type PixelDef = [number, number, string][];

export const WEAPONS: Record<string, PixelDef> = {
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

export function PixelWeapon({ type, scale = 3 }: { type: string; scale?: number }) {
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

// Pixel art hit impact - 8-bit starburst effect on damage
export interface HitImpactProps {
  x: number;
  y: number;
  isCrit?: boolean;
  onComplete?: () => void;
}

export function HitImpact({ x, y, isCrit = false, onComplete }: HitImpactProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, isCrit ? 600 : 400);
    return () => clearTimeout(timer);
  }, [isCrit, onComplete]);

  if (!visible) return null;

  // Normal hit: 8-point white/yellow starburst
  // Crit hit: larger 12-point burst with extra particles and red accents
  const size = isCrit ? 60 : 40;
  const rayCount = isCrit ? 12 : 8;
  const colors = isCrit
    ? { primary: '#ffffff', secondary: '#ffd700', accent: '#ff4444', glow: '#fbbf24' }
    : { primary: '#ffffff', secondary: '#ffd700', accent: '#fbbf24', glow: '#ffffff' };

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
      }}
    >
      {/* Main starburst rays */}
      <svg
        viewBox="0 0 100 100"
        className={cn('w-full h-full', isCrit ? 'animate-impact-crit' : 'animate-impact')}
        style={{ filter: `drop-shadow(0 0 ${isCrit ? 12 : 6}px ${colors.glow})` }}
      >
        {/* Starburst rays radiating from center */}
        {[...Array(rayCount)].map((_, i) => {
          const angle = (i * 360) / rayCount;
          const rayLength = isCrit ? 45 : 40;
          const rayWidth = isCrit ? 4 : 3;
          const x2 = 50 + rayLength * Math.cos((angle * Math.PI) / 180);
          const y2 = 50 + rayLength * Math.sin((angle * Math.PI) / 180);
          return (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={x2}
              y2={y2}
              stroke={i % 2 === 0 ? colors.primary : colors.secondary}
              strokeWidth={rayWidth}
              strokeLinecap="round"
              className="animate-ray-extend"
              style={{ animationDelay: `${i * 15}ms` }}
            />
          );
        })}
        {/* Center burst */}
        <circle
          cx="50"
          cy="50"
          r={isCrit ? 12 : 8}
          fill={colors.primary}
          className="animate-burst-fade"
        />
        {/* Inner glow */}
        <circle
          cx="50"
          cy="50"
          r={isCrit ? 6 : 4}
          fill={colors.secondary}
        />
      </svg>

      {/* Extra particles for crit hits */}
      {isCrit && (
        <>
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45 + 22.5) * (Math.PI / 180);
            const distance = 25 + Math.random() * 10;
            return (
              <div
                key={`particle-${i}`}
                className="absolute animate-crit-particle"
                style={{
                  left: '50%',
                  top: '50%',
                  width: 4,
                  height: 4,
                  backgroundColor: i % 2 === 0 ? colors.accent : colors.secondary,
                  borderRadius: '50%',
                  boxShadow: `0 0 4px ${colors.accent}`,
                  transform: `translate(-50%, -50%)`,
                  '--particle-x': `${Math.cos(angle) * distance}px`,
                  '--particle-y': `${Math.sin(angle) * distance}px`,
                  animationDelay: `${i * 30}ms`,
                } as React.CSSProperties}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
