import { useCallback } from 'react';
import { Player, Stats, Item, ActiveBuff } from '@/types/game';
import { isValidStatKey, isValidStatValue } from '@/utils/typeGuards';

/**
 * Hook for calculating player stats from base stats, equipment, and buffs.
 */
export function useStats() {
  const calculateStats = useCallback((player: Player): Stats => {
    const stats = { ...player.baseStats };

    // Apply equipment bonuses
    player.equippedItems.forEach((item: Item) => {
      Object.entries(item.statBonus).forEach(([key, value]) => {
        if (isValidStatKey(key) && isValidStatValue(value)) {
          stats[key] += value;
        }
      });
    });

    // Apply active buffs (multiplicative)
    player.activeBuffs.forEach((buff: ActiveBuff) => {
      if (buff.stat === 'attack') {
        stats.attack = Math.floor(stats.attack * buff.multiplier);
      } else if (buff.stat === 'defense') {
        stats.defense = Math.floor(stats.defense * buff.multiplier);
      } else if (buff.stat === 'critChance') {
        stats.critChance = Math.min(100, Math.floor(stats.critChance * buff.multiplier));
      } else if (buff.stat === 'dodgeChance') {
        stats.dodgeChance = Math.min(100, Math.floor(stats.dodgeChance * buff.multiplier));
      }
    });

    // Preserve current health/mana values
    stats.health = Math.min(player.currentStats.health, stats.maxHealth);
    stats.mana = Math.min(player.currentStats.mana, stats.maxMana);

    return stats;
  }, []);

  return { calculateStats };
}
