import { useCallback } from 'react';
import { Player, Stats } from '@/types/game';
import { deepClonePlayer } from '@/utils/stateUtils';
import { restorePlayerHealth, restorePlayerMana } from '@/utils/statsUtils';
import { LEVEL_UP_BONUSES } from '@/constants/game';

/**
 * Level up result
 */
export interface LevelUpResult {
  player: Player;
  leveledUp: boolean;
  levelsGained: number;
}

/**
 * Hook for handling player progression (XP, leveling, stat gains).
 */
export function useProgression() {
  /**
   * Check and apply level ups based on current XP
   */
  const processLevelUps = useCallback((
    player: Player,
    calculateStats: (p: Player) => Stats
  ): LevelUpResult => {
    const updatedPlayer = deepClonePlayer(player);
    let levelsGained = 0;

    while (updatedPlayer.experience >= updatedPlayer.experienceToNext) {
      updatedPlayer.experience -= updatedPlayer.experienceToNext;
      updatedPlayer.level += 1;
      updatedPlayer.experienceToNext = Math.floor(updatedPlayer.experienceToNext * 1.5);

      // Apply stat gains
      updatedPlayer.baseStats.maxHealth += LEVEL_UP_BONUSES.MAX_HEALTH;
      updatedPlayer.baseStats.power += LEVEL_UP_BONUSES.POWER;
      updatedPlayer.baseStats.maxMana += LEVEL_UP_BONUSES.MAX_MANA;

      // Recalculate and restore to full HP/MP
      updatedPlayer.currentStats = calculateStats(updatedPlayer);
      updatedPlayer.currentStats.health = updatedPlayer.currentStats.maxHealth;
      updatedPlayer.currentStats.mana = updatedPlayer.currentStats.maxMana;

      levelsGained++;
    }

    return {
      player: updatedPlayer,
      leveledUp: levelsGained > 0,
      levelsGained,
    };
  }, []);

  /**
   * Award XP and gold from defeating an enemy
   */
  const awardRewards = useCallback((
    player: Player,
    xp: number,
    gold: number
  ): Player => {
    return {
      ...player,
      experience: player.experience + xp,
      gold: player.gold + gold,
    };
  }, []);

  /**
   * Apply a stat upgrade (from shop or death screen)
   */
  const applyStatUpgrade = useCallback((
    player: Player,
    stat: keyof Stats,
    value: number,
    cost: number,
    calculateStats: (p: Player) => Stats
  ): Player | null => {
    if (player.gold < cost) return null;

    let updatedPlayer = deepClonePlayer(player);
    updatedPlayer.gold -= cost;
    updatedPlayer.baseStats[stat] += value;
    updatedPlayer.currentStats = calculateStats(updatedPlayer);

    // For HP/MP upgrades, also restore the added amount
    if (stat === 'maxHealth') {
      const healResult = restorePlayerHealth(updatedPlayer, value);
      updatedPlayer = healResult.player;
    }
    if (stat === 'maxMana') {
      const manaResult = restorePlayerMana(updatedPlayer, value);
      updatedPlayer = manaResult.player;
    }

    return updatedPlayer;
  }, []);

  return {
    processLevelUps,
    awardRewards,
    applyStatUpgrade,
  };
}
