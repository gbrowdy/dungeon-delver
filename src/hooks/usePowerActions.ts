import { useCallback } from 'react';
import { GameState, Power } from '@/types/game';
import { calculateStats } from '@/hooks/useCharacterSetup';
import { CombatEvent } from '@/hooks/useBattleAnimation';
import { COMBAT_BALANCE, POWER_BALANCE } from '@/constants/balance';
import { COMBAT_EVENT_DELAYS } from '@/constants/balance';
import { COMBAT_EVENT_TYPE, BUFF_STAT, ITEM_EFFECT_TRIGGER } from '@/constants/enums';
import { generateEventId } from '@/utils/eventId';
import { getDropQualityBonus } from '@/utils/fortuneUtils';
import { processItemEffects } from '@/hooks/useItemEffects';
import { usePathAbilities } from '@/hooks/usePathAbilities';
import { applyTriggerResultToEnemy } from '@/hooks/combatActionHelpers';

/**
 * Context for power activation - all state needed to execute a power
 */
export interface PowerActivationContext {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  setLastCombatEvent: (event: CombatEvent | null) => void;
  scheduleCombatEvent: (event: CombatEvent, delay: number) => void;
  enemyDeathProcessedRef: React.MutableRefObject<string | null>;
  combatSpeed: number;
}

/**
 * Hook for managing power activation logic.
 * Extracted from useGameState to improve code organization and maintainability.
 *
 * Handles:
 * - Power activation with mana cost and cooldown management
 * - Combo system for alternating powers
 * - Power effects: damage, heal, buff
 * - Special power interactions (vampiric touch, mana surge)
 * - Enemy death from power damage
 */
