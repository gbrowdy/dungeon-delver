import { useCallback } from 'react';
import { GameState, Power } from '@/types/game';
import { calculateStats } from '@/hooks/useCharacterSetup';
import { CombatEvent } from '@/hooks/useBattleAnimation';
import { COMBAT_BALANCE, POWER_BALANCE } from '@/constants/balance';
import { COMBAT_EVENT_DELAYS } from '@/constants/balance';
import { COMBAT_EVENT_TYPE, BUFF_STAT } from '@/constants/enums';
import { generateEventId } from '@/utils/eventId';
import { getDropQualityBonus } from '@/utils/fortuneUtils';

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
      const cooldownSpeed = 1.0; // Constant cooldown speed (stat removed)
      const initialTickReduction = (COMBAT_BALANCE.COOLDOWN_TICK_INTERVAL / 1000) * cooldownSpeed * prev.combatSpeed;
      player.powers = player.powers.map((p: Power, i: number) =>
        i === powerIndex ? { ...p, currentCooldown: Math.max(0, p.cooldown - initialTickReduction) } : p
      );

      logs.push(`${power.icon} Used ${power.name}!`);

      switch (power.effect) {
        case 'damage': {
          const damage = Math.floor(player.currentStats.power * power.value * comboMultiplier);
          enemy.health -= damage;
          logs.push(`Dealt ${damage} magical damage!`);

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
      }

      // Check if enemy died from power - mark as dying, don't remove
      // Use ref for atomic check to prevent race conditions from async setState
      if (enemy.health <= 0 && enemyDeathProcessedRef.current !== enemy.id) {
        enemyDeathProcessedRef.current = enemy.id;
        enemy.isDying = true;

        // Apply fortune-based gold bonus
        const dropQualityBonus = getDropQualityBonus(player.currentStats.fortune);
        const bonusGold = Math.floor(enemy.goldReward * (1 + dropQualityBonus));

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
  }, [setState, setLastCombatEvent, scheduleCombatEvent, enemyDeathProcessedRef]);

  return {
    usePower,
  };
}
