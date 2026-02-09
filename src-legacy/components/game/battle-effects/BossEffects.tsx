import { useEffect, useState } from 'react';

// Boss death explosion effect - multi-phase dramatic ending for boss enemies
export interface BossDeathEffectProps {
  onComplete?: () => void;
}

export function BossDeathEffect({ onComplete }: BossDeathEffectProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Phase timing: 0ms -> 300ms -> 700ms -> 1500ms (total 1.5s)
    const timers = [
      setTimeout(() => setPhase(1), 0),
      setTimeout(() => setPhase(2), 300),
      setTimeout(() => setPhase(3), 700),
      setTimeout(() => {
        setPhase(4);
        onComplete?.();
      }, 1500),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (phase === 0) return null;

  return (
    <>
      {/* Screen flash */}
      {phase >= 3 && (
        <div className="absolute inset-0 bg-white pointer-events-none z-50 animate-boss-flash" />
      )}

      {/* Explosion phases - positioned at enemy location (75% from left, 50% from top) */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '75%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 100,
          height: 100,
        }}
      >
        {/* Phase 1: Initial small explosion */}
        {phase >= 1 && (
          <div
            className="absolute animate-boss-explode-1"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="w-20 h-20 rounded-full"
              style={{
                background: 'radial-gradient(circle, #ffd700 0%, #ff8800 50%, #ff4400 100%)',
                boxShadow: '0 0 40px #ff8800, 0 0 80px #ff4400',
              }}
            />
          </div>
        )}

        {/* Phase 2: Larger rotating explosion */}
        {phase >= 2 && (
          <div
            className="absolute animate-boss-explode-2"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="w-32 h-32 rounded-full"
              style={{
                background: 'radial-gradient(circle, #ff4400 0%, #ff8800 40%, #ffcc00 100%)',
                boxShadow: '0 0 60px #ff4400, 0 0 120px #ff8800',
              }}
            />
          </div>
        )}

        {/* Phase 3: Final massive explosion */}
        {phase >= 3 && (
          <div
            className="absolute animate-boss-explode-final"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="w-48 h-48 rounded-full"
              style={{
                background: 'radial-gradient(circle, #ffffff 0%, #ffd700 20%, #ff8800 50%, #ff4400 100%)',
                boxShadow: '0 0 100px #ffd700, 0 0 200px #ff8800',
              }}
            />
          </div>
        )}

        {/* Debris particles - 12 flying in random directions */}
        {phase >= 2 &&
          [...Array(12)].map((_, i) => {
            const angle = (i * 30) * (Math.PI / 180); // Spread evenly in circle
            const distance = 50 + Math.random() * 30;
            const debrisX = Math.cos(angle) * distance;
            const debrisY = Math.sin(angle) * distance;
            const debrisRot = Math.random() * 720 - 360;

            // Random colors from palette
            const colors = ['#ff4400', '#ff8800', '#ffcc00', '#ffd700'];
            const color = colors[i % colors.length];

            return (
              <div
                key={i}
                className="absolute animate-boss-debris"
                style={{
                  left: '50%',
                  top: '50%',
                  width: 6 + Math.random() * 6,
                  height: 6 + Math.random() * 6,
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '0',
                  '--debris-x': `${debrisX}px`,
                  '--debris-y': `${debrisY}px`,
                  '--debris-rot': `${debrisRot}deg`,
                  animationDelay: `${i * 30}ms`,
                } as React.CSSProperties}
              />
            );
          })}
      </div>
    </>
  );
}
