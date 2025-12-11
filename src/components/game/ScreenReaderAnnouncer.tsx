import { useState, useEffect } from 'react';
import { CombatEvent } from '@/hooks/useBattleAnimation';
import { Player, Enemy } from '@/types/game';

/**
 * Formats a combat event into a screen reader announcement.
 */
function formatCombatAnnouncement(event: CombatEvent | null, playerName: string, enemyName: string | undefined): string {
  if (!event) return '';

  switch (event.type) {
    case 'PLAYER_ATTACK':
      if (event.isDodged) {
        return `${enemyName || 'Enemy'} dodged your attack.`;
      }
      return `You ${event.isCrit ? 'critically ' : ''}hit ${enemyName || 'enemy'} for ${event.damage} damage.`;

    case 'ENEMY_ATTACK':
      if (event.isBlocked) {
        return `You blocked ${enemyName || 'enemy'}'s attack, reducing damage to ${event.damage}.`;
      }
      if (event.isDodged) {
        return `You dodged ${enemyName || 'enemy'}'s attack.`;
      }
      return `${enemyName || 'Enemy'} ${event.isCrit ? 'critically ' : ''}hit you for ${event.damage} damage.`;

    case 'PLAYER_POWER':
      return `You used ${event.powerName || 'a power'}${event.damage ? `, dealing ${event.damage} damage` : ''}.`;

    case 'ENEMY_DEATH':
      return `${enemyName || 'Enemy'} defeated!`;

    case 'PLAYER_DEATH':
      return `${playerName} has fallen in battle.`;

    case 'LEVEL_UP':
      return `Level up! You are now level ${event.newLevel}.`;

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
