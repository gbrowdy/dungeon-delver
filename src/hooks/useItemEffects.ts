/**
 * Item Effect Processing Hook
 *
 * Centralized item effect processing for all trigger types.
 * Consolidates duplicate effect processing logic from useGameState.ts
 */

import { Item, Player } from '@/types/game';
import { ITEM_EFFECT_TRIGGER, EFFECT_TYPE } from '@/constants/enums';
import { deepClonePlayer } from '@/utils/stateUtils';
import { getProcChanceBonus } from '@/utils/fortuneUtils';
import { getPathPlaystyleModifiers } from '@/hooks/usePathAbilities';

/**
 * Context for item effect processing
 */
export interface ItemEffectContext {
  trigger: (typeof ITEM_EFFECT_TRIGGER)[keyof typeof ITEM_EFFECT_TRIGGER];
  player: Player;
  damage?: number; // For ON_HIT/ON_CRIT/ON_DAMAGE_DEALT effects that scale with damage
  enemy?: { name: string }; // For context in log messages
}

/**
 * Result of item effect processing
 */
export interface ItemEffectResult {
  player: Player; // Updated player state
  additionalDamage: number; // Additional damage to add (for ON_HIT/ON_CRIT)
  logs: string[]; // Combat log messages
  // New fields for expanded effect system
  survivedLethal?: boolean; // For immortal plate effects (ON_LETHAL_DAMAGE/ON_DEATH)
  powerDamageMultiplier?: number; // For archmage staff effects (ON_POWER_CAST)
  dodgeIgnored?: boolean; // For titan's gauntlet (PASSIVE - ignore dodge)
  damageAvoided?: boolean; // For phantom cloak (ON_DAMAGE_TAKEN - avoid damage)
}

/**
 * Process all equipped item effects for a given trigger
 *
 * @param context - Context containing trigger type, player state, and optional damage/enemy
 * @returns Updated player state, additional damage, and log messages
 */
