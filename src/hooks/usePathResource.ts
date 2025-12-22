/**
 * Path Resource Management Hook (Phase 6: Active Path Resources)
 *
 * Manages the unique resource system for active paths:
 * - Tracks resource generation and consumption
 * - Handles decay timers for resources that decay over time
 * - Calculates threshold effects (cost reduction, damage bonus, etc.)
 * - Falls back to mana for passive paths or pre-level-2 players
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { PathResource, ThresholdEffect, Player } from '@/types/game';
import { PATH_RESOURCES, DEFAULT_MANA_RESOURCE, getResourceDisplayName } from '@/data/pathResources';
import { isFeatureEnabled } from '@/constants/features';
import { logError } from '@/utils/gameLogger';

export interface UsePathResourceReturn {
  resource: PathResource;
  resourceName: string;
  addResource: (amount: number, source: string) => void;
  consumeResource: (amount: number) => boolean;
  setResourceValue: (value: number) => void;
  getEffectiveCost: (baseCost: number) => number;
  getActiveThresholdEffects: () => ThresholdEffect[];
  getDamageMultiplier: () => number;
  resetResource: () => void;
}

/**
 * Hook for managing path-specific resources
 *
 * @param player - Current player state
 * @param inCombat - Whether player is currently in combat (affects decay)
 * @returns Resource state and management functions
 */
