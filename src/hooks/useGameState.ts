import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GameState, Power, Item,
  ActiveBuff, StatusEffect, CombatSpeed, EnemyAbility
} from '@/types/game';
import { calculateEnemyIntent } from '@/data/enemies';
import { generateItem, isRareOrBetter } from '@/data/items';
import { getPowerChoices } from '@/data/powers';
import { CombatEvent } from '@/hooks/useBattleAnimation';
import { useEventQueue } from '@/hooks/useEventQueue';
import { useCombatLoop } from '@/hooks/useCombatLoop';
import { calculateStats, useCharacterSetup } from '@/hooks/useCharacterSetup';
import { useCombatTimers } from '@/hooks/useCombatTimers';
import { useRoomTransitions } from '@/hooks/useRoomTransitions';
import { useItemActions } from '@/hooks/useItemActions';
import { useProgressionActions } from '@/hooks/useProgressionActions';
import { useGameFlow } from '@/hooks/useGameFlow';
import {
  COMBAT_MECHANICS,
  LEVEL_UP_BONUSES,
  FLOOR_CONFIG,
} from '@/constants/game';
import {
  COMBAT_BALANCE,
  COMBAT_EVENT_DELAYS,
  POWER_BALANCE,
  REWARD_CONFIG,
} from '@/constants/balance';
import {
  GAME_PHASE,
  STATUS_EFFECT_TYPE,
  ITEM_EFFECT_TRIGGER,
  EFFECT_TYPE,
  BUFF_STAT,
  COMBAT_EVENT_TYPE,
  PAUSE_REASON,
} from '@/constants/enums';
import { logPauseChange, logRecovery } from '@/utils/gameLogger';
import { generateEventId } from '@/utils/eventId';

// Base combat tick interval (ms) - modified by speed multiplier
// At 1x: 2500ms per combat round (gives time to see intent + animations)
// At 2x: 1250ms per round
// At 3x: ~833ms per round (fast but still visible)
const BASE_COMBAT_INTERVAL = 2500;

