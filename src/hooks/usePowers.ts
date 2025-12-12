import { useCallback } from 'react';
import { Player, Enemy, Power, Stats } from '@/types/game';
import { deepClonePlayer, deepCloneEnemy } from '@/utils/stateUtils';

/**
 * Power use result
 */
export interface PowerUseResult {
  player: Player;
  enemy: Enemy;
  logs: string[];
  damage: number;
  enemyDefeated: boolean;
}

/**
 * Hook for handling power usage, cooldowns, and combos.
 */
export function usePowers() {
  /**
   * Tick down all power cooldowns by 1
   */
  const tickCooldowns = useCallback((player: Player): Player => {
    return {
      ...player,
      powers: player.powers.map((p: Power) => ({
        ...p,
        currentCooldown: Math.max(0, p.currentCooldown - 1),
      })),
    };
  }, []);

  /**
   * Reset all power cooldowns to 0
   */
  const resetAllCooldowns = useCallback((player: Player): Player => {
    return {
      ...player,
      powers: player.powers.map((p: Power) => ({ ...p, currentCooldown: 0 })),
    };
  }, []);

  /**
   * Check if a power can be used
   */
  const canUsePower = useCallback((player: Player, powerId: string): boolean => {
    const power = player.powers.find(p => p.id === powerId);
    if (!power) return false;
    return power.currentCooldown === 0 && player.currentStats.mana >= power.manaCost;
  }, []);

  /**
   * Use a power and return the results
   */
  const usePower = useCallback((
    player: Player,
    enemy: Enemy,
    powerId: string,
    calculateStats: (p: Player) => Stats
  ): PowerUseResult | null => {
    const powerIndex = player.powers.findIndex((p: Power) => p.id === powerId);
    if (powerIndex === -1) return null;

    const power = player.powers[powerIndex];
    if (!power) return null;

    if (!canUsePower(player, powerId)) return null;

    const updatedPlayer = deepClonePlayer(player);
    const updatedEnemy = deepCloneEnemy(enemy);
    const logs: string[] = [];
    let damage = 0;

    // Calculate combo bonus
    let comboMultiplier = 1;
    if (updatedPlayer.lastPowerUsed && updatedPlayer.lastPowerUsed !== power.id) {
      // Using a different power than last time = combo!
      updatedPlayer.comboCount = Math.min(5, updatedPlayer.comboCount + 1);
      comboMultiplier = 1 + (updatedPlayer.comboCount * 0.1);
      if (updatedPlayer.comboCount >= 2) {
        logs.push(`🔥 ${updatedPlayer.comboCount}x COMBO! (+${Math.floor((comboMultiplier - 1) * 100)}% damage)`);
      }
    } else {
      // Same power or first power = reset combo
      updatedPlayer.comboCount = 0;
    }
    updatedPlayer.lastPowerUsed = power.id;

    // Use mana
    updatedPlayer.currentStats.mana -= power.manaCost;

    // Set cooldown
    updatedPlayer.powers = player.powers.map((p: Power, i: number) =>
      i === powerIndex ? { ...p, currentCooldown: p.cooldown } : p
    );

    logs.push(`${power.icon} Used ${power.name}!`);

    // Apply power effect
    switch (power.effect) {
      case 'damage': {
        damage = Math.floor(updatedPlayer.currentStats.power * power.value * comboMultiplier);
        updatedEnemy.health -= damage;
        logs.push(`Dealt ${damage} magical damage!`);

        // Vampiric touch heals
        if (power.id === 'vampiric-touch') {
          const heal = Math.floor(damage * 0.5);
          updatedPlayer.currentStats.health = Math.min(
            updatedPlayer.currentStats.maxHealth,
            updatedPlayer.currentStats.health + heal
          );
          logs.push(`Healed for ${heal} HP!`);
        }
        break;
      }
      case 'heal': {
        if (power.id === 'mana-surge') {
          const manaRestored = Math.floor(updatedPlayer.currentStats.maxMana * power.value);
          updatedPlayer.currentStats.mana = Math.min(
            updatedPlayer.currentStats.maxMana,
            updatedPlayer.currentStats.mana + manaRestored
          );
          logs.push(`Restored ${manaRestored} mana!`);
        } else {
          const heal = Math.floor(updatedPlayer.currentStats.maxHealth * power.value);
          updatedPlayer.currentStats.health = Math.min(
            updatedPlayer.currentStats.maxHealth,
            updatedPlayer.currentStats.health + heal
          );
          logs.push(`Healed for ${heal} HP!`);
        }
        break;
      }
      case 'buff': {
        const buffDuration = 3;

        if (power.id === 'battle-cry') {
          updatedPlayer.activeBuffs.push({
            id: `buff-power-${Date.now()}`,
            name: power.name,
            stat: 'power',
            multiplier: 1 + power.value,
            remainingTurns: buffDuration,
            icon: power.icon,
          });
          logs.push(`Attack increased by ${Math.floor(power.value * 100)}% for ${buffDuration} turns!`);
        } else if (power.id === 'shield-wall') {
          updatedPlayer.activeBuffs.push({
            id: `buff-armor-${Date.now()}`,
            name: power.name,
            stat: 'armor',
            multiplier: 1 + power.value,
            remainingTurns: buffDuration,
            icon: power.icon,
          });
          logs.push(`Defense doubled for ${buffDuration} turns!`);
        } else {
          updatedPlayer.activeBuffs.push({
            id: `buff-generic-${Date.now()}`,
            name: power.name,
            stat: 'power',
            multiplier: 1 + power.value,
            remainingTurns: buffDuration,
            icon: power.icon,
          });
          logs.push(`Stats boosted for ${buffDuration} turns!`);
        }

        updatedPlayer.currentStats = calculateStats(updatedPlayer);
        break;
      }
    }

    return {
      player: updatedPlayer,
      enemy: updatedEnemy,
      logs,
      damage,
      enemyDefeated: updatedEnemy.health <= 0,
    };
  }, [canUsePower]);

  /**
   * Learn a new power
   */
  const learnPower = useCallback((player: Player, power: Power): Player => {
    return {
      ...player,
      powers: [...player.powers, power],
    };
  }, []);

  return {
    tickCooldowns,
    resetAllCooldowns,
    canUsePower,
    usePower,
    learnPower,
  };
}
