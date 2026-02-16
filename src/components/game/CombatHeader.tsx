import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      <div className="pixel-text text-pixel-xs text-muted-foreground" data-testid="floor-indicator">
        Floor {floor} — Room {room}/{roomsPerFloor}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Speed toggle */}
        <Button
          variant={speedMultiplier === 1 ? 'outline' : 'default'}
          size="sm"
          onClick={cycleSpeed}
          className={cn(
            'pixel-text text-pixel-xs min-w-[48px] min-h-[44px]',
            speedMultiplier > 1 && 'bg-amber-600 hover:bg-amber-500 text-white border-amber-700',
          )}
          data-testid="speed-toggle"
        >
          {speedMultiplier}x
        </Button>

        {/* Pause */}
        <Button
          variant={paused ? 'default' : 'outline'}
          size="sm"
          onClick={togglePause}
          className={cn(
            'pixel-text text-pixel-xs min-w-[48px] min-h-[44px]',
            paused && 'bg-blue-600 hover:bg-blue-500 text-white border-blue-700',
          )}
          data-testid="pause-toggle"
        >
          {paused ? 'Play' : 'Pause'}
        </Button>
      </div>
    </div>
  );
}
