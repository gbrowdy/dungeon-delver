import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';

export function CombatHeader() {
  const floor = useGameStore(s => s.floor);
  const room = useGameStore(s => s.room);
  const roomsPerFloor = useGameStore(s => s.roomsPerFloor);
  const speedMultiplier = useGameStore(s => s.speedMultiplier);
  const paused = useGameStore(s => s.paused);
  const cycleSpeed = useGameStore(s => s.cycleSpeed);
  const togglePause = useGameStore(s => s.togglePause);

  return (
    <div className="flex items-center justify-between px-3 py-2">
      {/* Floor/room info */}
      <div className="pixel-text text-pixel-xs text-muted-foreground">
        Floor {floor} — Room {room}/{roomsPerFloor}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Speed toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={cycleSpeed}
          className="pixel-text text-pixel-xs min-w-[48px] min-h-[44px]"
          data-testid="speed-toggle"
        >
          {speedMultiplier}x
        </Button>

        {/* Pause */}
        <Button
          variant="outline"
          size="sm"
          onClick={togglePause}
          className="pixel-text text-pixel-xs min-w-[48px] min-h-[44px]"
          data-testid="pause-toggle"
        >
          {paused ? 'Play' : 'Pause'}
        </Button>
      </div>
    </div>
  );
}
