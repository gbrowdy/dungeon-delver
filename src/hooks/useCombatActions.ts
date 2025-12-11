import { useCallback, useRef } from 'react';
import {
  GameState, Item, StatusEffect, ActiveBuff, EnemyAbility,
} from '@/types/game';
import { calculateStats } from '@/hooks/useCharacterSetup';
import { calculateEnemyIntent } from '@/data/enemies';
import { calculateRewards, processLevelUp, calculateItemDrop } from '@/hooks/useRewardCalculation';
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

/**
 * Parameters for the combat actions hook
 */
export interface UseCombatActionsParams {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setLastCombatEvent: (event: any) => void;
  setDroppedItem: (item: Item | null) => void;
  scheduleCombatEvent: (event: any, delay: number) => void;
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

      const player = {
        ...prev.player,
        baseStats: { ...prev.player.baseStats },  // Deep copy to avoid mutation issues
        currentStats: { ...prev.player.currentStats },  // Deep copy currentStats too
      };
      const enemy = { ...prev.currentEnemy };
      const logs: string[] = [];

      // Check if player is stunned
      const isStunned = player.statusEffects.some((e: StatusEffect) => e.type === STATUS_EFFECT_TYPE.STUN);

      // Process status effects on player (poison, etc.) and tick down durations
      player.statusEffects = player.statusEffects.map((effect: StatusEffect) => {
        if (effect.type === STATUS_EFFECT_TYPE.POISON && effect.damage) {
          player.currentStats.health -= effect.damage;
          logs.push(`☠️ Poison deals ${effect.damage} damage!`);
        }
        return { ...effect, remainingTurns: effect.remainingTurns - 1 };
      }).filter((effect: StatusEffect) => effect.remainingTurns > 0);

      // Tick down buff durations
      player.activeBuffs = player.activeBuffs.map((buff: ActiveBuff) => ({
        ...buff,
        remainingTurns: buff.remainingTurns - 1,
      })).filter((buff: ActiveBuff) => buff.remainingTurns > 0);

      // Trigger turn_start item effects
      player.equippedItems.forEach((item: Item) => {
        if (item.effect?.trigger === ITEM_EFFECT_TRIGGER.TURN_START) {
          const chance = item.effect.chance ?? 1;
          if (Math.random() < chance) {
            if (item.effect.type === EFFECT_TYPE.HEAL) {
              const healAmount = item.effect.value;
              player.currentStats.health = Math.min(
                player.currentStats.maxHealth,
                player.currentStats.health + healAmount
              );
              logs.push(`${item.icon} Regenerated ${healAmount} HP`);
            } else if (item.effect.type === EFFECT_TYPE.MANA) {
              player.currentStats.mana = Math.min(
                player.currentStats.maxMana,
                player.currentStats.mana + item.effect.value
              );
            }
          }
        }
      });

      // NOTE: Power cooldowns are now time-based, not turn-based
      // They are ticked separately in a dedicated interval

      // Recalculate stats with updated buffs
      player.currentStats = calculateStats(player);

      if (isStunned) {
        logs.push(`💫 You are stunned and cannot act!`);
        return {
          ...prev,
          player,
          currentEnemy: enemy,
          combatLog: [...prev.combatLog, ...logs],
        };
      }

      // === PLAYER ATTACK ===
      let playerDamage = 0;
      let playerCrit = false;

      playerCrit = Math.random() * 100 < player.currentStats.critChance;
      const playerBaseDamage = Math.max(1, player.currentStats.attack - (enemy.isShielded ? enemy.defense * 1.5 : enemy.defense) / 2);
      const playerDamageVariance = COMBAT_MECHANICS.DAMAGE_VARIANCE_MIN + Math.random() * COMBAT_MECHANICS.DAMAGE_VARIANCE_RANGE;
      playerDamage = playerBaseDamage * playerDamageVariance;

      if (playerCrit) {
        // Use player's critDamage stat (default 2.0 = 200%)
        const critMultiplier = player.currentStats.critDamage || 2.0;
        playerDamage *= critMultiplier;
        logs.push(`💥 Critical hit! (${Math.floor(critMultiplier * 100)}%)`);

        // Trigger on_crit item effects
        player.equippedItems.forEach((item: Item) => {
          if (item.effect?.trigger === ITEM_EFFECT_TRIGGER.ON_CRIT) {
            const chance = item.effect.chance ?? 1;
            if (Math.random() < chance) {
              if (item.effect.type === EFFECT_TYPE.HEAL) {
                player.currentStats.health = Math.min(
                  player.currentStats.maxHealth,
                  player.currentStats.health + item.effect.value
                );
                logs.push(`${item.icon} Healed ${item.effect.value} HP on crit!`);
              } else if (item.effect.type === EFFECT_TYPE.DAMAGE) {
                playerDamage += playerDamage * item.effect.value;
              }
            }
          }
        });
      }

