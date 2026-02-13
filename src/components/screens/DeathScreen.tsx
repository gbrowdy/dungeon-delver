import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';

export function DeathScreen() {
  const lastDeathStats = useGameStore(s => s.lastDeathStats);
  const checkpoint = useGameStore(s => s.checkpoint);
  const respawnAtCheckpoint = useGameStore(s => s.respawnAtCheckpoint);

  if (!lastDeathStats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="pixel-text text-muted-foreground">No death data available.</p>
      </div>
    );
  }

  const ds = lastDeathStats;

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950/30 via-slate-950 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Heading */}
        <div className="text-center">
          <h2 className="pixel-title text-pixel-sm text-red-400 uppercase">Defeated</h2>
          <p className="pixel-text text-pixel-xs text-muted-foreground mt-1">
            Floor {ds.floor}, Room {ds.room}
          </p>
        </div>

        <PixelDivider color="red" />

        {/* Killed by */}
        <div className="text-center pixel-text text-pixel-xs text-muted-foreground">
          Killed by:{' '}
          <span className="text-foreground capitalize">
            {ds.enemyTier}{' '}
            {ds.enemyModifiers.map(m => (
              <span key={m} className="text-amber-400 capitalize">{m} </span>
            ))}
            enemy
          </span>
        </div>

        {/* Stat comparison */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="pixel-text text-pixel-xs text-muted-foreground">Stat</div>
          <div className="pixel-text text-pixel-xs text-blue-400">You</div>
          <div className="pixel-text text-pixel-xs text-red-400">Enemy</div>

          {/* Power */}
          <div className="pixel-text text-pixel-xs text-muted-foreground">Power</div>
          <div className="pixel-text text-pixel-xs text-foreground">{ds.playerStats.power}</div>
          <div className="pixel-text text-pixel-xs text-foreground">{ds.enemyStats.power}</div>

          {/* Fortitude */}
          <div className="pixel-text text-pixel-xs text-muted-foreground">Fortitude</div>
          <div className="pixel-text text-pixel-xs text-foreground">{ds.playerStats.fortitude}</div>
          <div className="pixel-text text-pixel-xs text-foreground">{ds.enemyStats.fortitude}</div>

          {/* Speed */}
          <div className="pixel-text text-pixel-xs text-muted-foreground">Speed</div>
          <div className="pixel-text text-pixel-xs text-foreground">{ds.playerStats.speed}</div>
          <div className="pixel-text text-pixel-xs text-foreground">{ds.enemyStats.speed}</div>
        </div>

        {/* Damage comparison */}
        <div className="flex justify-around pixel-text text-pixel-xs">
          <div className="text-center">
            <div className="text-muted-foreground">You dealt</div>
            <div className="text-foreground font-bold">~{ds.playerDamagePerHit}/hit</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Enemy dealt</div>
            <div className="text-foreground font-bold">~{ds.enemyDamagePerHit}/hit</div>
          </div>
        </div>

        <PixelDivider color="red" />

        {/* Weakness hint */}
        <div className="pixel-panel-dark p-4 rounded">
          <div className="pixel-text text-pixel-xs text-amber-400 font-bold mb-1">Weakness</div>
          <div className="pixel-text text-[8px] text-muted-foreground leading-relaxed">
            {ds.weaknessHint}
          </div>
        </div>

        {/* Respawn button */}
        <div className="text-center pt-2">
          <Button
            onClick={respawnAtCheckpoint}
            size="lg"
            className="pixel-button-main text-pixel-xs px-8 py-4 bg-orange-600 hover:bg-orange-500 border-b-4 border-orange-800 uppercase font-bold"
          >
            Respawn at Floor {Math.max(1, checkpoint)}
          </Button>
        </div>
      </div>
    </div>
  );
}
