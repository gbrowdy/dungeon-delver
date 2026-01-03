import { useCallback } from 'react';
import { GameState, Player, CharacterClass, Stats, Item, ActiveBuff } from '@/types/game';
import { CLASS_DATA } from '@/data/classes';
import { isValidStatKey, isValidStatValue } from '@/utils/typeGuards';
import { FLOOR_CONFIG } from '@/constants/game';
import { COMBAT_BALANCE } from '@/constants/balance';
import { GAME_PHASE, BUFF_STAT } from '@/constants/enums';
import { logStateTransition } from '@/utils/gameLogger';
import { CircularBuffer, MAX_COMBAT_LOG_SIZE } from '@/utils/circularBuffer';
import { selectFloorTheme } from '@/data/floorThemes';
import { getEnhancedStats } from '@/utils/enhancementUtils';

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

  // Apply equipment bonuses (with enhancement bonuses)
  player.equippedItems.forEach((item: Item) => {
    // Validate statBonus exists and is an object before iterating
    if (!item.statBonus || typeof item.statBonus !== 'object') {
      console.warn('Invalid item statBonus:', item);
      return;
    }
    // Use getEnhancedStats to include enhancement bonuses
    const enhancedStats = getEnhancedStats(item);
    Object.entries(enhancedStats).forEach(([key, value]) => {
      if (isValidStatKey(key) && isValidStatValue(value)) {
        stats[key] += value;
      }
    });
  });

  // Apply active buffs (multiplicative)
  player.activeBuffs.forEach((buff: ActiveBuff) => {
    if (buff.stat === BUFF_STAT.POWER) {
      stats.power = Math.floor(stats.power * buff.multiplier);
    } else if (buff.stat === BUFF_STAT.ARMOR) {
      stats.armor = Math.floor(stats.armor * buff.multiplier);
    } else if (buff.stat === BUFF_STAT.FORTUNE) {
      stats.fortune = Math.floor(stats.fortune * buff.multiplier);
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
      equippedItems: [], // Start with no equipment
      activeBuffs: [],
      statusEffects: [],
      isBlocking: false,
      comboCount: 0,
      lastPowerUsed: null,
      // upgradePurchases removed - old upgrade system deprecated
      path: null, // No path until level 2
      pendingAbilityChoice: false, // No pending ability choice at start
      // Path ability tracking fields (initialized to sensible defaults)
      enemyAttackCounter: 0, // For Uncanny Dodge ability
      usedCombatAbilities: [], // Abilities used this combat (reset per room)
      usedFloorAbilities: [], // Abilities used this floor (reset per floor)
      shield: 0, // Current shield amount
      shieldMaxDuration: 0, // Max shield duration in seconds
      shieldRemainingDuration: 0, // Remaining shield duration in seconds
      hpRegen: classData.hpRegen, // Base HP regen from class (e.g., Paladin has 0.5)
    };

    logStateTransition(GAME_PHASE.CLASS_SELECT, GAME_PHASE.COMBAT, `select_class:${characterClass}`);

    // Select a theme for Floor 1
    const floorTheme = selectFloorTheme(1);

    const combatLog = new CircularBuffer<string>(MAX_COMBAT_LOG_SIZE);
    combatLog.add(`${classData.name} begins their adventure!`);
    combatLog.add(`Floor 1: ${floorTheme.name} - ${floorTheme.description}`);

    setState((prev: GameState) => ({
      ...prev,
      player,
      gamePhase: GAME_PHASE.COMBAT,
      currentFloor: 1,
      currentRoom: 0,
      currentFloorTheme: floorTheme,
      combatLog,
      combatSpeed: 1,
    }));
  }, [setState]);

  return { selectClass };
}
