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
      if (buff.stat === 'power') {
        stats.power = Math.floor(stats.power * buff.multiplier);
      } else if (buff.stat === 'armor') {
        stats.armor = Math.floor(stats.armor * buff.multiplier);
      } else if (buff.stat === 'fortune') {
        stats.fortune = Math.floor(stats.fortune * buff.multiplier);
      }
    });

    // Preserve current health/mana values
    stats.health = Math.min(player.currentStats.health, stats.maxHealth);
    stats.mana = Math.min(player.currentStats.mana, stats.maxMana);

    return stats;
  }, []);

  return { calculateStats };
}
