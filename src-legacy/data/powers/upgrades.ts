import type { Power, PowerUpgradeOffer } from '@/types/game';
import { UNLOCKABLE_POWERS } from './definitions';

// Power upgrade configuration
// Each upgrade level improves the power's effectiveness
export const POWER_UPGRADE_CONFIG = {
  MAX_UPGRADE_LEVEL: 3,
  // Per-level bonuses
  VALUE_INCREASE_PER_LEVEL: 0.25, // +25% power value per upgrade
  COOLDOWN_REDUCTION_PER_LEVEL: 0.5, // -0.5s cooldown per upgrade
  COST_REDUCTION_PER_LEVEL: 0.1, // -10% resource cost per upgrade
  // Chance that one of the power offers will be an upgrade (if player has upgradeable powers)
  UPGRADE_OFFER_CHANCE: 0.5,
} as const;

/**
 * Generate a power upgrade offer for an existing power
 */
export function generatePowerUpgradeOffer(power: Power): PowerUpgradeOffer | null {
  const currentLevel = power.upgradeLevel ?? 1;

  // Can't upgrade past max level
  if (currentLevel >= POWER_UPGRADE_CONFIG.MAX_UPGRADE_LEVEL) {
    return null;
  }

  const newLevel = currentLevel + 1;
  const valueIncrease = Math.floor(POWER_UPGRADE_CONFIG.VALUE_INCREASE_PER_LEVEL * 100);
  const cooldownReduction = POWER_UPGRADE_CONFIG.COOLDOWN_REDUCTION_PER_LEVEL;
  const costReduction = Math.floor(POWER_UPGRADE_CONFIG.COST_REDUCTION_PER_LEVEL * 100);

  return {
    powerId: power.id,
    powerName: power.name,
    powerIcon: power.icon,
    currentLevel,
    newLevel,
    description: `+${valueIncrease}% power, -${cooldownReduction}s cooldown, -${costReduction}% cost`,
    isUpgrade: true,
  };
}

/**
 * Apply an upgrade to a power, returning the upgraded power
 */
export function applyPowerUpgrade(power: Power): Power {
  const currentLevel = power.upgradeLevel ?? 1;
  const newLevel = currentLevel + 1;

  // Calculate new values
  const valueMultiplier = 1 + (POWER_UPGRADE_CONFIG.VALUE_INCREASE_PER_LEVEL * (newLevel - 1));
  const cooldownReduction = POWER_UPGRADE_CONFIG.COOLDOWN_REDUCTION_PER_LEVEL * (newLevel - 1);
  const costMultiplier = 1 - (POWER_UPGRADE_CONFIG.COST_REDUCTION_PER_LEVEL * (newLevel - 1));

  // Find base power to get original values
  const basePower = UNLOCKABLE_POWERS.find(p => p.id === power.id);
  if (!basePower) return power;

  const newValue = Number((basePower.value * valueMultiplier).toFixed(2));
  const newCooldown = Math.max(1, basePower.cooldown - cooldownReduction);
  const newCost = Math.max(5, Math.floor(basePower.resourceCost * costMultiplier));

  // Generate new description based on effect type
  let newDescription = power.description;
  if (power.effect === 'damage') {
    newDescription = power.description.replace(/\d+%/, `${Math.floor(newValue * 100)}%`);
  }

  return {
    ...power,
    value: newValue,
    cooldown: newCooldown,
    resourceCost: newCost,
    description: newDescription,
    upgradeLevel: newLevel,
    name: newLevel > 1 ? `${basePower.name} +${newLevel - 1}` : basePower.name,
  };
}
