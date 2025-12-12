/**
 * Specialty Items Pool
 *
 * These are rotating specialty items that appear in the shop's "Today's Selection".
 * Each run shows 2-3 randomly selected items from this pool.
 *
 * Price range: 175-275g
 * All items have tier: 'specialty'
 */

import type { ShopItem } from '@/types/shop';

export const SPECIALTY_ITEMS: ShopItem[] = [
  // From Spec: Vampiric Dagger
  {
    id: 'vampiric_dagger',
    name: 'Vampiric Dagger',
    type: 'weapon',
    price: 200,
    stats: {
      power: 3,
    },
    effect: {
      trigger: 'on_kill',
      type: 'heal',
      value: 0.05, // 5% max HP
      description: 'Heal 5% max HP on kill',
    },
    tier: 'specialty',
    icon: 'Skull',
    description: 'A dark blade that feeds on the life force of fallen enemies.',
    pathSynergies: ['assassin', 'vampire'],
  },

  // From Spec: Thornmail
  {
    id: 'thornmail',
    name: 'Thornmail',
    type: 'armor',
    price: 225,
    stats: {
      armor: 4,
    },
    effect: {
      trigger: 'on_damaged',
      type: 'damage',
      value: 3,
      description: 'Reflect 3 damage when hit',
    },
    tier: 'specialty',
    icon: 'ShieldAlert',
    description: 'Spiked armor that punishes attackers.',
    pathSynergies: ['protector', 'berserker'],
  },

  // From Spec: Berserker Axe
  {
    id: 'berserker_axe',
    name: 'Berserker Axe',
    type: 'weapon',
    price: 200,
    stats: {
      power: 5,
    },
    effect: {
      trigger: 'passive',
      type: 'buff',
      value: 0.10, // +10% damage below 50% HP
      description: '+10% damage below 50% HP',
    },
    tier: 'specialty',
    icon: 'Axe',
    description: 'A brutal weapon that grows stronger as you near death.',
    pathSynergies: ['berserker'],
  },

  // From Spec: Guardian Shield
  {
    id: 'guardian_shield',
    name: 'Guardian Shield',
    type: 'armor',
    price: 225,
    stats: {
      armor: 5,
    },
    effect: {
      trigger: 'passive',
      type: 'buff',
      value: 0.50, // Block is 50% more effective
      description: 'Block is 50% more effective',
    },
    tier: 'specialty',
    icon: 'Shield',
    description: 'An impenetrable shield that enhances defensive maneuvers.',
    pathSynergies: ['guardian', 'protector'],
  },

  // From Spec: Speed Boots
  {
    id: 'speed_boots',
    name: 'Speed Boots',
    type: 'accessory',
    price: 175,
    stats: {
      speed: 15, // ~10% speed increase
    },
    tier: 'specialty',
    icon: 'Zap',
    description: 'Enchanted boots that grant supernatural swiftness.',
    pathSynergies: ['assassin', 'duelist'],
  },

  // From Spec: Lucky Charm
  {
    id: 'lucky_charm',
    name: 'Lucky Charm',
    type: 'accessory',
    price: 200,
    stats: {
      fortune: 8, // +8% fortune (crit/dodge)
    },
    tier: 'specialty',
    icon: 'Clover',
    description: 'A mystical charm blessed by fortune itself.',
    pathSynergies: ['assassin', 'gambler'],
  },

  // From Spec: Executioner's Blade
  {
    id: 'executioners_blade',
    name: "Executioner's Blade",
    type: 'weapon',
    price: 250,
    stats: {
      power: 4,
    },
    effect: {
      trigger: 'passive',
      type: 'damage',
      value: 0.50, // +50% damage vs enemies below 25% HP
      description: '+50% damage vs enemies below 25% HP',
    },
    tier: 'specialty',
    icon: 'Swords',
    description: 'A massive blade designed to finish wounded foes.',
    pathSynergies: ['assassin', 'berserker'],
  },

  // From Spec: Lifeward Amulet
  {
    id: 'lifeward_amulet',
    name: 'Lifeward Amulet',
    type: 'accessory',
    price: 225,
    stats: {
      health: 15,
      maxHealth: 15,
    },
    effect: {
      trigger: 'passive',
      type: 'heal',
      value: 1, // Heal 1 HP per second
      description: 'Heal 1 HP per second',
    },
    tier: 'specialty',
    icon: 'Heart',
    description: 'An ancient amulet that pulses with healing energy.',
    pathSynergies: ['guardian', 'protector', 'vampire'],
  },

  // NEW: Mana-focused items
  {
    id: 'arcane_crystal',
    name: 'Arcane Crystal',
    type: 'accessory',
    price: 200,
    stats: {
      mana: 20,
      maxMana: 20,
    },
    effect: {
      trigger: 'passive',
      type: 'mana',
      value: 2, // +2 mana per second
      description: '+2 mana regeneration per second',
    },
    tier: 'specialty',
    icon: 'Sparkles',
    description: 'A glowing crystal that channels pure magical energy.',
    pathSynergies: ['spellblade', 'elementalist'],
  },

  {
    id: 'spell_efficiency_ring',
    name: 'Ring of Efficiency',
    type: 'accessory',
    price: 225,
    stats: {
      fortune: 3,
    },
    effect: {
      trigger: 'passive',
      type: 'buff',
      value: 0.20, // -20% spell cost
      description: 'Powers cost 20% less mana',
    },
    tier: 'specialty',
    icon: 'Ring',
    description: 'A ring that makes spell casting more efficient.',
    pathSynergies: ['spellblade', 'elementalist', 'guardian'],
  },

  // NEW: Fortune items (crit damage, proc chance)
  {
    id: 'critical_lens',
    name: 'Critical Lens',
    type: 'accessory',
    price: 250,
    stats: {
      fortune: 5,
    },
    effect: {
      trigger: 'passive',
      type: 'buff',
      value: 0.50, // +50% crit damage (3x -> 4.5x)
      description: '+50% critical hit damage',
    },
    tier: 'specialty',
    icon: 'Eye',
    description: 'A magical lens that reveals enemy weak points.',
    pathSynergies: ['assassin', 'duelist'],
  },

  {
    id: 'chain_lightning_orb',
    name: 'Chain Lightning Orb',
    type: 'weapon',
    price: 275,
    stats: {
      power: 3,
    },
    effect: {
      trigger: 'on_hit',
      type: 'damage',
      value: 5,
      chance: 0.15, // 15% chance
      description: '15% chance to deal 5 bonus damage',
    },
    tier: 'specialty',
    icon: 'Zap',
    description: 'An orb that occasionally unleashes chain lightning.',
    pathSynergies: ['elementalist', 'spellblade'],
  },

  // NEW: Hybrid items (power + armor, speed + health)
  {
    id: 'battle_plate',
    name: 'Battle Plate',
    type: 'armor',
    price: 250,
    stats: {
      power: 2,
      armor: 3,
    },
    tier: 'specialty',
    icon: 'ShieldCheck',
    description: 'Heavy armor reinforced with offensive spikes.',
    pathSynergies: ['protector', 'berserker', 'duelist'],
  },

  {
    id: 'assassins_cloak',
    name: "Assassin's Cloak",
    type: 'armor',
    price: 225,
    stats: {
      speed: 10,
      armor: 2,
    },
    effect: {
      trigger: 'passive',
      type: 'buff',
      value: 0.05, // +5% dodge
      description: '+5% dodge chance',
    },
    tier: 'specialty',
    icon: 'UserX',
    description: 'A lightweight cloak that enhances evasion.',
    pathSynergies: ['assassin'],
  },

  {
    id: 'gladiator_helm',
    name: 'Gladiator Helm',
    type: 'armor',
    price: 200,
    stats: {
      health: 10,
      maxHealth: 10,
      speed: 5,
    },
    tier: 'specialty',
    icon: 'Helmet',
    description: 'A champion\'s helm that grants vitality and agility.',
    pathSynergies: ['duelist', 'protector'],
  },

  // NEW: Gold/resource generation
  {
    id: 'merchants_signet',
    name: "Merchant's Signet",
    type: 'accessory',
    price: 175,
    stats: {
      fortune: 5,
    },
    effect: {
      trigger: 'on_kill',
      type: 'buff',
      value: 0.25, // +25% gold from kills
      description: '+25% gold from enemy kills',
    },
    tier: 'specialty',
    icon: 'Coins',
    description: 'A ring favored by wealthy traders.',
    pathSynergies: ['gambler'],
  },

  // NEW: Combo/synergy items
  {
    id: 'momentum_blade',
    name: 'Momentum Blade',
    type: 'weapon',
    price: 225,
    stats: {
      power: 3,
      speed: 5,
    },
    effect: {
      trigger: 'on_hit',
      type: 'buff',
      value: 0.02, // +2% damage stacking
      description: 'Each consecutive hit grants +2% damage (stacks 5 times)',
    },
    tier: 'specialty',
    icon: 'Wind',
    description: 'A blade that grows deadlier with each strike.',
    pathSynergies: ['duelist', 'berserker'],
  },

  {
    id: 'frost_shard',
    name: 'Frost Shard',
    type: 'weapon',
    price: 200,
    stats: {
      power: 2,
    },
    effect: {
      trigger: 'on_hit',
      type: 'debuff',
      value: 0.10, // -10% enemy speed
      chance: 0.30, // 30% chance
      description: '30% chance to slow enemy by 10% for 3 turns',
    },
    tier: 'specialty',
    icon: 'Snowflake',
    description: 'A frozen shard that chills enemies to the bone.',
    pathSynergies: ['elementalist', 'protector'],
  },

  // NEW: Defensive utility
  {
    id: 'phoenix_feather',
    name: 'Phoenix Feather',
    type: 'accessory',
    price: 275,
    stats: {
      health: 10,
      maxHealth: 10,
    },
    effect: {
      trigger: 'on_death',
      type: 'heal',
      value: 0.30, // Revive with 30% HP (once per combat)
      description: 'Revive with 30% HP once per combat',
    },
    tier: 'specialty',
    icon: 'Flame',
    description: 'A feather from a legendary phoenix. It burns with eternal fire.',
    pathSynergies: ['guardian', 'protector', 'berserker'],
  },

  {
    id: 'bulwark_gauntlets',
    name: 'Bulwark Gauntlets',
    type: 'armor',
    price: 250,
    stats: {
      armor: 6,
    },
    effect: {
      trigger: 'combat_start',
      type: 'buff',
      value: 3, // +3 armor for first 5 turns
      description: '+3 armor for the first 5 turns of combat',
    },
    tier: 'specialty',
    icon: 'HandMetal',
    description: 'Heavy gauntlets that provide superior early defense.',
    pathSynergies: ['guardian', 'protector'],
  },
];