export function processItemEffects(context: ItemEffectContext): ItemEffectResult {
  const { trigger, player, damage = 0 } = context;

  // Create a deep copy of player
  const updatedPlayer: Player = deepClonePlayer(player);

  const logs: string[] = [];
  let additionalDamage = 0;
  let survivedLethal: boolean | undefined = undefined;
  let powerDamageMultiplier: number | undefined = undefined;
  let dodgeIgnored: boolean | undefined = undefined;
  let damageAvoided: boolean | undefined = undefined;

  // Get fortune proc bonus
  const procBonus = getProcChanceBonus(player.currentStats.fortune);

  // Get path playstyle modifiers for proc chance and damage (Phase 2)
  // Passive paths: +50% proc chance, +75% proc damage
  const pathModifiers = getPathPlaystyleModifiers(player);

  // Process all equipped items with matching trigger
  updatedPlayer.equippedItems.forEach((item: Item) => {
    if (item.effect?.trigger !== trigger) return;

    // Check effect chance (default to 1 = 100%) with fortune and path modifiers
    const baseChance = item.effect.chance ?? 1;
    const modifiedChance = Math.min(1, baseChance * procBonus * pathModifiers.procChanceMultiplier); // Cap at 100%
    if (Math.random() >= modifiedChance) return;

    // Process effect based on type
    switch (item.effect.type) {
      case EFFECT_TYPE.HEAL: {
        let healAmount = item.effect.value;

        // ON_DAMAGE_DEALT: Heal based on damage dealt (lifesteal)
        if (trigger === ITEM_EFFECT_TRIGGER.ON_DAMAGE_DEALT) {
          healAmount = Math.floor(damage * item.effect.value);
        }
        // OUT_OF_COMBAT: Heal based on max HP percentage
        else if (trigger === ITEM_EFFECT_TRIGGER.OUT_OF_COMBAT) {
          healAmount = Math.floor(
            updatedPlayer.currentStats.maxHealth * item.effect.value
          );
        }
        // ON_DEATH: Revive with percentage of max HP
        else if (trigger === ITEM_EFFECT_TRIGGER.ON_DEATH) {
          healAmount = Math.floor(
            updatedPlayer.currentStats.maxHealth * item.effect.value
          );
          survivedLethal = true;
        }
        // ON_KILL with percentage value (e.g., 0.05 = 5% max HP)
        else if (
          trigger === ITEM_EFFECT_TRIGGER.ON_KILL &&
          item.effect.value < 1
        ) {
          healAmount = Math.floor(
            updatedPlayer.currentStats.maxHealth * item.effect.value
          );
        }

        updatedPlayer.currentStats.health = Math.min(
          updatedPlayer.currentStats.maxHealth,
          updatedPlayer.currentStats.health + healAmount
        );

        // Generate contextual log message based on trigger
        let logMessage = `${item.icon} `;
        switch (trigger) {
          case ITEM_EFFECT_TRIGGER.ON_DAMAGE_DEALT:
            logMessage += `Lifesteal: +${healAmount} HP`;
            break;
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
          case ITEM_EFFECT_TRIGGER.OUT_OF_COMBAT:
            logMessage += `Regenerated ${healAmount} HP`;
            break;
          case ITEM_EFFECT_TRIGGER.ON_DEATH:
            logMessage += `Phoenix effect: Revived with ${healAmount} HP!`;
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
        // For ON_POWER_CAST, it's a damage multiplier for powers
        if (trigger === ITEM_EFFECT_TRIGGER.ON_POWER_CAST) {
          // Archmage's Staff: +X% power damage
          // Store the multiplier to be applied by the caller
          // Note: This is power damage, not proc damage, so no procDamageMultiplier applied
          powerDamageMultiplier =
            (powerDamageMultiplier ?? 1.0) + item.effect.value;
          logs.push(
            `${item.icon} Power amplified: +${Math.floor(item.effect.value * 100)}% damage`
          );
        } else if (trigger === ITEM_EFFECT_TRIGGER.ON_CRIT) {
          // Apply path proc damage multiplier (Phase 2) - passive paths get bonus proc damage
          const bonusDamage = Math.floor(damage * item.effect.value * pathModifiers.procDamageMultiplier);
          additionalDamage += bonusDamage;
          // Note: ON_CRIT damage bonus doesn't generate a log in original code
        } else if (trigger === ITEM_EFFECT_TRIGGER.ON_HIT) {
          // Apply path proc damage multiplier (Phase 2)
          const procDamage = Math.floor(item.effect.value * pathModifiers.procDamageMultiplier);
          additionalDamage += procDamage;
          logs.push(`${item.icon} Bonus damage: +${procDamage}`);
        } else if (trigger === ITEM_EFFECT_TRIGGER.ON_DAMAGED) {
          // Thornmail: Reflect damage when hit
          // Apply path proc damage multiplier (Phase 2)
          const reflectDamage = Math.floor(item.effect.value * pathModifiers.procDamageMultiplier);
          additionalDamage += reflectDamage;
          logs.push(`${item.icon} Reflected ${reflectDamage} damage!`);
        }
        break;
      }

      case EFFECT_TYPE.MANA: {
        let manaAmount = item.effect.value;

        // ON_POWER_CAST with percentage: refund percentage of mana cost
        // The caller should pass the mana cost as 'damage' parameter
        if (
          trigger === ITEM_EFFECT_TRIGGER.ON_POWER_CAST &&
          item.effect.value < 1
        ) {
          manaAmount = Math.floor(damage * item.effect.value);
          logs.push(`${item.icon} Mana refunded: +${manaAmount}`);
        } else if (trigger === ITEM_EFFECT_TRIGGER.ON_KILL) {
          logs.push(`${item.icon} Mana restored: +${manaAmount}`);
        } else if (trigger === ITEM_EFFECT_TRIGGER.ON_CRIT) {
          logs.push(`${item.icon} Mana on crit: +${manaAmount}`);
        }

        updatedPlayer.currentStats.mana = Math.min(
          updatedPlayer.currentStats.maxMana,
          updatedPlayer.currentStats.mana + manaAmount
        );
        break;
      }

      case EFFECT_TYPE.BUFF: {
        // BUFF effects are typically passive stat modifications
        // They are handled at stat calculation time, not during combat events
        // However, some buffs are triggered (e.g., combat_start buffs)
        if (trigger === ITEM_EFFECT_TRIGGER.COMBAT_START) {
          logs.push(`${item.icon} ${item.effect.description}`);
        }
        // ON_HIT buffs like momentum stacking - log for visibility
        else if (trigger === ITEM_EFFECT_TRIGGER.ON_HIT) {
          logs.push(`${item.icon} ${item.effect.description}`);
        }
        // ON_DAMAGE_TAKEN buffs like damage reduction stacking
        else if (trigger === ITEM_EFFECT_TRIGGER.ON_DAMAGE_TAKEN) {
          logs.push(`${item.icon} ${item.effect.description}`);
        }
        // PASSIVE buffs are not logged - they're always active
        // Examples: Berserker Axe (+10% damage below 50% HP)
        //           Guardian Shield (Block 50% more effective)
        //           These are calculated in stat computation, not here
        break;
      }

      case EFFECT_TYPE.DEBUFF: {
        // DEBUFF effects apply negative effects to enemies
        // These are typically ON_HIT triggers (slow, stun, etc.)
        if (
          trigger === ITEM_EFFECT_TRIGGER.ON_HIT ||
          trigger === ITEM_EFFECT_TRIGGER.ON_DAMAGED
        ) {
          logs.push(`${item.icon} ${item.effect.description}`);
        }
        break;
      }

      case EFFECT_TYPE.SPECIAL: {
        // Special effects require unique handling based on trigger
        switch (trigger) {
          case ITEM_EFFECT_TRIGGER.ON_LETHAL_DAMAGE:
            // Immortal Plate: Survive lethal damage once per floor
            survivedLethal = true;
            updatedPlayer.currentStats.health = 1; // Survive at 1 HP
            logs.push(`${item.icon} Survived lethal damage!`);
            break;

          case ITEM_EFFECT_TRIGGER.ON_DEATH:
            // Phoenix-style effects that revive the player
            survivedLethal = true;
            logs.push(`${item.icon} Cheated death!`);
            break;

          case ITEM_EFFECT_TRIGGER.PASSIVE:
            // Titan's Gauntlet: Ignore enemy dodge
            // This flag is checked by combat logic
            dodgeIgnored = true;
            // No log for passive effects
            break;

          case ITEM_EFFECT_TRIGGER.ON_DAMAGE_TAKEN:
            // Phantom Cloak: Completely avoid incoming damage
            // The chance check already passed above, so we avoided the damage
            damageAvoided = true;
            logs.push(`${item.icon} Attack phased through!`);
            break;

          default:
            break;
        }
        break;
      }

      default:
        break;
    }
  });

  return {
    player: updatedPlayer,
    additionalDamage,
    logs,
    survivedLethal,
    powerDamageMultiplier,
    dodgeIgnored,
    damageAvoided,
  };
}

/**
 * Check if player has any items with a specific passive effect
 * Used for effects that need to be checked without processing
 *
 * @param player - Player to check
 * @param effectDescription - Partial description to match
 * @returns true if player has an item with matching passive effect
 */
export function hasPassiveEffect(
  player: Player,
  effectDescription: string
): boolean {
  return player.equippedItems.some(
    (item) =>
      item.effect?.trigger === ITEM_EFFECT_TRIGGER.PASSIVE &&
      item.effect.description.toLowerCase().includes(effectDescription.toLowerCase())
  );
}

/**
 * Get the total passive buff value for a specific effect type
 * Used for stacking passive effects like "+X% damage below 50% HP"
 *
 * @param player - Player to check
 * @param effectType - Effect type to sum
 * @returns Total value of matching passive effects
 */
export function getPassiveBuffValue(
  player: Player,
  effectType: (typeof EFFECT_TYPE)[keyof typeof EFFECT_TYPE]
): number {
  return player.equippedItems.reduce((total, item) => {
    if (
      item.effect?.trigger === ITEM_EFFECT_TRIGGER.PASSIVE &&
      item.effect.type === effectType
    ) {
      return total + item.effect.value;
    }
    return total;
  }, 0);
}
