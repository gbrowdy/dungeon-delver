import { useCallback, useEffect, useRef } from 'react';
import { GameState, Player, Item, EnemyAbility, Power } from '@/types/game';
import { generateEnemy } from '@/data/enemies';
import { calculateStats } from '@/hooks/useCharacterSetup';
import { COMBAT_BALANCE } from '@/constants/balance';
import { GAME_PHASE, ITEM_EFFECT_TRIGGER, EFFECT_TYPE, BUFF_STAT } from '@/constants/enums';
import { logStateTransition, logCombatEvent, logDeathEvent } from '@/utils/gameLogger';
import { processItemEffects } from '@/hooks/useItemEffects';
import { usePathAbilities } from '@/hooks/usePathAbilities';
import { applyTriggerResultToEnemy } from '@/hooks/combatActionHelpers';
import { applyDamageToEnemy } from '@/utils/damageUtils';
import { restorePlayerMana } from '@/utils/statsUtils';

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

  // Initialize path abilities hook
  const { processTrigger, getPassiveEnemyDebuffs, hasAbility, addAttackModifier } = usePathAbilities();

  const nextRoom = useCallback(() => {
    setState((prev: GameState) => {
      if (!prev.player) return prev;

      const newRoom = prev.currentRoom + 1;
      // Use spread to conditionally pass floorTheme - if undefined, use default parameter
      let enemy = prev.currentFloorTheme
        ? generateEnemy(prev.currentFloor, newRoom, prev.roomsPerFloor, prev.currentFloorTheme)
        : generateEnemy(prev.currentFloor, newRoom, prev.roomsPerFloor);
      const logs: string[] = [`Room ${newRoom}: A ${enemy.name} appears!`];

      // Apply passive enemy debuffs from path abilities
      if (prev.player.path) {
        const passiveDebuffs = getPassiveEnemyDebuffs(prev.player);
        if (passiveDebuffs.length > 0) {
          enemy.statDebuffs = enemy.statDebuffs || [];
          passiveDebuffs.forEach(debuff => {
            enemy.statDebuffs!.push({
              id: `passive_${debuff.stat}_${Date.now()}`,
              stat: debuff.stat,
              percentReduction: debuff.percentReduction,
              remainingDuration: COMBAT_BALANCE.PERMANENT_DURATION,
              sourceName: debuff.sourceName,
            });
            const percentDisplay = Math.round(debuff.percentReduction * 100);
            logs.push(`${debuff.sourceName}: Enemy ${debuff.stat} reduced by ${percentDisplay}%`);
          });
        }
      }

      logCombatEvent('enemy_spawn', {
        room: newRoom,
        floor: prev.currentFloor,
        enemyName: enemy.name,
        isBoss: enemy.isBoss
      });

      // Trigger out_of_combat item effects (between rooms, before combat_start)
      const outOfCombatResult = processItemEffects({
        trigger: ITEM_EFFECT_TRIGGER.OUT_OF_COMBAT,
        player: prev.player,
      });

      // Reset player state for new combat
      let player: Player = {
        ...outOfCombatResult.player,
        statusEffects: [], // Clear status effects between rooms
        isBlocking: false,
        comboCount: 0,
        lastPowerUsed: null,
        usedCombatAbilities: [], // Reset once-per-combat abilities
        enemyAttackCounter: 0, // Reset Uncanny Dodge counter
        abilityCounters: undefined, // Reset all ability counters
      };

      // Add out_of_combat logs
      logs.push(...outOfCombatResult.logs);

      // Trigger combat_start item effects
      player.equippedItems.forEach((item: Item) => {
        if (item.effect?.trigger === ITEM_EFFECT_TRIGGER.COMBAT_START) {
          const chance = item.effect.chance ?? 1;
          if (Math.random() < chance) {
            if (item.effect.type === EFFECT_TYPE.MANA) {
              const manaResult = restorePlayerMana(player, item.effect.value);
              player = manaResult.player;
              logs.push(`${item.icon} ${item.name}: +${manaResult.actualAmount} mana!`);
            } else if (item.effect.type === EFFECT_TYPE.BUFF) {
              // Add temporary armor buff
              player.activeBuffs.push({
                id: `combat-start-${Date.now()}`,
                name: 'Combat Ready',
                stat: BUFF_STAT.ARMOR,
                multiplier: 1 + (item.effect.value / player.baseStats.armor),
                remainingTurns: COMBAT_BALANCE.DEFAULT_BUFF_DURATION,
                icon: 'stat-armor',
              });
              logs.push(`${item.icon} ${item.name}: Defense boosted!`);
            }
          }
        }
      });

      // Process path ability combat_start triggers
      const pathCombatStartResult = processTrigger('combat_start', {
        player,
        enemy,
      });
      Object.assign(player, { currentStats: pathCombatStartResult.player.currentStats });
      logs.push(...pathCombatStartResult.logs);

      // Apply trigger damage to enemy (combat_start abilities, etc.)
      if (pathCombatStartResult.damageAmount) {
        const triggerDmgResult = applyDamageToEnemy(enemy, pathCombatStartResult.damageAmount, 'path_ability');
        enemy = triggerDmgResult.enemy;
      }
      if (pathCombatStartResult.reflectedDamage) {
        const reflectDmgResult = applyDamageToEnemy(enemy, pathCombatStartResult.reflectedDamage, 'reflect');
        enemy = reflectDmgResult.enemy;
        logs.push(...reflectDmgResult.logs);
      }
      applyTriggerResultToEnemy(enemy, pathCombatStartResult);

      // Ambush: First attack against each enemy is a guaranteed critical hit
      if (hasAbility(player, 'rogue_assassin_ambush')) {
        const updatedPlayer = addAttackModifier(player, {
          effect: 'guaranteed_crit',
          remainingAttacks: 1,
          sourceName: 'Ambush',
        });
        Object.assign(player, updatedPlayer);
        logs.push(`Ambush: First attack will be a guaranteed critical hit!`);
      }

      // Recalculate stats with buffs
      player.currentStats = calculateStats(player);

      // Show enemy abilities if any
      if (enemy.abilities.length > 0) {
        const abilityNames = enemy.abilities.map((a: EnemyAbility) => a.name).join(', ');
        logs.push(`${enemy.name} knows: ${abilityNames}`);
      }

      prev.combatLog?.add(logs);
      return {
        ...prev,
        player,
        currentRoom: newRoom,
        currentEnemy: enemy,
      };
    });
  }, [setState, processTrigger, getPassiveEnemyDebuffs, hasAbility, addAttackModifier]);

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
  // Preserves: gold, equipment, level, path (for retry system)
  const handlePlayerDeathAnimationComplete = useCallback(() => {
    setState((prev: GameState) => {
      if (!prev.player?.isDying) return prev;

      logDeathEvent('player', {
        floor: prev.currentFloor,
        room: prev.currentRoom,
        level: prev.player.level
      });
      logStateTransition(GAME_PHASE.COMBAT, GAME_PHASE.DEFEAT, 'player_death');

      // Preserve all player state - only restore HP/MP for UI display
      // Equipment, gold, level, and path all persist through death
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
        deathFloor: prev.currentFloor, // Track floor for retry
        // Clear level-up state since level is already applied to player
        // (popup is informational only, player.level is correct)
        pendingLevelUp: null,
        isPaused: false,
        pauseReason: null,
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
