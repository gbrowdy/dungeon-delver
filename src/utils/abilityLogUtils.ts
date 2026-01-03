/**
 * Utility functions for formatting ability information in combat logs.
 */

/**
 * Map ability icon IDs to emoji characters for log messages.
 * The icon field contains values like 'ability-triple_strike' which are
 * used for UI icon lookup, but logs should use emojis.
 */
const ABILITY_ICON_TO_EMOJI: Record<string, string> = {
  'ability-multi_hit': '⚔️',
  'ability-triple_strike': '⚔️',
  'ability-poison': '☠️',
  'ability-stun': '⚡',
  'ability-heal': '💚',
  'ability-enrage': '😤',
  'ability-shield': '🛡️',
  'ability-attack': '🗡️',
};

/**
 * Convert an ability icon ID to an emoji for use in log messages.
 * Falls back to a default sword emoji if the icon is not recognized.
 */
export function getAbilityEmoji(iconId: string): string {
  return ABILITY_ICON_TO_EMOJI[iconId] ?? '⚔️';
}
