import { EnemyIntent } from '@/types/game';

interface EnemyIntentDisplayProps {
  intent: EnemyIntent;
  isDying: boolean;
}

export function EnemyIntentDisplay({ intent, isDying }: EnemyIntentDisplayProps) {
  if (isDying || !intent) return null;

  const intentName = intent.type === 'ability' && intent.ability
    ? intent.ability.name
    : 'Attack';

  // Mobile only - desktop intent is rendered inside CharacterSprite
  return (
    <div
      className="absolute -top-10 xs:-top-12 right-[calc(50%+2rem)] xs:right-[calc(50%+2.5rem)] bg-black/90 rounded px-1 py-0.5 border border-health/50 max-w-[72px]"
      aria-label={`Enemy intends to ${intentName}`}
    >
      <div className="flex items-start gap-0.5">
        <span className="text-xs leading-none flex-shrink-0">{intent.icon}</span>
        <span className="text-health/90 font-medium text-pixel-2xs leading-tight">
          {intentName}
        </span>
      </div>
    </div>
  );
}
