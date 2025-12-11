import { Player, Enemy, Item } from '@/types/game';
import { generateItem, isRareOrBetter } from '@/data/items';
import { calculateStats } from '@/hooks/useCharacterSetup';
import { LEVEL_UP_BONUSES } from '@/constants/game';
import { REWARD_CONFIG } from '@/constants/balance';

/**
 * Result of reward calculation
 */
export interface RewardResult {
  adjustedXP: number;
  finalGold: number;
  leveledUp: boolean;
  updatedPlayer: Player;
  rewardText: string;
  levelUpLogs: string[];
}

/**
 * Result of item drop calculation
 */
export interface ItemDropResult {
  droppedItem: Item | null;
  newPityCounter: number;
  itemDropped: boolean;
  dropLog: string;
}

/**
 * Calculate XP and gold rewards with level-based penalties
 *
 * @param player - Current player state
 * @param enemy - Enemy that was defeated
 * @param currentFloor - Current floor number for penalty calculation
 * @returns Reward calculation result
 */
export function calculateRewards(
  player: Player,
  enemy: Enemy,
  currentFloor: number
): RewardResult {
  // Calculate level-based reward penalty
  // Player level vs floor level (floor ~= expected level)
  const levelDiff = Math.max(0, player.level - currentFloor);
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

  // Update player experience and gold
  const updatedPlayer = {
    ...player,
    experience: player.experience + adjustedXP,
    gold: player.gold + finalGold,
  };

  // Build reward text with penalties shown
  let rewardText = `${enemy.name} defeated! +${adjustedXP} XP, +${finalGold} gold`;
  if (levelPenalty < 1) {
    rewardText += ` (${Math.floor(levelPenalty * 100)}% - overleveled)`;
  }
  if (goldFindBonus > 0) {
    rewardText += ` (+${Math.floor(goldFindBonus * 100)}% gold find)`;
  }

  return {
    adjustedXP,
    finalGold,
    leveledUp: false, // Will be updated by processLevelUp
    updatedPlayer,
    rewardText,
    levelUpLogs: [],
  };
}

/**
 * Process level-up logic
 * Handles multiple level-ups if player gained enough XP
 *
 * @param player - Player state with updated experience
 * @returns Updated player state and level-up logs
 */
export function processLevelUp(player: Player): {
  updatedPlayer: Player;
  leveledUp: boolean;
  levelUpLogs: string[];
} {
  const logs: string[] = [];
  let leveledUp = false;
  let updatedPlayer = { ...player };

  while (updatedPlayer.experience >= updatedPlayer.experienceToNext) {
    updatedPlayer.experience -= updatedPlayer.experienceToNext;
    updatedPlayer.level += 1;
    updatedPlayer.experienceToNext = Math.floor(
      updatedPlayer.experienceToNext * LEVEL_UP_BONUSES.EXP_MULTIPLIER
    );

    // Apply stat bonuses
    updatedPlayer.baseStats = {
      ...updatedPlayer.baseStats,
      maxHealth: updatedPlayer.baseStats.maxHealth + LEVEL_UP_BONUSES.MAX_HEALTH,
      attack: updatedPlayer.baseStats.attack + LEVEL_UP_BONUSES.ATTACK,
      defense: updatedPlayer.baseStats.defense + LEVEL_UP_BONUSES.DEFENSE,
      maxMana: updatedPlayer.baseStats.maxMana + LEVEL_UP_BONUSES.MAX_MANA,
    };

    updatedPlayer.currentStats = calculateStats(updatedPlayer);
    // Don't restore HP/Mana on level up - only increase the max values
    logs.push(`🎉 Level up! Now level ${updatedPlayer.level}`);
    leveledUp = true;
  }

  // Recalculate stats after all level-ups
  updatedPlayer.currentStats = calculateStats(updatedPlayer);

  return {
    updatedPlayer,
    leveledUp,
    levelUpLogs: logs,
  };
}

/**
 * Calculate item drop with pity system
 *
 * @param enemy - Enemy that was defeated
 * @param currentFloor - Current floor for item generation
 * @param itemPityCounter - Current pity counter value
 * @param goldFind - Player's gold find stat (affects drop chance)
 * @returns Item drop result
 */
export function calculateItemDrop(
  enemy: Enemy,
  currentFloor: number,
  itemPityCounter: number,
  goldFind: number
): ItemDropResult {
  const goldFindForDrop = goldFind || 0;
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
  let newPityCounter = itemPityCounter;
  let itemDropped = false;
  let droppedItem: Item | null = null;
  let dropLog = '';

  if (Math.random() < dropChance) {
    // Generate a random item (any type) at current floor level with pity boost
    const dropped = generateItem(currentFloor, undefined, itemPityCounter);

    // Apply boss legendary boost by potentially upgrading rarity
    if (legendaryBoost > 0 && Math.random() < legendaryBoost) {
      // Boss legendary boost - regenerate item and create a new object with legendary rarity
      const baseDrop = generateItem(currentFloor);
      // Create a new legendary item object instead of mutating
      const legendaryDrop: Item = {
        ...baseDrop,
        rarity: 'legendary',
        name: baseDrop.name.replace(/^(Iron|Wooden|Simple|Basic|Steel|Reinforced|Quality|Fine|Enchanted|Magical|Glowing|Mystic|Ancient|Legendary|Divine|Celestial)/, 'Godforged'),
      };
      droppedItem = legendaryDrop;
      dropLog = `✨ ${enemy.name} dropped a LEGENDARY ${legendaryDrop.icon} ${legendaryDrop.name}!`;
      // Legendary always resets pity
      newPityCounter = 0;
      itemDropped = true;
    } else {
      droppedItem = dropped;
      dropLog = `💎 ${enemy.name} dropped ${dropped.icon} ${dropped.name}!`;
      // Update pity counter based on rarity
      if (isRareOrBetter(dropped)) {
        newPityCounter = 0; // Reset on rare+ drop
      } else {
        newPityCounter += 1; // Increment on common/uncommon
      }
      itemDropped = true;
    }
  }

  return {
    droppedItem,
    newPityCounter,
    itemDropped,
    dropLog,
  };
}
