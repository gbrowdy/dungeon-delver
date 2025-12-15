import {
  Player, Enemy, Item, StatusEffect, ActiveBuff,
} from '@/types/game';
import { calculateStats } from '@/hooks/useCharacterSetup';
import { calculateRewards, processLevelUp, calculateItemDrop } from '@/hooks/useRewardCalculation';
import {
  COMBAT_MECHANICS,
} from '@/constants/game';
import {
  STATUS_EFFECT_TYPE,
  ITEM_EFFECT_TRIGGER,
  EFFECT_TYPE,
} from '@/constants/enums';
import { deepClonePlayer, deepCloneEnemy } from '@/utils/stateUtils';
import { getCritChance, getCritDamage, getDropQualityBonus } from '@/utils/fortuneUtils';
import { processItemEffects } from '@/hooks/useItemEffects';

/**
 * Result of processing turn-start effects
 */
export interface TurnStartEffectsResult {
  player: Player;
  logs: string[];
  isStunned: boolean;
}

/**
 * Result of calculating attack damage
 */
export interface AttackDamageResult {
  damage: number;
  isCrit: boolean;
  logs: string[];
}

/**
 * Result of processing hit effects
 */
export interface HitEffectsResult {
  player: Player;
  damage: number;
  logs: string[];
}

/**
 * Result of processing enemy death
 */
export interface EnemyDeathResult {
  player: Player;
  enemy: Enemy;
  logs: string[];
  droppedItem: Item | null;
  newPityCounter: number;
  itemDropped: boolean;
  leveledUp: boolean;
}

/**
 * Process turn-start effects on the player:
 * - Status effects (poison, etc.) and tick-down durations
 * - Buff expiration
 * - Turn-start item effects (regeneration, mana restoration)
 *
 * @param player - Current player state
 * @param logs - Combat logs to append to
 * @returns Updated player state, logs, and stun status
 */
export function processTurnStartEffects(
  player: Player,
  logs: string[]
): TurnStartEffectsResult {
  const updatedPlayer = deepClonePlayer(player);
  const updatedLogs = [...logs];

  // Check if player is stunned
  const isStunned = updatedPlayer.statusEffects.some(
    (e: StatusEffect) => e.type === STATUS_EFFECT_TYPE.STUN
  );

  // Process status effects on player (poison, etc.) and tick down durations
  updatedPlayer.statusEffects = updatedPlayer.statusEffects.map((effect: StatusEffect) => {
    if (effect.type === STATUS_EFFECT_TYPE.POISON && effect.damage) {
      updatedPlayer.currentStats.health -= effect.damage;
      updatedLogs.push(`☠️ Poison deals ${effect.damage} damage!`);
    }
    return { ...effect, remainingTurns: effect.remainingTurns - 1 };
  }).filter((effect: StatusEffect) => effect.remainingTurns > 0);

  // Tick down buff durations
  updatedPlayer.activeBuffs = updatedPlayer.activeBuffs.map((buff: ActiveBuff) => ({
    ...buff,
    remainingTurns: buff.remainingTurns - 1,
  })).filter((buff: ActiveBuff) => buff.remainingTurns > 0);

  // Trigger turn_start item effects
  updatedPlayer.equippedItems.forEach((item: Item) => {
    if (item.effect?.trigger === ITEM_EFFECT_TRIGGER.TURN_START) {
      const chance = item.effect.chance ?? 1;
      if (Math.random() < chance) {
        if (item.effect.type === EFFECT_TYPE.HEAL) {
          const healAmount = item.effect.value;
          updatedPlayer.currentStats.health = Math.min(
            updatedPlayer.currentStats.maxHealth,
            updatedPlayer.currentStats.health + healAmount
          );
          updatedLogs.push(`${item.icon} Regenerated ${healAmount} HP`);
        } else if (item.effect.type === EFFECT_TYPE.MANA) {
          updatedPlayer.currentStats.mana = Math.min(
            updatedPlayer.currentStats.maxMana,
            updatedPlayer.currentStats.mana + item.effect.value
          );
        }
      }
    }
  });

  // Recalculate stats with updated buffs
  updatedPlayer.currentStats = calculateStats(updatedPlayer);

  return {
    player: updatedPlayer,
    logs: updatedLogs,
    isStunned,
  };
}

