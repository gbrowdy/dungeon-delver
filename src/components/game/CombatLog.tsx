import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getIcon, type LucideIconName } from '@/lib/icons';

// Map log entry types to Lucide icon names
const LOG_ICONS: Record<string, LucideIconName> = {
  skull: 'Skull',
  attack: 'Sword',
  regeneration: 'HeartPulse',
  shield: 'Shield',
  speed: 'Wind',
  power: 'Zap',
  sparkle: 'Sparkles',
  star: 'Star',
  enrage: 'Flame',
  poison: 'Skull',
  question: 'HelpCircle',
};

/**
 * Props for the CombatLog component.
 */
interface CombatLogProps {
  logs: string[];
}

interface LogEntry {
  iconName: LucideIconName;
  color: string;
  text: string;
}

/**
 * Parses a combat log entry and returns icon, color, and formatted text.
 */
function formatLogEntry(log: string): LogEntry {
  // Victory/defeat events
  if (log.includes('defeated') || log.includes('slain')) {
    return { iconName: LOG_ICONS.skull, color: 'text-gold', text: log };
  }

  // Critical hits
  if (log.includes('Critical hit') || log.includes('critical')) {
    return { iconName: LOG_ICONS.attack, color: 'text-warning', text: log };
  }

  // Healing
  if (log.includes('Healed') || log.includes('restored') || log.includes('regenerated')) {
    return { iconName: LOG_ICONS.regeneration, color: 'text-success', text: log };
  }

  // Blocking
  if (log.includes('blocked') || log.includes('Block')) {
    return { iconName: LOG_ICONS.shield, color: 'text-info', text: log };
  }

  // Dodging
  if (log.includes('dodged') || log.includes('missed')) {
    return { iconName: LOG_ICONS.speed, color: 'text-slate-400', text: log };
  }

  // Player attacks (Hero attacks enemy)
  if (log.startsWith('Hero attacks') || log.includes('You dealt') || log.includes('You hit')) {
    return { iconName: LOG_ICONS.power, color: 'text-primary', text: log };
  }

  // Enemy attacks (enemy attacks Hero)
  if (log.includes('attacks Hero') || log.includes('hit you') || log.includes('takes')) {
    return { iconName: LOG_ICONS.attack, color: 'text-health', text: log };
  }

  // Power/spell usage
  if (log.includes('casts') || log.includes('uses') || log.includes('activates')) {
    return { iconName: LOG_ICONS.sparkle, color: 'text-accent', text: log };
  }

  // Level up
  if (log.includes('Level') || log.includes('level')) {
    return { iconName: LOG_ICONS.star, color: 'text-xp', text: log };
  }

  // Buff/debuff
  if (log.includes('buff') || log.includes('enraged') || log.includes('shielded')) {
    return { iconName: LOG_ICONS.enrage, color: 'text-accent', text: log };
  }

  // Status effects
  if (log.includes('poisoned') || log.includes('stunned') || log.includes('frozen')) {
    return { iconName: LOG_ICONS.poison, color: 'text-destructive', text: log };
  }

  // Default - use question mark icon
  return { iconName: LOG_ICONS.question, color: 'text-slate-400', text: log };
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
  const logsArray = logs ?? [];

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
            const { iconName, color, text } = formatLogEntry(log);
            const IconComponent = getIcon(iconName);
            return (
              <div
                key={i}
                className="flex items-start gap-1 xs:gap-1.5"
              >
                <IconComponent className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className={cn('pixel-text text-pixel-2xs xs:text-pixel-xs leading-relaxed', color)}>{text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
