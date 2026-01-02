import { Button } from '@/components/ui/button';
import { Keyboard, Pause, Play, FastForward, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCombat } from '@/contexts/CombatContext';
import { KEYBOARD_SHORTCUTS } from '@/hooks/useGameKeyboard';
import { CombatSpeed } from '@/types/game';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * CombatHeader - Displays floor progress, gold, and combat controls.
 * Styled with pixel art / 8-bit retro aesthetic.
 */
export function CombatHeader() {
  const { gameState, actions } = useCombat();
  const { currentFloor, currentRoom, roomsPerFloor, isPaused, combatSpeed, currentEnemy } = gameState;

  // Calculate enemies remaining
  const enemiesDefeated = currentRoom > 0 ? currentRoom - (currentEnemy ? 1 : 0) : 0;
  const enemiesRemaining = roomsPerFloor - enemiesDefeated;
  const isLastEnemy = currentRoom === roomsPerFloor && currentEnemy;

  return (
    <div className="pixel-panel rounded-lg p-2 sm:p-3">
      {/* Header layout - single row with flexible spacing */}
      <div className="flex items-center justify-between gap-1 xs:gap-2">
        {/* Left side: Floor info */}
        <div className="min-w-0">
          <h2 data-testid="floor-indicator" className="pixel-text text-pixel-sm xs:text-pixel-base text-primary font-bold whitespace-nowrap">
            Floor {currentFloor}
          </h2>
          <div className="flex items-center gap-1 xs:gap-2 pixel-text text-pixel-2xs xs:text-pixel-xs">
            <span className="text-slate-400 hidden sm:inline">Room:</span>
            <EnemyProgressIndicators
              total={roomsPerFloor}
              defeated={enemiesDefeated}
              hasCurrent={!!currentEnemy}
            />
            <span className="text-slate-400 whitespace-nowrap">
              {enemiesRemaining} left
            </span>
            {isLastEnemy && (
              <span className="text-gold font-bold animate-pulse">
                BOSS!
              </span>
            )}
          </div>
        </div>

        {/* Right side: Controls - always visible */}
        <div className="flex items-center gap-1 xs:gap-2 sm:gap-3 flex-shrink-0">
          {/* Speed Controls */}
          <SpeedControls
            currentSpeed={combatSpeed}
            onSetSpeed={actions.setCombatSpeed}
          />

          {/* Pause/Play */}
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              actions.togglePause();
              e.currentTarget.blur();
            }}
            aria-label={isPaused ? "Resume combat" : "Pause combat"}
            className={cn(
              "pixel-button h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
              isPaused && "bg-warning/20"
            )}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-slate-300" />}
          </Button>

          {/* Keyboard shortcuts help - only on desktop (useless on touch) */}
          <div className="hidden sm:block">
            <KeyboardShortcutsHelp />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * EnemyProgressIndicators - Shows pixel-styled dots for each enemy on the floor.
 */
interface EnemyProgressIndicatorsProps {
  total: number;
  defeated: number;
  hasCurrent: boolean;
}

function EnemyProgressIndicators({ total, defeated, hasCurrent }: EnemyProgressIndicatorsProps) {
  return (
    <div data-testid="room-indicator" className="flex gap-0.5" role="img" aria-label={`${defeated} of ${total} enemies defeated`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-1.5 sm:w-2 sm:h-2 transition-all',
            i < defeated
              ? 'bg-success shadow-[0_0_4px_rgba(34,197,94,0.5)]'
              : i === defeated && hasCurrent
              ? 'bg-health animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.6)]'
              : 'bg-slate-600'
          )}
          style={{ imageRendering: 'pixelated' }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * SpeedControls - Pixel-styled combat speed selector (1x, 2x, 3x).
 */
interface SpeedControlsProps {
  currentSpeed: CombatSpeed;
  onSetSpeed: (speed: CombatSpeed) => void;
}

function SpeedControls({ currentSpeed, onSetSpeed }: SpeedControlsProps) {
  const SpeedIcon = ({ speed, isActive }: { speed: CombatSpeed; isActive: boolean }) => {
    const colorClass = isActive ? 'text-primary-foreground' : 'text-slate-400';
    switch (speed) {
      case 1: return <Play className={`w-3 h-3 ${colorClass}`} />;
      case 2: return <FastForward className={`w-3 h-3 ${colorClass}`} />;
      case 3: return <ChevronsRight className={`w-3 h-3 ${colorClass}`} />;
    }
  };

  return (
    <div
      className="flex items-center gap-0.5 pixel-panel-dark rounded p-0.5"
      role="group"
      aria-label="Combat speed controls"
    >
      {([1, 2, 3] as CombatSpeed[]).map((speed) => (
        <Button
          key={speed}
          variant={currentSpeed === speed ? "default" : "ghost"}
          size="sm"
          className={cn(
            "pixel-text text-pixel-2xs xs:text-pixel-xs h-6 xs:h-7 sm:h-8 px-1.5 xs:px-2 sm:px-3 focus-visible:ring-0 focus-visible:ring-offset-0 flex items-center gap-1",
            currentSpeed === speed && "bg-primary text-primary-foreground"
          )}
          onClick={(e) => {
            onSetSpeed(speed);
            e.currentTarget.blur();
          }}
          aria-label={`Set combat speed to ${speed}x`}
          aria-pressed={currentSpeed === speed}
        >
          <span className="hidden sm:inline-block"><SpeedIcon speed={speed} isActive={currentSpeed === speed} /></span>
          <span>{speed}x</span>
        </Button>
      ))}
    </div>
  );
}

/**
 * KeyboardShortcutsHelp - Tooltip showing available keyboard shortcuts.
 */
function KeyboardShortcutsHelp() {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center justify-center h-8 w-8 text-slate-400"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="pixel-panel max-w-xs">
          <div className="space-y-1.5">
            <p className="pixel-text text-pixel-sm font-medium mb-2 text-primary">Keyboard Shortcuts</p>
            {KEYBOARD_SHORTCUTS.map((shortcut) => (
              <div key={shortcut.key} className="flex justify-between gap-4">
                <kbd className="pixel-text text-pixel-xs px-2 py-1 bg-slate-800 rounded border border-slate-600">
                  {shortcut.key}
                </kbd>
                <span className="pixel-text text-pixel-xs text-slate-400">{shortcut.action}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
