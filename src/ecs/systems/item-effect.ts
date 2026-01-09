// src/ecs/systems/item-effect.ts
/**
 * ItemEffectSystem - processes item proc effects during combat.
 *
 * This system processes item effects based on combat events:
 * - ON_HIT: When player attacks
 * - ON_CRIT: When player lands a critical hit
 * - ON_KILL: When player kills an enemy
 * - ON_DAMAGED: When player takes damage
 *
 * Runs after CombatSystem and before DeathSystem.
 */

import { getPlayer, getActiveEnemy, getGameState } from '../queries';
import { ITEM_EFFECT_TRIGGER, EFFECT_TYPE } from '@/constants/enums';
import { getProcChanceBonus } from '@/utils/fortuneUtils';
import type { Entity, AnimationEvent, AnimationPayload } from '../components';
import type { Item, ItemEffect } from '@/types/game';
import { getTick } from '../loop';
import { queueAnimationEvent, addCombatLog } from '../utils';

// Track combat events for the current tick
// These are set by CombatSystem and cleared at the end of this system
interface CombatEventTracking {
  playerAttacked: boolean;
  playerCrit: boolean;
  playerDamageDealt: number;
  playerTookDamage: boolean;
  playerDamageTaken: number;
  enemyKilled: boolean;
}

// Module-level tracking (reset each tick)
let currentTickEvents: CombatEventTracking | null = null;

/**
 * Record that the player attacked this tick.
 * Called by CombatSystem when processing player attacks.
 */
export function recordPlayerAttack(damage: number, isCrit: boolean): void {
  if (!currentTickEvents) {
    currentTickEvents = createEmptyTracking();
  }
  currentTickEvents.playerAttacked = true;
  currentTickEvents.playerDamageDealt = damage;
  currentTickEvents.playerCrit = isCrit;
}

/**
 * Record that the player took damage this tick.
 * Called by CombatSystem when enemy attacks player.
 */
export function recordPlayerDamaged(damage: number): void {
  if (!currentTickEvents) {
    currentTickEvents = createEmptyTracking();
  }
  currentTickEvents.playerTookDamage = true;
  currentTickEvents.playerDamageTaken = damage;
}

/**
 * Record that an enemy was killed this tick.
 * Called when enemy health reaches 0.
 */
export function recordEnemyKilled(): void {
  if (!currentTickEvents) {
    currentTickEvents = createEmptyTracking();
  }
  currentTickEvents.enemyKilled = true;
}

/**
 * Clear tracking for next tick.
 */
export function clearCombatEventTracking(): void {
  currentTickEvents = null;
}

function createEmptyTracking(): CombatEventTracking {
  return {
    playerAttacked: false,
    playerCrit: false,
    playerDamageDealt: 0,
    playerTookDamage: false,
    playerDamageTaken: 0,
    enemyKilled: false,
  };
}

/**
 * Get all equipped items from a player entity.
 */
function getEquippedItems(player: Entity): Item[] {
  const items: Item[] = [];
  const equipment = player.equipment;
  if (!equipment) return items;

  if (equipment.weapon) items.push(equipment.weapon);
  if (equipment.armor) items.push(equipment.armor);
  if (equipment.accessory) items.push(equipment.accessory);

  return items;
}

/**
 * Get fortune stat from player entity for proc chance calculation.
 */
function getPlayerFortune(player: Entity): number {
  // For ECS, we don't have a fortune component yet
  // Return 0 as default (no bonus)
  return 0;
}

/**
 * Check if an effect should proc based on chance and fortune bonus.
 */
function shouldProc(effect: ItemEffect, fortuneBonus: number): boolean {
  const baseChance = effect.chance ?? 1;
  const modifiedChance = Math.min(1, baseChance * fortuneBonus);
  return Math.random() < modifiedChance;
}

/**
 * Process a heal effect on the player.
 */
function processHealEffect(
  player: Entity,
  effect: ItemEffect,
  item: Item,
  trigger: string,
  damage: number
): void {
  if (!player.health) return;

  let healAmount = effect.value;

  // Calculate heal amount based on trigger
  if (trigger === ITEM_EFFECT_TRIGGER.ON_DAMAGE_DEALT) {
    // Lifesteal: heal based on damage dealt
    healAmount = Math.floor(damage * effect.value);
  } else if (trigger === ITEM_EFFECT_TRIGGER.ON_KILL && effect.value < 1) {
    // Percentage of max HP
    healAmount = Math.floor(player.health.max * effect.value);
  }

  if (healAmount <= 0) return;

  const oldHealth = player.health.current;
  const newHealth = Math.min(player.health.max, oldHealth + healAmount);
  const actualHeal = newHealth - oldHealth;

  if (actualHeal > 0) {
    player.health.current = newHealth;

    // Generate contextual log message
    let logMessage = `${item.icon} `;
    switch (trigger) {
      case ITEM_EFFECT_TRIGGER.ON_DAMAGE_DEALT:
        logMessage += `Lifesteal: +${actualHeal} HP`;
        break;
      case ITEM_EFFECT_TRIGGER.ON_CRIT:
        logMessage += `Healed ${actualHeal} HP on crit!`;
        break;
      case ITEM_EFFECT_TRIGGER.ON_HIT:
        logMessage += `Life steal: +${actualHeal} HP`;
        break;
      case ITEM_EFFECT_TRIGGER.ON_KILL:
        logMessage += `Victory heal: +${actualHeal} HP`;
        break;
      case ITEM_EFFECT_TRIGGER.ON_DAMAGED:
        logMessage += `Damage absorbed: +${actualHeal} HP`;
        break;
      default:
        logMessage += `Healed ${actualHeal} HP`;
    }
    addCombatLog(logMessage);

    // Queue heal animation
    queueAnimationEvent('item_proc', {
      type: 'item',
      itemName: item.name,
      effectDescription: `+${actualHeal} HP`,
    });
  }
}

