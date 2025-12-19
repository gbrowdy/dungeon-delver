import { EnemyIntent } from '@/types/game';
import { getIcon, ABILITY_ICONS } from '@/lib/icons';

interface EnemyIntentDisplayProps {
  intent: EnemyIntent;
  isDying: boolean;
}

// Legacy emoji mapping to Lucide icon names
const EMOJI_TO_ICON: Record<string, string> = {
  '⚔️': ABILITY_ICONS.ATTACK,
  '⚔️⚔️': ABILITY_ICONS.MULTI_HIT,
  '⚔️⚔️⚔️': ABILITY_ICONS.TRIPLE_STRIKE,
  '🐍': ABILITY_ICONS.POISON,
  '💫': ABILITY_ICONS.STUN,
  '💚': ABILITY_ICONS.HEAL,
  '😤': ABILITY_ICONS.ENRAGE,
  '🛡️': ABILITY_ICONS.SHIELD,
};

/**
 * Maps emoji icons to Lucide icon components.
 * Fallback to Sword for unknown emojis.
 */
function getAbilityIcon(icon: string): React.ComponentType<{ className?: string }> {
  const iconName = EMOJI_TO_ICON[icon] || ABILITY_ICONS.ATTACK;
  return getIcon(iconName, 'Sword');
}

/**
 * EnemyIntentDisplay - Shows enemy's next action (mobile only).
 * Desktop intent display is handled inside CharacterSprite for better positioning.
 */
export function EnemyIntentDisplay({ intent, isDying }: EnemyIntentDisplayProps) {
  if (isDying || !intent) return null;

  const intentName = intent.type === 'ability' && intent.ability
    ? intent.ability.name
    : 'Attack';

  const IconComponent = getAbilityIcon(intent.icon);

  return (
    <div
      className="sm:hidden absolute -top-10 xs:-top-12 right-[calc(50%+2rem)] xs:right-[calc(50%+2.5rem)] bg-black/90 rounded px-1 py-0.5 border border-health/50 max-w-[72px]"
      aria-label={`Enemy intends to ${intentName}`}
    >
      <div className="flex items-start gap-0.5">
        <IconComponent className="w-4 h-4 flex-shrink-0" />
        <span className="text-health/90 font-medium text-pixel-2xs leading-tight">
          {intentName}
        </span>
      </div>
    </div>
  );
}
