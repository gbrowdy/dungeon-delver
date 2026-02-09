import type { CharacterClass } from '@/types/game';
import type { IconType } from '@/components/ui/PixelIcon';

// Map class IDs to PixelIcon types
export const CLASS_ICONS: Record<CharacterClass, IconType> = {
  warrior: 'class-warrior',
  mage: 'class-mage',
  rogue: 'class-rogue',
  paladin: 'class-paladin',
};

// Stat label full names for accessibility
export const STAT_LABELS: Record<string, string> = {
  HP: 'Health Points',
  PWR: 'Power',
  ARM: 'Armor',
  SPD: 'Speed',
  FOR: 'Fortune',
};
