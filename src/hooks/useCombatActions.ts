import { useCallback, useRef } from 'react';
import {
  GameState, Item, StatusEffect, ActiveBuff, EnemyAbility,
} from '@/types/game';
import { calculateStats } from '@/hooks/useCharacterSetup';
import { calculateEnemyIntent } from '@/data/enemies';
import { calculateRewards, processLevelUp, calculateItemDrop } from '@/hooks/useRewardCalculation';
import {
  processTurnStartEffects,
  calculateAttackDamage,
  processHitEffects,
  processEnemyDeath,
} from '@/hooks/combatActionHelpers';
import {
  COMBAT_MECHANICS,
} from '@/constants/game';
import {
  COMBAT_EVENT_DELAYS,
  COMBAT_BALANCE,
} from '@/constants/balance';
import {
  STATUS_EFFECT_TYPE,
  ITEM_EFFECT_TRIGGER,
  EFFECT_TYPE,
  BUFF_STAT,
  COMBAT_EVENT_TYPE,
  PAUSE_REASON,
} from '@/constants/enums';
import { logPauseChange } from '@/utils/gameLogger';
import { generateEventId } from '@/utils/eventId';
import { deepClonePlayer, deepCloneEnemy } from '@/utils/stateUtils';
import { getDodgeChance } from '@/utils/fortuneUtils';
import type { PauseReasonType } from '@/constants/enums';
import type { CombatEvent } from '@/hooks/useBattleAnimation';

/**
 * Parameters for the combat actions hook
 */
export interface UseCombatActionsParams {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setLastCombatEvent: (event: CombatEvent | null) => void;
  setDroppedItem: (item: Item | null) => void;
  scheduleCombatEvent: (event: CombatEvent, delay: number) => void;
  combatSpeed: number;
  enemyDeathProcessedRef: React.MutableRefObject<string | null>;
  playerDeathProcessedRef: React.MutableRefObject<boolean>;
}

/**
 * Hook for combat action functions (hero attack, enemy attack, block)
 * Extracted from useGameState.ts to improve maintainability
 */