/**
 * Process a damage effect on the enemy.
 */
function processDamageEffect(
  player: Entity,
  enemy: Entity | undefined,
  effect: ItemEffect,
  item: Item,
  trigger: string,
  baseDamage: number
): void {
  if (!enemy || !enemy.health || enemy.dying) return;

  let additionalDamage = 0;

  if (trigger === ITEM_EFFECT_TRIGGER.ON_CRIT) {
    // Bonus damage based on hit damage
    additionalDamage = Math.floor(baseDamage * effect.value);
  } else if (trigger === ITEM_EFFECT_TRIGGER.ON_HIT) {
    // Flat additional damage
    additionalDamage = effect.value;
  } else if (trigger === ITEM_EFFECT_TRIGGER.ON_DAMAGED) {
    // Reflect damage
    additionalDamage = effect.value;
  }

  if (additionalDamage <= 0) return;

  // Apply damage to enemy
  enemy.health.current = Math.max(0, enemy.health.current - additionalDamage);

  // Log message based on trigger
  let logMessage = `${item.icon} `;
  if (trigger === ITEM_EFFECT_TRIGGER.ON_DAMAGED) {
    logMessage += `Reflected ${additionalDamage} damage!`;
  } else {
    logMessage += `Bonus damage: +${additionalDamage}`;
  }
  addCombatLog(logMessage);

  // Queue damage animation
  queueAnimationEvent('item_proc', {
    type: 'item',
    itemName: item.name,
    effectDescription: `+${additionalDamage} damage`,
  });
}

/**
 * Process item effects for a specific trigger.
 */
function processItemsForTrigger(
  player: Entity,
  enemy: Entity | undefined,
  trigger: string,
  damage: number
): void {
  const items = getEquippedItems(player);
  if (items.length === 0) return;

  const fortuneBonus = getProcChanceBonus(getPlayerFortune(player));

  for (const item of items) {
    if (!item.effect || item.effect.trigger !== trigger) continue;

    // Check proc chance
    if (!shouldProc(item.effect, fortuneBonus)) continue;

    // Process effect based on type
    switch (item.effect.type) {
      case EFFECT_TYPE.HEAL:
        processHealEffect(player, item.effect, item, trigger, damage);
        break;
      case EFFECT_TYPE.DAMAGE:
        processDamageEffect(player, enemy, item.effect, item, trigger, damage);
        break;
      case EFFECT_TYPE.BUFF:
        // Buff effects just log for visibility
        addCombatLog(`${item.icon} ${item.effect.description}`);
        break;
      case EFFECT_TYPE.DEBUFF:
        // Debuff effects just log for visibility
        addCombatLog(`${item.icon} ${item.effect.description}`);
        break;
      default:
        break;
    }
  }
}

/**
 * ItemEffectSystem - processes item proc effects during combat.
 *
 * @param _deltaMs - Time since last tick (unused, but required by system signature)
 */
export function ItemEffectSystem(_deltaMs: number): void {
  const gameState = getGameState();
  if (gameState?.phase !== 'combat') {
    clearCombatEventTracking();
    return;
  }

  const player = getPlayer();
  if (!player) {
    clearCombatEventTracking();
    return;
  }

  const enemy = getActiveEnemy();
  const events = currentTickEvents;

  if (!events) {
    // No combat events this tick
    return;
  }

  // Process ON_HIT effects when player attacked
  if (events.playerAttacked) {
    processItemsForTrigger(
      player,
      enemy,
      ITEM_EFFECT_TRIGGER.ON_HIT,
      events.playerDamageDealt
    );

    // Process ON_CRIT effects if it was a critical hit
    if (events.playerCrit) {
      processItemsForTrigger(
        player,
        enemy,
        ITEM_EFFECT_TRIGGER.ON_CRIT,
        events.playerDamageDealt
      );
    }
  }

  // Process ON_DAMAGED effects when player took damage
  if (events.playerTookDamage) {
    processItemsForTrigger(
      player,
      enemy,
      ITEM_EFFECT_TRIGGER.ON_DAMAGED,
      events.playerDamageTaken
    );
  }

  // Process ON_KILL effects when enemy was killed
  if (events.enemyKilled) {
    processItemsForTrigger(
      player,
      enemy,
      ITEM_EFFECT_TRIGGER.ON_KILL,
      0
    );
  }

  // Clear tracking for next tick
  clearCombatEventTracking();
}
