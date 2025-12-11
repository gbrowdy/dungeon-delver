import { Power, PowerUpgradeOffer } from '@/types/game';

// Power upgrade configuration
// Each upgrade level improves the power's effectiveness
export const POWER_UPGRADE_CONFIG = {
  MAX_UPGRADE_LEVEL: 3,
  // Per-level bonuses
  VALUE_INCREASE_PER_LEVEL: 0.25, // +25% power value per upgrade
  COOLDOWN_REDUCTION_PER_LEVEL: 0.5, // -0.5s cooldown per upgrade
  MANA_COST_REDUCTION_PER_LEVEL: 0.1, // -10% mana cost per upgrade
  // Chance that one of the power offers will be an upgrade (if player has upgradeable powers)
  UPGRADE_OFFER_CHANCE: 0.5,
} as const;

// Union type for power choices (can be new power or upgrade)
export type PowerChoice = Power | PowerUpgradeOffer;

export function isPowerUpgrade(choice: PowerChoice): choice is PowerUpgradeOffer {
  return 'isUpgrade' in choice && choice.isUpgrade === true;
}

// Powers with increased mana costs and cooldowns for tighter resource management
export const UNLOCKABLE_POWERS: Power[] = [
  {
    id: 'lightning-bolt',
    name: 'Lightning Bolt',
    description: 'Strike with lightning for 170% damage',
    manaCost: 35, // Increased from 25
    cooldown: 3,  // Increased from 2
    currentCooldown: 0,
    effect: 'damage',
    value: 1.7,   // Reduced from 1.8
    icon: '⚡',
  },
  {
    id: 'ice-shard',
    name: 'Ice Shard',
    description: 'Freeze enemy, dealing 140% damage and slowing',
    manaCost: 30, // Increased from 20
    cooldown: 3,  // Increased from 2
    currentCooldown: 0,
    effect: 'damage',
    value: 1.4,   // Reduced from 1.5
    icon: '❄️',
  },
  {
    id: 'poison-cloud',
    name: 'Poison Cloud',
    description: 'Toxic cloud deals 110% damage over time',
    manaCost: 25, // Increased from 15
    cooldown: 4,  // Increased from 3
    currentCooldown: 0,
    effect: 'damage',
    value: 1.1,   // Reduced from 1.2
    icon: '☠️',
  },
  {
    id: 'battle-cry',
    name: 'Battle Cry',
    description: 'Boost attack by 50% for next 3 hits',
    manaCost: 40, // Increased from 30
    cooldown: 6,  // Increased from 5
    currentCooldown: 0,
    effect: 'buff',
    value: 0.5,
    icon: '📯',
  },
  {
    id: 'vampiric-touch',
    name: 'Vampiric Touch',
    description: 'Deal 90% damage and heal for amount dealt',
    manaCost: 45, // Increased from 35
    cooldown: 5,  // Increased from 4
    currentCooldown: 0,
    effect: 'damage',
    value: 0.9,   // Reduced from 1.0
    icon: '🩸',
  },
  {
    id: 'earthquake',
    name: 'Earthquake',
    description: 'Massive tremor deals 250% damage',
    manaCost: 60, // Increased from 50
    cooldown: 8,  // Increased from 6
    currentCooldown: 0,
    effect: 'damage',
    value: 2.5,   // Reduced from 3.0
    icon: '🌋',
  },
  {
    id: 'shield-wall',
    name: 'Shield Wall',
    description: 'Double defense for 3 turns',
    manaCost: 35, // Increased from 25
    cooldown: 6,  // Increased from 5
    currentCooldown: 0,
    effect: 'buff',
    value: 1.0,
    icon: '🛡️',
  },
  {
    id: 'mana-surge',
    name: 'Mana Surge',
    description: 'Restore 40% of max mana',
    manaCost: 0,
    cooldown: 12, // Increased from 8
    currentCooldown: 0,
    effect: 'heal',
    value: 0.4,   // Reduced from 0.5
    icon: '💠',
  },
];

export function getRandomPower(existingPowerIds: string[]): Power | null {
  const available = UNLOCKABLE_POWERS.filter(p => !existingPowerIds.includes(p.id));
  if (available.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * available.length);
  const selectedPower = available[randomIndex];
  if (!selectedPower) return null;
  return { ...selectedPower, currentCooldown: 0 };
}

/**
 * Get multiple random powers for player to choose from
 * Returns up to `count` powers, or fewer if not enough are available
 */
