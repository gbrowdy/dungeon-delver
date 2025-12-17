import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

import { CircularBuffer } from '@/utils/circularBuffer';

/**
 * Props for the CombatLog component.
 */
interface CombatLogProps {
  logs: CircularBuffer<string>;
}

interface LogEntry {
  icon: string;
  color: string;
  text: string;
}

/**
 * Parses a combat log entry and returns icon, color, and formatted text.
 */
function formatLogEntry(log: string): LogEntry {
  // Victory/defeat events
  if (log.includes('defeated') || log.includes('slain')) {
    return { icon: '💀', color: 'text-gold', text: log };
  }

  // Critical hits
  if (log.includes('Critical hit') || log.includes('critical')) {
    return { icon: '💥', color: 'text-warning', text: log };
  }

  // Healing
  if (log.includes('Healed') || log.includes('restored') || log.includes('regenerated')) {
    return { icon: '💚', color: 'text-success', text: log };
  }

  // Blocking
  if (log.includes('blocked') || log.includes('Block')) {
    return { icon: '🛡️', color: 'text-info', text: log };
  }

  // Dodging
  if (log.includes('dodged') || log.includes('missed')) {
    return { icon: '💨', color: 'text-slate-400', text: log };
  }

  // Player attacks
  if (log.includes('You dealt') || log.includes('You hit') || log.includes('deals')) {
    return { icon: '⚔️', color: 'text-primary', text: log };
  }

  // Enemy attacks
  if (log.includes('takes') || log.includes('hit you') || log.includes('attacks')) {
    return { icon: '🔴', color: 'text-health', text: log };
  }

  // Power/spell usage
  if (log.includes('casts') || log.includes('uses') || log.includes('activates')) {
    return { icon: '✨', color: 'text-accent', text: log };
  }

  // Level up
  if (log.includes('Level') || log.includes('level')) {
    return { icon: '⬆️', color: 'text-xp', text: log };
  }

  // Buff/debuff
  if (log.includes('buff') || log.includes('enraged') || log.includes('shielded')) {
    return { icon: '🔮', color: 'text-accent', text: log };
  }

  // Status effects
  if (log.includes('poisoned') || log.includes('stunned') || log.includes('frozen')) {
    return { icon: '☠️', color: 'text-destructive', text: log };
  }

  // Default
  return { icon: '•', color: 'text-slate-400', text: log };
}

/**
 * CombatLog - Displays a scrollable log of combat events with pixel art styling.
 * Hidden on very small mobile screens to reduce visual clutter.
 */
export function CombatLog({ logs }: CombatLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Defensive check: logs might be undefined during error recovery
  if (!logs) {
    console.error('[CombatLog] logs prop is undefined - this indicates state corruption during combat');
  }
  const logsArray = logs?.toArray() ?? [];

  useEffect(() => {
    // Scroll within the container only, don't use scrollIntoView which can jump the page
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logsArray.length]);

  return (
    // Hide on very small screens (< 360px) to save space
    <div className="pixel-panel rounded-lg overflow-hidden hidden xs:block">
      <div className="px-2 py-1 border-b border-slate-700/50">
        <h3 className="pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400">Combat Log</h3>
      </div>
      <div
        ref={scrollRef}
        className="h-16 xs:h-20 sm:h-24 md:h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        role="log"
        aria-live="polite"
        aria-label="Combat log"
      >
        <div className="p-1.5 xs:p-2 space-y-0.5">
          {logsArray.slice(-10).map((log, i) => {
            const { icon, color, text } = formatLogEntry(log);
            return (
              <div
                key={i}
                className="flex items-start gap-1 xs:gap-1.5"
              >
                <span className="text-pixel-xs xs:text-pixel-sm flex-shrink-0 mt-0.5" aria-hidden="true">{icon}</span>
                <span className={cn('pixel-text text-pixel-2xs xs:text-pixel-xs leading-relaxed', color)}>{text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
