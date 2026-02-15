import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';

export function EndlessDefeat() {
  const depth = useGameStore(s => s.depth);
  const lastDeathStats = useGameStore(s => s.lastDeathStats);
  const resetGame = useGameStore(s => s.resetGame);

  return (
    <div data-testid="endless-defeat" className="min-h-screen bg-gradient-to-b from-red-950/20 via-slate-950 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <h2 className="pixel-title text-pixel-sm text-red-400 uppercase">
          The Depths Claimed You
        </h2>

        <PixelDivider color="red" />

        {/* High score */}
        <div className="space-y-2">
          <div className="pixel-text text-pixel-xs text-muted-foreground">Deepest Floor Reached</div>
          <div className="pixel-title text-3xl text-amber-400 font-bold">{depth}</div>
        </div>

        {/* Death info (if available) */}
        {lastDeathStats && (
          <div className="pixel-panel-dark p-4 rounded space-y-2">
            <div className="pixel-text text-pixel-xs text-muted-foreground">
              Killed on Floor {lastDeathStats.floor}, Room {lastDeathStats.room}
            </div>
            <div className="pixel-text text-pixel-xs text-muted-foreground">
              by a{' '}
              <span className="text-foreground capitalize">
                {lastDeathStats.enemyModifiers.join(' ')} {lastDeathStats.enemyTier}
              </span>{' '}
              enemy
            </div>
          </div>
        )}

        <Button
          onClick={resetGame}
          size="lg"
          className="pixel-button-main text-pixel-xs px-8 py-4 bg-slate-700 hover:bg-slate-600 border-b-4 border-slate-900 uppercase font-bold"
        >
          Return to Menu
        </Button>
      </div>
    </div>
  );
}
