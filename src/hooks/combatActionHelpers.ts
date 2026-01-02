import {
  Player, Enemy, Item, StatusEffect, ActiveBuff, EnemyStatDebuff, Power,
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
import { applyDamageToPlayer } from '@/utils/damageUtils';
import { processItemEffects } from '@/hooks/useItemEffects';
import { isFeatureEnabled } from '@/constants/features';
import type { TriggerResult } from '@/hooks/usePathAbilities';

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
  let updatedPlayer = deepClonePlayer(player);
  const updatedLogs = [...logs];

  // Check if player is stunned
  const isStunned = updatedPlayer.statusEffects.some(
    (e: StatusEffect) => e.type === STATUS_EFFECT_TYPE.STUN
  );

  // Collect poison effects before processing (to avoid iteration issues)
  const poisonEffects = updatedPlayer.statusEffects.filter(
    (effect: StatusEffect) => effect.type === STATUS_EFFECT_TYPE.POISON && effect.damage
  );

  // Process poison damage from all poison effects
  for (const effect of poisonEffects) {
    const poisonResult = applyDamageToPlayer(updatedPlayer, effect.damage!, 'status_effect');
    updatedPlayer = poisonResult.player;
    if (poisonResult.actualDamage > 0) {
      updatedLogs.push(`☠️ Poison deals ${poisonResult.actualDamage} damage!`);
    }
  }

  // Tick down and filter expired status effects
  updatedPlayer.statusEffects = updatedPlayer.statusEffects
    .map((effect: StatusEffect) => ({ ...effect, remainingTurns: effect.remainingTurns - 1 }))
    .filter((effect: StatusEffect) => effect.remainingTurns > 0);

  // NOTE: Buff durations are now ticked time-based in useCombatTimers.ts (not turn-based)
  // Active buffs are still applied to stats below via calculateStats()

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
 * @param autoDamageMultiplier - Path-based auto-attack damage multiplier (default 1.0)
 * @returns Damage amount, crit status, and logs
 */
export function calculateAttackDamage(
  playerStats: Player['currentStats'],
  enemyArmor: number,
  isEnemyShielded: boolean,
  autoDamageMultiplier: number = 1.0
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

  // Apply path playstyle auto damage modifier (Phase 2)
  // Active paths: 0.60x, Passive paths: 1.50x
  damage *= autoDamageMultiplier;

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

/**
 * Apply path ability trigger results to an enemy.
 * Handles damage, reflected damage, status effects, and stat debuffs.
 * Debuffs with matching stat+source refresh duration instead of stacking.
 *
 * @param enemy - The enemy to apply effects to
 * @param triggerResult - The result from processTrigger()
 */
export function applyTriggerResultToEnemy(
  enemy: Enemy,
  triggerResult: TriggerResult
): void {
  // Apply damage to enemy if any
  if (triggerResult.damageAmount) {
    enemy.health -= triggerResult.damageAmount;
  }

  // Apply reflected damage to enemy if any
  if (triggerResult.reflectedDamage) {
    enemy.health -= triggerResult.reflectedDamage;
  }

  // Apply status effect to enemy if triggered
  if (triggerResult.statusToApply) {
    enemy.statusEffects = enemy.statusEffects || [];
    enemy.statusEffects.push(triggerResult.statusToApply);
  }

  // Apply stat debuffs to enemy if triggered
  if (triggerResult.enemyDebuffs && triggerResult.enemyDebuffs.length > 0) {
    enemy.statDebuffs = enemy.statDebuffs || [];
    triggerResult.enemyDebuffs.forEach(debuff => {
      // Check if a debuff for this stat from this source already exists
      const existingIndex = enemy.statDebuffs!.findIndex(
        d => d.stat === debuff.stat && d.sourceName === debuff.sourceName
      );
      if (existingIndex >= 0) {
        // Refresh duration instead of stacking
        enemy.statDebuffs![existingIndex].remainingDuration = debuff.remainingDuration;
      } else {
        enemy.statDebuffs!.push(debuff);
      }
    });
  }
}

// ============================================================================
// PATH RESOURCE SPECIAL EFFECTS (Phase 6)
// ============================================================================

/**
 * Result of processing path resource on-kill effects
 */
export interface PathResourceOnKillResult {
  player: Player;
  logs: string[];
}

/**
 * Process path resource special effects when killing an enemy
 *
 * Currently handles:
 * - Berserker at 100 Fury: Full HP restore
 *
 * @param player - Current player state (will be mutated)
 * @param logs - Combat logs to append to
 * @returns Updated player and logs
 */
export function processPathResourceOnKill(
  player: Player,
  logs: string[]
): PathResourceOnKillResult {
  if (!isFeatureEnabled('ACTIVE_RESOURCE_SYSTEM') || !player.pathResource) {
    return { player, logs };
  }

  const updatedLogs = [...logs];

  // Berserker at max Fury (100): Full HP restore on kill
  if (player.pathResource.type === 'fury' && player.pathResource.current >= 100) {
    const healAmount = player.currentStats.maxHealth - player.currentStats.health;
    if (healAmount > 0) {
      player.currentStats.health = player.currentStats.maxHealth;
      updatedLogs.push(`🔥 BLOODLUST! Max Fury kill restores full HP! (+${healAmount} HP)`);
    }
  }

  return { player, logs: updatedLogs };
}

/**
 * Result of checking path resource attack modifiers
 */
export interface PathResourceAttackModifiers {
  forceCrit: boolean;
  bonusDamageMultiplier: number;
  consumeResource: boolean;
  logs: string[];
}

/**
 * Check for path resource special attack modifiers before an attack
 *
 * Currently handles:
 * - Crusader at 10 Zeal: Guaranteed critical + 50% burst damage, consumes all Zeal
 *
 * @param player - Current player state
 * @returns Attack modifiers to apply
 */
export function getPathResourceAttackModifiers(
  player: Player
): PathResourceAttackModifiers {
  const result: PathResourceAttackModifiers = {
    forceCrit: false,
    bonusDamageMultiplier: 1,
    consumeResource: false,
    logs: [],
  };

  if (!isFeatureEnabled('ACTIVE_RESOURCE_SYSTEM') || !player.pathResource) {
    return result;
  }

  // Crusader at max Zeal (10): Guaranteed crit + burst damage, consume all Zeal
  if (player.pathResource.type === 'zeal' && player.pathResource.current >= 10) {
    result.forceCrit = true;
    result.bonusDamageMultiplier = 1.5; // 50% bonus damage
    result.consumeResource = true;
    result.logs.push(`✨ DIVINE JUDGMENT! Max Zeal unleashes guaranteed critical strike!`);
  }

  return result;
}

/**
 * Apply path resource attack modifiers after an attack (consume resource, etc.)
 *
 * @param player - Player to modify (will be mutated)
 * @param modifiers - The modifiers that were applied
 */
export function applyPathResourceAttackConsumption(
  player: Player,
  modifiers: PathResourceAttackModifiers
): void {
  if (!player.pathResource || !modifiers.consumeResource) return;

  // Crusader: consume all Zeal after divine judgment
  if (player.pathResource.type === 'zeal') {
    player.pathResource = {
      ...player.pathResource,
      current: 0,
    };
  }
}

/**
 * Result of checking path resource execute effects
 */
export interface PathResourceExecuteResult {
  shouldExecute: boolean;
  resetCooldowns: boolean;
  logs: string[];
}

/**
 * Check if path resource enables an execute on low HP enemies
 *
 * Currently handles:
 * - Assassin at 5 Momentum: Execute enemies below 20% HP, reset all cooldowns
 *
 * @param player - Current player state
 * @param enemy - Current enemy state
 * @returns Execute result with whether to kill instantly and reset cooldowns
 */
export function checkPathResourceExecute(
  player: Player,
  enemy: Enemy
): PathResourceExecuteResult {
  const result: PathResourceExecuteResult = {
    shouldExecute: false,
    resetCooldowns: false,
    logs: [],
  };

  if (!isFeatureEnabled('ACTIVE_RESOURCE_SYSTEM') || !player.pathResource) {
    return result;
  }

  // Assassin at max Momentum (5): Execute enemies below 20% HP
  if (player.pathResource.type === 'momentum' && player.pathResource.current >= 5) {
    const hpPercent = enemy.health / enemy.maxHealth;
    if (hpPercent <= 0.20 && hpPercent > 0) {
      result.shouldExecute = true;
      result.resetCooldowns = true;
      result.logs.push(`⚡ DEATH MARK! Max Momentum executes low HP target!`);
    }
  }

  return result;
}

/**
 * Apply execute effect: kill enemy instantly and reset cooldowns
 *
 * @param player - Player to modify (will be mutated)
 * @param enemy - Enemy to execute (will be mutated)
 * @param executeResult - The execute result containing flags
 */
export function applyPathResourceExecute(
  player: Player,
  enemy: Enemy,
  executeResult: PathResourceExecuteResult
): void {
  if (!executeResult.shouldExecute) return;

  // Kill the enemy instantly and mark as dying for animation system
  enemy.health = 0;
  enemy.isDying = true;

  // Reset all power cooldowns
  if (executeResult.resetCooldowns) {
    player.powers = player.powers.map((power: Power) => ({
      ...power,
      currentCooldown: 0,
    }));
  }

  // Consume all momentum
  if (player.pathResource?.type === 'momentum') {
    player.pathResource = {
      ...player.pathResource,
      current: 0,
    };
  }
}
