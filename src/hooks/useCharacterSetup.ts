import { useCallback } from 'react';
import { GameState, Player, CharacterClass, Stats, Item, ActiveBuff } from '@/types/game';
import { CLASS_DATA } from '@/data/classes';
import { generateStartingItem } from '@/data/items';
import { isValidStatKey, isValidStatValue } from '@/utils/typeGuards';
import { FLOOR_CONFIG } from '@/constants/game';
import { COMBAT_BALANCE } from '@/constants/balance';
import { GAME_PHASE, BUFF_STAT } from '@/constants/enums';
import { logStateTransition } from '@/utils/gameLogger';
import { CircularBuffer, MAX_COMBAT_LOG_SIZE } from '@/utils/circularBuffer';

/**
 * Pure function to calculate a player's current stats based on base stats,
 * equipment bonuses, and active buffs.
 *
 * This is extracted as a standalone function because it's used by many
 * other hooks and doesn't require React state.
 */
export function calculateStats(player: Player): Stats {
  const stats = { ...player.baseStats };

  // Validate equippedItems is an array before iterating
  if (!Array.isArray(player.equippedItems)) {
    console.error('Invalid equippedItems, using default stats');
    return stats;
  }

  // Apply equipment bonuses
  player.equippedItems.forEach((item: Item) => {
    // Validate statBonus exists and is an object before iterating
    if (!item.statBonus || typeof item.statBonus !== 'object') {
      console.warn('Invalid item statBonus:', item);
      return;
    }
    Object.entries(item.statBonus).forEach(([key, value]) => {
      if (isValidStatKey(key) && isValidStatValue(value)) {
        stats[key] += value;
      }
    });
  });

  // Apply active buffs (multiplicative)
  player.activeBuffs.forEach((buff: ActiveBuff) => {
    if (buff.stat === BUFF_STAT.ATTACK) {
      stats.attack = Math.floor(stats.attack * buff.multiplier);
    } else if (buff.stat === BUFF_STAT.DEFENSE) {
      stats.defense = Math.floor(stats.defense * buff.multiplier);
    } else if (buff.stat === BUFF_STAT.CRIT_CHANCE) {
      stats.critChance = Math.min(COMBAT_BALANCE.MAX_CRIT_CHANCE, Math.floor(stats.critChance * buff.multiplier));
    } else if (buff.stat === BUFF_STAT.DODGE_CHANCE) {
      stats.dodgeChance = Math.min(COMBAT_BALANCE.MAX_DODGE_CHANCE, Math.floor(stats.dodgeChance * buff.multiplier));
    }
  });

  // Preserve current health/mana values
  stats.health = Math.min(player.currentStats.health, stats.maxHealth);
  stats.mana = Math.min(player.currentStats.mana, stats.maxMana);

  return stats;
}

/**
 * Hook for character creation and class selection.
 * Returns a function to initialize a new character with the selected class.
 */
export function useCharacterSetup(
  setState: React.Dispatch<React.SetStateAction<GameState>>
) {
  const selectClass = useCallback((characterClass: CharacterClass) => {
    const classData = CLASS_DATA[characterClass];

    // Generate starting weapon for the character
    const startingWeapon = generateStartingItem('weapon');

    const player: Player = {
      name: classData.name,
      class: characterClass,
      level: 1,
      experience: 0,
      experienceToNext: FLOOR_CONFIG.STARTING_EXP_TO_LEVEL,
      gold: FLOOR_CONFIG.STARTING_GOLD,
      baseStats: { ...classData.baseStats },
      currentStats: { ...classData.baseStats },
      powers: [{ ...classData.startingPower }],
      inventory: [],
      equippedItems: [startingWeapon],
      activeBuffs: [],
      statusEffects: [],
      isBlocking: false,
      comboCount: 0,
      lastPowerUsed: null,
      // upgradePurchases removed - old upgrade system deprecated
    };

    // Recalculate stats with starting equipment
    player.currentStats = calculateStats(player);

    logStateTransition(GAME_PHASE.CLASS_SELECT, GAME_PHASE.COMBAT, `select_class:${characterClass}`);

    const combatLog = new CircularBuffer<string>(MAX_COMBAT_LOG_SIZE);
    combatLog.add(`${classData.name} begins their adventure!`);

    setState((prev: GameState) => ({
      ...prev,
      player,
      gamePhase: GAME_PHASE.COMBAT,
      currentFloor: 1,
      currentRoom: 0,
      combatLog,
      combatSpeed: 1,
    }));
  }, [setState]);

  return { selectClass };
}