export function usePathResource(
  player: Player | null,
  inCombat: boolean = true
): UsePathResourceReturn {
  const pathId = player?.path?.pathId;

  // Get resource definition based on path and feature flag
  const getResourceDef = useCallback((): PathResource => {
    if (!isFeatureEnabled('ACTIVE_RESOURCE_SYSTEM') || !pathId) {
      // Fall back to mana-based resource
      return {
        ...DEFAULT_MANA_RESOURCE,
        current: player?.currentStats?.mana ?? 50,
        max: player?.currentStats?.maxMana ?? 50,
      };
    }

    const resourceDef = PATH_RESOURCES[pathId];
    if (!resourceDef) {
      // Log in development: pathId provided but not found in PATH_RESOURCES
      // This could indicate a typo or missing resource definition
      if (process.env.NODE_ENV !== 'production') {
        logError('Path resource not found, falling back to mana', {
          pathId,
          availablePaths: Object.keys(PATH_RESOURCES),
        });
      }
      return {
        ...DEFAULT_MANA_RESOURCE,
        current: player?.currentStats?.mana ?? 50,
        max: player?.currentStats?.maxMana ?? 50,
      };
    }

    return { ...resourceDef };
  }, [pathId, player?.currentStats?.mana, player?.currentStats?.maxMana]);

  const [resource, setResource] = useState<PathResource>(getResourceDef);

  // Update resource when player/path changes
  useEffect(() => {
    setResource(getResourceDef());
  }, [getResourceDef]);

  // Decay timer ref
  const decayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle resource decay
  useEffect(() => {
    // Clear existing timer
    if (decayTimerRef.current) {
      clearInterval(decayTimerRef.current);
      decayTimerRef.current = null;
    }

    // Skip if no decay config or decay only out of combat and we're in combat
    if (!resource.decay) return;
    if (resource.decay.outOfCombatOnly && inCombat) return;

    decayTimerRef.current = setInterval(() => {
      setResource(prev => {
        // Defensive check: decay config could change between ticks
        if (!prev.decay) return prev;
        return {
          ...prev,
          current: Math.max(0, prev.current - prev.decay.rate),
        };
      });
    }, resource.decay.tickInterval);

    return () => {
      if (decayTimerRef.current) {
        clearInterval(decayTimerRef.current);
        decayTimerRef.current = null;
      }
    };
  }, [resource.decay, inCombat]);

  /**
   * Add resource (from combat events like hits, crits, kills)
   * @param amount - Amount of resource to add
   * @param source - Source of generation (for debugging/logging)
   */
  const addResource = useCallback((amount: number, source: string) => {
    if (process.env.NODE_ENV !== 'production' && amount > 0) {
      // Debug logging for resource generation tracking
      console.debug(`[Resource] +${amount} from ${source}`);
    }
    setResource(prev => ({
      ...prev,
      current: Math.min(prev.max, prev.current + amount),
    }));
  }, []);

  /**
   * Consume resource for power usage.
   * Returns true if successful, false if insufficient resource.
   *
   * Note: Reads current state synchronously to return accurate result.
   * The actual state update is still batched by React.
   */
  const consumeResource = useCallback((amount: number): boolean => {
    // Read current value synchronously to determine success
    if (resource.current < amount) {
      return false;
    }

    setResource(prev => ({
      ...prev,
      current: prev.current - amount,
    }));

    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally depend on resource.current only
  }, [resource.current]);

  /**
   * Set resource to specific value (for sync with game state)
   */
  const setResourceValue = useCallback((value: number) => {
    setResource(prev => ({
      ...prev,
      current: Math.min(prev.max, Math.max(0, value)),
    }));
  }, []);

  /**
   * Get effective cost after threshold reductions
   */
  const getEffectiveCost = useCallback((baseCost: number): number => {
    const thresholdEffects = resource.thresholds?.filter(
      t => resource.current >= t.value && t.effect.type === 'cost_reduction'
    ) ?? [];

    let cost = baseCost;
    for (const threshold of thresholdEffects) {
      cost *= (1 - (threshold.effect.value ?? 0));
    }
    return Math.max(1, Math.floor(cost));
  }, [resource]);

  /**
   * Get all currently active threshold effects
   */
  const getActiveThresholdEffects = useCallback((): ThresholdEffect[] => {
    return resource.thresholds?.filter(
      t => resource.current >= t.value
    ).map(t => t.effect) ?? [];
  }, [resource]);

  /**
   * Get cumulative damage multiplier from threshold effects
   */
  const getDamageMultiplier = useCallback((): number => {
    const damageEffects = resource.thresholds?.filter(
      t => resource.current >= t.value && t.effect.type === 'damage_bonus'
    ) ?? [];

    let multiplier = 1;

    // Special case for arcane charges: multiplier = 1 + (bonusPerCharge * currentCharges)
    // e.g., with 0.10 bonus and 3 charges: 1 + (0.10 * 3) = 1.30 (30% bonus)
    if (resource.type === 'arcane_charges') {
      const chargeBonus = damageEffects.find(t => t.effect.value);
      if (chargeBonus) {
        multiplier += (chargeBonus.effect.value ?? 0) * resource.current;
      }
    } else {
      // Standard: add all damage bonuses
      for (const threshold of damageEffects) {
        multiplier += threshold.effect.value ?? 0;
      }
    }

    return multiplier;
  }, [resource]);

  /**
   * Reset resource to initial value
   */
  const resetResource = useCallback(() => {
    setResource(getResourceDef());
  }, [getResourceDef]);

  return {
    resource,
    resourceName: getResourceDisplayName(resource.type),
    addResource,
    consumeResource,
    setResourceValue,
    getEffectiveCost,
    getActiveThresholdEffects,
    getDamageMultiplier,
    resetResource,
  };
}

/**
 * Helper to check if a path uses the resource system
 */
export function pathUsesResourceSystem(pathId: string | undefined): boolean {
  if (!isFeatureEnabled('ACTIVE_RESOURCE_SYSTEM')) return false;
  return pathId !== undefined && pathId in PATH_RESOURCES;
}

/**
 * Get resource generation amount for a trigger
 */
export function getResourceGeneration(
  pathId: string | undefined,
  trigger: keyof PathResource['generation']
): number {
  if (!pathId) return 0;
  const resourceDef = PATH_RESOURCES[pathId];
  if (!resourceDef) {
    // Log in development: unexpected pathId
    if (process.env.NODE_ENV !== 'production') {
      logError('Resource generation requested for unknown path', {
        pathId,
        trigger,
        availablePaths: Object.keys(PATH_RESOURCES),
      });
    }
    return 0;
  }
  return resourceDef.generation[trigger] ?? 0;
}
