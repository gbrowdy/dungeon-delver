// Placeholder types until shop.ts is merged
interface ShopItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory';
  price: number;
  stats: Partial<{
    health: number;
    maxHealth: number;
    power: number;
    armor: number;
    speed: number;
    fortune: number;
  }>;
  tier: 'starter' | 'class' | 'specialty' | 'legendary';
  icon: string; // Lucide icon name
  description: string;
  classRestriction?: 'warrior' | 'mage' | 'rogue' | 'paladin';
  pathRestriction?: string; // Path ID (e.g., 'berserker', 'guardian')
  effectDescription?: string; // Special effect description
}

interface ClassGearSet {
  base: ShopItem[];           // 3 items before path choice
  paths: {
    [pathId: string]: ShopItem[];  // 3 items after path choice
  };
}

type CharacterClass = 'warrior' | 'mage' | 'rogue' | 'paladin';

/**
 * Class Gear - Class-specific equipment available in the shop
 * All items cost 120 gold and synergize with class/path identity
 *
 * Structure:
 * - base: 3 items available before path choice (pre-level 2)
 * - paths: 3 items per path, available after path choice
 *   - Path items REPLACE the base items in the shop
 */
export const CLASS_GEAR: Record<CharacterClass, ClassGearSet> = {
  // ============================================================================
  // WARRIOR CLASS GEAR
  // ============================================================================
  warrior: {
    base: [
      {
        id: 'warrior_blade',
        name: "Warrior's Blade",
        type: 'weapon',
        price: 120,
        stats: { power: 4, fortune: 5 },
        tier: 'class',
        icon: 'Sword',
        description: '+4 Power, +5 Fortune. A battle-tested blade.',
        classRestriction: 'warrior',
      },
      {
        id: 'warrior_plate',
        name: "Warrior's Plate",
        type: 'armor',
        price: 120,
        stats: { armor: 3, maxHealth: 15 },
        tier: 'class',
        icon: 'ShieldCheck',
        description: '+3 Armor, +15 Health. Heavy plate armor.',
        classRestriction: 'warrior',
      },
      {
        id: 'warrior_sigil',
        name: "Warrior's Sigil",
        type: 'accessory',
        price: 120,
        stats: { power: 2, speed: 2 },
        tier: 'class',
        icon: 'Flame',
        description: '+2 Power, +2 Speed. Powers cool down 10% faster.',
        classRestriction: 'warrior',
        effectDescription: '-10% power cooldowns',
      },
    ],
    paths: {
      // Berserker path - offensive, low HP bonuses
      berserker: [
        {
          id: 'berserker_blade',
          name: "Berserker's Blade",
          type: 'weapon',
          price: 120,
          stats: { power: 5, fortune: 8 },
          tier: 'class',
          icon: 'Axe',
          description: '+5 Power, +8 Fortune. Deal 10% more damage when below 50% HP.',
          classRestriction: 'warrior',
          pathRestriction: 'berserker',
          effectDescription: '+10% damage when below 50% HP',
        },
        {
          id: 'warrior_plate_berserker',
          name: "Warrior's Plate",
          type: 'armor',
          price: 120,
          stats: { armor: 3, maxHealth: 15 },
          tier: 'class',
          icon: 'ShieldCheck',
          description: '+3 Armor, +15 Health. Heavy plate armor.',
          classRestriction: 'warrior',
          pathRestriction: 'berserker',
        },
        {
          id: 'rage_sigil',
          name: 'Rage Sigil',
          type: 'accessory',
          price: 120,
          stats: { power: 3, speed: 3 },
          tier: 'class',
          icon: 'Zap',
          description: '+3 Power, +3 Speed. Berserker Rage also grants +15% attack speed.',
          classRestriction: 'warrior',
          pathRestriction: 'berserker',
          effectDescription: 'Berserker Rage: +15% attack speed',
        },
      ],
      // Guardian path - defensive, tanking
      guardian: [
        {
          id: 'guardian_sword',
          name: "Guardian's Sword",
          type: 'weapon',
          price: 120,
          stats: { power: 3, armor: 2 },
          tier: 'class',
          icon: 'Sword',
          description: '+3 Power, +2 Armor. Defensive blade.',
          classRestriction: 'warrior',
          pathRestriction: 'guardian',
        },
        {
          id: 'fortress_plate',
          name: 'Fortress Plate',
          type: 'armor',
          price: 120,
          stats: { armor: 5, maxHealth: 20 },
          tier: 'class',
          icon: 'Shield',
          description: '+5 Armor, +20 Health. Impenetrable defense.',
          classRestriction: 'warrior',
          pathRestriction: 'guardian',
        },
        {
          id: 'guardian_amulet',
          name: "Guardian's Amulet",
          type: 'accessory',
          price: 120,
          stats: { maxHealth: 15, armor: 2 },
          tier: 'class',
          icon: 'Heart',
          description: '+15 Health, +2 Armor. Defensive abilities cost less.',
          classRestriction: 'warrior',
          pathRestriction: 'guardian',
          effectDescription: 'Defense: -5 resource cost',
        },
      ],
    },
  },

  // ============================================================================
  // MAGE CLASS GEAR
  // ============================================================================
  mage: {
    base: [
      {
        id: 'mage_staff',
        name: "Mage's Staff",
        type: 'weapon',
        price: 120,
        stats: { power: 7, fortune: 3 },
        tier: 'class',
        icon: 'Wand2',
        description: '+7 Power, +3 Fortune. Arcane-infused staff.',
        classRestriction: 'mage',
      },
      {
        id: 'mage_robes',
        name: "Mage's Robes",
        type: 'armor',
        price: 120,
        stats: { armor: 2, maxHealth: 15 },
        tier: 'class',
        icon: 'Shirt',
        description: '+2 Armor, +15 Max HP. Enchanted robes.',
        classRestriction: 'mage',
      },
      {
        id: 'mage_focus',
        name: "Mage's Focus",
        type: 'accessory',
        price: 120,
        stats: { power: 4, fortune: 5 },
        tier: 'class',
        icon: 'Sparkles',
        description: '+4 Power, +5 Fortune. Enhances spell precision.',
        classRestriction: 'mage',
        effectDescription: '+5% spell crit chance',
      },
    ],
    paths: {
      // Archmage path - active spell damage
      archmage: [
        {
          id: 'archmage_staff',
          name: "Archmage's Staff",
          type: 'weapon',
          price: 120,
          stats: { power: 7, fortune: 5 },
          tier: 'class',
          icon: 'Sparkles',
          description: '+7 Power, +5 Fortune. Spell crits deal 25% more damage.',
          classRestriction: 'mage',
          pathRestriction: 'archmage',
          effectDescription: 'Spell crits: +25% damage',
        },
        {
          id: 'mage_robes_archmage',
          name: "Archmage's Robes",
          type: 'armor',
          price: 120,
          stats: { armor: 2, maxHealth: 20 },
          tier: 'class',
          icon: 'Shirt',
          description: '+2 Armor, +20 Max HP. Robes infused with arcane energy.',
          classRestriction: 'mage',
          pathRestriction: 'archmage',
        },
        {
          id: 'spell_focus',
          name: 'Spell Focus',
          type: 'accessory',
          price: 120,
          stats: { power: 5, fortune: 5 },
          tier: 'class',
          icon: 'Zap',
          description: '+5 Power, +5 Fortune. Fireball cooldown reduced by 15%.',
          classRestriction: 'mage',
          pathRestriction: 'archmage',
          effectDescription: 'Fireball: -15% cooldown',
        },
      ],
      // Enchanter path - passive auras
      enchanter: [
        {
          id: 'enchanter_wand',
          name: "Enchanter's Wand",
          type: 'weapon',
          price: 120,
          stats: { power: 6, fortune: 4 },
          tier: 'class',
          icon: 'Wand2',
          description: '+6 Power, +4 Fortune. Aura-enhanced casting.',
          classRestriction: 'mage',
          pathRestriction: 'enchanter',
          effectDescription: '+2 HP regen/sec',
        },
        {
          id: 'enchanted_vestments',
          name: 'Enchanted Vestments',
          type: 'armor',
          price: 120,
          stats: { armor: 3, maxHealth: 20 },
          tier: 'class',
          icon: 'Sparkles',
          description: '+3 Armor, +20 Max HP. Aura effects 10% stronger.',
          classRestriction: 'mage',
          pathRestriction: 'enchanter',
          effectDescription: 'Auras: +10% effectiveness',
        },
        {
          id: 'auto_focus',
          name: 'Auto-Cast Focus',
          type: 'accessory',
          price: 120,
          stats: { power: 5, fortune: 5 },
          tier: 'class',
          icon: 'Sparkles',
          description: '+5 Power, +5 Fortune. Auto-effects trigger 10% more often.',
          classRestriction: 'mage',
          pathRestriction: 'enchanter',
          effectDescription: 'Auto-effects: +10% trigger rate',
        },
      ],
    },
  },

  // ============================================================================
  // ROGUE CLASS GEAR
  // ============================================================================
  rogue: {
    base: [
      {
        id: 'rogue_dagger',
        name: "Rogue's Dagger",
        type: 'weapon',
        price: 120,
        stats: { power: 4, fortune: 8 },
        tier: 'class',
        icon: 'Sword',
        description: '+4 Power, +8 Fortune. A swift, deadly blade.',
        classRestriction: 'rogue',
      },
      {
        id: 'rogue_leather',
        name: "Rogue's Leathers",
        type: 'armor',
        price: 120,
        stats: { armor: 2, speed: 3 },
        tier: 'class',
        icon: 'Shirt',
        description: '+2 Armor, +3 Speed. Light, flexible armor.',
        classRestriction: 'rogue',
      },
      {
        id: 'rogue_charm',
        name: "Rogue's Charm",
        type: 'accessory',
        price: 120,
        stats: { fortune: 10, speed: 2 },
        tier: 'class',
        icon: 'CircleDot',
        description: '+10 Fortune, +2 Speed. Critical hits build momentum.',
        classRestriction: 'rogue',
        effectDescription: 'On crit: +1 momentum',
      },
    ],
    paths: {
      // Assassin path - burst damage, crits
      assassin: [
        {
          id: 'assassin_blade',
          name: "Assassin's Blade",
          type: 'weapon',
          price: 120,
          stats: { power: 5, fortune: 12 },
          tier: 'class',
          icon: 'Sword',
          description: '+5 Power, +12 Fortune. Critical strikes deal 25% more damage.',
          classRestriction: 'rogue',
          pathRestriction: 'assassin',
          effectDescription: 'Crits: +25% damage',
        },
        {
          id: 'rogue_leather_assassin',
          name: "Rogue's Leathers",
          type: 'armor',
          price: 120,
          stats: { armor: 2, speed: 3 },
          tier: 'class',
          icon: 'Shirt',
          description: '+2 Armor, +3 Speed. Light, flexible armor.',
          classRestriction: 'rogue',
          pathRestriction: 'assassin',
        },
        {
          id: 'assassin_mark',
          name: "Assassin's Mark",
          type: 'accessory',
          price: 120,
          stats: { power: 3, fortune: 10 },
          tier: 'class',
          icon: 'Target',
          description: '+3 Power, +10 Fortune. Shadow Strike has no cooldown.',
          classRestriction: 'rogue',
          pathRestriction: 'assassin',
          effectDescription: 'Shadow Strike: no cooldown',
        },
      ],
      // Duelist path - dodge, counter-attack
      duelist: [
        {
          id: 'duelist_rapier',
          name: "Duelist's Rapier",
          type: 'weapon',
          price: 120,
          stats: { power: 4, speed: 4 },
          tier: 'class',
          icon: 'Sword',
          description: '+4 Power, +4 Speed. Counter-attack after dodging (50% power).',
          classRestriction: 'rogue',
          pathRestriction: 'duelist',
          effectDescription: 'On dodge: counter-attack for 50% power',
        },
        {
          id: 'duelist_cloak',
          name: "Duelist's Cloak",
          type: 'armor',
          price: 120,
          stats: { armor: 1, fortune: 8, speed: 4 },
          tier: 'class',
          icon: 'Wind',
          description: '+1 Armor, +8 Fortune, +4 Speed. Evasion enhanced.',
          classRestriction: 'rogue',
          pathRestriction: 'duelist',
        },
        {
          id: 'duelist_pendant',
          name: "Duelist's Pendant",
          type: 'accessory',
          price: 120,
          stats: { fortune: 12, speed: 3 },
          tier: 'class',
          icon: 'Sparkles',
          description: '+12 Fortune, +3 Speed. Dodging builds momentum.',
          classRestriction: 'rogue',
          pathRestriction: 'duelist',
          effectDescription: 'On dodge: +2 momentum',
        },
      ],
    },
  },

  // ============================================================================
  // PALADIN CLASS GEAR
  // ============================================================================
  paladin: {
    base: [
      {
        id: 'paladin_mace',
        name: "Paladin's Mace",
        type: 'weapon',
        price: 120,
        stats: { power: 3, armor: 1 },
        tier: 'class',
        icon: 'Hammer',
        description: '+3 Power, +1 Armor. Holy-blessed weapon.',
        classRestriction: 'paladin',
      },
      {
        id: 'paladin_shield',
        name: "Paladin's Shield",
        type: 'armor',
        price: 120,
        stats: { armor: 4, maxHealth: 15 },
        tier: 'class',
        icon: 'Shield',
        description: '+4 Armor, +15 Health. Blessed protection.',
        classRestriction: 'paladin',
      },
      {
        id: 'paladin_holy_symbol',
        name: 'Holy Symbol',
        type: 'accessory',
        price: 120,
        stats: { fortune: 5, maxHealth: 15 },
        tier: 'class',
        icon: 'Cross',
        description: '+5 Fortune, +15 Health. Divine Heal heals 5% more.',
        classRestriction: 'paladin',
        effectDescription: 'Divine Heal: +5% healing',
      },
    ],
    paths: {
      // Crusader path - holy damage, smite
      paladin_crusader: [
        {
          id: 'crusader_hammer',
          name: "Crusader's Hammer",
          type: 'weapon',
          price: 120,
          stats: { power: 5, fortune: 5 },
          tier: 'class',
          icon: 'Hammer',
          description: '+5 Power, +5 Fortune. Deal 15% bonus damage to enemies.',
          classRestriction: 'paladin',
          pathRestriction: 'paladin_crusader',
          effectDescription: '+15% holy damage',
        },
        {
          id: 'paladin_shield_crusader',
          name: "Paladin's Shield",
          type: 'armor',
          price: 120,
          stats: { armor: 4, maxHealth: 15 },
          tier: 'class',
          icon: 'Shield',
          description: '+4 Armor, +15 Health. Blessed protection.',
          classRestriction: 'paladin',
          pathRestriction: 'paladin_crusader',
        },
        {
          id: 'smite_sigil',
          name: 'Smite Sigil',
          type: 'accessory',
          price: 120,
          stats: { power: 6, fortune: 4 },
          tier: 'class',
          icon: 'Zap',
          description: '+6 Power, +4 Fortune. Critical hits deal holy damage.',
          classRestriction: 'paladin',
          pathRestriction: 'paladin_crusader',
          effectDescription: 'Crits: +20% holy damage',
        },
      ],
      // Protector path - healing, regen, damage reduction
      paladin_protector: [
        {
          id: 'protector_mace',
          name: "Protector's Mace",
          type: 'weapon',
          price: 120,
          stats: { power: 3, maxHealth: 15 },
          tier: 'class',
          icon: 'Hammer',
          description: '+3 Power, +15 Health. Healing effects 10% stronger.',
          classRestriction: 'paladin',
          pathRestriction: 'paladin_protector',
          effectDescription: 'Healing: +10% effectiveness',
        },
        {
          id: 'aegis_plate',
          name: 'Aegis Plate',
          type: 'armor',
          price: 120,
          stats: { armor: 5, maxHealth: 20 },
          tier: 'class',
          icon: 'ShieldCheck',
          description: '+5 Armor, +20 Health. Reduces all damage by 5%.',
          classRestriction: 'paladin',
          pathRestriction: 'paladin_protector',
          effectDescription: '-5% damage taken',
        },
        {
          id: 'renewal_pendant',
          name: 'Renewal Pendant',
          type: 'accessory',
          price: 120,
          stats: { maxHealth: 25, armor: 2 },
          tier: 'class',
          icon: 'Heart',
          description: '+25 Health, +2 Armor. Regenerate 1 HP per second.',
          classRestriction: 'paladin',
          pathRestriction: 'paladin_protector',
          effectDescription: '+1 HP regen/sec',
        },
      ],
    },
  },
};
