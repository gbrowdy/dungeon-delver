import type { DraftCard as DraftCardType } from '@/types/game';
import { StatIcon, STAT_LABELS } from './StatIcon';
import { cn } from '@/lib/utils';

interface DraftCardProps {
  card: DraftCardType;
  selected: boolean;
  onSelect: () => void;
}

export function DraftCard({ card, selected, onSelect }: DraftCardProps) {
  return (
    <button
      data-selected={selected}
      onClick={onSelect}
      className={cn(
        'pixel-panel p-4 sm:p-5 flex flex-col items-center gap-3 rounded-lg border-2 transition-all duration-200 cursor-pointer w-full',
        selected
          ? 'border-amber-500/70 shadow-lg shadow-amber-500/20 bg-slate-800/80'
          : 'border-transparent hover:border-slate-600 bg-slate-900/60'
      )}
    >
      <StatIcon stat={card.stat} size="lg" />

      <div className="pixel-text text-pixel-lg text-foreground font-bold">
        +{card.value}
      </div>

      <div className="pixel-text text-pixel-xs text-muted-foreground">
        {STAT_LABELS[card.stat]}
      </div>

      {/* Impact preview */}
      <div className="pixel-text text-pixel-xs text-amber-400 mt-1">
        {card.impactPreview}
      </div>
    </button>
  );
}
