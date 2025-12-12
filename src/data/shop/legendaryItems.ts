/**
 * Legendary Items Pool
 *
 * Build-defining items that unlock at floor 3+
 * One legendary is shown per run (rotates)
 *
 * Design Philosophy:
 * - Each legendary dramatically changes how you play
 * - Powerful stats + game-changing effects
 * - Price range: 320-360g
 * - ALL legendaries must have special effects
 */

import type { ShopItem } from '@/types/shop';

export const LEGENDARY_ITEMS: ShopItem[] = [
  {
    id: 'bloodthirster',
    name: 'Bloodthirster',
    type: 'weapon',
    price: 320,
    stats: { power: 7 },
    effect: {
      trigger: 'on_damage_dealt',
      type: 'heal',
      value: 0.10,
      description: 'Heal 10% of damage dealt',
    },
    tier: 'legendary',
    icon: 'Droplet',
    description: 'A blade that thirsts for blood, healing its wielder with every strike.',
    pathSynergies: ['berserker', 'assassin'],
  },
  {
    id: 'immortal_plate',
    name: 'Immortal Plate',
    type: 'armor',
    price: 320,
    stats: { armor: 8 },
    effect: {
      trigger: 'on_lethal_damage',
      type: 'special',
      value: 1,
      description: 'Survive lethal damage once per floor (survive at 1 HP)',
    },
    tier: 'legendary',
    icon: 'ShieldCheck',
    description: 'Armor blessed by ancient guardians, refusing to let death claim its wearer.',
    pathSynergies: ['guardian', 'protector'],
  },
  {
    id: 'infinity_edge',
    name: 'Infinity Edge',
    type: 'weapon',
    price: 360,
    stats: { power: 6 },
    effect: {
      trigger: 'on_crit',
      type: 'damage',
      value: 3.0,
      description: 'Critical hits deal 3x damage instead of 2x',
    },
    tier: 'legendary',
    icon: 'Zap',
    description: 'A blade that pierces the fabric of reality, amplifying every perfect strike.',
    pathSynergies: ['assassin', 'berserker'],
  },
  {
    id: 'warmogs_heart',
    name: "Warmog's Heart",
    type: 'armor',
    price: 320,
    stats: { health: 50 },
    effect: {
      trigger: 'out_of_combat',
      type: 'heal',
      value: 0.02,
      description: 'Regenerate 2% max HP per second out of combat',
    },
    tier: 'legendary',
    icon: 'Heart',
    description: 'A pulsing heart of ancient magic, rapidly mending wounds between battles.',
    pathSynergies: ['guardian', 'protector'],
  },
  {
    id: 'archmages_staff',
    name: "Archmage's Staff",
    type: 'weapon',
    price: 360,
    stats: { power: 8 },
    effect: {
      trigger: 'on_power_cast',
      type: 'damage',
      value: 0.50,
      description: 'Powers deal 50% more damage',
    },
    tier: 'legendary',
    icon: 'Sparkles',
    description: 'The staff of a legendary archmage, amplifying all magical abilities.',
    pathSynergies: ['archmage', 'elementalist'],
  },
  {
    id: 'phantom_cloak',
    name: 'Phantom Cloak',
    type: 'armor',
    price: 340,
    stats: { armor: 5 },
    effect: {
      trigger: 'on_damage_taken',
      type: 'special',
      value: 0,
      chance: 0.20,
      description: '20% chance to completely avoid incoming damage',
    },
    tier: 'legendary',
    icon: 'Ghost',
    description: 'A cloak woven from shadow itself, sometimes phasing through attacks.',
    pathSynergies: ['assassin', 'duelist'],
  },
  {
    id: 'crown_of_fortune',
    name: 'Crown of Fortune',
    type: 'accessory',
    price: 340,
    stats: { fortune: 15 },
    effect: {
      trigger: 'on_crit',
      type: 'mana',
      value: 20,
      description: 'Critical hits restore 20 mana',
    },
    tier: 'legendary',
    icon: 'Crown',
    description: 'A golden crown that turns lucky strikes into endless power.',
    pathSynergies: ['assassin', 'archmage'],
  },
  {
    id: 'titans_gauntlet',
    name: "Titan's Gauntlet",
    type: 'accessory',
    price: 360,
    stats: { power: 5, armor: 5 },
    effect: {
      trigger: 'passive',
      type: 'special',
      value: 1,
      description: 'Your attacks ignore enemy dodge chance',
    },
    tier: 'legendary',
    icon: 'HandMetal',
    description: 'Forged by titans, these gauntlets strike with unstoppable force.',
    pathSynergies: ['berserker', 'guardian'],
  },

  // NEW: Speed/Momentum legendary for Duelist paths
  {
    id: 'timekeeper_blade',
    name: "Timekeeper's Blade",
    type: 'weapon',
    price: 340,
    stats: { power: 6, speed: 3 },
    effect: {
      trigger: 'on_hit',
      type: 'buff',
      value: 0.05,
      description: 'Each attack increases attack speed by 5% (stacks up to 10 times, resets on kill)',
    },
    tier: 'legendary',
    icon: 'Clock',
    description: 'A blade that accelerates with every strike, building unstoppable momentum.',
    pathSynergies: ['duelist', 'assassin'],
  },

  // NEW: Mana sustain legendary for spell-heavy builds
  {
    id: 'arcane_reservoir',
    name: 'Arcane Reservoir',
    type: 'accessory',
    price: 340,
    stats: { mana: 50, maxMana: 50 },
    effect: {
      trigger: 'on_power_cast',
      type: 'mana',
      value: 0.15,
      description: 'Powers refund 15% of their mana cost',
    },
    tier: 'legendary',
    icon: 'Droplets',
    description: 'An endless wellspring of magical energy, rewarding rapid spellcasting.',
    pathSynergies: ['archmage', 'enchanter'],
  },

  // NEW: Scaling tank legendary for Guardian/Protector paths
  {
    id: 'bulwark_of_heroes',
    name: 'Bulwark of Heroes',
    type: 'armor',
    price: 360,
    stats: { armor: 6, health: 30, maxHealth: 30 },
    effect: {
      trigger: 'on_damage_taken',
      type: 'buff',
      value: 0.03,
      description: 'Each time you take damage, gain 3% damage reduction (stacks up to 10 times)',
    },
    tier: 'legendary',
    icon: 'ShieldPlus',
    description: 'A shield that grows stronger with each blow endured, rewarding those who stand their ground.',
    pathSynergies: ['guardian', 'protector'],
  },
];

/**
 * Get a random legendary item for the shop
 * Used to show one legendary per run at floor 3+
 */
export function getRandomLegendaryItem(): ShopItem {
  const index = Math.floor(Math.random() * LEGENDARY_ITEMS.length);
  return LEGENDARY_ITEMS[index];
}

/**
 * Get legendary item by ID
 */
export function getLegendaryItemById(id: string): ShopItem | undefined {
  return LEGENDARY_ITEMS.find(item => item.id === id);
}
