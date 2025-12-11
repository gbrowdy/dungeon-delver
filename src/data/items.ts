import { Item, ItemType, Stats, ItemEffect } from '@/types/game';
import { ITEM_BALANCE, ITEM_EFFECTS as ITEM_EFFECT_VALUES } from '@/constants/balance';
import {
  ITEM_RARITY,
  ITEM_EFFECT_TRIGGER,
  EFFECT_TYPE,
} from '@/constants/enums';

const ITEM_TEMPLATES: Record<ItemType, { name: string; stat: keyof Stats; icon: string }[]> = {
  weapon: [
    { name: 'Sword', stat: 'attack', icon: '⚔️' },
    { name: 'Axe', stat: 'attack', icon: '🪓' },
    { name: 'Staff', stat: 'attack', icon: '🪄' },
    { name: 'Dagger', stat: 'critChance', icon: '🗡️' },
  ],
  armor: [
    { name: 'Plate Armor', stat: 'defense', icon: '🛡️' },
    { name: 'Chainmail', stat: 'defense', icon: '🦺' },
    { name: 'Leather Armor', stat: 'speed', icon: '🧥' },
    { name: 'Robe', stat: 'maxMana', icon: '👘' },
  ],
  accessory: [
    { name: 'Ring', stat: 'critChance', icon: '💍' },
    { name: 'Amulet', stat: 'maxHealth', icon: '📿' },
    { name: 'Belt', stat: 'defense', icon: '🎗️' },
    { name: 'Boots', stat: 'speed', icon: '👢' },
  ],
};

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

const RARITY_PREFIXES: Record<Rarity, string[]> = {
  common: ['Iron', 'Wooden', 'Simple', 'Basic'],
  uncommon: ['Steel', 'Reinforced', 'Quality', 'Fine'],
  rare: ['Enchanted', 'Magical', 'Glowing', 'Mystic'],
  epic: ['Ancient', 'Legendary', 'Divine', 'Celestial'],
  legendary: ['Godforged', 'Mythical', 'Eternal', 'Primordial'],
};

const RARITY_MULTIPLIERS: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2,
  epic: 3,
  legendary: 5,
};

// Item effects pool - rare+ items can have special effects
const ITEM_EFFECTS: Record<ItemType, ItemEffect[]> = {
  weapon: [
    { trigger: ITEM_EFFECT_TRIGGER.ON_CRIT, type: EFFECT_TYPE.DAMAGE, value: ITEM_EFFECT_VALUES.WEAPON.ON_CRIT_DAMAGE_BONUS, chance: 1, description: `Critical hits deal ${Math.floor(ITEM_EFFECT_VALUES.WEAPON.ON_CRIT_DAMAGE_BONUS * 100)}% bonus damage` },
    { trigger: ITEM_EFFECT_TRIGGER.ON_HIT, type: EFFECT_TYPE.HEAL, value: ITEM_EFFECT_VALUES.WEAPON.ON_HIT_HEAL, chance: ITEM_EFFECT_VALUES.WEAPON.ON_HIT_HEAL_CHANCE, description: `${Math.floor(ITEM_EFFECT_VALUES.WEAPON.ON_HIT_HEAL_CHANCE * 100)}% chance to heal ${ITEM_EFFECT_VALUES.WEAPON.ON_HIT_HEAL} HP on hit` },
    { trigger: ITEM_EFFECT_TRIGGER.ON_KILL, type: EFFECT_TYPE.MANA, value: ITEM_EFFECT_VALUES.WEAPON.ON_KILL_MANA, chance: 1, description: `Restore ${ITEM_EFFECT_VALUES.WEAPON.ON_KILL_MANA} mana on kill` },
    { trigger: ITEM_EFFECT_TRIGGER.ON_HIT, type: EFFECT_TYPE.DAMAGE, value: ITEM_EFFECT_VALUES.WEAPON.ON_HIT_DAMAGE, chance: ITEM_EFFECT_VALUES.WEAPON.ON_HIT_DAMAGE_CHANCE, description: `${Math.floor(ITEM_EFFECT_VALUES.WEAPON.ON_HIT_DAMAGE_CHANCE * 100)}% chance to deal ${ITEM_EFFECT_VALUES.WEAPON.ON_HIT_DAMAGE} bonus damage` },
  ],
  armor: [
    { trigger: ITEM_EFFECT_TRIGGER.COMBAT_START, type: EFFECT_TYPE.BUFF, value: ITEM_EFFECT_VALUES.ARMOR.COMBAT_START_DEFENSE, chance: 1, description: `Start combat with +${ITEM_EFFECT_VALUES.ARMOR.COMBAT_START_DEFENSE} defense` },
    { trigger: ITEM_EFFECT_TRIGGER.ON_DAMAGED, type: EFFECT_TYPE.HEAL, value: ITEM_EFFECT_VALUES.ARMOR.ON_DAMAGED_HEAL, chance: ITEM_EFFECT_VALUES.ARMOR.ON_DAMAGED_HEAL_CHANCE, description: `${Math.floor(ITEM_EFFECT_VALUES.ARMOR.ON_DAMAGED_HEAL_CHANCE * 100)}% chance to heal ${ITEM_EFFECT_VALUES.ARMOR.ON_DAMAGED_HEAL} HP when hit` },
    { trigger: ITEM_EFFECT_TRIGGER.TURN_START, type: EFFECT_TYPE.HEAL, value: ITEM_EFFECT_VALUES.ARMOR.TURN_START_HEAL, chance: 1, description: `Regenerate ${ITEM_EFFECT_VALUES.ARMOR.TURN_START_HEAL} HP per turn` },
    { trigger: ITEM_EFFECT_TRIGGER.ON_DAMAGED, type: EFFECT_TYPE.MANA, value: ITEM_EFFECT_VALUES.ARMOR.ON_DAMAGED_MANA, chance: ITEM_EFFECT_VALUES.ARMOR.ON_DAMAGED_MANA_CHANCE, description: `${Math.floor(ITEM_EFFECT_VALUES.ARMOR.ON_DAMAGED_MANA_CHANCE * 100)}% chance to gain ${ITEM_EFFECT_VALUES.ARMOR.ON_DAMAGED_MANA} mana when hit` },
  ],
  accessory: [
    { trigger: ITEM_EFFECT_TRIGGER.COMBAT_START, type: EFFECT_TYPE.MANA, value: ITEM_EFFECT_VALUES.ACCESSORY.COMBAT_START_MANA, chance: 1, description: `Start combat with +${ITEM_EFFECT_VALUES.ACCESSORY.COMBAT_START_MANA} mana` },
    { trigger: ITEM_EFFECT_TRIGGER.ON_CRIT, type: EFFECT_TYPE.HEAL, value: ITEM_EFFECT_VALUES.ACCESSORY.ON_CRIT_HEAL, chance: 1, description: `Critical hits heal ${ITEM_EFFECT_VALUES.ACCESSORY.ON_CRIT_HEAL} HP` },
    { trigger: ITEM_EFFECT_TRIGGER.TURN_START, type: EFFECT_TYPE.MANA, value: ITEM_EFFECT_VALUES.ACCESSORY.TURN_START_MANA, chance: 1, description: `Regenerate ${ITEM_EFFECT_VALUES.ACCESSORY.TURN_START_MANA} mana per turn` },
    { trigger: ITEM_EFFECT_TRIGGER.ON_KILL, type: EFFECT_TYPE.HEAL, value: ITEM_EFFECT_VALUES.ACCESSORY.ON_KILL_HEAL, chance: 1, description: `Heal ${ITEM_EFFECT_VALUES.ACCESSORY.ON_KILL_HEAL} HP on kill` },
  ],
};

