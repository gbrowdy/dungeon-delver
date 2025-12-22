/**
 * Feature flags for phased balance rollout
 * Each flag controls a specific phase of the balance redesign
 * All flags default to false - enable as phases are completed
 */

export const FEATURE_FLAGS = {
  // Phase 1: Fortune/Speed diminishing returns
  FORTUNE_DIMINISHING_RETURNS: true,
  SPEED_SOFT_CAP: true,

  // Phase 2: Path playstyle modifiers
  PATH_PLAYSTYLE_MODIFIERS: true,

  // Phase 3: Exponential enemy scaling
  ENEMY_SCALING_V2: true,

  // Phase 4: Item tier rebalancing
  ITEM_TIER_REBALANCE: true,

  // Phase 5: Passive stance system
  PASSIVE_STANCE_SYSTEM: true,

  // Phase 6: Active path unique resources
  ACTIVE_RESOURCE_SYSTEM: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature is enabled
 * Centralized function for easy debugging and logging
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