/**
 * Calculate attack damage with variance and critical hit logic
 *
 * @param playerStats - Player's current stats
 * @param enemyArmor - Enemy's armor value
 * @param isEnemyShielded - Whether enemy has shield active
 * @returns Damage amount, crit status, and logs
 */
export function calculateAttackDamage(
  playerStats: Player['currentStats'],
  enemyArmor: number,
  isEnemyShielded: boolean
): AttackDamageResult {
  const logs: string[] = [];

  // Check for critical hit using fortune-based calculation
  const critChance = getCritChance(playerStats.fortune);
  const isCrit = Math.random() < critChance;

  // Calculate base damage
  const effectiveArmor = isEnemyShielded ? enemyArmor * 1.5 : enemyArmor;
  const baseDamage = Math.max(1, playerStats.power - effectiveArmor / 2);

  // Apply damage variance
  const damageVariance = COMBAT_MECHANICS.DAMAGE_VARIANCE_MIN +
    Math.random() * COMBAT_MECHANICS.DAMAGE_VARIANCE_RANGE;
  let damage = baseDamage * damageVariance;

  // Apply critical hit multiplier using fortune-based calculation
  if (isCrit) {
    const critMultiplier = getCritDamage(playerStats.fortune);
    damage *= critMultiplier;
    logs.push(`💥 Critical hit! (${Math.floor(critMultiplier * 100)}%)`);
  }

  return {
    damage: Math.floor(damage),
    isCrit,
    logs,
  };
}

/**
 * Process on-hit and on-crit item effects
 *
 * @param player - Current player state
 * @param baseDamage - Base damage before item effects
 * @param isCrit - Whether the attack was a critical hit
 * @param logs - Combat logs to append to
 * @returns Updated player state, final damage, and logs
 */
export function processHitEffects(
  player: Player,
  baseDamage: number,
  isCrit: boolean,
  logs: string[]
): HitEffectsResult {
  let updatedPlayer = deepClonePlayer(player);
  const updatedLogs = [...logs];
  let finalDamage = baseDamage;

  // Process on-crit effects using centralized processor
  if (isCrit) {
    const critResult = processItemEffects({
      trigger: ITEM_EFFECT_TRIGGER.ON_CRIT,
      player: updatedPlayer,
      damage: finalDamage,
    });
    updatedPlayer = critResult.player;
    finalDamage += critResult.additionalDamage;
    updatedLogs.push(...critResult.logs);
  }

  // Process on-hit effects using centralized processor
  const hitResult = processItemEffects({
    trigger: ITEM_EFFECT_TRIGGER.ON_HIT,
    player: updatedPlayer,
    damage: finalDamage,
  });
  updatedPlayer = hitResult.player;
  finalDamage += hitResult.additionalDamage;
  updatedLogs.push(...hitResult.logs);

  // Process ON_DAMAGE_DEALT effects (lifesteal) - this triggers AFTER damage is calculated
  const damageDealtResult = processItemEffects({
    trigger: ITEM_EFFECT_TRIGGER.ON_DAMAGE_DEALT,
    player: updatedPlayer,
    damage: finalDamage,
  });
  updatedPlayer = damageDealtResult.player;
  updatedLogs.push(...damageDealtResult.logs);

  return {
    player: updatedPlayer,
    damage: Math.floor(finalDamage),
    logs: updatedLogs,
  };
}

/**
 * Process enemy death:
 * - Calculate XP/gold rewards
 * - Process level-ups
 * - Handle item drops with pity system
 * - Trigger on-kill item effects
 * - Clear status effects and reset combat state
 *
 * @param player - Current player state
 * @param enemy - Enemy that was defeated
 * @param currentFloor - Current floor number
 * @param itemPityCounter - Current pity counter value
 * @param logs - Combat logs to append to
 * @returns Updated player, enemy, logs, and drop information
 */
