import { useGameStore } from '@/store/gameStore';
import { DraftCard } from '@/components/game/DraftCard';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';

export function DraftScreen() {
  const player = useGameStore(s => s.player);
  const draftChoices = useGameStore(s => s.draftChoices);
  const selectedChoices = useGameStore(s => s.selectedChoices);
  const selectDraftCard = useGameStore(s => s.selectDraftCard);
  const confirmDraft = useGameStore(s => s.confirmDraft);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Current stats bar */}
        <div className="flex flex-wrap justify-center gap-4 pixel-text text-pixel-xs text-muted-foreground">
          <span>Power: {player.power}</span>
          <span>Fortitude: {player.fortitude}</span>
          <span>Speed: {player.speed}</span>
          <span>Luck: {player.luck}</span>
        </div>

        <PixelDivider color="orange" />

        <h2 className="pixel-title text-pixel-sm text-center text-foreground">
          Choose a Stat Boost
        </h2>

        {/* Draft cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {draftChoices.map((card, index) => (
            <DraftCard
              key={index}
              card={card}
              selected={selectedChoices.includes(index)}
              onSelect={() => selectDraftCard(index)}
            />
          ))}
        </div>

        {/* Confirm button */}
        <div className="text-center pt-2">
          <Button
            onClick={confirmDraft}
            disabled={selectedChoices.length === 0}
            className="pixel-button-main text-pixel-xs px-8 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed border-b-4 border-orange-800 uppercase font-bold"
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
