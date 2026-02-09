/**
 * Icon mappings using Lucide React icons
 *
 * Each category maps semantic names to Lucide icon names (strings).
 * Import the actual icons with: import * as Icons from 'lucide-react'
 * Then use: Icons[STAT_ICONS.HEALTH] to get the component
 */

// Stat icons - mapped to Lucide icon names
export const STAT_ICONS = {
  HEALTH: 'Heart',
  MANA: 'Droplet',
  POWER: 'Zap',
  ARMOR: 'Shield',
  SPEED: 'Wind',
  FORTUNE: 'Sparkles',
  GOLD: 'Coins',
} as const;

// Status effect icons
export const STATUS_ICONS = {
  POISON: 'Skull',
  STUN: 'CircleSlash',
  SLOW: 'Snail',
  BLEED: 'Droplets',
  REGENERATION: 'HeartPulse',
} as const;

// Power/ability icons - using Lucide names
export const POWER_ICONS = {
  FIREBALL: 'Flame',
  HEAL: 'Heart',
  SHIELD: 'Shield',
  STRIKE: 'Sword',
  CRUSHING_BLOW: 'Hammer',
  POWER_STRIKE: 'Swords',
  FAN_OF_KNIVES: 'Fan',
  FLURRY: 'Zap',
  AMBUSH: 'Eye',
  COUP_DE_GRACE: 'Target',
  FROST_NOVA: 'Snowflake',
  STUNNING_BLOW: 'CircleSlash',
  BATTLE_CRY: 'Megaphone',
  INNER_FOCUS: 'Focus',
  RECKLESS_SWING: 'Axe',
  BLOOD_PACT: 'Droplets',
  DIVINE_HEAL: 'Cross',
  REGENERATION: 'HeartPulse',
  EARTHQUAKE: 'Mountain',
  VAMPIRIC_TOUCH: 'Hand',
} as const;

// Enemy ability icons
export const ABILITY_ICONS = {
  ATTACK: 'Sword',
  MULTI_HIT: 'Swords',
  POISON: 'Skull',
  STUN: 'CircleSlash',
  HEAL: 'Heart',
  ENRAGE: 'Flame',
  SHIELD: 'Shield',
  TRIPLE_STRIKE: 'Swords',
} as const;

// Item type icons
export const ITEM_ICONS = {
  // Base types
  WEAPON: 'Sword',
  ARMOR: 'Shield',
  ACCESSORY: 'Gem',
  POTION: 'FlaskConical',
  // Weapon variants
  SWORD: 'Sword',
  AXE: 'Axe',
  STAFF: 'Wand2',
  DAGGER: 'Scissors',
  // Armor variants
  PLATE_ARMOR: 'Shield',
  CHAINMAIL: 'Link',
  LEATHER_ARMOR: 'Shirt',
  ROBE: 'GraduationCap',
  // Accessory variants
  RING: 'CircleDot',
  AMULET: 'Gem',
  BELT: 'Minus',
  BOOTS: 'Footprints',
} as const;

// UI control icons
export const UI_ICONS = {
  PAUSE: 'Pause',
  PLAY: 'Play',
  SPEED_1X: 'Play',
  SPEED_2X: 'FastForward',
  SPEED_3X: 'ChevronsRight',
  TROPHY: 'Trophy',
  STAR: 'Star',
  SKULL: 'Skull',
  HAMMER: 'Hammer',
  QUESTION: 'HelpCircle',
  SPARKLE: 'Sparkles',
} as const;

// Class icons
export const CLASS_ICONS = {
  WARRIOR: 'Sword',
  MAGE: 'Wand2',
  ROGUE: 'VenetianMask',
  PALADIN: 'Cross',
} as const;

// Class colors - consistent across all screens
export const CLASS_COLORS = {
  warrior: { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', border: '#dc2626', tailwind: 'text-red-500' },
  mage: { primary: '#a78bfa', glow: 'rgba(167, 139, 250, 0.5)', border: '#8b5cf6', tailwind: 'text-violet-400' },
  rogue: { primary: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)', border: '#16a34a', tailwind: 'text-green-500' },
  paladin: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', border: '#d97706', tailwind: 'text-amber-500' },
} as const;

export type CharacterClassKey = keyof typeof CLASS_COLORS;

// Type for all Lucide icon names used in the app
export type IconName =
  | typeof STAT_ICONS[keyof typeof STAT_ICONS]
  | typeof STATUS_ICONS[keyof typeof STATUS_ICONS]
  | typeof POWER_ICONS[keyof typeof POWER_ICONS]
  | typeof ABILITY_ICONS[keyof typeof ABILITY_ICONS]
  | typeof ITEM_ICONS[keyof typeof ITEM_ICONS]
  | typeof UI_ICONS[keyof typeof UI_ICONS]
  | typeof CLASS_ICONS[keyof typeof CLASS_ICONS];
