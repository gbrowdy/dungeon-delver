/**
 * Shared icon utilities for consistent icon handling across the codebase.
 *
 * This module provides:
 * - LucideIconName type definition (single source of truth)
 * - IconComponent type for React icon components
 * - getIcon() utility for safe icon lookup with fallback
 * - Development warnings for missing icons
 */

import * as Icons from 'lucide-react';

/**
 * Type representing valid Lucide React icon names.
 * Use this instead of defining `type LucideIconName = keyof typeof Icons` in each file.
 */
export type LucideIconName = keyof typeof Icons;

/**
 * Type for a React icon component that accepts className prop.
 */
export type IconComponent = React.ComponentType<{ className?: string }>;

/**
 * Safely get a Lucide icon component by name with fallback support.
 * Logs a warning in development when falling back to default icon.
 *
 * @param name - The Lucide icon name (e.g., 'Heart', 'Sword')
 * @param fallback - Fallback icon name if the requested icon doesn't exist (default: 'HelpCircle')
 * @returns The Lucide icon component
 *
 * @example
 * const HeartIcon = getIcon('Heart');
 * const SwordIcon = getIcon(item.icon, 'Package'); // Custom fallback
 */
export function getIcon(name: string | undefined, fallback: LucideIconName = 'HelpCircle'): IconComponent {
  if (name && name in Icons) {
    return Icons[name as LucideIconName] as IconComponent;
  }

  if (import.meta.env.DEV && name) {
    console.warn(`[getIcon] Unknown icon "${name}". Falling back to "${fallback}".`);
  }

  return Icons[fallback] as IconComponent;
}

/**
 * Check if a string is a valid Lucide icon name.
 *
 * @param name - The string to check
 * @returns True if the name is a valid Lucide icon
 */
export function isValidIcon(name: string): name is LucideIconName {
  return name in Icons;
}

// Re-export icon constants for convenience
export {
  STAT_ICONS,
  STATUS_ICONS,
  POWER_ICONS,
  ABILITY_ICONS,
  ITEM_ICONS,
  UI_ICONS,
  CLASS_ICONS,
  CLASS_COLORS,
  type CharacterClassKey,
  type IconName,
} from '@/constants/icons';
