/**
 * Specialty Items Pool
 *
 * These are rotating specialty items that appear in the shop's "Today's Selection".
 * Each run shows 2-3 randomly selected items from this pool.
 *
 * Price range: 140-220g
 * All items have tier: 'specialty'
 */

import type { ShopItem } from '@/types/shop';

export const SPECIALTY_ITEMS: ShopItem[] = [
  // From Spec: Vampiric Dagger
  // Value budget: ~13 points (10 stat + 3 effect)
  // Stats: +5 Power (5) + +8 Fortune (4) = 9 points
  // Effect: 5% HP on kill ≈ 2 points
  {
    id: 'vampiric_dagger',
    name: 'Vampiric Dagger',
    type: 'weapon',
    price: 160,
    stats: {
      power: 5,
      fortune: 8,
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
  // Value budget: ~13 points
  // Stats: +6 Armor (6) + +20 Health (4) = 10 points
  // Effect: Reflect 3 damage ≈ 2 points
  {
    id: 'thornmail',
    name: 'Thornmail',
    type: 'armor',
    price: 180,
    stats: {
      armor: 6,
      maxHealth: 20,
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
  // Value budget: ~13 points
  // Stats: +6 Power (6) + +6 Fortune (3) = 9 points
  // Effect: +10% damage below 50% HP ≈ 2 points
  {
    id: 'berserker_axe',
    name: 'Berserker Axe',
    type: 'weapon',
    price: 160,
    stats: {
      power: 6,
      fortune: 6,
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
  // Value budget: ~13 points
  // Stats: +6 Armor (6) + +25 Health (5) = 11 points
  // Effect: Block 50% more effective ≈ 2 points
  {
    id: 'guardian_shield',
    name: 'Guardian Shield',
    type: 'armor',
    price: 180,
    stats: {
      armor: 6,
      maxHealth: 25,
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
  // Value budget: ~13 points
  // Stats: +18 Speed (9) + +6 Fortune (3) = 12 points
  // No effect, but high stat budget for a utility item
  {
    id: 'speed_boots',
    name: 'Speed Boots',
    type: 'accessory',
    price: 140,
    stats: {
      speed: 18,
      fortune: 6,
    },
    tier: 'specialty',
    icon: 'Zap',
    description: 'Enchanted boots that grant supernatural swiftness.',
    pathSynergies: ['assassin', 'duelist'],
  },

  // From Spec: Lucky Charm
  // Value budget: ~13 points
  // Stats: +12 Fortune (6) + +6 Speed (3) = 9 points
  // Effect: 50% chance to restore 5 mana on dodge ≈ 2 points
  {
    id: 'lucky_charm',
    name: 'Lucky Charm',
    type: 'accessory',
    price: 160,
    stats: {
      fortune: 12,
      speed: 6,
    },
    effect: {
      trigger: 'on_dodge',
      type: 'mana',
      value: 5,
      chance: 0.50,
      description: '50% chance to restore 5 mana on dodge',
    },
    tier: 'specialty',
    icon: 'Clover',
    description: 'A mystical charm blessed by fortune itself.',
    pathSynergies: ['assassin', 'gambler'],
  },

  // From Spec: Executioner's Blade
  // Value budget: ~13 points
  // Stats: +6 Power (6) + +6 Fortune (3) = 9 points
  // Effect: +50% damage vs low HP ≈ 3 points
  {
    id: 'executioners_blade',
    name: "Executioner's Blade",
    type: 'weapon',
    price: 200,
    stats: {
      power: 6,
      fortune: 6,
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
  // Value budget: ~13 points
  // Stats: +30 Health (6) + +3 Armor (3) = 9 points
  // Effect: Heal 1 HP/sec ≈ 2 points
  {
    id: 'lifeward_amulet',
    name: 'Lifeward Amulet',
    type: 'accessory',
    price: 180,
    stats: {
      maxHealth: 30,
      armor: 3,
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
  // Value budget: ~13 points
  // Stats: +40 Mana (6) + +3 Power (3) = 9 points
  // Effect: +2 mana/sec ≈ 2 points
  {
    id: 'arcane_crystal',
    name: 'Arcane Crystal',
    type: 'accessory',
    price: 160,
    stats: {
      maxMana: 40,
      power: 3,
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

  // Value budget: ~13 points
  // Stats: +8 Fortune (4) + +4 Power (4) = 8 points
  // Effect: -20% cost ≈ 4 points
  {
    id: 'spell_efficiency_ring',
    name: 'Ring of Efficiency',
    type: 'accessory',
    price: 180,
    stats: {
      fortune: 8,
      power: 4,
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
  // Value budget: ~13 points
  // Stats: +10 Fortune (5) + +4 Speed (2) = 7 points
  // Effect: +50% crit damage ≈ 3 points
  {
    id: 'critical_lens',
    name: 'Critical Lens',
    type: 'accessory',
    price: 200,
    stats: {
      fortune: 10,
      speed: 4,
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

  // Value budget: ~13 points
  // Stats: +5 Power (5) + +4 Fortune (2) = 7 points
  // Effect: 25% chance for 8 bonus damage ≈ 2 points
  {
    id: 'chain_lightning_orb',
    name: 'Chain Lightning Orb',
    type: 'weapon',
    price: 220,
    stats: {
      power: 5,
      fortune: 4,
    },
    effect: {
      trigger: 'on_hit',
      type: 'damage',
      value: 8,
      chance: 0.25, // 25% chance
      description: '25% chance to deal 8 bonus damage',
    },
    tier: 'specialty',
    icon: 'Zap',
    description: 'An orb that occasionally unleashes chain lightning.',
    pathSynergies: ['elementalist', 'spellblade'],
  },

  // NEW: Hybrid items (power + armor, speed + health)
  // Value budget: ~13 points
  // Stats: +4 Power (4) + +5 Armor (5) + +15 Health (3) = 12 points
  {
    id: 'battle_plate',
    name: 'Battle Plate',
    type: 'armor',
    price: 200,
    stats: {
      power: 4,
      armor: 5,
      maxHealth: 15,
    },
    tier: 'specialty',
    icon: 'ShieldCheck',
    description: 'Heavy armor reinforced with offensive spikes.',
    pathSynergies: ['protector', 'berserker', 'duelist'],
  },

  // Value budget: ~13 points
  // Stats: +14 Speed (7) + +3 Armor (3) = 10 points
  // Effect: +5% dodge ≈ 2 points
  {
    id: 'assassins_cloak',
    name: "Assassin's Cloak",
    type: 'armor',
    price: 180,
    stats: {
      speed: 14,
      armor: 3,
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

  // Value budget: ~13 points
  // Stats: +35 Health (7) + +8 Speed (4) = 11 points
  {
    id: 'gladiator_helm',
    name: 'Gladiator Helm',
    type: 'armor',
    price: 160,
    stats: {
      maxHealth: 35,
      speed: 8,
    },
    tier: 'specialty',
    icon: 'Helmet',
    description: 'A champion\'s helm that grants vitality and agility.',
    pathSynergies: ['duelist', 'protector'],
  },

  // NEW: Gold/resource generation
  // Value budget: ~13 points
  // Stats: +10 Fortune (5) + +6 Speed (3) = 8 points
  // Effect: +25% gold ≈ 1 point (economy items intentionally slightly lower combat value)
  {
    id: 'merchants_signet',
    name: "Merchant's Signet",
    type: 'accessory',
    price: 140,
    stats: {
      fortune: 10,
      speed: 6,
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
  // Value budget: ~13 points
  // Stats: +5 Power (5) + +10 Speed (5) = 10 points
  // Effect: stacking damage ≈ 2 points
  {
    id: 'momentum_blade',
    name: 'Momentum Blade',
    type: 'weapon',
    price: 180,
    stats: {
      power: 5,
      speed: 10,
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

  // Value budget: ~13 points
  // Stats: +4 Power (4) + +6 Fortune (3) = 7 points
  // Effect: 30% slow ≈ 2 points
  {
    id: 'frost_shard',
    name: 'Frost Shard',
    type: 'weapon',
    price: 160,
    stats: {
      power: 4,
      fortune: 6,
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
  // Value budget: ~13 points
  // Stats: +25 Health (5) + +3 Armor (3) = 8 points
  // Effect: Revive 30% ≈ 4 points (powerful)
  {
    id: 'phoenix_feather',
    name: 'Phoenix Feather',
    type: 'accessory',
    price: 220,
    stats: {
      maxHealth: 25,
      armor: 3,
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

  // Value budget: ~13 points
  // Stats: +7 Armor (7) + +20 Health (4) = 11 points
  // Effect: +3 armor early ≈ 1 point
  {
    id: 'bulwark_gauntlets',
    name: 'Bulwark Gauntlets',
    type: 'armor',
    price: 200,
    stats: {
      armor: 7,
      maxHealth: 20,
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

  // NEW: Crusader/Templar path items
  // Value budget: ~13 points
  // Stats: +5 Power (5) + +3 Armor (3) = 8 points
  // Effect: Heal 5 on crit ≈ 1 point
  {
    id: 'crusaders_mace',
    name: "Crusader's Mace",
    type: 'weapon',
    price: 180,
    stats: {
      power: 5,
      armor: 3,
    },
    effect: {
      trigger: 'on_crit',
      type: 'heal',
      value: 5,
      description: 'Heal 5 HP on critical hit',
    },
    tier: 'specialty',
    icon: 'Hammer',
    description: 'A blessed mace that channels divine energy into healing strikes.',
    pathSynergies: ['crusader', 'templar', 'guardian'],
  },

  // Value budget: ~13 points
  // Stats: +30 Health (6) + +3 Armor (3) = 9 points
  // Effect: +15% healing ≈ 2 points
  {
    id: 'templar_banner',
    name: 'Templar Banner',
    type: 'accessory',
    price: 160,
    stats: {
      maxHealth: 30,
      armor: 3,
    },
    effect: {
      trigger: 'passive',
      type: 'buff',
      value: 0.15,
      description: '+15% effectiveness to all healing effects',
    },
    tier: 'specialty',
    icon: 'Flag',
    description: 'A holy banner that amplifies divine healing.',
    pathSynergies: ['templar', 'crusader', 'guardian'],
  },

  // NEW: Stun/Control items
  // Value budget: ~13 points
  // Stats: +4 Power (4) + +10 Speed (5) = 9 points
  // Effect: 12% stun ≈ 2 points
  {
    id: 'stun_baton',
    name: 'Stun Baton',
    type: 'weapon',
    price: 200,
    stats: {
      power: 4,
      speed: 10,
    },
    effect: {
      trigger: 'on_hit',
      type: 'debuff',
      value: 1,
      chance: 0.12,
      description: '12% chance to stun enemy for 1 turn',
    },
    tier: 'specialty',
    icon: 'Zap',
    description: 'A crackling baton that can shock enemies into paralysis.',
    pathSynergies: ['duelist', 'protector'],
  },

  // Value budget: ~13 points
  // Stats: +8 Fortune (4) + +4 Power (4) = 8 points
  // Effect: 25% slow ≈ 2 points
  {
    id: 'gravity_orb',
    name: 'Gravity Orb',
    type: 'accessory',
    price: 180,
    stats: {
      fortune: 8,
      power: 4,
    },
    effect: {
      trigger: 'on_hit',
      type: 'debuff',
      value: 0.15,
      chance: 0.25,
      description: '25% chance to reduce enemy attack speed by 15% for 4 turns',
    },
    tier: 'specialty',
    icon: 'Moon',
    description: 'An orb that manipulates gravitational forces to slow enemies.',
    pathSynergies: ['elementalist', 'guardian'],
  },

  // NEW: Additional defensive utility
  // Value budget: ~13 points
  // Stats: +4 Armor (4) + +25 Health (5) = 9 points
  // Effect: -5 flat reduction ≈ 3 points
  {
    id: 'barrier_crystal',
    name: 'Barrier Crystal',
    type: 'accessory',
    price: 200,
    stats: {
      armor: 4,
      maxHealth: 25,
    },
    effect: {
      trigger: 'passive',
      type: 'buff',
      value: 5,
      description: 'Reduce all incoming damage by 5 (flat reduction)',
    },
    tier: 'specialty',
    icon: 'Gem',
    description: 'A crystal that creates a protective barrier around its wielder.',
    pathSynergies: ['guardian', 'protector'],
  },
];
