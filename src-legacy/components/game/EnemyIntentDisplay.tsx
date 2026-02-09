import { EnemyIntent } from '@/types/game';
import { getIcon, ABILITY_ICONS } from '@/lib/icons';

interface EnemyIntentDisplayProps {
  intent: EnemyIntent;
  isDying: boolean;
}

// Icon ID mapping to Lucide icon names
const ICON_ID_TO_ABILITY: Record<string, string> = {
  'ability-attack': ABILITY_ICONS.ATTACK,
  'ability-multi_hit': ABILITY_ICONS.MULTI_HIT,
  'ability-triple_strike': ABILITY_ICONS.TRIPLE_STRIKE,
  'ability-poison': ABILITY_ICONS.POISON,
  'ability-stun': ABILITY_ICONS.STUN,
  'ability-heal': ABILITY_ICONS.HEAL,
  'ability-enrage': ABILITY_ICONS.ENRAGE,
  'ability-shield': ABILITY_ICONS.SHIELD,
};

/**
 * Maps icon IDs to Lucide icon components.
 * Fallback to Sword for unknown icon IDs.
 */
function getAbilityIcon(icon: string): React.ComponentType<{ className?: string }> {
  const iconName = ICON_ID_TO_ABILITY[icon] || ABILITY_ICONS.ATTACK;
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
