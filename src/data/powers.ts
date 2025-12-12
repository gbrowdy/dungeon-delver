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

/**
 * POWER CATEGORIES:
 *
 * Powers are VERBS, not numbers. Each power does something mechanically distinct.
 *
 * - STRIKE: Single reliable hit (Crushing Blow, Power Strike)
 * - BURST: Multiple small hits that proc on-hit effects (Fan of Knives, Flurry)
 * - EXECUTE: Bonus damage vs low HP enemies (Ambush, Coup de Grace)
 * - CONTROL: Change combat flow (Frost Nova, Stunning Blow)
 * - BUFF: Temporary stat boost (Battle Cry, Inner Focus)
 * - SACRIFICE: Spend HP for effect (Reckless Swing, Blood Pact)
 * - HEAL: Restore HP (Divine Heal, Regeneration)
 */

// Path synergy interface for power definitions
interface PowerSynergy {
  pathId: string;
  description: string;
}

interface PowerDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  manaCost: number;
  cooldown: number;
  category: 'strike' | 'burst' | 'execute' | 'control' | 'buff' | 'sacrifice' | 'heal';
  effect: 'damage' | 'heal' | 'buff' | 'debuff';
  value: number;
  synergies: PowerSynergy[];
  maxLevel?: number;
  additionalEffects?: string;
}

/**
 * UNLOCKABLE POWERS
 *
 * Redesigned with verb-focused mechanics and path synergies.
 * Each power has a unique mechanical identity.
 */
