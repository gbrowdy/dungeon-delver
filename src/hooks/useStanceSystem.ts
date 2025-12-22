import { useState, useCallback, useEffect, useRef } from 'react';
import type { PassiveStance, StanceEffect, PlayerStanceState } from '@/types/paths';
import { isFeatureEnabled } from '@/constants/features';

/**
 * Default cooldown for switching stances (5 seconds)
 */
const DEFAULT_STANCE_COOLDOWN = 5000;

/**
 * Tick interval for cooldown updates (100ms for smooth UI)
 */
const COOLDOWN_TICK_INTERVAL = 100;

interface UseStanceSystemReturn {
  /** Currently active stance, or null if no stances available */
  currentStance: PassiveStance | null;
  /** Whether the player can currently switch to a different stance */
  canSwitchStance: boolean;
  /** Switch to a different stance by ID */
  switchStance: (stanceId: string) => void;
  /** Get all active stance effects for stat calculations */
  getStanceModifiers: () => StanceEffect[];
  /** Remaining cooldown in milliseconds before stance can be switched */
  cooldownRemaining: number;
  /** Available stances for this path */
  availableStances: PassiveStance[];
  /** Whether the stance system is enabled and active */
  isStanceSystemActive: boolean;
}

/**
 * useStanceSystem - Manages stance switching and effects for passive paths
 *
 * Passive paths use stances instead of active powers. Each stance provides
 * persistent stat/behavior modifiers. Players can switch between stances
 * with a cooldown period between switches.
 *
 * @param availableStances - Array of stances available to the player
 * @param initialStanceId - ID of the stance to start with (defaults to first)
 * @param isPaused - Whether the game is paused (stops cooldown ticking)
 */
export function useStanceSystem(
  availableStances: PassiveStance[],
  initialStanceId?: string,
  isPaused: boolean = false
): UseStanceSystemReturn {
  // Feature flag check
  const isEnabled = isFeatureEnabled('PASSIVE_STANCE_SYSTEM');

  // Determine initial stance
  const getInitialStanceId = () => {
    if (initialStanceId && availableStances.some(s => s.id === initialStanceId)) {
      return initialStanceId;
    }
    return availableStances[0]?.id ?? '';
  };

  const [state, setState] = useState<PlayerStanceState>(() => ({
    activeStanceId: getInitialStanceId(),
    stanceCooldownRemaining: 0,
    triggerCooldowns: {},
  }));

  // Track last tick time for accurate cooldown updates
  const lastTickRef = useRef<number>(Date.now());

  // Cooldown tick effect
  useEffect(() => {
    if (!isEnabled || isPaused || state.stanceCooldownRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      setState(prev => ({
        ...prev,
        stanceCooldownRemaining: Math.max(0, prev.stanceCooldownRemaining - elapsed),
      }));
    }, COOLDOWN_TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [isEnabled, isPaused, state.stanceCooldownRemaining]);

  // Reset tick reference when unpausing
  useEffect(() => {
    if (!isPaused) {
      lastTickRef.current = Date.now();
    }
  }, [isPaused]);

  const currentStance = availableStances.find(s => s.id === state.activeStanceId) ?? null;
  const canSwitchStance = state.stanceCooldownRemaining <= 0 && availableStances.length > 1;

  const switchStance = useCallback((stanceId: string) => {
    if (!isEnabled || !canSwitchStance) return;

    const newStance = availableStances.find(s => s.id === stanceId);
    if (!newStance || newStance.id === state.activeStanceId) return;

    const cooldown = newStance.switchCooldown ?? DEFAULT_STANCE_COOLDOWN;

    setState(prev => ({
      ...prev,
      activeStanceId: stanceId,
      stanceCooldownRemaining: cooldown,
    }));

    // Reset tick reference for accurate cooldown tracking
    lastTickRef.current = Date.now();
  }, [isEnabled, canSwitchStance, availableStances, state.activeStanceId]);

  const getStanceModifiers = useCallback((): StanceEffect[] => {
    if (!isEnabled || !currentStance) return [];
    return currentStance.effects;
  }, [isEnabled, currentStance]);

  return {
    currentStance,
    canSwitchStance,
    switchStance,
    getStanceModifiers,
    cooldownRemaining: state.stanceCooldownRemaining,
    availableStances,
    isStanceSystemActive: isEnabled && availableStances.length > 0,
  };
}

/**
 * Helper to calculate stat modifiers from stance effects
 * Aggregates flat and percent bonuses by stat type
 */
export function calculateStanceStatModifiers(effects: StanceEffect[]): {
  flatBonuses: Partial<Record<string, number>>;
  percentBonuses: Partial<Record<string, number>>;
} {
  const flatBonuses: Partial<Record<string, number>> = {};
  const percentBonuses: Partial<Record<string, number>> = {};

  for (const effect of effects) {
    if (effect.type === 'stat_modifier' && effect.stat) {
      if (effect.flatBonus !== undefined) {
        flatBonuses[effect.stat] = (flatBonuses[effect.stat] ?? 0) + effect.flatBonus;
      }
      if (effect.percentBonus !== undefined) {
        percentBonuses[effect.stat] = (percentBonuses[effect.stat] ?? 0) + effect.percentBonus;
      }
    }
  }

  return { flatBonuses, percentBonuses };
}

/**
 * Helper to extract behavior modifiers from stance effects
 * Note: No blocking behaviors - passive paths don't use manual blocking
 */
export function getStanceBehaviorModifiers(effects: StanceEffect[]): {
  reflectDamage: number;
  counterAttackChance: number;
  autoBlockChance: number;
  lifestealPercent: number;
} {
  const result = {
    reflectDamage: 0,
    counterAttackChance: 0,
    autoBlockChance: 0,
    lifestealPercent: 0,
  };

  for (const effect of effects) {
    if (effect.type === 'behavior_modifier' && effect.behavior && effect.value !== undefined) {
      switch (effect.behavior) {
        case 'reflect_damage':
          result.reflectDamage += effect.value;
          break;
        case 'counter_attack':
          result.counterAttackChance += effect.value;
          break;
        case 'auto_block':
          result.autoBlockChance += effect.value;
          break;
        case 'lifesteal':
          result.lifestealPercent += effect.value;
          break;
      }
    }
  }

  return result;
}