export function processEnemyDeath(
  player: Player,
  enemy: Enemy,
  currentFloor: number,
  itemPityCounter: number,
  logs: string[]
): EnemyDeathResult {
  const updatedPlayer = deepClonePlayer(player);
  const updatedEnemy = deepCloneEnemy(enemy);
  updatedEnemy.isDying = true;
  const updatedLogs = [...logs];

  // Calculate rewards with level-based penalty
  const rewardResult = calculateRewards(updatedPlayer, updatedEnemy, currentFloor);
  updatedPlayer.experience = rewardResult.updatedPlayer.experience;
  updatedPlayer.gold = rewardResult.updatedPlayer.gold;
  updatedLogs.push(rewardResult.rewardText);

  // Reset combo and power state
  updatedPlayer.comboCount = 0;
  updatedPlayer.lastPowerUsed = null;

  // Trigger on-kill item effects using centralized processor
  const onKillResult = processItemEffects({
    trigger: ITEM_EFFECT_TRIGGER.ON_KILL,
    player: updatedPlayer,
  });
  updatedPlayer.currentStats = onKillResult.player.currentStats;
  updatedLogs.push(...onKillResult.logs);

  // Process level-ups
  const levelUpResult = processLevelUp(updatedPlayer);
  updatedPlayer.experience = levelUpResult.updatedPlayer.experience;
  updatedPlayer.level = levelUpResult.updatedPlayer.level;
  updatedPlayer.experienceToNext = levelUpResult.updatedPlayer.experienceToNext;
  updatedPlayer.baseStats = levelUpResult.updatedPlayer.baseStats;
  updatedPlayer.currentStats = levelUpResult.updatedPlayer.currentStats;
  updatedLogs.push(...levelUpResult.levelUpLogs);
  const leveledUp = levelUpResult.leveledUp;

  // Clear status effects
  updatedPlayer.statusEffects = [];

  // Check for item drop with pity system
  const dropQualityBonus = getDropQualityBonus(updatedPlayer.currentStats.fortune);
  const itemDropResult = calculateItemDrop(
    updatedEnemy,
    currentFloor,
    itemPityCounter,
    dropQualityBonus
  );

  if (itemDropResult.droppedItem) {
    updatedLogs.push(itemDropResult.dropLog);
  }

  return {
    player: updatedPlayer,
    enemy: updatedEnemy,
    logs: updatedLogs,
    droppedItem: itemDropResult.droppedItem,
    newPityCounter: itemDropResult.newPityCounter,
    itemDropped: itemDropResult.itemDropped,
    leveledUp,
  };
}

/**
 * Calculate effective enemy stat value after applying debuffs.
 * Debuffs stack multiplicatively (e.g., two 15% reductions = 0.85 * 0.85 = 72.25% of original)
 *
 * @param enemy - The enemy to check debuffs on
 * @param stat - The stat to calculate ('power' | 'armor' | 'speed')
 * @param baseValue - The base stat value before debuffs
 * @returns The effective stat value after all debuffs are applied
 */
export function getEffectiveEnemyStat(
  enemy: Enemy,
  stat: 'power' | 'armor' | 'speed',
  baseValue: number
): number {
  if (!enemy.statDebuffs || enemy.statDebuffs.length === 0) {
    return baseValue;
  }

  // Get all debuffs for this stat
  const relevantDebuffs = enemy.statDebuffs.filter(d => d.stat === stat);

  if (relevantDebuffs.length === 0) {
    return baseValue;
  }

  // Calculate total reduction multiplicatively
  let multiplier = 1;
  relevantDebuffs.forEach(debuff => {
    multiplier *= (1 - debuff.percentReduction);
  });

  return Math.floor(baseValue * multiplier);
}
