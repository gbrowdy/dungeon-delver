// src/utils/powerUpgrades.ts
/**
 * Power Upgrade Utilities
 *
 * Computes effective power stats by merging base power with upgrade tiers.
 * Uses registry pattern for extensibility to future paths.
 */

import type { Entity } from '@/ecs/components';
import type { Power } from '@/types/game';
import type { PowerUpgrade } from '@/data/paths/berserker-powers';
import { getBerserkerPowerUpgrade } from '@/data/paths/berserker-powers';
import { getArchmagePowerUpgrade } from '@/data/paths/archmage-powers';

// Fields that can be overridden by upgrades
const UPGRADE_FIELDS = [
  'value',
  'cooldown',
  'resourceCost',
  'damageThreshold',
  'hpThreshold',
  'bonusMultiplier',
  'guaranteedCrit',
  'stunDuration',
  'bonusDamageToStunned',
  'buffDuration',
  'buffPower',
  'buffSpeed',
  'buffCritChance',
  'lifesteal',
  'lifestealPercent',
  'selfDamagePercent',
  'healOnKill',
  'shieldOnOverheal',
  'shieldOnFullHeal',
  'cooldownReductionOnKill',
  'deathImmunityDuration',
  'reflectDuringImmunity',
  'enemyVulnerable',
  'enemyVulnerableDuration',
  'enemySlowPercent',
  'chargeModify',
  'visualMultiHit',
] as const;

// Registry pattern for path-specific upgrade lookups
type UpgradeLookup = (powerId: string, tier: 1 | 2) => PowerUpgrade | undefined;

const upgradeRegistry: Record<string, UpgradeLookup> = {
  berserker: getBerserkerPowerUpgrade,
  archmage: getArchmagePowerUpgrade,
  // Future paths add one line here:
  // assassin: getAssassinPowerUpgrade,
  // crusader: getCrusaderPowerUpgrade,
};

/**
 * Get the current upgrade tier for a power
 */
export function getPowerUpgradeTier(entity: Entity, powerId: string): 0 | 1 | 2 {
  const upgradeState = entity.pathProgression?.powerUpgrades?.find(
    (u) => u.powerId === powerId
  );
  return upgradeState?.currentTier ?? 0;
}

/**
 * Get upgrade definition from the appropriate path registry
 */
export function getUpgradeDefinition(
  pathId: string,
  powerId: string,
  tier: 1 | 2
): PowerUpgrade | undefined {
  const lookup = upgradeRegistry[pathId];
  return lookup?.(powerId, tier);
}

/**
 * Pick only upgrade-relevant fields from an object
 */
function pickUpgradeFields(obj: Partial<PowerUpgrade>): Partial<Power> {
  const result: Partial<Power> = {};
  for (const field of UPGRADE_FIELDS) {
    if (obj[field as keyof PowerUpgrade] !== undefined) {
      (result as Record<string, unknown>)[field] = obj[field as keyof PowerUpgrade];
    }
  }
  return result;
}

/**
 * Compute effective power by merging base power with upgrade tiers cumulatively.
 * Tier 2 builds on Tier 1 (Base → T1 → T2).
 */
export function computeEffectivePower(entity: Entity, basePower: Power): Power {
  const pathId = entity.pathProgression?.pathId;
  if (!pathId) return basePower;

  const currentTier = getPowerUpgradeTier(entity, basePower.id);
  if (currentTier === 0) return basePower;

  let effective = { ...basePower };

  // Apply tier 1 if at tier 1 or higher
  if (currentTier >= 1) {
    const t1Upgrade = getUpgradeDefinition(pathId, basePower.id, 1);
    if (t1Upgrade) {
      effective = { ...effective, ...pickUpgradeFields(t1Upgrade) };
    }
  }

  // Apply tier 2 if at tier 2
  if (currentTier >= 2) {
    const t2Upgrade = getUpgradeDefinition(pathId, basePower.id, 2);
    if (t2Upgrade) {
      effective = { ...effective, ...pickUpgradeFields(t2Upgrade) };
    }
  }

  return effective;
}

/**
 * Compute all effective powers for an entity
 */
export function computeAllEffectivePowers(entity: Entity): Power[] {
  if (!entity.powers) return [];
  return entity.powers.map((power) => computeEffectivePower(entity, power));
}