export function usePowerActions(context: PowerActivationContext) {
  const {
    setState,
    setLastCombatEvent,
    scheduleCombatEvent,
    enemyDeathProcessedRef,
    combatSpeed,
  } = context;

  const { processTrigger, hasAbility } = usePathAbilities();

  const usePower = useCallback((powerId: string) => {
    setState((prev: GameState) => {
      if (!prev.player || !prev.currentEnemy) return prev;
      // Skip if player or enemy is dying
      if (prev.player.isDying || prev.currentEnemy.isDying) return prev;

      const powerIndex = prev.player.powers.findIndex((p: Power) => p.id === powerId);
      if (powerIndex === -1) return prev;

      const power = prev.player.powers[powerIndex];
      if (!power) return prev;

      // Check if player has Reckless Fury - uses HP instead of mana
      const useHpForMana = hasAbility(prev.player, 'reckless_fury');

      if (power.currentCooldown > 0) {
        return prev;
      }

      // Check resource cost (HP or Mana depending on Reckless Fury)
      if (useHpForMana) {
        const hpCost = Math.floor(power.manaCost * 0.5);
        // Need at least hpCost + 1 HP to use power (can't kill yourself)
        if (prev.player.currentStats.health <= hpCost) {
          return prev;
        }
      } else {
        // Normal mana check
        if (prev.player.currentStats.mana < power.manaCost) {
          return prev;
        }
      }

      const player = { ...prev.player };
      const enemy = { ...prev.currentEnemy };
      const logs: string[] = [];

      // Track different powers used for combo system (e.g., Elemental Convergence)
      // If this is a different power than the last one used, increment combo count
      if (player.lastPowerUsed && player.lastPowerUsed !== power.id) {
        player.comboCount = (player.comboCount || 0) + 1;
      } else if (!player.lastPowerUsed) {
        // First power used, initialize combo count
        player.comboCount = 1;
      }
      // If same power, don't increment (but don't reset either)

      player.lastPowerUsed = power.id;

      // Check for vanilla combo bonus (still exists, separate from path abilities)
      // Combo bonus starts at 2+ different powers: subtract 1 so 2 powers = 1x bonus, 3 powers = 2x bonus, etc.
      // MAX_COMBO_COUNT - 1 caps the bonus levels (e.g., if max is 5, cap at 4 bonus levels)
      let comboMultiplier = 1;
      if (player.comboCount >= 2) {
        comboMultiplier = 1 + (Math.min(player.comboCount - 1, COMBAT_BALANCE.MAX_COMBO_COUNT - 1) * COMBAT_BALANCE.COMBO_DAMAGE_BONUS_PER_LEVEL);
        if (comboMultiplier > 1) {
          logs.push(`🔥 ${player.comboCount}x COMBO! (+${Math.floor((comboMultiplier - 1) * 100)}% damage)`);
        }
      }

      // Deduct resource cost (HP or Mana depending on Reckless Fury)
      if (useHpForMana) {
        const hpCost = Math.floor(power.manaCost * 0.5);
        player.currentStats.health -= hpCost;
        logs.push(`💔 Reckless Fury: Paid ${hpCost} HP for ${power.name}`);
      } else {
        player.currentStats.mana -= power.manaCost;
      }

      // Set cooldown - subtract one tick worth immediately so the countdown starts right away
      // This prevents the visual "pause" before the cooldown bar starts moving
      const cooldownSpeed = 1.0; // Constant cooldown speed (stat removed)
      const initialTickReduction = (COMBAT_BALANCE.COOLDOWN_TICK_INTERVAL / 1000) * cooldownSpeed * prev.combatSpeed;
      player.powers = player.powers.map((p: Power, i: number) =>
        i === powerIndex ? { ...p, currentCooldown: Math.max(0, p.cooldown - initialTickReduction) } : p
      );

      logs.push(`${power.icon} Used ${power.name}!`);

      // Process ON_POWER_CAST item effects (pass mana cost as damage parameter for refund effects)
      const powerCastResult = processItemEffects({
        trigger: ITEM_EFFECT_TRIGGER.ON_POWER_CAST,
        player,
        damage: power.manaCost,
      });
      Object.assign(player, powerCastResult.player);
      logs.push(...powerCastResult.logs);

      // Process path ability triggers: on_power_use
      const pathOnPowerResult = processTrigger('on_power_use', {
        player,
        enemy,
        powerUsed: power.id,
      });
      player.currentStats = pathOnPowerResult.player.currentStats;
      logs.push(...pathOnPowerResult.logs);
      applyTriggerResultToEnemy(enemy, pathOnPowerResult);

      switch (power.effect) {
        case 'damage': {
          let baseDamage = Math.floor(player.currentStats.power * power.value * comboMultiplier);

          // Apply power damage multiplier from items (e.g., Archmage's Staff)
          if (powerCastResult.powerDamageMultiplier) {
            baseDamage = Math.floor(baseDamage * powerCastResult.powerDamageMultiplier);
          }

          let totalDamage = 0;

          // Handle category-specific mechanics
          if (power.category === 'burst') {
            // Multi-hit powers - divide damage across hits and proc on-hit effects
            const hitCount = power.id === 'fan-of-knives' ? 5 : 3;
            const damagePerHit = Math.floor(baseDamage / hitCount);

            for (let i = 0; i < hitCount; i++) {
              // Each hit can crit independently
              let hitDamage = damagePerHit;

              // Process ON_HIT item effects for each hit
              const hitResult = processItemEffects({
                trigger: ITEM_EFFECT_TRIGGER.ON_HIT,
                player,
                damage: hitDamage,
                enemy,
              });
              Object.assign(player, hitResult.player);
              logs.push(...hitResult.logs);

              // Add any additional damage from on-hit effects
              hitDamage += hitResult.additionalDamage;

              enemy.health -= hitDamage;
              totalDamage += hitDamage;
            }
            logs.push(`Dealt ${totalDamage} damage in ${hitCount} hits!`);
          } else if (power.category === 'execute') {
            // Execute powers - bonus damage vs low HP enemies
            const hpPercent = enemy.health / enemy.maxHealth;
            let executeThreshold = 0.25;
            let executeMultiplier = 2;

            if (power.id === 'coup-de-grace') {
              executeThreshold = 0.30;
              executeMultiplier = 250 / 80; // 250% damage vs 80% base
            }

            if (hpPercent < executeThreshold) {
              baseDamage = Math.floor(baseDamage * executeMultiplier);
              logs.push(`💀 EXECUTE! Enemy below ${Math.floor(executeThreshold * 100)}% HP!`);
            }

            enemy.health -= baseDamage;
            totalDamage = baseDamage;
            logs.push(`Dealt ${totalDamage} damage!`);
          } else if (power.category === 'sacrifice') {
            // Sacrifice powers - spend HP for damage
            const hpCostPercent = power.id === 'reckless-swing' ? 0.15 : 0.20;
            const hpCost = Math.floor(player.currentStats.maxHealth * hpCostPercent);
            player.currentStats.health = Math.max(1, player.currentStats.health - hpCost);
            logs.push(`🩸 Sacrificed ${hpCost} HP!`);

            enemy.health -= baseDamage;
            totalDamage = baseDamage;
            logs.push(`Dealt ${totalDamage} damage!`);
          } else {
            // Strike and other damage powers
            enemy.health -= baseDamage;
            totalDamage = baseDamage;
            logs.push(`Dealt ${totalDamage} magical damage!`);
          }

          // Process path ability triggers: on_combo (for power-based combos like Elemental Convergence)
          // This must happen AFTER base damage is calculated
          const onComboResult = processTrigger('on_combo', {
            player,
            enemy,
            damage: totalDamage,
            powerUsed: power.id,
          });
          player.currentStats = onComboResult.player.currentStats;

          // Apply combo bonus damage if any
          if (onComboResult.damageAmount && onComboResult.damageAmount > 0) {
            enemy.health -= onComboResult.damageAmount;
            totalDamage += onComboResult.damageAmount;
            logs.push(...onComboResult.logs);

            // Reset combo count after combo triggers
            player.comboCount = 0;
          }

          const damage = totalDamage;

          // Check if enemy will die from this hit
          const enemyWillDie = enemy.health <= 0;

          // Emit power event for animation (with powerId for special effects)
          const powerHitDelay = Math.floor(COMBAT_EVENT_DELAYS.PLAYER_HIT_DELAY / prev.combatSpeed);
          const playerPowerEvent: import('@/hooks/useBattleAnimation').PlayerPowerEvent = {
            type: COMBAT_EVENT_TYPE.PLAYER_POWER,
            powerId: power.id,
            damage: damage,
            isCrit: comboMultiplier > 1, // Treat combo as crit for visual effect
            timestamp: Date.now(),
            id: generateEventId(),
          };
          setLastCombatEvent(playerPowerEvent);

          // Schedule enemy hit event with targetDied flag
          const enemyHitEvent: import('@/hooks/useBattleAnimation').EnemyHitEvent = {
            type: COMBAT_EVENT_TYPE.ENEMY_HIT,
            damage: damage,
            isCrit: comboMultiplier > 1,
            timestamp: Date.now(),
            id: generateEventId(),
            targetDied: enemyWillDie,
          };
          scheduleCombatEvent(enemyHitEvent, powerHitDelay);

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
          if (power.id === 'blood-pact') {
            // Sacrifice power - spend HP to restore mana
            const hpCostPercent = 0.20;
            const hpCost = Math.floor(player.currentStats.maxHealth * hpCostPercent);
            player.currentStats.health = Math.max(1, player.currentStats.health - hpCost);
            logs.push(`🩸 Sacrificed ${hpCost} HP!`);

            const manaRestored = power.value; // Flat 50 mana
            player.currentStats.mana = Math.min(
              player.currentStats.maxMana,
              player.currentStats.mana + manaRestored
            );
            logs.push(`Restored ${manaRestored} mana!`);
          } else if (power.id === 'mana-surge') {
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
            // Power buff
            player.activeBuffs.push({
              id: `buff-power-${Date.now()}`,
              name: power.name,
              stat: BUFF_STAT.POWER,
              multiplier: 1 + power.value,
              remainingTurns: buffDuration,
              icon: power.icon,
            });
            logs.push(`Attack increased by ${Math.floor(power.value * 100)}% for ${buffDuration} turns!`);
          } else if (power.id === 'shield-wall') {
            // Armor buff
            player.activeBuffs.push({
              id: `buff-armor-${Date.now()}`,
              name: power.name,
              stat: BUFF_STAT.ARMOR,
              multiplier: 1 + power.value,
              remainingTurns: buffDuration,
              icon: power.icon,
            });
            logs.push(`Defense doubled for ${buffDuration} turns!`);
          } else if (power.id === 'inner-focus') {
            // Fortune buff
            player.activeBuffs.push({
              id: `buff-fortune-${Date.now()}`,
              name: power.name,
              stat: BUFF_STAT.FORTUNE,
              multiplier: 1 + power.value,
              remainingTurns: buffDuration,
              icon: power.icon,
            });
            logs.push(`Fortune increased by ${Math.floor(power.value * 100)}% for ${buffDuration} turns!`);
          } else {
            // Generic power buff for unknown buff powers
            player.activeBuffs.push({
              id: `buff-generic-${Date.now()}`,
              name: power.name,
              stat: BUFF_STAT.POWER,
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
        case 'debuff': {
          // Control powers - apply status effects to enemy
          if (power.category === 'control') {
            let statusApplied = false;

            if (power.id === 'frost-nova') {
              // Deal damage first
              const damage = Math.floor(player.currentStats.power * power.value * comboMultiplier);
              enemy.health -= damage;
              logs.push(`Dealt ${damage} frost damage!`);

              // Apply slow effect
              enemy.statusEffects = enemy.statusEffects || [];
              enemy.statusEffects.push({
                id: `slow-${Date.now()}`,
                type: 'slow',
                value: 0.3, // 30% slow
                remainingTurns: 4,
                icon: '❄️',
              });
              logs.push(`❄️ Enemy slowed by 30% for 4 turns!`);
              statusApplied = true;
            } else if (power.id === 'stunning-blow') {
              // Deal damage first
              const damage = Math.floor(player.currentStats.power * power.value * comboMultiplier);
              enemy.health -= damage;
              logs.push(`Dealt ${damage} damage!`);

              // 40% chance to stun
              const stunChance = 0.4;
              if (Math.random() < stunChance) {
                enemy.statusEffects = enemy.statusEffects || [];
                enemy.statusEffects.push({
                  id: `stun-${Date.now()}`,
                  type: 'stun',
                  remainingTurns: 2,
                  icon: '💫',
                });
                logs.push(`💫 Enemy stunned for 2 turns!`);
                statusApplied = true;
              } else {
                logs.push(`Stun failed!`);
              }
            }

            // Process path ability triggers: on_status_inflict (when status was successfully applied)
            if (statusApplied) {
              const onStatusInflictResult = processTrigger('on_status_inflict', {
                player,
                enemy,
              });
              player.currentStats = onStatusInflictResult.player.currentStats;

              // Apply any heal/damage/mana from on_status_inflict
              if (onStatusInflictResult.healAmount) {
                player.currentStats.health = Math.min(
                  player.currentStats.maxHealth,
                  player.currentStats.health + onStatusInflictResult.healAmount
                );
              }
              if (onStatusInflictResult.manaRestored) {
                player.currentStats.mana = Math.min(
                  player.currentStats.maxMana,
                  player.currentStats.mana + onStatusInflictResult.manaRestored
                );
              }

              // Apply results to enemy
              applyTriggerResultToEnemy(enemy, onStatusInflictResult);

              // Only add logs if there were actual effects
              if (onStatusInflictResult.logs.length > 0) {
                logs.push(...onStatusInflictResult.logs);
              }
            }
          }
          break;
        }
      }

      // Check if enemy died from power - mark as dying, don't remove
      // Use ref for atomic check to prevent race conditions from async setState
      if (enemy.health <= 0 && enemyDeathProcessedRef.current !== enemy.id) {
        enemyDeathProcessedRef.current = enemy.id;
        enemy.isDying = true;

        // Apply fortune-based gold bonus
        const dropQualityBonus = getDropQualityBonus(player.currentStats.fortune);
        const bonusGold = Math.floor(enemy.goldReward * dropQualityBonus);

        player.experience += enemy.experienceReward;
        player.gold += bonusGold;

        const bonusText = dropQualityBonus > 0 ? ` (+${Math.floor(dropQualityBonus * 100)}% fortune bonus)` : '';
        logs.push(`${enemy.name} defeated! +${enemy.experienceReward} XP, +${bonusGold} gold${bonusText}`);

        player.currentStats = calculateStats(player);

        // Keep enemy in state with isDying flag - animation system will remove it
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
  }, [setState, setLastCombatEvent, scheduleCombatEvent, enemyDeathProcessedRef, processTrigger, hasAbility]);

  return {
    usePower,
  };
}
