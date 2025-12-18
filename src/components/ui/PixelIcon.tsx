import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

export type IconType =
  | `stat-${string}`
  | `status-${string}`
  | `power-${string}`
  | `item-${string}`
  | `ability-${string}`
  | `ui-${string}`
  | `class-${string}`;

interface PixelIconProps {
  type: IconType;
  size?: 16 | 24 | 32 | 48;
  className?: string;
  animated?: boolean;
}

type LucideIconName = keyof typeof Icons;

// Map icon type strings to Lucide icon names
const ICON_MAP: Record<string, LucideIconName> = {
  // Stats
  'stat-health': 'Heart',
  'stat-mana': 'Droplet',
  'stat-power': 'Zap',
  'stat-armor': 'Shield',
  'stat-speed': 'Wind',
  'stat-fortune': 'Sparkles',
  'stat-gold': 'Coins',

  // Status effects
  'status-poison': 'Skull',
  'status-stun': 'CircleSlash',
  'status-slow': 'Snail',
  'status-bleed': 'Droplets',
  'status-regeneration': 'HeartPulse',

  // UI icons
  'ui-pause': 'Pause',
  'ui-play': 'Play',
  'ui-speed_1x': 'Play',
  'ui-speed_2x': 'FastForward',
  'ui-speed_3x': 'ChevronsRight',
  'ui-trophy': 'Trophy',
  'ui-star': 'Star',
  'ui-skull': 'Skull',
  'ui-hammer': 'Hammer',
  'ui-question': 'HelpCircle',
  'ui-sparkle': 'Sparkles',

  // Class icons
  'class-warrior': 'Sword',
  'class-mage': 'Wand2',
  'class-rogue': 'VenetianMask',
  'class-paladin': 'Cross',

  // Power icons
  'power-fireball': 'Flame',
  'power-heal': 'Heart',
  'power-shield': 'Shield',
  'power-strike': 'Sword',
  'power-crushing_blow': 'Hammer',
  'power-power_strike': 'Swords',
  'power-fan_of_knives': 'Fan',
  'power-flurry': 'Zap',
  'power-ambush': 'Crosshair',
  'power-coup_de_grace': 'Target',
  'power-frost_nova': 'Snowflake',
  'power-stunning_blow': 'CircleSlash',
  'power-battle_cry': 'Megaphone',
  'power-inner_focus': 'Focus',
  'power-reckless_swing': 'Axe',
  'power-blood_pact': 'Droplets',
  'power-divine_heal': 'Cross',
  'power-regeneration': 'HeartPulse',
  'power-earthquake': 'Mountain',
  'power-vampiric_touch': 'Hand',

  // Item icons
  'item-weapon': 'Sword',
  'item-armor': 'Shield',
  'item-accessory': 'Gem',
  'item-potion': 'FlaskConical',
  'item-sword': 'Sword',
  'item-axe': 'Axe',
  'item-staff': 'Wand2',
  'item-dagger': 'Scissors',
  'item-plate_armor': 'Shield',
  'item-chainmail': 'Link',
  'item-leather_armor': 'Shirt',
  'item-robe': 'GraduationCap',
  'item-ring': 'CircleDot',
  'item-amulet': 'Gem',
  'item-belt': 'Minus',
  'item-boots': 'Footprints',

  // Enemy ability icons
  'ability-attack': 'Sword',
  'ability-multi_hit': 'Swords',
  'ability-poison': 'Skull',
  'ability-stun': 'CircleSlash',
  'ability-heal': 'Heart',
  'ability-enrage': 'Flame',
  'ability-shield': 'Shield',
  'ability-triple_strike': 'Swords',
};

// Size mapping to Tailwind classes
const SIZE_CLASSES: Record<number, string> = {
  16: 'w-4 h-4',
  24: 'w-6 h-6',
  32: 'w-8 h-8',
  48: 'w-12 h-12',
};

/**
 * PixelIcon - Renders Lucide icons with consistent styling.
 * Maintains backward compatibility with the old pixel icon type system
 * while using scalable vector icons.
 */
export function PixelIcon({ type, size = 16, className, animated }: PixelIconProps) {
  // Look up the Lucide icon name from the type
  let iconName = ICON_MAP[type];

  // If not found in map, try to infer from the type string
  if (!iconName) {
    // Try generic fallbacks based on category
    const [category] = type.split('-');
    switch (category) {
      case 'stat':
        iconName = 'Sparkles';
        break;
      case 'status':
        iconName = 'AlertCircle';
        break;
      case 'power':
      case 'ability':
        iconName = 'Sparkles';
        break;
      case 'item':
        iconName = 'Package';
        break;
      case 'ui':
        iconName = 'HelpCircle';
        break;
      case 'class':
        iconName = 'User';
        break;
      default:
        iconName = 'HelpCircle';
    }
  }

  // Get the icon component
  const IconComponent = Icons[iconName] as React.ComponentType<{ className?: string }>;

  if (!IconComponent) {
    // Final fallback if icon doesn't exist
    const FallbackIcon = Icons.HelpCircle;
    return (
      <FallbackIcon
        className={cn(
          SIZE_CLASSES[size] || 'w-4 h-4',
          animated && 'animate-pulse',
          className
        )}
      />
    );
  }

  return (
    <IconComponent
      className={cn(
        SIZE_CLASSES[size] || 'w-4 h-4',
        animated && 'animate-pulse',
        className
      )}
    />
  );
}