const INITIAL_STATE: GameState = {
  player: null,
  currentEnemy: null,
  currentFloor: 1,
  currentRoom: 0,
  roomsPerFloor: FLOOR_CONFIG.DEFAULT_ROOMS_PER_FLOOR,
  combatLog: [],
  gamePhase: GAME_PHASE.MENU,
  isPaused: false,
  pauseReason: null,
  combatSpeed: 1,
  pendingLevelUp: null,
  itemPityCounter: 0,
  shopItems: [],
  availablePowers: [],
  isTransitioning: false,
};

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  // shopItems and availablePowers are now part of GameState to prevent race conditions
  const [lastCombatEvent, setLastCombatEvent] = useState<CombatEvent | null>(null);
  const [droppedItem, setDroppedItem] = useState<Item | null>(null);

  // Refs to prevent race conditions in death detection
  // React's setState is async, so multiple rapid attacks could both pass isDying checks
  // These refs provide atomic flags that are checked synchronously
  const playerDeathProcessedRef = useRef<boolean>(false);
  const enemyDeathProcessedRef = useRef<string | null>(null); // tracks enemy ID to handle new enemies

  // Use event queue for combat events instead of setTimeout cascades
  const { scheduleEvent: scheduleCombatEvent, clearAllEvents: clearCombatTimeouts } = useEventQueue<CombatEvent>({
    onEvent: setLastCombatEvent,
    tickInterval: COMBAT_EVENT_DELAYS.EVENT_QUEUE_TICK_INTERVAL,
  });

  // Use the extracted character setup hook
  const { selectClass } = useCharacterSetup(setState);

  // Use the extracted room transitions hook
  const {
    nextRoom,
    nextRoomRef,
    handleEnemyDeathAnimationComplete,
    handlePlayerDeathAnimationComplete,
  } = useRoomTransitions(setState);

  // Create getState callback for game flow (avoids stale closure)
  const getState = useCallback(() => state, [state]);

  // showFloorComplete needs to be defined before useGameFlow, so extract it separately
  const showFloorCompleteInternal = useCallback(() => {
    setState((prev: GameState) => {
      if (!prev.player) return prev;

      const nextFloorNum = prev.currentFloor + 1;

      // Generate shop items - one of each type
      const items = [
        generateItem(nextFloorNum, 'weapon'),
        generateItem(nextFloorNum, 'armor'),
        generateItem(nextFloorNum, 'accessory'),
      ];

      // Offer 2 power choices every 2 floors (floors 2, 4, 6, etc.)
      const shouldOfferPowers = prev.currentFloor % 2 === 0;
      const powerChoices = shouldOfferPowers ? getPowerChoices(prev.player.powers, 2) : [];

      return {
        ...prev,
        gamePhase: GAME_PHASE.FLOOR_COMPLETE,
        combatLog: [],
        shopItems: items,
        availablePowers: powerChoices,
      };
    });
  }, [setState]);

  // Use event-driven game flow system
  const { dispatch: dispatchFlowEvent } = useGameFlow({
    getState,
    nextRoom,
    showFloorComplete: showFloorCompleteInternal,
  });

  // Use the extracted item actions hook (with flow event dispatch)
  const {
    buyItem,
    learnPower,
    claimItem,
    equipDroppedItem,
    dismissDroppedItem,
  } = useItemActions({ setState, droppedItem, setDroppedItem, dispatchFlowEvent });

  // Use the extracted progression actions hook (with flow event dispatch)
  const {
    applyFloorUpgrade,
    continueFromShop,
    showFloorComplete,
    dismissLevelUp,
    continueFromFloorComplete,
    applyUpgrade,
    restartGame,
    retryFloor,
    startGame,
  } = useProgressionActions({ setState, clearCombatTimeouts, setLastCombatEvent, dispatchFlowEvent, droppedItem });

  // Hero attack callback - called when hero's attack timer fills
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
      const scaledHitDelay = Math.floor(COMBAT_EVENT_DELAYS.PLAYER_HIT_DELAY / state.combatSpeed);
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

        // Calculate level-based reward penalty
        // Player level vs floor level (floor ~= expected level)
        const levelDiff = Math.max(0, player.level - prev.currentFloor);
        const levelPenalty = Math.max(
          REWARD_CONFIG.LEVEL_PENALTY_MIN_MULTIPLIER,
          1 - (levelDiff * REWARD_CONFIG.LEVEL_PENALTY_PER_LEVEL)
        );

        // Apply level penalty to base rewards
        const adjustedXP = Math.floor(enemy.experienceReward * levelPenalty);
        const adjustedGold = Math.floor(enemy.goldReward * levelPenalty);

        // Apply gold find bonus on top of adjusted gold
        const goldFindBonus = player.currentStats.goldFind || 0;
        const finalGold = Math.floor(adjustedGold * (1 + goldFindBonus));

        player.experience += adjustedXP;
        player.gold += finalGold;

        // Build reward text with penalties shown
        let rewardText = `${enemy.name} defeated! +${adjustedXP} XP, +${finalGold} gold`;
        if (levelPenalty < 1) {
          rewardText += ` (${Math.floor(levelPenalty * 100)}% - overleveled)`;
        }
        if (goldFindBonus > 0) {
          rewardText += ` (+${Math.floor(goldFindBonus * 100)}% gold find)`;
        }
        logs.push(rewardText);

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

        // Level up check
        let leveledUp = false;
        while (player.experience >= player.experienceToNext) {
          player.experience -= player.experienceToNext;
          player.level += 1;
          player.experienceToNext = Math.floor(player.experienceToNext * LEVEL_UP_BONUSES.EXP_MULTIPLIER);
          player.baseStats.maxHealth += LEVEL_UP_BONUSES.MAX_HEALTH;
          player.baseStats.attack += LEVEL_UP_BONUSES.ATTACK;
          player.baseStats.defense += LEVEL_UP_BONUSES.DEFENSE;
          player.baseStats.maxMana += LEVEL_UP_BONUSES.MAX_MANA;
          player.currentStats = calculateStats(player);
          // Don't restore HP/Mana on level up - only increase the max values
          logs.push(`🎉 Level up! Now level ${player.level}`);
          leveledUp = true;
        }

        player.currentStats = calculateStats(player);
        player.statusEffects = [];

        // Check for item drop
        const goldFindForDrop = player.currentStats.goldFind || 0;
        let dropChance: number;
        let legendaryBoost = 0;

        if (enemy.isBoss) {
          // Bosses have fixed high drop chance and legendary boost
          dropChance = REWARD_CONFIG.BOSS_DROP_CHANCE;
          legendaryBoost = REWARD_CONFIG.BOSS_LEGENDARY_BOOST;
        } else {
          // Regular enemies: base chance + gold find scaling, capped at max
          dropChance = Math.min(
            REWARD_CONFIG.ENEMY_DROP_MAX_CHANCE,
            REWARD_CONFIG.ENEMY_DROP_BASE_CHANCE + (goldFindForDrop * REWARD_CONFIG.ENEMY_DROP_GOLD_FIND_SCALING)
          );
        }

        // Track pity counter changes
        let newPityCounter = prev.itemPityCounter;
        let itemDropped = false;

        if (Math.random() < dropChance) {
          // Generate a random item (any type) at current floor level with pity boost
          const dropped = generateItem(prev.currentFloor, undefined, prev.itemPityCounter);

          // Apply boss legendary boost by potentially upgrading rarity
          if (legendaryBoost > 0 && Math.random() < legendaryBoost) {
            // Boss legendary boost - regenerate item and create a new object with legendary rarity
            const baseDrop = generateItem(prev.currentFloor);
            // Create a new legendary item object instead of mutating
            const legendaryDrop: Item = {
              ...baseDrop,
              rarity: 'legendary',
              name: baseDrop.name.replace(/^(Iron|Wooden|Simple|Basic|Steel|Reinforced|Quality|Fine|Enchanted|Magical|Glowing|Mystic|Ancient|Legendary|Divine|Celestial)/, 'Godforged'),
            };
            setDroppedItem(legendaryDrop);
            logs.push(`✨ ${enemy.name} dropped a LEGENDARY ${legendaryDrop.icon} ${legendaryDrop.name}!`);
            // Legendary always resets pity
            newPityCounter = 0;
            itemDropped = true;
          } else {
            setDroppedItem(dropped);
            logs.push(`💎 ${enemy.name} dropped ${dropped.icon} ${dropped.name}!`);
            // Update pity counter based on rarity
            if (isRareOrBetter(dropped)) {
              newPityCounter = 0; // Reset on rare+ drop
            } else {
              newPityCounter += 1; // Increment on common/uncommon
            }
            itemDropped = true;
          }
        }

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
  }, [scheduleCombatEvent, state.combatSpeed]);

  // Enemy attack callback - called when enemy's attack timer fills
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
      const scaledEnemyAttackDelay = Math.floor(COMBAT_EVENT_DELAYS.ENEMY_ATTACK_DELAY / state.combatSpeed);
      const scaledPlayerHitDelay = Math.floor(COMBAT_EVENT_DELAYS.PLAYER_HIT_OFFSET / state.combatSpeed);

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
  }, [scheduleCombatEvent, state.combatSpeed]);

  const usePower = useCallback((powerId: string) => {
    setState((prev: GameState) => {
      if (!prev.player || !prev.currentEnemy) return prev;
      // Skip if player or enemy is dying
      if (prev.player.isDying || prev.currentEnemy.isDying) return prev;

      const powerIndex = prev.player.powers.findIndex((p: Power) => p.id === powerId);
      if (powerIndex === -1) return prev;

      const power = prev.player.powers[powerIndex];
      if (!power) return prev;

      if (power.currentCooldown > 0 || prev.player.currentStats.mana < power.manaCost) {
        return prev;
      }

      const player = { ...prev.player };
      const enemy = { ...prev.currentEnemy };
      const logs: string[] = [];

      // Check for combo bonus
      let comboMultiplier = 1;
      if (player.lastPowerUsed && player.lastPowerUsed !== power.id) {
        // Using a different power than last time = combo!
        player.comboCount = Math.min(COMBAT_BALANCE.MAX_COMBO_COUNT, player.comboCount + 1);
        comboMultiplier = 1 + (player.comboCount * COMBAT_BALANCE.COMBO_DAMAGE_BONUS_PER_LEVEL);
        if (player.comboCount >= 2) {
          logs.push(`🔥 ${player.comboCount}x COMBO! (+${Math.floor((comboMultiplier - 1) * 100)}% damage)`);
        }
      } else {
        // Same power or first power = reset combo
        player.comboCount = 0;
      }
      player.lastPowerUsed = power.id;

      // Use mana
      player.currentStats.mana -= power.manaCost;

      // Set cooldown - subtract one tick worth immediately so the countdown starts right away
      // This prevents the visual "pause" before the cooldown bar starts moving
      const cooldownSpeed = player.currentStats.cooldownSpeed || COMBAT_BALANCE.BASE_COOLDOWN_SPEED;
      const initialTickReduction = (COMBAT_BALANCE.COOLDOWN_TICK_INTERVAL / 1000) * cooldownSpeed * prev.combatSpeed;
      player.powers = player.powers.map((p: Power, i: number) =>
        i === powerIndex ? { ...p, currentCooldown: Math.max(0, p.cooldown - initialTickReduction) } : p
      );

      logs.push(`${power.icon} Used ${power.name}!`);

      switch (power.effect) {
        case 'damage': {
          const damage = Math.floor(player.currentStats.attack * power.value * comboMultiplier);
          enemy.health -= damage;
          logs.push(`Dealt ${damage} magical damage!`);

          // Check if enemy will die from this hit
          const enemyWillDie = enemy.health <= 0;

          // Emit power event for animation (with powerId for special effects)
          const powerHitDelay = Math.floor(COMBAT_EVENT_DELAYS.PLAYER_HIT_DELAY / prev.combatSpeed);
          setLastCombatEvent({
            type: COMBAT_EVENT_TYPE.PLAYER_POWER,
            damage: damage,
            isCrit: comboMultiplier > 1, // Treat combo as crit for visual effect
            timestamp: Date.now(),
            id: generateEventId(),
            powerId: power.id,
          });

          // Schedule enemy hit event with targetDied flag
          scheduleCombatEvent({
            type: COMBAT_EVENT_TYPE.ENEMY_HIT,
            damage: damage,
            isCrit: comboMultiplier > 1,
            timestamp: Date.now(),
            id: generateEventId(),
            targetDied: enemyWillDie,
          }, powerHitDelay);

          // Vampiric touch heals
          if (power.id === 'vampiric-touch') {
            const heal = Math.floor(damage * POWER_BALANCE.VAMPIRIC_HEAL_RATIO);
            player.currentStats.health = Math.min(
              player.currentStats.maxHealth,
              player.currentStats.health + heal
            );
            logs.push(`Healed for ${heal} HP!`);
          }
          break;
        }
        case 'heal': {
          if (power.id === 'mana-surge') {
            const manaRestored = Math.floor(player.currentStats.maxMana * power.value);
            player.currentStats.mana = Math.min(
              player.currentStats.maxMana,
              player.currentStats.mana + manaRestored
            );
            logs.push(`Restored ${manaRestored} mana!`);
          } else {
            const heal = Math.floor(player.currentStats.maxHealth * power.value);
            player.currentStats.health = Math.min(
              player.currentStats.maxHealth,
              player.currentStats.health + heal
            );
            logs.push(`Healed for ${heal} HP!`);
          }
          break;
        }
        case 'buff': {
          // Create temporary buff with duration
          const buffDuration = COMBAT_BALANCE.DEFAULT_BUFF_DURATION;

          if (power.id === 'battle-cry') {
            // Attack buff
            player.activeBuffs.push({
              id: `buff-attack-${Date.now()}`,
              name: power.name,
              stat: BUFF_STAT.ATTACK,
              multiplier: 1 + power.value,
              remainingTurns: buffDuration,
              icon: power.icon,
            });
            logs.push(`Attack increased by ${Math.floor(power.value * 100)}% for ${buffDuration} turns!`);
          } else if (power.id === 'shield-wall') {
            // Defense buff
            player.activeBuffs.push({
              id: `buff-defense-${Date.now()}`,
              name: power.name,
              stat: BUFF_STAT.DEFENSE,
              multiplier: 1 + power.value,
              remainingTurns: buffDuration,
              icon: power.icon,
            });
            logs.push(`Defense doubled for ${buffDuration} turns!`);
          } else {
            // Generic attack buff for unknown buff powers
            player.activeBuffs.push({
              id: `buff-generic-${Date.now()}`,
              name: power.name,
              stat: BUFF_STAT.ATTACK,
              multiplier: 1 + power.value,
              remainingTurns: buffDuration,
              icon: power.icon,
            });
            logs.push(`Stats boosted for ${buffDuration} turns!`);
          }

          // Recalculate stats with new buff
          player.currentStats = calculateStats(player);
          break;
        }
      }
      
      // Check if enemy died from power - mark as dying, don't remove
      // Use ref for atomic check to prevent race conditions from async setState
      if (enemy.health <= 0 && enemyDeathProcessedRef.current !== enemy.id) {
        enemyDeathProcessedRef.current = enemy.id;
        enemy.isDying = true;

        // Apply gold find bonus
        const goldFindBonus = player.currentStats.goldFind || 0;
        const bonusGold = Math.floor(enemy.goldReward * (1 + goldFindBonus));

        player.experience += enemy.experienceReward;
        player.gold += bonusGold;

        const goldFindText = goldFindBonus > 0 ? ` (+${Math.floor(goldFindBonus * 100)}% bonus)` : '';
        logs.push(`${enemy.name} defeated! +${enemy.experienceReward} XP, +${bonusGold} gold${goldFindText}`);

        player.currentStats = calculateStats(player);

        // Keep enemy in state with isDying flag - animation system will remove it
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
  }, [scheduleCombatEvent]);

  const togglePause = useCallback(() => {
    setState((prev: GameState) => {
      const newIsPaused = !prev.isPaused;
      const newPauseReason = newIsPaused ? PAUSE_REASON.USER : null;
      logPauseChange(newIsPaused, newPauseReason, 'user_toggle');
      return {
        ...prev,
        isPaused: newIsPaused,
        pauseReason: newPauseReason,
      };
    });
  }, []);

  // Set combat speed (1x, 2x, 3x)
  const setCombatSpeed = useCallback((speed: CombatSpeed) => {
    setState((prev: GameState) => ({ ...prev, combatSpeed: speed }));
  }, []);

  // Active block/dodge - reduces incoming damage for 0.5s but costs mana
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
  }, []);

  // Use frame-rate independent combat loop with separate hero/enemy timers
  // Also stop combat if player is dying (reached 0 HP)
  const shouldRunCombatLoop = state.gamePhase === GAME_PHASE.COMBAT && !state.isPaused && !!state.currentEnemy && !state.currentEnemy.isDying && !state.player?.isDying;

  // Separate condition for timers (regen/cooldowns) - should run during combat even without enemy
  // This allows cooldowns to continue ticking during room transitions
  const shouldRunCombatTimers = state.gamePhase === GAME_PHASE.COMBAT && !state.isPaused && !state.player?.isDying;

  // Get hero and enemy speed stats for attack timing
  const heroSpeed = state.player?.currentStats.speed ?? 10;
  const enemySpeed = state.currentEnemy?.speed ?? 10;

  // Check if hero is stunned - show purple progress bar
  const isHeroStunned = state.player?.statusEffects.some((e: StatusEffect) => e.type === STATUS_EFFECT_TYPE.STUN) ?? false;

  const { heroProgress, enemyProgress } = useCombatLoop({
    onHeroAttack: performHeroAttack,
    onEnemyAttack: performEnemyAttack,
    heroSpeed,
    enemySpeed,
    baseInterval: BASE_COMBAT_INTERVAL,
    enabled: shouldRunCombatLoop,
    combatSpeedMultiplier: state.combatSpeed,
  });

  // Use extracted combat timers hook for HP/MP regen and power cooldowns
  // Uses separate condition so cooldowns continue during room transitions
  useCombatTimers(setState, shouldRunCombatTimers);

  // Called when walk animation completes (after enemy already cleared)
  // This clears the transitioning flag - the recovery useEffect will handle spawning
  const handleTransitionComplete = useCallback(() => {
    setState((prev: GameState) => {
      if (prev.gamePhase !== GAME_PHASE.COMBAT) return prev;
      if (prev.currentEnemy) return prev; // Enemy shouldn't exist at this point

      // Clear transitioning flag - walk animation is complete
      // The recovery useEffect will detect this and spawn the next enemy
      return { ...prev, isTransitioning: false };
    });
  }, []);

  // Initial room spawn - only when entering combat phase with no enemy at room 0
  // The animation-driven transitions handle subsequent rooms
  // Uses ref to avoid having nextRoom in dependencies (Issue 14 fix)
  useEffect(() => {
    // Only spawn first enemy when:
    // - In combat phase
    // - Not paused
    // - No current enemy (and no dying enemy)
    // - At room 0 (start of floor)
    const hasNoEnemy = !state.currentEnemy;
    if (state.gamePhase === GAME_PHASE.COMBAT && !state.isPaused && hasNoEnemy && state.currentRoom === 0) {
      // First room of a floor - spawn immediately (no animation transition needed)
      nextRoomRef.current?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nextRoomRef is stable (useRef pattern)
  }, [state.gamePhase, state.isPaused, state.currentEnemy, state.currentRoom]);

  // Fallback: Clear stuck dying enemies
  // The animation system normally handles death, but if it gets stuck,
  // this effect clears the enemy after a short delay.
  // Note: Popup dismissals are now handled by the event-driven useGameFlow system
  useEffect(() => {
    // Only act if enemy is stuck in dying state
    if (
      state.gamePhase !== GAME_PHASE.COMBAT ||
      !state.currentEnemy?.isDying
    ) {
      return;
    }

    // Give animation system time to handle it, then force clear
    const timeout = setTimeout(() => {
      logRecovery('fallback_clear_dying_enemy', {
        room: state.currentRoom,
        enemyId: state.currentEnemy?.id
      });
      setState((prev: GameState) => {
        if (prev.currentEnemy?.isDying) {
          return { ...prev, currentEnemy: null };
        }
        return prev;
      });
    }, 2000); // 2 second timeout as fallback

    return () => clearTimeout(timeout);
  }, [state.gamePhase, state.currentEnemy?.isDying, state.currentEnemy?.id, state.currentRoom]);

  // Recovery effect: Spawn next enemy when all conditions are ready
  // This handles the case where handleTransitionComplete ran but pendingLevelUp was still set,
  // and then the level-up popup was dismissed afterward. Without this, the game would be stuck
  // because handleTransitionComplete only fires once (from the animation callback).
  useEffect(() => {
    // Only act in combat phase
    if (state.gamePhase !== GAME_PHASE.COMBAT) return;
    // Only when enemy is cleared (death animation complete)
    if (state.currentEnemy) return;
    // Only when not paused
    if (state.isPaused) return;
    // Only when no pending popups
    if (state.pendingLevelUp) return;
    // Only when no pending item drop popup (droppedItem is separate state)
    if (droppedItem) return;
    // Only for rooms after the first (initial spawn is handled separately)
    if (state.currentRoom === 0) return;
    // Don't spawn while hero is walking to next room - wait for animation to complete
    if (state.isTransitioning) return;

    // All conditions met - spawn next enemy or show floor complete
    if (state.currentRoom < state.roomsPerFloor) {
      nextRoom();
    } else {
      showFloorComplete();
    }
  }, [
    state.gamePhase,
    state.currentEnemy,
    state.isPaused,
    state.pendingLevelUp,
    state.currentRoom,
    state.roomsPerFloor,
    state.isTransitioning,
    droppedItem,
    nextRoom,
    showFloorComplete,
  ]);

  // Reset death tracking refs when game restarts or player respawns
  useEffect(() => {
    // Reset player death ref when player is no longer dying (respawned/restarted)
    if (state.player && !state.player.isDying) {
      playerDeathProcessedRef.current = false;
    }
    // Reset when game phase changes to menu or class select (full restart)
    if (state.gamePhase === GAME_PHASE.MENU || state.gamePhase === GAME_PHASE.CLASS_SELECT) {
      playerDeathProcessedRef.current = false;
      enemyDeathProcessedRef.current = null;
    }
  }, [state.player, state.gamePhase]);

  // Reset enemy death tracking when a new enemy spawns
  // This ensures each enemy's death can be processed exactly once
  useEffect(() => {
    if (state.currentEnemy && !state.currentEnemy.isDying) {
      enemyDeathProcessedRef.current = null;
    }
  }, [state.currentEnemy?.id]);

  // Cleanup all combat timeouts on unmount
  useEffect(() => {
    return () => {
      clearCombatTimeouts();
    };
  }, [clearCombatTimeouts]);

  return {
    state,
    shopItems: state.shopItems,
    availablePowers: state.availablePowers,
    droppedItem,
    lastCombatEvent,
    heroProgress: shouldRunCombatLoop ? heroProgress : 0,
    enemyProgress: shouldRunCombatLoop ? enemyProgress : 0,
    isHeroStunned,
    actions: {
      startGame,
      selectClass,
      usePower,
      buyItem,
      learnPower,
      claimItem,
      equipDroppedItem,
      dismissDroppedItem,
      applyFloorUpgrade,
      continueFromShop,
      continueFromFloorComplete,
      togglePause,
      dismissLevelUp,
      restartGame,
      retryFloor,
      applyUpgrade,
      setCombatSpeed,
      activateBlock,
      handleTransitionComplete,
      handleEnemyDeathAnimationComplete,
      handlePlayerDeathAnimationComplete,
    },
  };
}