const POWER_DEFINITIONS: PowerDefinition[] = [
  // ============================================================================
  // STRIKE POWERS - Single reliable hits
  // ============================================================================
  {
    id: 'crushing-blow',
    name: 'Crushing Blow',
    description: 'A devastating single strike dealing 150% damage',
    icon: '🔨',
    manaCost: 30,
    cooldown: 5,
    category: 'strike',
    effect: 'damage',
    value: 1.5,
    synergies: [
      { pathId: 'berserker', description: 'Low HP bonuses increase damage' },
      { pathId: 'guardian', description: 'Triggers counter-attack effects' },
      { pathId: 'paladin_crusader', description: 'Deals bonus holy damage' },
    ],
  },
  {
    id: 'power-strike',
    name: 'Power Strike',
    description: 'Basic but effective strike dealing 120% damage',
    icon: '⚡',
    manaCost: 20,
    cooldown: 3,
    category: 'strike',
    effect: 'damage',
    value: 1.2,
    synergies: [
      { pathId: 'guardian', description: 'Benefits from armor scaling' },
      { pathId: 'paladin_protector', description: 'Grants HP regen on hit' },
    ],
  },

  // ============================================================================
  // BURST POWERS - Multiple hits (great for on-hit procs)
  // ============================================================================
  {
    id: 'fan-of-knives',
    name: 'Fan of Knives',
    description: '5 quick hits of 30% damage each (150% total, procs on-hit effects)',
    icon: '🗡️',
    manaCost: 35,
    cooldown: 6,
    category: 'burst',
    effect: 'damage',
    value: 1.5, // Total damage, delivered as 5x 0.3
    synergies: [
      { pathId: 'assassin', description: 'Each hit can crit independently' },
      { pathId: 'duelist', description: 'Triggers riposte effects multiple times' },
    ],
    additionalEffects: 'Hits 5 times for 30% damage each',
  },
  {
    id: 'flurry',
    name: 'Flurry',
    description: '3 rapid strikes of 50% damage each (150% total)',
    icon: '💨',
    manaCost: 25,
    cooldown: 4,
    category: 'burst',
    effect: 'damage',
    value: 1.5,
    synergies: [
      { pathId: 'berserker', description: 'Speed bonuses reduce cooldown' },
      { pathId: 'assassin', description: 'Builds kill chain momentum' },
    ],
    additionalEffects: 'Hits 3 times for 50% damage each',
  },

  // ============================================================================
  // EXECUTE POWERS - Bonus vs low HP enemies
  // ============================================================================
  {
    id: 'ambush',
    name: 'Ambush',
    description: 'Deal 100% damage, doubled against enemies below 25% HP',
    icon: '🎯',
    manaCost: 30,
    cooldown: 5,
    category: 'execute',
    effect: 'damage',
    value: 1.0,
    synergies: [
      { pathId: 'assassin', description: 'Guaranteed crit on execute' },
      { pathId: 'berserker', description: 'Resets cooldown on kill' },
    ],
    additionalEffects: 'Deals 200% damage to enemies below 25% HP',
  },
  {
    id: 'coup-de-grace',
    name: 'Coup de Grace',
    description: 'Massive 250% damage strike to enemies below 30% HP, else 80%',
    icon: '💀',
    manaCost: 40,
    cooldown: 8,
    category: 'execute',
    effect: 'damage',
    value: 0.8,
    synergies: [
      { pathId: 'berserker', description: 'Executioner synergy amplifies damage' },
      { pathId: 'assassin', description: 'Instantly resets on kill' },
    ],
    additionalEffects: 'Deals 250% damage to enemies below 30% HP',
  },

  // ============================================================================
  // CONTROL POWERS - Change combat flow
  // ============================================================================
  {
    id: 'frost-nova',
    name: 'Frost Nova',
    description: 'Deal 110% damage and slow enemy attack speed by 30% for 4s',
    icon: '❄️',
    manaCost: 35,
    cooldown: 6,
    category: 'control',
    effect: 'debuff',
    value: 1.1,
    synergies: [
      { pathId: 'archmage', description: 'Elementalist combos with ice affinity' },
      { pathId: 'enchanter', description: 'DoT effects extended' },
    ],
    additionalEffects: 'Slows enemy by 30% for 4 seconds',
  },
  {
    id: 'stunning-blow',
    name: 'Stunning Blow',
    description: 'Deal 100% damage with 40% chance to stun for 2s',
    icon: '⚡',
    manaCost: 30,
    cooldown: 5,
    category: 'control',
    effect: 'debuff',
    value: 1.0,
    synergies: [
      { pathId: 'berserker', description: 'Warlord increases stun chance' },
      { pathId: 'guardian', description: 'Extends stun duration' },
    ],
    additionalEffects: '40% chance to stun for 2 seconds',
  },

  // ============================================================================
  // BUFF POWERS - Temporary stat boosts
  // ============================================================================
  {
    id: 'battle-cry',
    name: 'Battle Cry',
    description: 'Gain +50% Power and +30% Speed for 6 seconds',
    icon: '📯',
    manaCost: 40,
    cooldown: 10,
    category: 'buff',
    effect: 'buff',
    value: 0.5,
    synergies: [
      { pathId: 'berserker', description: 'Battle Trance reduces cooldown' },
      { pathId: 'paladin_crusader', description: 'Amplifies smite damage' },
    ],
    additionalEffects: 'Also grants +30% Speed',
  },
  {
    id: 'inner-focus',
    name: 'Inner Focus',
    description: 'Gain +40% Fortune (crit/dodge/proc chance) for 5 seconds',
    icon: '✨',
    manaCost: 30,
    cooldown: 8,
    category: 'buff',
    effect: 'buff',
    value: 0.4,
    synergies: [
      { pathId: 'assassin', description: 'Shadowblade crit synergies activate' },
      { pathId: 'duelist', description: 'Boosts dodge-based procs' },
    ],
  },

  // ============================================================================
  // SACRIFICE POWERS - Spend HP for effect
  // ============================================================================
  {
    id: 'reckless-swing',
    name: 'Reckless Swing',
    description: 'Spend 15% max HP to deal 200% damage',
    icon: '🩸',
    manaCost: 25,
    cooldown: 4,
    category: 'sacrifice',
    effect: 'damage',
    value: 2.0,
    synergies: [
      { pathId: 'berserker', description: 'Lowers HP to trigger damage bonuses' },
      { pathId: 'paladin_protector', description: 'Martyr benefits from sacrifice' },
    ],
    additionalEffects: 'Costs 15% max HP',
  },
  {
    id: 'blood-pact',
    name: 'Blood Pact',
    description: 'Spend 20% max HP to restore 50 mana',
    icon: '💉',
    manaCost: 0,
    cooldown: 12,
    category: 'sacrifice',
    effect: 'heal',
    value: 50,
    synergies: [
      { pathId: 'berserker', description: 'Reckless Fury converts HP to mana' },
      { pathId: 'archmage', description: 'Enables more spell casts' },
    ],
    additionalEffects: 'Costs 20% max HP, restores mana instead of HP',
  },

  // ============================================================================
  // HEAL POWERS - Restore HP
  // ============================================================================
  {
    id: 'divine-heal',
    name: 'Divine Heal',
    description: 'Restore 60% of max HP',
    icon: '✝️',
    manaCost: 40,
    cooldown: 10,
    category: 'heal',
    effect: 'heal',
    value: 0.6,
    synergies: [
      { pathId: 'paladin_protector', description: 'Sentinel boosts healing received' },
      { pathId: 'guardian', description: 'Synergizes with regen effects' },
    ],
  },
  {
    id: 'regeneration',
    name: 'Regeneration',
    description: 'Restore 10% max HP immediately, then 3% per second for 5s',
    icon: '💚',
    manaCost: 30,
    cooldown: 8,
    category: 'heal',
    effect: 'heal',
    value: 0.1,
    synergies: [
      { pathId: 'paladin_protector', description: 'Regen scaling amplifies HoT' },
      { pathId: 'enchanter', description: 'DoT amplification extends duration' },
    ],
    additionalEffects: 'Heals 3% max HP per second for 5 seconds (25% total)',
  },

  // ============================================================================
  // ADDITIONAL UNIQUE POWERS
  // ============================================================================
  {
    id: 'earthquake',
    name: 'Earthquake',
    description: 'Massive tremor deals 250% damage',
    icon: '🌋',
    manaCost: 60,
    cooldown: 12,
    category: 'strike',
    effect: 'damage',
    value: 2.5,
    synergies: [
      { pathId: 'berserker', description: 'Devastating at low HP' },
      { pathId: 'archmage', description: 'Destroyer amplifies spell power' },
    ],
  },
  {
    id: 'vampiric-touch',
    name: 'Vampiric Touch',
    description: 'Deal 120% damage and heal for 100% of damage dealt',
    icon: '🦇',
    manaCost: 45,
    cooldown: 7,
    category: 'heal',
    effect: 'damage',
    value: 1.2,
    synergies: [
      { pathId: 'berserker', description: 'Bloodbath synergy sustains berserker' },
      { pathId: 'paladin_protector', description: 'Healing amplification applies' },
    ],
    additionalEffects: 'Heals for 100% of damage dealt',
  },
];

// Convert PowerDefinition to Power for compatibility
export const UNLOCKABLE_POWERS: Power[] = POWER_DEFINITIONS.map(def => ({
  id: def.id,
  name: def.name,
  description: def.description,
  manaCost: def.manaCost,
  cooldown: def.cooldown,
  currentCooldown: 0,
  effect: def.effect,
  value: def.value,
  icon: def.icon,
  category: def.category,
  synergies: def.synergies,
}));

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