/**
 * Get a random effect for an item based on its type and rarity
 */
function getItemEffect(itemType: ItemType, rarity: Rarity): ItemEffect | undefined {
  // Only rare+ items get effects
  if (rarity === ITEM_RARITY.COMMON || rarity === ITEM_RARITY.UNCOMMON) {
    return undefined;
  }

  // Chance to have an effect based on rarity
  const effectChance = rarity === ITEM_RARITY.RARE
    ? ITEM_BALANCE.EFFECT_CHANCE_RARE
    : rarity === ITEM_RARITY.EPIC
      ? ITEM_BALANCE.EFFECT_CHANCE_EPIC
      : ITEM_BALANCE.EFFECT_CHANCE_LEGENDARY;
  if (Math.random() > effectChance) {
    return undefined;
  }

  const effects = ITEM_EFFECTS[itemType];
  const effect = effects[Math.floor(Math.random() * effects.length)];
  if (!effect) return undefined;

  // Scale effect value with rarity
  const scaledEffect = { ...effect };
  if (rarity === ITEM_RARITY.EPIC) {
    scaledEffect.value = Math.floor(scaledEffect.value * ITEM_BALANCE.VALUE_MULTIPLIER_EPIC);
  } else if (rarity === ITEM_RARITY.LEGENDARY) {
    scaledEffect.value = Math.floor(scaledEffect.value * ITEM_BALANCE.VALUE_MULTIPLIER_LEGENDARY);
    // Legendary items have better proc chances
    if (scaledEffect.chance && scaledEffect.chance < 1) {
      scaledEffect.chance = Math.min(1, scaledEffect.chance * ITEM_BALANCE.PROC_CHANCE_MULTIPLIER_LEGENDARY);
    }
  }

  return scaledEffect;
}

/**
 * Generate an item with optional pity system boost.
 * @param floor - Current floor for stat scaling
 * @param forceType - Force a specific item type
 * @param pityCounter - Number of non-rare items since last rare+ (for pity boost)
 * @returns Object with item and whether it's rare+ (for pity counter management)
 */
