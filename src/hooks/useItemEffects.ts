/**
 * Item Effect Processing Hook
 *
 * Centralized item effect processing for all trigger types.
 * Consolidates duplicate effect processing logic from useGameState.ts
 */

import { Item, Player } from '@/types/game';
import { ITEM_EFFECT_TRIGGER, EFFECT_TYPE } from '@/constants/enums';

/**
 * Context for item effect processing
 */
export interface ItemEffectContext {
  trigger: typeof ITEM_EFFECT_TRIGGER[keyof typeof ITEM_EFFECT_TRIGGER];
  player: Player;
  damage?: number; // For ON_HIT/ON_CRIT effects that modify damage
  enemy?: { name: string }; // For context in log messages
}

/**
 * Result of item effect processing
 */
export interface ItemEffectResult {
  player: Player; // Updated player state
  additionalDamage: number; // Additional damage to add (for ON_HIT/ON_CRIT)
  logs: string[]; // Combat log messages
}

/**
 * Process all equipped item effects for a given trigger
 *
 * @param context - Context containing trigger type, player state, and optional damage/enemy
 * @returns Updated player state, additional damage, and log messages
 */
export function processItemEffects(context: ItemEffectContext): ItemEffectResult {
  const { trigger, player, damage = 0 } = context;

  // Create a shallow copy of player with deep copies of mutable fields
  const updatedPlayer: Player = {
    ...player,
    currentStats: { ...player.currentStats },
  };

  const logs: string[] = [];
  let additionalDamage = 0;

  // Process all equipped items with matching trigger
  updatedPlayer.equippedItems.forEach((item: Item) => {
    if (item.effect?.trigger !== trigger) return;

    // Check effect chance (default to 1 = 100%)
    const chance = item.effect.chance ?? 1;
    if (Math.random() >= chance) return;

    // Process effect based on type
    switch (item.effect.type) {
      case EFFECT_TYPE.HEAL: {
        const healAmount = item.effect.value;
        updatedPlayer.currentStats.health = Math.min(
          updatedPlayer.currentStats.maxHealth,
          updatedPlayer.currentStats.health + healAmount
        );

        // Generate contextual log message based on trigger
        let logMessage = `${item.icon} `;
        switch (trigger) {
          case ITEM_EFFECT_TRIGGER.TURN_START:
            logMessage += `Regenerated ${healAmount} HP`;
            break;
          case ITEM_EFFECT_TRIGGER.ON_CRIT:
            logMessage += `Healed ${healAmount} HP on crit!`;
            break;
          case ITEM_EFFECT_TRIGGER.ON_HIT:
            logMessage += `Life steal: +${healAmount} HP`;
            break;
          case ITEM_EFFECT_TRIGGER.ON_KILL:
            logMessage += `Victory heal: +${healAmount} HP`;
            break;
          case ITEM_EFFECT_TRIGGER.ON_DAMAGED:
            logMessage += `Damage absorbed: +${healAmount} HP`;
            break;
          default:
            logMessage += `Healed ${healAmount} HP`;
        }
        logs.push(logMessage);
        break;
      }

      case EFFECT_TYPE.DAMAGE: {
        // For ON_CRIT, it's a multiplier on existing damage
        // For ON_HIT, it's flat additional damage
        if (trigger === ITEM_EFFECT_TRIGGER.ON_CRIT) {
          const bonusDamage = Math.floor(damage * item.effect.value);
          additionalDamage += bonusDamage;
          // Note: ON_CRIT damage bonus doesn't generate a log in original code
        } else if (trigger === ITEM_EFFECT_TRIGGER.ON_HIT) {
          additionalDamage += item.effect.value;
          logs.push(`${item.icon} Bonus damage: +${item.effect.value}`);
        }
        break;
      }

      case EFFECT_TYPE.MANA: {
        const manaAmount = item.effect.value;
        updatedPlayer.currentStats.mana = Math.min(
          updatedPlayer.currentStats.maxMana,
          updatedPlayer.currentStats.mana + manaAmount
        );

        // Only ON_KILL generates a mana log in the original code
        // TURN_START and ON_DAMAGED don't log mana restoration
        if (trigger === ITEM_EFFECT_TRIGGER.ON_KILL) {
          logs.push(`${item.icon} Mana restored: +${manaAmount}`);
        }
        break;
      }

      // LIFESTEAL is handled as HEAL type with ON_HIT trigger
      // Other effect types (BUFF, DEBUFF) are not used in item effects
      default:
        break;
    }
  });

  return {
    player: updatedPlayer,
    additionalDamage,
    logs,
  };
}
