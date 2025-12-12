import { useCallback, useEffect, useRef } from 'react';
import { GameState, Player, Item, EnemyAbility, Power } from '@/types/game';
import { generateEnemy } from '@/data/enemies';
import { calculateStats } from '@/hooks/useCharacterSetup';
import { COMBAT_BALANCE } from '@/constants/balance';
import { GAME_PHASE, ITEM_EFFECT_TRIGGER, EFFECT_TYPE, BUFF_STAT } from '@/constants/enums';
import { logStateTransition, logCombatEvent, logDeathEvent } from '@/utils/gameLogger';

/**
 * Hook for room transitions and enemy spawning.
 *
 * Handles:
 * - Spawning enemies when entering new rooms
 * - Combat_start item effects
 * - Animation callbacks for death completion
 */
export function useRoomTransitions(
  setState: React.Dispatch<React.SetStateAction<GameState>>
) {
  // Ref to hold nextRoom function for useEffect without dependency issues (Issue 14 fix)
  const nextRoomRef = useRef<(() => void) | null>(null);

  const nextRoom = useCallback(() => {
    setState((prev: GameState) => {
      if (!prev.player) return prev;

      const newRoom = prev.currentRoom + 1;
      const enemy = generateEnemy(prev.currentFloor, newRoom, prev.roomsPerFloor);
      const logs: string[] = [`Room ${newRoom}: A ${enemy.name} appears!`];

      logCombatEvent('enemy_spawn', {
        room: newRoom,
        floor: prev.currentFloor,
        enemyName: enemy.name,
        isBoss: enemy.isBoss
      });

      // Reset player state for new combat
      const player: Player = {
        ...prev.player,
        statusEffects: [], // Clear status effects between rooms
        isBlocking: false,
        comboCount: 0,
        lastPowerUsed: null,
      };

      // Trigger combat_start item effects
      player.equippedItems.forEach((item: Item) => {
        if (item.effect?.trigger === ITEM_EFFECT_TRIGGER.COMBAT_START) {
          const chance = item.effect.chance ?? 1;
          if (Math.random() < chance) {
            if (item.effect.type === EFFECT_TYPE.MANA) {
              player.currentStats.mana = Math.min(
                player.currentStats.maxMana,
                player.currentStats.mana + item.effect.value
              );
              logs.push(`${item.icon} ${item.name}: +${item.effect.value} mana!`);
            } else if (item.effect.type === EFFECT_TYPE.BUFF) {
              // Add temporary armor buff
              player.activeBuffs.push({
                id: `combat-start-${Date.now()}`,
                name: 'Combat Ready',
                stat: BUFF_STAT.ARMOR,
                multiplier: 1 + (item.effect.value / player.baseStats.armor),
                remainingTurns: COMBAT_BALANCE.DEFAULT_BUFF_DURATION,
                icon: '🛡️',
              });
              logs.push(`${item.icon} ${item.name}: Defense boosted!`);
            }
          }
        }
      });

      // Recalculate stats with buffs
      player.currentStats = calculateStats(player);

      // Show enemy abilities if any
      if (enemy.abilities.length > 0) {
        const abilityNames = enemy.abilities.map((a: EnemyAbility) => a.name).join(', ');
        logs.push(`⚠️ ${enemy.name} knows: ${abilityNames}`);
      }

      prev.combatLog.add(logs);
      return {
        ...prev,
        player,
        currentRoom: newRoom,
        currentEnemy: enemy,
      };
    });
  }, [setState]);

  // Keep nextRoomRef updated for useEffect without dependency issues (Issue 14 fix)
  useEffect(() => {
    nextRoomRef.current = nextRoom;
  }, [nextRoom]);

  // Called when death animation completes (before hero walks)
  // This clears the dying enemy and marks transition as starting
  const handleEnemyDeathAnimationComplete = useCallback(() => {
    setState((prev: GameState) => {
      // Only clear if enemy is dying
      if (!prev.currentEnemy?.isDying) return prev;

      logDeathEvent('enemy', {
        enemyName: prev.currentEnemy.name,
        room: prev.currentRoom,
        floor: prev.currentFloor
      });

      return {
        ...prev,
        currentEnemy: null,
        isTransitioning: true, // Hero is now walking to next room
      };
    });
  }, [setState]);

  // Called when player death animation completes
  // This transitions to the defeat screen with restored stats
  const handlePlayerDeathAnimationComplete = useCallback(() => {
    setState((prev: GameState) => {
      if (!prev.player?.isDying) return prev;

      logDeathEvent('player', {
        floor: prev.currentFloor,
        room: prev.currentRoom,
        level: prev.player.level
      });
      logStateTransition(GAME_PHASE.COMBAT, GAME_PHASE.DEFEAT, 'player_death');

      const player = { ...prev.player };
      player.isDying = false;
      player.currentStats.health = player.currentStats.maxHealth;
      player.currentStats.mana = player.currentStats.maxMana;
      player.powers = player.powers.map((p: Power) => ({ ...p, currentCooldown: 0 }));

      prev.combatLog.clear();
      return {
        ...prev,
        player,
        gamePhase: GAME_PHASE.DEFEAT,
      };
    });
  }, [setState]);

  return {
    nextRoom,
    nextRoomRef,
    handleEnemyDeathAnimationComplete,
    handlePlayerDeathAnimationComplete,
  };
}