export function generateItem(floor: number, forceType?: ItemType, pityCounter: number = 0): Item {
  let rarityRoll = Math.random();

  // Apply pity boost if counter is at threshold
  // Boost shifts the roll toward higher rarity by reducing effective roll value
  if (pityCounter >= ITEM_BALANCE.PITY_THRESHOLD) {
    // Shift roll down to increase chance of rare+
    // A roll of 0.8 with 0.25 boost becomes 0.55, which hits rare threshold
    rarityRoll = Math.max(0, rarityRoll - ITEM_BALANCE.PITY_RARITY_BOOST);
  }

  let rarity: Rarity;

  if (rarityRoll < ITEM_BALANCE.RARITY_THRESHOLD_COMMON) rarity = ITEM_RARITY.COMMON;
  else if (rarityRoll < ITEM_BALANCE.RARITY_THRESHOLD_UNCOMMON) rarity = ITEM_RARITY.UNCOMMON;
  else if (rarityRoll < ITEM_BALANCE.RARITY_THRESHOLD_RARE) rarity = ITEM_RARITY.RARE;
  else if (rarityRoll < ITEM_BALANCE.RARITY_THRESHOLD_EPIC) rarity = ITEM_RARITY.EPIC;
  else rarity = ITEM_RARITY.LEGENDARY;

  const itemTypes: ItemType[] = ['weapon', 'armor', 'accessory'];
  const randomIndex = Math.floor(Math.random() * itemTypes.length);
  const itemType: ItemType = forceType ?? itemTypes[randomIndex] ?? 'weapon';
  const templates = ITEM_TEMPLATES[itemType];
  const templateIndex = Math.floor(Math.random() * templates.length);
  const template = templates[templateIndex];

  if (!template) {
    throw new Error(`No template found for item type: ${itemType}`);
  }

  const prefixes = RARITY_PREFIXES[rarity];
  const prefixIndex = Math.floor(Math.random() * prefixes.length);
  const prefix = prefixes[prefixIndex];

  if (!prefix) {
    throw new Error(`No prefix found for rarity: ${rarity}`);
  }

  const baseValue = ITEM_BALANCE.BASE_STAT_VALUE + floor * ITEM_BALANCE.STAT_VALUE_PER_FLOOR;
  // Ensure value is at least 1 to prevent division by zero issues
  const value = Math.max(1, Math.floor(baseValue * RARITY_MULTIPLIERS[rarity]));

  const statBonus: Partial<Stats> = {
    [template.stat]: value,
  };

  // Epic and legendary items get bonus stats
  if (rarity === ITEM_RARITY.EPIC || rarity === ITEM_RARITY.LEGENDARY) {
    const bonusStats: (keyof Stats)[] = ['attack', 'defense', 'maxHealth', 'speed', 'critChance'];
    const bonusStatIndex = Math.floor(Math.random() * bonusStats.length);
    const bonusStat = bonusStats[bonusStatIndex];
    if (bonusStat && bonusStat !== template.stat) {
      statBonus[bonusStat] = Math.floor(value * ITEM_BALANCE.BONUS_STAT_RATIO);
    }
  }

  // Get special effect for rare+ items
  const effect = getItemEffect(itemType, rarity);

  // Build description including effect
  let description = `A ${rarity} ${template.name.toLowerCase()} that enhances your abilities.`;
  if (effect) {
    description += ` ${effect.description}.`;
  }

  return {
    id: `item-${Date.now()}-${Math.random()}`,
    name: `${prefix} ${template.name}`,
    type: itemType,
    rarity,
    statBonus,
    description,
    icon: template.icon,
    effect,
  };
}

export function getItemPrice(item: Item): number {
  const values = Object.values(item.statBonus) as number[];
  const basePrice = values.reduce((sum, val) => sum + (val || 0), 0) * ITEM_BALANCE.PRICE_BASE_MULTIPLIER;
  const multiplier = ITEM_BALANCE.PRICE_RARITY_MULTIPLIER[item.rarity as Rarity] ?? 1;
  return Math.floor(basePrice * multiplier);
}

/**
 * Check if an item is rare quality or higher.
 * Used for pity system to know when to reset the counter.
 */
export function isRareOrBetter(item: Item): boolean {
  return item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary';
}

/**
 * Generate a starting item for a character class.
 * Always common rarity, floor 0 stats.
 */
export function generateStartingItem(itemType: ItemType): Item {
  const rarity: Rarity = ITEM_RARITY.COMMON;

  const templates = ITEM_TEMPLATES[itemType];
  const templateIndex = Math.floor(Math.random() * templates.length);
  const template = templates[templateIndex];

  if (!template) {
    throw new Error(`No template found for item type: ${itemType}`);
  }

  // Floor 0 stats - weaker starting gear
  const baseValue = ITEM_BALANCE.BASE_STAT_VALUE;
  // Ensure value is at least 1 to prevent division by zero issues
  const value = Math.max(1, Math.floor(baseValue * RARITY_MULTIPLIERS[rarity]));

  const statBonus: Partial<Stats> = {
    [template.stat]: value,
  };

  const description = `A worn but serviceable ${template.name.toLowerCase()}.`;

  return {
    id: `starter-${itemType}-${Date.now()}`,
    name: `Worn ${template.name}`,
    type: itemType,
    rarity,
    statBonus,
    description,
    icon: template.icon,
  };
}