export function useCombatActions({
  setState,
  setLastCombatEvent,
  setDroppedItem,
  scheduleCombatEvent,
  combatSpeed,
  enemyDeathProcessedRef,
  playerDeathProcessedRef,
}: UseCombatActionsParams) {

  /**
   * Hero attack callback - called when hero's attack timer fills
   *
   * Handles:
   * - Status effects (poison, stun, etc.)
   * - Buff management
   * - Turn-start item effects
   * - Attack damage calculation
   * - On-hit and on-crit item effects
   * - Enemy death processing
   * - Reward calculation (XP, gold, items)
   * - Level-up handling
   */
  const performHeroAttack = useCallback(() => {
    setState((prev: GameState) => {
      if (!prev.player || !prev.currentEnemy || prev.isPaused) return prev;
      // Skip if enemy is dying or player is dying
      if (prev.currentEnemy.isDying || prev.player.isDying) return prev;

      const player = deepClonePlayer(prev.player);
      const enemy = deepCloneEnemy(prev.currentEnemy);
      let logs: string[] = [];

      // Process turn-start effects (status effects, buffs, turn-start items)
      const turnStartResult = processTurnStartEffects(player, logs);
      const updatedPlayer = turnStartResult.player;
      logs = turnStartResult.logs;

      // NOTE: Power cooldowns are now time-based, not turn-based
      // They are ticked separately in a dedicated interval

      // If stunned, skip attack and return
      if (turnStartResult.isStunned) {
        logs.push(`💫 You are stunned and cannot act!`);
        prev.combatLog.add(logs);
        return {
          ...prev,
          player: updatedPlayer,
          currentEnemy: enemy,
        };
      }

      // === PLAYER ATTACK ===
      // Calculate attack damage with variance and crit
      const damageResult = calculateAttackDamage(
        updatedPlayer.currentStats,
        enemy.armor,
        enemy.isShielded || false
      );
      logs = [...logs, ...damageResult.logs];

      // Process hit effects (on-hit and on-crit item effects)
      const hitEffectsResult = processHitEffects(
        updatedPlayer,
        damageResult.damage,
        damageResult.isCrit,
        logs
      );
      const playerAfterEffects = hitEffectsResult.player;
      const finalDamage = hitEffectsResult.damage;
      logs = hitEffectsResult.logs;

      // Apply damage to enemy
      enemy.health -= finalDamage;
      logs.push(`You deal ${finalDamage} damage to ${enemy.name}`);

      // Thorned modifier: Reflect damage back to player
      if (enemy.modifiers?.some(m => m.id === 'thorned')) {
        const reflectDamage = Math.floor(finalDamage * 0.1);
        playerAfterEffects.currentStats.health -= reflectDamage;
        logs.push(`🌵 Thorns reflect ${reflectDamage} damage back to you!`);
      }

      // Emit player attack event immediately
      const playerAttackEvent: import('@/hooks/useBattleAnimation').PlayerAttackEvent = {
        type: COMBAT_EVENT_TYPE.PLAYER_ATTACK,
        damage: finalDamage,
        isCrit: damageResult.isCrit,
        timestamp: Date.now(),
        id: generateEventId(),
      };
      setLastCombatEvent(playerAttackEvent);

      // Check if enemy will die from this hit
      const enemyWillDie = enemy.health <= 0;

      // Schedule enemy hit event after player attack starts (scaled by speed)
      const scaledHitDelay = Math.floor(COMBAT_EVENT_DELAYS.PLAYER_HIT_DELAY / combatSpeed);
      const enemyHitEvent: import('@/hooks/useBattleAnimation').EnemyHitEvent = {
        type: COMBAT_EVENT_TYPE.ENEMY_HIT,
        damage: finalDamage,
        isCrit: damageResult.isCrit,
        timestamp: Date.now(),
        id: generateEventId(),
        targetDied: enemyWillDie,
      };
      scheduleCombatEvent(enemyHitEvent, scaledHitDelay);

      // === CHECK ENEMY DEATH ===
      // Use ref for atomic check to prevent race conditions from async setState
      if (enemy.health <= 0 && enemyDeathProcessedRef.current !== enemy.id) {
        enemyDeathProcessedRef.current = enemy.id;

        // Process enemy death (rewards, level-up, items, on-kill effects)
        const deathResult = processEnemyDeath(
          playerAfterEffects,
          enemy,
          prev.currentFloor,
          prev.itemPityCounter,
          logs
        );

        if (deathResult.droppedItem) {
          setDroppedItem(deathResult.droppedItem);
        }

        if (prev.currentRoom >= prev.roomsPerFloor && deathResult.enemy.isBoss) {
          deathResult.logs.push(`🏆 Floor ${prev.currentFloor} complete!`);
        }

        // Determine pause reason based on what happened
        // Priority: level_up > item_drop (level up is more important to see first)
        // Always derive isPaused from pauseReason to keep them in sync
        let newPauseReason: typeof prev.pauseReason = null;
        if (deathResult.leveledUp) {
          newPauseReason = PAUSE_REASON.LEVEL_UP;
          logPauseChange(true, PAUSE_REASON.LEVEL_UP, 'enemy_defeated_level_up');
        } else if (deathResult.itemDropped) {
          newPauseReason = PAUSE_REASON.ITEM_DROP;
          logPauseChange(true, PAUSE_REASON.ITEM_DROP, 'enemy_defeated_item_drop');
        }

        prev.combatLog.add(deathResult.logs);
        return {
          ...prev,
          player: deathResult.player,
          currentEnemy: deathResult.enemy,
          // If leveled up, set pending level up and pause
          pendingLevelUp: deathResult.leveledUp ? deathResult.player.level : prev.pendingLevelUp,
          // Always derive isPaused from pauseReason
          isPaused: newPauseReason !== null,
          pauseReason: newPauseReason,
          itemPityCounter: deathResult.newPityCounter,
        };
      }

      prev.combatLog.add(logs);
      return {
        ...prev,
        player: playerAfterEffects,
        currentEnemy: enemy,
      };
    });
  }, [setState, setLastCombatEvent, setDroppedItem, scheduleCombatEvent, combatSpeed, enemyDeathProcessedRef]);

  /**
   * Enemy attack callback - called when enemy's attack timer fills
   *
   * Handles:
   * - Enemy ability cooldowns
   * - Shield and enrage duration tracking
   * - Ability execution (multi-hit, poison, stun, heal, enrage, shield)
   * - Regular attacks with dodge and crit mechanics
   * - Block damage reduction
   * - On-damaged item effects
   * - Player death processing
   * - Enemy intent calculation for next turn
   */
  const performEnemyAttack = useCallback(() => {
    setState((prev: GameState) => {
      if (!prev.player || !prev.currentEnemy || prev.isPaused) return prev;
      // Skip if enemy is dying or player is dying
      if (prev.currentEnemy.isDying || prev.player.isDying) return prev;

      const player = deepClonePlayer(prev.player);
      const enemy = deepCloneEnemy(prev.currentEnemy);
      const logs: string[] = [];

      // Tick down enemy ability cooldowns
      enemy.abilities = enemy.abilities.map((a: EnemyAbility) => ({
        ...a,
        currentCooldown: Math.max(0, a.currentCooldown - 1),
      }));

      // Tick down enemy shield duration
      if (enemy.isShielded && enemy.shieldTurnsRemaining !== undefined) {
        enemy.shieldTurnsRemaining -= 1;
        if (enemy.shieldTurnsRemaining <= 0) {
          enemy.isShielded = false;
          enemy.shieldTurnsRemaining = undefined;
          logs.push(`🛡️ ${enemy.name}'s shield fades!`);
        }
      }

      // Tick down enemy enrage duration
      if (enemy.isEnraged && enemy.enrageTurnsRemaining !== undefined) {
        enemy.enrageTurnsRemaining -= 1;
        if (enemy.enrageTurnsRemaining <= 0) {
          enemy.isEnraged = false;
          enemy.enrageTurnsRemaining = undefined;
          if (enemy.basePower !== undefined) {
            enemy.power = enemy.basePower;
            enemy.basePower = undefined;
          }
          logs.push(`😤 ${enemy.name}'s rage subsides!`);
        }
      }

      // === ENEMY ATTACK ===
      const enemyIntent = enemy.intent;
      let enemyDamage = 0;
      const enemyCrit = Math.random() * 100 < COMBAT_MECHANICS.ENEMY_BASE_CRIT_CHANCE;

      if (enemyIntent?.type === 'ability' && enemyIntent.ability) {
        const ability = enemyIntent.ability;
        logs.push(`${ability.icon} ${enemy.name} uses ${ability.name}!`);

        enemy.abilities = enemy.abilities.map((a: EnemyAbility) =>
          a.id === ability.id ? { ...a, currentCooldown: a.cooldown } : a
        );

        switch (ability.type) {
          case 'multi_hit': {
            const hits = ability.value;
            const damagePerHit = Math.max(1, Math.floor((enemy.power * COMBAT_BALANCE.MULTI_HIT_DAMAGE_MODIFIER - player.currentStats.armor / 2)));
            let totalDamage = 0;
            const playerDodgeChance = getDodgeChance(player.currentStats.fortune);
            for (let i = 0; i < hits; i++) {
              const dodged = Math.random() < playerDodgeChance;
              if (!dodged) {
                let hitDamage = Math.floor(damagePerHit * (COMBAT_MECHANICS.DAMAGE_VARIANCE_MIN + Math.random() * COMBAT_MECHANICS.DAMAGE_VARIANCE_RANGE));
                if (player.isBlocking) {
                  hitDamage = Math.floor(hitDamage * COMBAT_BALANCE.BLOCK_DAMAGE_REDUCTION);
                }
                totalDamage += hitDamage;
              } else {
                logs.push(`💨 Dodged hit ${i + 1}!`);
              }
            }
            if (totalDamage > 0) {
              if (player.isBlocking) {
                logs.push(`🛡️ Block reduced multi-hit damage!`);
              }
              player.currentStats.health -= totalDamage;
              logs.push(`${ability.icon} ${hits} hits deal ${totalDamage} total damage!`);
              enemyDamage = totalDamage;
            }
            break;
          }
          case 'poison': {
            const poisonDamage = Math.floor(ability.value * (1 + (prev.currentFloor - 1) * COMBAT_BALANCE.POISON_SCALING_PER_FLOOR));
            player.statusEffects.push({
              id: `poison-${Date.now()}`,
              type: STATUS_EFFECT_TYPE.POISON,
              damage: poisonDamage,
              remainingTurns: COMBAT_BALANCE.DEFAULT_POISON_DURATION,
              icon: '🐍',
            });
            logs.push(`☠️ You are poisoned! (${poisonDamage} damage/turn for ${COMBAT_BALANCE.DEFAULT_POISON_DURATION} turns)`);
            break;
          }
          case 'stun': {
            player.statusEffects.push({
              id: `stun-${Date.now()}`,
              type: STATUS_EFFECT_TYPE.STUN,
              remainingTurns: ability.value,
              icon: '💫',
            });
            logs.push(`💫 You are stunned for ${ability.value} turn(s)!`);
            break;
          }
          case 'heal': {
            const healAmount = Math.floor(enemy.maxHealth * ability.value);
            enemy.health = Math.min(enemy.maxHealth, enemy.health + healAmount);
            logs.push(`💚 ${enemy.name} heals for ${healAmount} HP!`);
            break;
          }
          case 'enrage': {
            if (!enemy.isEnraged) {
              enemy.basePower = enemy.power;
              enemy.power = Math.floor(enemy.power * (1 + ability.value));
              enemy.isEnraged = true;
              enemy.enrageTurnsRemaining = 3;
              logs.push(`😤 ${enemy.name} becomes enraged! Attack increased for 3 turns!`);
            } else {
              enemy.enrageTurnsRemaining = 3;
              logs.push(`😤 ${enemy.name}'s rage intensifies!`);
            }
            break;
          }
          case 'shield': {
            enemy.isShielded = true;
            enemy.shieldTurnsRemaining = Math.ceil(ability.value) || 2;
            logs.push(`🛡️ ${enemy.name} raises a shield for ${enemy.shieldTurnsRemaining} turn(s)!`);
            break;
          }
        }
      } else {
        // Regular attack
        const playerDodgeChance = getDodgeChance(player.currentStats.fortune);
        const playerDodged = !enemyCrit && Math.random() < playerDodgeChance;

        if (playerDodged) {
          logs.push(`💨 You dodged ${enemy.name}'s attack!`);
        } else {
          const enemyBaseDamage = Math.max(1, enemy.power - player.currentStats.armor / 2);
          const enemyDamageVariance = COMBAT_MECHANICS.DAMAGE_VARIANCE_MIN + Math.random() * COMBAT_MECHANICS.DAMAGE_VARIANCE_RANGE;
          enemyDamage = Math.floor(enemyBaseDamage * enemyDamageVariance);

          if (enemyCrit) {
            enemyDamage *= 2;
            logs.push(`💥 ${enemy.name} lands a critical hit!`);
          }

          if (player.isBlocking) {
            enemyDamage = Math.floor(enemyDamage * COMBAT_BALANCE.BLOCK_DAMAGE_REDUCTION);
            logs.push(`🛡️ Block! Damage reduced to ${enemyDamage}!`);
          }

          player.currentStats.health -= enemyDamage;
          logs.push(`${enemy.name} deals ${enemyDamage} damage to you`);

          // Vampiric modifier: Heal enemy based on damage dealt
          if (enemy.modifiers?.some(m => m.id === 'vampiric')) {
            const vampHeal = Math.floor(enemyDamage * 0.2);
            enemy.health = Math.min(enemy.maxHealth, enemy.health + vampHeal);
            logs.push(`🩸 ${enemy.name} drains ${vampHeal} life!`);
          }

          // Trigger on_damaged item effects
          player.equippedItems.forEach((item: Item) => {
            if (item.effect?.trigger === ITEM_EFFECT_TRIGGER.ON_DAMAGED) {
              const chance = item.effect.chance ?? 1;
              if (Math.random() < chance) {
                if (item.effect.type === EFFECT_TYPE.HEAL) {
                  player.currentStats.health = Math.min(
                    player.currentStats.maxHealth,
                    player.currentStats.health + item.effect.value
                  );
                  logs.push(`${item.icon} Damage absorbed: +${item.effect.value} HP`);
                } else if (item.effect.type === EFFECT_TYPE.MANA) {
                  player.currentStats.mana = Math.min(
                    player.currentStats.maxMana,
                    player.currentStats.mana + item.effect.value
                  );
                }
              }
            }
          });
        }
      }

      // Schedule enemy attack animation
      const scaledEnemyAttackDelay = Math.floor(COMBAT_EVENT_DELAYS.ENEMY_ATTACK_DELAY / combatSpeed);
      const scaledPlayerHitDelay = Math.floor(COMBAT_EVENT_DELAYS.PLAYER_HIT_OFFSET / combatSpeed);

      const playerWillDie = player.currentStats.health <= 0;

      const enemyAttackEvent: import('@/hooks/useBattleAnimation').EnemyAttackEvent = {
        type: COMBAT_EVENT_TYPE.ENEMY_ATTACK,
        damage: enemyDamage,
        isCrit: enemyCrit,
        timestamp: Date.now(),
        id: generateEventId(),
      };
      scheduleCombatEvent(enemyAttackEvent, scaledEnemyAttackDelay);

      if (enemyDamage > 0) {
        const playerHitEvent: import('@/hooks/useBattleAnimation').PlayerHitEvent = {
          type: COMBAT_EVENT_TYPE.PLAYER_HIT,
          damage: enemyDamage,
          isCrit: enemyCrit,
          timestamp: Date.now(),
          id: generateEventId(),
          targetDied: playerWillDie,
        };
        scheduleCombatEvent(playerHitEvent, scaledPlayerHitDelay);
      } else if (enemyIntent?.type !== 'ability') {
        const playerDodgeEvent: import('@/hooks/useBattleAnimation').PlayerDodgeEvent = {
          type: COMBAT_EVENT_TYPE.PLAYER_DODGE,
          isMiss: true,
          timestamp: Date.now(),
          id: generateEventId(),
        };
        scheduleCombatEvent(playerDodgeEvent, scaledPlayerHitDelay);
      }

      // Reset blocking after enemy has attacked
      player.isBlocking = false;

      // Berserking modifier: Auto-enrage at 50% HP (instead of default 30%)
      if (enemy.modifiers?.some(m => m.id === 'berserking') && !enemy.isEnraged) {
        const hpPercent = enemy.health / enemy.maxHealth;
        if (hpPercent <= 0.5 && hpPercent > 0) {
          enemy.basePower = enemy.power;
          enemy.power = Math.floor(enemy.power * 1.5); // 50% damage boost
          enemy.isEnraged = true;
          enemy.enrageTurnsRemaining = 999; // Permanent enrage for berserking modifier
          logs.push(`😡 ${enemy.name} enters a berserking rage!`);
        }
      }

      // Calculate enemy's next intent for display
      enemy.intent = calculateEnemyIntent(enemy);

      // Check player death - set isDying flag and let animation complete before transition
      // Use ref for atomic check to prevent race conditions from async setState
      if (playerWillDie && !playerDeathProcessedRef.current) {
        playerDeathProcessedRef.current = true;
        player.isDying = true;
        logs.push(`💀 You have been defeated...`);

        prev.combatLog.add(logs);
        return {
          ...prev,
          player,
          currentEnemy: enemy,
        };
      }

      prev.combatLog.add(logs);
      return {
        ...prev,
        player,
        currentEnemy: enemy,
      };
    });
  }, [setState, scheduleCombatEvent, combatSpeed, playerDeathProcessedRef]);

  /**
   * Active block - reduces incoming damage but costs mana
   *
   * Handles:
   * - Mana cost validation
   * - Setting isBlocking flag on player
   * - Combat log entry
   */
  const activateBlock = useCallback(() => {
    setState((prev: GameState) => {
      if (!prev.player || prev.player.isBlocking) return prev;

      if (prev.player.currentStats.mana < COMBAT_BALANCE.BLOCK_MANA_COST) return prev;

      const player = {
        ...prev.player,
        isBlocking: true,
        currentStats: {
          ...prev.player.currentStats,
          mana: prev.player.currentStats.mana - COMBAT_BALANCE.BLOCK_MANA_COST,
        },
      };

      prev.combatLog.add('🛡️ Bracing for impact!');
      return {
        ...prev,
        player,
      };
    });
  }, [setState]);

  return {
    performHeroAttack,
    performEnemyAttack,
    activateBlock,
  };
}
