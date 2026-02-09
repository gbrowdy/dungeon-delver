import type { Power, PowerUpgradeOffer } from '@/types/game';
import { UNLOCKABLE_POWERS } from './definitions';
import { POWER_UPGRADE_CONFIG, generatePowerUpgradeOffer } from './upgrades';

// Union type for power choices (can be new power or upgrade)
export type PowerChoice = Power | PowerUpgradeOffer;

export function isPowerUpgrade(choice: PowerChoice): choice is PowerUpgradeOffer {
  return 'isUpgrade' in choice && choice.isUpgrade === true;
}

export function getRandomPower(existingPowerIds: string[]): Power | null {
  const available = UNLOCKABLE_POWERS.filter(p => !existingPowerIds.includes(p.id));
  if (available.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * available.length);
  const selectedPower = available[randomIndex];
  if (!selectedPower) return null;
  return { ...selectedPower };
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
  return shuffled.slice(0, Math.min(count, available.length)).map(p => ({ ...p }));
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
        choices.push({ ...power, upgradeLevel: 1 });
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
