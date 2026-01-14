import type { ItemType } from '@/types/game';

export const ALL_ITEM_TYPES: ItemType[] = ['weapon', 'armor', 'accessory'];

export const TYPE_LABELS: Record<ItemType, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};

export const RARITY_BORDER_COLORS: Record<string, string> = {
  common: 'border-rarity-common',
  uncommon: 'border-rarity-uncommon',
  rare: 'border-rarity-rare',
  epic: 'border-rarity-epic',
  legendary: 'border-rarity-legendary pixel-border-pulse',
};

export const RARITY_BG_COLORS: Record<string, string> = {
  common: 'bg-rarity-common/10',
  uncommon: 'bg-rarity-uncommon/10',
  rare: 'bg-rarity-rare/10',
  epic: 'bg-rarity-epic/10',
  legendary: 'bg-rarity-legendary/20',
};