      playerDamage = Math.floor(playerDamage);

      // Trigger on_hit item effects
      player.equippedItems.forEach((item: Item) => {
        if (item.effect?.trigger === ITEM_EFFECT_TRIGGER.ON_HIT) {
          const chance = item.effect.chance ?? 1;
          if (Math.random() < chance) {
            if (item.effect.type === EFFECT_TYPE.HEAL) {
              player.currentStats.health = Math.min(
                player.currentStats.maxHealth,
                player.currentStats.health + item.effect.value
              );
              logs.push(`${item.icon} Life steal: +${item.effect.value} HP`);
            } else if (item.effect.type === EFFECT_TYPE.DAMAGE) {
              playerDamage += item.effect.value;
              logs.push(`${item.icon} Bonus damage: +${item.effect.value}`);
            }
          }
        }
      });

      enemy.health -= playerDamage;
      logs.push(`You deal ${playerDamage} damage to ${enemy.name}`);

      // Emit player attack event immediately
      setLastCombatEvent({
        type: COMBAT_EVENT_TYPE.PLAYER_ATTACK,
        damage: playerDamage,
        isCrit: playerCrit,
        timestamp: Date.now(),
        id: generateEventId(),
      });

      // Check if enemy will die from this hit
      const enemyWillDie = enemy.health <= 0;

      // Schedule enemy hit event after player attack starts (scaled by speed)
      const scaledHitDelay = Math.floor(COMBAT_EVENT_DELAYS.PLAYER_HIT_DELAY / combatSpeed);
      scheduleCombatEvent({
        type: COMBAT_EVENT_TYPE.ENEMY_HIT,
        damage: playerDamage,
        isCrit: playerCrit,
        timestamp: Date.now(),
        id: generateEventId(),
        targetDied: enemyWillDie,
      }, scaledHitDelay);

      // === CHECK ENEMY DEATH ===
      // Use ref for atomic check to prevent race conditions from async setState
      if (enemy.health <= 0 && enemyDeathProcessedRef.current !== enemy.id) {
        enemyDeathProcessedRef.current = enemy.id;
        enemy.isDying = true;

        // Calculate rewards with level-based penalty
        const rewardResult = calculateRewards(player, enemy, prev.currentFloor);
        player.experience = rewardResult.updatedPlayer.experience;
        player.gold = rewardResult.updatedPlayer.gold;
        logs.push(rewardResult.rewardText);

        player.comboCount = 0;
        player.lastPowerUsed = null;

        // Trigger on_kill item effects
        player.equippedItems.forEach((item: Item) => {
          if (item.effect?.trigger === ITEM_EFFECT_TRIGGER.ON_KILL) {
            const chance = item.effect.chance ?? 1;
            if (Math.random() < chance) {
              if (item.effect.type === EFFECT_TYPE.HEAL) {
                player.currentStats.health = Math.min(
                  player.currentStats.maxHealth,
                  player.currentStats.health + item.effect.value
                );
                logs.push(`${item.icon} Victory heal: +${item.effect.value} HP`);
              } else if (item.effect.type === EFFECT_TYPE.MANA) {
                player.currentStats.mana = Math.min(
                  player.currentStats.maxMana,
                  player.currentStats.mana + item.effect.value
                );
                logs.push(`${item.icon} Mana restored: +${item.effect.value}`);
              }
            }
          }
        });

        // Process level-ups
        const levelUpResult = processLevelUp(player);
        player.experience = levelUpResult.updatedPlayer.experience;
        player.level = levelUpResult.updatedPlayer.level;
        player.experienceToNext = levelUpResult.updatedPlayer.experienceToNext;
        player.baseStats = levelUpResult.updatedPlayer.baseStats;
        player.currentStats = levelUpResult.updatedPlayer.currentStats;
        logs.push(...levelUpResult.levelUpLogs);
        const leveledUp = levelUpResult.leveledUp;

        player.statusEffects = [];

        // Check for item drop with pity system
        const itemDropResult = calculateItemDrop(
          enemy,
          prev.currentFloor,
          prev.itemPityCounter,
          player.currentStats.goldFind || 0
        );

        if (itemDropResult.droppedItem) {
          setDroppedItem(itemDropResult.droppedItem);
          logs.push(itemDropResult.dropLog);
        }

        const newPityCounter = itemDropResult.newPityCounter;
        const itemDropped = itemDropResult.itemDropped;

        if (prev.currentRoom >= prev.roomsPerFloor && enemy.isBoss) {
          logs.push(`🏆 Floor ${prev.currentFloor} complete!`);
        }

        // Determine pause reason based on what happened
        // Priority: level_up > item_drop (level up is more important to see first)
        // Always derive isPaused from pauseReason to keep them in sync
        let newPauseReason: typeof prev.pauseReason = null;
        if (leveledUp) {
          newPauseReason = PAUSE_REASON.LEVEL_UP;
          logPauseChange(true, PAUSE_REASON.LEVEL_UP, 'enemy_defeated_level_up');
        } else if (itemDropped) {
          newPauseReason = PAUSE_REASON.ITEM_DROP;
          logPauseChange(true, PAUSE_REASON.ITEM_DROP, 'enemy_defeated_item_drop');
        }

        return {
          ...prev,
          player,
          currentEnemy: enemy,
          combatLog: [...prev.combatLog, ...logs],
          // If leveled up, set pending level up and pause
          pendingLevelUp: leveledUp ? player.level : prev.pendingLevelUp,
          // Always derive isPaused from pauseReason
          isPaused: newPauseReason !== null,
          pauseReason: newPauseReason,
          itemPityCounter: newPityCounter,
        };
      }

