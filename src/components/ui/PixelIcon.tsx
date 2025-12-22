import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { type LucideIconName } from '@/lib/icons';

/**
 * IconType - Valid icon type strings for the PixelIcon component.
 *
 * Format: `category-name` where category is one of:
 * - stat: Player/enemy stats (health, mana, power, etc.)
 * - status: Status effects (poison, stun, bleed, etc.)
 * - power: Player powers/spells
 * - item: Equipment and consumables
 * - ability: Path abilities and enemy abilities
 * - ui: UI elements (pause, play, speed controls)
 * - class: Character classes
 */
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
  /** Icon size in pixels. Defaults to 16. */
  size?: 16 | 24 | 32 | 48;
  className?: string;
  /** Apply pulse animation */
  animated?: boolean;
}

/**
 * Map icon type strings to Lucide icon names.
 * For path abilities, we use semantic keyword matching to select appropriate icons.
 */
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

/**
 * Keywords to icon mapping for semantic fallback.
 * Used when path abilities don't have explicit mappings.
 */
const KEYWORD_ICONS: Array<[RegExp, LucideIconName]> = [
  // Damage/Attack keywords
  [/strike|blow|attack|slash|wound|crushing|mortal/i, 'Sword'],
  [/kill|execute|death|assassin|vital/i, 'Target'],
  [/rage|fury|frenzy|berserk|wrath|enrage/i, 'Flame'],
  [/blood|bleed|pain|sacrifice/i, 'Droplets'],

  // Defense/Survival keywords
  [/shield|block|armor|guard|protect|fortress|iron/i, 'Shield'],
  [/heal|recovery|regenerat|restore/i, 'HeartPulse'],
  [/endur|last_stand|immovable|unbreakable/i, 'Mountain'],
  [/holy|divine|sacred|blessed|righteous/i, 'Cross'],

  // Magic keywords
  [/fire|flame|burn|inferno/i, 'Flame'],
  [/ice|frost|freeze|cold/i, 'Snowflake'],
  [/lightning|thunder|shock|electric/i, 'Zap'],
  [/spell|mana|arcane|magic/i, 'Wand2'],

  // Rogue keywords
  [/shadow|stealth|vanish|phantom/i, 'Moon'],
  [/ambush|surprise|sneak/i, 'Crosshair'],
  [/poison|toxic|venom/i, 'Skull'],
  [/dodge|evas|blur|uncanny/i, 'Wind'],
  [/riposte|counter|parry/i, 'Swords'],
  [/precision|crit|accuracy/i, 'Target'],
  [/blade|dagger|knife/i, 'Scissors'],

  // Buff/Aura keywords
  [/aura|presence|field/i, 'CircleDot'],
  [/buff|enhance|empower|amplify/i, 'TrendingUp'],
  [/cooldown|efficiency|reduction/i, 'Timer'],
  [/speed|haste|quick|adrenaline|rush/i, 'Wind'],

  // Path/Subpath names
  [/warlord|command|intimidat/i, 'Crown'],
  [/executioner/i, 'Target'],
  [/guardian|sentinel|protector/i, 'ShieldCheck'],
  [/avenger|thorns|vengeful|retribution/i, 'Flame'],
  [/templar|crusader|inquisitor/i, 'Cross'],
  [/archmage|elementalist|destroyer/i, 'Wand2'],
  [/enchanter|spellweaver|sage/i, 'Sparkles'],
  [/duelist|swashbuckler/i, 'Swords'],
  [/nightstalker|shadowblade/i, 'Moon'],
];

// Size mapping to Tailwind classes
const SIZE_CLASSES: Record<number, string> = {
  16: 'w-4 h-4',
  24: 'w-6 h-6',
  32: 'w-8 h-8',
  48: 'w-12 h-12',
};

/**
 * Get icon name using semantic keyword matching.
 * Falls back to category default if no keywords match.
 */
function getSemanticIcon(type: string): LucideIconName {
  // Handle undefined/null type gracefully
  if (!type) {
    return 'HelpCircle';
  }

  // Try keyword matching
  for (const [pattern, icon] of KEYWORD_ICONS) {
    if (pattern.test(type)) {
      return icon;
    }
  }

  // Fall back to category default
  const [category] = type.split('-');
  switch (category) {
    case 'stat':
      return 'Sparkles';
    case 'status':
      return 'AlertCircle';
    case 'power':
    case 'ability':
      return 'Sparkles';
    case 'item':
      return 'Package';
    case 'ui':
      return 'HelpCircle';
    case 'class':
      return 'User';
    default:
      return 'HelpCircle';
  }
}

/**
 * PixelIcon - Renders Lucide icons with consistent styling.
 *
 * Supports:
 * - Direct icon type mapping (e.g., 'stat-health' -> Heart)
 * - Semantic keyword matching for path abilities
 * - Category-based fallbacks with development warnings
 */
export function PixelIcon({ type, size = 16, className, animated }: PixelIconProps) {
  // Look up the Lucide icon name from the type
  let iconName = ICON_MAP[type];
  let usedFallback = false;

  // If not found in map, try semantic matching
  if (!iconName) {
    iconName = getSemanticIcon(type);
    usedFallback = true;

    // Log warning in development for unmapped icons
    if (import.meta.env.DEV) {
      console.warn(
        `[PixelIcon] No explicit mapping for "${type}". Using semantic fallback: "${iconName}".`
      );
    }
  }

  // Get the icon component
  const IconComponent = Icons[iconName] as React.ComponentType<{ className?: string }>;

  if (!IconComponent) {
    // This should never happen if ICON_MAP and KEYWORD_ICONS use valid Lucide names
    if (import.meta.env.DEV) {
      console.error(
        `[PixelIcon] Invalid Lucide icon name "${iconName}" from mapping. This is a bug in ICON_MAP or KEYWORD_ICONS.`
      );
    }

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
