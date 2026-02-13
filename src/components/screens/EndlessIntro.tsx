import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';

export function EndlessIntro() {
  const startEndless = useGameStore(s => s.startEndless);
  const player = useGameStore(s => s.player);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/30 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <h2 className="pixel-title text-pixel-sm text-amber-400 uppercase">
          Floor 100 Complete
        </h2>

        <PixelDivider color="orange" />

        <div className="space-y-4">
          <p className="pixel-text text-pixel-xs text-foreground leading-relaxed">
            You have conquered the dungeon.
          </p>
          <p className="pixel-text text-pixel-xs text-muted-foreground leading-relaxed">
            Beyond this point, there are no checkpoints.
            Death ends your run. Your depth is your score.
          </p>
          <p className="pixel-text text-pixel-xs text-red-400 leading-relaxed">
            There is no safety net.
          </p>
        </div>

        {/* Stats snapshot */}
        <div className="flex justify-center gap-4 pixel-text text-pixel-xs text-muted-foreground">
          <span>Power: {player.power}</span>
          <span>Fort: {player.fortitude}</span>
          <span>Speed: {player.speed}</span>
          <span>Luck: {player.luck}</span>
        </div>

        <Button
          onClick={startEndless}
          size="lg"
          className="pixel-button-main text-pixel-xs px-8 py-4 bg-red-700 hover:bg-red-600 border-b-4 border-red-900 uppercase font-bold"
        >
          Enter the Endless Depths
        </Button>
      </div>
    </div>
  );
}