      return {
        ...prev,
        player,
        currentEnemy: enemy,
        combatLog: [...prev.combatLog, ...logs],
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

      const player = { ...prev.player };
      const enemy = { ...prev.currentEnemy };
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
          if (enemy.baseAttack !== undefined) {
            enemy.attack = enemy.baseAttack;
            enemy.baseAttack = undefined;
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
            const damagePerHit = Math.max(1, Math.floor((enemy.attack * COMBAT_BALANCE.MULTI_HIT_DAMAGE_MODIFIER - player.currentStats.defense / 2)));
            let totalDamage = 0;
            for (let i = 0; i < hits; i++) {
              const dodged = Math.random() * 100 < player.currentStats.dodgeChance;
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
              enemy.baseAttack = enemy.attack;
              enemy.attack = Math.floor(enemy.attack * (1 + ability.value));
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
        const playerDodged = !enemyCrit && Math.random() * 100 < player.currentStats.dodgeChance;

        if (playerDodged) {
          logs.push(`💨 You dodged ${enemy.name}'s attack!`);
        } else {
          const enemyBaseDamage = Math.max(1, enemy.attack - player.currentStats.defense / 2);
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

      scheduleCombatEvent({
        type: COMBAT_EVENT_TYPE.ENEMY_ATTACK,
        damage: enemyDamage,
        isCrit: enemyCrit,
        timestamp: Date.now(),
        id: generateEventId(),
      }, scaledEnemyAttackDelay);

      if (enemyDamage > 0) {
        scheduleCombatEvent({
          type: COMBAT_EVENT_TYPE.PLAYER_HIT,
          damage: enemyDamage,
          isCrit: enemyCrit,
          timestamp: Date.now(),
          id: generateEventId(),
          targetDied: playerWillDie,
        }, scaledPlayerHitDelay);
      } else if (enemyIntent?.type !== 'ability') {
        scheduleCombatEvent({
          type: COMBAT_EVENT_TYPE.PLAYER_DODGE,
          damage: 0,
          isCrit: false,
          isMiss: true,
          timestamp: Date.now(),
          id: generateEventId(),
        }, scaledPlayerHitDelay);
      }

      // Reset blocking after enemy has attacked
      player.isBlocking = false;

      // Calculate enemy's next intent for display
      enemy.intent = calculateEnemyIntent(enemy);

      // Check player death - set isDying flag and let animation complete before transition
      // Use ref for atomic check to prevent race conditions from async setState
      if (playerWillDie && !playerDeathProcessedRef.current) {
        playerDeathProcessedRef.current = true;
        player.isDying = true;
        logs.push(`💀 You have been defeated...`);

        return {
          ...prev,
          player,
          currentEnemy: enemy,
          combatLog: [...prev.combatLog, ...logs],
        };
      }

      return {
        ...prev,
        player,
        currentEnemy: enemy,
        combatLog: [...prev.combatLog, ...logs],
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

      return {
        ...prev,
        player,
        combatLog: [...prev.combatLog, '🛡️ Bracing for impact!'],
      };
    });
  }, [setState]);

  return {
    performHeroAttack,
    performEnemyAttack,
    activateBlock,
  };
}