export function getRandomPowers(existingPowerIds: string[], count: number = 2): Power[] {
  const available = UNLOCKABLE_POWERS.filter(p => !existingPowerIds.includes(p.id));
  if (available.length === 0) return [];

  // Shuffle and take up to `count` powers
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, available.length)).map(p => ({ ...p, currentCooldown: 0 }));
}

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
  const manaReduction = Math.floor(POWER_UPGRADE_CONFIG.MANA_COST_REDUCTION_PER_LEVEL * 100);

  return {
    powerId: power.id,
    powerName: power.name,
    powerIcon: power.icon,
    currentLevel,
    newLevel,
    description: `+${valueIncrease}% power, -${cooldownReduction}s cooldown, -${manaReduction}% mana`,
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
  const manaCostMultiplier = 1 - (POWER_UPGRADE_CONFIG.MANA_COST_REDUCTION_PER_LEVEL * (newLevel - 1));

  // Find base power to get original values
  const basePower = UNLOCKABLE_POWERS.find(p => p.id === power.id);
  if (!basePower) return power;

  const newValue = Number((basePower.value * valueMultiplier).toFixed(2));
  const newCooldown = Math.max(1, basePower.cooldown - cooldownReduction);
  const newManaCost = Math.max(5, Math.floor(basePower.manaCost * manaCostMultiplier));

  // Generate new description based on effect type
  let newDescription = power.description;
  if (power.effect === 'damage') {
    newDescription = power.description.replace(/\d+%/, `${Math.floor(newValue * 100)}%`);
  }

  return {
    ...power,
    value: newValue,
    cooldown: newCooldown,
    manaCost: newManaCost,
    description: newDescription,
    upgradeLevel: newLevel,
    name: newLevel > 1 ? `${basePower.name} +${newLevel - 1}` : basePower.name,
  };
}

/**
 * Get power choices for player - mix of new powers and potential upgrades
 * @param existingPowers - Powers the player already has
 * @param count - Number of choices to offer
 */
export function getPowerChoices(existingPowers: Power[], count: number = 2): PowerChoice[] {
  const existingPowerIds = existingPowers.map(p => p.id);
  const choices: PowerChoice[] = [];

  // Get available new powers
  const availableNew = UNLOCKABLE_POWERS.filter(p => !existingPowerIds.includes(p.id));

  // Get upgradeable powers (not at max level)
  const upgradeablePowers = existingPowers.filter(p => {
    const level = p.upgradeLevel ?? 1;
    return level < POWER_UPGRADE_CONFIG.MAX_UPGRADE_LEVEL;
  });

  // Decide how many upgrades vs new powers to offer
  let upgradeCount = 0;
  if (upgradeablePowers.length > 0 && Math.random() < POWER_UPGRADE_CONFIG.UPGRADE_OFFER_CHANCE) {
    upgradeCount = 1; // Offer at least one upgrade if available
  }

  // Add upgrade offers
  if (upgradeCount > 0 && upgradeablePowers.length > 0) {
    const shuffledUpgradeable = [...upgradeablePowers].sort(() => Math.random() - 0.5);
    for (let i = 0; i < upgradeCount && i < shuffledUpgradeable.length; i++) {
      const power = shuffledUpgradeable[i];
      if (power) {
        const upgradeOffer = generatePowerUpgradeOffer(power);
        if (upgradeOffer) {
          choices.push(upgradeOffer);
        }
      }
    }
  }

  // Fill remaining slots with new powers
  const remainingSlots = count - choices.length;
  if (remainingSlots > 0 && availableNew.length > 0) {
    const shuffledNew = [...availableNew].sort(() => Math.random() - 0.5);
    for (let i = 0; i < remainingSlots && i < shuffledNew.length; i++) {
      const power = shuffledNew[i];
      if (power) {
        choices.push({ ...power, currentCooldown: 0, upgradeLevel: 1 });
      }
    }
  }

  // If we still don't have enough choices, fill with more upgrades
  if (choices.length < count && upgradeablePowers.length > choices.filter(c => isPowerUpgrade(c)).length) {
    const usedUpgradeIds = choices.filter(isPowerUpgrade).map(c => c.powerId);
    const remainingUpgradeable = upgradeablePowers.filter(p => !usedUpgradeIds.includes(p.id));
    const shuffled = [...remainingUpgradeable].sort(() => Math.random() - 0.5);

    for (let i = 0; choices.length < count && i < shuffled.length; i++) {
      const power = shuffled[i];
      if (power) {
        const upgradeOffer = generatePowerUpgradeOffer(power);
        if (upgradeOffer) {
          choices.push(upgradeOffer);
        }
      }
    }
  }

  return choices;
}
