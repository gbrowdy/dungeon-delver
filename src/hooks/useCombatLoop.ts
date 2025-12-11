import { useRef, useCallback, useEffect, useState } from 'react';
import { COMBAT_BALANCE } from '@/constants/balance';

/**
 * Combat loop with separate attack timers for hero and enemy.
 * Each combatant has their own attack speed determining their attack interval.
 * Hero gets a small timing advantage (jitter) to ensure they usually attack first
 * when timers would otherwise fire simultaneously.
 */

interface UseCombatLoopOptions {
  onHeroAttack: () => void;
  onEnemyAttack: () => void;
  heroSpeed: number; // Higher = faster attacks
  enemySpeed: number;
  baseInterval: number; // Base attack interval in ms (modified by speed)
  enabled: boolean;
  combatSpeedMultiplier: number; // 1x, 2x, 3x game speed
}

interface CombatLoopReturn {
  heroProgress: number; // 0-1 progress to next hero attack
  enemyProgress: number; // 0-1 progress to next enemy attack
  resetTimers: () => void;
}

// Convert speed stat to attack interval with diminishing returns
// Uses square root scaling to prevent speed from being overpowered
// Base speed of 10 = base interval
// Speed 15: sqrt(1.5) = 1.22x faster (was 1.5x with linear)
// Speed 7: sqrt(0.7) = 0.84x speed (was 0.7x with linear)
function speedToInterval(speed: number, baseInterval: number): number {
  // Clamp speed to reasonable range
  const clampedSpeed = Math.max(1, Math.min(50, speed));
  const speedRatio = clampedSpeed / COMBAT_BALANCE.BASE_SPEED;
  // Square root gives diminishing returns - high speed is less dominant
  return Math.floor(baseInterval / Math.sqrt(speedRatio));
}

export function useCombatLoop({
  onHeroAttack,
  onEnemyAttack,
  heroSpeed,
  enemySpeed,
  baseInterval,
  enabled,
  combatSpeedMultiplier,
}: UseCombatLoopOptions): CombatLoopReturn {
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Accumulated time for each combatant
  const heroAccumulatedRef = useRef<number>(0);
  const enemyAccumulatedRef = useRef<number>(0);

  // Track when attacks fired (for hold-at-100% effect)
  const heroAttackFiredAtRef = useRef<number>(0);
  const enemyAttackFiredAtRef = useRef<number>(0);

  const [heroProgress, setHeroProgress] = useState(0);
  const [enemyProgress, setEnemyProgress] = useState(0);

  // Calculate intervals based on speed stats
  const effectiveBaseInterval = Math.floor(baseInterval / combatSpeedMultiplier);
  const heroInterval = speedToInterval(heroSpeed, effectiveBaseInterval);
  const enemyInterval = speedToInterval(enemySpeed, effectiveBaseInterval);

  const gameLoop = useCallback((timestamp: number) => {
    if (!enabled) {
      animationFrameRef.current = null;
      return;
    }

    // Initialize on first frame
    if (lastFrameTimeRef.current === 0) {
      lastFrameTimeRef.current = timestamp;
      // Give hero a small head start
      heroAccumulatedRef.current = COMBAT_BALANCE.HERO_JITTER_ADVANTAGE;
    }

    // Calculate delta time
    const deltaTime = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;

    // Accumulate time for both combatants
    heroAccumulatedRef.current += deltaTime;
    enemyAccumulatedRef.current += deltaTime;

    // Check if hero attacks (check hero first for tie-breaking)
    if (heroAccumulatedRef.current >= heroInterval) {
      onHeroAttack();
      heroAttackFiredAtRef.current = timestamp;
      heroAccumulatedRef.current -= heroInterval;
    }

    // Check if enemy attacks
    if (enemyAccumulatedRef.current >= enemyInterval) {
      onEnemyAttack();
      enemyAttackFiredAtRef.current = timestamp;
      enemyAccumulatedRef.current -= enemyInterval;
    }

    // Calculate progress for UI
    // Hold at 100% briefly after attack fires
    const timeSinceHeroAttack = timestamp - heroAttackFiredAtRef.current;
    const timeSinceEnemyAttack = timestamp - enemyAttackFiredAtRef.current;

    let heroProgressValue: number;
    if (timeSinceHeroAttack < COMBAT_BALANCE.ATTACK_HOLD_DURATION && heroAttackFiredAtRef.current > 0) {
      heroProgressValue = 1;
    } else {
      heroProgressValue = Math.min(1, heroAccumulatedRef.current / heroInterval);
    }

    let enemyProgressValue: number;
    if (timeSinceEnemyAttack < COMBAT_BALANCE.ATTACK_HOLD_DURATION && enemyAttackFiredAtRef.current > 0) {
      enemyProgressValue = 1;
    } else {
      enemyProgressValue = Math.min(1, enemyAccumulatedRef.current / enemyInterval);
    }

    setHeroProgress(heroProgressValue);
    setEnemyProgress(enemyProgressValue);

    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [enabled, heroInterval, enemyInterval, onHeroAttack, onEnemyAttack]);

  // Start/stop loop
  useEffect(() => {
    if (enabled) {
      lastFrameTimeRef.current = 0;
      heroAccumulatedRef.current = 0;
      enemyAccumulatedRef.current = 0;
      heroAttackFiredAtRef.current = 0;
      enemyAttackFiredAtRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, gameLoop]);

  const resetTimers = useCallback(() => {
    lastFrameTimeRef.current = 0;
    heroAccumulatedRef.current = 0;
    enemyAccumulatedRef.current = 0;
    heroAttackFiredAtRef.current = 0;
    enemyAttackFiredAtRef.current = 0;
  }, []);

  return { heroProgress, enemyProgress, resetTimers };
}
