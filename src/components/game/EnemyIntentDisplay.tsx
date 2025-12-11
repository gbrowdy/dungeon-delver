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

  return (
    <>
      {/* Mobile: Intent to the left of HP bar, vertically aligned with HP_BAR_POSITION */}
      <div
        className="sm:hidden absolute -top-10 xs:-top-12 right-[calc(50%+2rem)] xs:right-[calc(50%+2.5rem)] bg-black/90 rounded px-1 py-0.5 border border-health/50 max-w-[72px]"
        aria-label={`Enemy intends to ${intentName}`}
      >
        <div className="flex items-start gap-0.5">
          <span className="text-xs leading-none flex-shrink-0">{intent.icon}</span>
          <span className="text-health/90 font-medium text-pixel-2xs leading-tight">
            {intentName}
          </span>
        </div>
      </div>

      {/* Desktop: Intent above HP bar with full name */}
      <div className="hidden sm:block absolute -top-20 left-1/2 -translate-x-1/2 bg-black/80 rounded px-1.5 py-0.5 border border-health/50">
        <div className="flex items-center gap-1 text-xs whitespace-nowrap">
          <span className="text-base">{intent.icon}</span>
          <span className="text-health/90 font-medium text-xs">
            {intentName}
          </span>
        </div>
      </div>
    </>
  );
}
