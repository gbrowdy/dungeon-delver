/**
 * Legendary Items Pool
 *
 * Build-defining items that unlock at floor 3+
 * One legendary is shown per run (rotates)
 *
 * Design Philosophy:
 * - Each legendary dramatically changes how you play
 * - Powerful stats + game-changing effects
 * - Price range: 400-450g
 * - ALL legendaries must have special effects
 */

import type { ShopItem } from '@/types/shop';

export const LEGENDARY_ITEMS: ShopItem[] = [
  {
    id: 'bloodthirster',
    name: 'Bloodthirster',
    type: 'weapon',
    price: 400,
    stats: { power: 7 },
    effect: {
      trigger: 'on_damage_dealt',
      type: 'heal',
      value: 0.10,
      description: 'Heal 10% of damage dealt'
    },
    tier: 'legendary',
    icon: 'Droplet',
    description: 'A blade that thirsts for blood, healing its wielder with every strike.',
    pathSynergies: ['berserker', 'assassin']
  },
  {
    id: 'immortal_plate',
    name: 'Immortal Plate',
    type: 'armor',
    price: 400,
    stats: { armor: 8 },
    effect: {
      trigger: 'on_lethal_damage',
      type: 'special',
      value: 1,
      description: 'Survive lethal damage once per floor (survive at 1 HP)'
    },
    tier: 'legendary',
    icon: 'ShieldCheck',
    description: 'Armor blessed by ancient guardians, refusing to let death claim its wearer.',
    pathSynergies: ['tank', 'immortal']
  },
  {
    id: 'infinity_edge',
    name: 'Infinity Edge',
    type: 'weapon',
    price: 450,
    stats: { power: 6 },
    effect: {
      trigger: 'on_crit',
      type: 'damage',
      value: 3.0,
      description: 'Critical hits deal 3x damage instead of 2x'
    },
    tier: 'legendary',
    icon: 'Zap',
    description: 'A blade that pierces the fabric of reality, amplifying every perfect strike.',
    pathSynergies: ['assassin', 'berserker']
  },
  {
    id: 'warmogs_heart',
    name: "Warmog's Heart",
    type: 'armor',
    price: 400,
    stats: { health: 50 },
    effect: {
      trigger: 'out_of_combat',
      type: 'heal',
      value: 0.02,
      description: 'Regenerate 2% max HP per second out of combat'
    },
    tier: 'legendary',
    icon: 'Heart',
    description: 'A pulsing heart of ancient magic, rapidly mending wounds between battles.',
    pathSynergies: ['tank', 'immortal']
  },
  {
    id: 'archmages_staff',
    name: "Archmage's Staff",
    type: 'weapon',
    price: 450,
    stats: { power: 8 },
    effect: {
      trigger: 'on_power_cast',
      type: 'damage',
      value: 0.50,
      description: 'Powers deal 50% more damage'
    },
    tier: 'legendary',
    icon: 'Sparkles',
    description: 'The staff of a legendary archmage, amplifying all magical abilities.',
    pathSynergies: ['spellblade', 'elementalist']
  },
  {
    id: 'phantom_cloak',
    name: 'Phantom Cloak',
    type: 'armor',
    price: 425,
    stats: { armor: 5 },
    effect: {
      trigger: 'on_damage_taken',
      type: 'special',
      value: 0,
      chance: 0.20,
      description: '20% chance to completely avoid incoming damage'
    },
    tier: 'legendary',
    icon: 'Ghost',
    description: 'A cloak woven from shadow itself, sometimes phasing through attacks.',
    pathSynergies: ['assassin', 'shadow']
  },
  {
    id: 'crown_of_fortune',
    name: 'Crown of Fortune',
    type: 'accessory',
    price: 425,
    stats: { fortune: 15 },
    effect: {
      trigger: 'on_crit',
      type: 'mana',
      value: 20,
      description: 'Critical hits restore 20 mana'
    },
    tier: 'legendary',
    icon: 'Crown',
    description: 'A golden crown that turns lucky strikes into endless power.',
    pathSynergies: ['assassin', 'spellblade']
  },
  {
    id: 'titans_gauntlet',
    name: "Titan's Gauntlet",
    type: 'accessory',
    price: 450,
    stats: { power: 5, armor: 5 },
    effect: {
      trigger: 'passive',
      type: 'special',
      value: 1,
      description: 'Your attacks ignore enemy dodge chance'
    },
    tier: 'legendary',
    icon: 'HandMetal',
    description: 'Forged by titans, these gauntlets strike with unstoppable force.',
    pathSynergies: ['berserker', 'tank']
  }
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
