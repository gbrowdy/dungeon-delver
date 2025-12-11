import { useState, useEffect } from 'react';
import { CombatEvent } from '@/hooks/useBattleAnimation';
import { Player, Enemy } from '@/types/game';
import { COMBAT_EVENT_TYPE } from '@/constants/enums';

/**
 * Formats a combat event into a screen reader announcement.
 * Uses the discriminated union CombatEvent type for type-safe event handling.
 */
function formatCombatAnnouncement(event: CombatEvent | null, playerName: string, enemyName: string | undefined): string {
  if (!event) return '';

  switch (event.type) {
    case COMBAT_EVENT_TYPE.PLAYER_ATTACK:
      return `You ${event.isCrit ? 'critically ' : ''}hit ${enemyName || 'enemy'} for ${event.damage} damage.`;

    case COMBAT_EVENT_TYPE.PLAYER_DODGE:
      return `You dodged ${enemyName || 'enemy'}'s attack.`;

    case COMBAT_EVENT_TYPE.ENEMY_ATTACK:
      return `${enemyName || 'Enemy'} ${event.isCrit ? 'critically ' : ''}attacks for ${event.damage} damage.`;

    case COMBAT_EVENT_TYPE.PLAYER_HIT:
      if (event.targetDied) {
        return `${playerName} has fallen in battle.`;
      }
      return `You took ${event.damage} damage${event.isCrit ? ' (critical hit)' : ''}.`;

    case COMBAT_EVENT_TYPE.ENEMY_HIT:
      if (event.targetDied) {
        return `${enemyName || 'Enemy'} defeated!`;
      }
      return `${enemyName || 'Enemy'} took ${event.damage} damage${event.isCrit ? ' (critical hit)' : ''}.`;

    case COMBAT_EVENT_TYPE.PLAYER_POWER:
      return `You used a power, dealing ${event.damage} damage${event.isCrit ? ' (critical hit)' : ''}.`;

    default:
      return '';
  }
}

interface ScreenReaderAnnouncerProps {
  lastCombatEvent: CombatEvent | null;
  player: Player;
  enemy: Enemy | null;
}

export function ScreenReaderAnnouncer({
  lastCombatEvent,
  player,
  enemy,
}: ScreenReaderAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');
  const [lowHealthWarning, setLowHealthWarning] = useState(false);

  // Announce combat events for screen readers
  useEffect(() => {
    if (lastCombatEvent) {
      const message = formatCombatAnnouncement(lastCombatEvent, player.name, enemy?.name);
      if (message) {
        setAnnouncement(message);
      }
    }
  }, [lastCombatEvent, player.name, enemy?.name]);

  // Low health warning for screen readers
  useEffect(() => {
    const healthPercent = player.currentStats.health / player.currentStats.maxHealth;
    if (healthPercent <= 0.25 && !lowHealthWarning) {
      setLowHealthWarning(true);
    } else if (healthPercent > 0.25 && lowHealthWarning) {
      setLowHealthWarning(false);
    }
  }, [player.currentStats.health, player.currentStats.maxHealth, lowHealthWarning]);

  return (
    <>
      {/* Combat events - polite announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Low health warning - assertive alert */}
      <div
        role="alert"
        aria-live="assertive"
        className="sr-only"
      >
        {lowHealthWarning && "Warning: Health is critically low!"}
      </div>
    </>
  );
}
