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
}

/**
 * Starter Gear - Basic equipment available at the start of the game
 * All items cost 45 gold and provide simple stat bonuses
 *
 * Value budget: 3 stat points per item
 */
export const STARTER_GEAR: ShopItem[] = [
  // Value: +3 Power = 3 stat points
  {
    id: 'starter_sword',
    name: 'Basic Sword',
    type: 'weapon',
    price: 45,
    stats: { power: 3 },
    tier: 'starter',
    icon: 'Sword',
    description: 'A simple but reliable blade.',
  },
  // Value: +3 Armor = 3 stat points
  {
    id: 'starter_armor',
    name: 'Basic Armor',
    type: 'armor',
    price: 45,
    stats: { armor: 3 },
    tier: 'starter',
    icon: 'Shield',
    description: 'Basic protection for adventurers.',
  },
  // Value: +15 Health = 3 stat points
  {
    id: 'starter_ring',
    name: 'Basic Ring',
    type: 'accessory',
    price: 45,
    stats: { maxHealth: 15 },
    tier: 'starter',
    icon: 'CircleDot',
    description: 'A plain ring that bolsters vitality.',
  },
];
