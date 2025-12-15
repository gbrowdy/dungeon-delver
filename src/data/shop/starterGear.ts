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
    mana: number;
    maxMana: number;
    fortune: number;
  }>;
  tier: 'starter' | 'class' | 'specialty' | 'legendary';
  icon: string; // Lucide icon name
  description: string;
}

/**
 * Starter Gear - Basic equipment available at the start of the game
 * All items cost 45 gold and provide simple stat bonuses
 */
export const STARTER_GEAR: ShopItem[] = [
  {
    id: 'starter_sword',
    name: 'Basic Sword',
    type: 'weapon',
    price: 45,
    stats: { power: 2 },
    tier: 'starter',
    icon: 'Sword',
    description: 'A simple but reliable blade.',
  },
  {
    id: 'starter_armor',
    name: 'Basic Armor',
    type: 'armor',
    price: 45,
    stats: { armor: 2 },
    tier: 'starter',
    icon: 'Shield',
    description: 'Basic protection for adventurers.',
  },
  {
    id: 'starter_ring',
    name: 'Basic Ring',
    type: 'accessory',
    price: 45,
    stats: { maxHealth: 10 },
    tier: 'starter',
    icon: 'CircleDot',
    description: 'A plain ring that bolsters vitality.',
  },
];
