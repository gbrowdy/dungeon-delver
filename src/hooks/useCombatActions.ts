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
  getEffectiveEnemyStat,
  applyTriggerResultToEnemy,
  applyShieldAbsorption,
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
import { safeCombatLogAdd } from '@/utils/combatLogUtils';
import { getDodgeChance } from '@/utils/fortuneUtils';
import { processItemEffects } from '@/hooks/useItemEffects';
import { usePathAbilities } from '@/hooks/usePathAbilities';
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
 * Hook for combat action functions (hero attack, enemy attack, block).
 *
 * Manages all combat mechanics including damage calculation, status effects, item/path ability triggers,
 * and death processing. Extracted from useGameState.ts to improve maintainability.
 *
 * @param params - Combat action parameters including setState, event handlers, and combat speed
 * @returns Object with performHeroAttack, performEnemyAttack, and activateBlock functions
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

  // Initialize path abilities hook for processing path ability effects
  const { processTrigger, hasAbility, getStatusImmunities, getPassiveDamageReduction, incrementAbilityCounter, resetAbilityCounter } = usePathAbilities();


  /**
   * Hero attack callback - called when hero's attack timer fills
   *
   * Handles:
   * - Status effects (poison, stun, etc.)
   * - Buff management
   * - Turn-start item effects
   * - Attack damage calculation
   * - On-hit and on-crit item effects
   * - Path ability trigger processing (on_hit, on_crit, on_kill)
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

      // Process path ability triggers: turn_start
      const pathTurnStartResult = processTrigger('turn_start', {
        player: updatedPlayer,
        enemy,
      });
      Object.assign(updatedPlayer, { currentStats: pathTurnStartResult.player.currentStats });
      logs.push(...pathTurnStartResult.logs);
      applyTriggerResultToEnemy(enemy, pathTurnStartResult);

      // NOTE: Power cooldowns are now time-based, not turn-based
      // They are ticked separately in a dedicated interval

      // If stunned, skip attack and return
      if (turnStartResult.isStunned) {
        logs.push(`💫 You are stunned and cannot act!`);
        safeCombatLogAdd(prev.combatLog, logs, 'performHeroAttack:stunned');
        return {
          ...prev,
          player: updatedPlayer,
          currentEnemy: enemy,
        };
      }

      // === PLAYER ATTACK ===
      // Check for guaranteed crit from attack modifiers
      let forceCrit = false;
      if (updatedPlayer.attackModifiers?.some(m => m.effect === 'guaranteed_crit' && m.remainingAttacks > 0)) {
        forceCrit = true;
      }

      // Check Perfect Form momentum stacks BEFORE attack
      let perfectFormMultiplier = 1.0;
      if (hasAbility(updatedPlayer, 'rogue_duelist_perfect_form')) {
        const momentumStacks = updatedPlayer.abilityCounters?.['perfect_form_momentum'] ?? 0;
        if (momentumStacks >= 5) {
          perfectFormMultiplier = 3.0; // 300% damage (3x multiplier)
          logs.push(`💫 Perfect Form: Maximum momentum unleashed!`);
        }
      }

      // Calculate attack damage with variance and crit
      let damageResult = calculateAttackDamage(
        updatedPlayer.currentStats,
        enemy.armor,
        enemy.isShielded || false
      );

      // Override crit if forced by attack modifier
      if (forceCrit && !damageResult.isCrit) {
        // Recalculate with guaranteed crit
        const baseDamage = Math.max(1, updatedPlayer.currentStats.power - enemy.armor / 2);
        const damageVariance = COMBAT_MECHANICS.DAMAGE_VARIANCE_MIN + Math.random() * COMBAT_MECHANICS.DAMAGE_VARIANCE_RANGE;
        const critDamage = Math.floor(baseDamage * damageVariance * COMBAT_MECHANICS.CRIT_MULTIPLIER);
        damageResult = {
          damage: critDamage,
          isCrit: true,
          logs: ['💥 Guaranteed Critical Hit!'],
        };
      }

      logs = [...logs, ...damageResult.logs];

      // Process hit effects (on-hit and on-crit item effects)
      const hitEffectsResult = processHitEffects(
        updatedPlayer,
        damageResult.damage,
        damageResult.isCrit,
        logs
      );
      let playerAfterEffects = hitEffectsResult.player;
      let finalDamage = hitEffectsResult.damage;
      logs = hitEffectsResult.logs;

      // Apply Perfect Form damage multiplier and reset stacks
      if (perfectFormMultiplier > 1.0) {
        const bonusDamage = Math.floor(finalDamage * (perfectFormMultiplier - 1.0));
        finalDamage += bonusDamage;
        logs.push(`⚡ Perfect Form bonus: +${bonusDamage} damage!`);
        // Reset momentum stacks after use
        playerAfterEffects = resetAbilityCounter(playerAfterEffects, 'perfect_form_momentum');
      }

      // Process path ability triggers: on_hit
      const onHitResult = processTrigger('on_hit', {
        player: playerAfterEffects,
        enemy,
        damage: finalDamage,
        isCrit: damageResult.isCrit,
      });
      playerAfterEffects = onHitResult.player;
      finalDamage += onHitResult.damageAmount || 0;
      logs = [...logs, ...onHitResult.logs];

      // Apply reflected damage to enemy if any
      if (onHitResult.reflectedDamage) {
        enemy.health -= onHitResult.reflectedDamage;
      }

      // Apply status effect to enemy if triggered
      if (onHitResult.statusToApply) {
        enemy.statusEffects = enemy.statusEffects || [];
        enemy.statusEffects.push(onHitResult.statusToApply);

        // Process path ability triggers: on_status_inflict
        const onStatusInflictResult = processTrigger('on_status_inflict', {
          player: playerAfterEffects,
          enemy,
        });
        playerAfterEffects = onStatusInflictResult.player;
        finalDamage += onStatusInflictResult.damageAmount || 0;

        // Apply reflected damage to enemy if any
        if (onStatusInflictResult.reflectedDamage) {
          enemy.health -= onStatusInflictResult.reflectedDamage;
        }

        // Apply results to enemy
        applyTriggerResultToEnemy(enemy, onStatusInflictResult);

        // Only add logs if there were actual effects
        if (onStatusInflictResult.logs.length > 0) {
          logs = [...logs, ...onStatusInflictResult.logs];
        }
      }

      // Apply stat debuffs to enemy if triggered
      if (onHitResult.enemyDebuffs && onHitResult.enemyDebuffs.length > 0) {
        enemy.statDebuffs = enemy.statDebuffs || [];
        onHitResult.enemyDebuffs.forEach(debuff => {
          // Check if a debuff for this stat from this source already exists
          const existingIndex = enemy.statDebuffs!.findIndex(
            d => d.stat === debuff.stat && d.sourceName === debuff.sourceName
          );
          if (existingIndex >= 0) {
            // Refresh duration instead of stacking
            enemy.statDebuffs![existingIndex].remainingDuration = debuff.remainingDuration;
          } else {
            enemy.statDebuffs!.push(debuff);
          }
        });
      }

      // Process path ability triggers: on_crit (if crit occurred)
      if (damageResult.isCrit) {
        const onCritResult = processTrigger('on_crit', {
          player: playerAfterEffects,
          enemy,
          damage: finalDamage,
          isCrit: true,
        });
        playerAfterEffects = onCritResult.player;
        finalDamage += onCritResult.damageAmount || 0;
        logs = [...logs, ...onCritResult.logs];

        // Apply reflected damage to enemy if any
        if (onCritResult.reflectedDamage) {
          enemy.health -= onCritResult.reflectedDamage;
        }

        // Apply status effect to enemy if triggered
        if (onCritResult.statusToApply) {
          enemy.statusEffects = enemy.statusEffects || [];
          enemy.statusEffects.push(onCritResult.statusToApply);

          // Process path ability triggers: on_status_inflict
          const onStatusInflictResult = processTrigger('on_status_inflict', {
            player: playerAfterEffects,
            enemy,
          });
          playerAfterEffects = onStatusInflictResult.player;
          finalDamage += onStatusInflictResult.damageAmount || 0;

          // Apply reflected damage to enemy if any
          if (onStatusInflictResult.reflectedDamage) {
            enemy.health -= onStatusInflictResult.reflectedDamage;
          }

          // Apply results to enemy
          applyTriggerResultToEnemy(enemy, onStatusInflictResult);

          // Only add logs if there were actual effects
          if (onStatusInflictResult.logs.length > 0) {
            logs = [...logs, ...onStatusInflictResult.logs];
          }
        }
      }

      // Apply damage to enemy
      enemy.health -= finalDamage;
      logs.push(`You deal ${finalDamage} damage to ${enemy.name}`);

      // Increment combo count for attack-based combos (e.g., Holy Avenger)
      playerAfterEffects.comboCount = (playerAfterEffects.comboCount || 0) + 1;

      // Process path ability triggers: on_combo (for attack-based combos)
      const onComboResult = processTrigger('on_combo', {
        player: playerAfterEffects,
        enemy,
        damage: finalDamage,
      });
      playerAfterEffects = onComboResult.player;

      // Apply combo bonus damage if any (damageAmount is already calculated in usePathAbilities)
      if (onComboResult.damageAmount && onComboResult.damageAmount > 0) {
        enemy.health -= onComboResult.damageAmount;
        finalDamage += onComboResult.damageAmount;
        logs.push(...onComboResult.logs);

        // Reset combo count after combo triggers
        playerAfterEffects.comboCount = 0;
      }

      // Thorned modifier: Reflect damage back to player
      if (enemy.modifiers?.some(m => m.id === 'thorned')) {
        const reflectDamage = Math.floor(finalDamage * 0.1);
        playerAfterEffects.currentStats.health -= reflectDamage;
        logs.push(`🌵 Thorns reflect ${reflectDamage} damage back to you!`);
      }

      // Decrement attack modifiers
      if (playerAfterEffects.attackModifiers && playerAfterEffects.attackModifiers.length > 0) {
        playerAfterEffects.attackModifiers = playerAfterEffects.attackModifiers
          .map(m => ({ ...m, remainingAttacks: m.remainingAttacks - 1 }))
          .filter(m => m.remainingAttacks > 0);

        if (playerAfterEffects.attackModifiers.length === 0) {
          playerAfterEffects.attackModifiers = undefined;
        }
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

        // Process path ability triggers: on_kill
        const onKillResult = processTrigger('on_kill', {
          player: playerAfterEffects,
          enemy,
        });
        playerAfterEffects = onKillResult.player;
        logs = [...logs, ...onKillResult.logs];

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

        safeCombatLogAdd(prev.combatLog, deathResult.logs, 'performHeroAttack:enemyDeath');
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

      safeCombatLogAdd(prev.combatLog, logs, 'performHeroAttack:complete');
      return {
        ...prev,
        player: playerAfterEffects,
        currentEnemy: enemy,
      };
    });
  }, [setState, setLastCombatEvent, setDroppedItem, scheduleCombatEvent, combatSpeed, enemyDeathProcessedRef, processTrigger, hasAbility, resetAbilityCounter]);

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

      let player = deepClonePlayer(prev.player);
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

        // Blocking reduces damage for multi_hit, but completely negates status effects
        const statusEffectAbilities: EnemyAbilityType[] = ['poison', 'stun'];
        if (player.isBlocking && statusEffectAbilities.includes(ability.type)) {
          logs.push(`🛡️ Block! Negated ${ability.name}!`);
          // Skip the switch - status effect is fully negated
        } else switch (ability.type) {
          case 'multi_hit': {
            const hits = ability.value;
            const effectivePower = getEffectiveEnemyStat(enemy, 'power', enemy.power);
            const damagePerHit = Math.max(1, Math.floor((effectivePower * COMBAT_BALANCE.MULTI_HIT_DAMAGE_MODIFIER - player.currentStats.armor / 2)));
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

                // Process path ability triggers: on_block
                const pathOnBlockResult = processTrigger('on_block', {
                  player,
                  enemy,
                  isBlock: true,
                  damage: totalDamage,
                });
                player.currentStats = pathOnBlockResult.player.currentStats;
                logs.push(...pathOnBlockResult.logs);
                applyTriggerResultToEnemy(enemy, pathOnBlockResult);
              }

              // Apply passive damage reduction from path abilities
              const damageReduction = getPassiveDamageReduction(player);
              if (damageReduction > 0) {
                const reducedAmount = Math.floor(totalDamage * damageReduction);
                totalDamage = Math.max(1, totalDamage - reducedAmount);
                if (reducedAmount > 0) {
                  logs.push(`🛡️ Damage reduced by ${reducedAmount}!`);
                }
              }

              // Shield absorbs damage first
              const shieldResult = applyShieldAbsorption(player, totalDamage);
              player.shield = shieldResult.newShieldValue;
              player.shieldRemainingDuration = shieldResult.newShieldDuration;

              if (shieldResult.shieldAbsorbed > 0) {
                logs.push(`🛡️ Shield absorbs ${shieldResult.shieldAbsorbed} damage!`);
              }
              if (shieldResult.shieldBroken) {
                logs.push(`💔 Shield broken!`);
              }

              // Only apply remaining damage to HP
              if (shieldResult.remainingDamage > 0) {
                player.currentStats.health -= shieldResult.remainingDamage;

                // Reset blur counter on damage taken (breaks consecutive dodge streak)
                if (hasAbility(player, 'rogue_duelist_blur')) {
                  player = resetAbilityCounter(player, 'blur_dodges');
                }
              }

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
              icon: 'status-poison',
            });
            logs.push(`☠️ You are poisoned! (${poisonDamage} damage/turn for ${COMBAT_BALANCE.DEFAULT_POISON_DURATION} turns)`);
            break;
          }
          case 'stun': {
            const immunities = getStatusImmunities(player);
            if (immunities.includes('stun')) {
              logs.push(`🛡️ Immovable Object! You resist the stun!`);
            } else {
              player.statusEffects.push({
                id: `stun-${Date.now()}`,
                type: STATUS_EFFECT_TYPE.STUN,
                remainingTurns: ability.value,
                icon: 'status-stun',
              });
              logs.push(`💫 You are stunned for ${ability.value} turn(s)!`);
            }
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
        let playerDodged = !enemyCrit && Math.random() < playerDodgeChance;

        // Uncanny Dodge: Every 5th enemy attack is auto-dodged
        let uncannyDodgeTriggered = false;
        if (hasAbility(player, 'rogue_duelist_uncanny_dodge')) {
          // Increment counter
          player.enemyAttackCounter = (player.enemyAttackCounter || 0) + 1;

          // Check if counter reached 5
          if (player.enemyAttackCounter >= 5) {
            playerDodged = true;
            uncannyDodgeTriggered = true;
            player.enemyAttackCounter = 0;
          }
        }

        if (playerDodged) {
          if (uncannyDodgeTriggered) {
            logs.push(`⚔️ Uncanny Dodge! You automatically evade ${enemy.name}'s attack!`);
          } else {
            logs.push(`💨 You dodged ${enemy.name}'s attack!`);
          }

          // Process path ability triggers: on_dodge
          const pathOnDodgeResult = processTrigger('on_dodge', {
            player,
            enemy,
            isDodge: true,
          });
          player.currentStats = pathOnDodgeResult.player.currentStats;
          logs.push(...pathOnDodgeResult.logs);
          applyTriggerResultToEnemy(enemy, pathOnDodgeResult);

          // Blur: Track consecutive dodges for shield
          if (hasAbility(player, 'rogue_duelist_blur')) {
            const { player: updatedPlayer, newValue } = incrementAbilityCounter(player, 'blur_dodges', 3);
            player = updatedPlayer;

            if (newValue >= 3) {
              player.shield = (player.shield || 0) + 20;
              player.shieldRemainingDuration = 5;
              player.shieldMaxDuration = 5;
              player = resetAbilityCounter(player, 'blur_dodges');
              logs.push(`✨ Blur: Shield granted after 3 consecutive dodges!`);
            }
          }

          // Perfect Form: Build momentum stacks on dodge
          if (hasAbility(player, 'rogue_duelist_perfect_form')) {
            const { player: updatedPlayer, newValue } = incrementAbilityCounter(player, 'perfect_form_momentum', 5);
            player = updatedPlayer;
            logs.push(`⚡ Perfect Form: Momentum stack ${newValue}/5`);
          }
        } else {
          const effectiveEnemyPower = getEffectiveEnemyStat(enemy, 'power', enemy.power);
          const enemyBaseDamage = Math.max(1, effectiveEnemyPower - player.currentStats.armor / 2);
          const enemyDamageVariance = COMBAT_MECHANICS.DAMAGE_VARIANCE_MIN + Math.random() * COMBAT_MECHANICS.DAMAGE_VARIANCE_RANGE;
          enemyDamage = Math.floor(enemyBaseDamage * enemyDamageVariance);

          if (enemyCrit) {
            enemyDamage *= 2;
            logs.push(`💥 ${enemy.name} lands a critical hit!`);
          }

          if (player.isBlocking) {
            enemyDamage = Math.floor(enemyDamage * COMBAT_BALANCE.BLOCK_DAMAGE_REDUCTION);
            logs.push(`🛡️ Block! Damage reduced to ${enemyDamage}!`);

            // Process path ability triggers: on_block
            const pathOnBlockResult = processTrigger('on_block', {
              player,
              enemy,
              isBlock: true,
              damage: enemyDamage,
            });
            player.currentStats = pathOnBlockResult.player.currentStats;
            logs.push(...pathOnBlockResult.logs);
            applyTriggerResultToEnemy(enemy, pathOnBlockResult);
          }

          // Apply passive damage reduction from path abilities
          const damageReduction = getPassiveDamageReduction(player);
          if (damageReduction > 0) {
            const reducedAmount = Math.floor(enemyDamage * damageReduction);
            enemyDamage = Math.max(1, enemyDamage - reducedAmount);
            if (reducedAmount > 0) {
              logs.push(`🛡️ Damage reduced by ${reducedAmount}!`);
            }
          }

          // Shield absorbs damage first
          const shieldResult = applyShieldAbsorption(player, enemyDamage);
          player.shield = shieldResult.newShieldValue;
          player.shieldRemainingDuration = shieldResult.newShieldDuration;

          if (shieldResult.shieldAbsorbed > 0) {
            logs.push(`🛡️ Shield absorbs ${shieldResult.shieldAbsorbed} damage!`);
          }
          if (shieldResult.shieldBroken) {
            logs.push(`💔 Shield broken!`);
          }

          // Only apply remaining damage to HP
          if (shieldResult.remainingDamage > 0) {
            player.currentStats.health -= shieldResult.remainingDamage;
            logs.push(`${enemy.name} deals ${shieldResult.remainingDamage} damage to you`);

            // Reset blur counter on damage taken (breaks consecutive dodge streak)
            if (hasAbility(player, 'rogue_duelist_blur')) {
              player = resetAbilityCounter(player, 'blur_dodges');
            }
          }

          // Vampiric modifier: Heal enemy based on damage dealt
          if (enemy.modifiers?.some(m => m.id === 'vampiric')) {
            const vampHeal = Math.floor(enemyDamage * 0.2);
            enemy.health = Math.min(enemy.maxHealth, enemy.health + vampHeal);
            logs.push(`🩸 ${enemy.name} drains ${vampHeal} life!`);
          }

          // Trigger on_damaged item effects using centralized processor
          const onDamagedResult = processItemEffects({
            trigger: ITEM_EFFECT_TRIGGER.ON_DAMAGED,
            player,
            damage: enemyDamage,
            enemy,
          });
          player.currentStats = onDamagedResult.player.currentStats;
          logs.push(...onDamagedResult.logs);

          // Apply reflection damage to enemy if any
          if (onDamagedResult.additionalDamage > 0) {
            enemy.health -= onDamagedResult.additionalDamage;
          }

          // Process path ability triggers: on_damaged
          const pathOnDamagedResult = processTrigger('on_damaged', {
            player,
            enemy,
            damage: enemyDamage,
          });
          player.currentStats = pathOnDamagedResult.player.currentStats;
          logs.push(...pathOnDamagedResult.logs);

          // Apply reflected damage to enemy if any
          if (pathOnDamagedResult.reflectedDamage) {
            enemy.health -= pathOnDamagedResult.reflectedDamage;
          }

          // Process path ability triggers: on_low_hp
          // This fires when HP is low (checked via hp_below condition in usePathAbilities)
          const pathOnLowHpResult = processTrigger('on_low_hp', {
            player,
            enemy,
            damage: enemyDamage,
          });
          player.currentStats = pathOnLowHpResult.player.currentStats;
          logs.push(...pathOnLowHpResult.logs);

          // Apply reflected damage to enemy if any
          if (pathOnLowHpResult.reflectedDamage) {
            enemy.health -= pathOnLowHpResult.reflectedDamage;
          }
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
        // Check for undying_fury (once per combat)
        if (hasAbility(player, 'undying_fury')) {
          const usedCombat = player.usedCombatAbilities || [];
          if (!usedCombat.includes('undying_fury')) {
            player.currentStats.health = 1;
            player.usedCombatAbilities = [...usedCombat, 'undying_fury'];
            // Apply 50% power and speed buff for 5 seconds
            player.activeBuffs = player.activeBuffs || [];
            player.activeBuffs.push({
              id: `undying_fury_power_${Date.now()}`,
              name: 'Undying Fury',
              stat: 'power',
              multiplier: 1.5,
              remainingTurns: 5,
              icon: 'stat-power',
            });
            player.activeBuffs.push({
              id: `undying_fury_speed_${Date.now()}`,
              name: 'Undying Fury',
              stat: 'speed',
              multiplier: 1.5,
              remainingTurns: 5,
              icon: 'stat-speed',
            });
            logs.push(`🔥 Undying Fury! You refuse to fall!`);
            // Continue combat, don't die
            safeCombatLogAdd(prev.combatLog, logs, 'performEnemyAttack:undyingFury');
            return { ...prev, player, currentEnemy: enemy };
          } else {
            logs.push(`💀 Undying Fury already used this combat!`);
          }
        }

        // Check for immortal_guardian (once per floor)
        if (hasAbility(player, 'immortal_guardian')) {
          const usedFloor = player.usedFloorAbilities || [];
          if (!usedFloor.includes('immortal_guardian')) {
            const healAmount = Math.floor(player.currentStats.maxHealth * 0.4);
            player.currentStats.health = healAmount;
            player.usedFloorAbilities = [...usedFloor, 'immortal_guardian'];
            logs.push(`🛡️ Immortal Guardian! You are restored to ${healAmount} HP!`);
            // Continue combat, don't die
            safeCombatLogAdd(prev.combatLog, logs, 'performEnemyAttack:immortalGuardian');
            return { ...prev, player, currentEnemy: enemy };
          } else {
            logs.push(`💀 Immortal Guardian already used this floor!`);
          }
        }

        // Check for ON_LETHAL_DAMAGE item effects (survival effects like Immortal Plate)
        const lethalResult = processItemEffects({
          trigger: ITEM_EFFECT_TRIGGER.ON_LETHAL_DAMAGE,
          player,
          enemy,
        });

        if (lethalResult.survivedLethal) {
          // Player survived! Update health and logs
          player.currentStats.health = lethalResult.player.currentStats.health;
          logs.push(...lethalResult.logs);

          // Don't mark as dying, player survived
          safeCombatLogAdd(prev.combatLog, logs, 'performEnemyAttack:survivalEffect');
          return {
            ...prev,
            player: lethalResult.player,
            currentEnemy: enemy,
          };
        }

        // No survival effect - player dies
        playerDeathProcessedRef.current = true;
        player.isDying = true;
        logs.push(`💀 You have been defeated...`);

        safeCombatLogAdd(prev.combatLog, logs, 'performEnemyAttack:playerDeath');
        return {
          ...prev,
          player,
          currentEnemy: enemy,
        };
      }

      safeCombatLogAdd(prev.combatLog, logs, 'performEnemyAttack:complete');
      return {
        ...prev,
        player,
        currentEnemy: enemy,
      };
    });
  }, [setState, scheduleCombatEvent, combatSpeed, playerDeathProcessedRef, processTrigger, hasAbility, getStatusImmunities, getPassiveDamageReduction, incrementAbilityCounter, resetAbilityCounter]);

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

      safeCombatLogAdd(prev.combatLog, '🛡️ Bracing for impact!', 'activateBlock');
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
